package infrastructure

import (
	"net/http"
	"path/filepath"
	"strings"

	"github.com/gin-gonic/contrib/static"
	"github.com/gin-gonic/gin"
)

type Router struct {
	*gin.Engine
}

func NewRouter() *Router {
	r := gin.Default()

	// Serve static files (JS, CSS, images, etc.)
	r.Use(static.Serve("/", static.LocalFile("./client/dist", true)))

	// SPA fallback - serve index.html for all non-API routes
	r.NoRoute(func(c *gin.Context) {
		// Don't serve index.html for API routes
		if strings.HasPrefix(c.Request.URL.Path, "/api") {
			c.JSON(http.StatusNotFound, gin.H{"error": "API endpoint not found"})
			return
		}

		// Serve index.html for SPA routing
		c.File(filepath.Join("./client/dist", "index.html"))
	})

	return &Router{r}
}
