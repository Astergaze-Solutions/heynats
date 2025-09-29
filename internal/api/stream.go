package api

import (
	"fmt"
	"net/http"

	"github.com/astergaze-solutions/heynats/internal/pkg"
	"github.com/gin-gonic/gin"
)

type StreamAPI struct {
	router     *gin.RouterGroup
	conns      *NatsConnectionStore
	middleware *ConnectionMiddleware
}

func NewStreamAPI(
	router *gin.RouterGroup,
	conns *NatsConnectionStore,
	middleware *ConnectionMiddleware,
) *StreamAPI {
	return &StreamAPI{
		router:     router,
		conns:      conns,
		middleware: middleware,
	}
}

func (e *StreamAPI) RegisterRoutes() {
	api := e.router.Group("/streams")
	api.GET("", e.middleware.RequireConnection(), func(c *gin.Context) {
		natsConn, exists := c.Get(NatsConnectionKey)
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error":     "Not connected to NATS server",
				"connected": false,
			})
			return
		}

		conn := natsConn.(*pkg.NATSCredential)
		streams, err := conn.ListStreams()
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

	api.GET("/:stream", e.middleware.RequireConnection(), func(c *gin.Context) {
		natsConn, exists := c.Get(NatsConnectionKey)
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error":     "Not connected to NATS server",
				"connected": false,
			})
			return
		}

		stream := c.Param("stream")
		conn := natsConn.(*pkg.NATSCredential)
		streamInfo, err := conn.GetStreamInfo(stream)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error":   "Failed to stream info",
				"details": err.Error(),
			})
			return
		}

		c.JSON(http.StatusOK, streamInfo)
	})

	api.GET("/consumers/:stream", e.middleware.RequireConnection(), func(c *gin.Context) {
		natsConn, exists := c.Get(NatsConnectionKey)
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error":     "Not connected to NATS server",
				"connected": false,
			})
			return
		}

		stream := c.Param("stream")
		conn := natsConn.(*pkg.NATSCredential)
		streams, err := conn.ListConsumers(stream)
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

	api.POST("", e.middleware.RequireConnection(), func(c *gin.Context) {
		natsConn, exists := c.Get(NatsConnectionKey)
		if !exists {
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
		conn := natsConn.(*pkg.NATSCredential)
		streamInfo, err := conn.CreateStream(&config)
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
	api.GET("/:stream/subjects/:subject/subscribe", e.middleware.RequireConnection(), func(c *gin.Context) {
		streamName := c.Param("stream")
		subject := c.Param("subject")

		natsConn, exists := c.Get(NatsConnectionKey)
		if !exists {
			c.JSON(http.StatusServiceUnavailable, gin.H{
				"error": "Not connected to NATS server",
			})
			return
		}

		conn := natsConn.(*pkg.NATSCredential)
		if !conn.IsConnected() {
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
		subscription, err := conn.SubscribeToSubject(subject, func(data []byte, headers map[string]string) {
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

	api.DELETE("/:stream", e.middleware.RequireConnection(), func(c *gin.Context) {
		streamName := c.Param("stream")

		natsConn, exists := c.Get(NatsConnectionKey)
		if !exists {
			c.JSON(http.StatusServiceUnavailable, gin.H{
				"error": "Not connected to NATS server",
			})
			return
		}

		conn := natsConn.(*pkg.NATSCredential)
		if !conn.IsConnected() {
			c.JSON(http.StatusServiceUnavailable, gin.H{
				"error": "Not connected to NATS server",
			})
			return
		}

		err := conn.DeleteStream(streamName)
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
}
