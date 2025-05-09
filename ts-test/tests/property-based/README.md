# Property-Based Testing

Property-based tests validate **invariants** - properties that should ALWAYS hold true regardless of input.

## What is Property-Based Testing?

Instead of writing specific test cases:
```typescript
// Traditional
it('should calculate correctly', () => {
  expect(add(2, 3)).toBe(5);
  expect(add(10, 20)).toBe(30);
});
```

Property-based tests define properties:
```typescript
// Property-based
it('addition should be commutative', () => {
  fc.assert(
    fc.property(fc.integer(), fc.integer(), (a, b) => {
      return add(a, b) === add(b, a);  // Always true
    })
  );
});
```

The framework (fast-check) automatically generates hundreds of test cases, including edge cases you might not think of.

## Why Property-Based Testing for LLMs?

For LLM systems, certain properties should ALWAYS hold:

### 1. Structural Invariants
- Prompt should always contain the transcript
- Summary should be shorter than input (in most cases)
- Token count should be non-negative

### 2. Consistency Invariants
- Same input → same prompt
- Same options → same structure

### 3. Boundary Invariants
- Length validation is symmetric
- Required terms detection is accurate

## Our Property Tests

### Prompt Builder Invariants
- Transcript always appears in prompt
- System instructions always present
- Custom options correctly applied
- Token counting is consistent

### Quality Invariants
- Summary length constraints
- Required terms preservation
- Validation logic correctness

### Edge Case Discovery
- Special characters handling
- Whitespace patterns
- Numeric content
- Unicode handling

## Running Property Tests

```bash
# Run all property tests
npm test -- property-based

# Run with more iterations for confidence
npm test -- property-based --verbose
```

Each property test runs **100 iterations** by default with randomly generated inputs.

## Example: Finding Edge Cases

Property-based testing automatically found:
- Whitespace handling issues
- Special character edge cases
- Token counting boundary conditions
- Option combination bugs

These would be hard to catch with manual test cases!

## Adding New Property Tests

When adding invariants:

1. **Identify the property**: What should ALWAYS be true?
2. **Define generators**: What inputs to test?
3. **Write the assertion**: Check the property holds
4. **Run many times**: Let fast-check find edge cases

```typescript
it('should have [property]', () => {
  fc.assert(
    fc.property(
      fc.[generator](),    // Input generator
      (input) => {
        // Your code
        return [property];  // Boolean: must be true
      }
    ),
    { numRuns: 100 }      // Run 100 times
  );
});
```

## Benefits for LLM Testing

1. **Finds edge cases**: Automatically discovers unusual inputs
2. **Validates invariants**: Ensures properties always hold
3. **Regression prevention**: Properties documented as tests
4. **Confidence**: 100+ test cases per property

## Example Properties We Test

```typescript
// ✓ Prompt always contains transcript
fc.property(fc.string(), transcript =>
  buildPrompt(transcript).includes(transcript)
);

// ✓ Token count is non-negative
fc.property(fc.string(), text =>
  getTokenCount(text) >= 0
);

// ✓ Longer text → more tokens
fc.property(fc.string(), fc.string(), (t1, t2) =>
  t1.length > t2.length ? getTokenCount(t1) >= getTokenCount(t2) : true
);
```

## Further Reading

- [fast-check documentation](https://github.com/dubzzz/fast-check)
- [Property-Based Testing in Practice](https://hypothesis.works/)
- [QuickCheck (original implementation)](https://hackage.haskell.org/package/QuickCheck)
