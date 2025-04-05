# LLM Testing Principles - Production Testing Framework

![Tests](https://img.shields.io/badge/tests-220%20passing-success)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)
![Python](https://img.shields.io/badge/Python-3.9+-blue)
![License](https://img.shields.io/badge/license-MIT-green)

A comprehensive, production-ready testing framework demonstrating best practices for testing Large Language Model (LLM) applications. Built with TypeScript and Python, featuring real-world validation against live Ollama backend.

**🎓 Educational Resource** - This repository serves as a reference implementation for testing LLM applications. All code follows industry best practices and includes comprehensive documentation.

## 🎯 Project Overview

This repository demonstrates **how to properly test LLM applications in production**. It includes:

- ✅ **Backend Service** - Express + Ollama for call summarization
- ✅ **Testing Framework (TypeScript)** - 220 tests, 100% passing
- ✅ **Testing Framework (Python)** - Core modules translated
- ✅ **Golden Dataset** - 5 curated test cases with human-written references
- ✅ **8 Testing Types** - Unit, Component, Integration, Regression, Property-Based, Security, Performance, E2E
- ✅ **Monitoring System** - Regression detection and alerting
- ✅ **Comprehensive Documentation** - Architecture, testing guide, and principles

## 📊 Test Results

```
╔════════════════════════════════════════════════════════════╗
║              TypeScript Testing Framework                 ║
╠════════════════════════════════════════════════════════════╣
║  Test Suites: 12 passed, 12 total                        ║
║  Tests:       220 passed, 220 total                       ║
║  Time:        ~42 seconds                                 ║
║  Coverage:    All modules tested                          ║
╚════════════════════════════════════════════════════════════╝

Test Breakdown:
  📦 Unit Tests (15)              - Core algorithms
  🧩 Component Tests (24)         - Quality evaluation
  🔗 Integration Tests (9)        - API contracts
  📈 Regression Tests (22)        - Golden dataset validation
  🎲 Property-Based Tests (1800+) - Invariants
  🔒 Security Tests (33)          - Threat detection
  ⚡ Performance Tests (27)       - SLO compliance
  🌐 E2E Tests (12)              - Live system validation
  📊 Monitoring Tests (16)        - Observability

╔════════════════════════════════════════════════════════════╗
║                Python Testing Framework                   ║
╠════════════════════════════════════════════════════════════╣
║  Test Suites: 1 passed, 1 total                          ║
║  Tests:       25 passed, 25 total                         ║
║  Time:        ~0.5 seconds                                 ║
║  Status:      Core modules complete                       ║
╚════════════════════════════════════════════════════════════╝
```

## 🗂️ Repository Structure

```
llm-principals/
├── 📘 README.md                    # This file - Project overview
├── 📘 ARCHITECTURE.md              # System architecture deep dive
├── 📘 TESTING_GUIDE.md             # Testing types and principles
│
├── 📁 ts-test/                     # TypeScript Implementation
│   ├── src/                        # Testing framework modules
│   │   ├── evaluators/             # Quality assessment
│   │   ├── metrics/                # Similarity algorithms
│   │   ├── security/               # Threat detection
│   │   ├── performance/            # Metrics tracking
│   │   ├── monitoring/             # Regression detection
│   │   └── utils/                  # Golden dataset loader
│   ├── tests/                      # 220 test files
│   └── README.md                   # TypeScript docs
│
├── 📁 py-test/                     # Python Implementation
│   ├── src/                        # Python modules (feature parity)
│   │   ├── evaluators/             # Summary evaluator
│   │   ├── metrics/                # Text similarity
│   │   └── utils/                  # Golden dataset loader
│   ├── tests/                      # 25 unit tests
│   └── README.md                   # Python docs
│
├── 📁 backend/                     # LLM Service (Express + Ollama)
│   ├── src/
│   │   ├── server.ts               # HTTP API server
│   │   └── services/               # Ollama integration
│   └── README.md                   # Backend docs
│
└── 📁 golden-dataset/              # Test Data
    ├── index.json                  # Metadata catalog
    └── sample-*.json               # 5 test cases
```

## 🚀 Quick Start

### Prerequisites

1. **Node.js 18+** and npm
2. **Python 3.9+** (for Python framework)
3. **Ollama** - Local LLM runtime
4. **llama3.2 model** (or similar)

### Installation

```bash
# 1. Install Ollama
brew install ollama  # macOS
# or visit https://ollama.ai for other platforms

# 2. Pull LLM model
ollama pull llama3.2:latest

# 3. Start Ollama server (in separate terminal)
ollama serve

# 4. Clone and install dependencies
cd ts-test
npm install

cd ../backend
npm install
```

### Running the System

```bash
# Terminal 1: Start Ollama
ollama serve

# Terminal 2: Start backend
cd backend
npm run dev
# Backend runs on http://localhost:3000

# Terminal 3: Run tests
cd ts-test
npm test
# All 220 tests should pass!
```

### Testing the Python Framework

```bash
cd py-test

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run tests
export PYTHONPATH=$PYTHONPATH:$(pwd)
pytest tests/ -v
# All 25 tests should pass!
```

## 📚 Documentation

### Start Here

1. **[README.md](README.md)** (this file) - Project overview and quick start
2. **[TESTING_GUIDE.md](TESTING_GUIDE.md)** - Testing types and principles
3. **[ARCHITECTURE.md](ARCHITECTURE.md)** - System architecture deep dive

### Contributing

- **[CONTRIBUTING.md](CONTRIBUTING.md)** - How to contribute to this project
- **[docs/CODING_STANDARDS.md](docs/CODING_STANDARDS.md)** - Code quality guidelines

### Framework-Specific

- **[ts-test/README.md](ts-test/README.md)** - TypeScript implementation
- **[py-test/README.md](py-test/README.md)** - Python implementation
- **[backend/README.md](backend/README.md)** - Backend service docs

### Additional Resources

- **[docs/](docs/)** - Additional documentation (setup, deployment, development history)

## 🎓 Key Concepts

### Why Test LLMs Differently?

**Traditional Software:**
```typescript
// ✅ Deterministic - Same input → Same output
expect(add(2, 3)).toBe(5);
```

**LLM Applications:**
```typescript
// ❌ Non-deterministic - Same input → Different outputs
const summary1 = await generateSummary(transcript);
const summary2 = await generateSummary(transcript);
// summary1 !== summary2 (but both can be correct!)
```

**Solution: Semantic Similarity**
```typescript
const similarity = compositeSimilarity(summary, goldenSummary);
expect(similarity).toBeGreaterThan(0.80);  // 80% similar is good enough
```

### The LLM Testing Pyramid

```
       /\
      / E2E \     ← CRITICAL: Must test with real LLM!
     /───────\       (40s runtime, but essential)
    /Property \
   / Based    \    ← Test invariants (1800+ cases)
  /────────────\      (5s runtime, finds edge cases)
 / Regression  \
/───────────────\   ← Catch quality degradation
                      (Track trends over time)
      ┌────────┐
      │Security│    ← NEW: Prompt injection, PII leakage
      └────────┘
```

## 🔑 Key Testing Principles

1. **Non-Determinism is Normal** - Use similarity thresholds, not exact matches
2. **Test Against Real LLMs** - Mocks don't capture real behavior
3. **Security is Critical** - New attack vectors (prompt injection, PII)
4. **Monitor Quality Over Time** - LLMs degrade silently
5. **Golden Datasets are Essential** - Human-validated references
6. **Multiple Metrics Beat One** - Composite scoring is robust
7. **Property-Based Testing Finds Edge Cases** - 100+ random tests
8. **Performance Testing is Critical** - Track P95/P99, costs, tokens

## 📈 Real Performance Data

From live Ollama testing (llama3.2:latest):

```
Latency:
  Mean:   2.7s
  P95:    3.4s
  P99:    3.4s

Quality:
  Similarity: 0.34-0.60 (vs golden summaries)
  BLEU Score: 0.35-0.65

Security:
  PII Detection: Working (addresses, emails detected)
  Risk Scores:   0-15 (low risk for safe inputs)
                 60-85 (high risk for attacks)

Throughput:
  Requests/sec: 0.38
  Tokens/sec:   86

Test Results:
  220/220 passing (100%)
  Runtime: ~42 seconds
```

## 💡 Key Learnings

1. **LLMs are non-deterministic** - Test for quality ranges, not exact outputs
2. **Security is critical** - Validate all inputs and outputs
3. **Performance varies widely** - Track P95/P99, not just averages
4. **Golden datasets are essential** - Human-written references provide benchmarks
5. **Property-based testing finds edge cases** - Generates tests you wouldn't think of
6. **Real integration tests matter** - Mock tests don't catch real-world issues
7. **Monitoring is mandatory** - LLMs degrade over time without detection
8. **Multiple metrics are robust** - No single metric captures quality

## 🤝 Contributing

We welcome contributions! This is an educational resource, so contributions that improve clarity, fix bugs, or add educational value are especially appreciated.

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for:
- Development setup
- Coding standards
- Testing guidelines
- Pull request process

## 🏗️ Built With Industry Best Practices

This project demonstrates:
- ✅ **Clean Architecture** (Uncle Bob)
- ✅ **SOLID Principles**
- ✅ **Twelve-Factor App Methodology**
- ✅ **Enterprise Integration Patterns**
- ✅ **Security Best Practices** (OWASP)
- ✅ **CI/CD** with GitHub Actions
- ✅ **Comprehensive Documentation**
- ✅ **Property-Based Testing**

## 📄 License

MIT

## 🔗 Related Resources

- [Ollama Documentation](https://ollama.ai/)
- [Jest Testing Framework](https://jestjs.io/)
- [pytest Documentation](https://docs.pytest.org/)
- [Fast-check (Property-Based Testing)](https://fast-check.dev/)
- [Hypothesis (Python Property Testing)](https://hypothesis.readthedocs.io/)

---

**Built with ❤️ for demonstrating production-grade LLM testing practices.**

For questions, issues, or discussions about LLM testing principles, please open an issue on GitHub.
