#!/bin/bash
# Startup script for LLM Testing Framework
# Pulls the required Ollama model and starts the services

set -e

echo "🚀 Starting LLM Testing Framework..."

# Portable timeout function (works on both macOS and Linux)
run_with_timeout() {
    local timeout=$1
    shift
    local cmd="$@"

    ( eval "$cmd" ) &
    local pid=$!

    ( sleep $timeout && kill -9 $pid 2>/dev/null ) &
    local killer=$!

    if wait $pid 2>/dev/null; then
        kill -9 $killer 2>/dev/null
        return 0
    else
        return 1
    fi
}

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "❌ Error: docker-compose is not installed"
    echo "Please install Docker Desktop or docker-compose"
    exit 1
fi

# Use docker compose or docker-compose depending on what's available
COMPOSE_CMD="docker compose"
if ! docker compose version &> /dev/null; then
    COMPOSE_CMD="docker-compose"
fi

# Start services
echo "📦 Starting Docker containers..."
$COMPOSE_CMD up -d

# Wait for Ollama to be healthy
echo "⏳ Waiting for Ollama to be ready..."
run_with_timeout 120 'until docker exec llm-ollama ollama list &> /dev/null; do sleep 2; done' || {
    echo "❌ Ollama failed to start within 120 seconds"
    $COMPOSE_CMD logs ollama
    exit 1
}

# Pull the model if not already present
echo "📥 Checking for llama3.2:latest model..."
if ! docker exec llm-ollama ollama list | grep -q "llama3.2:latest"; then
    echo "📥 Pulling llama3.2:latest model (this may take a few minutes)..."
    docker exec llm-ollama ollama pull llama3.2:latest
else
    echo "✅ Model llama3.2:latest already available"
fi

# Wait for backend to be healthy
echo "⏳ Waiting for backend to be ready..."
run_with_timeout 60 'until curl -sf http://localhost:3000/health > /dev/null; do sleep 2; done' || {
    echo "❌ Backend failed to start within 60 seconds"
    $COMPOSE_CMD logs backend
    exit 1
}

echo ""
echo "✅ LLM Testing Framework is ready!"
echo ""
echo "📊 Services:"
echo "  - Backend API: http://localhost:3000"
echo "  - Ollama API:  http://localhost:11434"
echo ""
echo "🧪 Run tests:"
echo "  npm test --workspace=ts-test"
echo ""
echo "📝 View logs:"
echo "  $COMPOSE_CMD logs -f"
echo ""
echo "🛑 Stop services:"
echo "  $COMPOSE_CMD down"
echo ""
