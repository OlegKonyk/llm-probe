# Golden Dataset

Curated test cases for regression testing and quality validation.

## Structure

Each test case includes:
- `id`: Unique identifier
- `transcript`: Full call transcript
- `golden_summary`: Human-written reference summary
- `metadata`: Additional context (sentiment, category, etc.)
- `thresholds`: Minimum quality scores required

## Categories

1. **Password Reset**: Common IT support issue
2. **Billing Inquiry**: Financial questions and disputes
3. **Product Issue**: Defective product or service complaints
4. **Account Update**: Profile changes, contact info updates
5. **General Inquiry**: Information requests

## Usage

These test cases are used for:
- Regression testing: Ensure quality doesn't degrade
- Baseline establishment: Set quality benchmarks
- Component testing: Validate semantic similarity
- Learning: Examples of good summaries

## Adding New Cases

When adding test cases:
1. Use realistic, anonymized transcripts
2. Write clear, concise reference summaries
3. Include edge cases and challenging scenarios
4. Set appropriate quality thresholds
5. Document the category and difficulty level
