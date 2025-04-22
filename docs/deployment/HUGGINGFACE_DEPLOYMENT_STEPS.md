# Hugging Face Spaces - Quick Deployment Steps

Step-by-step guide to deploy the LLM Testing Framework to Hugging Face Spaces in under 10 minutes.

## Quick Start

### 1. Create Hugging Face Space (2 min)

1. Go to https://huggingface.co/new-space
2. Fill in:
   - **Space name:** `llm-testing-framework`
   - **License:** MIT
   - **SDK:** Docker
   - **Hardware:** CPU basic (free) or T4 small (GPU, $0.60/hour)
   - **Visibility:** Public
3. Click **Create Space**

### 2. Prepare Files (3 min)

```bash
# Clone your Space repository
git clone https://huggingface.co/spaces/YOUR_USERNAME/llm-testing-framework
cd llm-testing-framework

# Copy from your llm-probe repository
cp -r /path/to/llm-probe/backend ./
cp /path/to/llm-probe/package.json ./
cp /path/to/llm-probe/tsconfig.json ./
cp /path/to/llm-probe/.dockerignore ./
```

### 3. Create Space Files (3 min)

**Create `Dockerfile`:**

```dockerfile
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY backend/package*.json ./backend/
RUN npm ci
COPY backend ./backend
COPY tsconfig.json ./
RUN npm run build --workspace=backend

FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
COPY backend/package*.json ./backend/
RUN npm ci --workspace=backend --omit=dev
COPY --from=builder /app/backend/dist ./backend/dist
RUN addgroup -g 1000 user && adduser -D -u 1000 -G user user
USER user
EXPOSE 7860
ENV PORT=7860 NODE_ENV=production API_KEY_AUTH_ENABLED=false
CMD ["node", "backend/dist/index.js"]
```

**Create `README.md`:**

```markdown
---
title: LLM Testing Framework
emoji: 🧪
colorFrom: blue
colorTo: green
sdk: docker
app_port: 7860
---

# LLM Testing Framework

Testing framework for LLM applications with quality evaluation and monitoring.

## Try it:

\`\`\`bash
curl -X POST https://YOUR_USERNAME-llm-testing-framework.hf.space/api/v1/summarize \
  -H "Content-Type: application/json" \
  -d '{"transcript": "Customer called about password reset...", "options": {"maxLength": 100}}'
\`\`\`
```

### 4. Deploy (2 min)

```bash
git add .
git commit -m "Initial deployment"
git push
```

### 5. Wait for Build (~3-5 min)

- Go to your Space page
- Watch build logs
- Once "Running", your Space is live!

---

## Configuration Options

### Use External Ollama

If you have Ollama running elsewhere:

```dockerfile
ENV LLM_PROVIDER=ollama
ENV OLLAMA_HOST=https://your-ollama-server.com
ENV OLLAMA_MODEL=llama3.2:latest
```

### Use Hugging Face Inference

```dockerfile
ENV LLM_PROVIDER=huggingface
ENV HF_API_TOKEN=hf_your_token_here
ENV HF_MODEL=meta-llama/Llama-3.2-3B-Instruct
```

### Add API Key Protection

```dockerfile
ENV API_KEY_AUTH_ENABLED=true
ENV API_KEY=your-secret-key
```

---

## Testing

```bash
# Health check
curl https://YOUR_USERNAME-llm-testing-framework.hf.space/health

# Test summarization
curl -X POST https://YOUR_USERNAME-llm-testing-framework.hf.space/api/v1/summarize \
  -H "Content-Type: application/json" \
  -d '{
    "transcript": "Customer called about billing issue. Resolved by issuing refund.",
    "options": {"maxLength": 50}
  }'
```

---

## Troubleshooting

### "Space is sleeping"

Free Spaces sleep after 48h of inactivity. Just visit the URL to wake it up.

### "Build failed"

Common issues:
- Port must be 7860
- User must be UID 1000
- Check build logs for specific errors

### "502 Bad Gateway"

- Space is still starting up
- Wait 30 seconds and try again
- Check if LLM provider is accessible

---

## Upgrade to GPU

For better performance:

1. Go to Space Settings
2. Click "Change hardware"
3. Select "T4 small"
4. Save (costs $0.60/hour)

Benefits:
- 5-10x faster inference
- Larger model support
- Better user experience

---

## Next Steps

- Share your Space URL
- Create a demo UI
- Add more features
- Monitor usage

Need help? Check [HF_SPACES_DEPLOYMENT.md](./HF_SPACES_DEPLOYMENT.md) for detailed guide.
