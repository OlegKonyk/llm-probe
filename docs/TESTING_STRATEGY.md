# Testing Strategy

## The LLM Testing Challenge

Traditional software testing relies on **deterministic assertions**:
```typescript
// Traditional test
expect(add(2, 2)).toBe(4); // ✓ Always passes
```

LLM testing requires **probabilistic validation**:
```typescript
// LLM test - wrong approach
expect(llm.summarize(text)).toBe("exact summary"); // ✗ Will fail randomly

// LLM test - correct approach
const similarity = semanticSimilarity(
  llm.summarize(text),
  goldenSummary
);
expect(similarity).toBeGreaterThan(0.85); // ✓ Allows variance
```

## Our Testing Pyramid

```
         ┌─────────────┐
         │     E2E     │  ← Few, critical paths
         │   (Manual)  │
         └─────────────┘
              ▲
         ┌─────────────┐
         │  Security   │  ← Prompt injection, PII
         │    Tests    │
         └─────────────┘
              ▲
         ┌─────────────┐
         │   Chaos     │  ← Timeouts, failures
         │   Tests     │
         └─────────────┘
              ▲
         ┌─────────────┐
         │ Regression  │  ← Golden dataset
         │   Tests     │
         └─────────────┘
              ▲
         ┌─────────────┐
         │ Component   │  ← Quality metrics
         │   Tests     │
         └─────────────┘
              ▲
         ┌─────────────┐
         │Integration  │  ← API contracts
         │   Tests     │
         └─────────────┘
              ▲
         ┌─────────────┐
         │    Unit     │  ← Most tests here
         │   Tests     │
         └─────────────┘
```

## Test Types We Implement

### 1. Unit Tests
**What**: Test deterministic parts (prompt building, parsing, validation)
**When**: Always, before every commit
**Tools**: Jest + ts-jest
**Example**: Ensure prompt includes required fields

### 2. Integration Tests
**What**: Test API contract and infrastructure
**When**: Before deployment
**Tools**: Jest + API client
**Example**: Validate request/response schema

### 3. Component Tests
**What**: Test LLM output quality with semantic validation
**When**: On golden dataset changes
**Tools**: Semantic similarity, BLEU/ROUGE
**Example**: Summary should be 80%+ similar to reference

### 4. Regression Tests
**What**: Prevent quality degradation over time
**When**: Nightly, before releases
**Tools**: Golden dataset + similarity metrics
**Example**: 95% of golden tests must pass

### 5. Property-Based Tests
**What**: Test invariants that always hold
**When**: Continuous
**Tools**: Fast-check (like Hypothesis)
**Example**: Summary always shorter than input

### 6. Chaos Tests
**What**: Test resilience to failures
**When**: Weekly, stress testing
**Tools**: Custom failure injection
**Example**: Handle timeout gracefully

### 7. Security Tests
**What**: Test against malicious inputs
**When**: Before every release
**Tools**: Custom attack vectors
**Example**: Prevent prompt injection

### 8. Performance Tests
**What**: Track latency and cost
**When**: Continuous monitoring
**Tools**: Custom metrics + DataDog
**Example**: p95 latency < 2 seconds

## Evaluation Metrics

### Semantic Similarity (Primary)
```typescript
const similarity = cosineSimilarity(
  embed(generated),
  embed(reference)
);
// Target: 0.80 - 0.90 for summaries
```

### BLEU/ROUGE (Supplementary)
```typescript
const rouge = calculateRouge(generated, reference);
// Target: ROUGE-L > 0.40
```

### Structural Validation
```typescript
expect(summary.length).toBeLessThan(maxWords * 6);
expect(summary).toContain(requiredKeywords);
```

### LLM-as-Judge (Human-like)
```typescript
const score = await judgeQuality(summary, criteria);
// Target: 7/10 or higher
```

## Golden Dataset Strategy

1. **Start Small**: 10-20 high-quality examples
2. **Cover Categories**: Password resets, billing, product issues
3. **Include Edge Cases**: Long calls, multiple issues, unclear requests
4. **Human Review**: Each reference summary written by human
5. **Continuous Expansion**: Add production failures to dataset

## Success Criteria

### Quality Targets
- 85%+ semantic similarity to reference summaries
- 95%+ of golden tests passing
- < 5% hallucination rate
- 100% structural validation pass

### Performance Targets
- p95 latency < 2 seconds
- p99 latency < 5 seconds
- Average cost < $0.05 per summary
- 99.9% API availability

### Security Targets
- 0% PII leakage in summaries
- 100% prompt injection attempts blocked
- All inputs sanitized and validated

## Testing Workflow

```bash
# Development cycle
npm run test:watch            # Unit tests running
git commit                    # Triggers pre-commit unit tests

# Before PR
npm run test:integration      # API contract tests
npm run test:component        # Quality validation

# Before merge
npm run test:regression       # Golden dataset
npm run test:security         # Security scans

# Post-deployment
npm run test:performance      # Load testing
# Monitor production metrics  # Continuous validation
```

## Key Principles

1. **Test deterministic parts normally** - Use exact assertions for parsing, validation
2. **Test LLM outputs probabilistically** - Use similarity thresholds, not exact match
3. **Run multiple iterations** - LLMs are non-deterministic, need statistical validation
4. **Monitor in production** - Test environment ≠ production reality
5. **Maintain golden dataset** - Your most valuable testing asset
6. **Think in percentiles** - p95/p99 more meaningful than averages
7. **Fail fast on structure** - If structure is wrong, don't bother with quality metrics

## Learning Resources

- See `/context/LLM_Testing_Technical_Deep_Dive.md` for comprehensive reference
- See individual test files for implementation examples
- See `/golden-dataset/` for reference test cases
