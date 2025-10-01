package pkg

import (
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"time"

	"github.com/nats-io/nats.go"
)

type KVManager struct {
	conn *NATSCredential
}

func NewKVManager(nc *NATSCredential) *KVManager {
	return &KVManager{conn: nc}
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

func (kvm *KVManager) ListBucketsWithStats() ([]KVBucketsStats, error) {
	if kvm.conn == nil || kvm.conn.JSConn == nil {
		return nil, fmt.Errorf("JetStream not initialized")
	}

	stream := *kvm.conn.JSConn

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

		ttl := status.TTL()
		ttlStr := ""
		if ttl > 0 {
			ttlStr = ttl.String()
		}

		stats = append(stats, KVBucketsStats{
			Bucket:       status.Bucket(),
			Values:       status.Values(),
			History:      status.History(),
			TTL:          ttlStr,
			BackingStore: status.BackingStore(),
			Bytes:        status.Bytes(),
			IsCompressed: status.IsCompressed(),
		})
	}

	return stats, nil
}

func (nc *NATSCredential) CreateBucket(bucketName string) error {
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
func (nc *NATSCredential) GetBucket(bucketName string) (*KVBucketsStats, error) {
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

// KVEntry represents a key-value entry
type KVEntry struct {
	Key      string `json:"key"`
	Value    string `json:"value"`
	Created  string `json:"created"`
	Revision uint64 `json:"revision"`
}

// GetBucketKeys returns all keys in a bucket
func (nc *NATSCredential) GetBucketKeys(bucketName string) ([]KVEntry, error) {
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
func (nc *NATSCredential) GetKey(bucketName, key string) (*KVEntry, error) {
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
func (nc *NATSCredential) SetKey(bucketName, key, value string) (*KVEntry, error) {
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

// DeleteBucket removes a KV bucket entirely.
func (nc *NATSCredential) DeleteBucket(bucketName string) error {
	stream := *nc.JSConn
	if stream == nil {
		return fmt.Errorf("JetStream not initialized")
	}

	return stream.DeleteKeyValue(bucketName)
}

func (nc *NATSCredential) PutValue(bucket, key string, value []byte) (uint64, error) {
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

func (nc *NATSCredential) ListKeyValues(bucket string, page, pageSize int) ([]struct {
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

func (nc *NATSCredential) GetValue(bucket, key string) ([]byte, error) {
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

func (nc *NATSCredential) DeleteKey(bucket, key string) error {
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
