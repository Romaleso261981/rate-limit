# Rate-Limited Client-Server Application

This project demonstrates a client-server application with rate limiting and concurrency control.

## Features

- **Client**: React + TypeScript frontend with configurable concurrency and rate limiting
- **Server**: Express + TypeScript backend with Redis-based rate limiting
- **Infrastructure**: Docker Compose with Node.js and Redis containers

## Requirements

- Docker
- Docker Compose
- Make (GNU Make)

## Quick Start

### Build and Start

```bash
make up
```

This will:
- Build all Docker images
- Start Redis, Server, and Client containers
- Make the application available at:
  - Client: http://localhost:3000
  - Server: http://localhost:3001

### Stop

```bash
make down
```

### Clean Up

```bash
make clean
```

This removes all containers, volumes, and images.

### View Logs

```bash
make logs
```

## How It Works

### Client
1. Enter a concurrency value (0-100) - this controls:
   - Maximum concurrent requests
   - Requests per second limit
2. Click "Start" to send 1000 requests to the server
3. View results as they arrive in real-time

### Server
- Handles requests to `/api` endpoint
- Random delay: 1-1000ms per request
- Returns 429 (Too Many Requests) if receiving >50 requests/second
- Uses Redis to track request rates

## Technology Stack

- **Language**: TypeScript
- **Frontend**: React
- **Backend**: Express
- **Storage**: Redis
- **Container Orchestration**: Docker Compose
- **Build Tool**: Makefile

