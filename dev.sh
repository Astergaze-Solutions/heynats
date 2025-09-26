#!/bin/bash

# Development script to run both client and server in development mode

set -e

echo "🚀 Starting development environment..."

# Function to cleanup background processes
cleanup() {
    echo "🛑 Shutting down development servers..."
    if [ ! -z "$CLIENT_PID" ]; then
        kill $CLIENT_PID 2>/dev/null || true
    fi
    if [ ! -z "$SERVER_PID" ]; then
        kill $SERVER_PID 2>/dev/null || true
    fi
    exit
}

# Set up trap to cleanup on exit
trap cleanup EXIT INT TERM

# Check if we're in the right directory
if [ ! -f "main.go" ]; then
    echo "❌ Error: main.go not found. Please run this script from the project root."
    exit 1
fi

# Install dependencies if needed
if [ ! -d "client/node_modules" ]; then
    echo "📦 Installing client dependencies..."
    cd client
    if command -v pnpm &> /dev/null; then
        pnpm install
    else
        npm install
    fi
    cd ..
fi

echo "🔨 Building initial client build..."
cd client
if command -v pnpm &> /dev/null; then
    pnpm build
else
    npm run build
fi
cd ..

echo "🚀 Starting Go server..."
go run main.go &
SERVER_PID=$!

# Wait a moment for server to start
sleep 2

echo "🚀 Starting React development server..."
cd client
if command -v pnpm &> /dev/null; then
    pnpm dev &
else
    npm run dev &
fi
CLIENT_PID=$!
cd ..

echo ""
echo "✅ Development environment is running!"
echo "📱 React dev server: http://localhost:5173 (with hot reload)"
echo "🖥️  Go server: http://localhost:5000 (serving production build)"
echo "🔌 API endpoints: http://localhost:5000/api/"
echo ""
echo "💡 For full-stack development:"
echo "   - Use http://localhost:5173 for frontend development with hot reload"
echo "   - API calls from React dev server will proxy to Go server on :5000"
echo "   - Use http://localhost:5000 to test the production build"
echo ""
echo "Press Ctrl+C to stop both servers"

# Wait for either process to exit
wait