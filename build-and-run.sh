#!/bin/bash

# Build and run script for React + Gin project

set -e

echo "🚀 Starting build process..."

# Check if we're in the right directory
if [ ! -f "main.go" ]; then
    echo "❌ Error: main.go not found. Please run this script from the project root."
    exit 1
fi

# Check if client directory exists
if [ ! -d "client" ]; then
    echo "❌ Error: client directory not found."
    exit 1
fi

echo "📦 Installing dependencies..."

# Install Go dependencies
echo "Installing Go dependencies..."
go mod tidy

# Install client dependencies if package.json exists and node_modules doesn't
if [ -f "client/package.json" ] && [ ! -d "client/node_modules" ]; then
    echo "Installing client dependencies..."
    cd client
    if command -v pnpm &> /dev/null; then
        pnpm install
    elif command -v npm &> /dev/null; then
        npm install
    else
        echo "❌ Error: Neither pnpm nor npm found. Please install Node.js and pnpm/npm."
        exit 1
    fi
    cd ..
fi

echo "🔨 Building React client..."
cd client

# Build the client
if command -v pnpm &> /dev/null; then
    pnpm build
elif command -v npm &> /dev/null; then
    npm run build
else
    echo "❌ Error: Neither pnpm nor npm found."
    exit 1
fi

cd ..

echo "✅ Client build completed!"

echo "🚀 Starting Gin server..."
echo "Server will be available at http://localhost:5000"
echo "Press Ctrl+C to stop the server"

# Run the Go server
go run main.go