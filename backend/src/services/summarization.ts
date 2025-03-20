import { PromptBuilder } from './prompt-builder.js';
import type { SummarizationResult } from '../types/schemas.js';
import type { LLMProvider } from '../llm/llm-provider.interface.js';
import { LLMFactory } from '../llm/llm-factory.js';
import { countTokens } from '../utils/token-counter.js';
import { logger } from '../utils/logger.js';

const AVG_TOKENS_PER_WORD = 1.3;

export class SummarizationService {
  private llmProvider: LLMProvider;
  private promptBuilder: PromptBuilder;

  constructor() {
    this.llmProvider = LLMFactory.getProvider();
    this.promptBuilder = new PromptBuilder();
  }

  /**
   * @param transcript - Call transcript to summarize
   * @param options - Summarization options
   * @returns Promise with summary and metadata
   */
  async summarize(
    transcript: string,
    options: {
      maxLength?: number;
      includeKeyPoints?: boolean;
      includeSentiment?: boolean;
    } = {}
  ): Promise<SummarizationResult> {
    const prompt = this.promptBuilder.buildSummarizationPrompt(transcript, options);

    const requestedWordCount = options.maxLength || 150;
    const estimatedTokens = Math.ceil(requestedWordCount * AVG_TOKENS_PER_WORD);
    const maxTokens = Math.ceil(estimatedTokens * 1.2);

    logger.info('Token limit calculated', {
      requestedWords: requestedWordCount,
      maxTokens,
      promptTokens: countTokens(prompt),
    });

    const response = await this.llmProvider.generate(prompt, {
      temperature: 0.3,
      maxTokens,
    });

    const summary = this.extractSummary(response.text);

    const actualTokens = countTokens(summary);
    logger.info('Summary generated', {
      requestedWords: requestedWordCount,
      maxTokens,
      reportedTokensUsed: response.tokensUsed,
      actualOutputTokens: actualTokens,
    });

    return {
      summary,
      tokensUsed: response.tokensUsed,
      model: response.model,
    };
  }

  private extractSummary(response: string): string {
    return response
      .replace(/```(?:\w+)?\n?([\s\S]*?)```/g, '$1')
      .replace(/^#{1,6}\s/gm, '')
      .trim();
  }
}
