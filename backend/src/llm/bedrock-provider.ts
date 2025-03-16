import type { LLMProvider, LLMOptions, LLMResponse } from './llm-provider.interface.js';
import { LLMGenerationError } from '../errors/llm-errors.js';

// Stub implementation for AWS Bedrock
export class BedrockProvider implements LLMProvider {
  private model: string;

  constructor() {
    this.model = process.env.BEDROCK_MODEL || 'anthropic.claude-3-haiku-20240307-v1:0';
  }

  async generate(_prompt: string, _options?: LLMOptions): Promise<LLMResponse> {
    throw new LLMGenerationError(
      'BedrockProvider not yet implemented. Use OllamaProvider for now.'
    );
  }

  getProviderName(): string {
    return 'bedrock';
  }

  getModel(): string {
    return this.model;
  }
}
