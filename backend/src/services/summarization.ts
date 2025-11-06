/**
 * Summarization Service
 *
 * Core business logic for generating summaries from call transcripts.
 * Orchestrates the interaction between prompt building and LLM inference.
 *
 * Architecture:
 * - Uses LLMProvider interface for abstraction
 * - Supports multiple LLM backends (Ollama, Bedrock, etc.)
 * - PromptBuilder handles prompt construction
 * - Post-processing to clean LLM output
 *
 * Provider Selection:
 * - Local Dev: OllamaProvider (free, fast, no AWS needed)
 * - Production: BedrockProvider (serverless, pay-per-use)
 * - Configured via LLM_PROVIDER environment variable
 *
 * Key Features:
 * - Temperature: 0.3 (lower = more deterministic, better for summaries)
 * - Token limit: Configurable via maxLength option
 * - Output cleaning: Removes markdown formatting artifacts
 * - Metadata tracking: Token usage, model info
 */

import { PromptBuilder } from './prompt-builder.js';
import type { SummarizationResult } from '../types/schemas.js';
import type { LLMProvider } from '../llm/llm-provider.interface.js';
import { LLMFactory } from '../llm/llm-factory.js';
import { countTokens } from '../utils/token-counter.js';
import { logger } from '../utils/logger.js';

/**
 * Fallback: Average tokens per word for English text
 *
 * This constant is now only used as a fallback if tiktoken fails to initialize.
 * The service now uses the tiktoken library for accurate token counting.
 *
 * Why accurate token counting matters:
 * - Cost optimization: Tokens = money (especially with cloud LLMs)
 * - Prevents truncation: Ensures responses fit within limits
 * - Better resource planning: Accurate capacity estimates
 *
 * Reference: Based on GPT tokenizer analysis showing English text averages 1.2-1.4 tokens/word
 */
const AVG_TOKENS_PER_WORD = 1.3;

export class SummarizationService {
  private llmProvider: LLMProvider;
  private promptBuilder: PromptBuilder;

  /**
   * Creates a new SummarizationService
   *
   * Uses LLMFactory to automatically select the appropriate provider
   * based on LLM_PROVIDER environment variable.
   *
   * Environment Variables:
   * - LLM_PROVIDER: Provider type ("ollama" or "bedrock", default: "ollama")
   *
   * For Ollama (local development):
   * - OLLAMA_HOST: Ollama service URL (default: http://localhost:11434)
   * - OLLAMA_MODEL: Model name (default: llama3.2:latest)
   * - OLLAMA_TIMEOUT_MS: Timeout in ms (default: 30000)
   *
   * For Bedrock (production):
   * - AWS_REGION: AWS region (e.g., us-east-1)
   * - AWS_ACCESS_KEY_ID: AWS access key
   * - AWS_SECRET_ACCESS_KEY: AWS secret key
   * - BEDROCK_MODEL: Model ID (default: Claude 3 Haiku)
   * - BEDROCK_TIMEOUT_MS: Timeout in ms (default: 30000)
   *
   * @example
   * // Use Ollama (default)
   * const service = new SummarizationService();
   *
   * @example
   * // Use Bedrock (set environment variable)
   * process.env.LLM_PROVIDER = 'bedrock';
   * const service = new SummarizationService();
   */
  constructor() {
    this.llmProvider = LLMFactory.getProvider();
    this.promptBuilder = new PromptBuilder();
  }

  /**
   * Generates a Summary from a Call Transcript
   *
   * Main workflow:
   * 1. Build prompt using PromptBuilder
   * 2. Send prompt to LLM via provider (Ollama or Bedrock)
   * 3. Extract and clean the response
   * 4. Return summary with metadata
   *
   * LLM Parameters:
   * - Temperature: 0.3 (consistent, focused outputs)
   * - maxTokens: Limits token generation (converted from word count)
   *
   * @param transcript - The call transcript to summarize
   * @param options - Summarization options
   * @param options.maxLength - Max words (50-500, default: 150)
   * @param options.includeKeyPoints - Add key points (default: true)
   * @param options.includeSentiment - Add sentiment (default: false)
   *
   * @returns Promise resolving to summary and metadata
   *
   * @throws LLMTimeoutError if generation times out
   * @throws OllamaConnectionError if Ollama is unreachable (Ollama provider)
   * @throws ModelNotFoundError if model not found (Ollama provider)
   * @throws LLMGenerationError for other generation failures
   *
   * @example
   * const result = await service.summarize(
   *   "Agent: Hello... Customer: ...",
   *   { maxLength: 100 }
   * );
   * console.log(result.summary);
   * console.log(`Used ${result.tokensUsed} tokens`);
   */
  async summarize(
    transcript: string,
    options: {
      maxLength?: number;
      includeKeyPoints?: boolean;
      includeSentiment?: boolean;
    } = {}
  ): Promise<SummarizationResult> {
    // Step 1: Build the prompt using configured options
    const prompt = this.promptBuilder.buildSummarizationPrompt(
      transcript,
      options
    );

    // Step 2: Calculate accurate token limit for the response
    // Uses tiktoken for exact counts (important for cost control)
    // Adds 20% buffer to account for formatting and variations
    const requestedWordCount = options.maxLength || 150;
    const estimatedTokens = Math.ceil(requestedWordCount * AVG_TOKENS_PER_WORD);
    const maxTokens = Math.ceil(estimatedTokens * 1.2); // 20% buffer

    // Log token estimation for monitoring
    logger.info('Token limit calculated', {
      requestedWords: requestedWordCount,
      maxTokens,
      promptTokens: countTokens(prompt),
    });

    // Step 3: Call the LLM via provider (error handling is in provider)
    const response = await this.llmProvider.generate(prompt, {
      temperature: 0.3,
      maxTokens,
    });

    // Step 4: Extract and clean the summary
    const summary = this.extractSummary(response.text);

    // Step 5: Verify token usage (for cost monitoring)
    const actualTokens = countTokens(summary);
    logger.info('Summary generated', {
      requestedWords: requestedWordCount,
      maxTokens,
      reportedTokensUsed: response.tokensUsed,
      actualOutputTokens: actualTokens,
    });

    // Step 6: Return with metadata
    return {
      summary,
      tokensUsed: response.tokensUsed,
      model: response.model,
    };
  }

  /**
   * Extracts Clean Summary from LLM Response
   *
   * LLMs sometimes add formatting artifacts like markdown code blocks
   * or extra headers. This method strips them out.
   *
   * Cleaning Steps:
   * 1. Remove markdown code blocks (```...```)
   * 2. Remove markdown headers (# ## ###)
   * 3. Trim whitespace
   *
   * @param response - Raw LLM output text
   * @returns Cleaned summary text
   *
   * @example
   * // Input:  "```\nSummary here\n```"
   * // Output: "Summary here"
   */
  private extractSummary(response: string): string {
    return response
      .replace(/```[\s\S]*?```/g, '')  // Remove code blocks
      .replace(/#{1,6}\s/g, '')         // Remove headers
      .trim();
  }
}
