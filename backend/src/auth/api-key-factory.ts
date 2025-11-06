/**
 * API Key Provider Factory
 *
 * Creates the appropriate API key provider based on environment configuration.
 * Implements singleton pattern to reuse provider instance.
 *
 * Provider Selection:
 * - API_KEY_PROVIDER=env (default) → EnvApiKeyProvider (local development)
 * - API_KEY_PROVIDER=secrets-manager → SecretsManagerApiKeyProvider (production)
 *
 * Usage:
 * ```typescript
 * import { ApiKeyFactory } from './auth/api-key-factory';
 *
 * const provider = await ApiKeyFactory.getProvider();
 * const result = await provider.validateApiKey('sk_...');
 * ```
 */

import type { ApiKeyProvider } from './api-key-provider.interface.js';
import { EnvApiKeyProvider } from './env-api-key-provider.js';
import { SecretsManagerApiKeyProvider } from './secrets-manager-api-key-provider.js';
import { logger } from '../utils/logger.js';

type ProviderType = 'env' | 'secrets-manager';

export class ApiKeyFactory {
  private static instance: ApiKeyProvider | null = null;
  private static initialized: boolean = false;

  /**
   * Get the configured API key provider
   *
   * Returns a singleton instance based on API_KEY_PROVIDER environment variable.
   * Defaults to env provider if not specified (safe for local development).
   *
   * The provider is automatically initialized on first call.
   *
   * @returns Initialized ApiKeyProvider instance
   * @throws Error if provider type is invalid or initialization fails
   */
  static async getProvider(): Promise<ApiKeyProvider> {
    // Return cached instance if available
    if (this.instance && this.initialized) {
      return this.instance;
    }

    // Read provider type from environment
    const providerType = (process.env.API_KEY_PROVIDER || 'env').toLowerCase() as ProviderType;

    // Create provider based on type
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

    // Initialize the provider
    await this.instance.initialize();
    this.initialized = true;

    return this.instance;
  }

  /**
   * Reset the singleton instance (useful for testing)
   */
  static reset(): void {
    this.instance = null;
    this.initialized = false;
  }
}
