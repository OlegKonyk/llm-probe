import type { LLMProvider, LLMOptions, LLMResponse } from './llm-provider.interface.js';

// Stub implementation
export class OllamaProvider implements LLMProvider {
  async generate(_prompt: string, _options?: LLMOptions): Promise<LLMResponse> {
    throw new Error('OllamaProvider not yet implemented');
  }

  getProviderName(): string {
    return 'ollama';
  }

  getModel(): string {
    return process.env.OLLAMA_MODEL || 'llama3.2:latest';
  }
}
