# Integration Tests

Integration tests validate the API contract and service integration without necessarily testing the full LLM functionality.

## Running Integration Tests

### Without Backend Running (Default)
```bash
npm run test:integration
```

Most tests are **skipped by default** (using `it.skip`) because they require the backend service to be running.

### With Backend Running
To run the full integration suite:

1. **Start Ollama** (in one terminal):
```bash
ollama serve
```

2. **Start Backend** (in another terminal):
```bash
npm run backend
```

3. **Remove `.skip` from tests** in `api-contract.test.ts`, then run:
```bash
npm run test:integration
```

Or run tests that hit the live API:
```bash
npm test -- api-contract.test.ts --testNamePattern="should"
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

Integration tests are skipped by default because:
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
1. Use `it.skip()` if they require the backend running
2. Add mock-based tests that always run
3. Document any prerequisites
4. Include clear error messages
5. Test both happy path and error cases
