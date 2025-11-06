/**
 * Type Definitions and Validation Schemas
 *
 * Defines TypeScript types and Zod validation schemas for the API.
 * Provides runtime validation with automatic type inference.
 *
 * Key Concepts:
 * - Zod schemas validate incoming requests at runtime
 * - TypeScript types are inferred from Zod schemas for type safety
 * - Default values ensure consistent behavior
 * - Boundary validation prevents invalid inputs
 *
 * Used By:
 * - API routes for request validation
 * - Services for type-safe function signatures
 * - Tests for creating valid/invalid test cases
 */

import { z } from 'zod';

/**
 * Summarization Request Schema
 *
 * Validates POST /api/v1/summarize request bodies.
 *
 * Validation Rules:
 * - transcript: min 10 characters (ensures meaningful input)
 * - maxLength: 50-500 words (prevents too short/long outputs)
 * - includeKeyPoints: boolean (default: true)
 * - includeSentiment: boolean (default: false)
 *
 * Example Valid Request:
 * {
 *   transcript: "Agent: Hello, how can I help? Customer: ...",
 *   options: { maxLength: 100, includeKeyPoints: true }
 * }
 */
export const summarizeRequestSchema = z.object({
  transcript: z.string().min(10, 'Transcript must be at least 10 characters'),
  options: z
    .object({
      maxLength: z.number().min(50).max(500).optional().default(150),
      includeKeyPoints: z.boolean().optional().default(true),
      includeSentiment: z.boolean().optional().default(false),
    })
    .optional()
    .default({}),
});

/**
 * TypeScript type inferred from the Zod schema above.
 * Ensures type safety throughout the codebase.
 */
export type SummarizeRequest = z.infer<typeof summarizeRequestSchema>;

/**
 * Summarization Result Interface
 *
 * Returned by the SummarizationService after LLM inference.
 * Contains the generated summary and metadata.
 *
 * Fields:
 * - summary: The generated text summary
 * - tokensUsed: Number of tokens consumed by the LLM
 * - model: Model identifier (e.g., "llama3.2:latest")
 */
export interface SummarizationResult {
  summary: string;
  tokensUsed: number;
  model: string;
}
