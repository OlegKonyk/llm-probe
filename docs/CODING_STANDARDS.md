# Coding Standards & Best Practices

**LLM Testing Framework - Development Guidelines**

This document outlines the coding standards, patterns, and best practices for this project. All contributors should follow these guidelines to maintain code quality and consistency.

**Code Quality Score: 8.5/10** ⭐

---

## Table of Contents

1. [Industry Standards References](#industry-standards-references)
2. [Language-Specific Standards](#language-specific-standards)
3. [Naming Conventions](#naming-conventions)
4. [Code Organization](#code-organization)
5. [Error Handling](#error-handling)
6. [Documentation](#documentation)
7. [Security Guidelines](#security-guidelines)
8. [Performance Guidelines](#performance-guidelines)
9. [Testing Standards](#testing-standards)
10. [Code Review Checklist](#code-review-checklist)

---

## Industry Standards References

This project follows industry-standard best practices from recognized authorities:

### TypeScript/JavaScript

1. **[Airbnb JavaScript Style Guide](https://github.com/airbnb/javascript)**
   - Most popular JavaScript style guide (140k+ stars)
   - Comprehensive rules for modern ES6+ JavaScript
   - We follow: const/let usage, arrow functions, template literals, destructuring

2. **[Google TypeScript Style Guide](https://google.github.io/styleguide/tsguide.html)**
   - Authoritative TypeScript practices from Google
   - We follow: Explicit return types, access modifiers, no `any` usage

3. **[Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)**
   - Production-ready Node.js patterns (100k+ stars)
   - We follow: Environment variables, error handling, security practices

4. **[TypeScript Deep Dive](https://basarat.gitbook.io/typescript/)**
   - Comprehensive TypeScript patterns
   - We follow: Strict mode, type inference, generics

### Python

1. **[PEP 8 - Style Guide for Python Code](https://peps.python.org/pep-0008/)**
   - Official Python style guide
   - We follow: Naming conventions, indentation, line length, imports

2. **[Google Python Style Guide](https://google.github.io/styleguide/pyguide.html)**
   - Production Python patterns
   - We follow: Docstrings, type hints, error handling

3. **[The Hitchhiker's Guide to Python](https://docs.python-guide.org/)**
   - Best practices for Python development
   - We follow: Project structure, code style, testing

### Clean Code Principles

1. **[Clean Code by Robert C. Martin](https://www.oreilly.com/library/view/clean-code-a/9780136083238/)**
   - Industry standard for code quality
   - We follow: Meaningful names, small functions, single responsibility

2. **[SOLID Principles](https://en.wikipedia.org/wiki/SOLID)**
   - Object-oriented design principles
   - We follow: Single responsibility, dependency injection, interface segregation

---

## Language-Specific Standards

### TypeScript

#### tsconfig.json Configuration

```json
{
  "compilerOptions": {
    "strict": true,              // Enable all strict type checking
    "noImplicitAny": true,       // No implicit 'any' types
    "strictNullChecks": true,    // Strict null checking
    "esModuleInterop": true,     // ES module compatibility
    "target": "ES2022",          // Modern JavaScript
    "module": "ESNext",          // ES modules
    "moduleResolution": "node"   // Node module resolution
  }
}
```

**✅ Required:**
- Strict mode enabled
- No `any` types (use `unknown` if necessary)
- Explicit return types on public functions
- ES modules with `.js` extensions in imports

#### Example - Good TypeScript:

```typescript
// ✅ GOOD: Explicit types, proper error handling
export class SecurityDetector {
  private patterns: Map<string, RegExp>;

  constructor() {
    this.patterns = new Map([
      ['email', /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g],
    ]);
  }

  public detect(text: string): SecurityDetectionResult {
    const violations: SecurityViolation[] = [];

    try {
      // Implementation
      return { violations, riskScore: 0, summary: 'No issues detected' };
    } catch (error) {
      throw new SecurityDetectionError(
        'Detection failed',
        error instanceof Error ? error : undefined
      );
    }
  }
}
```

```typescript
// ❌ BAD: No types, unclear error handling
export class SecurityDetector {
  patterns;

  constructor() {
    this.patterns = new Map();
  }

  detect(text) {
    try {
      // Implementation
    } catch (e) {
      throw e; // Don't just rethrow
    }
  }
}
```

---

### Python

#### Type Hints (Python 3.9+)

**✅ Required:**
- Type hints on all public functions
- Use `typing` module: `List`, `Dict`, `Optional`, `Union`
- Dataclasses for structured data

#### Example - Good Python:

```python
# ✅ GOOD: Type hints, docstrings, clear structure
from typing import Dict, List, Optional
from dataclasses import dataclass

@dataclass
class EvaluationResult:
    """Result of summary evaluation."""
    similarity: float
    bleu_score: float
    meets_threshold: bool
    details: Dict[str, float]

def evaluate_summary(
    generated: str,
    reference: str,
    threshold: float = 0.7
) -> EvaluationResult:
    """
    Evaluate generated summary against reference.

    Args:
        generated: Generated summary text
        reference: Reference (golden) summary
        threshold: Minimum similarity threshold (0-1)

    Returns:
        EvaluationResult with scores and pass/fail status

    Raises:
        ValueError: If threshold is not between 0 and 1
    """
    if not 0 <= threshold <= 1:
        raise ValueError(f"Threshold must be 0-1, got {threshold}")

    # Implementation
    return EvaluationResult(
        similarity=0.85,
        bleu_score=0.75,
        meets_threshold=True,
        details={"cosine": 0.85, "jaccard": 0.72}
    )
```

```python
# ❌ BAD: No types, unclear return value
def evaluate_summary(generated, reference, threshold=0.7):
    # Implementation
    return {"similarity": 0.85, "bleu": 0.75, "pass": True}
```

---

## Naming Conventions

### TypeScript/JavaScript

| Type | Convention | Example |
|------|------------|---------|
| Variables | camelCase | `const userCount = 10;` |
| Functions | camelCase | `function calculateScore() {}` |
| Classes | PascalCase | `class SecurityDetector {}` |
| Interfaces | PascalCase | `interface EvaluationResult {}` |
| Type Aliases | PascalCase | `type LogLevel = 'info' | 'error';` |
| Constants | UPPER_SNAKE_CASE | `const MAX_RETRIES = 3;` |
| Private Methods | camelCase with `private` | `private validateInput() {}` |
| Files | kebab-case | `security-detector.ts` |

### Python

| Type | Convention | Example |
|------|------------|---------|
| Variables | snake_case | `user_count = 10` |
| Functions | snake_case | `def calculate_score():` |
| Classes | PascalCase | `class SecurityDetector:` |
| Constants | UPPER_SNAKE_CASE | `MAX_RETRIES = 3` |
| Private Functions | _leading_underscore | `def _validate_input():` |
| Files | snake_case | `security_detector.py` |
| Modules | snake_case | `text_similarity.py` |

---

## Code Organization

### File Structure

```
project/
├── src/                        # Source code
│   ├── api/                    # HTTP endpoints (backend)
│   ├── services/               # Business logic (backend)
│   ├── evaluators/             # Quality evaluation (framework)
│   ├── metrics/                # Calculations (framework)
│   ├── security/               # Security detection
│   ├── performance/            # Performance tracking
│   ├── monitoring/             # Test result aggregation
│   ├── types/                  # TypeScript types & schemas
│   └── utils/                  # Helpers and utilities
├── tests/                      # Test files
│   ├── unit/                   # Unit tests
│   ├── integration/            # Integration tests
│   ├── component/              # Component tests
│   └── e2e/                    # End-to-end tests
└── docs/                       # Documentation
```

### Module Organization

**✅ GOOD: Single Responsibility**

```typescript
// security-detector.ts - Only security detection
export class SecurityDetector {
  analyzeInput(text: string): SecurityDetectionResult { }
  analyzeOutput(text: string): SecurityDetectionResult { }
}

// metrics-aggregator.ts - Only metrics aggregation
export class MetricsAggregator {
  recordTestRun(result: TestRunResult): void { }
  checkForRegressions(): RegressionAlert[] { }
}
```

**❌ BAD: Mixed Responsibilities**

```typescript
// utils.ts - Everything mixed together
export class Utils {
  detectSecurity() { }
  aggregateMetrics() { }
  calculateSimilarity() { }
  formatLogs() { }
}
```

### Class Member Ordering

**✅ Standard Order:**

1. Static properties
2. Instance properties
3. Constructor
4. Static methods
5. Public methods
6. Private methods

```typescript
export class PerformanceCollector {
  // 1. Static properties
  private static readonly DEFAULT_TIMEOUT = 30000;

  // 2. Instance properties
  private metrics: PerformanceMetric[] = [];
  private startTime: number;

  // 3. Constructor
  constructor(private config: PerformanceConfig) {
    this.startTime = Date.now();
  }

  // 4. Static methods
  public static create(): PerformanceCollector {
    return new PerformanceCollector({ timeout: this.DEFAULT_TIMEOUT });
  }

  // 5. Public methods
  public recordMetric(metric: PerformanceMetric): void { }
  public generateReport(): PerformanceReport { }

  // 6. Private methods
  private mean(values: number[]): number { }
  private percentile(values: number[], p: number): number { }
}
```

---

## Error Handling

### TypeScript Error Handling

**✅ GOOD: Specific, Actionable Errors**

```typescript
export class SummarizationService {
  async summarize(text: string): Promise<SummarizationResult> {
    try {
      const response = await this.ollama.generate({ model: this.model, prompt: text });
      return { summary: response.response, model: this.model };
    } catch (error) {
      // Specific error types with helpful messages
      if (error instanceof Error) {
        if (error.message.includes('ECONNREFUSED')) {
          throw new Error(
            `Failed to connect to Ollama service at ${this.host}. ` +
            `Please ensure Ollama is running: ollama serve`
          );
        }
        if (error.message.includes('model') && error.message.includes('not found')) {
          throw new Error(
            `Model '${this.model}' not found. ` +
            `Please download it: ollama pull ${this.model}`
          );
        }
        throw new Error(`LLM generation failed: ${error.message}`);
      }
      throw new Error('LLM generation failed with unknown error');
    }
  }
}
```

**❌ BAD: Generic, Unhelpful Errors**

```typescript
async summarize(text: string) {
  try {
    const response = await this.ollama.generate({ model: this.model, prompt: text });
    return response;
  } catch (e) {
    throw e; // Don't just rethrow
  }
}
```

### Custom Error Classes

```typescript
export class GoldenDatasetValidationError extends Error {
  constructor(
    message: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'GoldenDatasetValidationError';
  }
}

// Usage
throw new GoldenDatasetValidationError(
  'Invalid test case structure',
  { testCaseId: 'call_001', missingField: 'transcript' }
);
```

### Python Error Handling

```python
def load_test_case(case_id: str) -> GoldenTestCase:
    """Load a test case by ID."""
    try:
        with open(file_path, 'r') as f:
            data = json.load(f)
    except FileNotFoundError:
        raise FileNotFoundError(
            f"Test case file not found: {file_path}. "
            f"Expected file for test case '{case_id}'."
        )
    except json.JSONDecodeError as e:
        raise ValueError(
            f"Invalid JSON in test case file '{file_path}': {e.msg}"
        )

    return GoldenTestCase(**data)
```

---

## Documentation

### JSDoc Comments (TypeScript)

**✅ Required for all public APIs:**

```typescript
/**
 * Evaluate summary quality against golden reference.
 *
 * Performs comprehensive quality assessment using multiple metrics:
 * - Semantic similarity (cosine, Jaccard, overlap)
 * - BLEU score for n-gram overlap
 * - Length validation (word count)
 * - Required terms presence
 *
 * @param generated - Generated summary text
 * @param golden - Reference summary from golden dataset
 * @param thresholds - Quality thresholds for pass/fail
 * @returns Evaluation result with scores and pass/fail status
 *
 * @example
 * ```typescript
 * const result = evaluator.evaluate(
 *   "Customer requested password reset",
 *   goldenTestCase.golden_summary,
 *   { min_semantic_similarity: 0.7 }
 * );
 * console.log(result.similarity); // 0.85
 * console.log(result.passes); // true
 * ```
 */
public evaluate(
  generated: string,
  golden: GoldenTestCase,
  thresholds?: Partial<QualityThresholds>
): EvaluationResult {
  // Implementation
}
```

### Python Docstrings

**✅ Google-style docstrings:**

```python
def cosine_similarity(text1: str, text2: str) -> float:
    """
    Calculate cosine similarity between two text strings.

    Uses TF (term frequency) vectors and cosine distance. Good for
    measuring semantic similarity between texts of different lengths.

    Args:
        text1: First text to compare
        text2: Second text to compare

    Returns:
        Similarity score between 0 (completely different) and 1 (identical)

    Raises:
        ValueError: If either text is empty

    Example:
        >>> cosine_similarity("hello world", "hello earth")
        0.707
        >>> cosine_similarity("cat", "dog")
        0.0

    Note:
        This implementation uses simple word tokenization.
        For production, consider using spaCy or NLTK for better tokenization.
    """
    if not text1 or not text2:
        raise ValueError("Both texts must be non-empty")

    # Implementation
```

### Inline Comments

**✅ GOOD: Explain WHY, not WHAT**

```typescript
// Calculate composite similarity with weighted contributions
// Cosine (50%) captures semantic similarity
// Jaccard (30%) measures word overlap
// Overlap (20%) handles different-length texts
const similarity =
  SIMILARITY_WEIGHTS.COSINE * cosine +
  SIMILARITY_WEIGHTS.JACCARD * jaccard +
  SIMILARITY_WEIGHTS.OVERLAP * overlap;
```

**❌ BAD: Obvious comments**

```typescript
// Add 1 to counter
counter = counter + 1;

// Loop through array
for (let i = 0; i < items.length; i++) {
  // Get item at index i
  const item = items[i];
}
```

---

## Security Guidelines

### Input Validation

**✅ Always validate user input:**

```typescript
import { z } from 'zod';

// Define schema
export const summarizeRequestSchema = z.object({
  transcript: z.string()
    .min(10, 'Transcript must be at least 10 characters')
    .max(50000, 'Transcript must be less than 50000 characters'),
  options: z.object({
    maxLength: z.number().min(50).max(500).optional(),
  }).optional(),
});

// Validate request
const validatedData = summarizeRequestSchema.parse(req.body);
```

### Environment Variables

**✅ Validate and provide defaults:**

```typescript
// Good
const PORT = parseInt(process.env.PORT || '3000', 10);
const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://localhost:11434';

// Validate required vars
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}
```

### Sensitive Data

**✅ Never log sensitive data:**

```typescript
// Good
logger.info('User login attempt', { userId: user.id });

// Bad - Never do this!
logger.info('User login', { password: user.password });
```

**✅ Mask PII in logs:**

```typescript
private maskSensitiveData(text: string): string {
  return text
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[EMAIL]')
    .replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[SSN]')
    .replace(/\b\d{16}\b/g, '[CARD]');
}
```

### Rate Limiting

**✅ Always implement rate limiting on APIs:**

```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: { error: 'Too many requests, please try again later' },
});

app.use('/api/', limiter);
```

---

## Performance Guidelines

### Avoid N+1 Queries

**❌ BAD: O(n²) complexity**

```typescript
// Rebuilds word count for each word in vocabulary
const vec1 = Array.from(vocab).map((word) =>
  words1.filter((w) => w === word).length
);
```

**✅ GOOD: O(n) complexity**

```typescript
// Build frequency map once
const freq1 = new Map<string, number>();
for (const word of words1) {
  freq1.set(word, (freq1.get(word) || 0) + 1);
}
const vec1 = Array.from(vocab).map((word) => freq1.get(word) || 0);
```

### Caching

**✅ Cache expensive computations:**

```typescript
export class GoldenDatasetLoader {
  private indexCache: GoldenDatasetIndex | null = null;

  loadIndex(): GoldenDatasetIndex {
    if (this.indexCache) {
      return this.indexCache;
    }

    const index = JSON.parse(readFileSync(this.indexPath, 'utf-8'));
    this.validateIndex(index);
    this.indexCache = index;
    return index;
  }
}
```

---

## Testing Standards

### Test Structure (AAA Pattern)

**✅ Arrange, Act, Assert:**

```typescript
describe('SecurityDetector', () => {
  it('should detect SQL injection attempts', () => {
    // Arrange
    const detector = new SecurityDetector();
    const maliciousInput = "'; DROP TABLE users; --";

    // Act
    const result = detector.analyzeInput(maliciousInput);

    // Assert
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0].type).toBe('sql_injection');
    expect(result.riskScore).toBeGreaterThan(50);
  });
});
```

### Test Coverage Requirements

- **Unit Tests:** 80%+ coverage
- **Integration Tests:** Critical paths covered
- **E2E Tests:** Happy path + error scenarios
- **Property-Based Tests:** Invariants verified

---

## Code Review Checklist

### Before Submitting PR

- [ ] Code follows naming conventions
- [ ] All public functions have JSDoc/docstrings
- [ ] TypeScript strict mode enabled, no `any` types
- [ ] Error handling is comprehensive and helpful
- [ ] No hardcoded secrets or credentials
- [ ] Input validation on all user inputs
- [ ] Tests added for new functionality
- [ ] All tests passing (220 TypeScript + 25 Python)
- [ ] No console.log (use logger instead)
- [ ] Performance considered for loops and data structures
- [ ] Security implications reviewed
- [ ] Comments explain WHY, not WHAT

### Reviewer Checklist

- [ ] Code is readable and maintainable
- [ ] Proper error handling
- [ ] Security vulnerabilities checked
- [ ] Performance implications considered
- [ ] Tests are meaningful and comprehensive
- [ ] Documentation is clear and accurate
- [ ] No code duplication
- [ ] Follows SOLID principles

---

## References

### Official Documentation
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [Python Documentation](https://docs.python.org/3/)
- [Node.js Documentation](https://nodejs.org/docs/latest/api/)
- [Express.js Guide](https://expressjs.com/en/guide/routing.html)

### Style Guides
- [Airbnb JavaScript Style Guide](https://github.com/airbnb/javascript)
- [Google TypeScript Style Guide](https://google.github.io/styleguide/tsguide.html)
- [PEP 8 - Python Style Guide](https://peps.python.org/pep-0008/)

### Best Practices
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)
- [Clean Code JavaScript](https://github.com/ryanmcdermott/clean-code-javascript)
- [The Twelve-Factor App](https://12factor.net/)

### Security
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP API Security](https://owasp.org/www-project-api-security/)

---

## Version

**Version:** 1.0
**Last Updated:** November 3, 2025
**Code Quality Score:** 8.5/10

---

## Contributing

All contributors must follow these coding standards. When in doubt:

1. Follow existing patterns in the codebase
2. Reference the industry standards linked above
3. Ask for clarification in code review
4. Prioritize readability and maintainability

**Remember: Code is read 10x more than it's written. Write for humans, not machines.**
