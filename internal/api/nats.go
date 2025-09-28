package api

import (
	"log"
	"net/http"
	"time"

	"github.com/astergaze-solutions/heynats/internal/infrastructure"
	"github.com/astergaze-solutions/heynats/internal/pkg"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type HeyNats struct {
	router     *infrastructure.Router
	conns      *NatsConnectionStore
	middleware *ConnectionMiddleware
}

func NewHeyNats(
	r *infrastructure.Router,
	conns *NatsConnectionStore,
	middleware *ConnectionMiddleware,
) *HeyNats {
	return &HeyNats{
		router:     r,
		conns:      conns,
		middleware: middleware,
	}
}

func (e *HeyNats) RegisterRoutes() {
	// NATS connection endpoints
	api := e.router
	api.POST("/api/nats/connect", e.middleware.Handle(), func(c *gin.Context) {
		var req pkg.ConnectionRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		// Check if there's already an existing connection from cookie
		existingConn, hasConnection := c.Get(NatsConnectionKey)
		var natsConn *pkg.NATSCredential
		var connectionID string

		if hasConnection {
			// Use existing connection
			natsConn = existingConn.(*pkg.NATSCredential)
			if cID, exists := c.Get(ConnectionIDKey); exists {
				if cIDStr, ok := cID.(string); ok {
					connectionID = cIDStr
					log.Println("Using existing connection for user:", connectionID)
					// Update activity for existing connection
					e.conns.UpdateActivity(connectionID)
				}
			}
		} else {
			// Create new connection
			connectionID = uuid.New().String()
			natsConn = &pkg.NATSCredential{
				Host:     req.Host,
				Port:     req.Port,
				Username: req.Username,
				Password: req.Password,
			}

			// Attempt to connect
			if err := natsConn.Connect(); err != nil {
				c.JSON(http.StatusUnauthorized, gin.H{
					"error":   "Failed to connect to NATS server",
					"details": err.Error(),
				})
				return
			}

			// Test the connection
			if err := natsConn.TestConnection(); err != nil {
				natsConn.Disconnect()
				c.JSON(http.StatusUnauthorized, gin.H{
					"error":   "Connection test failed",
					"details": err.Error(),
				})
				return
			}

			// Store the connection and set HTTP-only cookie
			e.conns.AddConnection(connectionID, natsConn, &req)

			// Set HTTP-only cookie with secure settings
			c.SetCookie(
				ConnectionIDKey, // name
				connectionID,    // value
				3600*24,         // maxAge (24 hours)
				"/",             // path
				"",              // domain (empty for current domain)
				false,           // secure (set to true in production with HTTPS)
				true,            // httpOnly
			)
		}
		c.JSON(http.StatusOK, gin.H{
			"message":      "Successfully connected to NATS server",
			"connected":    true,
			"connectionId": connectionID,
		})
	})

	api.GET("/api/nats/info", e.middleware.RequireConnection(), func(c *gin.Context) {
		natsConn, exists := c.Get(NatsConnectionKey)
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error":     "Not connected to NATS server",
				"connected": false,
			})
			return
		}

		conn := natsConn.(*pkg.NATSCredential)
		info, err := conn.GetInfo()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error":   "Failed to get NATS server info",
				"details": err.Error(),
			})
			return
		}

		c.JSON(http.StatusOK, info)
	})

	api.GET("/api/nats/connection/stats", e.middleware.RequireConnection(), func(c *gin.Context) {
		connectionID, exists := c.Get(ConnectionIDKey)
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "Connection ID not found",
			})
			return
		}

		cID, ok := connectionID.(string)
		if !ok {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "Invalid connection ID format",
			})
			return
		}

		// Get connection info
		e.conns.mutex.RLock()
		connInfo, exists := e.conns.nastsConns[cID]
		e.conns.mutex.RUnlock()

		if !exists {
			c.JSON(http.StatusNotFound, gin.H{
				"error": "Connection not found",
			})
			return
		}

		stats := gin.H{
			"connection_id":  cID,
			"last_activity":  connInfo.LastActivity,
			"idle_timeout":   e.conns.idleTimeout,
			"time_remaining": e.conns.idleTimeout - time.Since(connInfo.LastActivity),
			"is_healthy":     connInfo.Connection.IsHealthy(),
			"is_connected":   connInfo.Connection.Conn != nil && connInfo.Connection.Conn.IsConnected(),
		}

		c.JSON(http.StatusOK, stats)
	})

	api.GET("/api/nats/account/info", e.middleware.RequireConnection(), func(c *gin.Context) {
		natsConn, exists := c.Get(NatsConnectionKey)
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error":     "Not connected to NATS server",
				"connected": false,
			})
			return
		}

		conn := natsConn.(*pkg.NATSCredential)
		accountInfo, err := conn.GetAccountInfo()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error":   "Failed to get account information",
				"details": err.Error(),
			})
			return
		}

		c.JSON(http.StatusOK, accountInfo)
	})

	api.GET("/api/nats/account", e.middleware.RequireConnection(), func(c *gin.Context) {
		natsConn, exists := c.Get(NatsConnectionKey)
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error":     "Not connected to NATS server",
				"connected": false,
			})
			return
		}

		conn := natsConn.(*pkg.NATSCredential)
		accountInfo, err := conn.GetAccountInfo()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error":   "Failed to get account information",
				"details": err.Error(),
			})
			return
		}

		c.JSON(http.StatusOK, accountInfo)
	})

	api.POST("/api/nats/disconnect", e.middleware.RequireConnection(), func(c *gin.Context) {
		connectionID, exists := c.Get(ConnectionIDKey)
		if exists {
			if cID, ok := connectionID.(string); ok {
				e.conns.RemoveConnection(cID)
				// Clear the cookie
				c.SetCookie(ConnectionIDKey, "", -1, "/", "", false, true)
			}
		}

		c.JSON(http.StatusOK, gin.H{
			"message":   "Disconnected from NATS server",
			"connected": false,
		})
	})

	api.GET("/api/nats/status", e.middleware.Handle(), func(c *gin.Context) {
		natsConn, exists := c.Get(NatsConnectionKey)
		connected := false
		status := gin.H{
			"connected": connected,
		}

		if exists {
			conn := natsConn.(*pkg.NATSCredential)
			connected = conn != nil && conn.Conn != nil && conn.Conn.IsConnected()
			status["connected"] = connected

			if connected {
				status["host"] = conn.Host
				status["port"] = conn.Port
				status["username"] = conn.Username
			}
		}

		c.JSON(http.StatusOK, status)
	})

	api.GET("/api/nats/health", e.middleware.Handle(), func(c *gin.Context) {
		natsConn, exists := c.Get(NatsConnectionKey)
		if !exists {
			c.JSON(http.StatusServiceUnavailable, gin.H{
				"status":    "unhealthy",
				"connected": false,
			})
			return
		}

		conn := natsConn.(*pkg.NATSCredential)
		if conn == nil || conn.Conn == nil || !conn.Conn.IsConnected() {
			c.JSON(http.StatusServiceUnavailable, gin.H{
				"status":    "unhealthy",
				"connected": false,
			})
			return
		}

		// Perform a ping to check health
		if err := conn.Conn.Flush(); err != nil {
			c.JSON(http.StatusServiceUnavailable, gin.H{
				"status":    "unhealthy",
				"connected": false,
				"error":     err.Error(),
			})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"status":    "healthy",
			"connected": true,
		})
	})

}
