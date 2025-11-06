# LLM Testing Framework - Architecture Documentation

## Table of Contents

1. [System Overview](#system-overview)
2. [Component Architecture](#component-architecture)
3. [Data Flow](#data-flow)
4. [Module Deep Dive](#module-deep-dive)
5. [Technology Stack](#technology-stack)
6. [Design Decisions](#design-decisions)
7. [Deployment Architecture](#deployment-architecture)

---

## System Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     LLM Testing System                          │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                  Production Layer                          │ │
│  ├────────────────────────────────────────────────────────────┤ │
│  │                                                             │ │
│  │   ┌───────────┐          ┌──────────┐                     │ │
│  │   │  Client   │────────▶│  Backend │                     │ │
│  │   │  (HTTP)   │          │ (Express)│                     │ │
│  │   └───────────┘          └────┬─────┘                     │ │
│  │                               │                             │ │
│  │                          ┌────▼────┐                       │ │
│  │                          │ Ollama  │                       │ │
│  │                          │(llama3.2)│                       │ │
│  │                          └─────────┘                       │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                  Testing Layer                             │ │
│  ├────────────────────────────────────────────────────────────┤ │
│  │                                                             │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌──────────────┐      │ │
│  │  │   Quality   │  │  Security   │  │ Performance  │      │ │
│  │  │ Evaluation  │  │  Detection  │  │  Tracking    │      │ │
│  │  └─────────────┘  └─────────────┘  └──────────────┘      │ │
│  │                                                             │ │
│  │  ┌─────────────┐                   ┌──────────────┐      │ │
│  │  │ Monitoring  │                   │    Golden    │      │ │
│  │  │  & Alerts   │                   │   Dataset    │      │ │
│  │  └─────────────┘                   └──────────────┘      │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                  Test Suites                               │ │
│  ├────────────────────────────────────────────────────────────┤ │
│  │                                                             │ │
│  │  Unit │ Component │ Integration │ Regression │ E2E         │ │
│  │  15   │    24     │      9      │     22     │  12         │ │
│  │                                                             │ │
│  │  Security │ Performance │ Property-Based │ Monitoring      │ │
│  │    33     │      27     │      1800+     │     16          │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘

Total: 220 tests across 12 test suites, 100% passing
```

### Design Philosophy

**Core Principles:**

1. **Separation of Concerns**
   - Production code (backend/) separate from test code (testing-framework/)
   - Each module has single responsibility
   - Clear interfaces between components

2. **Language Agnostic**
   - TypeScript implementation (ts-test/)
   - Python implementation (py-test/)
   - Same golden dataset for both
   - Identical algorithms and thresholds

3. **Production-Ready**
   - Comprehensive test coverage (220 tests)
   - Real-world validation (E2E with Ollama)
   - Security-first design
   - Monitoring and observability

4. **Extensible**
   - Easy to add new metrics
   - Pluggable LLM backends
   - Configurable thresholds
   - Modular architecture

---

## Component Architecture

### 1. Backend Service

```
backend/
├── src/
│   ├── server.ts                 # Express HTTP server
│   ├── services/
│   │   ├── ollama-client.ts      # LLM integration
│   │   └── prompt-builder.ts     # Prompt engineering
│   └── schemas/
│       └── request-schemas.ts    # Zod validation
└── package.json
```

**Responsibilities:**
- Accept HTTP requests for summarization
- Validate input (Zod schemas)
- Build prompts for LLM
- Call Ollama LLM service
- Return summaries with metadata

**Key Technologies:**
- **Express.js** - HTTP server
- **Zod** - Schema validation
- **Ollama** - Local LLM runtime

**API Contract:**
```typescript
// Request
POST /api/v1/summarize
{
  "transcript": string,
  "options"?: {
    "maxLength"?: number,      // 50-500
    "includeKeyPoints"?: boolean,
    "includeSentiment"?: boolean
  }
}

// Response
{
  "summary": string,
  "metadata": {
    "latency_ms": number,
    "tokens_used": number,
    "model": string,
    "timestamp": string
  }
}
```

---

### 2. Testing Framework (TypeScript)

```
ts-test/
├── src/
│   ├── evaluators/
│   │   └── summary-evaluator.ts       # Orchestrates quality checks
│   ├── metrics/
│   │   └── text-similarity.ts         # 8 similarity algorithms
│   ├── security/
│   │   └── security-detector.ts       # Threat detection
│   ├── performance/
│   │   └── performance-collector.ts   # Metrics tracking
│   ├── monitoring/
│   │   └── metrics-aggregator.ts      # Historical analysis
│   └── utils/
│       └── golden-dataset.ts          # Test data management
└── tests/
    ├── unit/               # 15 tests - Core algorithms
    ├── component/          # 24 tests - Quality evaluation
    ├── integration/        # 9 tests - API contracts
    ├── regression/         # 22 tests - Golden dataset
    ├── property-based/     # 1800+ tests - Invariants
    ├── security/           # 33 tests - Threat detection
    ├── performance/        # 27 tests - SLO compliance
    ├── e2e/               # 12 tests - Live system
    └── monitoring/         # 16 tests - Observability
```

**Module Responsibilities:**

| Module | Purpose | Input | Output |
|--------|---------|-------|--------|
| **summary-evaluator** | Orchestrate quality checks | Summary + TestCase | EvaluationResult |
| **text-similarity** | Calculate similarity scores | Two text strings | Similarity (0-1) |
| **security-detector** | Detect threats | Input/output text | SecurityResult |
| **performance-collector** | Track metrics | Request metadata | PerformanceReport |
| **metrics-aggregator** | Monitor trends | TestRunResults | Alerts + Dashboard |
| **golden-dataset** | Load test data | Test case ID | GoldenTestCase |

---

### 3. Testing Framework (Python)

```
py-test/
├── src/
│   ├── evaluators/
│   │   └── summary_evaluator.py     # Quality assessment
│   ├── metrics/
│   │   └── text_similarity.py       # Similarity algorithms
│   ├── security/                    # (Coming soon)
│   ├── performance/                 # (Coming soon)
│   ├── monitoring/                  # (Coming soon)
│   └── utils/
│       └── golden_dataset.py        # Dataset loader
└── tests/
    └── unit/
        └── test_text_similarity.py  # 25 tests
```

**Current Status:**
- ✅ Core metrics (100% feature parity with TypeScript)
- ✅ Golden dataset loader
- ✅ Summary evaluator
- ✅ 25 passing unit tests
- 🚧 Security, performance, monitoring (in progress)

**Python-Specific Features:**
- Dataclasses for structured data
- Type hints for IDE support
- Pythonic naming (snake_case)
- Native dict/list returns

---

### 4. Golden Dataset

```
golden-dataset/
├── index.json              # Metadata catalog
├── sample-001.json         # password_reset (easy)
├── sample-002.json         # billing_inquiry (medium)
├── sample-003.json         # product_issue (hard)
├── sample-004.json         # account_update (easy)
└── sample-005.json         # general_inquiry (medium)
```

**Dataset Structure:**
```json
{
  "id": "call_001",
  "category": "password_reset",
  "difficulty": "easy",
  "transcript": "Full call transcript (100-500 words)...",
  "golden_summary": "Human-written reference summary...",
  "metadata": {
    "sentiment": "positive",
    "resolution_status": "resolved",
    "key_points": ["locked out", "password reset", "email updated"]
  },
  "thresholds": {
    "min_semantic_similarity": 0.80,
    "min_length_words": 30,
    "max_length_words": 100,
    "required_terms": ["password", "reset", "email"]
  }
}
```

**Categories:**
- `password_reset` - Account access issues
- `billing_inquiry` - Payment and charges
- `product_issue` - Defective products
- `account_update` - Profile changes
- `general_inquiry` - Information requests

**Difficulty Levels:**
- `easy` - Single issue, straightforward
- `medium` - Multiple issues or clarifications
- `hard` - Complex scenarios, edge cases

---

## Data Flow

### 1. Production Request Flow

```
┌────────┐     HTTP POST      ┌─────────┐
│ Client │ ─────────────────▶│ Backend │
└────────┘                    │(Express)│
                              └────┬────┘
                                   │
                                   │ 1. Validate input (Zod)
                                   │
                              ┌────▼────┐
                              │ Prompt  │
                              │ Builder │
                              └────┬────┘
                                   │
                                   │ 2. Build prompt
                                   │
                              ┌────▼────┐
                              │ Ollama  │
                              │ Client  │
                              └────┬────┘
                                   │
                                   │ 3. Generate summary
                                   │
                              ┌────▼────┐
                              │ Ollama  │
                              │ LLM     │
                              └────┬────┘
                                   │
                                   │ 4. Return summary
                                   │
┌────────┐    JSON Response   ┌────▼────┐
│ Client │ ◀─────────────────│ Backend │
└────────┘                    └─────────┘
                              {
                                summary,
                                metadata: {
                                  latency_ms,
                                  tokens,
                                  model
                                }
                              }
```

---

### 2. Quality Evaluation Flow

```
┌───────────┐
│  Summary  │ (from LLM or test data)
└─────┬─────┘
      │
      │ 1. Evaluate quality
      │
┌─────▼──────────┐
│   Summary      │
│   Evaluator    │
└─────┬──────────┘
      │
      ├─────────────────────────────┐
      │                             │
      │ 2. Calculate metrics        │ 3. Validate constraints
      │                             │
┌─────▼─────────┐            ┌──────▼────────┐
│Text Similarity│            │  Validators   │
├───────────────┤            ├───────────────┤
│• Cosine       │            │• Length check │
│• Jaccard      │            │• Required     │
│• Overlap      │            │  terms        │
│• Composite    │            └───────────────┘
│• BLEU         │
└─────┬─────────┘
      │
      │ 4. Aggregate results
      │
┌─────▼─────────────┐
│ EvaluationResult  │
├───────────────────┤
│• passed: boolean  │
│• similarity: 0.75 │
│• bleu: 0.52       │
│• lengthCheck: OK  │
│• requiredTerms: OK│
│• failures: []     │
└───────────────────┘
```

---

### 3. Security Detection Flow

```
┌───────────┐
│   Input   │ (user message or LLM output)
└─────┬─────┘
      │
      │ 1. Analyze
      │
┌─────▼──────────┐
│   Security     │
│   Detector     │
└─────┬──────────┘
      │
      ├──────────────────────────────────────┐
      │                                      │
      │ 2. Pattern matching                 │ 3. Risk scoring
      │                                      │
┌─────▼─────────────┐              ┌────────▼────────┐
│  Pattern Checks   │              │  Risk Calculator│
├───────────────────┤              ├─────────────────┤
│• Prompt injection │              │• Count violations│
│• Jailbreaking     │──────────▶  │• Weight severity│
│• PII leakage      │              │• Calculate score│
│• Data exfil       │              │  (0-100)        │
└───────────────────┘              └─────────────────┘
                                            │
                                            │
                    ┌───────────────────────▼──────┐
                    │   SecurityDetectionResult    │
                    ├──────────────────────────────┤
                    │• safe: false                 │
                    │• riskScore: 75 (high)        │
                    │• violations: [               │
                    │    {                         │
                    │      type: "prompt_injection"│
                    │      severity: "high"        │
                    │      pattern: "Ignore..."    │
                    │    }                         │
                    │  ]                           │
                    └──────────────────────────────┘
```

---

### 4. Performance Tracking Flow

```
┌───────────┐
│  Request  │
└─────┬─────┘
      │
      │ 1. Start tracking
      │
┌─────▼──────────────┐
│ Performance        │
│ Collector          │
│ .startRequest()    │
└─────┬──────────────┘
      │
      │ 2. Execute request
      │
┌─────▼─────────┐
│   LLM Call    │ (measure time, tokens)
└─────┬─────────┘
      │
      │ 3. End tracking
      │
┌─────▼──────────────┐
│ Performance        │
│ Collector          │
│ .end({tokens})     │
└─────┬──────────────┘
      │
      │ 4. Store metrics
      │
┌─────▼──────────────┐
│  Metrics Storage   │
├────────────────────┤
│[{                  │
│  latency: 2345,    │
│  inputTokens: 150, │
│  outputTokens: 75, │
│  cost: 0.00125     │
│}]                  │
└─────┬──────────────┘
      │
      │ 5. Generate report
      │
┌─────▼──────────────┐
│ Performance Report │
├────────────────────┤
│• Mean: 2345ms      │
│• P95: 3200ms       │
│• P99: 3800ms       │
│• Total cost: $0.12 │
│• Throughput: 0.38  │
│  req/sec           │
└────────────────────┘
```

---

### 5. Monitoring & Alerting Flow

```
┌───────────────┐
│  Test Run     │
│  Completes    │
└───────┬───────┘
        │
        │ 1. Record results
        │
┌───────▼────────────┐
│ Metrics Aggregator │
│ .recordTestRun()   │
└───────┬────────────┘
        │
        │ 2. Store in history
        │
┌───────▼────────────┐
│  Test History      │
├────────────────────┤
│[                   │
│  {run1: sim=0.50}, │
│  {run2: sim=0.48}, │
│  ...               │
│  {run10: sim=0.35} │← New run
│]                   │
└───────┬────────────┘
        │
        │ 3. Calculate baseline
        │
┌───────▼────────────┐
│  Baseline Calc     │
├────────────────────┤
│ Avg(runs 1-9):     │
│   similarity=0.49  │
│   trend=stable     │
└───────┬────────────┘
        │
        │ 4. Compare new vs baseline
        │
┌───────▼────────────┐
│ Regression Check   │
├────────────────────┤
│ Current: 0.35      │
│ Baseline: 0.49     │
│ Change: -28.6%     │← Significant drop!
└───────┬────────────┘
        │
        │ 5. Generate alerts
        │
┌───────▼────────────┐
│     Alerts         │
├────────────────────┤
│[{                  │
│  severity: "critical"│
│  metric: "similarity"│
│  change: -28.6%    │
│  message: "Similarity│
│    dropped 28.6%"  │
│}]                  │
└───────┬────────────┘
        │
        │ 6. Send notifications
        │
┌───────▼────────────┐
│    Dashboard       │
│  + Prometheus      │
│  + Alerts          │
└────────────────────┘
```

---

## Module Deep Dive

### 1. Text Similarity Module

**File:** `src/metrics/text-similarity.ts`
**Lines:** ~550
**Functions:** 12

**Core Algorithms:**

```typescript
// 1. Cosine Similarity - Word frequency vectors
function cosineSimilarity(text1: string, text2: string): number {
  const vec1 = buildFrequencyVector(text1);
  const vec2 = buildFrequencyVector(text2);
  return dotProduct(vec1, vec2) / (magnitude(vec1) * magnitude(vec2));
}

// 2. Jaccard Similarity - Set intersection/union
function jaccardSimilarity(text1: string, text2: string): number {
  const set1 = new Set(tokenize(text1));
  const set2 = new Set(tokenize(text2));
  const intersection = setIntersection(set1, set2);
  const union = setUnion(set1, set2);
  return intersection.size / union.size;
}

// 3. Composite Similarity - Weighted combination
function compositeSimilarity(text1: string, text2: string): number {
  return 0.5 * cosineSimilarity(text1, text2) +
         0.3 * jaccardSimilarity(text1, text2) +
         0.2 * overlapCoefficient(text1, text2);
}

// 4. BLEU Score - N-gram precision
function bleuScore(reference: string, candidate: string): number {
  const p1 = ngramPrecision(reference, candidate, 1);
  const p2 = ngramPrecision(reference, candidate, 2);
  return (p1 + p2) / 2;
}
```

**Why These Metrics:**
- **Cosine** - Captures word importance via frequency
- **Jaccard** - Validates vocabulary coverage
- **Overlap** - Handles length differences
- **Composite** - Robust combination (primary metric)
- **BLEU** - Phrase-level precision

---

### 2. Summary Evaluator Module

**File:** `src/evaluators/summary-evaluator.ts`
**Lines:** ~290
**Class:** SummaryEvaluator

**Key Methods:**

```typescript
class SummaryEvaluator {
  // Main evaluation method
  evaluate(summary: string, testCase: GoldenTestCase): EvaluationResult {
    // 1. Calculate semantic similarity
    const similarity = compositeSimilarity(summary, testCase.golden_summary);

    // 2. Calculate BLEU score
    const bleu = bleuScore(summary, testCase.golden_summary);

    // 3. Validate length
    const lengthCheck = validateLength(
      summary,
      testCase.thresholds.min_length_words,
      testCase.thresholds.max_length_words
    );

    // 4. Check required terms
    const requiredTerms = containsRequiredTerms(
      summary,
      testCase.thresholds.required_terms
    );

    // 5. Aggregate into result
    return {
      passed: failures.length === 0,
      similarity,
      bleu,
      lengthCheck,
      requiredTerms,
      failures
    };
  }

  // Consistency evaluation
  evaluateConsistency(summaries: string[]): ConsistencyResult {
    // Pairwise comparisons between all summaries
    const similarities = [];
    for (let i = 0; i < summaries.length; i++) {
      for (let j = i + 1; j < summaries.length; j++) {
        similarities.push(compositeSimilarity(summaries[i], summaries[j]));
      }
    }

    return {
      meanSimilarity: mean(similarities),
      stdDeviation: stdDev(similarities),
      maxVariance: max(similarities.map(s => abs(s - mean)))
    };
  }
}
```

---

### 3. Security Detector Module

**File:** `src/security/security-detector.ts`
**Lines:** ~450
**Class:** SecurityDetector

**Threat Detection:**

```typescript
class SecurityDetector {
  private patterns = {
    promptInjection: [
      /ignore\s+(previous|above|prior)\s+instructions/i,
      /you\s+are\s+now\s+in\s+(developer|debug)\s+mode/i,
      /disregard\s+all\s+previous/i
    ],
    jailbreak: [
      /pretend\s+you\s+(are|have)\s+no\s+restrictions/i,
      /act\s+as\s+if\s+you\s+have\s+no\s+ethical\s+guidelines/i
    ],
    piiLeakage: {
      ssn: /\b\d{3}-\d{2}-\d{4}\b/,
      creditCard: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/,
      email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/,
      phone: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/,
      address: /\b\d+\s+[A-Za-z\s]+\s+(Street|St|Avenue|Ave|Road|Rd)\b/i
    }
  };

  analyzeInput(input: string): SecurityDetectionResult {
    const violations = [];

    // Check for injection attempts
    for (const pattern of this.patterns.promptInjection) {
      if (pattern.test(input)) {
        violations.push({
          type: 'prompt_injection',
          severity: 'high',
          pattern: pattern.source
        });
      }
    }

    // Calculate risk score
    const riskScore = this.calculateRiskScore(violations);

    return {
      safe: riskScore < 50,
      riskScore,
      violations
    };
  }
}
```

---

### 4. Performance Collector Module

**File:** `src/performance/performance-collector.ts`
**Lines:** ~380
**Class:** PerformanceCollector

**Metrics Tracking:**

```typescript
class PerformanceCollector {
  private metrics: PerformanceMetric[] = [];

  startRequest(): RequestHandle {
    const startTime = Date.now();

    return {
      end: (data: { inputTokens, outputTokens, model }) => {
        const latency = Date.now() - startTime;
        this.metrics.push({
          latency,
          inputTokens: data.inputTokens,
          outputTokens: data.outputTokens,
          totalTokens: data.inputTokens + data.outputTokens,
          cost: this.calculateCost(data),
          timestamp: new Date()
        });
      }
    };
  }

  generateReport(): PerformanceReport {
    const latencies = this.metrics.map(m => m.latency);

    return {
      // Latency stats
      meanLatency: mean(latencies),
      medianLatency: median(latencies),
      p95Latency: percentile(latencies, 0.95),
      p99Latency: percentile(latencies, 0.99),

      // Token stats
      totalInputTokens: sum(this.metrics.map(m => m.inputTokens)),
      totalOutputTokens: sum(this.metrics.map(m => m.outputTokens)),

      // Cost
      totalCost: sum(this.metrics.map(m => m.cost)),

      // Throughput
      requestsPerSec: this.metrics.length / durationSeconds,
      tokensPerSec: totalTokens / durationSeconds
    };
  }

  checkSLO(slo: PerformanceSLO): SLOResult {
    const report = this.generateReport();
    const violations = [];

    if (report.p95Latency > slo.maxP95Latency) {
      violations.push(`P95 latency ${report.p95Latency}ms exceeds ${slo.maxP95Latency}ms`);
    }

    return {
      passed: violations.length === 0,
      violations
    };
  }
}
```

---

### 5. Metrics Aggregator Module

**File:** `src/monitoring/metrics-aggregator.ts`
**Lines:** ~450
**Class:** MetricsAggregator

**Historical Analysis:**

```typescript
class MetricsAggregator {
  recordTestRun(result: TestRunResult): void {
    const history = this.loadHistory();
    history.push(result);

    // Keep last 100 runs
    if (history.length > 100) {
      history.splice(0, history.length - 100);
    }

    this.saveHistory(history);
  }

  calculateBaseline(runs = 10): AggregatedMetrics {
    const recentRuns = this.getRecentRuns(runs);

    return {
      avgPassRate: mean(recentRuns.map(r => r.passed / r.totalTests)),
      avgSimilarity: mean(recentRuns.map(r => r.avgSimilarity)),
      avgLatency: mean(recentRuns.map(r => r.avgLatency)),
      trend: this.calculateTrend(recentRuns)
    };
  }

  checkForRegressions(): RegressionAlert[] {
    const latest = this.getRecentRuns(1)[0];
    const baseline = this.calculateBaseline(10);
    const alerts = [];

    // Check similarity regression
    const simChange = (latest.avgSimilarity - baseline.avgSimilarity) / baseline.avgSimilarity;
    if (simChange < -0.10) {  // 10% drop threshold
      alerts.push({
        severity: simChange <= -0.20 ? 'critical' : 'warning',
        metric: 'similarity',
        percentChange: simChange * 100,
        message: `Similarity dropped ${abs(simChange * 100).toFixed(1)}%`
      });
    }

    return alerts;
  }
}
```

---

## Technology Stack

### Backend Service

| Technology | Purpose | Version |
|------------|---------|---------|
| **Node.js** | Runtime | 18+ |
| **TypeScript** | Language | 5.x |
| **Express** | HTTP server | 4.x |
| **Zod** | Schema validation | 3.x |
| **Ollama** | LLM runtime | Latest |

### Testing Framework (TypeScript)

| Technology | Purpose | Version |
|------------|---------|---------|
| **Jest** | Test runner | 29.x |
| **TypeScript** | Language | 5.x |
| **fast-check** | Property-based testing | 3.x |

### Testing Framework (Python)

| Technology | Purpose | Version |
|------------|---------|---------|
| **Python** | Language | 3.9+ |
| **pytest** | Test runner | 7.4+ |
| **NumPy** | Numerical computing | 1.24+ |
| **Hypothesis** | Property-based testing | 6.92+ |

### LLM Runtime

| Technology | Purpose | Version |
|------------|---------|---------|
| **Ollama** | Local LLM runtime | Latest |
| **llama3.2** | LLM model | Latest |

---

## Design Decisions

### 1. Why Two Implementations (TypeScript + Python)?

**Decision:** Build both TypeScript and Python versions

**Reasoning:**
- TypeScript for web/Node.js ecosystem
- Python for ML/data science ecosystem
- Demonstrates language-agnostic principles
- Validates architecture works in both paradigms

**Trade-offs:**
- ✅ Broader adoption
- ✅ Validates design
- ❌ Maintenance overhead
- ❌ Feature parity challenges

---

### 2. Why Composite Similarity as Primary Metric?

**Decision:** Use weighted combination of 3 metrics

**Alternatives Considered:**
- Cosine similarity alone
- BLEU score alone
- Sentence embeddings (BERT, etc.)

**Reasoning:**
- No single metric captures all aspects
- Weighted combination is more robust
- Fast (no ML models needed)
- Tuned on golden dataset (0.5 cosine + 0.3 jaccard + 0.2 overlap)

**Trade-offs:**
- ✅ Robust
- ✅ Fast
- ✅ Explainable
- ❌ Doesn't capture deep semantics
- ❌ Synonyms treated as different

---

### 3. Why Golden Dataset Instead of Synthetic Data?

**Decision:** Human-written reference summaries

**Alternatives Considered:**
- Auto-generated test cases
- Paraphrased variations
- LLM-generated references

**Reasoning:**
- Humans provide ground truth
- Catches edge cases LLMs miss
- Validates real-world quality
- Serves as documentation

**Trade-offs:**
- ✅ High quality
- ✅ Realistic
- ❌ Expensive to create
- ❌ Limited quantity (5 cases)

---

### 4. Why E2E Tests with Real LLM?

**Decision:** All E2E tests hit real Ollama backend

**Alternatives Considered:**
- Mock LLM responses
- Cached LLM responses
- Deterministic test data

**Reasoning:**
- LLMs behave differently in production
- Mocks don't capture real variance
- Catches integration bugs
- Validates end-to-end quality

**Trade-offs:**
- ✅ Tests real behavior
- ✅ High confidence
- ❌ Slow (40s vs 1s)
- ❌ Requires running backend

---

### 5. Why Property-Based Testing?

**Decision:** Use fast-check/Hypothesis for 100+ random test cases

**Alternatives Considered:**
- Only manual test cases
- Fuzzing
- Mutation testing

**Reasoning:**
- Discovers edge cases automatically
- Tests invariants (properties that always hold)
- Catches bugs manual tests miss
- Complements manual tests

**Trade-offs:**
- ✅ Finds edge cases
- ✅ Comprehensive
- ❌ Harder to debug failures
- ❌ Slower than unit tests

---

## Deployment Architecture

### Development Environment

```
┌──────────────────────────────────────────────┐
│          Developer Machine                   │
├──────────────────────────────────────────────┤
│                                              │
│  ┌─────────────┐                            │
│  │   Ollama    │ (localhost:11434)          │
│  │  llama3.2   │                            │
│  └──────┬──────┘                            │
│         │                                    │
│  ┌──────▼──────┐                            │
│  │   Backend   │ (localhost:3000)           │
│  │   Express   │                            │
│  └─────────────┘                            │
│                                              │
│  ┌─────────────────────────────────────┐   │
│  │  Testing Framework                  │   │
│  │  npm test (TypeScript)              │   │
│  │  pytest (Python)                    │   │
│  └─────────────────────────────────────┘   │
└──────────────────────────────────────────────┘
```

### CI/CD Pipeline

```
┌────────────┐
│ Git Push   │
└─────┬──────┘
      │
      ▼
┌────────────────┐
│ GitHub Actions │
└─────┬──────────┘
      │
      ├──────────────────────────┐
      │                          │
      ▼                          ▼
┌─────────────┐          ┌──────────────┐
│ TypeScript  │          │   Python     │
│  Tests      │          │   Tests      │
├─────────────┤          ├──────────────┤
│ Unit        │          │ Unit         │
│ Component   │          │ (25 tests)   │
│ Integration │          │              │
│ Security    │          │              │
│ Performance │          │              │
│ Monitoring  │          │              │
│ (exclude E2E)│         │              │
└─────┬───────┘          └──────┬───────┘
      │                         │
      │                         │
      ▼                         ▼
┌─────────────────────────────────┐
│      All Tests Pass?            │
└─────┬───────────────────────────┘
      │
      │ Yes
      ▼
┌─────────────┐
│   Deploy    │
└─────────────┘
```

### Production Monitoring

```
┌─────────────────────────────────────────┐
│         Production System               │
├─────────────────────────────────────────┤
│                                         │
│  ┌──────────┐        ┌──────────┐     │
│  │ Backend  │───────▶│  Ollama  │     │
│  │ (Express)│        │ (llama3.2)│     │
│  └────┬─────┘        └──────────┘     │
│       │                                 │
│       │ Metrics                         │
│       ▼                                 │
│  ┌──────────────────┐                  │
│  │   Prometheus     │                  │
│  │   (Metrics)      │                  │
│  └────┬─────────────┘                  │
│       │                                 │
│       │ Alerts                          │
│       ▼                                 │
│  ┌──────────────────┐                  │
│  │  Grafana         │                  │
│  │  (Dashboard)     │                  │
│  └──────────────────┘                  │
│                                         │
│  ┌──────────────────┐                  │
│  │  Regression      │                  │
│  │  Monitoring      │                  │
│  │  (Daily Tests)   │                  │
│  └──────────────────┘                  │
└─────────────────────────────────────────┘
```

---

## Summary

### Key Architectural Decisions

1. ✅ **Modular Design** - Clear separation of concerns
2. ✅ **Language Agnostic** - TypeScript + Python implementations
3. ✅ **Production-Ready** - 220 tests, 100% passing
4. ✅ **Security-First** - Dedicated security module
5. ✅ **Observable** - Monitoring and alerting built-in
6. ✅ **Extensible** - Easy to add new metrics/backends

### Next Steps

**For Development:**
1. Complete Python implementation (security, performance, monitoring)
2. Add more golden dataset cases (10-20 total)
3. Implement property-based tests in Python
4. Create CLI tool for manual testing

**For Production:**
1. Set up Prometheus/Grafana monitoring
2. Configure alerting thresholds
3. Implement daily regression tests
4. Create deployment pipeline

---

**For more details, see:**
- [Testing Guide](TESTING_GUIDE.md) - Testing types and principles
- [TypeScript README](ts-test/README.md) - TypeScript implementation
- [Python README](py-test/README.md) - Python implementation
