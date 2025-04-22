---
title: LLM Testing Framework
emoji: 🧪
colorFrom: blue
colorTo: green
sdk: docker
app_port: 7860
pinned: false
license: mit
---

# LLM Testing Framework 🧪

Production-ready testing framework for Large Language Model applications. Evaluate LLM output quality, detect security issues, and monitor performance.

## ✨ Features

- **Quality Evaluation**: Multiple similarity metrics (cosine, Jaccard, BLEU)
- **Golden Dataset**: Regression testing against reference summaries
- **Security Detection**: Prompt injection, PII leakage, jailbreak attempts
- **Performance Monitoring**: Latency tracking, cost estimation, SLO validation
- **LLM Agnostic**: Works with Ollama, AWS Bedrock, Hugging Face models

## 🚀 Quick Start

### Test the API

```bash
# Health check
curl https://YOUR_USERNAME-llm-testing-framework.hf.space/health

# Summarize a call transcript
curl -X POST https://YOUR_USERNAME-llm-testing-framework.hf.space/api/v1/summarize \
  -H "Content-Type: application/json" \
  -d '{
    "transcript": "Customer called about a password reset issue. They were locked out of their account after multiple failed login attempts. Agent verified their identity using security questions and sent a password reset link to their registered email. Customer successfully reset their password and confirmed they could log in. Issue resolved, customer satisfied.",
    "options": {
      "maxLength": 100,
      "includeKeyPoints": true,
      "includeSentiment": false
    }
  }'
```

### Example Response

```json
{
  "summary": "Customer locked out after failed logins. Agent verified identity, sent reset link. Password successfully reset. Issue resolved.",
  "keyPoints": [
    "Account lockout after failed login attempts",
    "Identity verified via security questions",
    "Password reset link sent",
    "Customer successfully logged in"
  ],
  "metadata": {
    "model": "llama3.2:latest",
    "tokens_used": 145,
    "latency_ms": 1250
  }
}
```

## 📖 API Documentation

### POST /api/v1/summarize

Generates a concise summary of a customer support call transcript.

**Request Body:**

```typescript
{
  transcript: string;           // Call transcript (50-10000 chars)
  options?: {
    maxLength?: number;         // Max summary words (50-200, default: 100)
    includeKeyPoints?: boolean; // Extract key points (default: true)
    includeSentiment?: boolean; // Include sentiment (default: false)
  }
}
```

**Response:**

```typescript
{
  summary: string;          // Generated summary
  keyPoints?: string[];     // Key points (if requested)
  sentiment?: string;       // Sentiment (if requested)
  metadata: {
    model: string;          // LLM model used
    tokens_used: number;    // Tokens consumed
    latency_ms: number;     // Response time
  }
}
```

### GET /health

Returns service health status.

```json
{
  "status": "ok",
  "timestamp": "2025-04-22T14:30:00.000Z"
}
```

## 🧪 Testing Framework

This Space also includes a comprehensive testing framework for LLM applications:

### Test Types

1. **Unit Tests**: Test individual metrics and utilities
2. **Component Tests**: Validate evaluators against golden dataset
3. **Integration Tests**: Test API contracts and error handling
4. **Regression Tests**: Monitor quality over time
5. **Property-Based Tests**: Invariant testing with fast-check
6. **Security Tests**: Detect prompt injection, PII leakage
7. **Performance Tests**: Track latency, token usage, costs
8. **E2E Tests**: Full-stack validation with real LLM

### Quality Metrics

- **Composite Similarity**: Weighted average of cosine, Jaccard, overlap
- **BLEU Score**: N-gram precision for summarization quality
- **Required Terms**: Keyword coverage validation
- **Length Validation**: Word count constraints

### Security Detection

- **Prompt Injection**: 14 attack patterns
- **PII Leakage**: 8 data types (email, SSN, credit card, etc.)
- **Jailbreak Detection**: 8 bypass attempt patterns
- **Risk Scoring**: 0-100 scale with severity levels

## 🏗️ Architecture

```
┌─────────────────┐
│   User/Tests    │
└────────┬────────┘
         │
    ┌────▼────────────────┐
    │  Backend API (3000)│
    │  - Express          │
    │  - TypeScript       │
    │  - Validation       │
    └────────┬────────────┘
             │
    ┌────────▼────────────┐
    │  LLM Provider       │
    │  - Ollama (local)   │
    │  - Bedrock (AWS)    │
    │  - HF Inference     │
    └─────────────────────┘
```

## 📦 Local Development

```bash
# Clone repository
git clone https://github.com/YOUR_USERNAME/llm-probe.git
cd llm-probe

# Start with Docker
./start.sh

# Or run locally
npm install
npm run dev --workspace=backend

# Run tests
npm test --workspace=ts-test
```

## 🔧 Configuration

### LLM Provider Options

**Option 1: External Ollama (Recommended)**
```env
LLM_PROVIDER=ollama
OLLAMA_HOST=https://your-ollama-server.com
OLLAMA_MODEL=llama3.2:latest
```

**Option 2: Hugging Face Inference**
```env
LLM_PROVIDER=huggingface
HF_API_TOKEN=hf_your_token_here
HF_MODEL=meta-llama/Llama-3.2-3B-Instruct
```

**Option 3: AWS Bedrock**
```env
LLM_PROVIDER=bedrock
AWS_REGION=us-east-1
BEDROCK_MODEL=anthropic.claude-3-sonnet-20240229-v1:0
```

## 📊 Use Cases

### 1. Customer Support QA

Evaluate call summary quality automatically:
```typescript
const result = evaluator.evaluate(generatedSummary, goldenTestCase);
if (result.passed) {
  console.log("✅ Quality check passed:", result.similarity);
} else {
  console.log("❌ Quality issues:", result.failures);
}
```

### 2. Regression Testing

Monitor quality over time:
```typescript
const aggregator = new MetricsAggregator();
aggregator.recordTestRun(testResults);

const alerts = aggregator.checkForRegressions();
if (alerts.length > 0) {
  console.log("⚠️ Quality regression detected:", alerts);
}
```

### 3. Security Validation

Detect prompt injection and PII:
```typescript
const detector = new SecurityDetector();
const result = detector.analyzeInput(userInput);

if (!result.safe) {
  console.log("🚨 Security issues:", result.violations);
}
```

## 🎓 Example Applications

- **Call Center QA**: Automate quality evaluation of agent summaries
- **Content Moderation**: Detect unsafe content in LLM outputs
- **API Testing**: Regression testing for LLM-powered APIs
- **Performance Benchmarking**: Track LLM performance over time
- **Security Auditing**: Validate LLM safety and compliance

## 📚 Documentation

- [Full Documentation](https://github.com/YOUR_USERNAME/llm-probe)
- [Deployment Guide](https://github.com/YOUR_USERNAME/llm-probe/blob/main/docs/deployment/DEPLOYMENT_GUIDE.md)
- [Testing Strategy](https://github.com/YOUR_USERNAME/llm-probe/blob/main/docs/TESTING_STRATEGY.md)
- [API Reference](https://github.com/YOUR_USERNAME/llm-probe/blob/main/docs/README.md)

## 🤝 Contributing

Contributions welcome! See [CONTRIBUTING.md](https://github.com/YOUR_USERNAME/llm-probe/blob/main/CONTRIBUTING.md)

## 📝 License

MIT License - see [LICENSE](https://github.com/YOUR_USERNAME/llm-probe/blob/main/LICENSE)

## 🔗 Links

- [GitHub Repository](https://github.com/YOUR_USERNAME/llm-probe)
- [Issue Tracker](https://github.com/YOUR_USERNAME/llm-probe/issues)
- [Discussions](https://github.com/YOUR_USERNAME/llm-probe/discussions)

---

Built with ❤️ using TypeScript, Express, and Ollama
