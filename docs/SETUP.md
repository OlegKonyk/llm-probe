# Quick Setup Guide

## Step 1: Install Dependencies

```bash
# Install all dependencies for both backend and testing framework
npm install
```

## Step 2: Install Ollama (Local LLM)

### macOS
```bash
# Download and install from https://ollama.ai
# Or use Homebrew
brew install ollama

# Start Ollama service
ollama serve

# In another terminal, pull the model
ollama pull llama3.1:8b
```

### Linux
```bash
curl -fsSL https://ollama.ai/install.sh | sh
ollama serve
ollama pull llama3.1:8b
```

## Step 3: Verify Ollama is Running

```bash
# Test that Ollama is accessible
curl http://localhost:11434/api/generate -d '{
  "model": "llama3.1:8b",
  "prompt": "Hello!"
}'
```

## Step 4: Start the Backend Service

```bash
npm run backend
```

The service will start on `http://localhost:3000`

## Step 5: Test the API

```bash
# Health check
curl http://localhost:3000/health

# Test summarization
curl -X POST http://localhost:3000/api/v1/summarize \
  -H "Content-Type: application/json" \
  -d '{
    "transcript": "Agent: How can I help? Customer: I forgot my password. Agent: I will send you a reset link. Customer: Thanks!",
    "options": {
      "maxLength": 100,
      "includeKeyPoints": true
    }
  }'
```

## Step 6: Run Tests

```bash
# Run all tests
npm test

# Watch mode for development
npm run test:watch
```

## Project Structure

```
llm-principals/
├── backend/                    # Express API service
│   ├── src/
│   │   ├── index.ts           # Entry point
│   │   ├── api/               # REST endpoints
│   │   ├── services/          # Business logic
│   │   └── types/             # TypeScript types
│   └── package.json
│
├── testing-framework/          # Test suite
│   ├── tests/
│   │   ├── unit/              # Unit tests
│   │   ├── integration/       # Integration tests
│   │   ├── component/         # LLM quality tests
│   │   └── regression/        # Golden dataset tests
│   └── package.json
│
└── golden-dataset/            # Test cases with expected outputs
    └── sample-001.json
```

## Next Steps

1. **Add more golden dataset cases** - Create realistic call transcripts
2. **Implement unit tests** - Test prompt building and parsing logic
3. **Add semantic similarity** - Install sentence-transformers or use API
4. **Build component tests** - Validate LLM output quality
5. **Implement monitoring** - Track latency, tokens, quality metrics

## Troubleshooting

### Ollama not responding
- Make sure `ollama serve` is running
- Check `http://localhost:11434` is accessible
- Verify model is downloaded: `ollama list`

### Port already in use
- Change PORT in backend/.env: `PORT=3001`
- Or kill process using port 3000: `lsof -ti:3000 | xargs kill`

### TypeScript errors
- Ensure Node.js 18+ is installed: `node --version`
- Rebuild: `npm run build --workspace=backend`
