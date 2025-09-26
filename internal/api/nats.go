package api

import (
	"net/http"

	"github.com/astergaze-solutions/heynats/internal/infrastructure"
	"github.com/astergaze-solutions/heynats/internal/pkg"
	"github.com/gin-gonic/gin"
)

type HeyNats struct {
	router         *infrastructure.Router
	globalNATSConn *pkg.NATSConnection
}

func NewHeyNats(r *infrastructure.Router) *HeyNats {
	return &HeyNats{router: r}
}

func (e *HeyNats) RegisterRoutes() {
	// NATS connection endpoints
	api := e.router
	api.POST("/api/nats/connect", func(c *gin.Context) {
		var req pkg.ConnectionRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		// Disconnect existing connection if any
		if e.globalNATSConn != nil {
			e.globalNATSConn.Disconnect()
		}

		// Create new connection
		e.globalNATSConn = &pkg.NATSConnection{
			Host:     req.Host,
			Port:     req.Port,
			Username: req.Username,
			Password: req.Password,
		}

		// Attempt to connect
		if err := e.globalNATSConn.Connect(); err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error":   "Failed to connect to NATS server",
				"details": err.Error(),
			})
			e.globalNATSConn = nil
			return
		}

		// Test the connection
		if err := e.globalNATSConn.TestConnection(); err != nil {
			e.globalNATSConn.Disconnect()
			c.JSON(http.StatusUnauthorized, gin.H{
				"error":   "Connection test failed",
				"details": err.Error(),
			})
			e.globalNATSConn = nil
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"message":   "Successfully connected to NATS server",
			"connected": true,
		})
	})

	api.GET("/api/nats/info", func(c *gin.Context) {
		if e.globalNATSConn == nil {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error":     "Not connected to NATS server",
				"connected": false,
			})
			return
		}

		info, err := e.globalNATSConn.GetInfo()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error":   "Failed to get NATS server info",
				"details": err.Error(),
			})
			return
		}

		c.JSON(http.StatusOK, info)
	})

	api.GET("/api/nats/account", func(c *gin.Context) {
		if e.globalNATSConn == nil {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error":     "Not connected to NATS server",
				"connected": false,
			})
			return
		}

		accountInfo, err := e.globalNATSConn.GetAccountInfo()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error":   "Failed to get account information",
				"details": err.Error(),
			})
			return
		}

		c.JSON(http.StatusOK, accountInfo)
	})

	api.POST("/api/nats/disconnect", func(c *gin.Context) {
		if e.globalNATSConn != nil {
			e.globalNATSConn.Disconnect()
			e.globalNATSConn = nil
		}

		c.JSON(http.StatusOK, gin.H{
			"message":   "Disconnected from NATS server",
			"connected": false,
		})
	})

	api.GET("/api/nats/status", func(c *gin.Context) {
		connected := e.globalNATSConn != nil && e.globalNATSConn.Conn != nil && e.globalNATSConn.Conn.IsConnected()
		status := gin.H{
			"connected": connected,
		}

		if connected {
			status["host"] = e.globalNATSConn.Host
			status["port"] = e.globalNATSConn.Port
			status["username"] = e.globalNATSConn.Username
		}

		c.JSON(http.StatusOK, status)
	})
}
