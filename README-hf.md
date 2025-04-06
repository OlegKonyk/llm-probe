---
title: LLM Testing Framework API
emoji: 🤖
colorFrom: blue
colorTo: green
sdk: docker
app_port: 7860
---

# LLM Testing Framework API

Production-ready REST API for testing Large Language Model applications. This service provides call summarization using Ollama (llama3.2:latest) with comprehensive quality evaluation.

⚠️ **Note:** This Docker configuration is designed for deployment on cloud infrastructure (AWS EC2/ECS, Google Cloud Run, Azure Container Instances) where you have full container control. Hugging Face Spaces has limitations that prevent Ollama from running properly. For HF Spaces deployment, consider using the Bedrock provider instead (set `LLM_PROVIDER=bedrock`).

## 🚀 Live API

This Hugging Face Space provides a REST API for LLM-powered call summarization.

### API Endpoints

#### POST /api/v1/summarize
Summarize a customer support call transcript.

**Authentication Required:** All API requests require an API key in the Authorization header.

**Request:**
```bash
curl -X POST https://YOUR-SPACE-URL.hf.space/api/v1/summarize \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "transcript": "Agent: Hello, how can I help? Customer: I forgot my password. Agent: I can help with that. Let me send you a reset link. Customer: Thank you!"
  }'
```

**Note:** Replace `YOUR_API_KEY` with the API key provided in the Space's environment variables or contact the Space owner for access.

**Response:**
```json
{
  "summary": "Customer contacted support for a password reset. Agent provided assistance and sent a password reset link.",
  "metadata": {
    "model": "llama3.2:latest",
    "timestamp": "2025-11-03T12:00:00.000Z",
    "processingTime": 2743
  }
}
```

#### GET /health
Health check endpoint.

```bash
curl https://YOUR-SPACE-URL.hf.space/health
```

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-11-03T12:00:00.000Z"
}
```

## 🎯 Features

- ✅ **Local LLM Processing** - Uses Ollama (llama3.2:latest) running in the Space
- ✅ **API Key Authentication** - Secure access control for API endpoints
- ✅ **Rate Limiting** - 100 requests per 15 minutes per API key
- ✅ **CORS Enabled** - Accessible from web applications
- ✅ **Health Monitoring** - Built-in health check endpoint (no auth required)
- ✅ **Structured Logging** - JSON logs for production monitoring
- ✅ **Production-Ready** - Comprehensive error handling and validation

## 📊 Performance

Based on llama3.2:latest model:

- **Mean Latency:** ~2.7s
- **P95 Latency:** ~3.4s
- **Quality:** 0.34-0.60 semantic similarity vs human-written summaries
- **Throughput:** ~0.38 requests/second

## 🔒 Security

- **API Key Authentication** - Bearer token required for all API endpoints
- **Rate Limiting** - 100 requests per 15 minutes per API key
- **CORS Protection** - Configurable allowed origins
- **Input Validation** - Request validation using Zod schemas
- **Security Headers** - Helmet.js security headers
- **No Sensitive Data Logging** - PII-safe logging practices

### Getting an API Key

To use this API, you need an API key. Contact the Space owner or check the Space's environment variables for the `API_KEY` value.

## 🛠️ Testing Framework

This API is part of a comprehensive LLM testing framework that includes:

- 220 automated tests (100% passing)
- 8 testing types: Unit, Component, Integration, Regression, Property-Based, Security, Performance, E2E
- Golden dataset validation
- Regression detection
- Performance monitoring

**GitHub Repository:** [Link to your repo]

## 📝 Example Usage

### JavaScript/TypeScript

```javascript
const response = await fetch('https://YOUR-SPACE-URL.hf.space/api/v1/summarize', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_API_KEY'
  },
  body: JSON.stringify({
    transcript: "Agent: Hi! Customer: My order hasn't arrived. Agent: Let me check. Your order will arrive tomorrow. Customer: Thank you!"
  })
});

const { summary } = await response.json();
console.log(summary);
// "Customer inquired about delayed order. Agent confirmed delivery for tomorrow."
```

### Python

```python
import requests

response = requests.post(
    'https://YOUR-SPACE-URL.hf.space/api/v1/summarize',
    headers={
        'Content-Type': 'application/json',
        'Authorization': 'Bearer YOUR_API_KEY'
    },
    json={
        'transcript': 'Agent: Hi! Customer: Need to update my email. Agent: Done! Customer: Thanks!'
    }
)

summary = response.json()['summary']
print(summary)
# "Customer requested email update. Agent completed the update successfully."
```

### cURL

```bash
curl -X POST https://YOUR-SPACE-URL.hf.space/api/v1/summarize \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "transcript": "Agent: Hello! Customer: Billing question. Agent: Here is your invoice. Customer: Got it, thanks!"
  }'
```

## 🚦 Rate Limits

- **100 requests per 15 minutes** per API key
- Exceeding limit returns HTTP 429 with retry-after header
- Unauthenticated requests return HTTP 401

## ⚙️ Technical Stack

- **Backend:** Express.js (Node.js)
- **LLM:** Ollama with llama3.2:latest
- **Testing:** Jest (220 tests)
- **Security:** CORS, Rate Limiting, Input Validation
- **Monitoring:** Structured logging, health checks

## 📄 License

MIT

## 🔗 Related

- [Testing Guide](https://github.com/YOUR-USERNAME/llm-principals/blob/main/TESTING_GUIDE.md)
- [Architecture Documentation](https://github.com/YOUR-USERNAME/llm-principals/blob/main/ARCHITECTURE.md)
- [Ollama Documentation](https://ollama.ai/)

---

**Built for production-grade LLM application testing.**

For issues or questions, visit the [GitHub repository](https://github.com/YOUR-USERNAME/llm-principals).
