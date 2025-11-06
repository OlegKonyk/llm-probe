import { describe, it, expect, beforeEach } from '@jest/globals';
import { GoldenDatasetLoader } from '../../src/utils/golden-dataset.js';

describe('GoldenDatasetLoader Unit Tests', () => {
  let loader: GoldenDatasetLoader;

  beforeEach(() => {
    loader = new GoldenDatasetLoader();
  });

  describe('loadIndex', () => {
    it('should load the dataset index', () => {
      const index = loader.loadIndex();

      expect(index.dataset_version).toBe('1.0.0');
      expect(index.total_cases).toBe(5);
      expect(index.test_cases).toHaveLength(5);
    });

    it('should have correct category distribution', () => {
      const index = loader.loadIndex();

      expect(index.categories.password_reset).toBe(1);
      expect(index.categories.billing_inquiry).toBe(1);
      expect(index.categories.product_issue).toBe(1);
      expect(index.categories.account_update).toBe(1);
      expect(index.categories.general_inquiry).toBe(1);
    });

    it('should have correct difficulty distribution', () => {
      const index = loader.loadIndex();

      expect(index.difficulty_distribution.easy).toBe(2);
      expect(index.difficulty_distribution.medium).toBe(2);
      expect(index.difficulty_distribution.hard).toBe(1);
    });
  });

  describe('loadTestCase', () => {
    it('should load a specific test case by ID', () => {
      const testCase = loader.loadTestCase('call_001');

      expect(testCase.id).toBe('call_001');
      expect(testCase.category).toBe('password_reset');
      expect(testCase.transcript).toBeDefined();
      expect(testCase.golden_summary).toBeDefined();
    });

    it('should load test case with all required fields', () => {
      const testCase = loader.loadTestCase('call_002');

      expect(testCase.id).toBe('call_002');
      expect(testCase.category).toBe('billing_inquiry');
      expect(testCase.difficulty).toBe('medium');
      expect(testCase.transcript).toBeTruthy();
      expect(testCase.golden_summary).toBeTruthy();
      expect(testCase.metadata).toBeDefined();
      expect(testCase.thresholds).toBeDefined();
    });

    it('should load metadata correctly', () => {
      const testCase = loader.loadTestCase('call_001');

      expect(testCase.metadata.sentiment).toBe('positive');
      expect(testCase.metadata.resolution_status).toBe('resolved');
      expect(Array.isArray(testCase.metadata.key_points)).toBe(true);
      expect(testCase.metadata.key_points.length).toBeGreaterThan(0);
    });

    it('should load thresholds correctly', () => {
      const testCase = loader.loadTestCase('call_001');

      expect(testCase.thresholds.min_semantic_similarity).toBeGreaterThan(0);
      expect(testCase.thresholds.min_length_words).toBeGreaterThan(0);
      expect(testCase.thresholds.max_length_words).toBeGreaterThan(
        testCase.thresholds.min_length_words
      );
      expect(Array.isArray(testCase.thresholds.required_terms)).toBe(true);
    });

    it('should throw error for non-existent test case', () => {
      expect(() => loader.loadTestCase('call_999')).toThrow(
        "Test case 'call_999' not found in index"
      );
    });
  });

  describe('loadAllTestCases', () => {
    it('should load all test cases', () => {
      const allCases = loader.loadAllTestCases();

      expect(allCases).toHaveLength(5);
      expect(allCases.every((tc) => tc.id)).toBe(true);
      expect(allCases.every((tc) => tc.transcript)).toBe(true);
      expect(allCases.every((tc) => tc.golden_summary)).toBe(true);
    });

    it('should load distinct test cases', () => {
      const allCases = loader.loadAllTestCases();
      const ids = allCases.map((tc) => tc.id);
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(allCases.length);
    });
  });

  describe('loadByCategory', () => {
    it('should load test cases by category', () => {
      const passwordResetCases = loader.loadByCategory('password_reset');

      expect(passwordResetCases).toHaveLength(1);
      expect(passwordResetCases[0].category).toBe('password_reset');
    });

    it('should return empty array for non-existent category', () => {
      const cases = loader.loadByCategory('non_existent_category');

      expect(cases).toHaveLength(0);
    });

    it('should load multiple cases for same category if they exist', () => {
      // All our current categories have 1 case each
      const allCategories = ['password_reset', 'billing_inquiry', 'product_issue', 'account_update', 'general_inquiry'];

      allCategories.forEach(category => {
        const cases = loader.loadByCategory(category);
        expect(cases.length).toBeGreaterThan(0);
        cases.forEach(tc => {
          expect(tc.category).toBe(category);
        });
      });
    });
  });

  describe('loadByDifficulty', () => {
    it('should load test cases by difficulty', () => {
      const easyCases = loader.loadByDifficulty('easy');

      expect(easyCases).toHaveLength(2);
      easyCases.forEach((tc) => {
        expect(tc.difficulty).toBe('easy');
      });
    });

    it('should load medium difficulty cases', () => {
      const mediumCases = loader.loadByDifficulty('medium');

      expect(mediumCases).toHaveLength(2);
      mediumCases.forEach((tc) => {
        expect(tc.difficulty).toBe('medium');
      });
    });

    it('should load hard difficulty cases', () => {
      const hardCases = loader.loadByDifficulty('hard');

      expect(hardCases).toHaveLength(1);
      expect(hardCases[0].difficulty).toBe('hard');
    });

    it('should return empty array for non-existent difficulty', () => {
      const cases = loader.loadByDifficulty('impossible');

      expect(cases).toHaveLength(0);
    });
  });
});
