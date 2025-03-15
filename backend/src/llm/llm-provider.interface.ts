// LLM provider interface for Ollama, Bedrock, etc.
export interface LLMOptions {
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
}

export interface LLMResponse {
  text: string;
  tokensUsed: number;
  model: string;
  metadata?: Record<string, unknown>;
}

export interface LLMProvider {
  generate(prompt: string, options?: LLMOptions): Promise<LLMResponse>;
  getProviderName(): string;
  getModel(): string;
}
