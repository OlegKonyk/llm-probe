import { Router } from 'express';
import { ZodError } from 'zod';
import { SummarizationService } from '../services/summarization.js';
import { summarizeRequestSchema } from '../types/schemas.js';
import { logger } from '../utils/logger.js';
import { countTokens } from '../utils/token-counter.js';
import { OllamaConnectionError, ModelNotFoundError, LLMGenerationError, LLMTimeoutError } from '../errors/llm-errors.js';

const router = Router();
const summarizationService = new SummarizationService();

// llama3.2:latest has ~8k context window
// Reserve space for prompt structure (~300 tokens) and output (up to ~780 tokens for maxLength=500)
const MAX_TRANSCRIPT_TOKENS = 7000;

/**
 * POST /summarize
 * Generates a summary of a call transcript
 */
router.post('/summarize', async (req, res) => {
  try {
    const { transcript, options } = summarizeRequestSchema.parse(req.body);

    const transcriptTokens = countTokens(transcript);
    if (transcriptTokens > MAX_TRANSCRIPT_TOKENS) {
      logger.warn('Transcript exceeds token limit', {
        transcriptTokens,
        maxTokens: MAX_TRANSCRIPT_TOKENS,
        transcriptLength: transcript.length,
      });

      return res.status(413).json({
        error: 'Payload Too Large',
        message: `Transcript exceeds maximum token limit of ${MAX_TRANSCRIPT_TOKENS}`,
      });
    }

    const startTime = Date.now();
    const result = await summarizationService.summarize(transcript, options);
    const latency = Date.now() - startTime;

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
    if (error instanceof LLMTimeoutError) {
      return res.status(504).json({
        error: 'Gateway Timeout',
        message: error.message,
      });
    }

    if (error instanceof OllamaConnectionError) {
      return res.status(503).json({
        error: 'Service Unavailable',
        message: error.message,
      });
    }

    if (error instanceof ModelNotFoundError) {
      return res.status(502).json({
        error: 'Bad Gateway',
        message: error.message,
      });
    }

    if (error instanceof LLMGenerationError) {
      return res.status(500).json({
        error: 'Internal Server Error',
        message: error.message,
      });
    }

    if (error instanceof ZodError) {
      logger.warn('Invalid request format', {
        transcriptLength: req.body.transcript?.length,
        validationErrors: error.issues,
      });

      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid request format',
      });
    }

    logger.error('Unexpected error in summarization endpoint', error, {
      transcriptLength: req.body.transcript?.length,
    });

    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    });
  }
});

export { router as summarizationRouter };
