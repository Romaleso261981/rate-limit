.PHONY: up down clean logs

# Detect which docker compose command is available
DOCKER_COMPOSE := $(shell command -v docker-compose 2> /dev/null)
ifndef DOCKER_COMPOSE
	DOCKER_COMPOSE := docker compose
endif

up:
	@echo "Building and starting containers..."
	$(DOCKER_COMPOSE) up --build -d
	@echo "Containers are running!"
	@echo "Client: http://localhost:3000"
	@echo "Server: http://localhost:3001"

down:
	@echo "Stopping containers..."
	$(DOCKER_COMPOSE) down
	@echo "Containers stopped!"

clean:
	@echo "Stopping and removing containers, volumes, and images..."
	$(DOCKER_COMPOSE) down -v --rmi all
	@echo "Cleanup complete!"

logs:
	$(DOCKER_COMPOSE) logs -f

