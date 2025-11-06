#!/bin/bash
set -e

# Start Ollama in background
echo "Starting Ollama service..."
ollama serve &
OLLAMA_PID=$!

# Wait for Ollama to be ready with health checks
echo "Waiting for Ollama to start..."
MAX_RETRIES=30
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
  if curl -s http://localhost:11434/api/tags >/dev/null 2>&1; then
    echo "✅ Ollama is ready!"
    break
  fi
  RETRY_COUNT=$((RETRY_COUNT + 1))
  echo "Waiting for Ollama... ($RETRY_COUNT/$MAX_RETRIES)"
  sleep 1
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
  echo "❌ Ollama failed to start after ${MAX_RETRIES}s"
  exit 1
fi

# Verify model is available
echo "Verifying llama3.2:latest model..."
if ! ollama list | grep -q "llama3.2:latest"; then
  echo "❌ Model llama3.2:latest not found!"
  echo "Available models:"
  ollama list
  exit 1
fi

echo "✅ Model llama3.2:latest is available"

# Start Express backend
echo "Starting Express backend on port $PORT..."
cd /app
exec npm start
