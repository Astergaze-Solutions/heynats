package api

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

type Health struct {
	router *gin.RouterGroup
}

func NewHealth(r *gin.RouterGroup) *Health {
	return &Health{router: r}
}

func (e *Health) RegisterRoutes() {
	api := e.router
	{
		api.GET("/health", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{
				"status": "healthy",
				"server": "gin",
			})
		})
	}
}
