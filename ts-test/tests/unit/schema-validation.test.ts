import { describe, it, expect } from '@jest/globals';
import { summarizeRequestSchema } from '../../../backend/src/types/schemas.js';

describe('Schema Validation Unit Tests', () => {
  describe('summarizeRequestSchema', () => {
    it('should accept valid request with transcript only', () => {
      const validRequest = {
        transcript: 'Customer called about an issue.',
      };

      const result = summarizeRequestSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
    });

    it('should accept valid request with all options', () => {
      const validRequest = {
        transcript: 'Customer called about an issue.',
        options: {
          maxLength: 100,
          includeKeyPoints: true,
          includeSentiment: false,
        },
      };

      const result = summarizeRequestSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
    });

    it('should apply default options when not provided', () => {
      const request = {
        transcript: 'Test transcript',
      };

      const result = summarizeRequestSchema.parse(request);

      expect(result.options).toBeDefined();
      expect(result.options.maxLength).toBe(150);
      expect(result.options.includeKeyPoints).toBe(true);
      expect(result.options.includeSentiment).toBe(false);
    });

    it('should reject transcript shorter than 10 characters', () => {
      const invalidRequest = {
        transcript: 'Short',
      };

      const result = summarizeRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });

    it('should reject missing transcript', () => {
      const invalidRequest = {
        options: { maxLength: 100 },
      };

      const result = summarizeRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });

    it('should reject maxLength below 50', () => {
      const invalidRequest = {
        transcript: 'Customer called about an issue.',
        options: { maxLength: 30 },
      };

      const result = summarizeRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });

    it('should reject maxLength above 500', () => {
      const invalidRequest = {
        transcript: 'Customer called about an issue.',
        options: { maxLength: 600 },
      };

      const result = summarizeRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });

    it('should accept maxLength at boundary (50)', () => {
      const request = {
        transcript: 'Customer called about an issue.',
        options: { maxLength: 50 },
      };

      const result = summarizeRequestSchema.safeParse(request);
      expect(result.success).toBe(true);
    });

    it('should accept maxLength at boundary (500)', () => {
      const request = {
        transcript: 'Customer called about an issue.',
        options: { maxLength: 500 },
      };

      const result = summarizeRequestSchema.safeParse(request);
      expect(result.success).toBe(true);
    });

    it('should handle partial options', () => {
      const request = {
        transcript: 'Test transcript with enough characters.',
        options: {
          includeKeyPoints: false,
        },
      };

      const result = summarizeRequestSchema.parse(request);

      expect(result.options.maxLength).toBe(150);
      expect(result.options.includeKeyPoints).toBe(false);
      expect(result.options.includeSentiment).toBe(false);
    });

    it('should reject invalid option types', () => {
      const invalidRequest = {
        transcript: 'Valid transcript with sufficient length.',
        options: {
          maxLength: 'not a number' as any,
        },
      };

      const result = summarizeRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });

    it('should reject non-boolean flags', () => {
      const invalidRequest = {
        transcript: 'Valid transcript with sufficient length.',
        options: {
          includeKeyPoints: 'yes' as any,
        },
      };

      const result = summarizeRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });
  });
});
