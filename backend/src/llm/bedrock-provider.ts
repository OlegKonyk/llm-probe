import type { LLMProvider, LLMOptions, LLMResponse } from './llm-provider.interface.js';

// Stub implementation
export class BedrockProvider implements LLMProvider {
  async generate(_prompt: string, _options?: LLMOptions): Promise<LLMResponse> {
    throw new Error('BedrockProvider not yet implemented');
  }

  getProviderName(): string {
    return 'bedrock';
  }

  getModel(): string {
    return process.env.BEDROCK_MODEL || 'anthropic.claude-3-haiku-20240307-v1:0';
  }
}
