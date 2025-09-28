package main

import (
	"github.com/astergaze-solutions/heynats/internal/api"
	"github.com/astergaze-solutions/heynats/internal/infrastructure"
)

func main() {

	router := infrastructure.NewRouter()
	natsConnections := api.NewNatsConnection()
	middleware := api.NewConnectionMiddleware(natsConnections)

	// Register APIs
	exampleAPI := api.NewExample(router)
	exampleAPI.RegisterRoutes()

	natsAPI := api.NewHeyNats(router, natsConnections, middleware)
	natsAPI.RegisterRoutes()

	kvAPI := api.NewKVAPI(router, natsConnections, middleware)
	kvAPI.RegisterRoutes()

	streamAPI := api.NewStreamAPI(router, natsConnections, middleware)
	streamAPI.RegisterRoutes()

	// Start and run the server
	router.Run(":5000")
}
