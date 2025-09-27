package api

import (
	"fmt"
	"net/http"
	"time"

	"github.com/astergaze-solutions/heynats/internal/infrastructure"
	"github.com/astergaze-solutions/heynats/internal/pkg"
	"github.com/gin-gonic/gin"
	"github.com/nats-io/nats.go"
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

	api.GET("/api/nats/kv/buckets", func(c *gin.Context) {
		if e.natsConn == nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Not connected to NATS"})
			return
		}

		bucketsStats, err := e.natsConn.ListBucketsWithStats()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error":   "Failed to fetch KV buckets",
				"details": err.Error(),
			})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"buckets": bucketsStats,
		})
	})

	api.POST("/api/nats/kv/bucket", func(c *gin.Context) {
		if e.natsConn == nil {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "Not connected to NATS",
			})
			return
		}

		var req struct {
			Bucket  string `json:"bucket" binding:"required"`
			History int64  `json:"history"`       // Optional
			TTL     string `json:"ttl,omitempty"` // Optional, e.g., "60s", "5m"
		}

		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		js := *e.natsConn.JSConn
		if js == nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "JetStream not initialized"})
			return
		}

		kvConfig := &nats.KeyValueConfig{
			Bucket:  req.Bucket,
			History: uint8(req.History),
		}

		// Parse TTL string if provided
		if req.TTL != "" {
			ttl, err := time.ParseDuration(req.TTL)
			if err != nil {
				c.JSON(http.StatusBadRequest, gin.H{
					"error":   "Invalid TTL format",
					"details": "Use valid Go duration strings like '60s', '5m', '1h30m'",
				})
				return
			}
			kvConfig.TTL = ttl
		}

		_, err := js.CreateKeyValue(kvConfig)
		if err != nil {
			c.JSON(http.StatusConflict, gin.H{
				"error":   "Failed to create bucket",
				"details": err.Error(),
			})
			return
		}

		c.JSON(http.StatusCreated, gin.H{
			"message": "Bucket created successfully",
			"bucket":  req.Bucket,
		})
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

	// SSE endpoint for subscribing to stream subjects
	api.GET("/api/nats/streams/:stream/subjects/:subject/subscribe", func(c *gin.Context) {
		streamName := c.Param("stream")
		subject := c.Param("subject")

		if e.natsConn == nil || !e.natsConn.IsConnected() {
			c.JSON(http.StatusServiceUnavailable, gin.H{
				"error": "Not connected to NATS server",
			})
			return
		}

		// Set up SSE headers
		c.Header("Content-Type", "text/event-stream")
		c.Header("Cache-Control", "no-cache")
		c.Header("Connection", "keep-alive")
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Headers", "Cache-Control")

		// Create a channel for messages
		msgChan := make(chan []byte, 100)
		done := make(chan struct{})

		// Subscribe to the subject
		subscription, err := e.natsConn.SubscribeToSubject(subject, func(data []byte, headers map[string]string) {
			// Create message event
			message := map[string]interface{}{
				"subject":   subject,
				"data":      string(data),
				"timestamp": pkg.GetCurrentTimestamp(),
				"headers":   headers,
			}

			messageJSON, err := pkg.ToJSON(message)
			if err != nil {
				return
			}

			select {
			case msgChan <- messageJSON:
			case <-done:
				return
			default:
				// Channel is full, skip message
			}
		})

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error":   "Failed to subscribe to subject",
				"details": err.Error(),
			})
			return
		}

		// Clean up subscription when done
		defer func() {
			close(done)
			if subscription != nil {
				subscription.Unsubscribe()
			}
			close(msgChan)
		}()

		// Send initial connection message
		c.Writer.WriteString("data: " + string(pkg.MustToJSON(map[string]interface{}{
			"type":      "connected",
			"subject":   subject,
			"stream":    streamName,
			"timestamp": pkg.GetCurrentTimestamp(),
		})) + "\n\n")
		c.Writer.Flush()

		// Handle client disconnect
		clientGone := c.Writer.CloseNotify()

		// Stream messages
		for {
			select {
			case <-clientGone:
				return
			case message, ok := <-msgChan:
				if !ok {
					return
				}
				c.Writer.WriteString("data: " + string(message) + "\n\n")
				if flusher, ok := c.Writer.(http.Flusher); ok {
					flusher.Flush()
				}
			}
		}
	})

	// Delete stream endpoint
	api.DELETE("/api/nats/streams/:stream", func(c *gin.Context) {
		streamName := c.Param("stream")

		if e.natsConn == nil || !e.natsConn.IsConnected() {
			c.JSON(http.StatusServiceUnavailable, gin.H{
				"error": "Not connected to NATS server",
			})
			return
		}

		err := e.natsConn.DeleteStream(streamName)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error":   "Failed to delete stream",
				"details": err.Error(),
			})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"message": fmt.Sprintf("Stream '%s' deleted successfully", streamName),
		})
	})

	// KV Bucket detail endpoints
	api.GET("/api/nats/kv/buckets/:bucket", func(c *gin.Context) {
		bucketName := c.Param("bucket")

		if e.natsConn == nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Not connected to NATS"})
			return
		}

		bucket, err := e.natsConn.GetBucket(bucketName)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error":   "Failed to get bucket details",
				"details": err.Error(),
			})
			return
		}

		c.JSON(http.StatusOK, bucket)
	})

	api.DELETE("/api/nats/kv/buckets/:bucket", func(c *gin.Context) {
		bucketName := c.Param("bucket")

		if e.natsConn == nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Not connected to NATS"})
			return
		}

		err := e.natsConn.DeleteBucket(bucketName)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error":   "Failed to delete bucket",
				"details": err.Error(),
			})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"message": fmt.Sprintf("Bucket '%s' deleted successfully", bucketName),
		})
	})

	// KV Keys endpoints
	api.GET("/api/nats/kv/buckets/:bucket/keys", func(c *gin.Context) {
		bucketName := c.Param("bucket")

		if e.natsConn == nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Not connected to NATS"})
			return
		}

		entries, err := e.natsConn.GetBucketKeys(bucketName)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error":   "Failed to get bucket keys",
				"details": err.Error(),
			})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"entries": entries,
			"bucket":  bucketName,
		})
	})

	api.GET("/api/nats/kv/buckets/:bucket/keys/:key", func(c *gin.Context) {
		bucketName := c.Param("bucket")
		key := c.Param("key")

		if e.natsConn == nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Not connected to NATS"})
			return
		}

		entry, err := e.natsConn.GetKey(bucketName, key)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error":   "Failed to get key",
				"details": err.Error(),
			})
			return
		}

		c.JSON(http.StatusOK, entry)
	})

	api.PUT("/api/nats/kv/buckets/:bucket/keys/:key", func(c *gin.Context) {
		bucketName := c.Param("bucket")
		key := c.Param("key")

		if e.natsConn == nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Not connected to NATS"})
			return
		}

		var req struct {
			Value string `json:"value" binding:"required"`
		}

		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		entry, err := e.natsConn.SetKey(bucketName, key, req.Value)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error":   "Failed to set key",
				"details": err.Error(),
			})
			return
		}

		c.JSON(http.StatusOK, entry)
	})

	api.DELETE("/api/nats/kv/buckets/:bucket/keys/:key", func(c *gin.Context) {
		bucketName := c.Param("bucket")
		key := c.Param("key")

		if e.natsConn == nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Not connected to NATS"})
			return
		}

		err := e.natsConn.DeleteKey(bucketName, key)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error":   "Failed to delete key",
				"details": err.Error(),
			})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"message": fmt.Sprintf("Key '%s' deleted successfully from bucket '%s'", key, bucketName),
		})
	})
}
