package api

import (
	"net/http"
	"time"

	"github.com/astergaze-solutions/heynats/internal/infrastructure"
	"github.com/astergaze-solutions/heynats/internal/model"
	"github.com/gin-gonic/gin"
)

type Example struct {
	router *infrastructure.Router
}

func NewExample(r *infrastructure.Router) *Example {
	return &Example{router: r}
}

func (e *Example) RegisterRoutes() {
	api := e.router
	{
		api.GET("/api", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{
				"message": "Hello from Gin server!",
				"time":    time.Now().Format("2006-01-02 15:04:05"),
			})
		})

		api.GET("/api/users", func(c *gin.Context) {
			users := []model.User{
				{ID: 1, Name: "John Doe", Email: "john@example.com"},
				{ID: 2, Name: "Jane Smith", Email: "jane@example.com"},
				{ID: 3, Name: "Bob Johnson", Email: "bob@example.com"},
			}
			c.JSON(http.StatusOK, gin.H{
				"users": users,
				"count": len(users),
			})
		})

		api.GET("/api/health", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{
				"status": "healthy",
				"server": "gin",
			})
		})
	}
}
