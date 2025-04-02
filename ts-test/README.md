# LLM Testing Framework

A comprehensive, production-ready testing framework for Large Language Model (LLM) applications. Built with TypeScript, this framework provides enterprise-grade quality assurance for LLM-powered systems with real-world validation against live endpoints.

## 🎯 Project Overview

This project demonstrates how to build robust, reliable LLM applications through comprehensive testing strategies. It includes a reference implementation (call summarization service) and a complete testing framework that validates quality, security, performance, and reliability.

### What Makes This Special

- ✅ **204 tests** covering all aspects of LLM applications
- ✅ **100% passing** against live Ollama backend
- ✅ **Zero skipped tests** - full production validation
- ✅ **Real-world metrics** from actual LLM responses
- ✅ **Security validation** - prompt injection, PII detection
- ✅ **Performance tracking** - latency, tokens, cost analysis

## 📊 Test Results

```
Test Suites: 11 passed, 11 total
Tests:       204 passed, 204 total
Time:        ~38s
```

**Test Coverage:**
- 🧪 Unit Tests (15) - Core functionality
- 🔧 Component Tests (24) - Quality evaluation
- 🔗 Integration Tests (9) - API contracts
- 📈 Regression Tests (22) - Golden dataset validation
- 🎲 Property-Based Tests (18) - Invariants (1800+ cases)
- 🔒 Security Tests (33) - Threat detection
- ⚡ Performance Tests (27) - SLO validation
- 🌐 E2E Tests (12) - Live system validation

## 🏗️ Architecture

```
ts-test/
├── backend/              # Reference LLM service
│   └── src/
│       ├── server.ts     # Express API server
│       └── services/     # LLM integration
├── src/                  # Testing framework core
│   ├── evaluators/       # Quality evaluation
│   ├── metrics/          # Similarity, BLEU, etc.
│   ├── security/         # Threat detection
│   ├── performance/      # Metrics collection
│   └── utils/            # Golden dataset, helpers
├── tests/               # Test suites
│   ├── unit/            # Unit tests
│   ├── component/       # Component tests
│   ├── integration/     # API contract tests
│   ├── regression/      # Regression tests
│   ├── property-based/  # Property-based tests
│   ├── security/        # Security tests
│   ├── performance/     # Performance tests
│   └── e2e/             # End-to-end tests
└── data/
    └── golden-dataset/  # Test cases & expected outputs
```

## 🚀 Quick Start

### Prerequisites

1. **Node.js 18+** and npm
2. **Ollama** - Local LLM runtime
3. **llama3.2 model** (or similar)

### Installation

```bash
# Install dependencies
npm install

# Install Ollama (macOS)
brew install ollama

# Pull the model
ollama pull llama3.2:latest

# Start Ollama server
ollama serve
```

### Running the Backend

```bash
cd backend
npm install
npm run dev
```

Backend will start on `http://localhost:3000`

### Running Tests

```bash
# Run all tests (requires backend running)
npm test

# Run specific test suite by folder
npm test tests/unit
npm test tests/component
npm test tests/integration
npm test tests/regression
npm test tests/property-based
npm test tests/security
npm test tests/performance
npm test tests/e2e

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch
```

## 📚 Testing Framework Features

### 1. Quality Evaluation

Validates LLM output quality using multiple metrics:

```typescript
import { SummaryEvaluator } from './src/evaluators/summary-evaluator';

const evaluator = new SummaryEvaluator();
const result = evaluator.evaluate(summary, testCase);

console.log(`Similarity: ${result.similarity}`);
console.log(`BLEU Score: ${result.bleuScore}`);
console.log(`Passed: ${result.passed}`);
```

**Metrics:**
- Semantic similarity (cosine similarity on character n-grams)
- BLEU score (translation quality metric)
- Length validation (word count constraints)
- Required terms coverage
- Detailed failure reporting

### 2. Security Detection

Detects security threats in inputs and outputs:

```typescript
import { SecurityDetector } from './src/security/security-detector';

const detector = new SecurityDetector();

// Check input for attacks
const inputResult = detector.analyzeInput(userInput);
if (!inputResult.safe) {
  console.log(`Risk Score: ${inputResult.riskScore}/100`);
  console.log('Violations:', inputResult.violations);
}

// Check output for PII leakage
const outputResult = detector.analyzeOutput(llmResponse);
```

**Detects:**
- **Prompt Injection** - Override system instructions
- **Jailbreaking** - Bypass safety guidelines
- **PII Leakage** - SSN, credit cards, emails, addresses, API keys
- **Data Exfiltration** - System prompt extraction

### 3. Performance Tracking

Monitor latency, tokens, and cost:

```typescript
import { PerformanceCollector } from './src/performance/performance-collector';

const collector = new PerformanceCollector();
const request = collector.startRequest();

// ... make LLM call ...

request.end({
  inputTokens: 150,
  outputTokens: 75,
  model: 'llama3.2:latest'
});

const report = collector.generateReport();
console.log(`P95 Latency: ${report.p95Latency}ms`);
console.log(`Total Cost: $${report.totalCost}`);
```

**Tracks:**
- Latency (mean, median, P95, P99, min, max, std dev)
- Token usage (input, output, total)
- Cost estimation (local and commercial models)
- Throughput (requests/sec, tokens/sec)
- SLO compliance checking

### 4. Golden Dataset

Curated test cases with expected outputs:

```typescript
import { GoldenDatasetLoader } from './src/utils/golden-dataset';

const loader = new GoldenDatasetLoader();

// Load specific test case
const testCase = loader.loadTestCase('call_001');

// Load by category
const billingCases = loader.loadByCategory('billing_inquiry');

// Load by difficulty
const hardCases = loader.loadByDifficulty('hard');
```

**Dataset includes:**
- 5 test cases across different categories
- Difficulty levels (easy, medium, hard)
- Expected summaries (human-written)
- Quality thresholds
- Required terms

### 5. Property-Based Testing

Verify invariants with generated test cases:

```typescript
import fc from 'fast-check';

fc.assert(
  fc.property(
    fc.string({ minLength: 10, maxLength: 500 }),
    (transcript) => {
      const prompt = promptBuilder.buildSummarizationPrompt(transcript);
      return prompt.includes(transcript); // Invariant: prompt always contains transcript
    }
  ),
  { numRuns: 100 } // 100 random test cases
);
```

**Tests 18 properties with 100 iterations each = 1800+ test cases**

## 🎯 Use Cases

### 1. Quality Regression Testing

Detect when model updates degrade quality:

```bash
# Baseline test
npm test -- tests/regression/

# After model update, compare results
# Framework tracks similarity scores over time
```

### 2. Security Auditing

Validate inputs before sending to LLM:

```typescript
const inputCheck = detector.analyzeInput(userMessage);
if (inputCheck.riskScore > 50) {
  return { error: 'Potentially malicious input detected' };
}
```

### 3. Performance Monitoring

Track system performance in production:

```typescript
const slo = {
  maxP95Latency: 2000,  // 2s
  maxP99Latency: 5000,  // 5s
  maxErrorRate: 0.01,   // 1%
};

const result = collector.checkSLO(slo);
if (!result.passed) {
  console.error('SLO violations:', result.violations);
}
```

### 4. A/B Testing Models

Compare different models or prompts:

```typescript
// Test with llama3.2
const result1 = await testAllCases('llama3.2:latest');

// Test with mistral
const result2 = await testAllCases('mistral:7b');

// Compare average similarity
console.log('Llama avg:', result1.avgSimilarity);
console.log('Mistral avg:', result2.avgSimilarity);
```

## 📖 API Reference

### SummaryEvaluator

Evaluates summary quality against golden reference:

```typescript
class SummaryEvaluator {
  evaluate(summary: string, testCase: TestCase): EvaluationResult;
  evaluateConsistency(summaries: string[]): ConsistencyResult;
  generateReport(summary: string, testCase: TestCase): string;
}
```

### SecurityDetector

Detects security threats:

```typescript
class SecurityDetector {
  analyzeInput(input: string): SecurityDetectionResult;
  analyzeOutput(output: string): SecurityDetectionResult;
  analyzeTransaction(input: string, output: string): SecurityDetectionResult;
}
```

### PerformanceCollector

Tracks performance metrics:

```typescript
class PerformanceCollector {
  startRequest(): RequestHandle;
  generateReport(): PerformanceReport;
  checkSLO(slo: PerformanceSLO): SLOResult;
  getMetrics(): PerformanceMetric[];
}
```

## 🔍 Real Performance Data

From live Ollama testing (llama3.2:latest):

```
Latency:
  Mean: 2.7s
  P95: 3.4s
  P99: 3.4s

Quality:
  Similarity: 0.34-0.60 (vs golden summaries)

Security:
  PII Detection: Working (detected addresses in outputs)
  Risk Score: 0-15 (low risk)

Throughput:
  Requests/sec: 0.38
  Tokens/sec: 86
```

## 🛠️ Development

### Project Structure

```
├── backend/              # LLM service (Express + Ollama)
├── src/                  # Testing framework
│   ├── evaluators/       # Quality metrics
│   ├── metrics/          # Similarity algorithms
│   ├── security/         # Threat detection
│   ├── performance/      # Performance tracking
│   └── utils/            # Helpers, dataset loader
├── tests/                # All test suites
└── data/                 # Golden dataset
```

### Adding New Tests

1. **Create test file** in appropriate directory
2. **Import required modules** from `src/`
3. **Write tests** using Jest syntax
4. **Run tests** with `npm test`

Example:

```typescript
import { describe, it, expect } from '@jest/globals';
import { SummaryEvaluator } from '../../src/evaluators/summary-evaluator';

describe('My New Test Suite', () => {
  it('should validate summary quality', () => {
    const evaluator = new SummaryEvaluator();
    // ... test code
  });
});
```

### Adding Golden Dataset Cases

1. Edit `data/golden-dataset/test-cases.json`
2. Add new test case with:
   - `id`, `category`, `difficulty`
   - `transcript` (input)
   - `golden_summary` (expected output)
   - `required_terms`, `thresholds`

## 📝 Configuration

### Environment Variables

```bash
# Backend
PORT=3000
OLLAMA_HOST=http://localhost:11434
MODEL_NAME=llama3.2:latest

# Testing
TEST_TIMEOUT=15000
```

### Test Thresholds

Adjust in `data/golden-dataset/test-cases.json`:

```json
{
  "thresholds": {
    "min_semantic_similarity": 0.75,
    "min_word_count": 30,
    "max_word_count": 100
  }
}
```

## 🤝 Contributing

This is a demonstration project for blog articles about LLM testing. Feel free to use it as a reference for your own projects.

## 📄 License

MIT

## 🔗 Related Resources

- [Ollama Documentation](https://ollama.ai/)
- [Jest Testing Framework](https://jestjs.io/)
- [Fast-check (Property-Based Testing)](https://fast-check.dev/)

## 💡 Key Learnings

1. **LLMs are non-deterministic** - Test for quality ranges, not exact outputs
2. **Security is critical** - Validate all inputs and outputs
3. **Performance varies** - Track P95/P99, not just averages
4. **Golden datasets are essential** - Human-written references provide quality benchmarks
5. **Property-based testing finds edge cases** - Generates tests you wouldn't think of
6. **Real integration tests matter** - Mock tests don't catch real-world issues

---

Built with ❤️ for demonstrating production-grade LLM testing practices.
