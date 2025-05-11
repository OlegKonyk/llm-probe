# llm-probe

Production-ready testing framework for LLM applications—learn how to test AI that's different every time.

## Overview

llm-probe is a comprehensive testing framework demonstrating best practices for testing Large Language Model (LLM) applications. It provides a complete implementation of a call summarization service with 8 types of tests across TypeScript and Python.

**Key Features:**
- Multi-language testing frameworks (TypeScript and Python)
- 8 comprehensive test types (unit, integration, component, e2e, security, performance, regression, property-based)
- Golden dataset with human-written reference summaries
- Real-time LLM integration using Ollama
- Production-ready monitoring and metrics
- AWS deployment infrastructure

## Quick Start

```bash
# Start all services (Ollama + Backend)
./start.sh

# Run TypeScript tests
npm test --workspace=ts-test

# Run Python tests
cd py-test && source .venv/bin/activate && pytest
```

## Documentation

Comprehensive documentation is available in the [docs](./docs) directory:

- **[Getting Started](./docs/getting-started.md)** - How to run the application and tests
- **[Tech Stack](./docs/tech-stack.md)** - Technologies, frameworks, and tools used
- **[Architecture](./docs/architecture.md)** - System design and component overview
- **[Testing Strategy](./docs/testing-strategy.md)** - Testing approaches and methodologies

## Project Structure

```
llm-probe/
├── backend/              # Express.js LLM API service
├── ts-test/             # TypeScript testing framework
├── py-test/             # Python testing framework
├── golden-dataset/      # Reference test cases
├── infrastructure/      # AWS CDK deployment
└── docs/               # Documentation
```

## Tech Stack

- **Backend**: Node.js 22, TypeScript 5.7, Express.js 4.21
- **LLM Integration**: Ollama (local), AWS Bedrock (cloud)
- **TypeScript Testing**: Jest 29.7, fast-check (property-based)
- **Python Testing**: pytest 7.4, hypothesis (property-based)
- **Infrastructure**: Docker, Docker Compose, AWS CDK

## Testing Approach

This framework addresses the unique challenge of testing LLM applications with non-deterministic outputs through:

1. **Unit Tests** - Core logic without LLM calls
2. **Integration Tests** - API contract validation
3. **Component Tests** - Quality evaluation with multiple metrics
4. **E2E Tests** - Live system validation
5. **Security Tests** - Threat detection (prompt injection, PII)
6. **Performance Tests** - Latency and SLO tracking
7. **Regression Tests** - Golden dataset validation
8. **Property-Based Tests** - Invariant testing

## Repository Components

- **[backend](./backend)** - Express API with LLM integration
- **[ts-test](./ts-test)** - Comprehensive TypeScript test suite
- **[py-test](./py-test)** - Python testing framework
- **[golden-dataset](./golden-dataset)** - Reference test data
- **[infrastructure](./infrastructure)** - AWS deployment code

## License

MIT
