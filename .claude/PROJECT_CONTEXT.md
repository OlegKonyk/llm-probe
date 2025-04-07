# Claude AI Assistant Project Context

## Project Overview
LLM testing framework with backend API service for call summarization.

## Coding Style Preferences

### Comments
- **Minimize comments** - code should be self-explanatory
- Only add comments when absolutely necessary
- Remove verbose explanatory comments

### TypeScript
- **No `any` types** - always use proper types or interfaces
- Prefer interfaces over type aliases for object shapes
- Use strict TypeScript configuration

### Git Commits
- **No AI mentions** in commit messages (no "Claude", "Generated with", "Co-Authored-By: Claude")
- Keep commit messages concise (not verbose)
- Use conventional commits format: `type: description`

### Testing
- **Don't skip tests** - make them work
- Use parameterized test commands instead of individual npm scripts
- All integration tests should work without mocking

### Documentation
- Keep READMEs minimal and focused
- Only essential information (Quick Start, Running Tests, Configuration)
- No long feature explanations or verbose architecture docs

## Security Standards

### TRUST_PROXY Configuration
- Default to `false` (secure by default)
- Prevents header spoofing attacks
- Requires explicit opt-in for reverse proxy deployments
- Document when to set to `true`

### Rate Limiting
- Always return JSON responses (consistent API contract)
- Test with sequential requests
- Verify header spoofing prevention

### Input Validation
- Reject path traversal attempts
- Validate all environment variables with Zod
- Use proper error handling

## Common Workflows

### Adding Features
1. Plan with TodoWrite tool for complex tasks
2. Write code first, then tests
3. Run tests to verify
4. Keep commits atomic and well-described

### Code Review Feedback
1. Address all BLOCKER and Critical issues immediately
2. Fix issues directly without being overly verbose
3. Always squash commits to 3-4 max before pushing
4. Ensure all feedback is addressed before merging

### CI/CD
- Run unit tests in CI (fast, no external dependencies)
- Integration tests run locally only (require Ollama)
- Type-check everything

## Approved Commands

The user has pre-approved these commands for use without asking:
- `npm install`, `npm test`, `npm run build`
- `git add`, `git commit`, `git push`, `git checkout`, `git rebase`
- `curl` for API testing
- `chmod`, `killall` for process management
- `tree`, `find` for file operations
- Python/pip commands for Python tests

## File Naming Conventions
- kebab-case for files: `token-counter.ts`, `api-key-auth.ts`
- PascalCase for classes: `TokenCounter`, `SecurityDetector`
- camelCase for variables/functions: `countTokens`, `validateInput`

## Test Organization
```
ts-test/tests/
  ├── unit/           # Fast, no external deps
  ├── integration/    # API contracts, needs backend
  ├── component/      # Tests for individual components in isolation
  ├── security/       # Threat detection
  └── performance/    # SLO validation
```

## Dependencies
- **Backend**: Express, Zod, Ollama SDK
- **Testing**: Jest, fast-check (property-based)
- **Required Services**: Ollama (local LLM runtime)

## Environment Variables
- `PORT` - Server port (default: 3000)
- `OLLAMA_HOST` - Ollama URL (default: http://localhost:11434)
- `OLLAMA_MODEL` - Model name (default: llama3.2:latest)
- `TRUST_PROXY` - Proxy trust (default: false)
- `RATE_LIMIT_MAX_REQUESTS` - Rate limit (default: 100)
- `RATE_LIMIT_WINDOW_MS` - Rate limit window (default: 900000)

## Project Structure
```
/backend      - Express API service
/ts-test      - TypeScript testing framework
/py-test      - Python testing framework (future)
/docs         - Documentation
/.github      - CI/CD workflows
```

## Remember
- User values **conciseness over verbosity**
- **Security by default** over convenience
- **Clean code** over commented code
- **Working tests** over skipped tests
- **Consistent style** across all files
