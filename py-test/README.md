# LLM Testing Framework (Python)

A Python implementation of the comprehensive, production-ready testing framework for Large Language Model (LLM) applications. This provides feature parity with the TypeScript version while offering Python-native interfaces and idioms.

## 🎯 Project Overview

This Python framework provides robust quality assurance for LLM-powered systems with real-world validation capabilities. It includes comprehensive evaluation metrics, security detection, performance tracking, and monitoring tools.

### Core Features

- ✅ **Quality Evaluation** - Semantic similarity, BLEU scores, length validation
- ✅ **Multiple Similarity Metrics** - Cosine, Jaccard, overlap coefficient, composite
- ✅ **Golden Dataset Support** - Curated test cases with expected outputs
- ✅ **Unit Tested** - 25 passing tests validating core functionality
- 🚧 **Security Detection** - Prompt injection, PII leakage (coming soon)
- 🚧 **Performance Metrics** - Latency, tokens, cost tracking (coming soon)
- 🚧 **Monitoring System** - Regression detection, alerting (coming soon)

## 📊 Current Status

```
Test Suites: 1 passed, 1 total
Tests:       25 passed, 25 total
Time:        ~0.5s
```

**Implemented Modules:**
- ✅ `metrics/text_similarity.py` - All 8 similarity metrics
- ✅ `utils/golden_dataset.py` - Dataset loader with filtering
- ✅ `evaluators/summary_evaluator.py` - Comprehensive quality evaluation
- ✅ `tests/unit/test_text_similarity.py` - 25 unit tests

## 🚀 Quick Start

### Prerequisites

- Python 3.9+
- pip or conda

### Installation

```bash
# Navigate to Python framework directory
cd py-test

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies for development (includes testing tools)
pip install -e .[dev]

# Run tests
pytest tests/ -v
```

## 📚 Usage Examples

### 1. Text Similarity Metrics

```python
from src.metrics.text_similarity import (
    cosine_similarity,
    composite_similarity,
    bleu_score
)

text1 = "Customer had password issue resolved"
text2 = "Customer reset password successfully"

# Cosine similarity (word frequency)
cosine = cosine_similarity(text1, text2)
print(f"Cosine: {cosine:.2f}")  # ~0.65

# Composite similarity (weighted combination)
composite = composite_similarity(text1, text2)
print(f"Composite: {composite:.2f}")  # ~0.70

# BLEU score (n-gram precision)
bleu = bleu_score(text1, text2)
print(f"BLEU: {bleu:.2f}")  # ~0.45
```

### 2. Quality Evaluation

```python
from src.evaluators.summary_evaluator import SummaryEvaluator
from src.utils.golden_dataset import GoldenDatasetLoader

# Load test case from golden dataset
loader = GoldenDatasetLoader()
test_case = loader.load_test_case('call_001')

# Evaluate a generated summary
evaluator = SummaryEvaluator()
result = evaluator.evaluate(
    "Customer locked out. Agent reset password.",
    test_case
)

print(f"Passed: {result.passed}")
print(f"Similarity: {result.similarity:.2f}")
print(f"BLEU: {result.bleu:.2f}")

if not result.passed:
    print("Failures:", result.failures)
```

### 3. Required Terms Validation

```python
from src.metrics.text_similarity import contains_required_terms

summary = "Customer reset password successfully"
required = ["password", "reset", "customer"]

result = contains_required_terms(summary, required)

print(f"Passed: {result['passed']}")
print(f"Coverage: {result['coverage'] * 100:.0f}%")
print(f"Missing: {result['missing']}")
```

### 4. Length Validation

```python
from src.metrics.text_similarity import validate_length

summary = "Customer had issue resolved successfully"
result = validate_length(summary, min_words=3, max_words=10)

print(f"Passed: {result['passed']}")
print(f"Word count: {result['word_count']}")
```

### 5. Golden Dataset Loading

```python
from src.utils.golden_dataset import GoldenDatasetLoader

loader = GoldenDatasetLoader()

# Load specific test case
test_case = loader.load_test_case('call_001')
print(f"Category: {test_case.category}")
print(f"Transcript: {test_case.transcript}")
print(f"Golden summary: {test_case.golden_summary}")

# Load by category
password_cases = loader.load_by_category('password_reset')
print(f"{len(password_cases)} password reset cases")

# Load by difficulty
hard_cases = loader.load_by_difficulty('hard')
print(f"{len(hard_cases)} hard cases")

# Load all test cases
all_cases = loader.load_all_test_cases()
print(f"{len(all_cases)} total test cases")
```

### 6. Consistency Testing

```python
from src.evaluators.summary_evaluator import SummaryEvaluator

# Generate multiple summaries from same input
summaries = [
    "Customer reset password successfully",
    "Customer requested password reset",
    "Customer had password reset done"
]

evaluator = SummaryEvaluator()
consistency = evaluator.evaluate_consistency(summaries)

print(f"Mean similarity: {consistency['mean_similarity']:.2f}")
print(f"Std deviation: {consistency['std_deviation']:.2f}")
print(f"Max variance: {consistency['max_variance']:.2f}")
```

### 7. Detailed Reports

```python
from src.evaluators.summary_evaluator import SummaryEvaluator
from src.utils.golden_dataset import GoldenDatasetLoader

loader = GoldenDatasetLoader()
test_case = loader.load_test_case('call_001')

evaluator = SummaryEvaluator()
report = evaluator.generate_report(
    "Customer locked out. Reset link sent.",
    test_case
)

print(report)
# Evaluation Report for call_001
# ==================================================
# Test Case: password_reset (easy)
# Status: ❌ FAILED
# Metrics:
#   Similarity: 0.450 (threshold: 0.8)
#   ...
```

## 🏗️ Architecture

```
py-test/
├── src/
│   ├── evaluators/
│   │   └── summary_evaluator.py    # Quality evaluation orchestrator
│   ├── metrics/
│   │   └── text_similarity.py      # All similarity metrics
│   ├── security/                    # (Coming soon)
│   ├── performance/                 # (Coming soon)
│   ├── monitoring/                  # (Coming soon)
│   └── utils/
│       └── golden_dataset.py       # Dataset loader
├── tests/
│   └── unit/
│       └── test_text_similarity.py  # 25 passing tests
├── venv/                            # Virtual environment
├── pyproject.toml                   # Project configuration & dependencies
└── README.md                        # This file
```

## 📖 API Reference

### Text Similarity Metrics

```python
# Cosine similarity (word frequency vectors)
cosine_similarity(text1: str, text2: str) -> float

# Jaccard similarity (set intersection/union)
jaccard_similarity(text1: str, text2: str) -> float

# Overlap coefficient (lenient for length differences)
overlap_coefficient(text1: str, text2: str) -> float

# Composite similarity (weighted combination)
composite_similarity(text1: str, text2: str) -> float

# Required terms validation
contains_required_terms(text: str, required_terms: list[str]) -> dict

# Length validation
validate_length(text: str, min_words: int, max_words: int) -> dict

# N-gram precision
ngram_precision(reference: str, candidate: str, n: int = 1) -> float

# BLEU score (simplified)
bleu_score(reference: str, candidate: str) -> float
```

### Summary Evaluator

```python
class SummaryEvaluator:
    def evaluate(
        self,
        summary: str,
        test_case: GoldenTestCase
    ) -> EvaluationResult

    def evaluate_consistency(
        self,
        summaries: list[str]
    ) -> dict[str, float]

    def generate_report(
        self,
        summary: str,
        test_case: GoldenTestCase
    ) -> str
```

### Golden Dataset Loader

```python
class GoldenDatasetLoader:
    def load_index(self) -> GoldenDatasetIndex
    def load_test_case(self, case_id: str) -> GoldenTestCase
    def load_all_test_cases(self) -> list[GoldenTestCase]
    def load_by_category(self, category: str) -> list[GoldenTestCase]
    def load_by_difficulty(self, difficulty: str) -> list[GoldenTestCase]
```

## 🧪 Testing

```bash
# Run all tests
pytest tests/ -v

# Run with coverage
pytest tests/ --cov=src --cov-report=html

# Run specific test file
pytest tests/unit/test_text_similarity.py -v

# Run specific test class
pytest tests/unit/test_text_similarity.py::TestCosineSimilarity -v
```

## 📦 Dependencies

- **pytest** - Testing framework
- **numpy** - Numerical computing
- **scipy** - Scientific computing (future use)
- **nltk** - NLP utilities (future use)
- **requests** - HTTP client for API tests
- **hypothesis** - Property-based testing (future use)

## 🔍 Similarity Metrics Explained

### Cosine Similarity
- **Range:** 0.0 to 1.0
- **Use case:** General semantic similarity
- **Pros:** Fast, good for different lengths
- **Cons:** Ignores word order, no semantic understanding

### Jaccard Similarity
- **Range:** 0.0 to 1.0
- **Use case:** Vocabulary overlap
- **Pros:** Simple, intuitive
- **Cons:** Penalizes length differences

### Overlap Coefficient
- **Range:** 0.0 to 1.0
- **Use case:** Lenient similarity for different lengths
- **Pros:** Fair for summaries of varying verbosity
- **Cons:** Can give high scores for short overlaps

### Composite Similarity (PRIMARY METRIC)
- **Range:** 0.0 to 1.0
- **Formula:** 0.5 * cosine + 0.3 * jaccard + 0.2 * overlap
- **Use case:** Overall quality assessment
- **Threshold:** Typically 0.80+ for passing

### BLEU Score
- **Range:** 0.0 to 1.0
- **Use case:** N-gram precision (translation quality)
- **Typical:** 0.4-0.6 for good summaries

## 💡 Key Learnings

1. **LLMs are non-deterministic** - Use similarity thresholds, not exact matches
2. **Multiple metrics needed** - No single metric captures all aspects
3. **Golden datasets are essential** - Human-written references provide benchmarks
4. **Composite metrics are robust** - Weighted combinations outperform single metrics
5. **Context-aware thresholds** - Easy vs hard cases need different thresholds

## 🚧 Roadmap

**Phase 1 (Current):**
- [x] Core similarity metrics
- [x] Golden dataset loader
- [x] Summary evaluator
- [x] Unit tests (25 passing)

**Phase 2 (In Progress):**
- [ ] Security detector (prompt injection, PII)
- [ ] Performance collector (latency, tokens, cost)
- [ ] Monitoring system (regression detection)
- [ ] Component tests
- [ ] Integration tests

**Phase 3 (Future):**
- [ ] Property-based tests (Hypothesis)
- [ ] E2E tests against live backend
- [ ] CLI tool for manual testing
- [ ] CI/CD integration examples

## 🤝 Contributing

This is a demonstration project for blog articles about LLM testing. Feel free to use it as a reference for your own projects.

## 📄 License

MIT

## 🔗 Related Resources

- [pytest Documentation](https://docs.pytest.org/)
- [Hypothesis (Property-Based Testing)](https://hypothesis.readthedocs.io/)
- [NLTK Documentation](https://www.nltk.org/)
- [TypeScript Version](../ts-test/README.md)

## 📝 Differences from TypeScript Version

### Similarities
- Identical algorithms and formulas
- Same golden dataset structure
- Equivalent API interfaces
- Similar test coverage

### Python-Specific Features
- Dataclasses for structured data
- Type hints for better IDE support
- Pythonic naming conventions (snake_case)
- Native dict/list returns instead of objects

### Not Yet Implemented
- Security detection module
- Performance tracking module
- Monitoring and observability
- Property-based testing with Hypothesis
- E2E tests

---

Built with ❤️ for demonstrating production-grade LLM testing practices in Python.
