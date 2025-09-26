package pkg

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/nats-io/nats.go"
)

type NATSConnection struct {
	Conn     *nats.Conn
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
	ConnectionLimits map[string]interface{} `json:"connection_limits"`
	Stats            map[string]interface{} `json:"stats"`
	JetStreamInfo    *JSAccountInfo         `json:"jetstream_info,omitempty"`
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
			ConnectionLimits: accountData,
			Stats:            accountData,
		}, nil
	}

	// Return basic connection info if system requests fail
	stats := nc.Conn.Stats()
	return &AccountInfo{
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
