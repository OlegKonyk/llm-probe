# AWS Infrastructure for LLM Testing Framework

AWS CDK infrastructure for deploying the LLM Testing Framework to production using ECS Fargate and AWS Bedrock.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Internet Gateway                          │
└──────────────────────┬──────────────────────────────────────┘
                       │
              ┌────────▼────────┐
              │  Application    │
              │  Load Balancer  │
              │    (Public)     │
              └────────┬────────┘
                       │
        ┌──────────────┴──────────────┐
        │                             │
   ┌────▼────┐                   ┌────▼────┐
   │  ECS    │                   │  ECS    │
   │  Task   │                   │  Task   │
   │  (AZ 1) │                   │  (AZ 2) │
   └────┬────┘                   └────┬────┘
        │                             │
        └──────────────┬──────────────┘
                       │
                ┌──────▼──────┐
                │   AWS       │
                │   Bedrock   │
                │  (Claude)   │
                └─────────────┘
```

## Components

### Network
- **VPC**: Multi-AZ VPC with public and private subnets
- **NAT Gateway**: For private subnet internet access
- **Application Load Balancer**: Internet-facing ALB for routing traffic

### Compute
- **ECS Fargate**: Serverless container runtime
  - CPU: 512 (0.5 vCPU)
  - Memory: 1024 MB (1 GB)
  - Auto-scaling: 2-10 tasks based on CPU/Memory
- **ECR Repository**: Stores Docker images

### Security
- **IAM Roles**:
  - Execution role for ECS task management
  - Task role for Bedrock and Secrets Manager access
- **Secrets Manager**: Stores API keys securely
- **Security Groups**: Restrict traffic to load balancer and tasks

### Monitoring
- **CloudWatch Logs**: Centralized logging
- **Container Insights**: ECS metrics and monitoring
- **ALB Health Checks**: Automatic unhealthy task replacement

### LLM
- **AWS Bedrock**: Managed LLM service (Claude 3 Sonnet)
- No model hosting required
- Pay-per-token pricing

## Prerequisites

1. **AWS Account** with appropriate permissions
2. **AWS CLI** configured
   ```bash
   aws configure
   ```
3. **Node.js 18+** and npm
4. **Docker** (for building images)
5. **AWS CDK CLI**
   ```bash
   npm install -g aws-cdk
   ```

## Quick Start

### 1. Install Dependencies

```bash
cd infrastructure
npm install
```

### 2. Bootstrap CDK (First time only)

```bash
cdk bootstrap aws://ACCOUNT-ID/us-east-1
```

### 3. Build Backend Image

```bash
# From repo root
docker build -t llm-testing-backend:latest .

# Tag for ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin ACCOUNT-ID.dkr.ecr.us-east-1.amazonaws.com

# Push to ECR (after stack is deployed)
docker tag llm-testing-backend:latest ACCOUNT-ID.dkr.ecr.us-east-1.amazonaws.com/llm-testing-backend:latest
docker push ACCOUNT-ID.dkr.ecr.us-east-1.amazonaws.com/llm-testing-backend:latest
```

### 4. Deploy Stack

```bash
cd infrastructure

# Preview changes
npm run synth

# Deploy
npm run deploy

# Or with options
cdk deploy --context bedrockModel=anthropic.claude-3-sonnet-20240229-v1:0
```

### 5. Configure API Keys

```bash
# Update the secret with your API keys
aws secretsmanager update-secret \
  --secret-id llm-test/api-keys \
  --secret-string '{"keys":["your-api-key-1","your-api-key-2"]}'
```

### 6. Test Deployment

```bash
# Get the load balancer URL from outputs
LOAD_BALANCER_DNS=$(aws cloudformation describe-stacks \
  --stack-name LlmTestingStack \
  --query 'Stacks[0].Outputs[?OutputKey==`LoadBalancerDNS`].OutputValue' \
  --output text)

# Health check
curl http://$LOAD_BALANCER_DNS/health

# Test API (with API key)
curl -X POST http://$LOAD_BALANCER_DNS/api/v1/summarize \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{
    "transcript": "Customer called about password reset...",
    "options": {"maxLength": 100}
  }'
```

## Stack Outputs

After deployment, the stack provides:

- **LoadBalancerDNS**: DNS name of the load balancer
- **ApiEndpoint**: Full HTTP endpoint URL
- **RepositoryUri**: ECR repository URI for pushing images
- **SecretArn**: Secrets Manager ARN for API keys
- **ClusterName**: ECS cluster name

## Configuration Options

### Context Variables

```bash
# Custom Bedrock model
cdk deploy --context bedrockModel=anthropic.claude-3-haiku-20240307-v1:0

# Desired task count
cdk deploy --context desiredCount=4

# Use existing VPC
cdk deploy --context vpcId=vpc-xxxxxxxx
```

### Environment Variables

Set in `bin/app.ts`:
- `CDK_DEFAULT_ACCOUNT`: AWS account ID
- `CDK_DEFAULT_REGION`: AWS region (default: us-east-1)
- `ENVIRONMENT`: Environment name (production, staging, etc.)

## Cost Estimate

### Monthly Costs (approximate)

| Service | Usage | Cost |
|---------|-------|------|
| ECS Fargate | 2 tasks × 0.5 vCPU × 1GB × 24/7 | ~$30 |
| ALB | 1 load balancer + data | ~$20 |
| NAT Gateway | 1 gateway + data | ~$35 |
| Bedrock | 100K requests × 200 tokens avg | ~$45 |
| CloudWatch Logs | 10 GB | ~$5 |
| ECR | Storage + data transfer | ~$2 |
| **Total** | | **~$137/month** |

**Cost Optimization Tips:**
- Reduce NAT gateways (1 instead of 2)
- Use smaller Fargate sizes for low traffic
- Set shorter log retention periods
- Use reserved capacity for predictable workloads

## Deployment Pipeline (CI/CD)

### GitHub Actions Example

```yaml
name: Deploy to AWS
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Configure AWS
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1

      - name: Build & Push Image
        run: |
          aws ecr get-login-password | docker login --username AWS --password-stdin $ECR_URI
          docker build -t llm-testing-backend:latest .
          docker tag llm-testing-backend:latest $ECR_URI:latest
          docker push $ECR_URI:latest

      - name: Deploy CDK
        run: |
          cd infrastructure
          npm install
          npm run deploy -- --require-approval never
```

## Updating the Application

### Rolling Updates

```bash
# Build new image
docker build -t llm-testing-backend:latest .

# Tag and push to ECR
docker tag llm-testing-backend:latest $ECR_URI:$VERSION
docker push $ECR_URI:$VERSION

# Update ECS service (automatic rollout)
aws ecs update-service \
  --cluster llm-testing-cluster \
  --service llm-testing-backend \
  --force-new-deployment
```

### Blue/Green Deployments

For zero-downtime deployments, consider using:
- AWS CodeDeploy with ECS blue/green deployments
- Multiple target groups with weighted routing

## Monitoring

### CloudWatch Dashboards

```bash
# View logs
aws logs tail /ecs/llm-testing-backend --follow

# View metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/ECS \
  --metric-name CPUUtilization \
  --dimensions Name=ServiceName,Value=llm-testing-backend \
  --start-time 2024-01-01T00:00:00Z \
  --end-time 2024-01-01T23:59:59Z \
  --period 3600 \
  --statistics Average
```

### Alarms

Consider adding CloudWatch alarms for:
- High CPU utilization (>80%)
- High memory utilization (>80%)
- Unhealthy target count
- High error rate (5xx responses)
- High latency (P99 > 2s)

## Troubleshooting

### Task Won't Start

```bash
# Check task status
aws ecs describe-tasks \
  --cluster llm-testing-cluster \
  --tasks $(aws ecs list-tasks --cluster llm-testing-cluster --query 'taskArns[0]' --output text)

# Check logs
aws logs tail /ecs/llm-testing-backend --follow
```

### Health Checks Failing

```bash
# Test health endpoint from task
aws ecs execute-command \
  --cluster llm-testing-cluster \
  --task TASK-ID \
  --interactive \
  --command "/bin/sh"

# Inside container:
curl localhost:3000/health
```

### Bedrock Access Denied

Verify IAM permissions:
```bash
aws iam get-role-policy \
  --role-name LlmTestingStack-TaskRole \
  --policy-name BedrockAccess
```

## Cleanup

```bash
# Delete stack (keeps ECR images)
cdk destroy

# Clean up ECR images
aws ecr batch-delete-image \
  --repository-name llm-testing-backend \
  --image-ids imageTag=latest
```

## Security Best Practices

1. **Never commit secrets** to version control
2. **Use IAM roles** instead of access keys
3. **Enable VPC Flow Logs** for network monitoring
4. **Use AWS WAF** for ALB protection
5. **Enable CloudTrail** for audit logging
6. **Rotate API keys** regularly via Secrets Manager
7. **Use HTTPS** with ACM certificates (add ALB HTTPS listener)
8. **Implement rate limiting** at ALB or API Gateway level

## Production Checklist

- [ ] Enable HTTPS with ACM certificate
- [ ] Configure custom domain name
- [ ] Set up CloudWatch alarms
- [ ] Enable AWS WAF rules
- [ ] Configure backup/disaster recovery
- [ ] Set up CI/CD pipeline
- [ ] Enable VPC Flow Logs
- [ ] Configure log aggregation
- [ ] Set up on-call alerts
- [ ] Document runbooks

## Support

For issues or questions:
- Check logs: `aws logs tail /ecs/llm-testing-backend --follow`
- View metrics in CloudWatch Console
- Review ECS service events
- Check ALB target health

## License

MIT
