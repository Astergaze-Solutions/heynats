package pkg

import (
	"context"
	"log"
	"sync"
	"time"
)

type ConnectionInfo struct {
	Connection   *NATSCredential
	LastActivity time.Time
	Config       *ConnectionRequest // Store original connection config for reconnection
}

type ConnectionStoreConfig struct {
	IdleTimeout   time.Duration // How long to keep idle connections
	CheckInterval time.Duration // How often to check for idle connections
}

type NatsConnectionStore struct {
	NastsConns    map[string]*ConnectionInfo
	Mutex         sync.RWMutex
	IdleTimeout   time.Duration
	CheckInterval time.Duration
	Ctx           context.Context
	Cancel        context.CancelFunc
}

func NewNatsConnection() *NatsConnectionStore {
	return NewNatsConnectionWithConfig(ConnectionStoreConfig{
		IdleTimeout:   5 * time.Minute, // Close connections after 30 minutes of inactivity
		CheckInterval: 1 * time.Minute, // Check for idle connections every 5 minutes
	})
}

func NewNatsConnectionWithConfig(config ConnectionStoreConfig) *NatsConnectionStore {
	ctx, cancel := context.WithCancel(context.Background())
	store := &NatsConnectionStore{
		NastsConns:    make(map[string]*ConnectionInfo),
		IdleTimeout:   config.IdleTimeout,
		CheckInterval: config.CheckInterval,
		Ctx:           ctx,
		Cancel:        cancel,
	}

	// Start the idle connection cleanup goroutine
	go store.startIdleConnectionCleanup()

	log.Printf("Connection store initialized with idle timeout: %v, check interval: %v",
		config.IdleTimeout, config.CheckInterval)

	return store
}

// AddConnection adds a new connection with activity tracking
func (n *NatsConnectionStore) AddConnection(id string, conn *NATSCredential, config *ConnectionRequest) {
	n.Mutex.Lock()
	defer n.Mutex.Unlock()

	n.NastsConns[id] = &ConnectionInfo{
		Connection:   conn,
		LastActivity: time.Now(),
		Config:       config,
	}
}

// GetConnection retrieves a connection and updates its activity timestamp
func (n *NatsConnectionStore) GetConnection(id string) (*NATSCredential, bool) {
	n.Mutex.Lock()
	defer n.Mutex.Unlock()

	connInfo, exists := n.NastsConns[id]
	if !exists {
		return nil, false
	}

	// Update last activity timestamp
	connInfo.LastActivity = time.Now()

	return connInfo.Connection, true
}

// GetOrReconnect retrieves a connection, reconnecting if necessary
func (n *NatsConnectionStore) GetOrReconnect(id string) (*NATSCredential, bool, error) {
	n.Mutex.Lock()
	defer n.Mutex.Unlock()

	connInfo, exists := n.NastsConns[id]
	if !exists {
		return nil, false, nil
	}

	// Check if connection is still valid and healthy
	if connInfo.Connection != nil && connInfo.Connection.IsHealthy() {
		// Update last activity timestamp
		connInfo.LastActivity = time.Now()
		return connInfo.Connection, true, nil
	}

	// Connection is dead, attempt to reconnect
	log.Printf("Reconnecting to NATS server for connection %s", id)

	newConn := &NATSCredential{
		Host:     connInfo.Config.Host,
		Port:     connInfo.Config.Port,
		Username: connInfo.Config.Username,
		Password: connInfo.Config.Password,
	}

	if err := newConn.Connect(); err != nil {
		// Remove failed connection
		delete(n.NastsConns, id)
		return nil, false, err
	}

	// Test the reconnection
	if err := newConn.TestConnection(); err != nil {
		newConn.Disconnect()
		delete(n.NastsConns, id)
		return nil, false, err
	}

	// Update connection info
	connInfo.Connection = newConn
	connInfo.LastActivity = time.Now()

	log.Printf("Successfully reconnected to NATS server for connection %s", id)
	return newConn, true, nil
}

// RemoveConnection removes and disconnects a specific connection
func (n *NatsConnectionStore) RemoveConnection(id string) {
	n.Mutex.Lock()
	defer n.Mutex.Unlock()

	if connInfo, exists := n.NastsConns[id]; exists {
		if connInfo.Connection != nil {
			connInfo.Connection.Disconnect()
		}
		delete(n.NastsConns, id)
	}
}

// ClearAllConnections removes and disconnects all connections
func (n *NatsConnectionStore) ClearAllConnections() {
	n.Mutex.Lock()
	defer n.Mutex.Unlock()

	for id, connInfo := range n.NastsConns {
		if connInfo.Connection != nil {
			connInfo.Connection.Disconnect()
		}
		delete(n.NastsConns, id)
	}
}

// UpdateActivity updates the last activity timestamp for a connection
func (n *NatsConnectionStore) UpdateActivity(id string) {
	n.Mutex.Lock()
	defer n.Mutex.Unlock()

	if connInfo, exists := n.NastsConns[id]; exists {
		connInfo.LastActivity = time.Now()
	}
}

// startIdleConnectionCleanup starts a goroutine that periodically checks for and closes idle connections
func (n *NatsConnectionStore) startIdleConnectionCleanup() {
	ticker := time.NewTicker(n.CheckInterval)
	defer ticker.Stop()

	for {
		select {
		case <-n.Ctx.Done():
			return
		case <-ticker.C:
			n.cleanupIdleConnections()
		}
	}
}

// cleanupIdleConnections closes connections that have been idle for too long
func (n *NatsConnectionStore) cleanupIdleConnections() {
	n.Mutex.Lock()
	defer n.Mutex.Unlock()

	now := time.Now()
	toRemove := make([]string, 0)

	for id, connInfo := range n.NastsConns {
		if now.Sub(connInfo.LastActivity) > n.IdleTimeout {
			log.Printf("Closing idle connection %s (idle for %v)", id, now.Sub(connInfo.LastActivity))
			if connInfo.Connection != nil {
				connInfo.Connection.Disconnect()
			}
			toRemove = append(toRemove, id)
		}
	}

	for _, id := range toRemove {
		delete(n.NastsConns, id)
	}

	if len(toRemove) > 0 {
		log.Printf("Cleaned up %d idle connections", len(toRemove))
	}
}

// Shutdown gracefully shuts down the connection store
func (n *NatsConnectionStore) Shutdown() {
	n.Cancel()
	n.ClearAllConnections()
}
