/**
 * Text Similarity Metrics Unit Tests
 *
 * Comprehensive testing of all 8 similarity metrics used for LLM evaluation.
 * These metrics are the foundation of our quality assessment system.
 *
 * Test Coverage:
 * - Cosine Similarity: Word frequency vector comparison
 * - Jaccard Similarity: Vocabulary overlap (intersection over union)
 * - Overlap Coefficient: Lenient similarity for different lengths
 * - Composite Similarity: Weighted combination of above metrics
 * - Required Terms: Keyword presence validation
 * - Length Validation: Word count bounds checking
 * - N-gram Precision: Phrase-level matching
 * - BLEU Score: Simplified translation metric adapted for summaries
 *
 * Why Thorough Testing Matters:
 * These metrics determine pass/fail for LLM outputs. Bugs here would:
 * - Allow low-quality summaries to pass (false positives)
 * - Reject high-quality summaries (false negatives)
 * - Cause inconsistent quality standards
 * - Break regression testing and benchmarking
 *
 * Test Strategy:
 * - Identical inputs (expect perfect score)
 * - Similar inputs (expect high but not perfect score)
 * - Different inputs (expect low score)
 * - Edge cases (empty strings, boundaries, case sensitivity)
 * - Mathematical properties (0 ≤ score ≤ 1, symmetry where applicable)
 */

import { describe, it, expect } from '@jest/globals';
import {
  cosineSimilarity,
  jaccardSimilarity,
  overlapCoefficient,
  compositeSimilarity,
  containsRequiredTerms,
  validateLength,
  ngramPrecision,
  bleuScore,
} from '../../src/metrics/text-similarity.js';

describe('Text Similarity Metrics', () => {
  describe('cosineSimilarity', () => {
    // Test the fundamental property: identical text = perfect similarity
    it('should return 1.0 for identical texts', () => {
      const text = 'Customer called about password reset';
      const similarity = cosineSimilarity(text, text);
      expect(similarity).toBeCloseTo(1.0, 2);
    });

    it('should return high similarity for semantically similar texts', () => {
      const text1 = 'Customer called about password reset';
      const text2 = 'Customer requested password reset';
      const similarity = cosineSimilarity(text1, text2);
      expect(similarity).toBeGreaterThan(0.6);
    });

    it('should return low similarity for different texts', () => {
      const text1 = 'Customer called about password reset';
      const text2 = 'Weather is sunny today';
      const similarity = cosineSimilarity(text1, text2);
      expect(similarity).toBeLessThan(0.3);
    });

    it('should handle empty strings', () => {
      const similarity = cosineSimilarity('', 'some text');
      expect(similarity).toBe(0);
    });

    it('should be case insensitive', () => {
      const text1 = 'HELLO WORLD';
      const text2 = 'hello world';
      const similarity = cosineSimilarity(text1, text2);
      expect(similarity).toBeCloseTo(1.0, 2);
    });
  });

  describe('jaccardSimilarity', () => {
    it('should return 1.0 for identical texts', () => {
      const text = 'hello world test';
      const similarity = jaccardSimilarity(text, text);
      expect(similarity).toBe(1.0);
    });

    it('should calculate intersection over union correctly', () => {
      const text1 = 'hello world';
      const text2 = 'world test';
      // Intersection: {world} = 1, Union: {hello, world, test} = 3
      const similarity = jaccardSimilarity(text1, text2);
      expect(similarity).toBeCloseTo(1 / 3, 2);
    });

    it('should return 0 for completely different texts', () => {
      const text1 = 'hello world';
      const text2 = 'foo bar';
      const similarity = jaccardSimilarity(text1, text2);
      expect(similarity).toBe(0);
    });

    it('should handle empty strings', () => {
      const similarity = jaccardSimilarity('', 'test');
      expect(similarity).toBe(0);
    });
  });

  describe('overlapCoefficient', () => {
    it('should return 1.0 when smaller set is subset of larger', () => {
      const text1 = 'hello';
      const text2 = 'hello world test';
      const similarity = overlapCoefficient(text1, text2);
      expect(similarity).toBe(1.0);
    });

    it('should be more lenient than Jaccard', () => {
      const text1 = 'hello world';
      const text2 = 'world';
      const overlap = overlapCoefficient(text1, text2);
      const jaccard = jaccardSimilarity(text1, text2);
      expect(overlap).toBeGreaterThan(jaccard);
    });
  });

  describe('compositeSimilarity', () => {
    it('should return high score for very similar texts', () => {
      const text1 = 'Customer wants password reset';
      const text2 = 'Customer requested password reset';
      const similarity = compositeSimilarity(text1, text2);
      expect(similarity).toBeGreaterThan(0.7);
    });

    it('should return low score for different texts', () => {
      const text1 = 'Customer wants password reset';
      const text2 = 'Weather is nice today';
      const similarity = compositeSimilarity(text1, text2);
      expect(similarity).toBeLessThan(0.3);
    });

    it('should be between 0 and 1', () => {
      const text1 = 'Some random text here';
      const text2 = 'Different content entirely';
      const similarity = compositeSimilarity(text1, text2);
      expect(similarity).toBeGreaterThanOrEqual(0);
      expect(similarity).toBeLessThanOrEqual(1);
    });
  });

  describe('containsRequiredTerms', () => {
    it('should detect all required terms present', () => {
      const text = 'Customer called about password reset issue';
      const required = ['password', 'reset', 'customer'];
      const result = containsRequiredTerms(text, required);

      expect(result.passed).toBe(true);
      expect(result.coverage).toBe(1.0);
      expect(result.missing).toHaveLength(0);
    });

    it('should detect missing terms', () => {
      const text = 'Customer called about issue';
      const required = ['password', 'reset', 'customer'];
      const result = containsRequiredTerms(text, required);

      expect(result.passed).toBe(false);
      expect(result.coverage).toBeCloseTo(1 / 3, 2);
      expect(result.missing).toEqual(['password', 'reset']);
    });

    it('should be case insensitive', () => {
      const text = 'PASSWORD RESET required';
      const required = ['password', 'reset'];
      const result = containsRequiredTerms(text, required);

      expect(result.passed).toBe(true);
    });

    it('should handle empty required terms', () => {
      const text = 'Some text';
      const result = containsRequiredTerms(text, []);

      expect(result.passed).toBe(true);
      expect(result.coverage).toBe(1.0);
    });
  });

  describe('validateLength', () => {
    it('should pass when length is within bounds', () => {
      const text = 'This is a test with exactly seven words';
      const result = validateLength(text, 5, 10);

      expect(result.passed).toBe(true);
      expect(result.wordCount).toBe(8);
    });

    it('should fail when text is too short', () => {
      const text = 'Too short';
      const result = validateLength(text, 10, 20);

      expect(result.passed).toBe(false);
      expect(result.wordCount).toBe(2);
    });

    it('should fail when text is too long', () => {
      const text = 'This text has way too many words for the limit';
      const result = validateLength(text, 1, 5);

      expect(result.passed).toBe(false);
      expect(result.wordCount).toBe(10);
    });

    it('should accept text at exact boundaries', () => {
      const text = 'Exactly five words here now';
      const result = validateLength(text, 5, 5);

      expect(result.passed).toBe(true);
      expect(result.wordCount).toBe(5);
    });
  });

  describe('ngramPrecision', () => {
    it('should calculate unigram precision correctly', () => {
      const reference = 'the cat sat on the mat';
      const candidate = 'the cat sat';
      const precision = ngramPrecision(reference, candidate, 1);

      // All 3 words in candidate appear in reference
      expect(precision).toBe(1.0);
    });

    it('should calculate bigram precision', () => {
      const reference = 'the cat sat on the mat';
      const candidate = 'the cat sat on';
      const precision = ngramPrecision(reference, candidate, 2);

      // Bigrams: "the cat", "cat sat", "sat on"
      // All 3 bigrams from candidate are in reference
      expect(precision).toBe(1.0);
    });

    it('should handle partial matches', () => {
      const reference = 'the cat sat';
      const candidate = 'the dog ran';
      const precision = ngramPrecision(reference, candidate, 1);

      // Only "the" matches, 1 out of 3 words
      expect(precision).toBeCloseTo(1 / 3, 2);
    });
  });

  describe('bleuScore', () => {
    it('should return high score for similar texts', () => {
      const reference = 'the quick brown fox';
      const candidate = 'the quick brown fox';
      const score = bleuScore(reference, candidate);

      expect(score).toBeGreaterThan(0.9);
    });

    it('should return lower score for partially matching texts', () => {
      const reference = 'the quick brown fox jumps over the lazy dog';
      const candidate = 'the quick brown cat';
      const score = bleuScore(reference, candidate);

      expect(score).toBeLessThan(1.0);
      expect(score).toBeGreaterThan(0.3);
    });

    it('should return 0 for completely different texts', () => {
      const reference = 'hello world';
      const candidate = 'foo bar';
      const score = bleuScore(reference, candidate);

      expect(score).toBe(0);
    });
  });
});
