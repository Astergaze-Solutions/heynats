package api

import (
	"github.com/astergaze-solutions/heynats/internal/pkg"
	"github.com/gin-gonic/gin"
)

func GetNatsCredentialFromContext(c *gin.Context) (*pkg.NATSCredential, bool) {
	val, exists := c.Get(NatsConnectionKey)
	if !exists {
		return nil, false
	}
	conn, ok := val.(*pkg.NATSCredential)
	return conn, ok
}
