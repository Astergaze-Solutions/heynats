package api

import (
	"net/http"

	"github.com/astergaze-solutions/heynats/internal/infrastructure"
	"github.com/astergaze-solutions/heynats/internal/pkg"
	"github.com/gin-gonic/gin"
)

type HeyNats struct {
	router   *infrastructure.Router
	natsConn *pkg.NATSConnection
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
		if e.natsConn != nil {
			e.natsConn.Disconnect()
		}

		// Create new connection
		e.natsConn = &pkg.NATSConnection{
			Host:     req.Host,
			Port:     req.Port,
			Username: req.Username,
			Password: req.Password,
		}

		// Attempt to connect
		if err := e.natsConn.Connect(); err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error":   "Failed to connect to NATS server",
				"details": err.Error(),
			})
			e.natsConn = nil
			return
		}

		// Test the connection
		if err := e.natsConn.TestConnection(); err != nil {
			e.natsConn.Disconnect()
			c.JSON(http.StatusUnauthorized, gin.H{
				"error":   "Connection test failed",
				"details": err.Error(),
			})
			e.natsConn = nil
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"message":   "Successfully connected to NATS server",
			"connected": true,
		})
	})

	api.GET("/api/nats/info", func(c *gin.Context) {
		if e.natsConn == nil {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error":     "Not connected to NATS server",
				"connected": false,
			})
			return
		}

		info, err := e.natsConn.GetInfo()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error":   "Failed to get NATS server info",
				"details": err.Error(),
			})
			return
		}

		c.JSON(http.StatusOK, info)
	})

	api.GET("/api/nats/account/info", func(c *gin.Context) {
		if e.natsConn == nil {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error":     "Not connected to NATS server",
				"connected": false,
			})
			return
		}

		accountInfo, err := e.natsConn.GetAccountInfo()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error":   "Failed to get account information",
				"details": err.Error(),
			})
			return
		}

		c.JSON(http.StatusOK, accountInfo)
	})

	api.GET("/api/nats/account", func(c *gin.Context) {
		if e.natsConn == nil {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error":     "Not connected to NATS server",
				"connected": false,
			})
			return
		}

		accountInfo, err := e.natsConn.GetAccountInfo()
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
		if e.natsConn != nil {
			e.natsConn.Disconnect()
			e.natsConn = nil
		}

		c.JSON(http.StatusOK, gin.H{
			"message":   "Disconnected from NATS server",
			"connected": false,
		})
	})

	api.GET("/api/nats/status", func(c *gin.Context) {
		connected := e.natsConn != nil && e.natsConn.Conn != nil && e.natsConn.Conn.IsConnected()
		status := gin.H{
			"connected": connected,
		}

		if connected {
			status["host"] = e.natsConn.Host
			status["port"] = e.natsConn.Port
			status["username"] = e.natsConn.Username
		}

		c.JSON(http.StatusOK, status)
	})

	api.GET("/api/nats/health", func(c *gin.Context) {
		if e.natsConn == nil || e.natsConn.Conn == nil || !e.natsConn.Conn.IsConnected() {
			c.JSON(http.StatusServiceUnavailable, gin.H{
				"status":    "unhealthy",
				"connected": false,
			})
			return
		}

		// Perform a ping to check health
		if err := e.natsConn.Conn.Flush(); err != nil {
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

	api.GET("/api/nats/streams", func(c *gin.Context) {
		if e.natsConn == nil {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error":     "Not connected to NATS server",
				"connected": false,
			})
			return
		}

		streams, err := e.natsConn.ListStreams()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error":   "Failed to list streams",
				"details": err.Error(),
			})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"streams": streams,
			"total":   len(streams),
		})
	})

	api.GET("/api/nats/streams/:stream", func(c *gin.Context) {
		if e.natsConn == nil {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error":     "Not connected to NATS server",
				"connected": false,
			})
			return
		}

		stream := c.Param("stream")

		streamInfo, err := e.natsConn.GetStreamInfo(stream)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error":   "Failed to stream info",
				"details": err.Error(),
			})
			return
		}

		c.JSON(http.StatusOK, streamInfo)
	})

	api.GET("/api/nats/consumers/:stream", func(c *gin.Context) {
		if e.natsConn == nil {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error":     "Not connected to NATS server",
				"connected": false,
			})
			return
		}

		stream := c.Param("stream")

		streams, err := e.natsConn.ListConsumers(stream)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error":   "Failed to list consumers",
				"details": err.Error(),
			})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"streams": streams,
			"total":   len(streams),
		})
	})

	api.POST("/api/nats/streams", func(c *gin.Context) {
		if e.natsConn == nil {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error":     "Not connected to NATS server",
				"connected": false,
			})
			return
		}

		var config pkg.StreamConfig
		if err := c.ShouldBindJSON(&config); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error":   "Invalid stream configuration",
				"details": err.Error(),
			})
			return
		}

		// Validate required fields
		if config.Name == "" {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "Stream name is required",
			})
			return
		}

		if len(config.Subjects) == 0 {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "At least one subject is required",
			})
			return
		}

		// Set defaults if not provided
		if config.NumReplicas == 0 {
			config.NumReplicas = 1
		}
		if config.Storage == "" {
			config.Storage = "file"
		}
		if config.Retention == "" {
			config.Retention = "limits"
		}
		if config.Discard == "" {
			config.Discard = "old"
		}

		// Create the stream
		streamInfo, err := e.natsConn.CreateStream(&config)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error":   "Failed to create stream",
				"details": err.Error(),
			})
			return
		}

		c.JSON(http.StatusCreated, gin.H{
			"message":     "Stream created successfully",
			"stream_info": streamInfo,
		})
	})
}
