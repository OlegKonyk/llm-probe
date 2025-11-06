/**
 * Summarization API Routes
 *
 * Defines the REST API endpoints for call transcript summarization.
 * Handles request validation, LLM invocation, performance tracking,
 * and error responses.
 *
 * Key Features:
 * - Request validation using Zod schemas
 * - Latency tracking for performance monitoring
 * - Token usage reporting
 * - Comprehensive error handling
 *
 * Mounted at: /api/v1 (see index.ts)
 */

import { Router } from 'express';
import { SummarizationService } from '../services/summarization.js';
import { summarizeRequestSchema } from '../types/schemas.js';
import { logger } from '../utils/logger.js';
import { OllamaConnectionError, ModelNotFoundError, LLMGenerationError, LLMTimeoutError } from '../errors/llm-errors.js';

const router = Router();
const summarizationService = new SummarizationService();

/**
 * POST /summarize
 *
 * Generates a concise summary of a customer support call transcript
 * using a local LLM (Ollama).
 *
 * Request Body:
 * {
 *   transcript: string,           // Call transcript (min 10 chars)
 *   options?: {
 *     maxLength?: number,          // Max words (50-500, default: 150)
 *     includeKeyPoints?: boolean,  // Add key points list (default: true)
 *     includeSentiment?: boolean   // Add sentiment analysis (default: false)
 *   }
 * }
 *
 * Response (200):
 * {
 *   summary: string,               // Generated summary
 *   metadata: {
 *     latency_ms: number,          // Time taken to generate
 *     tokens_used: number,         // LLM tokens consumed
 *     model: string,               // Model used (e.g., "llama3.2:latest")
 *     timestamp: string            // ISO8601 timestamp
 *   }
 * }
 *
 * Error Response (500):
 * {
 *   error: string,                 // Error type
 *   message: string                // Error details
 * }
 */
router.post('/summarize', async (req, res) => {
  try {
    // Validate request body against schema (throws on invalid input)
    const { transcript, options } = summarizeRequestSchema.parse(req.body);

    const startTime = Date.now();

    // Call LLM service to generate summary
    const result = await summarizationService.summarize(transcript, options);

    // Calculate request latency for monitoring
    const latency = Date.now() - startTime;

    // Return summary with performance metadata
    res.json({
      summary: result.summary,
      metadata: {
        latency_ms: latency,
        tokens_used: result.tokensUsed,
        model: result.model,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    // Handle custom error types with appropriate HTTP status codes
    // Detailed logging already done in service layer

    // Timeout error: Generation took too long
    if (error instanceof LLMTimeoutError) {
      return res.status(504).json({
        error: 'Gateway Timeout',
        message: error.message,
      });
    }

    // Connection error: Ollama service unavailable
    if (error instanceof OllamaConnectionError) {
      return res.status(503).json({
        error: 'Service Unavailable',
        message: error.message,
      });
    }

    // Model not found: Required model not available
    if (error instanceof ModelNotFoundError) {
      return res.status(502).json({
        error: 'Bad Gateway',
        message: error.message,
      });
    }

    // LLM generation error: Generic processing failure
    if (error instanceof LLMGenerationError) {
      return res.status(500).json({
        error: 'Internal Server Error',
        message: error.message,
      });
    }

    // Validation error: Invalid request format
    // Zod errors are thrown before reaching summarization service
    if (error && typeof error === 'object' && 'issues' in error) {
      logger.warn('Invalid request format', {
        transcriptLength: req.body.transcript?.length,
        validationErrors: error,
      });

      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid request format',
      });
    }

    // Fallback: Unknown error type
    logger.error('Unexpected error in summarization endpoint', {
      error: String(error),
      transcriptLength: req.body.transcript?.length,
    });

    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    });
  }
});

export { router as summarizationRouter };
