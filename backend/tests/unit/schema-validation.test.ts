import { describe, it, expect } from '@jest/globals';
import { summarizeRequestSchema } from '../../src/types/schemas.js';
import { ZodError } from 'zod';

describe('summarizeRequestSchema', () => {
  describe('valid inputs', () => {
    it('should accept minimal valid request', () => {
      const input = {
        transcript: 'Customer called about an issue',
      };

      const result = summarizeRequestSchema.parse(input);

      expect(result.transcript).toBe(input.transcript);
      expect(result.options.maxLength).toBe(150);
      expect(result.options.includeKeyPoints).toBe(true);
      expect(result.options.includeSentiment).toBe(false);
    });

    it('should accept request with custom options', () => {
      const input = {
        transcript: 'Test transcript here',
        options: {
          maxLength: 100,
          includeKeyPoints: false,
          includeSentiment: true,
        },
      };

      const result = summarizeRequestSchema.parse(input);

      expect(result.options.maxLength).toBe(100);
      expect(result.options.includeKeyPoints).toBe(false);
      expect(result.options.includeSentiment).toBe(true);
    });

    it('should apply defaults to partial options', () => {
      const input = {
        transcript: 'Test transcript',
        options: {
          maxLength: 200,
        },
      };

      const result = summarizeRequestSchema.parse(input);

      expect(result.options.maxLength).toBe(200);
      expect(result.options.includeKeyPoints).toBe(true);
      expect(result.options.includeSentiment).toBe(false);
    });
  });

  describe('invalid inputs', () => {
    it('should reject missing transcript', () => {
      const input = {};

      expect(() => summarizeRequestSchema.parse(input)).toThrow(ZodError);
    });

    it('should reject transcript below minimum length', () => {
      const input = {
        transcript: 'short',
      };

      expect(() => summarizeRequestSchema.parse(input)).toThrow(ZodError);
    });

    it('should reject maxLength below minimum', () => {
      const input = {
        transcript: 'Test transcript here',
        options: {
          maxLength: 10,
        },
      };

      expect(() => summarizeRequestSchema.parse(input)).toThrow(ZodError);
    });

    it('should reject maxLength above maximum', () => {
      const input = {
        transcript: 'Test transcript here',
        options: {
          maxLength: 1000,
        },
      };

      expect(() => summarizeRequestSchema.parse(input)).toThrow(ZodError);
    });

    it('should reject invalid types', () => {
      const input = {
        transcript: 'Test transcript',
        options: {
          maxLength: '100',
        },
      };

      expect(() => summarizeRequestSchema.parse(input)).toThrow(ZodError);
    });
  });
});
