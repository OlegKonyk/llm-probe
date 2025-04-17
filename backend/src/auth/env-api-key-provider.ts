import { createHash, timingSafeEqual } from 'crypto';
import type { ApiKeyProvider, ApiKeyValidationResult } from './api-key-provider.interface.js';
import { logger } from '../utils/logger.js';

export class EnvApiKeyProvider implements ApiKeyProvider {
  private apiKeyHash: Buffer | null = null;

  async initialize(): Promise<void> {
    const apiKey = process.env.API_KEY;

    if (!apiKey) {
      throw new Error(
        'API_KEY environment variable is required when using env API key provider'
      );
    }

    this.apiKeyHash = createHash('sha256').update(apiKey).digest();

    logger.info('Environment API key provider initialized', {
      provider: 'env',
      keyLength: apiKey.length,
    });
  }

  async validateApiKey(apiKey: string): Promise<ApiKeyValidationResult> {
    if (!this.apiKeyHash) {
      logger.error('API key provider not initialized', undefined, {
        provider: 'env',
      });
      return {
        valid: false,
        error: 'API key provider not initialized',
      };
    }

    if (!apiKey) {
      return {
        valid: false,
        error: 'API key is required',
      };
    }

    try {
      const providedKeyHash = createHash('sha256').update(apiKey).digest();
      const isValid = timingSafeEqual(this.apiKeyHash, providedKeyHash);

      if (isValid) {
        return {
          valid: true,
          keyId: 'env-api-key',
        };
      } else {
        logger.warn('Invalid API key attempt', {
          provider: 'env',
          keyPrefix: apiKey.substring(0, 8),
        });
        return {
          valid: false,
          error: 'Invalid API key',
        };
      }
    } catch (error) {
      logger.error('API key validation error', error as Error, {
        provider: 'env',
      });
      return {
        valid: false,
        error: 'Internal validation error',
      };
    }
  }

  getProviderName(): string {
    return 'env';
  }
}
