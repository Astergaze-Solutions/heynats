package api

import (
	"encoding/json"
	"net/http"
	"strconv"
	"time"

	"github.com/astergaze-solutions/heynats/internal/pkg"
	"github.com/gin-gonic/gin"
	"github.com/nats-io/nats.go"
)

type KVAPI struct {
	router     *gin.RouterGroup
	conns      *NatsConnectionStore
	middleware *ConnectionMiddleware
}

func NewKVAPI(
	router *gin.RouterGroup,
	conns *NatsConnectionStore,
	middleware *ConnectionMiddleware,
) *KVAPI {
	return &KVAPI{
		router:     router,
		conns:      conns,
		middleware: middleware,
	}
}

func (e *KVAPI) RegisterRoutes() {
	api := e.router.Group("/kv")
	// list buckets
	api.GET("/buckets", e.middleware.RequireConnection(), func(c *gin.Context) {
		natsConn, exists := c.Get(NatsConnectionKey)
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Not connected to NATS"})
			return
		}

		conn := natsConn.(*pkg.NATSCredential)
		bucketsStats, err := conn.ListBucketsWithStats()
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

	api.GET("/buckets/:bucket", e.middleware.RequireConnection(), func(c *gin.Context) {
		bucketName := c.Param("bucket")
		natsConn, exists := c.Get(NatsConnectionKey)
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Not connected to NATS"})
			return
		}

		conn := natsConn.(*pkg.NATSCredential)
		bucketInfo, err := conn.GetBucket(bucketName)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error":   "Failed to fetch KV bucket info",
				"details": err.Error(),
			})
			return
		}

		c.JSON(http.StatusOK, bucketInfo)
	})

	// create bucket
	api.POST("/buckets", e.middleware.RequireConnection(), func(c *gin.Context) {
		natsConn, exists := c.Get(NatsConnectionKey)
		if !exists {
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

		conn := natsConn.(*pkg.NATSCredential)
		js := *conn.JSConn
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

	// delete buckets
	api.DELETE("/buckets/:bucket", e.middleware.RequireConnection(), func(c *gin.Context) {
		bucket := c.Param("bucket")
		natsConn, exists := c.Get(NatsConnectionKey)
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Not connected to NATS"})
			return
		}

		conn := natsConn.(*pkg.NATSCredential)
		err := conn.DeleteBucket(bucket)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete bucket", "details": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"message": "Bucket deleted", "bucket": bucket})
	})

	// put key value
	api.POST("/buckets/:bucket/keys", e.middleware.RequireConnection(), func(c *gin.Context) {
		bucket := c.Param("bucket")
		natsConn, exists := c.Get(NatsConnectionKey)
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Not connected to NATS"})
			return
		}

		var req struct {
			Key   string          `json:"key" binding:"required"`
			Value json.RawMessage `json:"value" binding:"required"`
		}

		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		conn := natsConn.(*pkg.NATSCredential)
		rev, err := conn.PutValue(bucket, req.Key, req.Value)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error":   "Failed to put value",
				"details": err.Error(),
			})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"message":  "Value stored",
			"revision": rev,
		})
	})

	// get bucket key valuse
	api.GET("/buckets/:bucket/keys", e.middleware.RequireConnection(), func(c *gin.Context) {
		bucket := c.Param("bucket")
		natsConn, exists := c.Get(NatsConnectionKey)
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Not connected to NATS"})
			return
		}

		// Pagination query params
		page := 0
		pageSize := 20
		if p := c.Query("page"); p != "" {
			if pi, err := strconv.Atoi(p); err == nil && pi >= 0 {
				page = pi
			}
		}
		if ps := c.Query("pageSize"); ps != "" {
			if psi, err := strconv.Atoi(ps); err == nil && psi > 0 {
				pageSize = psi
			}
		}

		conn := natsConn.(*pkg.NATSCredential)
		keyVals, err := conn.ListKeyValues(bucket, page, pageSize)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to list key-values", "details": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"bucket":   bucket,
			"page":     page,
			"pageSize": pageSize,
			"items":    keyVals,
		})
	})

	// get key value
	api.GET("/buckets/:bucket/keys/:key", e.middleware.RequireConnection(), func(c *gin.Context) {
		bucket := c.Param("bucket")
		key := c.Param("key")
		natsConn, exists := c.Get(NatsConnectionKey)
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Not connected to NATS"})
			return
		}

		conn := natsConn.(*pkg.NATSCredential)
		val, err := conn.GetValue(bucket, key)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Key not found or failed", "details": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"key": key, "value": string(val)})
	})

	// delete key
	api.DELETE("/buckets/:bucket/keys/:key", e.middleware.RequireConnection(), func(c *gin.Context) {
		bucket := c.Param("bucket")
		key := c.Param("key")
		natsConn, exists := c.Get(NatsConnectionKey)
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Not connected to NATS"})
			return
		}

		conn := natsConn.(*pkg.NATSCredential)
		err := conn.DeleteKey(bucket, key)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete key", "details": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"message": "Key deleted", "key": key})
	})
}
