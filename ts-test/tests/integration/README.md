# Integration Tests

Integration tests validate the API contract and service integration without necessarily testing the full LLM functionality.

## Running Integration Tests

### Without Backend Running (Default)
```bash
npm run test:integration
```

Tests requiring a live backend are **skipped by default**. Mock-based contract validation tests will still run.

### With Backend Running
To run the full integration suite including live API tests:

1. **Start Ollama** (in one terminal):
```bash
ollama serve
```

2. **Start Backend** (in another terminal):
```bash
npm run backend
```

3. **Run tests with environment variable**:
```bash
RUN_LIVE_TESTS=true npm run test:integration
```

### Environment Variables

- `RUN_LIVE_TESTS`: Set to `true` to enable tests that require a live backend (default: skipped)
- `API_BASE_URL`: Override the backend URL (default: `http://localhost:3000`)

Example with custom backend URL:
```bash
RUN_LIVE_TESTS=true API_BASE_URL=http://localhost:8080 npm run test:integration
```

## Test Categories

### 1. Mock Contract Tests (Always Run)
These validate the expected request/response structure without hitting the API:
- Request shape validation
- Response shape validation
- Error response format

### 2. Live API Tests (Skipped by Default)
These hit the actual running backend:
- Health check endpoint
- POST /api/v1/summarize with valid requests
- Error handling (validation errors, missing fields)
- Edge cases (boundary values)

## Test Organization

```
integration/
├── api-contract.test.ts       # API structure validation
├── error-handling.test.ts     # Error scenarios (coming soon)
└── rate-limiting.test.ts      # Rate limit behavior (coming soon)
```

## Why Skip by Default?

Live integration tests are skipped by default because:
1. They require external services (Ollama, backend)
2. They're slower than unit tests
3. They may fail in CI/CD without proper setup
4. Unit and component tests provide sufficient coverage for most development

Enable them when:
- Testing the full system integration
- Before deployments
- When debugging API issues
- In CI/CD with proper service setup

## Adding New Integration Tests

When adding new tests:
1. Use `itLive()` instead of `it()` if they require the backend running
2. Add mock-based tests that always run (use regular `it()`)
3. Document any prerequisites
4. Include clear error messages
5. Test both happy path and error cases
