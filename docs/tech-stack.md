# Tech Stack

This document provides a comprehensive overview of the technologies, frameworks, and tools used in the llm-probe project.

## Backend Service

### Runtime & Framework
- **Node.js 22** (Alpine Linux in Docker) - JavaScript runtime
- **TypeScript 5.7** - Type-safe JavaScript
- **Express.js 4.21** - Web application framework
- **tsx** - TypeScript execution and watch mode for development

### LLM Integration
- **Ollama** - Local LLM inference engine
  - Client library for Node.js integration
  - Runs llama3.2:latest model by default
- **AWS Bedrock** - Cloud-based LLM provider (optional)
  - `@aws-sdk/client-bedrock-runtime` - Bedrock client
  - `@aws-sdk/client-secrets-manager` - Secrets management

### Core Dependencies
- **cors** - Cross-Origin Resource Sharing middleware
- **helmet** - Security headers middleware
- **express-rate-limit** - API rate limiting
- **zod 3.25** - TypeScript-first schema validation
- **tiktoken** - Token counting for LLM inputs/outputs

### Development Tools
- **Jest 29.7** - Testing framework
- **ts-jest 29.2** - TypeScript integration for Jest
- **ESLint** - Code linting
- **Prettier** - Code formatting

## TypeScript Testing Framework

### Testing Infrastructure
- **Jest 29.7** - Primary test runner
  - Configuration: `ts-jest/presets/default-esm`
  - ESM module support
  - 30-second timeout for LLM operations
  - Coverage reporting (text, JSON, HTML, LCOV)

### Testing Libraries
- **fast-check 3.23** - Property-based testing
  - Generates random test inputs
  - Validates invariants across many scenarios
- **zod 3.25** - Schema validation in tests

### Test Types Implemented
1. **Unit Tests** (90+ tests) - Core functionality
2. **Integration Tests** - API contract validation
3. **Component Tests** - Summary quality evaluation
4. **E2E Tests** - Live endpoint testing
5. **Security Tests** - Threat detection
6. **Performance Tests** - Latency and SLO tracking
7. **Regression Tests** - Golden dataset validation
8. **Property-Based Tests** - Invariant testing

## Python Testing Framework

### Runtime & Environment
- **Python 3.9+** - Programming language
- **Virtual Environment (.venv)** - Isolated dependency management

### Testing Infrastructure
- **pytest 7.4** - Test framework
- **pytest-asyncio 0.21** - Async test support
- **pytest-cov 4.1** - Coverage reporting

### Core Libraries
- **requests 2.31** - HTTP client for API testing
- **hypothesis 6.92** - Property-based testing
- **numpy 1.24** - Numerical computations
- **scipy 1.11** - Scientific computing
- **nltk 3.8** - Natural language toolkit (BLEU scores)

### Code Quality Tools
- **mypy** - Static type checking
- **ruff** - Fast Python linter
- **black** - Code formatter

## Containerization & Orchestration

### Docker
- **Multi-stage Dockerfile** - Optimized builds
  - Build stage: Node 22-Alpine
  - Production stage: Node 22-Alpine
  - Non-root user execution for security
- **Docker Compose** - Service orchestration
  - Ollama service (LLM runtime)
  - Backend service (API)
  - Health checks and dependencies

### Ollama Container
- **Image**: ollama/ollama:0.12.11
- **GPU Support**: Optional NVIDIA GPU acceleration
- **Volume**: Persistent model storage
- **Port**: 11434

## Infrastructure as Code

### AWS CDK
- **TypeScript CDK** - Infrastructure definitions
- **CloudFormation** - Generated templates
- **AWS Services**:
  - Bedrock - Managed LLM service
  - Secrets Manager - API key management
  - CloudWatch - Monitoring and logging

## Development Tools

### Package Management
- **npm** - Node.js package manager
- **npm workspaces** - Monorepo management
  - Root workspace
  - `backend` workspace
  - `ts-test` workspace

### Version Control
- **Git** - Source control
- **GitHub** - Repository hosting
- **.gitignore** - Version control exclusions

### Build & Development Scripts

**Backend**:
```json
{
  "dev": "tsx watch src/index.ts",
  "build": "tsc",
  "start": "node dist/index.js",
  "test": "jest",
  "type-check": "tsc --noEmit"
}
```

**TypeScript Testing**:
```json
{
  "test": "jest",
  "test:unit": "jest tests/unit",
  "test:integration": "jest tests/integration",
  "test:e2e": "jest tests/e2e",
  "test:coverage": "jest --coverage",
  "test:watch": "jest --watch"
}
```

## Data & Configuration

### Configuration Management
- **Environment Variables** - Runtime configuration
  - `.env` files for local development
  - Docker Compose environment variables
  - AWS Secrets Manager for production
- **AWS Authentication** - Multiple credential sources
  - AWS SSO (local development)
  - IAM roles (production)
  - Environment variables (testing)
- **Zod Schemas** - Type-safe config validation

### Test Data
- **Golden Dataset** - Reference test cases
  - JSON format
  - Index file (`index.json`)
  - Individual sample files
  - Human-written reference summaries

## Monitoring & Observability

### Logging
- **Custom Logger** - Structured logging utility
  - Timestamp formatting
  - Log level support
  - Console output

### Metrics
- **Performance Metrics** - Latency tracking
- **Token Counting** - LLM usage metrics
- **SLO Monitoring** - Service level objectives

## Security

### Application Security
- **Helmet.js** - Security headers
  - Content Security Policy
  - X-Frame-Options
  - X-Content-Type-Options
- **Rate Limiting** - DDoS protection
- **CORS** - Cross-origin controls
- **API Key Authentication** - Optional auth layer

### Security Testing
- **Prompt Injection Detection** - Security test suite
- **PII Detection** - Sensitive data checks
  - Email addresses
  - Social Security Numbers
  - Credit card numbers
- **Input Sanitization** - Validation testing

## Quality Assurance

### Text Similarity Metrics
Implemented in both TypeScript and Python:
- **Cosine Similarity** - Word frequency-based comparison
- **Jaccard Similarity** - Set-based overlap
- **Overlap Coefficient** - Partial overlap measurement
- **BLEU Score** - N-gram precision (translation quality)
- **Composite Similarity** - Weighted combination

### Code Quality
- **TypeScript** - Static typing
- **ESLint** - Linting rules
- **Prettier** - Code formatting
- **mypy** (Python) - Type checking
- **ruff** (Python) - Fast linting

## API Documentation

### REST API
- **OpenAPI/Swagger** - API specification (implicit)
- **Zod Schemas** - Request/response validation
- **Health Endpoint** - Service status
- **Summarization Endpoint** - Core functionality

## Performance

### Optimization
- **Alpine Linux** - Minimal Docker images
- **Multi-stage Builds** - Smaller production images
- **Node.js 22** - Latest LTS performance improvements
- **Connection Pooling** - Efficient resource usage

### Scalability Considerations
- **Horizontal Scaling** - Stateless design
- **Rate Limiting** - Resource protection
- **Timeout Management** - 90s LLM timeout
- **Health Checks** - Load balancer support

## Summary by Category

### Languages
- TypeScript 5.7
- Python 3.9+
- JavaScript (Node.js 22)

### Frameworks
- Express.js 4.21
- Jest 29.7
- pytest 7.4

### LLM Integration
- Ollama (local)
- AWS Bedrock (cloud)
- Tiktoken (tokenization)

### Testing
- Jest (TypeScript)
- pytest (Python)
- fast-check (property-based)
- hypothesis (property-based)

### Infrastructure
- Docker & Docker Compose
- AWS CDK
- CloudFormation

### Quality & Security
- Zod (validation)
- Helmet (security)
- ESLint, Prettier (code quality)
- mypy, ruff, black (Python quality)
