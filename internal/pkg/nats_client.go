package pkg

import (
	"crypto/tls"
	"encoding/json"
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/astergaze-solutions/heynats/internal/util"
	"github.com/dustin/go-humanize"
	"github.com/nats-io/nats.go"
	"github.com/nats-io/nats.go/jetstream"
)

type NATSCredential struct {
	Conn      *nats.Conn
	JSConn    *nats.JetStreamContext
	JetStream *jetstream.JetStream
	Host      string `json:"host"`
	Port      string `json:"port"`
	Username  string `json:"username"`
	Password  string `json:"password"`
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

type StreamMessage struct {
	Sequence  uint64            `json:"sequence"`
	Subject   string            `json:"subject"`
	Data      string            `json:"data"`
	Headers   map[string]string `json:"headers,omitempty"`
	Timestamp string            `json:"timestamp"`
	Size      uint32            `json:"size"`
}

type StreamMessagesResponse struct {
	Messages   []StreamMessage `json:"messages"`
	Total      int             `json:"total"`
	Offset     int             `json:"offset"`
	Limit      int             `json:"limit"`
	StreamName string          `json:"stream_name"`
}

// type KVBucketsStats struct {
// 	Bucket       string `json:"bucket"`
// 	Values       uint64 `json:"values"`        // Total entries (including history)
// 	History      int64  `json:"history"`       // Per-key history
// 	TTL          string `json:"ttl"`           // TTL as string
// 	BackingStore string `json:"backing_store"` // "file" or "memory"
// 	Bytes        uint64 `json:"bytes"`         // Total size
// 	IsCompressed bool   `json:"is_compressed"` // Compression flag
// 	// Created      time.Time `json:"created"`       // Time bucket was created
// }

func (nc *NATSCredential) Connect() error {
	var opts []nats.Option

	// Build connection URL
	url := fmt.Sprintf("nats://%s:%s", nc.Host, nc.Port)

	// Add authentication if provided
	if nc.Username != "" && nc.Password != "" {
		opts = append(opts, nats.UserInfo(nc.Username, nc.Password))
	}

	// Add connection options with better reconnection handling
	opts = append(opts,
		nats.Name("HeyNATS Web Client"),
		nats.Timeout(10*time.Second),
		nats.PingInterval(20*time.Second),
		nats.MaxPingsOutstanding(5),
		nats.ReconnectWait(2*time.Second),
		nats.MaxReconnects(-1),           // Unlimited reconnects
		nats.ReconnectBufSize(1024*1024), // 1MB buffer for reconnect
		// Add callbacks for connection events
		nats.DisconnectErrHandler(func(conn *nats.Conn, err error) {
			log.Printf("NATS connection disconnected: %v", err)
		}),
		nats.ReconnectHandler(func(conn *nats.Conn) {
			log.Printf("NATS connection reconnected to %s", conn.ConnectedUrl())
		}),
		nats.ClosedHandler(func(conn *nats.Conn) {
			log.Printf("NATS connection closed")
		}),
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

	jsJetStream, err := jetstream.New(nc.Conn)
	if err != nil {
		nc.JetStream = nil
	}
	nc.JetStream = &jsJetStream

	return nil
}

// IsHealthy checks if the connection is healthy and responsive
func (nc *NATSCredential) IsHealthy() bool {
	if nc.Conn == nil {
		return false
	}

	// Check if connection is still active
	if !nc.Conn.IsConnected() {
		return false
	}

	// Check if we can flush (send a ping)
	err := nc.Conn.FlushTimeout(2 * time.Second)
	return err == nil
}

func (nc *NATSCredential) Disconnect() {
	if nc.Conn != nil && nc.Conn.IsConnected() {
		nc.Conn.Close()
	}
}

func (nc *NATSCredential) GetInfo() (*NATSInfo, error) {
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

func (nc *NATSCredential) GetAccountInfo() (*AccountInfo, error) {
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

func (nc *NATSCredential) TestConnection() error {
	// Test basic connectivity with a ping
	if nc.Conn == nil || !nc.Conn.IsConnected() {
		return fmt.Errorf("not connected to NATS server")
	}

	// Test with a simple RTT measurement
	return nc.Conn.FlushTimeout(2 * time.Second)
}

func (nc *NATSCredential) infoAction() map[string]any {

	id, _ := nc.Conn.GetClientID()
	ip, _ := nc.Conn.GetClientIP()
	lip := nc.Conn.LocalAddr()
	rtt, _ := nc.Conn.RTT()
	tlsc, _ := nc.Conn.TLSConnectionState()

	// Simplified user info without server dependency
	var userInfo map[string]interface{}
	if util.ServerMinVersion(nc.Conn, 2, 10, 0) {
		subj := "$SYS.REQ.USER.INFO"
		resp, err := nc.Conn.Request(subj, nil, time.Second)
		if err == nil {
			var res map[string]interface{}
			err = json.Unmarshal(resp.Data, &res)
			if err == nil {
				if data, ok := res["data"].(map[string]interface{}); ok {
					userInfo = data
				}
			}
		}
	}

	// Extract user info safely
	var userID, account interface{}
	var expires interface{}
	var permissions interface{}
	if userInfo != nil {
		userID = userInfo["user_id"]
		account = userInfo["account"]
		expires = userInfo["expires"]
		permissions = userInfo["permissions"]
	}

	accountInfo := map[string]any{
		"user":             userID,
		"account":          account,
		"expires":          expires,
		"permissions":      permissions,
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
	if expires == 0 {
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

	if userInfo != nil && permissions != nil {
		accountInfo["permissions"] = permissions
	}

	return accountInfo
}

func (nc *NATSCredential) ListStreams() ([]*nats.StreamInfo, error) {
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

func (nc *NATSCredential) ListConsumers(stream string) ([]*nats.ConsumerInfo, error) {
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

func (nc *NATSCredential) GetStreamInfo(stream string) (*nats.StreamInfo, error) {
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

// StreamConfig represents the configuration for creating a new NATS stream
type StreamConfig struct {
	Name         string   `json:"name" binding:"required"`
	Subjects     []string `json:"subjects" binding:"required"`
	Storage      string   `json:"storage"`   // "file" or "memory"
	Retention    string   `json:"retention"` // "limits", "interest", or "workqueue"
	Discard      string   `json:"discard"`   // "old" or "new"
	NumReplicas  int      `json:"num_replicas"`
	AllowDirect  bool     `json:"allow_direct"`
	AllowMsgTTL  bool     `json:"allow_msg_ttl"`
	MaxMsgs      int64    `json:"max_msgs"`
	MaxBytes     int64    `json:"max_bytes"`
	MaxAge       int64    `json:"max_age"` // nanoseconds
	MaxConsumers int      `json:"max_consumers"`
}

func (nc *NATSCredential) CreateStream(config *StreamConfig) (*nats.StreamInfo, error) {
	if nc.Conn == nil || !nc.Conn.IsConnected() {
		return nil, fmt.Errorf("not connected to NATS server")
	}

	if nc.JSConn == nil {
		return nil, fmt.Errorf("not connected to JetStream")
	}

	js := *nc.JSConn

	// Convert our config to NATS StreamConfig
	streamConfig := &nats.StreamConfig{
		Name:        config.Name,
		Subjects:    config.Subjects,
		Replicas:    config.NumReplicas,
		AllowDirect: config.AllowDirect,
	}

	// Set storage type
	switch config.Storage {
	case "file":
		streamConfig.Storage = nats.FileStorage
	case "memory":
		streamConfig.Storage = nats.MemoryStorage
	default:
		streamConfig.Storage = nats.FileStorage // default to file storage
	}

	// Set retention policy
	switch config.Retention {
	case "limits":
		streamConfig.Retention = nats.LimitsPolicy
	case "interest":
		streamConfig.Retention = nats.InterestPolicy
	case "workqueue":
		streamConfig.Retention = nats.WorkQueuePolicy
	default:
		streamConfig.Retention = nats.LimitsPolicy // default to limits
	}

	// Set discard policy
	switch config.Discard {
	case "old":
		streamConfig.Discard = nats.DiscardOld
	case "new":
		streamConfig.Discard = nats.DiscardNew
	default:
		streamConfig.Discard = nats.DiscardOld // default to discard old
	}

	// Set limits (handle negative values as unlimited)
	if config.MaxMsgs > 0 {
		streamConfig.MaxMsgs = config.MaxMsgs
	}
	if config.MaxBytes > 0 {
		streamConfig.MaxBytes = config.MaxBytes
	}
	if config.MaxAge > 0 {
		streamConfig.MaxAge = time.Duration(config.MaxAge)
	}
	if config.MaxConsumers > 0 {
		streamConfig.MaxConsumers = config.MaxConsumers
	}

	// Create the stream
	streamInfo, err := js.AddStream(streamConfig)
	if err != nil {
		return nil, fmt.Errorf("failed to create stream: %w", err)
	}

	return streamInfo, nil
}

// IsConnected checks if the NATS connection is active
func (nc *NATSCredential) IsConnected() bool {
	return nc.Conn != nil && nc.Conn.IsConnected()
}

// SubscribeToSubject subscribes to a NATS subject and calls the callback for each message
func (nc *NATSCredential) SubscribeToSubject(subject string, callback func(data []byte, headers map[string]string)) (*nats.Subscription, error) {
	if nc.Conn == nil || !nc.Conn.IsConnected() {
		return nil, fmt.Errorf("not connected to NATS server")
	}

	sub, err := nc.Conn.Subscribe(subject, func(msg *nats.Msg) {
		headers := make(map[string]string)
		if msg.Header != nil {
			for key, values := range msg.Header {
				if len(values) > 0 {
					headers[key] = values[0]
				}
			}
		}
		callback(msg.Data, headers)
	})

	if err != nil {
		return nil, fmt.Errorf("failed to subscribe to subject %s: %w", subject, err)
	}

	return sub, nil
}

// Utility functions for JSON handling and timestamps
func ToJSON(v interface{}) ([]byte, error) {
	return json.Marshal(v)
}

func MustToJSON(v interface{}) []byte {
	data, err := json.Marshal(v)
	if err != nil {
		return []byte(`{"error": "json marshal failed"}`)
	}
	return data
}

func GetCurrentTimestamp() string {
	return time.Now().UTC().Format(time.RFC3339)
}

// DeleteStream deletes a JetStream stream
func (nc *NATSCredential) DeleteStream(streamName string) error {
	if nc.Conn == nil || !nc.Conn.IsConnected() {
		return fmt.Errorf("not connected to NATS server")
	}

	if nc.JSConn == nil {
		return fmt.Errorf("JetStream not available")
	}

	js := *nc.JSConn

	err := js.DeleteStream(streamName)
	if err != nil {
		return fmt.Errorf("failed to delete stream %s: %w", streamName, err)
	}

	return nil
}

// GetStreamMessages retrieves messages from a stream with pagination
func (nc *NATSCredential) GetStreamMessages(streamName string, offset int, limit int) (*StreamMessagesResponse, error) {
	if nc.Conn == nil || !nc.Conn.IsConnected() {
		return nil, fmt.Errorf("not connected to NATS server")
	}

	if nc.JSConn == nil {
		return nil, fmt.Errorf("not connected to JetStream")
	}

	js := *nc.JSConn

	// Get stream info
	streamInfo, err := js.StreamInfo(streamName)
	if err != nil {
		return nil, fmt.Errorf("failed to get stream info: %w", err)
	}

	totalMessages := int(streamInfo.State.Msgs)

	// Validate pagination parameters
	if offset < 0 {
		offset = 0
	}
	if offset >= totalMessages && totalMessages > 0 {
		offset = totalMessages - 1
	}
	if limit <= 0 {
		limit = 10
	}
	if limit > 1000 {
		limit = 1000
	}

	messages := make([]StreamMessage, 0, limit)

	// Return empty if no messages
	if totalMessages == 0 {
		return &StreamMessagesResponse{
			Messages:   messages,
			Total:      0,
			Offset:     offset,
			Limit:      limit,
			StreamName: streamName,
		}, nil
	}

	// Calculate starting sequence
	firstSeq := streamInfo.State.FirstSeq
	startSeq := firstSeq + uint64(offset)

	// Ensure we don't go past the last message
	if startSeq > streamInfo.State.LastSeq {
		startSeq = streamInfo.State.LastSeq
	}

	// Fetch messages directly using GetMsg
	for i := 0; i < limit && int(startSeq)+i <= int(streamInfo.State.LastSeq); i++ {
		currentSeq := startSeq + uint64(i)

		msg, err := js.GetMsg(streamName, currentSeq)
		if err != nil {
			// If we can't get this message, continue to next
			continue
		}

		headers := make(map[string]string)
		if msg.Header != nil {
			for key, values := range msg.Header {
				if len(values) > 0 {
					headers[key] = values[0]
				}
			}
		}

		streamMsg := StreamMessage{
			Sequence:  currentSeq,
			Subject:   msg.Subject,
			Data:      string(msg.Data),
			Headers:   headers,
			Timestamp: msg.Time.Format(time.RFC3339),
			Size:      uint32(len(msg.Data)),
		}

		messages = append(messages, streamMsg)
	}

	return &StreamMessagesResponse{
		Messages:   messages,
		Total:      totalMessages,
		Offset:     offset,
		Limit:      limit,
		StreamName: streamName,
	}, nil
}

// GetStreamMessagesWithSearch retrieves messages from a stream with pagination and search using lazy loading
// This fetches messages incrementally while filtering to avoid loading entire stream into memory
func (nc *NATSCredential) GetStreamMessagesWithSearch(streamName string, offset int, limit int, search string) (*StreamMessagesResponse, error) {
	if nc.Conn == nil || !nc.Conn.IsConnected() {
		return nil, fmt.Errorf("not connected to NATS server")
	}

	if nc.JSConn == nil {
		return nil, fmt.Errorf("not connected to JetStream")
	}

	js := *nc.JSConn

	// Get stream info
	streamInfo, err := js.StreamInfo(streamName)
	if err != nil {
		return nil, fmt.Errorf("failed to get stream info: %w", err)
	}

	totalMessages := int(streamInfo.State.Msgs)

	// Validate pagination parameters
	if offset < 0 {
		offset = 0
	}
	if limit <= 0 {
		limit = 10
	}
	if limit > 1000 {
		limit = 1000
	}

	messages := make([]StreamMessage, 0, limit)

	// Return empty if no messages
	if totalMessages == 0 {
		return &StreamMessagesResponse{
			Messages:   messages,
			Total:      0,
			Offset:     offset,
			Limit:      limit,
			StreamName: streamName,
		}, nil
	}

	// If no search term, use regular pagination
	if search == "" {
		return nc.GetStreamMessages(streamName, offset*limit, limit)
	}

	// Lazy loading: fetch messages in chunks while filtering
	searchLower := strings.ToLower(search)
	firstSeq := streamInfo.State.FirstSeq
	lastSeq := streamInfo.State.LastSeq

	matchedCount := 0
	pageStartIdx := offset * limit
	pageEndIdx := pageStartIdx + limit
	currentMessageIdx := 0
	chunkSize := 100 // Fetch in chunks of 100 to avoid loading entire stream

	// Iterate through all messages from start
	for seq := firstSeq; seq <= lastSeq; seq++ {
		msg, err := js.GetMsg(streamName, seq)
		if err != nil {
			// Skip messages that can't be retrieved
			continue
		}

		// Check if message matches search criteria
		subjectMatch := strings.Contains(strings.ToLower(msg.Subject), searchLower)
		dataMatch := strings.Contains(strings.ToLower(string(msg.Data)), searchLower)

		if subjectMatch || dataMatch {
			// This message matches the search
			if currentMessageIdx >= pageStartIdx && currentMessageIdx < pageEndIdx {
				// This message is in the current page
				headers := make(map[string]string)
				if msg.Header != nil {
					for key, values := range msg.Header {
						if len(values) > 0 {
							headers[key] = values[0]
						}
					}
				}

				streamMsg := StreamMessage{
					Sequence:  seq,
					Subject:   msg.Subject,
					Data:      string(msg.Data),
					Headers:   headers,
					Timestamp: msg.Time.Format(time.RFC3339),
					Size:      uint32(len(msg.Data)),
				}

				messages = append(messages, streamMsg)
			}

			currentMessageIdx++
			matchedCount++

			// Optimization: stop early if we have enough matches for current page and some buffer
			if currentMessageIdx > pageEndIdx+chunkSize {
				break
			}
		}
	}

	return &StreamMessagesResponse{
		Messages:   messages,
		Total:      matchedCount, // Total matches for this search, not total messages
		Offset:     offset,
		Limit:      limit,
		StreamName: streamName,
	}, nil
}
