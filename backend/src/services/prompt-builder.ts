/**
 * Prompt Builder Service
 *
 * Constructs prompts for the LLM based on user options and transcripts.
 * Implements prompt engineering best practices for consistent, high-quality
 * summarization outputs.
 *
 * Key Features:
 * - Dynamic prompt construction based on options
 * - Clear instructions for the LLM
 * - Configurable output length and format
 * - Token counting for cost estimation
 *
 * Design Pattern:
 * This class encapsulates prompt logic, making it easy to:
 * - Test prompts in isolation
 * - Version and iterate on prompt templates
 * - A/B test different prompt strategies
 * - Track prompt performance over time
 */

export class PromptBuilder {
  /**
   * Builds a Summarization Prompt for the LLM
   *
   * Creates a structured prompt that instructs the LLM to generate
   * a concise summary of a customer support call transcript.
   *
   * The prompt includes:
   * - System role definition ("You are a customer service assistant...")
   * - Clear instructions (word limit, focus areas, tone)
   * - Optional features (key points, sentiment)
   * - The full transcript to summarize
   * - Output format indicator ("Summary:")
   *
   * @param transcript - The call transcript to summarize
   * @param options - Configuration options for the summary
   * @param options.maxLength - Maximum words in output (default: 150)
   * @param options.includeKeyPoints - Add 2-3 key points list (default: true)
   * @param options.includeSentiment - Add sentiment analysis (default: false)
   *
   * @returns Formatted prompt string ready for LLM input
   *
   * @example
   * const prompt = builder.buildSummarizationPrompt(
   *   "Agent: Hello... Customer: ...",
   *   { maxLength: 100, includeKeyPoints: true }
   * );
   * // Returns: "You are a customer service assistant..."
   */
  buildSummarizationPrompt(
    transcript: string,
    options: {
      maxLength?: number;
      includeKeyPoints?: boolean;
      includeSentiment?: boolean;
    } = {}
  ): string {
    const maxWords = options.maxLength || 150;

    // Base prompt with system role and core instructions
    let prompt = `You are a customer service assistant. Your task is to summarize call transcripts accurately and concisely.

Instructions:
- Provide a clear, concise summary in ${maxWords} words or less
- Focus on the main issue, customer request, and resolution
- Use professional, neutral language
- Extract key facts and action items`;

    // Conditionally add key points instruction
    if (options.includeKeyPoints) {
      prompt += '\n- List 2-3 key points from the conversation';
    }

    // Conditionally add sentiment analysis instruction
    if (options.includeSentiment) {
      prompt += '\n- Indicate the overall sentiment (positive, neutral, or negative)';
    }

    // Append the transcript and output format indicator
    prompt += `\n\nCall Transcript:
${transcript}

Summary:`;

    return prompt;
  }

  /**
   * Estimates Token Count for Text
   *
   * Provides a rough estimation of how many tokens the LLM will use
   * for a given text. Used for cost estimation and rate limiting.
   *
   * Estimation Method:
   * - ~4 characters per token for English text
   * - This is approximate; actual tokenization varies by model
   * - Good enough for monitoring and cost tracking
   *
   * @param text - The text to estimate tokens for
   * @returns Estimated token count (rounded up)
   *
   * @example
   * const tokens = builder.getTokenCount("Hello world");
   * // Returns: 3 (11 chars / 4 = 2.75, rounded up)
   */
  getTokenCount(text: string): number {
    // Rough estimation: ~4 characters per token for English text
    // Real tokenizers (tiktoken, sentencepiece) are more accurate
    // but this is sufficient for cost monitoring
    return Math.ceil(text.length / 4);
  }
}
