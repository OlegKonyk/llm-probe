# Deployment Guide

This guide covers deploying the LLM Testing Framework in various environments.

## Table of Contents

- [Quick Start with Docker](#quick-start-with-docker)
- [Local Development](#local-development)
- [Production Deployment](#production-deployment)
- [Cloud Deployments](#cloud-deployments)

---

## Quick Start with Docker

The fastest way to get started is using Docker Compose:

```bash
# 1. Clone the repository
git clone https://github.com/yourusername/llm-probe.git
cd llm-probe

# 2. Start all services (backend + Ollama)
./start.sh

# 3. Wait for model download (first run only, ~2GB)
# Services will be ready when you see: "✅ LLM Testing Framework is ready!"
```

**Services:**
- Backend API: `http://localhost:3000`
- Ollama API: `http://localhost:11434`

**Test the API:**
```bash
curl -X POST http://localhost:3000/api/v1/summarize \
  -H "Content-Type: application/json" \
  -d '{
    "transcript": "Customer called about password reset. Agent helped them reset password successfully.",
    "options": {"maxLength": 100}
  }'
```

---

## Local Development

### Prerequisites

- Node.js 22+
- Ollama (for local LLM)
- Docker (optional, for containerized development)

### Option 1: Native Setup

```bash
# 1. Install Ollama
# macOS/Linux: https://ollama.ai/download
# Windows: Follow Ollama Windows installation

# 2. Start Ollama
ollama serve

# 3. Pull the model (one-time setup, ~2GB)
ollama pull llama3.2:latest

# 4. Install dependencies
npm install

# 5. Configure environment
cp backend/.env.development.example backend/.env
# Edit backend/.env if needed

# 6. Start the backend
npm run dev --workspace=backend

# 7. Run tests (in another terminal)
npm test --workspace=ts-test
```

### Option 2: Docker Development

```bash
# Start services with hot-reload
docker-compose up --build

# View logs
docker-compose logs -f backend

# Run tests
npm test --workspace=ts-test

# Stop services
docker-compose down
```

---

## Production Deployment

### Architecture Options

#### Option A: Docker + Ollama (Self-Hosted)

**Best for:** Full control, no cloud costs, on-premise deployments

**Requirements:**
- Docker host with GPU (recommended for better performance)
- 8GB+ RAM
- 20GB+ storage for models

**Deployment:**

1. **Set up production environment:**
```bash
# Copy production config
cp backend/.env.production.example backend/.env

# Edit .env with production values
nano backend/.env
```

2. **Build and deploy:**
```bash
# Build production image
docker build -t llm-backend:latest .

# Start services
docker-compose -f docker-compose.yml up -d

# Pull model on first run
docker exec llm-ollama ollama pull llama3.2:latest
```

3. **Configure reverse proxy (Nginx example):**
```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

#### Option B: AWS ECS + Bedrock (Cloud)

**Best for:** Scalability, managed infrastructure, enterprise deployments

**Requirements:**
- AWS Account
- IAM permissions for ECS, Bedrock, Secrets Manager
- VPC with public/private subnets

**Deployment Steps:**

1. **Set up AWS infrastructure:**

```bash
# Install AWS CLI
brew install awscli  # macOS
# aws configure

# Create Secrets Manager secret for API keys
aws secretsmanager create-secret \
  --name llm-test/api-keys \
  --secret-string '{"keys": ["your-api-key-here"]}'
```

2. **Create ECS task definition:**

```json
{
  "family": "llm-backend",
  "taskRoleArn": "arn:aws:iam::ACCOUNT:role/llm-backend-task-role",
  "executionRoleArn": "arn:aws:iam::ACCOUNT:role/llm-backend-execution-role",
  "networkMode": "awsvpc",
  "containerDefinitions": [{
    "name": "backend",
    "image": "your-ecr-repo/llm-backend:latest",
    "cpu": 512,
    "memory": 1024,
    "essential": true,
    "environment": [
      {"name": "NODE_ENV", "value": "production"},
      {"name": "LLM_PROVIDER", "value": "bedrock"},
      {"name": "AWS_REGION", "value": "us-east-1"},
      {"name": "BEDROCK_MODEL", "value": "anthropic.claude-3-sonnet-20240229-v1:0"},
      {"name": "API_KEY_PROVIDER", "value": "secrets-manager"},
      {"name": "API_KEY_SECRET_NAME", "value": "llm-test/api-keys"}
    ],
    "portMappings": [{
      "containerPort": 3000,
      "protocol": "tcp"
    }],
    "logConfiguration": {
      "logDriver": "awslogs",
      "options": {
        "awslogs-group": "/ecs/llm-backend",
        "awslogs-region": "us-east-1",
        "awslogs-stream-prefix": "ecs"
      }
    }
  }],
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024"
}
```

3. **Required IAM Policies:**

**Task Role (for application):**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel"
      ],
      "Resource": "arn:aws:bedrock:*:*:model/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue"
      ],
      "Resource": "arn:aws:secretsmanager:*:*:secret:llm-test/*"
    }
  ]
}
```

**Execution Role (for ECS):**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ecr:GetAuthorizationToken",
        "ecr:BatchCheckLayerAvailability",
        "ecr:GetDownloadUrlForLayer",
        "ecr:BatchGetImage",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "*"
    }
  ]
}
```

4. **Deploy to ECS:**

```bash
# Build and push to ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin YOUR_ECR_URL

docker build -t llm-backend:latest .
docker tag llm-backend:latest YOUR_ECR_URL/llm-backend:latest
docker push YOUR_ECR_URL/llm-backend:latest

# Create/update ECS service
aws ecs create-service \
  --cluster llm-cluster \
  --service-name llm-backend \
  --task-definition llm-backend:1 \
  --desired-count 2 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxx],securityGroups=[sg-xxx]}" \
  --load-balancers "targetGroupArn=arn:aws:elasticloadbalancing:...,containerName=backend,containerPort=3000"
```

---

## Cloud Deployments

### Hugging Face Spaces

See [HF_SPACES_DEPLOYMENT.md](./HF_SPACES_DEPLOYMENT.md) for detailed instructions.

### Railway

1. Fork the repository
2. Connect to Railway
3. Set environment variables in Railway dashboard
4. Deploy

### Render

1. Create new Web Service
2. Connect repository
3. Set build command: `npm run build --workspace=backend`
4. Set start command: `node backend/dist/index.js`
5. Add environment variables
6. Deploy

---

## Monitoring & Maintenance

### Health Checks

```bash
# Backend health
curl http://localhost:3000/health

# Ollama health (if using)
curl http://localhost:11434/api/tags
```

### Logs

```bash
# Docker logs
docker-compose logs -f backend
docker-compose logs -f ollama

# AWS CloudWatch (if using ECS)
aws logs tail /ecs/llm-backend --follow
```

### Metrics

- Monitor response times (P95 < 2s recommended)
- Track error rates (< 1% target)
- Monitor token usage and costs
- Set up CloudWatch alarms for anomalies

---

## Troubleshooting

### Issue: Ollama model not found

**Solution:**
```bash
docker exec llm-ollama ollama pull llama3.2:latest
```

### Issue: Backend can't connect to Ollama

**Solution:**
- Check `OLLAMA_HOST` environment variable
- Verify Ollama container is running: `docker ps`
- Check network connectivity: `docker network inspect llm-network`

### Issue: High latency in production

**Solutions:**
- Enable GPU acceleration for Ollama
- Use smaller model (llama3.2:latest vs llama3.1:8b)
- Scale horizontally (multiple backend instances)
- Switch to AWS Bedrock for managed infrastructure

### Issue: AWS Bedrock access denied

**Solution:**
- Verify IAM role has `bedrock:InvokeModel` permission
- Check model ID is correct for your region
- Ensure Bedrock is enabled in your AWS region

---

## Security Checklist

- [ ] API keys stored in secure secrets management
- [ ] HTTPS enabled with valid SSL certificate
- [ ] CORS configured for allowed origins only
- [ ] Rate limiting enabled and tuned
- [ ] CloudWatch logging enabled
- [ ] VPC security groups configured (if using AWS)
- [ ] Regular security updates applied
- [ ] API keys rotated regularly
- [ ] Monitoring and alerts configured

---

## Cost Optimization

### Self-Hosted (Ollama)
- **Pros:** No API costs, full control
- **Cons:** Infrastructure costs, maintenance burden
- **Estimated:** $50-200/month (depending on server specs)

### AWS Bedrock
- **Pros:** Pay-per-use, scalable, managed
- **Cons:** Per-token pricing
- **Estimated:** $0.003 per 1K input tokens, $0.015 per 1K output tokens
- **Example:** 100K requests/month, 200 tokens avg = ~$45/month

### Hybrid Approach
- Use Ollama for development/testing
- Use Bedrock for production (better quality, SLAs)

---

## Next Steps

- [ ] Set up CI/CD pipeline
- [ ] Configure monitoring dashboards
- [ ] Set up automated backups (if applicable)
- [ ] Document runbooks for common operations
- [ ] Plan disaster recovery procedures
- [ ] Schedule regular security audits
