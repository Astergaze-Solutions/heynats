package api

import "github.com/astergaze-solutions/heynats/internal/pkg"

type NatsConnectionStore struct {
	nastsConns map[string]*pkg.NATSCredential
}

func NewNatsConnection() *NatsConnectionStore {
	return &NatsConnectionStore{
		nastsConns: make(map[string]*pkg.NATSCredential),
	}
}

func (n *NatsConnectionStore) AddConnection(id string, conn *pkg.NATSCredential) {
	n.nastsConns[id] = conn
}

func (n *NatsConnectionStore) GetConnection(id string) (*pkg.NATSCredential, bool) {
	conn, exists := n.nastsConns[id]
	return conn, exists
}

func (n *NatsConnectionStore) RemoveConnection(id string) {
	if conn, exists := n.nastsConns[id]; exists {
		conn.Disconnect()
		delete(n.nastsConns, id)
	}
}

func (n *NatsConnectionStore) ClearAllConnections() {
	for id, conn := range n.nastsConns {
		conn.Disconnect()
		delete(n.nastsConns, id)
	}
}
