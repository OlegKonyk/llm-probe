# Hugging Face Spaces Deployment - FREE & Fully Cloud

**Deploy your LLM testing framework entirely in the cloud for FREE.**

No local machine dependencies, no ngrok tunnels, no paid hosting.

---

## Why Hugging Face Spaces?

✅ **Completely FREE** - No credit card required
✅ **Free GPU access** - For running Ollama models
✅ **16GB RAM** - More than enough for llama3.2
✅ **No local machine needed** - Everything runs in the cloud
✅ **Persistent deployment** - Always online
✅ **Public URL** - Automatic HTTPS endpoint

**Cost: $0/month**

---

## Architecture

```
┌─────────────────────────────────────────────┐
│     Hugging Face Space (FREE GPU)          │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │  Ollama Service                     │   │
│  │  (llama3.2:latest)                 │   │
│  │  Port: 11434                        │   │
│  └──────────────┬──────────────────────┘   │
│                 │                           │
│                 │ localhost                 │
│                 ▼                           │
│  ┌─────────────────────────────────────┐   │
│  │  Express Backend                    │   │
│  │  Port: 7860 (HF default)           │   │
│  │  - /api/v1/summarize                │   │
│  │  - /health                          │   │
│  └─────────────────────────────────────┘   │
│                                             │
└──────────────────┬──────────────────────────┘
                   │
                   │ HTTPS (auto-provisioned)
                   ▼
            https://your-username-llm-testing.hf.space
```

---

## Prerequisites

1. **Hugging Face Account** (free)
   - Sign up at https://huggingface.co/join

2. **Git installed locally** (for initial push)

3. **Hugging Face CLI** (optional, can use web UI)
   ```bash
   pip install huggingface_hub
   huggingface-cli login
   ```

---

## Step 1: Create Hugging Face Space

### Via Web UI (Easier)

1. Go to https://huggingface.co/spaces
2. Click **"Create new Space"**
3. Configure:
   - **Space name:** `llm-testing-framework`
   - **License:** Apache 2.0
   - **SDK:** Docker
   - **Hardware:** CPU Basic (FREE) - will upgrade to GPU after setup
   - **Visibility:** Public (or Private if you prefer)

4. Click **"Create Space"**

### Via CLI

```bash
huggingface-cli repo create llm-testing-framework --type space --sdk docker
```

---

## Step 2: Create Dockerfile for HF Spaces

Create `Dockerfile` in your project root:

```dockerfile
FROM node:20-slim

# Install Ollama
RUN apt-get update && apt-get install -y curl
RUN curl -fsSL https://ollama.com/install.sh | sh

# Set working directory
WORKDIR /app

# Copy backend package files
COPY backend/package*.json ./
RUN npm install --production

# Copy backend source
COPY backend/ ./

# Expose HF Spaces default port
ENV PORT=7860
EXPOSE 7860

# Set environment variables
ENV NODE_ENV=production
ENV OLLAMA_HOST=http://localhost:11434
ENV OLLAMA_MODEL=llama3.2:latest

# Download Ollama model at build time (cached in image)
RUN ollama serve & \
    sleep 10 && \
    ollama pull llama3.2:latest && \
    pkill ollama

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:7860/health || exit 1

# Start script
COPY start.sh /app/start.sh
RUN chmod +x /app/start.sh

CMD ["/app/start.sh"]
```

---

## Step 3: Create Startup Script

Create `start.sh` in your project root:

```bash
#!/bin/bash

# Start Ollama in background
echo "Starting Ollama service..."
ollama serve &

# Wait for Ollama to be ready
echo "Waiting for Ollama to start..."
sleep 10

# Verify model is available
echo "Verifying llama3.2:latest model..."
ollama list

# Start Express backend
echo "Starting Express backend on port $PORT..."
cd /app
npm start
```

---

## Step 4: Update Backend for Port 7860

Hugging Face Spaces requires port 7860. Update `/backend/src/index.ts`:

```typescript
// Change this line
const PORT = process.env.PORT || 7860;  // HF Spaces uses 7860
```

---

## Step 5: Create README.md for Space

Create `README.md` in project root:

```markdown
---
title: LLM Testing Framework
emoji: 🤖
colorFrom: blue
colorTo: green
sdk: docker
app_port: 7860
---

# LLM Testing Framework

Production-ready testing framework for Large Language Model applications.

## Features

- 🎯 Semantic similarity evaluation
- 📊 Performance benchmarking
- 🔒 Security testing
- 📈 Metrics aggregation
- 🧪 Property-based testing

## API Endpoints

### POST /api/v1/summarize
Summarize a conversation transcript using Ollama (llama3.2:latest).

**Request:**
```json
{
  "transcript": "Agent: Hello, how can I help? Customer: I forgot my password..."
}
```

**Response:**
```json
{
  "summary": "Customer requested password reset assistance...",
  "metadata": {
    "model": "llama3.2:latest",
    "timestamp": "2025-11-03T12:00:00.000Z"
  }
}
```

### GET /health
Health check endpoint.

## Running Locally

See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) for local setup instructions.
```

---

## Step 6: Push to Hugging Face Space

### Option A: Via Git (Recommended)

```bash
cd /Users/oleg/code/llm-principals

# Add HF Space as remote
git remote add hf https://huggingface.co/spaces/YOUR_USERNAME/llm-testing-framework

# Push code
git add Dockerfile start.sh README.md
git commit -m "Deploy to Hugging Face Spaces"
git push hf main
```

### Option B: Via Web UI

1. Go to your Space: `https://huggingface.co/spaces/YOUR_USERNAME/llm-testing-framework`
2. Click **"Files and versions"** tab
3. Click **"Add file"** → **"Upload files"**
4. Upload:
   - `Dockerfile`
   - `start.sh`
   - `README.md`
   - `backend/` directory (entire folder)

---

## Step 7: Upgrade to FREE GPU (Optional but Recommended)

For faster inference:

1. Go to your Space settings
2. Under **"Hardware"**, select **"GPU T4 - Small"**
3. Click **"Save"**

**Note:** FREE GPU may have queue during peak times. CPU works but slower.

---

## Step 8: Wait for Build

HF Spaces will:
1. Build your Docker image (~10-15 minutes)
2. Download llama3.2 model (~2GB, cached in image)
3. Start the application
4. Provide public URL

Watch build logs in the **"Logs"** tab.

---

## Step 9: Test Deployment

Once deployed, your Space will be available at:
```
https://huggingface.co/spaces/YOUR_USERNAME/llm-testing-framework
```

Test the API:

```bash
# Health check
curl https://YOUR_USERNAME-llm-testing-framework.hf.space/health

# Summarize
curl -X POST https://YOUR_USERNAME-llm-testing-framework.hf.space/api/v1/summarize \
  -H "Content-Type: application/json" \
  -d '{
    "transcript": "Agent: Hello! Customer: I need help with my password. Agent: I can help. Customer: Thanks!"
  }'
```

---

## Environment Variables (Optional)

Set secrets in Space settings:

1. Go to **Settings** → **Repository secrets**
2. Add variables:
   - `ALLOWED_ORIGINS`: Comma-separated list of allowed origins
   - `LOG_LEVEL`: `info` or `debug`

---

## Limitations of HF Spaces Free Tier

### What's FREE Forever:
- ✅ CPU Basic (always on)
- ✅ 16GB RAM
- ✅ 50GB storage
- ✅ Public HTTPS endpoint

### What Has Limits:
- ⚠️ **GPU access** - May have queue during peak hours
  - Free GPU: T4 Small (queue possible)
  - Paid GPU: $0.60/hour (no queue)

- ⚠️ **Sleeps after 48 hours of inactivity**
  - Wakes up on first request (~30 seconds)
  - Solution: Ping health endpoint every day

### Auto-Wake Script (Optional):
Use GitHub Actions to ping every day:

```yaml
# .github/workflows/keep-alive.yml
name: Keep HF Space Alive
on:
  schedule:
    - cron: '0 12 * * *'  # Daily at noon

jobs:
  ping:
    runs-on: ubuntu-latest
    steps:
      - run: curl https://YOUR_USERNAME-llm-testing-framework.hf.space/health
```

---

## Monitoring

### View Logs:
1. Go to your Space
2. Click **"Logs"** tab
3. See real-time application logs

### Metrics:
HF Spaces provides:
- Request count
- Response times
- Error rates
- CPU/GPU usage

---

## Updating Your Deployment

### Make changes locally:
```bash
# Edit code
vim backend/src/index.ts

# Commit and push
git add .
git commit -m "Update API endpoint"
git push hf main
```

HF Spaces will automatically rebuild and redeploy.

---

## Troubleshooting

### Space won't start:

**Check logs for errors:**
- Ollama installation failed → Check Dockerfile
- Port 7860 not listening → Check PORT env var in index.ts
- Model download timeout → Model too large for free tier

### Ollama errors:

```bash
# SSH into Space (if enabled)
# Check Ollama status
curl http://localhost:11434/api/tags

# Restart Ollama
pkill ollama
ollama serve &
```

### Out of memory:

- Free tier has 16GB RAM
- llama3.2 uses ~2-4GB
- Should have plenty of headroom
- If OOM: Switch to smaller model (llama3.2:1b)

---

## Cost Comparison

| Solution | Monthly Cost | Local Machine | Setup Time |
|----------|--------------|---------------|------------|
| **HF Spaces (CPU)** | **$0** | ❌ Not needed | 20 min |
| HF Spaces (GPU) | $0 (queue) or $432/mo | ❌ Not needed | 20 min |
| Railway + Local Ollama | $0 | ✅ Required | 30 min |
| Railway + Paid RAM | $10/mo | ❌ Not needed | 15 min |
| OpenAI API | $1-5/mo | ❌ Not needed | 10 min |

**Best FREE option with no local dependencies: HF Spaces CPU**

---

## Production Considerations

### For Production Use:
1. **Enable authentication** - Add API key middleware
2. **Rate limiting** - Already implemented ✅
3. **Custom domain** - Upgrade to HF Pro ($9/mo)
4. **Dedicated GPU** - Upgrade to persistent GPU ($0.60/hr)
5. **Monitoring** - Integrate with Datadog/Sentry

### When to Upgrade from HF Spaces:
- Need guaranteed GPU (no queue)
- Need custom domain
- Need SLA guarantees
- High traffic (>10K requests/day)

---

## Alternative: Hugging Face Inference API

If you don't want to manage Ollama at all:

```typescript
// Use HF's hosted models instead
import { HfInference } from '@huggingface/inference';

const hf = new HfInference(process.env.HF_TOKEN);

const response = await hf.textGeneration({
  model: 'meta-llama/Llama-2-7b-chat-hf',
  inputs: prompt,
  parameters: { max_new_tokens: 150 }
});
```

**Pros:**
- No Ollama management
- Faster cold starts
- Multiple models available

**Cons:**
- Rate limited on free tier
- Less control over model

---

## Next Steps

1. Create HF account if you don't have one
2. Create Space with Docker SDK
3. Add Dockerfile and start.sh from this guide
4. Push code and wait for build
5. Test your deployed API

**Your LLM framework will be 100% cloud-hosted with zero local dependencies!**

---

**Questions or issues?** Check HF Spaces documentation: https://huggingface.co/docs/hub/spaces
