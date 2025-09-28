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

## System Requirements & Installation

### Prerequisites

#### Required System Dependencies
- **Go 1.23.4 or later** - [Download Go](https://golang.org/dl/)
- **Node.js 18+ and pnpm** - [Install Node.js](https://nodejs.org/) and [Install pnpm](https://pnpm.io/installation)
  ```bash
  # Install pnpm globally
  npm install -g pnpm
  ```

#### Development Tools (Optional but Recommended)

##### Git Hooks Management
- **lefthook** - Git hooks manager for automated code quality checks
  ```bash
  # Install lefthook
  go install github.com/evilmartians/lefthook@latest
  # or via homebrew on macOS
  brew install lefthook
  
  # Install hooks after cloning the repo
  lefthook install
  ```

##### Go Development Tools
- **goimports** - Automatic Go imports management
  ```bash
  go install golang.org/x/tools/cmd/goimports@latest
  ```
- **golangci-lint** - Go linters aggregator (for pre-push hooks)
  ```bash
  # macOS
  brew install golangci-lint
  # or
  go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest
  ```
- **air** - Live reload for Go development (optional)
  ```bash
  go install github.com/cosmtrek/air@latest
  ```

##### Commit Message Linting (Optional)
- **commitlint** - Ensures conventional commit messages
  ```bash
  npm install -g @commitlint/cli @commitlint/config-conventional
  ```

### What lefthook provides
This project uses lefthook for Git hooks automation:
- **Pre-commit hooks**: Auto-formatting (Go, React/TS), linting, Go vet, mod tidy
- **Pre-push hooks**: Comprehensive linting, testing, type checking, build verification
- **Commit-msg hooks**: Conventional commit message validation

## Getting Started

### Initial Setup

1. **Install system dependencies** (see Prerequisites above)
2. **Clone and setup the project**:
   ```bash
   git clone <repository-url>
   cd heynats
   
   # Install project dependencies
   make install
   
   # Setup Git hooks (optional but recommended)
   lefthook install
   ```

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