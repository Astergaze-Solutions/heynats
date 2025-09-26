package pkg

import (
	"crypto/tls"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/astergaze-solutions/heynats/internal/util"
	"github.com/dustin/go-humanize"
	"github.com/nats-io/nats-server/v2/server"
	"github.com/nats-io/nats.go"
)

type NATSConnection struct {
	Conn     *nats.Conn
	JSConn   *nats.JetStreamContext
	Host     string `json:"host"`
	Port     string `json:"port"`
	Username string `json:"username"`
	Password string `json:"password"`
}

type ConnectionRequest struct {
	Host     string `json:"host" binding:"required"`
	Port     string `json:"port" binding:"required"`
	Username string `json:"username"`
	Password string `json:"password"`
}

type NATSInfo struct {
	ServerInfo   map[string]interface{} `json:"server_info"`
	Stats        nats.Statistics        `json:"stats"`
	IsConnected  bool                   `json:"is_connected"`
	ConnectedURL string                 `json:"connected_url"`
}

type AccountInfo struct {
	AccountInformation map[string]interface{} `json:"account_information"`
	ConnectionLimits   map[string]interface{} `json:"connection_limits"`
	Stats              map[string]interface{} `json:"stats"`
	JetStreamInfo      *JSAccountInfo         `json:"jetstream_info,omitempty"`
}

type JSAccountInfo struct {
	Memory    uint64 `json:"memory"`
	Store     uint64 `json:"store"`
	Streams   int    `json:"streams"`
	Consumers int    `json:"consumers"`
}

func (nc *NATSConnection) Connect() error {
	var opts []nats.Option

	// Build connection URL
	url := fmt.Sprintf("nats://%s:%s", nc.Host, nc.Port)

	// Add authentication if provided
	if nc.Username != "" && nc.Password != "" {
		opts = append(opts, nats.UserInfo(nc.Username, nc.Password))
	}

	// Add connection options
	opts = append(opts,
		nats.Name("HeyNATS Web Client"),
		nats.Timeout(10*time.Second),
		nats.PingInterval(20*time.Second),
		nats.MaxPingsOutstanding(5),
		nats.ReconnectWait(2*time.Second),
		nats.MaxReconnects(-1), // Unlimited reconnects
	)

	conn, err := nats.Connect(url, opts...)
	if err != nil {
		return fmt.Errorf("failed to connect to NATS server: %w", err)
	}

	nc.Conn = conn
	js, err := conn.JetStream()
	if err != nil {
		nc.JSConn = nil
	}

	nc.JSConn = &js
	return nil
}

func (nc *NATSConnection) Disconnect() {
	if nc.Conn != nil && nc.Conn.IsConnected() {
		nc.Conn.Close()
	}
}

func (nc *NATSConnection) GetInfo() (*NATSInfo, error) {
	if nc.Conn == nil || !nc.Conn.IsConnected() {
		return &NATSInfo{IsConnected: false}, nil
	}

	stats := nc.Conn.Stats()

	// Get basic server information
	serverInfo := map[string]interface{}{
		"server_id":     nc.Conn.ConnectedServerId(),
		"server_name":   nc.Conn.ConnectedServerName(),
		"connected_url": nc.Conn.ConnectedUrl(),
		"last_error":    nc.Conn.LastError(),
	}

	info := &NATSInfo{
		ServerInfo:   serverInfo,
		Stats:        stats,
		IsConnected:  nc.Conn.IsConnected(),
		ConnectedURL: nc.Conn.ConnectedUrl(),
	}

	return info, nil
}

func (nc *NATSConnection) GetAccountInfo() (*AccountInfo, error) {
	if nc.Conn == nil || !nc.Conn.IsConnected() {
		return nil, fmt.Errorf("not connected to NATS server")
	}

	// Request account info using NATS request-reply pattern
	// This is a simplified version - in a real implementation you might need
	// to use the NATS system account or have proper permissions
	resp, err := nc.Conn.Request("$SYS.REQ.ACCOUNT.PING.CONNZ", nil, 2*time.Second)
	if err != nil {
		// If system requests are not available, return basic info
		return &AccountInfo{
			AccountInformation: nc.infoAction(),
			ConnectionLimits: map[string]interface{}{
				"max_connections":   "N/A",
				"max_subscriptions": "N/A",
			},
			Stats: map[string]interface{}{
				"connections":   "N/A",
				"subscriptions": "N/A",
			},
		}, nil
	}

	var accountData map[string]interface{}
	if err := json.Unmarshal(resp.Data, &accountData); err == nil {
		return &AccountInfo{
			AccountInformation: nc.infoAction(),
			ConnectionLimits:   accountData["data"].(map[string]interface{}),
			Stats:              accountData["data"].(map[string]interface{}),
		}, nil
	}

	// Return basic connection info if system requests fail
	stats := nc.Conn.Stats()
	return &AccountInfo{
		AccountInformation: nc.infoAction(),
		ConnectionLimits: map[string]interface{}{
			"max_connections": "N/A",
		},
		Stats: map[string]interface{}{
			"in_msgs":    stats.InMsgs,
			"out_msgs":   stats.OutMsgs,
			"in_bytes":   stats.InBytes,
			"out_bytes":  stats.OutBytes,
			"reconnects": stats.Reconnects,
		},
	}, nil
}

func (nc *NATSConnection) TestConnection() error {
	// Test basic connectivity with a ping
	if nc.Conn == nil || !nc.Conn.IsConnected() {
		return fmt.Errorf("not connected to NATS server")
	}

	// Test with a simple RTT measurement
	return nc.Conn.FlushTimeout(2 * time.Second)
}

func (nc *NATSConnection) infoAction() map[string]any {

	id, _ := nc.Conn.GetClientID()
	ip, _ := nc.Conn.GetClientIP()
	lip := nc.Conn.LocalAddr()
	rtt, _ := nc.Conn.RTT()
	tlsc, _ := nc.Conn.TLSConnectionState()

	var ui *server.UserInfo
	if util.ServerMinVersion(nc.Conn, 2, 10, 0) {
		subj := "$SYS.REQ.USER.INFO"
		resp, err := nc.Conn.Request(subj, nil, time.Second)
		if err == nil {
			var res = struct {
				Data   *server.UserInfo  `json:"data"`
				Server server.ServerInfo `json:"server"`
				Error  *server.ApiError  `json:"error"`
			}{}

			err = json.Unmarshal(resp.Data, &res)
			if err == nil && res.Error == nil {
				ui = res.Data
			}
		}
	}

	accountInfo := map[string]any{
		"user":             ui.UserID,
		"account":          ui.Account,
		"expires":          ui.Expires,
		"permissions":      ui.Permissions,
		"client_id":        id,
		"client_ip":        ip,
		"rtt":              rtt.String(),
		"header_supported": nc.Conn.HeadersSupported(),
		"max_payload":      humanize.IBytes(uint64(nc.Conn.MaxPayload())),
		"connected_url":    nc.Conn.ConnectedUrl(),
		"connected_addr":   nc.Conn.ConnectedAddr(),
		"server_id":        nc.Conn.ConnectedServerId(),
		"server_version":   nc.Conn.ConnectedServerVersion(),
		"server_name":      nc.Conn.ConnectedServerName(),
	}
	if ui.Expires == 0 {
		accountInfo["expires"] = "never"
	}
	if lip != "" && !strings.HasPrefix(lip, ip.String()) {
		accountInfo["local_ip"] = lip
	}

	if tlsc.HandshakeComplete {
		version := ""
		switch tlsc.Version {
		case tls.VersionTLS10:
			version = "1.0"
		case tls.VersionTLS11:
			version = "1.1"
		case tls.VersionTLS12:
			version = "1.2"
		case tls.VersionTLS13:
			version = "1.3"
		default:
			version = fmt.Sprintf("unknown (%x)", tlsc.Version)
		}

		accountInfo["tls_version"] = fmt.Sprintf("%s using %s", version, tls.CipherSuiteName(tlsc.CipherSuite))
		accountInfo["tls_server_name"] = tlsc.ServerName
		if len(tlsc.VerifiedChains) > 0 {
			accountInfo["tls_verified"] = fmt.Sprintf("issuer %s", tlsc.PeerCertificates[0].Issuer.String())
		} else {
			accountInfo["tls_verified"] = "no"
		}
	}

	if ui != nil && ui.Permissions != nil {
		accountInfo["permissions"] = ui.Permissions
	}

	return accountInfo
}

func (nc *NATSConnection) ListStreams() ([]*nats.StreamInfo, error) {
	if nc.Conn == nil || !nc.Conn.IsConnected() {
		return nil, fmt.Errorf("not connected to NATS server")
	}

	if nc.JSConn == nil {
		return nil, fmt.Errorf("not connected to JetStream")
	}

	js := *nc.JSConn

	// Use the JetStream API to get streams
	streamInfos := js.Streams()
	streamNames := make([]*nats.StreamInfo, 0, len(streamInfos))
	for s := range streamInfos {
		streamNames = append(streamNames, s)
	}

	return streamNames, nil
}

func (nc *NATSConnection) ListConsumers(stream string) ([]*nats.ConsumerInfo, error) {
	if nc.Conn == nil || !nc.Conn.IsConnected() {
		return nil, fmt.Errorf("not connected to NATS server")
	}

	js := *nc.JSConn

	consumers := js.Consumers(stream)
	consumerList := make([]*nats.ConsumerInfo, 0, len(consumers))
	for c := range consumers {
		consumerList = append(consumerList, c)
	}

	return consumerList, nil
}

func (nc *NATSConnection) GetStreamInfo(stream string) (*nats.StreamInfo, error) {
	if nc.Conn == nil || !nc.Conn.IsConnected() {
		return nil, fmt.Errorf("not connected to NATS server")
	}

	if nc.JSConn == nil {
		return nil, fmt.Errorf("not connected to JetStream")
	}

	js := *nc.JSConn

	streamInfo, err := js.StreamInfo(stream)
	if err != nil {
		return nil, fmt.Errorf("failed to get stream info: %w", err)
	}

	return streamInfo, nil
}
