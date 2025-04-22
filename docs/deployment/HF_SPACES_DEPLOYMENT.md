# Hugging Face Spaces Deployment Guide

Deploy the LLM Testing Framework to Hugging Face Spaces for free public hosting with GPU acceleration.

## Overview

Hugging Face Spaces provides free hosting for ML applications with optional GPU support. This guide shows how to deploy the LLM Testing Framework as a Docker Space.

**Features:**
- Free hosting with persistent storage
- Optional GPU acceleration (for faster inference)
- Public URL for demos and testing
- Automatic HTTPS and CDN
- Easy updates via git

---

## Prerequisites

1. **Hugging Face Account**
   - Sign up at https://huggingface.co
   - Verify your email address

2. **Hugging Face CLI (optional)**
   ```bash
   pip install huggingface_hub
   huggingface-cli login
   ```

---

## Deployment Options

### Option A: Web UI Deployment (Easiest)

1. **Create a new Space:**
   - Go to https://huggingface.co/new-space
   - Space name: `llm-testing-framework` (or your choice)
   - License: Choose appropriate license (MIT recommended)
   - Space SDK: **Docker**
   - Space hardware: **CPU basic** (free) or **T4 small** (GPU, paid)
   - Visibility: **Public** or **Private**

2. **Clone the Space repository:**
   ```bash
   git clone https://huggingface.co/spaces/YOUR_USERNAME/llm-testing-framework
   cd llm-testing-framework
   ```

3. **Copy project files:**
   ```bash
   # Copy essential files from your llm-probe repository
   cp -r /path/to/llm-probe/backend ./
   cp /path/to/llm-probe/package.json ./
   cp /path/to/llm-probe/Dockerfile ./
   cp /path/to/llm-probe/.dockerignore ./
   cp /path/to/llm-probe/tsconfig.json ./
   ```

4. **Create Space-specific files:**

   **README.md:**
   ```markdown
   ---
   title: LLM Testing Framework
   emoji: 🤖
   colorFrom: blue
   colorTo: green
   sdk: docker
   pinned: false
   license: mit
   ---

   # LLM Testing Framework

   Production-ready testing framework for Large Language Model applications.

   ## Features

   - LLM-powered call summarization
   - Quality evaluation with multiple metrics
   - Golden dataset regression testing
   - Security detection (prompt injection, PII)
   - Performance monitoring

   ## API Usage

   ```bash
   curl -X POST https://YOUR_USERNAME-llm-testing-framework.hf.space/api/v1/summarize \
     -H "Content-Type: application/json" \
     -d '{
       "transcript": "Customer called about password reset...",
       "options": {"maxLength": 100}
     }'
   ```

   ## Documentation

   See [GitHub repository](https://github.com/YOUR_USERNAME/llm-probe) for full documentation.
   ```

   **Dockerfile (HF-optimized):**
   ```dockerfile
   # Hugging Face Spaces Dockerfile
   FROM node:22-alpine AS builder

   WORKDIR /app

   # Copy package files
   COPY package*.json ./
   COPY backend/package*.json ./backend/

   # Install dependencies
   RUN npm ci

   # Copy source
   COPY backend ./backend
   COPY tsconfig.json ./

   # Build
   RUN npm run build --workspace=backend

   # Production stage
   FROM node:22-alpine

   WORKDIR /app

   # Install production dependencies
   COPY package*.json ./
   COPY backend/package*.json ./backend/
   RUN npm ci --workspace=backend --omit=dev

   # Copy built app
   COPY --from=builder /app/backend/dist ./backend/dist

   # Hugging Face Spaces runs as user 1000
   RUN addgroup -g 1000 user && \
       adduser -D -u 1000 -G user user
   USER user

   # Expose port 7860 (required by HF Spaces)
   EXPOSE 7860

   # Set port to 7860
   ENV PORT=7860

   # Set production environment
   ENV NODE_ENV=production

   # Disable API key auth for public demo
   ENV API_KEY_AUTH_ENABLED=false

   # Use Ollama (requires GPU Space or external Ollama)
   ENV LLM_PROVIDER=ollama
   ENV OLLAMA_HOST=http://localhost:11434
   ENV OLLAMA_MODEL=llama3.2:latest

   CMD ["node", "backend/dist/index.js"]
   ```

5. **Commit and push:**
   ```bash
   git add .
   git commit -m "Initial deployment"
   git push
   ```

6. **Wait for build:**
   - Go to your Space page
   - Monitor the build logs
   - Once complete, your Space will be live!

### Option B: CLI Deployment

```bash
# 1. Create Space via CLI
huggingface-cli repo create llm-testing-framework --type space --space_sdk docker

# 2. Clone and set up
git clone https://huggingface.co/spaces/YOUR_USERNAME/llm-testing-framework
cd llm-testing-framework

# 3. Copy files (same as Option A steps 3-4)
# ...

# 4. Push
git add .
git commit -m "Initial deployment"
git push
```

---

## Configuration for Hugging Face Spaces

### Port Configuration

Hugging Face Spaces requires port **7860**. Update your Dockerfile:

```dockerfile
ENV PORT=7860
EXPOSE 7860
```

### Environment Variables

Set via Space Settings > Variables:

| Variable | Value | Description |
|----------|-------|-------------|
| `NODE_ENV` | `production` | Environment mode |
| `PORT` | `7860` | HF Spaces required port |
| `LLM_PROVIDER` | `ollama` | Use Ollama for LLM |
| `API_KEY_AUTH_ENABLED` | `false` | Disable auth for demo |

### GPU Support (Optional)

For better performance, upgrade to GPU hardware:

1. Go to Space Settings > Hardware
2. Select **T4 small** ($0.60/hour) or **T4 medium** ($1.20/hour)
3. Save settings
4. Space will rebuild with GPU support

**Benefits of GPU:**
- 5-10x faster inference
- Support for larger models
- Better user experience

---

## LLM Provider Options

### Option 1: External Ollama (Recommended)

Use a separate Ollama instance:

```dockerfile
ENV LLM_PROVIDER=ollama
ENV OLLAMA_HOST=https://your-ollama-server.com
ENV OLLAMA_MODEL=llama3.2:latest
```

**Pros:** More control, better performance
**Cons:** Requires separate hosting

### Option 2: Ollama in Same Space (GPU Required)

Run Ollama inside the Space (requires GPU hardware):

```dockerfile
FROM node:22-alpine AS builder
# ... (build stage)

FROM node:22-alpine

# Install Ollama
RUN apk add --no-cache curl bash
RUN curl -fsSL https://ollama.com/install.sh | sh

# ... (copy app files)

# Start script that launches both Ollama and backend
COPY start-hf.sh /app/
RUN chmod +x /app/start-hf.sh

CMD ["/app/start-hf.sh"]
```

**start-hf.sh:**
```bash
#!/bin/bash
set -e

# Start Ollama in background
ollama serve &

# Wait for Ollama
sleep 5

# Pull model
ollama pull llama3.2:latest

# Start backend
node backend/dist/index.js
```

### Option 3: Use Hugging Face Inference API

```dockerfile
ENV LLM_PROVIDER=huggingface
ENV HF_API_TOKEN=your_token_here
ENV HF_MODEL=meta-llama/Llama-3.2-3B-Instruct
```

---

## Testing Your Deployment

Once deployed, test the API:

```bash
# Health check
curl https://YOUR_USERNAME-llm-testing-framework.hf.space/health

# Summarize call
curl -X POST https://YOUR_USERNAME-llm-testing-framework.hf.space/api/v1/summarize \
  -H "Content-Type: application/json" \
  -d '{
    "transcript": "Customer called about a password reset issue. Agent verified identity and helped them reset their password successfully. Customer was satisfied with the resolution.",
    "options": {
      "maxLength": 100,
      "includeKeyPoints": true
    }
  }'
```

---

## Troubleshooting

### Build Fails

**Check logs:**
- Go to your Space page
- Click on "Logs" tab
- Review build errors

**Common issues:**
- Port must be 7860
- User must be UID 1000
- Dependencies missing in package.json

### Space Sleeps/Restarts

Free Spaces sleep after inactivity:
- First request after sleep takes longer
- Consider upgrading to persistent hardware
- Or use external health check pinger

### Out of Memory

**Solutions:**
- Upgrade to larger hardware tier
- Use smaller model (llama3.2:latest vs llama3.1:8b)
- Reduce concurrent requests
- Optimize Docker image size

---

## Cost Optimization

| Hardware | Cost | Best For |
|----------|------|----------|
| CPU basic | **Free** | Demos, testing, low traffic |
| CPU upgrade | $0.03/hour | Medium traffic |
| T4 small | $0.60/hour | GPU inference, better UX |
| T4 medium | $1.20/hour | High performance |

**Recommendations:**
- Start with free CPU for demos
- Upgrade to GPU only if needed
- Use external Ollama to save costs
- Monitor usage and optimize

---

## Updating Your Space

```bash
# Make changes locally
git pull
# ... make edits ...

# Commit and push
git add .
git commit -m "Update model configuration"
git push

# Space rebuilds automatically
```

---

## Production Considerations

### Security

- ⚠️ **Don't expose API keys** in Space Variables (public Spaces)
- Use private Spaces for sensitive applications
- Implement rate limiting
- Add authentication if needed

### Monitoring

- Check Space logs regularly
- Monitor request latency
- Track error rates
- Set up external monitoring (UptimeRobot, etc.)

### Scaling

For high traffic:
- Use persistent GPU hardware
- Consider CDN for static assets
- Implement caching
- Or migrate to AWS/dedicated hosting

---

## Example Spaces

Browse these example Spaces for inspiration:
- [Stable Diffusion](https://huggingface.co/spaces/stabilityai/stable-diffusion)
- [ChatGPT Clone](https://huggingface.co/spaces/yizhangliu/chatgpt-clone)
- [Whisper](https://huggingface.co/spaces/openai/whisper)

---

## Next Steps

- [ ] Deploy to Hugging Face Spaces
- [ ] Test API endpoints
- [ ] Create demo UI (optional)
- [ ] Share your Space URL
- [ ] Monitor usage and costs
- [ ] Iterate based on feedback

---

## Resources

- [HF Spaces Documentation](https://huggingface.co/docs/hub/spaces)
- [Docker SDK Guide](https://huggingface.co/docs/hub/spaces-sdks-docker)
- [HF Spaces Examples](https://huggingface.co/spaces)
- [Community Forums](https://discuss.huggingface.co/)
