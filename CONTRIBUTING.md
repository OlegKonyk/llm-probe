# Contributing to LLM Testing Principles

Thank you for your interest in contributing to this project! This repository serves as an educational resource demonstrating best practices for testing LLM applications.

## Table of Contents

1. [Code of Conduct](#code-of-conduct)
2. [Getting Started](#getting-started)
3. [Development Setup](#development-setup)
4. [Project Structure](#project-structure)
5. [Coding Standards](#coding-standards)
6. [Testing Guidelines](#testing-guidelines)
7. [Pull Request Process](#pull-request-process)
8. [Questions and Support](#questions-and-support)

## Code of Conduct

This project follows a code of conduct that we expect all contributors to adhere to:

- Be respectful and inclusive
- Focus on constructive feedback
- Assume good intentions
- Help create a welcoming learning environment

## Getting Started

This is primarily an educational/reference implementation. Contributions that improve clarity, fix bugs, or add educational value are welcome.

### Types of Contributions

- 🐛 **Bug Fixes**: Fix issues in code or documentation
- 📚 **Documentation**: Improve explanations, add examples
- 🧪 **Tests**: Add or improve test coverage
- ✨ **Features**: Enhance the framework (discuss first)
- 🎓 **Educational**: Improve learning materials

## Development Setup

### Prerequisites

- Node.js 18+ and npm
- Python 3.9+ (for Python framework)
- Ollama (for local LLM testing)
- Git

### Initial Setup

```bash
# 1. Fork and clone the repository
git clone https://github.com/YOUR_USERNAME/llm-principals.git
cd llm-principals

# 2. Install Ollama
brew install ollama  # macOS
# or visit https://ollama.ai for other platforms

# 3. Pull the LLM model
ollama pull llama3.2:latest

# 4. Start Ollama (in separate terminal)
ollama serve

# 5. Install dependencies - Backend
cd backend
npm install

# 6. Install dependencies - Testing Framework
cd ../testing-framework
npm install

# 7. Install dependencies - Python Framework
cd ../python-framework
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### Running the Application

```bash
# Terminal 1: Ollama
ollama serve

# Terminal 2: Backend
cd backend
npm run dev

# Terminal 3: Run tests
cd testing-framework
npm test
```

## Project Structure

```
llm-principals/
├── README.md                      # Project overview
├── ARCHITECTURE.md                # Architecture deep dive
├── TESTING_GUIDE.md               # Testing principles
├── CONTRIBUTING.md                # This file
│
├── backend/                       # Express + Ollama service
│   ├── src/
│   │   ├── api/                   # REST endpoints
│   │   ├── services/              # Business logic
│   │   ├── llm/                   # LLM provider abstraction
│   │   ├── auth/                  # API key authentication
│   │   ├── middleware/            # Express middleware
│   │   ├── types/                 # TypeScript types
│   │   └── utils/                 # Utilities (logger)
│   └── package.json
│
├── testing-framework/             # TypeScript testing suite
│   ├── src/
│   │   ├── evaluators/            # Quality assessment
│   │   ├── metrics/               # Similarity algorithms
│   │   ├── security/              # Threat detection
│   │   ├── performance/           # Metrics tracking
│   │   ├── monitoring/            # Regression detection
│   │   └── utils/                 # Utilities
│   ├── tests/                     # 220+ tests
│   └── package.json
│
├── python-framework/              # Python implementation
│   ├── src/                       # Python modules
│   ├── tests/                     # pytest tests
│   └── requirements.txt
│
├── golden-dataset/                # Test data
│   ├── index.json                 # Metadata
│   └── sample-*.json              # Test cases
│
└── docs/                          # Additional documentation
    ├── CODING_STANDARDS.md
    ├── OLLAMA_SETUP.md
    ├── development/               # Historical docs
    └── deployment/                # Deployment guides
```

## Coding Standards

### TypeScript/JavaScript

- **Strict TypeScript**: Use strict mode, no `any` types
- **Explicit Types**: All function parameters and return types declared
- **JSDoc Comments**: Comprehensive documentation for all public APIs
- **Error Handling**: Use custom error types with proper HTTP status codes
- **Async/Await**: Prefer async/await over callbacks or raw promises

**Example:**
```typescript
/**
 * Evaluates summary quality against golden reference
 *
 * @param summary - Generated summary to evaluate
 * @param testCase - Golden test case with thresholds
 * @returns Evaluation result with pass/fail and metrics
 */
evaluate(summary: string, testCase: GoldenTestCase): EvaluationResult {
  // Implementation...
}
```

### Python

- **Type Hints**: Use type hints for all function signatures
- **Docstrings**: Google-style docstrings for all public functions
- **PEP 8**: Follow Python style guide
- **Error Handling**: Specific exception types

### General Principles

1. **Clean Code**: Functions do one thing, meaningful names
2. **DRY Principle**: Don't repeat yourself
3. **SOLID Principles**: Follow object-oriented design principles
4. **Test-Driven**: Write tests for new functionality
5. **Security-First**: Validate all inputs, sanitize outputs

See [docs/CODING_STANDARDS.md](docs/CODING_STANDARDS.md) for detailed guidelines.

## Testing Guidelines

### Running Tests

```bash
# TypeScript - All tests
cd testing-framework
npm test

# TypeScript - Specific test suite
npm test -- tests/unit/text-similarity.test.ts

# TypeScript - Watch mode
npm run test:watch

# Python - All tests
cd python-framework
export PYTHONPATH=$PYTHONPATH:$(pwd)
pytest tests/ -v
```

### Test Requirements

- All new features must include tests
- Maintain 100% test pass rate
- Tests must be deterministic (use mocks for external services when appropriate)
- Property-based tests for algorithms (use fast-check or Hypothesis)

### Test Types

1. **Unit Tests**: Test individual functions/modules
2. **Component Tests**: Test complete components
3. **Integration Tests**: Test API contracts
4. **Regression Tests**: Test against golden dataset
5. **Property-Based Tests**: Test invariants
6. **Security Tests**: Test threat detection
7. **Performance Tests**: Test SLOs
8. **E2E Tests**: Test with real LLM

## Pull Request Process

### Before Submitting

1. ✅ **Run all tests**: Ensure 100% pass rate
2. ✅ **TypeScript compilation**: No compilation errors
3. ✅ **Code style**: Follow coding standards
4. ✅ **Documentation**: Update relevant docs
5. ✅ **Commit messages**: Clear, descriptive messages

### Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `test`: Adding or updating tests
- `refactor`: Code change that neither fixes a bug nor adds a feature
- `chore`: Changes to build process or auxiliary tools

**Example:**
```
feat(metrics): add Levenshtein distance similarity metric

Implement Levenshtein distance as an additional similarity metric.
Useful for comparing summaries with different word ordering.

Closes #42
```

### PR Checklist

- [ ] All tests pass (`npm test`)
- [ ] TypeScript compiles without errors
- [ ] New tests added for new functionality
- [ ] Documentation updated
- [ ] Code follows style guidelines
- [ ] Commit messages are clear
- [ ] PR description explains changes

### PR Description Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Documentation update
- [ ] Test improvement

## Testing
How was this tested?

## Screenshots (if applicable)
Add screenshots for UI changes

## Checklist
- [ ] Tests pass
- [ ] Code follows style guide
- [ ] Documentation updated
```

## Development Workflow

### Branching Strategy

- `main`: Stable, production-ready code
- `develop`: Integration branch for features
- `feature/*`: Feature branches
- `bugfix/*`: Bug fix branches

### Workflow

```bash
# 1. Create feature branch
git checkout -b feature/your-feature-name

# 2. Make changes and commit
git add .
git commit -m "feat(scope): description"

# 3. Push to your fork
git push origin feature/your-feature-name

# 4. Open pull request on GitHub
# - Target: main or develop branch
# - Fill in PR template
# - Request review

# 5. Address feedback
# - Make requested changes
# - Push updates to same branch

# 6. After approval and CI passes
# - PR will be merged
# - Delete feature branch
```

## Architecture Decisions

When proposing significant changes:

1. **Open an Issue**: Discuss the change before implementing
2. **Explain Rationale**: Why is this change needed?
3. **Consider Alternatives**: What other approaches were considered?
4. **Educational Value**: Does this help learners?
5. **Breaking Changes**: Avoid if possible, document clearly if necessary

## Questions and Support

- 📖 **Documentation**: Read [TESTING_GUIDE.md](TESTING_GUIDE.md) and [ARCHITECTURE.md](ARCHITECTURE.md)
- 💬 **Questions**: Open a GitHub Discussion
- 🐛 **Bugs**: Open a GitHub Issue with reproduction steps
- ✨ **Feature Requests**: Open a GitHub Issue with use case explanation

## Recognition

Contributors will be recognized in:
- GitHub contributors page
- Project README (for significant contributions)
- Release notes

---

## Additional Resources

- [ARCHITECTURE.md](ARCHITECTURE.md) - System design
- [TESTING_GUIDE.md](TESTING_GUIDE.md) - Testing principles
- [docs/CODING_STANDARDS.md](docs/CODING_STANDARDS.md) - Code style guide
- [docs/OLLAMA_SETUP.md](docs/OLLAMA_SETUP.md) - Ollama configuration

Thank you for contributing to this educational resource! 🎓
