/**
 * Schema Validation Unit Tests
 *
 * Tests Zod schemas that validate incoming API requests at runtime.
 * These schemas are the first line of defense against invalid inputs,
 * catching errors before they reach business logic.
 *
 * Why Schema Validation Matters:
 *
 * Runtime Safety:
 * - TypeScript only validates types at compile-time (development)
 * - Schemas validate at runtime (production)
 * - Catches malformed requests from external clients
 * - Prevents type coercion bugs (e.g., "123" → 123)
 *
 * Security Benefits:
 * - Enforces input length limits (prevents DoS via large payloads)
 * - Validates data types (prevents injection attacks)
 * - Provides clear error messages (prevents information leakage)
 * - Rejects unexpected fields (prevents parameter pollution)
 *
 * User Experience:
 * - Clear validation errors help API consumers fix issues quickly
 * - Consistent error format across all endpoints
 * - Fails fast (rejects invalid requests immediately)
 *
 * Test Strategy:
 *
 * Valid Inputs:
 * - Minimal valid request (required fields only)
 * - Complete request with all optional fields
 * - Boundary values at limits (min/max edges)
 * - Verify default value application
 *
 * Invalid Inputs:
 * - Missing required fields
 * - Invalid types (string instead of number)
 * - Out-of-bounds values (below min, above max)
 * - Malformed data structures
 *
 * Edge Cases:
 * - Partial options (some provided, some default)
 * - Boundary values (exactly at min/max)
 * - Empty vs missing vs null
 * - Type coercion attempts
 *
 * Schema Under Test: summarizeRequestSchema
 *
 * Structure:
 * {
 *   transcript: string (required)
 *     - Min: 10 characters (ensures meaningful input)
 *     - Max: 50,000 characters (prevents DoS)
 *     - Why: Customer support transcripts are typically 100-5000 chars
 *
 *   options: object (optional)
 *     - maxLength: number (50-500, default: 150)
 *       - Why 50: Shortest useful summary is ~1 sentence
 *       - Why 500: Longer summaries defeat the purpose
 *       - Default 150: Good balance for most use cases
 *
 *     - includeKeyPoints: boolean (default: true)
 *       - Adds bullet points of main takeaways
 *       - Useful for quick scanning
 *
 *     - includeSentiment: boolean (default: false)
 *       - Adds sentiment analysis (positive/negative/neutral)
 *       - Optional because not all use cases need it
 * }
 *
 * Test Coverage: 12 tests
 * - Valid inputs: 4 tests
 * - Invalid inputs: 5 tests
 * - Edge cases: 3 tests
 *
 * Reference: backend/src/types/schemas.ts for schema definitions
 */

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
      expect(result.options.maxLength).toBe(150); // default
      expect(result.options.includeKeyPoints).toBe(true); // default
      expect(result.options.includeSentiment).toBe(false); // default
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
          // maxLength and includeSentiment not provided
        },
      };

      const result = summarizeRequestSchema.parse(request);

      expect(result.options.maxLength).toBe(150); // default
      expect(result.options.includeKeyPoints).toBe(false); // provided
      expect(result.options.includeSentiment).toBe(false); // default
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
