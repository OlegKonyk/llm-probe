import {
  compositeSimilarity,
  containsRequiredTerms,
  validateLength,
  bleuScore,
} from '../metrics/text-similarity.js';
import type { GoldenTestCase } from '../utils/golden-dataset.js';
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
  evaluate(summary: string, testCase: GoldenTestCase): EvaluationResult {
    const failures: string[] = [];

    const similarity = compositeSimilarity(
      summary,
      testCase.golden_summary
    );

    if (similarity < testCase.thresholds.min_semantic_similarity) {
      failures.push(
        `Similarity ${similarity.toFixed(
          2
        )} below threshold ${testCase.thresholds.min_semantic_similarity.toFixed(2)}`
      );
    }

    const bleu = bleuScore(summary, testCase.golden_summary);

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

    const requiredTerms = containsRequiredTerms(
      summary,
      testCase.thresholds.required_terms
    );

    if (!requiredTerms.passed) {
      failures.push(
        `Missing required terms: ${requiredTerms.missing.join(', ')}`
      );
    }

    return {
      passed: failures.length === 0,
      similarity,
      bleu,
      lengthCheck,
      requiredTerms,
      failures,
    };
  }

  evaluateConsistency(summaries: string[]): {
    meanSimilarity: number;
    stdDeviation: number;
    maxDeviation: number;
  } {
    if (summaries.length < 2) {
      return {
        meanSimilarity: summaries.length === 1 ? 1.0 : 0.0,
        stdDeviation: 0,
        maxDeviation: 0
      };
    }

    const similarities: number[] = [];
    for (let i = 0; i < summaries.length; i++) {
      for (let j = i + 1; j < summaries.length; j++) {
        similarities.push(compositeSimilarity(summaries[i], summaries[j]));
      }
    }

    if (similarities.length === 0) {
      return { meanSimilarity: 1.0, stdDeviation: 0, maxDeviation: 0 };
    }

    const meanSimilarity =
      similarities.reduce((sum, val) => sum + val, 0) / similarities.length;

    const variance =
      similarities.reduce((sum, val) => sum + Math.pow(val - meanSimilarity, 2), 0) /
      similarities.length;

    const stdDeviation = Math.sqrt(variance);

    const deviations = similarities.map(s => Math.abs(s - meanSimilarity));
    const maxDeviation = deviations.length > 0 ? Math.max(...deviations) : 0;

    return { meanSimilarity, stdDeviation, maxDeviation };
  }

  generateReport(summary: string, testCase: GoldenTestCase): string {
    const result = this.evaluate(summary, testCase);

    let report = `Evaluation Report for ${testCase.id}\n`;
    report += `${'='.repeat(50)}\n\n`;

    report += `Test Case: ${testCase.category} (${testCase.difficulty})\n`;
    report += `Status: ${result.passed ? '✅ PASSED' : '❌ FAILED'}\n\n`;

    report += `Metrics:\n`;
    report += `  Similarity: ${result.similarity.toFixed(3)} (threshold: ${testCase.thresholds.min_semantic_similarity})\n`;
    report += `  BLEU Score: ${result.bleu.toFixed(3)}\n`;
    report += `  Word Count: ${result.lengthCheck.wordCount} (range: [${testCase.thresholds.min_length_words}, ${testCase.thresholds.max_length_words}])\n`;
    report += `  Required Terms Coverage: ${(result.requiredTerms.coverage * 100).toFixed(0)}%\n`;

    if (result.failures.length > 0) {
      report += `\nFailures:\n`;
      result.failures.forEach((f, i) => {
        report += `  ${i + 1}. ${f}\n`;
      });
    }

    report += `\nReference Summary:\n`;
    report += `"${testCase.golden_summary}"\n\n`;
    report += `Generated Summary:\n`;
    report += `"${summary}"\n`;

    return report;
  }
}
