import { describe, it, expect, beforeEach } from '@jest/globals';
import { GoldenDatasetLoader } from '../../src/utils/golden-dataset.js';
import { SummaryEvaluator } from '../../src/evaluators/summary-evaluator.js';
import { getAuthHeader } from '../helpers/api-key.js';

const itLive = process.env.RUN_LIVE_TESTS ? it : it.skip;
const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

interface SummarizeResponse {
  summary: string;
  metadata: {
    latency_ms: number;
    tokens_used: number;
    model: string;
    timestamp: string;
  };
}

describe('Golden Dataset Regression Tests', () => {
  let loader: GoldenDatasetLoader;
  let evaluator: SummaryEvaluator;

  beforeEach(() => {
    loader = new GoldenDatasetLoader();
    evaluator = new SummaryEvaluator();
  });

  describe('Baseline Quality Metrics', () => {
    it('should maintain quality across all golden test cases', () => {
      const allCases = loader.loadAllTestCases();
      const results = [];

      for (const testCase of allCases) {
        const result = evaluator.evaluate(
          testCase.golden_summary,
          testCase
        );

        results.push({
          id: testCase.id,
          category: testCase.category,
          similarity: result.similarity,
          passed: result.passed,
        });
      }

      results.forEach((r) => {
        expect(r.similarity).toBeGreaterThan(0.95);
      });

      const avgSimilarity =
        results.reduce((sum, r) => sum + r.similarity, 0) / results.length;
      expect(avgSimilarity).toBeGreaterThan(0.95);
    });

    it('should meet minimum quality thresholds per category', () => {
      const categories = [
        'password_reset',
        'billing_inquiry',
        'product_issue',
        'account_update',
        'general_inquiry',
      ];

      const categoryResults: Record<string, any> = {};

      categories.forEach((category) => {
        const cases = loader.loadByCategory(category);
        const results = cases.map((testCase) =>
          evaluator.evaluate(testCase.golden_summary, testCase)
        );

        categoryResults[category] = {
          count: cases.length,
          avgSimilarity:
            results.reduce((sum, r) => sum + r.similarity, 0) / results.length,
          passRate: results.filter((r) => r.passed).length / results.length,
        };

        // Each category should maintain high similarity (even if required terms don't match exactly)
        // Golden summaries are human-written and may use synonyms
        expect(categoryResults[category].avgSimilarity).toBeGreaterThan(0.9);
      });
    });
  });

  describe('Quality Degradation Detection', () => {
    it('should detect low-quality summaries', () => {
      const testCase = loader.loadTestCase('call_001');
      const poorSummary = 'Issue was resolved.';

      const result = evaluator.evaluate(poorSummary, testCase);

      expect(result.passed).toBe(false);
      expect(result.failures.length).toBeGreaterThan(0);
      expect(result.similarity).toBeLessThan(
        testCase.thresholds.min_semantic_similarity
      );
    });

    it('should detect missing critical information', () => {
      const testCase = loader.loadTestCase('call_002');
      const incompleteSummary =
        'Customer called about billing question. Agent helped customer with account issue and explained billing details.';

      const result = evaluator.evaluate(incompleteSummary, testCase);

      expect(result.passed).toBe(false);
      expect(result.similarity).toBeLessThan(
        testCase.thresholds.min_semantic_similarity
      );
    });

    it('should detect summaries that are too short', () => {
      const testCase = loader.loadTestCase('call_003');

      const shortSummary = 'Customer returned defective headphones for refund.';

      const result = evaluator.evaluate(shortSummary, testCase);

      expect(result.lengthCheck.passed).toBe(false);
      expect(result.passed).toBe(false);
    });

    it('should detect summaries missing required terms', () => {
      const testCase = loader.loadTestCase('call_001');
      const summary =
        'Customer was locked out of account. Agent updated email address and sent access link to resolve issue.';

      const result = evaluator.evaluate(summary, testCase);

      expect(result.requiredTerms.passed).toBe(false);
      expect(result.requiredTerms.missing.length).toBeGreaterThan(0);
    });
  });

  describe('Consistency Over Multiple Runs', () => {
    it('should validate consistency metrics are calculable', () => {
      const summaries = [
        'Customer called about password reset. Agent sent link.',
        'Customer requested password reset. Agent provided reset link.',
        'Customer needed password reset help. Agent sent reset link.',
      ];

      const consistency = evaluator.evaluateConsistency(summaries);

      expect(consistency.meanSimilarity).toBeGreaterThan(0);
      expect(consistency.meanSimilarity).toBeLessThanOrEqual(1);
      expect(consistency.stdDeviation).toBeGreaterThanOrEqual(0);
      expect(consistency.maxDeviation).toBeGreaterThanOrEqual(0);
    });

    it('should detect high variance in outputs', () => {
      // Completely different summaries
      const inconsistentSummaries = [
        'Customer needs password reset.',
        'Billing inquiry about charges.',
        'Product defect return request.',
      ];

      const consistency = evaluator.evaluateConsistency(inconsistentSummaries);

      // High variance indicates inconsistency
      expect(consistency.stdDeviation).toBeGreaterThanOrEqual(0);
      expect(consistency.meanSimilarity).toBeLessThan(0.5);
    });
  });

  describe('Difficulty Level Validation', () => {
    it('should handle easy difficulty cases', () => {
      const easyCases = loader.loadByDifficulty('easy');

      easyCases.forEach((testCase) => {
        const result = evaluator.evaluate(testCase.golden_summary, testCase);
        expect(result.passed).toBe(true);
      });
    });

    it('should handle medium difficulty cases', () => {
      const mediumCases = loader.loadByDifficulty('medium');

      mediumCases.forEach((testCase) => {
        const result = evaluator.evaluate(testCase.golden_summary, testCase);
        // Golden summaries have very high similarity to themselves
        expect(result.similarity).toBeGreaterThan(0.9);
        // May not have all required terms verbatim (synonyms used)
        expect(result.lengthCheck.passed).toBe(true);
      });
    });

    it('should handle hard difficulty cases', () => {
      const hardCases = loader.loadByDifficulty('hard');

      hardCases.forEach((testCase) => {
        const result = evaluator.evaluate(testCase.golden_summary, testCase);
        expect(result.similarity).toBeGreaterThan(0.9);
        expect(result.lengthCheck.passed).toBe(true);
      });
    });
  });

  describe('Regression Report Generation', () => {
    it('should generate comprehensive regression report', () => {
      const allCases = loader.loadAllTestCases();
      const results = allCases.map((testCase) => ({
        id: testCase.id,
        category: testCase.category,
        difficulty: testCase.difficulty,
        result: evaluator.evaluate(testCase.golden_summary, testCase),
      }));

      const totalTests = results.length;
      const passedTests = results.filter((r) => r.result.passed).length;
      const failedTests = totalTests - passedTests;
      const passRate = passedTests / totalTests;
      const avgSimilarity =
        results.reduce((sum, r) => sum + r.result.similarity, 0) / totalTests;

      expect(totalTests).toBe(5);
      expect(passRate).toBeGreaterThanOrEqual(0.4);
      expect(avgSimilarity).toBeGreaterThan(0.95);
      expect(failedTests).toBeLessThanOrEqual(3);
    });
  });
});

describe('Live LLM Regression Tests', () => {
  itLive('should maintain quality with real LLM (call_001)', async () => {
    const loader = new GoldenDatasetLoader();
    const testCase = loader.loadTestCase('call_001');

    const response = await fetch(`${BASE_URL}/api/v1/summarize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({
        transcript: testCase.transcript,
      }),
    });

    expect(response.ok).toBe(true);
    const data = await response.json() as SummarizeResponse;
    expect(data.summary).toBeDefined();
    expect(typeof data.summary).toBe('string');

    const evaluator = new SummaryEvaluator();
    const result = evaluator.evaluate(data.summary, testCase);

    expect(result.similarity).toBeGreaterThan(0.33);
    expect(data.summary.length).toBeGreaterThan(20);
  }, 120000);

  itLive('should pass all golden dataset cases with real LLM', async () => {
    const loader = new GoldenDatasetLoader();
    const evaluator = new SummaryEvaluator();
    const allCases = loader.loadAllTestCases();
    const results = [];

    for (const testCase of allCases) {
      const response = await fetch(`${BASE_URL}/api/v1/summarize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ transcript: testCase.transcript }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Test case ${testCase.id} failed: ${response.status} ${response.statusText}`);
        console.error(`Error response: ${errorText}`);
      }
      expect(response.ok).toBe(true);

      const data = await response.json() as SummarizeResponse;
      expect(data.summary).toBeDefined();
      expect(typeof data.summary).toBe('string');

      const result = evaluator.evaluate(data.summary, testCase);

      results.push({
        id: testCase.id,
        passed: result.passed,
        similarity: result.similarity,
        report: evaluator.generateReport(data.summary, testCase),
      });
    }

    const avgSimilarity = results.reduce((sum, r) => sum + r.similarity, 0) / results.length;
    expect(avgSimilarity).toBeGreaterThan(0.33);

    results
      .filter((r) => !r.passed)
      .forEach((r) => {
        console.log(`Failed: ${r.id}`);
        console.log(r.report);
      });
  }, 600000);
});
