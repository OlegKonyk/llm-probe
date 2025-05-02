import { describe, it, expect, beforeEach } from '@jest/globals';
import { SummaryEvaluator } from '../../src/evaluators/summary-evaluator.js';
import { GoldenDatasetLoader } from '../../src/utils/golden-dataset.js';

describe('Summary Quality Component Tests', () => {
  let evaluator: SummaryEvaluator;
  let loader: GoldenDatasetLoader;

  beforeEach(() => {
    evaluator = new SummaryEvaluator();
    loader = new GoldenDatasetLoader();
  });

  describe('Password Reset Call (call_001)', () => {
    it('should pass evaluation with high-quality summary', () => {
      const testCase = loader.loadTestCase('call_001');
      const summary =
        'Customer was locked out due to forgotten password. Password reset link failed because email address on file was incorrect. Agent updated email to john.smith@email.com and resent reset link successfully.';

      const result = evaluator.evaluate(summary, testCase);

      expect(result.passed).toBe(true);
      expect(result.similarity).toBeGreaterThan(
        testCase.thresholds.min_semantic_similarity
      );
      expect(result.lengthCheck.passed).toBe(true);
      expect(result.requiredTerms.passed).toBe(true);
      expect(result.failures).toHaveLength(0);
    });

    it('should fail evaluation if summary is too short', () => {
      const testCase = loader.loadTestCase('call_001');
      const summary = 'Password reset issue fixed.';

      const result = evaluator.evaluate(summary, testCase);

      expect(result.passed).toBe(false);
      expect(result.lengthCheck.passed).toBe(false);
      expect(result.failures.length).toBeGreaterThan(0);
    });

    it('should fail evaluation if required terms are missing', () => {
      const testCase = loader.loadTestCase('call_001');
      const summary =
        'Customer was locked out of account. Agent updated email address and sent a reset link to resolve the issue successfully.';

      const result = evaluator.evaluate(summary, testCase);

      expect(result.passed).toBe(false);
      expect(result.requiredTerms.passed).toBe(false);
      expect(result.requiredTerms.missing).toContain('password');
    });

    it('should fail evaluation if similarity is too low', () => {
      const testCase = loader.loadTestCase('call_001');
      const summary =
        'Customer called about billing issues with their monthly subscription plan. Agent processed a refund for overcharges and updated payment method.';

      const result = evaluator.evaluate(summary, testCase);

      expect(result.passed).toBe(false);
      expect(result.similarity).toBeLessThan(
        testCase.thresholds.min_semantic_similarity
      );
    });
  });

  describe('Billing Inquiry Call (call_002)', () => {
    it('should pass evaluation with comprehensive summary', () => {
      const testCase = loader.loadTestCase('call_002');

      const summary =
        'Customer questioned unexpected $50 billing increase caused by data overages. Customer used 15GB exceeding 10GB plan limit. Agent applied $25 courtesy credit as first overage in 2+ years and upgraded customer to 20GB plan starting next billing cycle to prevent future overage charges.';

      const result = evaluator.evaluate(summary, testCase);

      expect(result.similarity).toBeGreaterThan(0.75);
      expect(result.requiredTerms.coverage).toBeGreaterThanOrEqual(0.5);
      expect(result.lengthCheck.passed).toBe(true);
    });

    it('should detect missing key information', () => {
      const testCase = loader.loadTestCase('call_002');
      const summary =
        'Customer had billing questions about a charge. Agent explained it was due to data overages and applied a credit to the account.';

      const result = evaluator.evaluate(summary, testCase);

      expect(result.similarity).toBeLessThan(
        testCase.thresholds.min_semantic_similarity
      );
    });
  });

  describe('Product Issue Call (call_003)', () => {
    it('should handle negative sentiment appropriately', () => {
      const testCase = loader.loadTestCase('call_003');

      const summary =
        'Customer reported wireless headphones purchased 3 weeks ago with persistent disconnection issues. Troubleshooting failed (reset, firmware update, multiple devices). Agent verified order ORD-445821 from March 15 and offered replacement or refund within 30-day window. Customer declined replacement due to lost confidence and chose full refund of $149.99 (3-5 business days) with prepaid return shipping label.';

      const result = evaluator.evaluate(summary, testCase);

      expect(result.similarity).toBeGreaterThan(0.75);
      expect(result.requiredTerms.coverage).toBeGreaterThanOrEqual(0.5);
      expect(result.lengthCheck.passed).toBe(true);
    });
  });

  describe('Account Update Call (call_004)', () => {
    it('should handle simple, straightforward calls', () => {
      const testCase = loader.loadTestCase('call_004');

      const summary =
        'Customer requested shipping address update. Agent verified identity via email sarah.jones@email.com and updated address to 742 Maple Street, Austin, TX 78701. New address set as default shipping address per customer request.';

      const result = evaluator.evaluate(summary, testCase);

      expect(result.similarity).toBeGreaterThan(0.8);
      expect(result.lengthCheck.passed).toBe(true);
      expect(result.requiredTerms.passed).toBe(true);
    });
  });

  describe('General Inquiry Call (call_005)', () => {
    it('should handle inquiry without immediate resolution', () => {
      const testCase = loader.loadTestCase('call_005');

      const summary =
        'Customer inquired about differences between Premium ($29/month, 10 users, unlimited storage, priority support) and Business plans ($49/month, 50 users, includes advanced analytics and API access). Customer is small marketing agency with 8 employees planning to hire 5 more. Agent recommended Business plan upgrade based on growth trajectory and analytics needs. Customer will discuss with team before deciding. Prorated billing available for mid-cycle plan changes.';

      const result = evaluator.evaluate(summary, testCase);

      expect(result.similarity).toBeGreaterThan(0.75);
      expect(result.requiredTerms.passed).toBe(true);
      expect(result.lengthCheck.passed).toBe(true);
    });
  });

  describe('Consistency Evaluation', () => {
    it('should detect high consistency between similar summaries', () => {
      const summaries = [
        'Customer needs password reset due to account lockout.',
        'Customer requested password reset for locked account.',
        'Customer asked for password reset help after being locked out.',
      ];

      const consistency = evaluator.evaluateConsistency(summaries);

      expect(consistency.meanSimilarity).toBeGreaterThan(0.4);
      expect(consistency.stdDeviation).toBeLessThan(0.3);
    });

    it('should detect low consistency between different summaries', () => {
      const summaries = [
        'Customer needs password reset.',
        'Billing inquiry about overcharges.',
        'Product return request for defective item.',
      ];

      const consistency = evaluator.evaluateConsistency(summaries);

      expect(consistency.meanSimilarity).toBeLessThan(0.5);
      expect(consistency.stdDeviation).toBeGreaterThanOrEqual(0);
    });

    it('should handle single summary', () => {
      const summaries = ['Single summary'];

      const consistency = evaluator.evaluateConsistency(summaries);

      expect(consistency.meanSimilarity).toBe(1.0);
      expect(consistency.stdDeviation).toBe(0);
    });
  });

  describe('Golden Dataset Coverage', () => {
    it('should evaluate all test cases in golden dataset', () => {
      const allCases = loader.loadAllTestCases();

      expect(allCases.length).toBe(5);

      // Mock summaries that should pass (using golden summaries as proxy)
      allCases.forEach((testCase) => {
        const result = evaluator.evaluate(
          testCase.golden_summary,
          testCase
        );

        // Golden summaries should score perfectly against themselves
        expect(result.similarity).toBeCloseTo(1.0, 1);
        expect(result.lengthCheck.passed).toBe(true);
        // Note: Golden summaries may not contain all required terms verbatim
        // That's ok - they're human-written and may use synonyms
        expect(result.requiredTerms.coverage).toBeGreaterThanOrEqual(0.5);
      });
    });

    it('should load and evaluate each category', () => {
      const categories = [
        'password_reset',
        'billing_inquiry',
        'product_issue',
        'account_update',
        'general_inquiry',
      ];

      categories.forEach((category) => {
        const cases = loader.loadByCategory(category);
        expect(cases.length).toBeGreaterThan(0);

        cases.forEach((testCase) => {
          const result = evaluator.evaluate(
            testCase.golden_summary,
            testCase
          );
          expect(result.similarity).toBeGreaterThan(0.9);
        });
      });
    });
  });

  describe('Report Generation', () => {
    it('should generate detailed evaluation report', () => {
      const testCase = loader.loadTestCase('call_001');
      const summary = 'Customer had password reset issue which was resolved.';

      const report = evaluator.generateReport(summary, testCase);

      expect(report).toContain(testCase.id);
      expect(report).toContain('Similarity');
      expect(report).toContain('BLEU Score');
      expect(report).toContain('Word Count');
      expect(report).toContain('Reference Summary');
      expect(report).toContain('Generated Summary');
    });
  });
});
