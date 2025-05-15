import type { ApiKeyProvider } from './api-key-provider.interface.js';
import { EnvApiKeyProvider } from './env-api-key-provider.js';
import { SecretsManagerApiKeyProvider } from './secrets-manager-api-key-provider.js';
import { logger } from '../utils/logger.js';

type ProviderType = 'env' | 'secrets-manager';

export class ApiKeyFactory {
  private static instance: ApiKeyProvider | null = null;
  private static initialized: boolean = false;

  static async getProvider(): Promise<ApiKeyProvider> {
    if (this.instance && this.initialized) {
      return this.instance;
    }

    const providerType = (process.env.API_KEY_PROVIDER || 'env').toLowerCase() as ProviderType;

    switch (providerType) {
      case 'env':
        logger.info('Initializing environment API key provider', {
          provider: 'env',
        });
        this.instance = new EnvApiKeyProvider();
        break;

      case 'secrets-manager':
        logger.info('Initializing Secrets Manager API key provider', {
          provider: 'secrets-manager',
          secretName: process.env.API_KEYS_SECRET_NAME,
        });
        this.instance = new SecretsManagerApiKeyProvider();
        break;

      default:
        throw new Error(
          `Invalid API_KEY_PROVIDER: "${providerType}". Valid options: "env", "secrets-manager"`
        );
    }

    await this.instance.initialize();
    this.initialized = true;

    return this.instance;
  }

  static reset(): void {
    this.instance = null;
    this.initialized = false;
  }
}
