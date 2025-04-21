"""
Summary Evaluator

Comprehensive quality assessment for LLM-generated summaries.
Combines multiple evaluation metrics and validation rules to determine
if a summary meets quality standards.

Key Responsibilities:
- Semantic similarity evaluation (composite similarity)
- BLEU score calculation (n-gram precision)
- Length validation (word count bounds)
- Required terms coverage (keyword presence)
- Consistency testing (variance across multiple runs)
- Detailed reporting (pass/fail with explanations)

Architecture:
This is the main evaluation orchestrator that:
1. Delegates to text_similarity for metric calculations
2. Applies test case thresholds to determine pass/fail
3. Aggregates results into structured reports

Used By:
- Component tests: Quality validation for specific test cases
- Regression tests: Continuous quality monitoring
- Integration tests: End-to-end quality verification
- Manual quality checks: validate-quality scripts
"""

import math
from dataclasses import dataclass
from typing import Any

from ..metrics.text_similarity import (
    bleu_score,
    composite_similarity,
    contains_required_terms,
    validate_length,
)
from ..utils.golden_dataset import GoldenTestCase


@dataclass
class EvaluationResult:
    """
    Evaluation Result

    Structured output from evaluating a summary against a golden test case.
    Contains all metrics and validation results needed for quality assessment.

    Fields:
    - passed: Overall pass/fail (True if all checks pass)
    - similarity: Composite similarity score (0.0-1.0)
    - bleu: BLEU score for n-gram precision (0.0-1.0)
    - length_check: Word count validation result
    - required_terms: Keyword coverage validation
    - failures: List of failure messages (empty if all pass)
    """
    passed: bool
    similarity: float
    bleu: float
    length_check: dict[str, Any]
    required_terms: dict[str, Any]
    failures: list[str]


class SummaryEvaluator:
    """
    Summary Evaluator

    Performs comprehensive quality assessment of LLM-generated summaries.
    """

    def evaluate(self, summary: str, test_case: GoldenTestCase) -> EvaluationResult:
        """
        Evaluate Summary Quality

        Performs comprehensive quality assessment of a generated summary
        against a golden test case with defined thresholds.

        Evaluation Steps:
        1. Calculate composite similarity (cosine + Jaccard + overlap)
        2. Check similarity meets threshold (typically 0.80+)
        3. Calculate BLEU score (for reference, no threshold)
        4. Validate word count within bounds
        5. Check all required terms are present
        6. Aggregate failures into pass/fail result

        Pass Criteria (ALL must be true):
        - Similarity >= min_semantic_similarity threshold
        - Word count in [min_length_words, max_length_words] range
        - All required_terms present in summary

        Args:
            summary: The generated summary to evaluate
            test_case: Golden test case with reference summary and thresholds

        Returns:
            Evaluation result with all metrics and pass/fail status

        Example:
            >>> evaluator = SummaryEvaluator()
            >>> result = evaluator.evaluate(
            ...     "Customer reset password successfully",
            ...     golden_test_case
            ... )
            >>> if not result.passed:
            ...     print("Failures:", result.failures)
        """
        failures = []

        # Step 1: Calculate semantic similarity using composite metric
        # This is the PRIMARY quality indicator
        similarity = composite_similarity(summary, test_case.golden_summary)

        # Check if similarity meets the threshold (typically 0.80)
        if similarity < test_case.thresholds['min_semantic_similarity']:
            failures.append(
                f"Similarity {similarity:.2f} below threshold "
                f"{test_case.thresholds['min_semantic_similarity']:.2f}"
            )

        # Step 2: Calculate BLEU score for n-gram precision
        # This is informational; no pass/fail threshold
        bleu = bleu_score(summary, test_case.golden_summary)

        # Step 3: Validate word count is within bounds
        length_check = validate_length(
            summary,
            test_case.thresholds['min_length_words'],
            test_case.thresholds['max_length_words']
        )

        if not length_check['passed']:
            failures.append(
                f"Length {length_check['word_count']} words outside range "
                f"[{test_case.thresholds['min_length_words']}, "
                f"{test_case.thresholds['max_length_words']}]"
            )

        # Step 4: Check all required keywords are present
        required_terms = contains_required_terms(
            summary,
            test_case.thresholds['required_terms']
        )

        if not required_terms['passed']:
            failures.append(
                f"Missing required terms: {', '.join(required_terms['missing'])}"
            )

        # Step 5: Return aggregated result
        # passed = True only if ALL checks passed (failures list is empty)
        return EvaluationResult(
            passed=len(failures) == 0,
            similarity=similarity,
            bleu=bleu,
            length_check=length_check,
            required_terms=required_terms,
            failures=failures
        )

    def evaluate_consistency(self, summaries: list[str]) -> dict[str, float]:
        """
        Evaluate Consistency Across Multiple Summaries

        LLMs are non-deterministic, so the same input can produce different outputs.
        This method measures how consistent those outputs are with each other.

        Use Case:
        Generate the same summary 5-10 times and measure variance. High variance
        indicates unstable outputs that may confuse users or fail regression tests.

        Metrics Calculated:
        - mean_similarity: Average pairwise similarity (higher = more consistent)
        - std_deviation: Standard deviation of similarities (lower = more consistent)
        - max_variance: Largest deviation from mean (lower = more consistent)

        Typical Thresholds:
        - Good: mean_similarity > 0.80, std_deviation < 0.10
        - Acceptable: mean_similarity > 0.70, std_deviation < 0.15
        - Poor: mean_similarity < 0.70, std_deviation > 0.15

        Args:
            summaries: List of summaries generated from the same input

        Returns:
            Dictionary with consistency metrics:
                - mean_similarity: Mean pairwise similarity
                - std_deviation: Standard deviation
                - max_variance: Maximum deviation from mean

        Example:
            >>> summaries = []
            >>> for i in range(5):
            ...     summaries.append(generate_summary(transcript))
            >>> consistency = evaluator.evaluate_consistency(summaries)
            >>> # {'mean_similarity': 0.85, 'std_deviation': 0.08, 'max_variance': 0.12}
        """
        # Edge case: need at least 2 summaries to compare
        if len(summaries) < 2:
            return {
                'mean_similarity': 1.0,
                'std_deviation': 0.0,
                'max_variance': 0.0
            }

        # Calculate pairwise similarities between all summary pairs
        # For n summaries, this gives n*(n-1)/2 comparisons
        similarities = []
        for i in range(len(summaries)):
            for j in range(i + 1, len(summaries)):
                similarities.append(composite_similarity(summaries[i], summaries[j]))

        # Calculate mean similarity (average of all pairwise comparisons)
        mean_similarity = sum(similarities) / len(similarities)

        # Calculate variance: average squared deviation from mean
        variance = sum((s - mean_similarity) ** 2 for s in similarities) / len(similarities)

        # Standard deviation: square root of variance
        std_deviation = math.sqrt(variance)

        # Max variance: largest deviation from mean (worst-case inconsistency)
        max_variance = max(abs(s - mean_similarity) for s in similarities)

        return {
            'mean_similarity': mean_similarity,
            'std_deviation': std_deviation,
            'max_variance': max_variance
        }

    def generate_report(self, summary: str, test_case: GoldenTestCase) -> str:
        """
        Generate Detailed Evaluation Report

        Creates a human-readable report with all evaluation metrics and results.
        Useful for debugging failed test cases and understanding quality issues.

        Report Sections:
        - Header: Test case ID, category, difficulty
        - Status: Overall pass/fail
        - Metrics: Similarity, BLEU, word count, term coverage
        - Failures: List of specific failures (if any)
        - Reference: Golden summary for comparison
        - Generated: Actual generated summary

        Args:
            summary: The generated summary to evaluate
            test_case: Golden test case with reference summary

        Returns:
            Formatted text report (multiple lines)

        Example:
            >>> report = evaluator.generate_report(generated_summary, test_case)
            >>> print(report)
            Evaluation Report for call_001
            ==================================================
            Test Case: password_reset (easy)
            Status: ❌ FAILED
            ...
        """
        # Run full evaluation to get all metrics
        result = self.evaluate(summary, test_case)

        # Build formatted report
        report = f"Evaluation Report for {test_case.id}\n"
        report += "=" * 50 + "\n\n"

        # Test case metadata
        report += f"Test Case: {test_case.category} ({test_case.difficulty})\n"
        report += f"Status: {'✅ PASSED' if result.passed else '❌ FAILED'}\n\n"

        # All metrics with thresholds where applicable
        report += "Metrics:\n"
        min_sim = test_case.thresholds['min_semantic_similarity']
        report += f"  Similarity: {result.similarity:.3f} (threshold: {min_sim})\n"
        report += f"  BLEU Score: {result.bleu:.3f}\n"
        min_len = test_case.thresholds['min_length_words']
        max_len = test_case.thresholds['max_length_words']
        report += (
            f"  Word Count: {result.length_check['word_count']} "
            f"(range: [{min_len}, {max_len}])\n"
        )
        coverage = result.required_terms['coverage'] * 100
        report += f"  Required Terms Coverage: {coverage:.0f}%\n"

        # Detailed failure explanations (if any)
        if len(result.failures) > 0:
            report += "\nFailures:\n"
            for i, failure in enumerate(result.failures, 1):
                report += f"  {i}. {failure}\n"

        # Side-by-side comparison
        report += "\nReference Summary:\n"
        report += f'"{test_case.golden_summary}"\n\n'
        report += "Generated Summary:\n"
        report += f'"{summary}"\n'

        return report
