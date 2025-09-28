package api

import "github.com/gin-gonic/gin"

type ConnectionMiddleware struct {
	conns *NatsConnectionStore
}

func NewConnectionMiddleware(conns *NatsConnectionStore) *ConnectionMiddleware {
	return &ConnectionMiddleware{conns: conns}
}

// Handle returns middleware that optionally loads connection from cookie
func (m *ConnectionMiddleware) Handle() gin.HandlerFunc {
	return func(c *gin.Context) {
		cID, err := c.Cookie(ConnectionIDKey)
		if err == nil && cID != "" {
			// If a cookie exists, try to find the corresponding connection
			existingConn, exists := m.conns.GetConnection(cID)
			if exists && existingConn != nil {
				c.Set(ConnectionIDKey, cID)
				c.Set(NatsConnectionKey, existingConn)
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

		existingConn, exists := m.conns.GetConnection(cID)
		if !exists || existingConn == nil {
			c.JSON(401, gin.H{"error": "Invalid Connection ID"})
			c.Abort()
			return
		}

		c.Set(ConnectionIDKey, cID)
		c.Set(NatsConnectionKey, existingConn)
		c.Next()
	}
}
