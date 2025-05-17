import type { LLMProvider } from './llm-provider.interface.js';
import { OllamaProvider } from './ollama-provider.js';
import { BedrockProvider } from './bedrock-provider.js';
import { logger } from '../utils/logger.js';

type ProviderType = 'ollama' | 'bedrock';

// Factory for creating LLM providers based on environment config
export class LLMFactory {
  private static instance: LLMProvider | null = null;

  static getProvider(): LLMProvider {
    if (this.instance) {
      return this.instance;
    }

    const providerType = (process.env.LLM_PROVIDER || 'ollama').toLowerCase() as ProviderType;

    switch (providerType) {
      case 'ollama':
        logger.info('Initializing Ollama LLM provider', {
          provider: 'ollama',
          host: process.env.OLLAMA_HOST || 'http://localhost:11434',
          model: process.env.OLLAMA_MODEL || 'llama3.2:latest',
        });
        this.instance = new OllamaProvider();
        break;

      case 'bedrock':
        logger.info('Initializing Bedrock LLM provider', {
          provider: 'bedrock',
          region: process.env.AWS_REGION || 'us-east-2',
          model: process.env.BEDROCK_MODEL || 'us.amazon.nova-lite-v1:0',
        });
        this.instance = new BedrockProvider();
        break;

      default:
        throw new Error(
          `Invalid LLM_PROVIDER: "${providerType}". Valid options: "ollama", "bedrock"`
        );
    }

    return this.instance;
  }

  static reset(): void {
    this.instance = null;
  }
}
