package main

import (
	"net/http"
	"time"

	"github.com/gin-gonic/contrib/static"
	"github.com/gin-gonic/gin"
)

type User struct {
	ID    int    `json:"id"`
	Name  string `json:"name"`
	Email string `json:"email"`
}

func main() {
	// Set the router as the default one shipped with Gin
	router := gin.Default()

	// Serve frontend static files
	router.Use(static.Serve("/", static.LocalFile("./client/dist", true)))

	// Setup route group for the API
	api := router.Group("/api")
	{
		api.GET("/", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{
				"message": "Hello from Gin server!",
				"time":    time.Now().Format("2006-01-02 15:04:05"),
			})
		})

		api.GET("/users", func(c *gin.Context) {
			users := []User{
				{ID: 1, Name: "John Doe", Email: "john@example.com"},
				{ID: 2, Name: "Jane Smith", Email: "jane@example.com"},
				{ID: 3, Name: "Bob Johnson", Email: "bob@example.com"},
			}
			c.JSON(http.StatusOK, gin.H{
				"users": users,
				"count": len(users),
			})
		})

		api.GET("/health", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{
				"status": "healthy",
				"server": "gin",
			})
		})
	}

	// Catch-all route for SPA routing (must be after API routes)
	router.NoRoute(func(c *gin.Context) {
		c.File("./client/dist/index.html")
	})

	// Start and run the server
	router.Run(":5000")
}
