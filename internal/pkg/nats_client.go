package pkg

import (
	"crypto/tls"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/astergaze-solutions/heynats/internal/util"
	"github.com/dustin/go-humanize"
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

type KVBucketsStats struct {
	Bucket       string `json:"bucket"`
	Values       uint64 `json:"values"`        // Total entries (including history)
	History      int64  `json:"history"`       // Per-key history
	TTL          string `json:"ttl"`           // TTL as string
	BackingStore string `json:"backing_store"` // "file" or "memory"
	Bytes        uint64 `json:"bytes"`         // Total size
	IsCompressed bool   `json:"is_compressed"` // Compression flag
	// Created      time.Time `json:"created"`       // Time bucket was created
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

func (nc *NATSConnection) ListBucketsWithStats() ([]KVBucketsStats, error) {
	if nc.JSConn == nil {
		return nil, fmt.Errorf("JetStream not initialized")
	}

	stream := *nc.JSConn
	bucketChan := stream.KeyValueStoreNames()

	var stats []KVBucketsStats
	for bucket := range bucketChan {
		kv, err := stream.KeyValue(bucket)
		if err != nil {
			continue
		}

		status, err := kv.Status()
		if err != nil {
			continue
		}

		stats = append(stats, KVBucketsStats{
			Bucket:       status.Bucket(),
			Values:       status.Values(),
			History:      status.History(),
			TTL:          status.TTL().String(),
			BackingStore: status.BackingStore(),
			Bytes:        status.Bytes(),
			IsCompressed: status.IsCompressed(),
		})
	}

	return stats, nil
}

func (nc *NATSConnection) CreateBucket(bucketName string) error {
	if nc.JSConn == nil {
		return fmt.Errorf("JetStream not initialized")
	}

	stream := *nc.JSConn
	_, err := stream.CreateKeyValue(&nats.KeyValueConfig{
		Bucket:  bucketName,
		History: 1, // You can expose this as a parameter if needed
	})
	return err
}

// GetBucket returns detailed information about a specific KV bucket
func (nc *NATSConnection) GetBucket(bucketName string) (*KVBucketsStats, error) {
	js := *nc.JSConn
	if js == nil {
		return nil, fmt.Errorf("JetStream not initialized")
	}

	kv, err := js.KeyValue(bucketName)
	if err != nil {
		return nil, fmt.Errorf("failed to access bucket %s: %w", bucketName, err)
	}

	status, err := kv.Status()
	if err != nil {
		return nil, fmt.Errorf("failed to get bucket status: %w", err)
	}

	return &KVBucketsStats{
		Bucket:       status.Bucket(),
		Values:       status.Values(),
		History:      status.History(),
		TTL:          status.TTL().String(),
		BackingStore: status.BackingStore(),
		Bytes:        status.Bytes(),
		IsCompressed: status.IsCompressed(),
	}, nil
}

// DeleteBucket deletes a KV bucket
func (nc *NATSConnection) DeleteBucket(bucketName string) error {
	js := *nc.JSConn
	if js == nil {
		return fmt.Errorf("JetStream not initialized")
	}

	return js.DeleteKeyValue(bucketName)
}

// KVEntry represents a key-value entry
type KVEntry struct {
	Key      string `json:"key"`
	Value    string `json:"value"`
	Created  string `json:"created"`
	Revision uint64 `json:"revision"`
}

// GetBucketKeys returns all keys in a bucket
func (nc *NATSConnection) GetBucketKeys(bucketName string) ([]KVEntry, error) {
	js := *nc.JSConn
	if js == nil {
		return nil, fmt.Errorf("JetStream not initialized")
	}

	kv, err := js.KeyValue(bucketName)
	if err != nil {
		return nil, fmt.Errorf("failed to access bucket %s: %w", bucketName, err)
	}

	// Get all keys - note: this is a simple implementation
	// For production, you might want to implement pagination
	keys, err := kv.Keys()
	if err != nil && !errors.Is(err, nats.ErrNoKeysFound) {
		return nil, fmt.Errorf("failed to list keys: %w", err)
	}
	log.Println("Keys found:", keys)

	if len(keys) == 0 {
		return []KVEntry{}, nil
	}

	var entries []KVEntry
	for _, keyName := range keys {
		entry, err := kv.Get(keyName)
		if err != nil {
			continue // Skip keys that can't be retrieved
		}

		entries = append(entries, KVEntry{
			Key:      keyName,
			Value:    string(entry.Value()),
			Created:  entry.Created().Format(time.RFC3339),
			Revision: entry.Revision(),
		})
	}

	return entries, nil
}

// GetKey returns a specific key's value
func (nc *NATSConnection) GetKey(bucketName, key string) (*KVEntry, error) {
	js := *nc.JSConn
	if js == nil {
		return nil, fmt.Errorf("JetStream not initialized")
	}

	kv, err := js.KeyValue(bucketName)
	if err != nil {
		return nil, fmt.Errorf("failed to access bucket %s: %w", bucketName, err)
	}

	entry, err := kv.Get(key)
	if err != nil {
		return nil, fmt.Errorf("failed to get key %s: %w", key, err)
	}

	return &KVEntry{
		Key:      key,
		Value:    string(entry.Value()),
		Created:  entry.Created().Format(time.RFC3339),
		Revision: entry.Revision(),
	}, nil
}

// SetKey sets a key's value
func (nc *NATSConnection) SetKey(bucketName, key, value string) (*KVEntry, error) {
	js := *nc.JSConn
	if js == nil {
		return nil, fmt.Errorf("JetStream not initialized")
	}

	kv, err := js.KeyValue(bucketName)
	if err != nil {
		return nil, fmt.Errorf("failed to access bucket %s: %w", bucketName, err)
	}

	revision, err := kv.Put(key, []byte(value))
	if err != nil {
		return nil, fmt.Errorf("failed to set key %s: %w", key, err)
	}

	// Return the updated entry
	entry, err := kv.Get(key)
	if err != nil {
		// Fallback to basic info if we can't retrieve the entry
		return &KVEntry{
			Key:      key,
			Value:    value,
			Created:  time.Now().Format(time.RFC3339),
			Revision: revision,
		}, nil
	}

	return &KVEntry{
		Key:      key,
		Value:    string(entry.Value()),
		Created:  entry.Created().Format(time.RFC3339),
		Revision: entry.Revision(),
	}, nil
}

// DeleteKey deletes a specific key
func (nc *NATSConnection) DeleteKey(bucketName, key string) error {
	js := *nc.JSConn
	if js == nil {
		return fmt.Errorf("JetStream not initialized")
	}

	kv, err := js.KeyValue(bucketName)
	if err != nil {
		return fmt.Errorf("failed to access bucket %s: %w", bucketName, err)
	}

	return kv.Delete(key)
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

func (nc *NATSConnection) CreateStream(config *StreamConfig) (*nats.StreamInfo, error) {
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
func (nc *NATSConnection) IsConnected() bool {
	return nc.Conn != nil && nc.Conn.IsConnected()
}

// SubscribeToSubject subscribes to a NATS subject and calls the callback for each message
func (nc *NATSConnection) SubscribeToSubject(subject string, callback func(data []byte, headers map[string]string)) (*nats.Subscription, error) {
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
func (nc *NATSConnection) DeleteStream(streamName string) error {
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

// DeleteBucket removes a KV bucket entirely.
func (nc *NATSConnection) DeleteBucket(bucketName string) error {
	stream := *nc.JSConn
	if stream == nil {
		return fmt.Errorf("JetStream not initialized")
	}

	return stream.DeleteKeyValue(bucketName)
}

func (nc *NATSConnection) PutValue(bucket, key string, value []byte) (uint64, error) {
	if nc.JSConn == nil {
		return 0, fmt.Errorf("JetStream not initialized")
	}

	stream := *nc.JSConn
	kv, err := stream.KeyValue(bucket)
	if err != nil {
		return 0, err
	}
	return kv.Put(key, value)
}

func (nc *NATSConnection) ListKeyValues(bucket string, page, pageSize int) ([]struct {
	Key   string      `json:"key"`
	Value interface{} `json:"value"`
}, error) {
	if nc.JSConn == nil {
		return nil, fmt.Errorf("JetStream not initialized")
	}

	js := *nc.JSConn
	kv, err := js.KeyValue(bucket)
	if err != nil {
		return nil, err
	}

	keys, err := kv.Keys()
	if err != nil {
		return nil, err
	}

	// Pagination
	start := page * pageSize
	if start >= len(keys) {
		return []struct {
			Key   string      `json:"key"`
			Value interface{} `json:"value"`
		}{}, nil
	}
	end := start + pageSize
	if end > len(keys) {
		end = len(keys)
	}
	sliceKeys := keys[start:end]

	result := make([]struct {
		Key   string      `json:"key"`
		Value interface{} `json:"value"`
	}, 0, len(sliceKeys))

	for _, key := range sliceKeys {
		entry, err := kv.Get(key)
		if err != nil {
			continue
		}

		raw := entry.Value()
		var parsed interface{}
		if err := json.Unmarshal(raw, &parsed); err != nil {
			parsed = string(raw) // fallback to string if not JSON
		}

		result = append(result, struct {
			Key   string      `json:"key"`
			Value interface{} `json:"value"`
		}{
			Key:   key,
			Value: parsed,
		})
	}

	return result, nil
}

func (nc *NATSConnection) GetValue(bucket, key string) ([]byte, error) {
	if nc.JSConn == nil {
		return nil, fmt.Errorf("JetStream not initialized")
	}

	stream := *nc.JSConn

	kv, err := stream.KeyValue(bucket)
	if err != nil {
		return nil, err
	}
	entry, err := kv.Get(key)
	if err != nil {
		return nil, err
	}
	return entry.Value(), nil
}

func (nc *NATSConnection) DeleteKey(bucket, key string) error {
	if nc.JSConn == nil {
		return fmt.Errorf("JetStream not initialized")
	}

	stream := *nc.JSConn
	kv, err := stream.KeyValue(bucket)
	if err != nil {
		return err
	}
	return kv.Delete(key)
}
