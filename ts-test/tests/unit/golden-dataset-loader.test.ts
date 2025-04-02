import { describe, it, expect } from '@jest/globals';
import { GoldenDatasetLoader, GoldenDatasetValidationError } from '../../src/utils/golden-dataset.js';

describe('GoldenDatasetLoader', () => {
  const loader = new GoldenDatasetLoader();

  describe('loadIndex', () => {
    it('should load index successfully', () => {
      const index = loader.loadIndex();

      expect(index).toBeDefined();
      expect(index.dataset_version).toBe('1.0.0');
      expect(index.total_cases).toBe(5);
      expect(Array.isArray(index.test_cases)).toBe(true);
      expect(index.test_cases.length).toBe(5);
    });

    it('should cache index after first load', () => {
      const index1 = loader.loadIndex();
      const index2 = loader.loadIndex();

      expect(index1).toBe(index2);
    });

    it('should clear cache when requested', () => {
      const index1 = loader.loadIndex();
      loader.clearCache();
      const index2 = loader.loadIndex();

      expect(index1).not.toBe(index2);
      expect(index1).toEqual(index2);
    });
  });

  describe('loadTestCase', () => {
    it('should load valid test case', () => {
      const testCase = loader.loadTestCase('call_001');

      expect(testCase.id).toBe('call_001');
      expect(testCase.category).toBe('password_reset');
      expect(testCase.difficulty).toBe('easy');
      expect(testCase.transcript).toBeTruthy();
      expect(testCase.golden_summary).toBeTruthy();
      expect(testCase.metadata).toBeDefined();
      expect(testCase.metadata.sentiment).toBe('positive');
      expect(testCase.metadata.resolution_status).toBe('resolved');
      expect(Array.isArray(testCase.metadata.key_points)).toBe(true);
      expect(testCase.thresholds).toBeDefined();
      expect(testCase.thresholds.min_semantic_similarity).toBe(0.80);
    });

    it('should throw error for non-existent test case', () => {
      expect(() => loader.loadTestCase('nonexistent')).toThrow(
        /Test case 'nonexistent' not found in index/
      );
    });

    it('should reject path traversal attempts', () => {
      const maliciousMap = new Map([
        ['malicious', { file: '../../backend/.env', category: 'test', difficulty: 'easy' }]
      ]);

      (loader as any).testCaseMap = maliciousMap;
      (loader as any).indexCache = { test_cases: [] };

      expect(() => loader.loadTestCase('malicious')).toThrow(GoldenDatasetValidationError);
      expect(() => loader.loadTestCase('malicious')).toThrow(/absolute paths and parent directory traversal/);

      loader.clearCache();
    });

    it('should reject absolute paths', () => {
      const maliciousMap = new Map([
        ['malicious', { file: '/etc/passwd', category: 'test', difficulty: 'easy' }]
      ]);

      (loader as any).testCaseMap = maliciousMap;
      (loader as any).indexCache = { test_cases: [] };

      expect(() => loader.loadTestCase('malicious')).toThrow(GoldenDatasetValidationError);
      expect(() => loader.loadTestCase('malicious')).toThrow(/absolute paths and parent directory traversal/);

      loader.clearCache();
    });
  });

  describe('loadAllTestCases', () => {
    it('should load all test cases', () => {
      const allCases = loader.loadAllTestCases();

      expect(allCases.length).toBe(5);
      expect(allCases[0].id).toBe('call_001');
      expect(allCases[4].id).toBe('call_005');
    });
  });

  describe('loadByCategory', () => {
    it('should load test cases by category', () => {
      const passwordCases = loader.loadByCategory('password_reset');

      expect(passwordCases.length).toBeGreaterThan(0);
      passwordCases.forEach(tc => {
        expect(tc.category).toBe('password_reset');
      });
    });

    it('should return empty array for non-existent category', () => {
      const cases = loader.loadByCategory('nonexistent_category');

      expect(cases.length).toBe(0);
    });
  });

  describe('loadByDifficulty', () => {
    it('should load test cases by difficulty', () => {
      const easyCases = loader.loadByDifficulty('easy');

      expect(easyCases.length).toBeGreaterThan(0);
      easyCases.forEach(tc => {
        expect(tc.difficulty).toBe('easy');
      });
    });

    it('should return empty array for non-existent difficulty', () => {
      const cases = loader.loadByDifficulty('impossible');

      expect(cases.length).toBe(0);
    });
  });

  describe('validation', () => {
    it('should validate metadata fields', () => {
      const testCase = loader.loadTestCase('call_001');

      expect(testCase.metadata.sentiment).toBeDefined();
      expect(typeof testCase.metadata.sentiment).toBe('string');
      expect(testCase.metadata.sentiment.length).toBeGreaterThan(0);

      expect(testCase.metadata.resolution_status).toBeDefined();
      expect(typeof testCase.metadata.resolution_status).toBe('string');

      expect(Array.isArray(testCase.metadata.key_points)).toBe(true);
      testCase.metadata.key_points.forEach(point => {
        expect(typeof point).toBe('string');
        expect(point.length).toBeGreaterThan(0);
      });
    });

    it('should validate threshold fields', () => {
      const testCase = loader.loadTestCase('call_001');

      expect(testCase.thresholds.min_semantic_similarity).toBeGreaterThanOrEqual(0);
      expect(testCase.thresholds.min_semantic_similarity).toBeLessThanOrEqual(1);

      expect(testCase.thresholds.min_length_words).toBeGreaterThanOrEqual(0);
      expect(testCase.thresholds.max_length_words).toBeGreaterThanOrEqual(testCase.thresholds.min_length_words);

      expect(Array.isArray(testCase.thresholds.required_terms)).toBe(true);
      testCase.thresholds.required_terms.forEach(term => {
        expect(typeof term).toBe('string');
        expect(term.length).toBeGreaterThan(0);
      });
    });
  });
});
