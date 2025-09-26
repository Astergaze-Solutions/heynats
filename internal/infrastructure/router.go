package infrastructure

import (
	"github.com/gin-gonic/contrib/static"
	"github.com/gin-gonic/gin"
)

type Router struct {
	*gin.Engine
}

func NewRouter() *Router {
	r := gin.Default()
	r.Use(static.Serve("/", static.LocalFile("./client/dist", true)))
	return &Router{r}
}
