# LLM Testing Framework

Testing framework for LLM applications with quality evaluation, security detection, and performance tracking.

## Quick Start

```bash
# Install dependencies
npm install

# Start Ollama
brew install ollama
ollama pull llama3.2:latest
ollama serve

# Start backend
cd backend && npm install && npm run dev

# Run tests
npm test
```

## Test Types

- **Unit** - Core functionality (90 tests)
- **Integration** - API contracts (10 tests)
- **Security** - Threat detection
- **Performance** - Latency and SLO validation

## Running Tests

```bash
npm test                    # All tests
npm test tests/unit         # Unit tests only
npm test tests/integration  # Integration tests
npm run test:coverage       # With coverage
```

## Configuration

```bash
# Backend (.env)
PORT=3000
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=llama3.2:latest
TRUST_PROXY=false  # Set to true when behind reverse proxy
```

## Key Features

- Quality evaluation (semantic similarity, BLEU score)
- Security detection (prompt injection, PII leakage)
- Performance tracking (latency, tokens, cost)
- Golden dataset for regression testing

## License

MIT
