# Hey Nats
Web based User interface for the NATs

## Tech Stack
- **Backend**: Golang with Gin framework
- **Frontend**: React 19 with TypeScript, TailwindCSS 4, and ShadCN UI
- **Build Tool**: Vite

## Project Structure
```
├── main.go              # Gin server
├── client/              # React frontend
│   ├── src/
│   ├── dist/            # Built frontend (served by Gin)
│   └── package.json
├── Makefile             # Build automation
├── build-and-run.sh     # Build and run script
└── go.mod
```

## Getting Started

### Prerequisites
- Go 1.23.4 or later
- Node.js and pnpm (or npm)

### Quick Start

#### Option 1: Using the build script (Recommended for production)
```bash
# Build React client and start Gin server
./build-and-run.sh
```

#### Option 2: Using Makefile
```bash
# Install dependencies
make install

# Production: Build and run
make run

# Development: Run both client and server in dev mode
make dev-full

# Other commands
make build-client    # Build React client only
make dev            # Run React in development mode only
make clean          # Clean build artifacts
make help           # Show all available commands
```

#### Option 3: Development mode (with hot reload)
```bash
# Run both client (with hot reload) and server
./dev.sh

# Or manually:
# Terminal 1: Start Go server
go run main.go

# Terminal 2: Start React dev server
cd client && pnpm dev
```

#### Option 4: Manual production steps
```bash
# Install dependencies
go mod tidy
cd client && pnpm install && cd ..

# Build React client
cd client && pnpm build && cd ..

# Run Gin server (serves built React app)
go run main.go
```

## API Endpoints

The server provides the following API endpoints:

- `GET /api/` - Basic API info with timestamp
- `GET /api/users` - Sample users data
- `GET /api/health` - Health check endpoint

## Development

### Full Stack Development
```bash
# Run both client and server in development mode
./dev.sh
# or
make dev-full

# This will start:
# - React dev server on http://localhost:5173 (with hot reload)
# - Go server on http://localhost:5000 (serving API and production build)
# - API proxy from React dev server to Go server
```

### Frontend Only Development
```bash
# Run React in development mode (with hot reload)
cd client && pnpm dev
# or
make dev
```

### Backend Development (with auto-reload)
```bash
# Install air for Go hot reload (optional)
go install github.com/cosmtrek/air@latest

# Run with hot reload
air
```

### Development URLs
- **React Dev Server**: http://localhost:5173 (hot reload, API proxied to :5000)
- **Go Server**: http://localhost:5000 (production build + API)
- **API Endpoints**: http://localhost:5000/api/*

## Production

The Gin server serves the built React application and handles both static files and API routes. The React app is built into the `client/dist` directory and served at the root path `/`, while API routes are available under `/api/`.

## Inspiration
- Adminer