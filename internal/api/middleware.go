package api

import (
	"github.com/astergaze-solutions/heynats/internal/pkg"
	"github.com/gin-gonic/gin"
)

type ConnectionMiddleware struct {
	conns *pkg.NatsConnectionStore
}

func NewConnectionMiddleware(conns *pkg.NatsConnectionStore) *ConnectionMiddleware {
	return &ConnectionMiddleware{conns: conns}
}

// Handle returns middleware that optionally loads connection from cookie
func (m *ConnectionMiddleware) Handle() gin.HandlerFunc {
	return func(c *gin.Context) {
		cID, err := c.Cookie(ConnectionIDKey)
		if err == nil && cID != "" {
			// If a cookie exists, try to find the corresponding connection
			// This will automatically reconnect if the connection is dead
			existingConn, exists, reconnectErr := m.conns.GetOrReconnect(cID)
			if exists && existingConn != nil && reconnectErr == nil {
				c.Set(ConnectionIDKey, cID)
				c.Set(NatsConnectionKey, existingConn)
			} else if reconnectErr != nil {
				// Log reconnection failure but don't fail the request
				// The endpoint handlers will deal with missing connections appropriately
				c.Header("X-Connection-Status", "reconnect-failed")
			}
		}
		c.Next()
	}
}

// RequireConnection returns middleware that requires a valid connection
func (m *ConnectionMiddleware) RequireConnection() gin.HandlerFunc {
	return func(c *gin.Context) {
		cID, err := c.Cookie(ConnectionIDKey)
		if err != nil {
			c.JSON(401, gin.H{"error": "Connection ID cookie is missing"})
			c.Abort()
			return
		}

		if cID == "" {
			c.JSON(401, gin.H{"error": "Connection ID is empty"})
			c.Abort()
			return
		}

		// Try to get or reconnect the connection
		existingConn, exists, reconnectErr := m.conns.GetOrReconnect(cID)
		if !exists {
			c.JSON(401, gin.H{"error": "Invalid Connection ID"})
			c.Abort()
			return
		}

		if existingConn == nil || reconnectErr != nil {
			c.JSON(503, gin.H{
				"error":   "Connection unavailable",
				"details": "Failed to establish connection to NATS server",
			})
			c.Abort()
			return
		}

		c.Set(ConnectionIDKey, cID)
		c.Set(NatsConnectionKey, existingConn)
		c.Next()
	}
}
