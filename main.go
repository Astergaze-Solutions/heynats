package main

import (
	"github.com/astergaze-solutions/heynats/internal/api"
	"github.com/astergaze-solutions/heynats/internal/infrastructure"
)

func main() {

	router := infrastructure.NewRouter()
	exampleAPI := api.NewExample(router)
	exampleAPI.RegisterRoutes()
	natsAPI := api.NewHeyNats(router)
	natsAPI.RegisterRoutes()

	// Start and run the server
	router.Run(":5000")
}
