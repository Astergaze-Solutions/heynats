package main

import (
	"log"
	"os"
	"os/signal"
	"syscall"

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

	// Setup graceful shutdown
	c := make(chan os.Signal, 1)
	signal.Notify(c, os.Interrupt, syscall.SIGTERM)

	go func() {
		<-c
		log.Println("Shutting down gracefully...")
		natsConnections.Shutdown()
		os.Exit(0)
	}()

	// Start and run the server
	log.Println("Starting server on :5000")
	router.Run(":5000")
}
