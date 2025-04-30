#!/bin/bash
# Deployment script for LLM Testing Framework to AWS

set -e

echo "🚀 LLM Testing Framework - AWS Deployment"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
STACK_NAME="LlmTestingStack"
REGION="${AWS_REGION:-us-east-1}"
IMAGE_TAG="${IMAGE_TAG:-latest}"

# Step 1: Check prerequisites
echo "📋 Checking prerequisites..."

if ! command -v aws &> /dev/null; then
    echo -e "${RED}❌ AWS CLI not found. Please install it first.${NC}"
    exit 1
fi

if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker not found. Please install it first.${NC}"
    exit 1
fi

if ! command -v cdk &> /dev/null; then
    echo -e "${RED}❌ AWS CDK not found. Installing...${NC}"
    npm install -g aws-cdk
fi

# Check AWS credentials
if ! aws sts get-caller-identity &> /dev/null; then
    echo -e "${RED}❌ AWS credentials not configured. Run 'aws configure' first.${NC}"
    exit 1
fi

ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
echo -e "${GREEN}✅ AWS Account: $ACCOUNT_ID${NC}"
echo -e "${GREEN}✅ Region: $REGION${NC}"

# Step 2: Get ECR repository URI
echo ""
echo "📦 Getting ECR repository URI..."

# Check if stack exists
if aws cloudformation describe-stacks --stack-name $STACK_NAME --region $REGION &> /dev/null; then
    REPOSITORY_URI=$(aws cloudformation describe-stacks \
        --stack-name $STACK_NAME \
        --region $REGION \
        --query 'Stacks[0].Outputs[?OutputKey==`RepositoryUri`].OutputValue' \
        --output text)

    if [ -z "$REPOSITORY_URI" ]; then
        echo -e "${YELLOW}⚠️  Stack exists but no ECR repository found. Deploying stack first...${NC}"
        NEED_INITIAL_DEPLOY=true
    else
        echo -e "${GREEN}✅ ECR Repository: $REPOSITORY_URI${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Stack not found. Will deploy after building image.${NC}"
    NEED_INITIAL_DEPLOY=true
fi

# Step 3: Build Docker image
echo ""
echo "🏗️  Building Docker image..."
cd ..
docker build -t llm-testing-backend:$IMAGE_TAG .

# Step 4: Deploy CDK stack (if needed for first time)
if [ "$NEED_INITIAL_DEPLOY" = true ]; then
    echo ""
    echo "📤 Deploying CDK stack (initial deployment)..."
    cd infrastructure
    npm install
    npm run deploy

    # Get repository URI after deployment
    REPOSITORY_URI=$(aws cloudformation describe-stacks \
        --stack-name $STACK_NAME \
        --region $REGION \
        --query 'Stacks[0].Outputs[?OutputKey==`RepositoryUri`].OutputValue' \
        --output text)

    echo -e "${GREEN}✅ Stack deployed. ECR Repository: $REPOSITORY_URI${NC}"
    cd ..
fi

# Step 5: Push image to ECR
if [ -n "$REPOSITORY_URI" ]; then
    echo ""
    echo "📤 Pushing image to ECR..."

    # Login to ECR
    aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin $REPOSITORY_URI

    # Tag and push
    docker tag llm-testing-backend:$IMAGE_TAG $REPOSITORY_URI:$IMAGE_TAG
    docker push $REPOSITORY_URI:$IMAGE_TAG

    echo -e "${GREEN}✅ Image pushed to ECR${NC}"

    # Step 6: Update ECS service
    echo ""
    echo "🔄 Updating ECS service..."

    CLUSTER_NAME=$(aws cloudformation describe-stacks \
        --stack-name $STACK_NAME \
        --region $REGION \
        --query 'Stacks[0].Outputs[?OutputKey==`ClusterName`].OutputValue' \
        --output text)

    aws ecs update-service \
        --cluster $CLUSTER_NAME \
        --service llm-testing-backend \
        --force-new-deployment \
        --region $REGION \
        > /dev/null

    echo -e "${GREEN}✅ ECS service updated${NC}"
fi

# Step 7: Get outputs
echo ""
echo "📊 Deployment Summary:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

LOAD_BALANCER_DNS=$(aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --region $REGION \
    --query 'Stacks[0].Outputs[?OutputKey==`LoadBalancerDNS`].OutputValue' \
    --output text)

API_ENDPOINT=$(aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --region $REGION \
    --query 'Stacks[0].Outputs[?OutputKey==`ApiEndpoint`].OutputValue' \
    --output text)

echo "Load Balancer: $LOAD_BALANCER_DNS"
echo "API Endpoint:  $API_ENDPOINT"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Step 8: Test health endpoint
echo ""
echo "🏥 Testing health endpoint..."
sleep 5 # Give service a moment to start

if curl -sf "$API_ENDPOINT/health" > /dev/null; then
    echo -e "${GREEN}✅ Health check passed!${NC}"
else
    echo -e "${YELLOW}⚠️  Health check failed. Service may still be starting...${NC}"
    echo "   Check status with: aws ecs describe-services --cluster $CLUSTER_NAME --services llm-testing-backend"
fi

echo ""
echo -e "${GREEN}✅ Deployment complete!${NC}"
echo ""
echo "📝 Next steps:"
echo "  1. Configure API keys in Secrets Manager:"
echo "     aws secretsmanager update-secret --secret-id llm-test/api-keys --secret-string '{\"keys\":[\"your-key\"]}'"
echo ""
echo "  2. Test the API:"
echo "     curl -X POST $API_ENDPOINT/api/v1/summarize \\"
echo "       -H 'Content-Type: application/json' \\"
echo "       -H 'X-API-Key: your-key' \\"
echo "       -d '{\"transcript\":\"test\",\"options\":{}}'"
echo ""
echo "  3. View logs:"
echo "     aws logs tail /ecs/llm-testing-backend --follow"
echo ""
