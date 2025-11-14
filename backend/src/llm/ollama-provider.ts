import { Ollama } from 'ollama';
import type { LLMProvider, LLMOptions, LLMResponse } from './llm-provider.interface.js';
import { OllamaConnectionError, ModelNotFoundError, LLMGenerationError, LLMTimeoutError } from '../errors/llm-errors.js';

export class OllamaProvider implements LLMProvider {
  private client: Ollama;
  private model: string;
  private host: string;

  constructor() {
    this.host = process.env.OLLAMA_HOST || 'http://localhost:11434';
    this.model = process.env.OLLAMA_MODEL || 'llama3.2:latest';
    this.client = new Ollama({ host: this.host });
  }

  async generate(prompt: string, options?: LLMOptions): Promise<LLMResponse> {
    const defaultTimeout = parseInt(process.env.LLM_TIMEOUT_MS || '30000', 10);
    const timeoutMs = options?.timeoutMs ?? defaultTimeout;

    // Note: The ollama library (v0.6.2) only supports aborting all ongoing requests via client.abort(),
    // not individual requests. For non-streaming requests, there's no per-request abort control.
    // The timeout will reject the promise but the underlying Ollama request continues until completion.
    try {
      const response = await this.withTimeout(
        this.client.generate({
          model: this.model,
          prompt,
          options: {
            temperature: options?.temperature ?? 0.7,
            num_predict: options?.maxTokens,
          },
        }),
        timeoutMs
      );

      return {
        text: response.response,
        tokensUsed: response.eval_count || 0,
        model: this.model,
        metadata: {
          totalDuration: response.total_duration,
          loadDuration: response.load_duration,
          promptEvalCount: response.prompt_eval_count,
        },
      };
    } catch (error) {
      // Re-throw timeout errors as-is
      if (error instanceof LLMTimeoutError) {
        throw error;
      }

      if (error instanceof Error) {
        // Note: Error detection relies on string matching as the ollama library doesn't provide
        // structured error types or codes. This may be fragile if error messages change in future versions.

        // Connection errors
        if (error.message.includes('ECONNREFUSED') || error.message.includes('fetch failed')) {
          throw new OllamaConnectionError(
            `Cannot connect to Ollama server at ${this.host}. Please ensure Ollama is running with 'ollama serve' or check OLLAMA_HOST environment variable.`,
            this.host,
            error
          );
        }

        // Model not found
        if (error.message.includes('model') && error.message.includes('not found')) {
          throw new ModelNotFoundError(
            `Model '${this.model}' is not available. Run 'ollama pull ${this.model}' to download it, or update OLLAMA_MODEL to use a different model.`,
            this.model,
            error
          );
        }

        throw new LLMGenerationError(
          `Ollama generation failed: ${error.message}. Check model compatibility and Ollama server logs.`,
          error
        );
      }
      throw error;
    }
  }

  getProviderName(): string {
    return 'ollama';
  }

  getModel(): string {
    return this.model;
  }

  private withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    let timeoutHandle: NodeJS.Timeout;
    const timeoutPromise = new Promise<T>((_, reject) => {
      timeoutHandle = setTimeout(
        () => reject(new LLMTimeoutError(`Request timed out after ${timeoutMs}ms`, timeoutMs)),
        timeoutMs
      );
    });

    return Promise.race([promise, timeoutPromise]).finally(() => {
      clearTimeout(timeoutHandle);
    });
  }
}
