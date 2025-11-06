# Deployment Guide

This guide covers deploying the LLM Testing Framework API to various cloud platforms.

## Table of Contents

1. [Deployment Options](#deployment-options)
2. [AWS Deployment](#aws-deployment)
3. [Google Cloud Deployment](#google-cloud-deployment)
4. [Azure Deployment](#azure-deployment)
5. [Hugging Face Spaces](#hugging-face-spaces-limitations)
6. [Environment Variables](#environment-variables)

---

## Deployment Options

### Option 1: Ollama (Self-Hosted)
**Best for:** Development, testing, cost-sensitive deployments
**Requirements:** Container platform with sufficient resources (4GB+ RAM)
**Platforms:** AWS EC2/ECS, Google Cloud Run, Azure Container Instances, DigitalOcean

### Option 2: AWS Bedrock (Production)
**Best for:** Production deployments, high availability
**Requirements:** AWS account, Bedrock API access
**Platforms:** Any platform that can run Node.js containers
**Pros:** Serverless, scalable, no model hosting required

---

## AWS Deployment

### Option A: ECS with Ollama

**Architecture:**
```
ALB → ECS Fargate → Container (Ollama + Express)
```

**Steps:**

1. **Build and push Docker image:**
```bash
# Build image
docker build -t llm-testing-api .

# Tag for ECR
docker tag llm-testing-api:latest ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/llm-testing-api:latest

# Push to ECR
aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com
docker push ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/llm-testing-api:latest
```

2. **Create ECS Task Definition:**
```json
{
  "family": "llm-testing-api",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "2048",
  "memory": "4096",
  "containerDefinitions": [
    {
      "name": "llm-api",
      "image": "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/llm-testing-api:latest",
      "portMappings": [
        {
          "containerPort": 7860,
          "protocol": "tcp"
        }
      ],
      "environment": [
        { "name": "PORT", "value": "7860" },
        { "name": "NODE_ENV", "value": "production" },
        { "name": "LLM_PROVIDER", "value": "ollama" },
        { "name": "OLLAMA_HOST", "value": "http://localhost:11434" },
        { "name": "OLLAMA_MODEL", "value": "llama3.2:latest" },
        { "name": "API_KEY_PROVIDER", "value": "secrets-manager" },
        { "name": "API_KEYS_SECRET_NAME", "value": "llm-api-keys" }
      ],
      "healthCheck": {
        "command": ["CMD-SHELL", "curl -f http://localhost:7860/health || exit 1"],
        "interval": 30,
        "timeout": 5,
        "retries": 3,
        "startPeriod": 60
      }
    }
  ]
}
```

3. **Create ECS Service with ALB**

**Required Resources:**
- CPU: 2 vCPUs minimum (Ollama requires compute)
- Memory: 4GB minimum (Ollama + model requires RAM)
- Cost estimate: ~$60-80/month per instance

### Option B: ECS with Bedrock (Recommended for Production)

**Architecture:**
```
ALB → ECS Fargate → Container (Express) → AWS Bedrock API
```

**Advantages:**
- No model hosting required
- Lower resource requirements (512 CPU / 1GB RAM)
- Pay-per-use pricing
- High availability built-in
- Cost estimate: ~$10-20/month + token usage

**Steps:**

1. **Enable Bedrock model access:**
   - Go to AWS Console → Bedrock → Model access
   - Request access to "Claude 3 Haiku" or "Claude 3 Sonnet"
   - Wait for approval (~5 minutes)

2. **Update Task Definition:**
```json
{
  "family": "llm-testing-api-bedrock",
  "cpu": "512",
  "memory": "1024",
  "containerDefinitions": [
    {
      "name": "llm-api",
      "environment": [
        { "name": "LLM_PROVIDER", "value": "bedrock" },
        { "name": "AWS_REGION", "value": "us-east-1" },
        { "name": "BEDROCK_MODEL", "value": "anthropic.claude-3-haiku-20240307-v1:0" }
      ]
    }
  ]
}
```

3. **IAM Task Role:**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel"
      ],
      "Resource": "arn:aws:bedrock:*::foundation-model/anthropic.claude-*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue"
      ],
      "Resource": "arn:aws:secretsmanager:*:*:secret:llm-api-keys-*"
    }
  ]
}
```

---

## Google Cloud Deployment

### Google Cloud Run with Bedrock

**Steps:**

1. **Build and push to Google Container Registry:**
```bash
gcloud builds submit --tag gcr.io/${PROJECT_ID}/llm-testing-api
```

2. **Deploy to Cloud Run:**
```bash
gcloud run deploy llm-testing-api \
  --image gcr.io/${PROJECT_ID}/llm-testing-api \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars="LLM_PROVIDER=bedrock,AWS_REGION=us-east-1,AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID},AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY},API_KEY_PROVIDER=env,API_KEY=${API_KEY}" \
  --memory=1Gi \
  --cpu=1 \
  --timeout=60s
```

**Note:** Cloud Run is best suited for Bedrock provider. Ollama requires persistent containers with warm-up time.

---

## Azure Deployment

### Azure Container Instances with Bedrock

**Steps:**

1. **Create resource group:**
```bash
az group create --name llm-testing-rg --location eastus
```

2. **Deploy container:**
```bash
az container create \
  --resource-group llm-testing-rg \
  --name llm-testing-api \
  --image ${REGISTRY}/llm-testing-api:latest \
  --cpu 1 \
  --memory 1 \
  --environment-variables \
    LLM_PROVIDER=bedrock \
    AWS_REGION=us-east-1 \
    API_KEY_PROVIDER=env \
  --secure-environment-variables \
    API_KEY=${API_KEY} \
    AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID} \
    AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY} \
  --dns-name-label llm-testing-api \
  --ports 7860
```

---

## Hugging Face Spaces Limitations

⚠️ **Important:** Hugging Face Spaces has significant limitations for this use case.

### Why Ollama Doesn't Work on HF Spaces

1. **Container Restrictions:** HF Spaces containers have limited CPU/memory
2. **Startup Time:** Ollama requires ~30-60s warmup, exceeding HF timeout
3. **Model Loading:** Cannot reliably load large models in constrained environment
4. **Process Management:** Background processes (ollama serve) are unreliable

### Alternative for HF Spaces

**Use Bedrock Provider:**

1. Update Dockerfile:
```dockerfile
# Remove Ollama installation
# Remove model download steps
```

2. Set environment variables in HF Spaces:
```
LLM_PROVIDER=bedrock
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=<your-key>
AWS_SECRET_ACCESS_KEY=<your-secret>
API_KEY_PROVIDER=env
API_KEY=<generate-secure-key>
```

3. Update README-hf.md to mention Bedrock usage

**Or use Hugging Face Inference API:**
- Integrate HF Inference API as a new LLM provider
- Modify `llm-factory.ts` to add `huggingface` provider
- No infrastructure management needed

---

## Environment Variables

### Required (All Deployments)

| Variable | Description | Example |
|----------|-------------|---------|
| `PORT` | HTTP port | `7860` |
| `NODE_ENV` | Environment | `production` |
| `API_KEY_PROVIDER` | Auth provider | `env` or `secrets-manager` |

### Ollama Provider

| Variable | Description | Default |
|----------|-------------|---------|
| `LLM_PROVIDER` | Provider type | `ollama` |
| `OLLAMA_HOST` | Ollama URL | `http://localhost:11434` |
| `OLLAMA_MODEL` | Model name | `llama3.2:latest` |
| `OLLAMA_TIMEOUT_MS` | Timeout | `30000` |

### Bedrock Provider

| Variable | Description | Required |
|----------|-------------|----------|
| `LLM_PROVIDER` | Set to `bedrock` | Yes |
| `AWS_REGION` | AWS region | Yes |
| `AWS_ACCESS_KEY_ID` | AWS access key | Yes |
| `AWS_SECRET_ACCESS_KEY` | AWS secret | Yes |
| `BEDROCK_MODEL` | Model ID | No (default: Claude 3 Haiku) |
| `BEDROCK_TIMEOUT_MS` | Timeout | No (default: 30000) |

### API Key (env provider)

| Variable | Description |
|----------|-------------|
| `API_KEY` | Single API key for authentication |

### API Key (secrets-manager provider)

| Variable | Description |
|----------|-------------|
| `API_KEYS_SECRET_NAME` | AWS Secrets Manager secret name |
| `AWS_REGION` | AWS region for Secrets Manager |

---

## Cost Estimates

### Ollama (Self-Hosted)

**AWS ECS Fargate:**
- 2 vCPU / 4GB RAM: ~$60-80/month
- + ALB: ~$20/month
- **Total: ~$80-100/month** (flat rate, no token costs)

**Best for:** High-volume testing (>1M tokens/month)

### AWS Bedrock

**Infrastructure:**
- ECS: 0.5 vCPU / 1GB RAM: ~$15/month
- + ALB: ~$20/month
- **Subtotal: ~$35/month**

**Claude 3 Haiku Token Costs:**
- Input: $0.25 per 1M tokens
- Output: $1.25 per 1M tokens
- Example: 100K summarizations (~50M tokens): ~$50/month
- **Total: ~$85/month** at moderate volume

**Best for:** Production workloads, variable traffic

---

## Monitoring

### Health Checks

All deployments should implement:
```bash
curl http://your-deployment/health
```

Returns:
```json
{
  "status": "ok",
  "timestamp": "2025-11-04T12:00:00.000Z"
}
```

### CloudWatch Metrics (AWS)

Monitor:
- Request rate
- Error rate
- Latency (p50, p95, p99)
- Token usage (Bedrock)
- Memory/CPU utilization

### Logging

Structured JSON logs are output to stdout:
```json
{
  "level": "info",
  "message": "Request completed",
  "latency_ms": 2500,
  "tokens_used": 450,
  "model": "llama3.2:latest"
}
```

---

## Security Best Practices

1. **API Keys:**
   - Use AWS Secrets Manager in production
   - Rotate keys regularly
   - Never commit keys to git

2. **Network:**
   - Place containers in private subnets
   - Use ALB for SSL termination
   - Enable WAF for DDoS protection

3. **Rate Limiting:**
   - Configured at 100 req/15min per API key
   - Consider adding CloudFront for additional protection

4. **CORS:**
   - Configure `ALLOWED_ORIGINS` environment variable
   - Default: `*` (development only)
   - Production: Specific domains only

---

## Troubleshooting

### Ollama Issues

**Container fails to start:**
- Check memory: Ollama needs 4GB minimum
- Check startup time: May need to increase health check start period
- Check logs: `docker logs <container-id>`

**Model not found:**
- Verify model was pulled during build
- Check `ollama list` output in container
- Rebuild image if model missing

### Bedrock Issues

**403 Access Denied:**
- Enable model access in AWS Console
- Wait 5-10 minutes for propagation
- Verify IAM role has `bedrock:InvokeModel` permission

**401 Unauthorized:**
- Check AWS credentials are set correctly
- Verify credentials have not expired
- Check IAM policy is attached to role

---

## Support

For deployment issues:
1. Check logs first
2. Review environment variables
3. Verify health check passes
4. Open GitHub issue with logs and config (redact secrets)

For production support, consider:
- AWS Support plan
- CloudWatch alerting
- Monitoring dashboards
