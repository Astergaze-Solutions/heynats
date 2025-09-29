package api

import (
	"net/http"
	"strconv"

	"github.com/astergaze-solutions/heynats/internal/pkg"
	"github.com/gin-gonic/gin"
	"github.com/nats-io/nats.go"
)

type SubscribeAPI struct {
	router     *gin.RouterGroup
	conns      *NatsConnectionStore
	middleware *ConnectionMiddleware
}

func NewSubscribeAPI(
	router *gin.RouterGroup,
	conns *NatsConnectionStore,
	middleware *ConnectionMiddleware,
) *SubscribeAPI {
	return &SubscribeAPI{
		router:     router,
		conns:      conns,
		middleware: middleware,
	}
}

func (s *SubscribeAPI) RegisterRoutes() {
	api := s.router.Group("/subscribe")

	// SSE endpoint for real-time message subscriptions
	api.GET("/messages/:subject", s.middleware.RequireConnection(), s.subscribeToSubject)

	// REST endpoint to get subjects for autocomplete
	api.GET("/subjects", s.middleware.RequireConnection(), s.getSubjects)
}

// subscribeToSubject handles SSE subscription to a specific subject
func (s *SubscribeAPI) subscribeToSubject(c *gin.Context) {
	natsConn, exists := c.Get(NatsConnectionKey)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Not connected to NATS"})
		return
	}

	subject := c.Param("subject")
	if subject == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Subject is required"})
		return
	}

	// Parse optional query parameters
	queueGroup := c.Query("queue_group")
	maxMessagesStr := c.Query("max_messages")
	var maxMessages int
	if maxMessagesStr != "" {
		if parsed, err := strconv.Atoi(maxMessagesStr); err == nil {
			maxMessages = parsed
		}
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

	// Message counter
	messageCount := 0

	// Create subscription handler
	handler := func(data []byte, headers map[string]string) {
		messageCount++

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

		// Check if we've reached max messages limit
		if maxMessages > 0 && messageCount >= maxMessages {
			close(done)
		}
	}

	// Subscribe to the subject
	var subscription *nats.Subscription
	var err error

	if queueGroup != "" {
		// For queue groups, use direct NATS connection
		subscription, err = conn.Conn.QueueSubscribe(subject, queueGroup, func(msg *nats.Msg) {
			headers := make(map[string]string)
			if msg.Header != nil {
				for key, values := range msg.Header {
					if len(values) > 0 {
						headers[key] = values[0]
					}
				}
			}
			handler(msg.Data, headers)
		})
	} else {
		subscription, err = conn.SubscribeToSubject(subject, handler)
	}

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
	initialMsg := map[string]interface{}{
		"type":         "connected",
		"subject":      subject,
		"queue_group":  queueGroup,
		"max_messages": maxMessages,
		"timestamp":    pkg.GetCurrentTimestamp(),
	}

	c.Writer.WriteString("data: " + string(pkg.MustToJSON(initialMsg)) + "\n\n")
	c.Writer.Flush()

	// Stream messages
	for {
		select {
		case message, ok := <-msgChan:
			if !ok {
				return
			}
			c.Writer.WriteString("data: " + string(message) + "\n\n")
			c.Writer.Flush()

		case <-done:
			// Send completion message if max messages reached
			if maxMessages > 0 {
				completionMsg := map[string]interface{}{
					"type":      "completed",
					"subject":   subject,
					"count":     messageCount,
					"timestamp": pkg.GetCurrentTimestamp(),
				}
				c.Writer.WriteString("data: " + string(pkg.MustToJSON(completionMsg)) + "\n\n")
				c.Writer.Flush()
			}
			return

		case <-c.Request.Context().Done():
			return
		}
	}
}

// getSubjects returns available subjects for autocomplete
func (s *SubscribeAPI) getSubjects(c *gin.Context) {
	_, exists := c.Get(NatsConnectionKey)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Not connected to NATS"})
		return
	}

	// Get subjects from streams (this might need to be implemented in the NATS client)
	// For now, return some common subject patterns as suggestions
	subjects := []string{
		"events.*",
		"notifications.*",
		"logs.*",
		"metrics.*",
		"alerts.*",
		"system.*",
	}

	c.JSON(http.StatusOK, gin.H{
		"subjects": subjects,
	})
}
