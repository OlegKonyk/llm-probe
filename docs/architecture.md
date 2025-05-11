# Architecture

This document provides an overview of the llm-probe system architecture, component design, and key patterns.

## System Overview

llm-probe is a testing framework for LLM-powered applications, built around a call summarization service. The system consists of:

1. **Backend Service** - Express.js API that provides call summarization using LLMs
2. **TypeScript Testing Framework** - Comprehensive test suite with 8 test types
3. **Python Testing Framework** - Core testing modules with Python implementation
4. **Golden Dataset** - Reference test cases for regression testing
5. **Infrastructure** - AWS CDK for cloud deployment

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Testing Layer                           │
│  ┌────────────────┐              ┌────────────────┐        │
│  │  TypeScript    │              │    Python      │        │
│  │  Test Suite    │              │  Test Suite    │        │
│  │  (8 types)     │              │  (Core tests)  │        │
│  └────────┬───────┘              └────────┬───────┘        │
│           │                               │                 │
└───────────┼───────────────────────────────┼─────────────────┘
            │                               │
            └───────────────┬───────────────┘
                           │ HTTP
                           ▼
            ┌──────────────────────────────┐
            │      Backend API             │
            │   (Express.js + TypeScript)  │
            │                              │
            │  ┌────────────────────────┐  │
            │  │  Summarization Service │  │
            │  └───────────┬────────────┘  │
            │              │                │
            └──────────────┼────────────────┘
                           │
                ┌──────────┴──────────┐
                │                     │
                ▼                     ▼
        ┌──────────────┐      ┌──────────────┐
        │   Ollama     │      │ AWS Bedrock  │
        │  (Local LLM) │      │ (Cloud LLM)  │
        └──────────────┘      └──────────────┘
```

## Component Architecture

### 1. Backend Service

The backend follows a layered architecture with clear separation of concerns:

```
┌─────────────────────────────────────────┐
│           HTTP Layer                    │
│  ┌─────────────────────────────────┐   │
│  │  Express App + Middleware       │   │
│  │  - CORS, Helmet, Rate Limiting  │   │
│  └─────────────┬───────────────────┘   │
└────────────────┼───────────────────────┘
                 │
┌────────────────┼───────────────────────┐
│           API Routes                    │
│  ┌─────────────▼───────────────────┐   │
│  │  POST /api/summarize            │   │
│  │  GET  /health                   │   │
│  └─────────────┬───────────────────┘   │
└────────────────┼───────────────────────┘
                 │
┌────────────────┼───────────────────────┐
│         Service Layer                   │
│  ┌─────────────▼───────────────────┐   │
│  │  SummarizationService           │   │
│  │  - Orchestrates summarization   │   │
│  │  - Manages token limits         │   │
│  │  - Returns results + metadata   │   │
│  └─────────────┬───────────────────┘   │
└────────────────┼───────────────────────┘
                 │
┌────────────────┼───────────────────────┐
│         LLM Provider Layer              │
│  ┌─────────────▼───────────────────┐   │
│  │  LLMFactory (Factory Pattern)   │   │
│  │  ┌──────────┐  ┌──────────┐    │   │
│  │  │ Ollama   │  │ Bedrock  │    │   │
│  │  │ Provider │  │ Provider │    │   │
│  │  └──────────┘  └──────────┘    │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

#### Key Components

**API Layer** (`backend/src/api/`)
- Route handlers for endpoints
- Request validation using Zod schemas
- Response formatting

**Middleware** (`backend/src/middleware/`)
- CORS configuration
- Security headers (Helmet)
- Rate limiting
- Error handling

**Service Layer** (`backend/src/services/`)
- `SummarizationService` - Core business logic
- `PromptBuilder` - Constructs prompts for LLMs

**LLM Provider Layer** (`backend/src/llm/`)
- `LLMProvider` interface - Contract definition
- `OllamaProvider` - Local LLM implementation
- `BedrockProvider` - AWS Bedrock implementation
- `LLMFactory` - Creates appropriate provider

**Configuration** (`backend/src/config/`)
- Environment variable validation
- Type-safe configuration objects
- Multi-environment support

**Utilities** (`backend/src/utils/`)
- `Logger` - Structured logging
- `TokenCounter` - Token counting with tiktoken

### 2. Testing Framework Architecture

The testing framework uses a layered approach with different test types:

```
┌──────────────────────────────────────────────────────┐
│              Test Pyramid                            │
│                                                      │
│                   ┌─────────┐                       │
│                   │   E2E   │  ← Live System        │
│                   └────┬────┘                       │
│                 ┌──────┴──────┐                     │
│                 │ Integration │  ← API Contracts    │
│                 └──────┬──────┘                     │
│             ┌──────────┴──────────┐                 │
│             │     Component       │  ← Quality      │
│             └──────────┬──────────┘                 │
│         ┌──────────────┴──────────────┐             │
│         │          Unit Tests          │  ← Logic   │
│         └─────────────────────────────┘             │
│                                                      │
│  Cross-cutting:                                     │
│  ├─ Security Tests (all layers)                     │
│  ├─ Performance Tests (integration + e2e)           │
│  ├─ Regression Tests (component + e2e)              │
│  └─ Property-Based Tests (unit + component)         │
└──────────────────────────────────────────────────────┘
```

#### Testing Modules

**Evaluators** (`ts-test/src/evaluators/`, `py-test/src/evaluators/`)
- Text similarity calculations
- Summary quality assessment
- Metric aggregation

**Security** (`ts-test/src/security/`, `py-test/src/security/`)
- Prompt injection detection
- PII detection (emails, SSNs, credit cards)
- Input sanitization validation

**Performance** (`ts-test/src/performance/`, `py-test/src/performance/`)
- Latency tracking
- Token usage monitoring
- SLO compliance checking

**Monitoring** (`ts-test/src/monitoring/`, `py-test/src/monitoring/`)
- Metrics aggregation
- Regression detection
- Performance trending

### 3. Golden Dataset

The golden dataset provides reference test cases:

```
golden-dataset/
├── index.json              # Catalog of all samples
└── sample-*.json          # Individual test cases
    ├── callTranscript     # Original call text
    ├── expectedSummary    # Human-written reference
    └── metadata           # Test case metadata
```

**Purpose**:
- Regression testing baseline
- Quality evaluation reference
- Property-based test inputs
- Integration test data

## Design Patterns

### 1. Factory Pattern (LLM Providers)

The LLM provider system uses the Factory pattern to create appropriate providers:

```typescript
interface LLMProvider {
  generateText(prompt: string): Promise<string>
  getName(): string
}

class LLMFactory {
  static create(config: Config): LLMProvider {
    if (config.provider === 'ollama') {
      return new OllamaProvider(config)
    } else if (config.provider === 'bedrock') {
      return new BedrockProvider(config)
    }
    throw new Error('Unknown provider')
  }
}
```

**Benefits**:
- Easy to add new providers
- Swappable implementations
- Testable with mocks
- Configuration-driven selection

### 2. Builder Pattern (Prompt Construction)

Prompts are constructed using a builder-like pattern:

```typescript
class PromptBuilder {
  buildSummarizationPrompt(
    transcript: string,
    options: SummarizationOptions
  ): string {
    // Constructs structured prompt
    // Based on options (maxLength, includeKeyPoints, etc.)
  }
}
```

**Benefits**:
- Consistent prompt structure
- Configurable prompt generation
- Easy to test and modify
- Reusable across providers

### 3. Strategy Pattern (Text Similarity)

Different similarity metrics implement a common interface:

```typescript
interface SimilarityMetric {
  calculate(text1: string, text2: string): number
}

class CosineSimilarity implements SimilarityMetric { }
class JaccardSimilarity implements SimilarityMetric { }
class BleuScore implements SimilarityMetric { }
```

**Benefits**:
- Pluggable metrics
- Easy to add new metrics
- Testable in isolation
- Composable (composite metric)

### 4. Repository Pattern (Golden Dataset)

The golden dataset uses a repository-like pattern:

```typescript
class GoldenDatasetLoader {
  loadAll(): TestCase[]
  loadById(id: string): TestCase
  getIndex(): DatasetIndex
}
```

**Benefits**:
- Abstraction over data storage
- Centralized data access
- Easy to mock for tests
- Consistent data format

## Data Flow

### Summarization Request Flow

```
1. Client → POST /api/summarize
   ├─ Request: { callTranscript, options }
   │
2. → Middleware
   ├─ CORS check
   ├─ Rate limiting
   ├─ Schema validation (Zod)
   │
3. → Route Handler
   ├─ Extract request data
   │
4. → SummarizationService
   ├─ Validate input length
   ├─ Build prompt (PromptBuilder)
   ├─ Count tokens (TokenCounter)
   │
5. → LLM Provider (Ollama/Bedrock)
   ├─ Send prompt
   ├─ Wait for response (with timeout)
   │
6. ← LLM Response
   │
7. ← SummarizationService
   ├─ Extract summary
   ├─ Calculate metadata (tokens, latency)
   │
8. ← Route Handler
   ├─ Format response
   │
9. ← Client
   └─ Response: { summary, metadata }
```

### Test Execution Flow

```
1. Test Runner (Jest/pytest)
   │
2. → Test Suite
   ├─ Load test data (golden dataset)
   ├─ Setup test environment
   │
3. → Execute Test
   ├─ Call backend API
   ├─ Get response
   │
4. → Evaluate Response
   ├─ Run similarity metrics
   ├─ Check quality criteria
   ├─ Verify security
   ├─ Measure performance
   │
5. → Assert Results
   ├─ Compare to expectations
   ├─ Collect metrics
   │
6. ← Report Results
   └─ Test pass/fail + metrics
```

## Security Architecture

### Defense in Depth

```
┌─────────────────────────────────────┐
│  Network Layer                      │
│  ├─ CORS policies                   │
│  ├─ Rate limiting                   │
│  └─ Helmet security headers         │
└────────────┬────────────────────────┘
             │
┌────────────▼────────────────────────┐
│  Application Layer                  │
│  ├─ Input validation (Zod)          │
│  ├─ API key authentication          │
│  └─ Request size limits             │
└────────────┬────────────────────────┘
             │
┌────────────▼────────────────────────┐
│  Business Logic Layer               │
│  ├─ Prompt injection detection      │
│  ├─ PII filtering                   │
│  └─ Output sanitization             │
└─────────────────────────────────────┘
```

### Security Testing

Security tests validate:
- Prompt injection attempts are detected
- PII is not leaked in responses
- Malicious inputs are handled safely
- Rate limits are enforced
- Authentication works correctly

## Monitoring & Observability

### Metrics Collection

```
┌─────────────────────────────────────┐
│  Application Metrics                │
│  ├─ Request latency                 │
│  ├─ Token usage                     │
│  ├─ Error rates                     │
│  └─ Request volume                  │
└────────────┬────────────────────────┘
             │
┌────────────▼────────────────────────┐
│  Quality Metrics                    │
│  ├─ Similarity scores               │
│  ├─ Summary length                  │
│  └─ Test pass rates                 │
└────────────┬────────────────────────┘
             │
┌────────────▼────────────────────────┐
│  Metrics Aggregator                 │
│  ├─ Stores metrics                  │
│  ├─ Calculates aggregates           │
│  └─ Detects regressions             │
└─────────────────────────────────────┘
```

## Deployment Architecture

### Docker Compose (Development)

```
┌─────────────────────────────────────┐
│  Docker Compose Network             │
│                                     │
│  ┌──────────────┐  ┌─────────────┐ │
│  │   Backend    │  │   Ollama    │ │
│  │   :3000      │←─┤   :11434    │ │
│  └──────┬───────┘  └─────────────┘ │
│         │                           │
│  ┌──────▼───────┐                  │
│  │  Volume      │                  │
│  │  (Models)    │                  │
│  └──────────────┘                  │
└─────────────────────────────────────┘
```

### AWS (Production)

```
┌─────────────────────────────────────────┐
│  AWS Region                             │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │  API Gateway                    │   │
│  └────────────┬────────────────────┘   │
│               │                         │
│  ┌────────────▼────────────────────┐   │
│  │  Lambda / ECS                   │   │
│  │  (Backend Service)              │   │
│  └────────┬─────────────┬──────────┘   │
│           │             │               │
│  ┌────────▼────────┐  ┌▼────────────┐  │
│  │  Bedrock        │  │  Secrets    │  │
│  │  (LLM)          │  │  Manager    │  │
│  └─────────────────┘  └─────────────┘  │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │  CloudWatch (Monitoring)        │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

## Key Architectural Decisions

### 1. Provider Abstraction
**Decision**: Abstract LLM providers behind a common interface

**Rationale**: Allows swapping between local (Ollama) and cloud (Bedrock) providers without changing application code

### 2. Stateless Design
**Decision**: Backend is completely stateless

**Rationale**: Enables horizontal scaling, simplifies deployment, improves reliability

### 3. Schema Validation
**Decision**: Use Zod for runtime schema validation

**Rationale**: Type safety at runtime, better error messages, validates external data

### 4. Test Isolation
**Decision**: Each test type in separate directory with clear purpose

**Rationale**: Easier to run specific test types, clearer organization, better CI/CD integration

### 5. Golden Dataset
**Decision**: Use human-written reference summaries

**Rationale**: Provides quality baseline, enables regression detection, validates metrics

### 6. Multi-Language Testing
**Decision**: Implement tests in both TypeScript and Python

**Rationale**: Demonstrates portability, serves different audiences, validates approach

## Performance Considerations

### Caching Strategy
- No caching in backend (stateless)
- LLM responses are not cached (each request is fresh)
- Test results can be cached for faster reruns

### Timeout Management
- 90-second timeout for LLM operations
- Prevents hanging requests
- Configurable per environment

### Resource Limits
- Rate limiting prevents abuse
- Request size limits prevent DoS
- Token counting prevents excessive costs

## Extensibility

The architecture supports easy extension:

1. **New LLM Providers**: Implement `LLMProvider` interface
2. **New Test Types**: Add new test directory and suite
3. **New Metrics**: Implement similarity metric interface
4. **New Security Checks**: Add to security detector
5. **New Deployment Targets**: Update CDK infrastructure

## Next Steps

- Review [Testing Strategy](testing-strategy.md) for test implementation details
- See [Tech Stack](tech-stack.md) for technology specifics
- Check [Getting Started](getting-started.md) for running the system
