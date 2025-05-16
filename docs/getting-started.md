# Getting Started

This guide will help you set up and run the llm-probe application and its test suites.

## Prerequisites

- **Docker & Docker Compose** - For running Ollama and the backend service
- **Node.js 18+** - For backend and TypeScript testing
- **Python 3.9+** - For Python testing framework
- **Git** - For cloning and version control

## Running the Application

### Quick Start (Recommended)

The easiest way to get started is using the provided startup script:

```bash
# Make the script executable (first time only)
chmod +x start.sh

# Start all services
./start.sh
```

The startup script will:
1. Validate Docker Compose is installed
2. Start Ollama and backend services
3. Pull the llama3.2:latest model automatically
4. Wait for services to be healthy
5. Display service URLs

**Services will be available at:**
- Backend API: http://localhost:3000
- Ollama API: http://localhost:11434

### Manual Setup

If you prefer to run services manually:

#### Option 1: Docker Compose

```bash
# Start services in detached mode
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

#### Option 2: Local Development

```bash
# Terminal 1: Start Ollama
brew install ollama
ollama pull llama3.2:latest
ollama serve

# Terminal 2: Install and start backend
cd backend
npm install
npm run dev        # Starts on port 3000 with hot reload
```

### Verify Installation

Check that services are running:

```bash
# Backend health check
curl http://localhost:3000/health
# Expected: {"status":"ok"}

# Ollama health check
curl http://localhost:11434/api/tags
# Expected: JSON list of installed models
```

## Running Tests

The project includes two testing frameworks with comprehensive coverage.

### TypeScript Tests

```bash
# Run all tests
npm test --workspace=ts-test

# Run specific test types
npm run test:unit --workspace=ts-test           # Unit tests
npm run test:integration --workspace=ts-test    # Integration tests
npm run test:component --workspace=ts-test      # Component tests
npm run test:e2e --workspace=ts-test           # End-to-end tests
npm run test:regression --workspace=ts-test     # Regression tests

# Run with coverage
npm run test:coverage --workspace=ts-test

# Watch mode for development
npm run test:watch --workspace=ts-test
```

### Python Tests

```bash
# Setup Python environment (first time only)
cd py-test
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -e .

# Run all tests
pytest tests/ -v

# Run with coverage
pytest tests/ -v --cov=src

# Run specific test files
pytest tests/unit/test_text_similarity.py -v
```

### Backend Tests

```bash
# Run backend unit tests
npm test --workspace=backend

# Type checking
npm run type-check --workspace=backend
```

## Configuration

### Environment Variables

The backend uses environment variables for configuration. Default values are provided, but you can customize them:

**Backend Configuration** (`backend/.env`):
```bash
# Server Configuration
PORT=3000
NODE_ENV=development

# LLM Provider (ollama or bedrock)
LLM_PROVIDER=ollama
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=llama3.2:latest
OLLAMA_TIMEOUT_MS=90000

# API Key Authentication
API_KEY_PROVIDER=env
API_KEY=your-api-key-here

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

When running with Docker Compose, use `OLLAMA_HOST=http://ollama:11434` instead.

### AWS Configuration (Optional)

For AWS services (Bedrock, Secrets Manager), configure credentials using one of these methods:

**Option 1: AWS SSO (Recommended for local development)**
```bash
# Configure SSO
aws configure sso --profile <profile-name>

# Login
aws sso login --profile <profile-name>

# Set profile in .env
AWS_PROFILE=<profile-name>
AWS_REGION=us-east-2
```

**Option 2: Environment Variables**
```bash
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-2
```

**Option 3: IAM Roles (Production)**
- No configuration needed - uses ECS task role or EC2 instance profile

**Using AWS Secrets Manager for API Keys:**
```bash
API_KEY_PROVIDER=secrets-manager
API_KEYS_SECRET_NAME=your-secret-name
AWS_REGION=us-east-2
```

## Development Workflow

### Working with the Monorepo

The project uses npm workspaces for monorepo management:

```bash
# Install all dependencies
npm install

# Run commands for specific workspaces
npm run dev --workspace=backend
npm test --workspace=ts-test

# Add dependencies to workspaces
npm install <package> --workspace=backend
npm install <package> --workspace=ts-test
```

### Hot Reload Development

```bash
# Backend with auto-reload
npm run dev --workspace=backend

# Tests in watch mode
npm run test:watch --workspace=ts-test
```

### Common Commands

```bash
# View Docker logs
docker-compose logs -f

# Restart a specific service
docker-compose restart backend

# Stop all services
docker-compose down

# Rebuild containers
docker-compose up -d --build
```

## Troubleshooting

### Ollama Model Not Found

If you see errors about the model not being found:

```bash
# Pull the model manually
docker exec -it llm-probe-ollama ollama pull llama3.2:latest

# Or if running locally
ollama pull llama3.2:latest
```

### Port Conflicts

If ports 3000 or 11434 are already in use:

```bash
# Check what's using the ports
lsof -i :3000
lsof -i :11434

# Kill the process or change ports in docker-compose.yml
```

### Docker Issues

```bash
# Clean up Docker resources
docker-compose down -v
docker system prune

# Restart Docker daemon
# On Mac: Restart Docker Desktop
```

### Test Failures

If tests are failing:

1. Ensure services are running: `docker-compose ps`
2. Check service health: `curl http://localhost:3000/health`
3. Verify Ollama has the model: `curl http://localhost:11434/api/tags`
4. Check logs: `docker-compose logs backend`

## Next Steps

- Review the [Architecture](architecture.md) to understand the system design
- Explore the [Testing Strategy](testing-strategy.md) to learn about different test types
- Check the [Tech Stack](tech-stack.md) for detailed technology information

## Additional Resources

- [Golden Dataset](../golden-dataset/README.md) - Reference test data
- [TypeScript Testing Framework](../ts-test/README.md) - TS implementation details
- [Python Testing Framework](../py-test/README.md) - Python implementation details
- [Infrastructure](../infrastructure/README.md) - AWS deployment guide
