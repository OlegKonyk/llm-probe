/**
 * Summary Evaluator
 *
 * Comprehensive quality assessment for LLM-generated summaries.
 * Combines multiple evaluation metrics and validation rules to determine
 * if a summary meets quality standards.
 *
 * Key Responsibilities:
 * - Semantic similarity evaluation (composite similarity)
 * - BLEU score calculation (n-gram precision)
 * - Length validation (word count bounds)
 * - Required terms coverage (keyword presence)
 * - Consistency testing (variance across multiple runs)
 * - Detailed reporting (pass/fail with explanations)
 *
 * Architecture:
 * This is the main evaluation orchestrator that:
 * 1. Delegates to text-similarity.ts for metric calculations
 * 2. Applies test case thresholds to determine pass/fail
 * 3. Aggregates results into structured reports
 *
 * Used By:
 * - Component tests: Quality validation for specific test cases
 * - Regression tests: Continuous quality monitoring
 * - Integration tests: End-to-end quality verification
 * - validate-quality.ts: Manual quality checks
 */

import {
  compositeSimilarity,
  containsRequiredTerms,
  validateLength,
  bleuScore,
} from '../metrics/text-similarity.js';
import type { GoldenTestCase } from '../utils/golden-dataset.js';

/**
 * Evaluation Result Interface
 *
 * Structured output from evaluating a summary against a golden test case.
 * Contains all metrics and validation results needed for quality assessment.
 *
 * Fields:
 * - passed: Overall pass/fail (true if all checks pass)
 * - similarity: Composite similarity score (0.0-1.0)
 * - bleu: BLEU score for n-gram precision (0.0-1.0)
 * - lengthCheck: Word count validation result
 * - requiredTerms: Keyword coverage validation
 * - failures: Array of failure messages (empty if all pass)
 */
export interface EvaluationResult {
  passed: boolean;
  similarity: number;
  bleu: number;
  lengthCheck: {
    passed: boolean;
    wordCount: number;
  };
  requiredTerms: {
    passed: boolean;
    coverage: number;
    missing: string[];
  };
  failures: string[];
}

export class SummaryEvaluator {
  /**
   * Evaluate Summary Quality
   *
   * Performs comprehensive quality assessment of a generated summary
   * against a golden test case with defined thresholds.
   *
   * Evaluation Steps:
   * 1. Calculate composite similarity (cosine + Jaccard + overlap)
   * 2. Check similarity meets threshold (typically 0.80+)
   * 3. Calculate BLEU score (for reference, no threshold)
   * 4. Validate word count within bounds
   * 5. Check all required terms are present
   * 6. Aggregate failures into pass/fail result
   *
   * Pass Criteria (ALL must be true):
   * - Similarity >= min_semantic_similarity threshold
   * - Word count in [min_length_words, max_length_words] range
   * - All required_terms present in summary
   *
   * @param summary - The generated summary to evaluate
   * @param testCase - Golden test case with reference summary and thresholds
   * @returns Evaluation result with all metrics and pass/fail status
   *
   * @example
   * const evaluator = new SummaryEvaluator();
   * const result = evaluator.evaluate(
   *   "Customer reset password successfully",
   *   goldenTestCase
   * );
   * if (!result.passed) {
   *   console.log("Failures:", result.failures);
   * }
   */
  evaluate(summary: string, testCase: GoldenTestCase): EvaluationResult {
    const failures: string[] = [];

    // Step 1: Calculate semantic similarity using composite metric
    // This is the PRIMARY quality indicator
    const similarity = compositeSimilarity(
      summary,
      testCase.golden_summary
    );

    // Check if similarity meets the threshold (typically 0.80)
    if (similarity < testCase.thresholds.min_semantic_similarity) {
      failures.push(
        `Similarity ${similarity.toFixed(
          2
        )} below threshold ${testCase.thresholds.min_semantic_similarity.toFixed(2)}`
      );
    }

    // Step 2: Calculate BLEU score for n-gram precision
    // This is informational; no pass/fail threshold
    const bleu = bleuScore(summary, testCase.golden_summary);

    // Step 3: Validate word count is within bounds
    const lengthCheck = validateLength(
      summary,
      testCase.thresholds.min_length_words,
      testCase.thresholds.max_length_words
    );

    if (!lengthCheck.passed) {
      failures.push(
        `Length ${lengthCheck.wordCount} words outside range [${testCase.thresholds.min_length_words}, ${testCase.thresholds.max_length_words}]`
      );
    }

    // Step 4: Check all required keywords are present
    const requiredTerms = containsRequiredTerms(
      summary,
      testCase.thresholds.required_terms
    );

    if (!requiredTerms.passed) {
      failures.push(
        `Missing required terms: ${requiredTerms.missing.join(', ')}`
      );
    }

    // Step 5: Return aggregated result
    // passed = true only if ALL checks passed (failures array is empty)
    return {
      passed: failures.length === 0,
      similarity,
      bleu,
      lengthCheck,
      requiredTerms,
      failures,
    };
  }

  /**
   * Evaluate Consistency Across Multiple Summaries
   *
   * LLMs are non-deterministic, so the same input can produce different outputs.
   * This method measures how consistent those outputs are with each other.
   *
   * Use Case:
   * Generate the same summary 5-10 times and measure variance. High variance
   * indicates unstable outputs that may confuse users or fail regression tests.
   *
   * Metrics Calculated:
   * - meanSimilarity: Average pairwise similarity (higher = more consistent)
   * - stdDeviation: Standard deviation of similarities (lower = more consistent)
   * - maxVariance: Largest deviation from mean (lower = more consistent)
   *
   * Typical Thresholds:
   * - Good: meanSimilarity > 0.80, stdDeviation < 0.10
   * - Acceptable: meanSimilarity > 0.70, stdDeviation < 0.15
   * - Poor: meanSimilarity < 0.70, stdDeviation > 0.15
   *
   * @param summaries - Array of summaries generated from the same input
   * @returns Consistency metrics (mean, std dev, max variance)
   *
   * @example
   * const summaries = [];
   * for (let i = 0; i < 5; i++) {
   *   summaries.push(await generateSummary(transcript));
   * }
   * const consistency = evaluator.evaluateConsistency(summaries);
   * // { meanSimilarity: 0.85, stdDeviation: 0.08, maxVariance: 0.12 }
   */
  evaluateConsistency(summaries: string[]): {
    meanSimilarity: number;
    stdDeviation: number;
    maxVariance: number;
  } {
    // Edge case: need at least 2 summaries to compare
    if (summaries.length < 2) {
      return { meanSimilarity: 1.0, stdDeviation: 0, maxVariance: 0 };
    }

    // Calculate pairwise similarities between all summary pairs
    // For n summaries, this gives n*(n-1)/2 comparisons
    const similarities: number[] = [];
    for (let i = 0; i < summaries.length; i++) {
      for (let j = i + 1; j < summaries.length; j++) {
        similarities.push(compositeSimilarity(summaries[i], summaries[j]));
      }
    }

    // Defensive check: ensure we have similarities (should be impossible due to length check above)
    if (similarities.length === 0) {
      return { meanSimilarity: 1.0, stdDeviation: 0, maxVariance: 0 };
    }

    // Calculate mean similarity (average of all pairwise comparisons)
    const meanSimilarity =
      similarities.reduce((sum, val) => sum + val, 0) / similarities.length;

    // Calculate variance: average squared deviation from mean
    const variance =
      similarities.reduce((sum, val) => sum + Math.pow(val - meanSimilarity, 2), 0) /
      similarities.length;

    // Standard deviation: square root of variance
    const stdDeviation = Math.sqrt(variance);

    // Max variance: largest deviation from mean (worst-case inconsistency)
    const deviations = similarities.map(s => Math.abs(s - meanSimilarity));
    const maxVariance = deviations.length > 0 ? Math.max(...deviations) : 0;

    return { meanSimilarity, stdDeviation, maxVariance };
  }

  /**
   * Generate Detailed Evaluation Report
   *
   * Creates a human-readable report with all evaluation metrics and results.
   * Useful for debugging failed test cases and understanding quality issues.
   *
   * Report Sections:
   * - Header: Test case ID, category, difficulty
   * - Status: Overall pass/fail
   * - Metrics: Similarity, BLEU, word count, term coverage
   * - Failures: List of specific failures (if any)
   * - Reference: Golden summary for comparison
   * - Generated: Actual generated summary
   *
   * @param summary - The generated summary to evaluate
   * @param testCase - Golden test case with reference summary
   * @returns Formatted text report (multiple lines)
   *
   * @example
   * const report = evaluator.generateReport(generatedSummary, testCase);
   * console.log(report);
   * // Evaluation Report for call_001
   * // ==================================================
   * // Test Case: password_reset (easy)
   * // Status: ❌ FAILED
   * // ...
   */
  generateReport(summary: string, testCase: GoldenTestCase): string {
    // Run full evaluation to get all metrics
    const result = this.evaluate(summary, testCase);

    // Build formatted report
    let report = `Evaluation Report for ${testCase.id}\n`;
    report += `${'='.repeat(50)}\n\n`;

    // Test case metadata
    report += `Test Case: ${testCase.category} (${testCase.difficulty})\n`;
    report += `Status: ${result.passed ? '✅ PASSED' : '❌ FAILED'}\n\n`;

    // All metrics with thresholds where applicable
    report += `Metrics:\n`;
    report += `  Similarity: ${result.similarity.toFixed(3)} (threshold: ${testCase.thresholds.min_semantic_similarity})\n`;
    report += `  BLEU Score: ${result.bleu.toFixed(3)}\n`;
    report += `  Word Count: ${result.lengthCheck.wordCount} (range: [${testCase.thresholds.min_length_words}, ${testCase.thresholds.max_length_words}])\n`;
    report += `  Required Terms Coverage: ${(result.requiredTerms.coverage * 100).toFixed(0)}%\n`;

    // Detailed failure explanations (if any)
    if (result.failures.length > 0) {
      report += `\nFailures:\n`;
      result.failures.forEach((f, i) => {
        report += `  ${i + 1}. ${f}\n`;
      });
    }

    // Side-by-side comparison
    report += `\nReference Summary:\n`;
    report += `"${testCase.golden_summary}"\n\n`;
    report += `Generated Summary:\n`;
    report += `"${summary}"\n`;

    return report;
  }
}
