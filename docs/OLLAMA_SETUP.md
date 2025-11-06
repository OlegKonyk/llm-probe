# Ollama Setup Guide

Ollama is installed on your system at `/opt/homebrew/bin/ollama`.

## Starting Ollama

### Option 1: Run as a service (recommended)
```bash
# Start Ollama in the background
ollama serve &

# Or in a separate terminal window
ollama serve
```

### Option 2: Check if already running
```bash
# Test if Ollama is responding
curl http://localhost:11434/api/tags
```

## Download the Model

```bash
# Pull Llama 3.1 8B model (recommended for this project)
ollama pull llama3.1:8b

# Alternative: smaller, faster model for testing
ollama pull llama3.1:3b

# List installed models
ollama list
```

## Test the Model

```bash
# Quick test
ollama run llama3.1:8b "Hello, how are you?"

# Or via API
curl http://localhost:11434/api/generate -d '{
  "model": "llama3.1:8b",
  "prompt": "Summarize: Customer called about password reset. Agent sent link.",
  "stream": false
}'
```

## Troubleshooting

### Port Already in Use
```bash
# Find what's using port 11434
lsof -i :11434

# Kill the process if needed
kill -9 <PID>
```

### Model Not Found
```bash
# List available models
ollama list

# Pull the model if missing
ollama pull llama3.1:8b
```

### Ollama Not Starting
```bash
# Check Ollama status
ps aux | grep ollama

# Restart Ollama
pkill ollama
ollama serve
```

## For This Project

Once Ollama is running, you can:

1. **Test backend manually**:
   ```bash
   npm run backend

   # In another terminal:
   curl -X POST http://localhost:3000/api/v1/summarize \
     -H "Content-Type: application/json" \
     -d '{"transcript": "Customer called about password reset."}'
   ```

2. **Run component tests** (will be implemented next):
   ```bash
   npm run test:component
   ```

## Working Without Ollama

The unit tests work fine without Ollama. Only integration and component tests that actually call the LLM require Ollama to be running.

You can develop and test most features without Ollama running, then start it when you need to test the actual LLM integration.
