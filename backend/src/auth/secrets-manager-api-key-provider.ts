/**
 * AWS Secrets Manager API Key Provider
 *
 * Production-grade API key validation using AWS Secrets Manager. Supports
 * multiple API keys with automatic rotation and caching.
 *
 * Features:
 * - Multiple API keys (for different clients/services)
 * - Automatic key rotation via AWS Secrets Manager
 * - In-memory caching with TTL (reduces AWS API calls)
 * - Timing-safe comparison
 * - Per-key rate limiting support
 *
 * Setup:
 * 1. Create secret in AWS Secrets Manager (JSON format)
 * 2. Configure AWS credentials (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)
 * 3. Set API_KEY_PROVIDER=secrets-manager
 * 4. Set API_KEYS_SECRET_NAME (name of the secret)
 *
 * Secret Format (JSON):
 * {
 *   "keys": [
 *     {
 *       "id": "client-1",
 *       "key": "sk_live_abc123...",
 *       "description": "Production client 1"
 *     },
 *     {
 *       "id": "client-2",
 *       "key": "sk_live_xyz789...",
 *       "description": "Production client 2"
 *     }
 *   ]
 * }
 *
 * Environment Variables:
 * - AWS_REGION: AWS region (required, e.g., us-east-1)
 * - AWS_ACCESS_KEY_ID: AWS access key (required)
 * - AWS_SECRET_ACCESS_KEY: AWS secret key (required)
 * - API_KEYS_SECRET_NAME: Name of the secret (required)
 * - API_KEYS_CACHE_TTL_MS: Cache TTL in ms (optional, default: 300000 = 5 min)
 */

import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from '@aws-sdk/client-secrets-manager';
import { createHash, timingSafeEqual } from 'crypto';
import type { ApiKeyProvider, ApiKeyValidationResult } from './api-key-provider.interface.js';
import { logger } from '../utils/logger.js';

interface ApiKeyEntry {
  id: string;
  key: string;
  description?: string;
}

interface ApiKeysSecret {
  keys: ApiKeyEntry[];
}

interface CachedKey {
  id: string;
  keyHash: Buffer;
  description?: string;
}

const DEFAULT_CACHE_TTL_MS = 300000; // 5 minutes

export class SecretsManagerApiKeyProvider implements ApiKeyProvider {
  private client: SecretsManagerClient;
  private secretName: string;
  private cacheTtlMs: number;
  private cachedKeys: CachedKey[] = [];
  private lastFetchTime: number = 0;

  /**
   * Creates a new SecretsManagerApiKeyProvider
   *
   * @param secretName - Name of the secret in AWS Secrets Manager (optional, from env)
   * @param region - AWS region (optional, from env or us-east-1)
   * @param cacheTtlMs - Cache TTL in ms (optional, default: 5 minutes)
   */
  constructor(secretName?: string, region?: string, cacheTtlMs?: number) {
    const awsRegion = region || process.env.AWS_REGION || 'us-east-1';
    this.secretName = secretName || process.env.API_KEYS_SECRET_NAME || '';
    this.cacheTtlMs = cacheTtlMs || parseInt(process.env.API_KEYS_CACHE_TTL_MS || String(DEFAULT_CACHE_TTL_MS), 10);

    if (!this.secretName) {
      throw new Error(
        'API_KEYS_SECRET_NAME environment variable is required when using secrets-manager API key provider'
      );
    }

    // Validate AWS credentials are present
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
      throw new Error(
        'AWS credentials not configured. Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY.'
      );
    }

    this.client = new SecretsManagerClient({
      region: awsRegion,
    });
  }

  /**
   * Initialize the provider
   *
   * Loads API keys from AWS Secrets Manager on startup.
   */
  async initialize(): Promise<void> {
    await this.loadApiKeys();

    logger.info('Secrets Manager API key provider initialized', {
      provider: 'secrets-manager',
      secretName: this.secretName,
      keyCount: this.cachedKeys.length,
      cacheTtlMs: this.cacheTtlMs,
    });
  }

  /**
   * Load API keys from AWS Secrets Manager
   *
   * Fetches the secret, parses the JSON, and caches the key hashes.
   * Uses timing-safe hashing for comparison.
   */
  private async loadApiKeys(): Promise<void> {
    try {
      const command = new GetSecretValueCommand({
        SecretId: this.secretName,
      });

      const response = await this.client.send(command);

      if (!response.SecretString) {
        throw new Error('Secret value is empty');
      }

      const secret: ApiKeysSecret = JSON.parse(response.SecretString);

      if (!Array.isArray(secret.keys)) {
        throw new Error('Invalid secret format: "keys" must be an array');
      }

      // Cache key hashes for timing-safe comparison
      this.cachedKeys = secret.keys.map((entry) => ({
        id: entry.id,
        keyHash: createHash('sha256').update(entry.key).digest(),
        description: entry.description,
      }));

      this.lastFetchTime = Date.now();

      logger.info('API keys loaded from Secrets Manager', {
        provider: 'secrets-manager',
        secretName: this.secretName,
        keyCount: this.cachedKeys.length,
      });
    } catch (error) {
      logger.error('Failed to load API keys from Secrets Manager', error as Error, {
        provider: 'secrets-manager',
        secretName: this.secretName,
      });
      throw error;
    }
  }

  /**
   * Refresh cached keys if TTL has expired
   */
  private async refreshCacheIfNeeded(): Promise<void> {
    const now = Date.now();
    const cacheAge = now - this.lastFetchTime;

    if (cacheAge > this.cacheTtlMs) {
      logger.info('API key cache expired, refreshing', {
        provider: 'secrets-manager',
        cacheAge,
        cacheTtlMs: this.cacheTtlMs,
      });
      await this.loadApiKeys();
    }
  }

  /**
   * Validate an API key
   *
   * Uses timing-safe comparison against all cached keys.
   * Automatically refreshes cache if TTL has expired.
   *
   * @param apiKey - The API key to validate
   * @returns Validation result with key ID for rate limiting
   */
  async validateApiKey(apiKey: string): Promise<ApiKeyValidationResult> {
    if (!apiKey) {
      return {
        valid: false,
        error: 'API key is required',
      };
    }

    try {
      // Refresh cache if needed
      await this.refreshCacheIfNeeded();

      // Compute hash of provided key
      const providedKeyHash = createHash('sha256').update(apiKey).digest();

      // Check against all cached keys (timing-safe)
      for (const cachedKey of this.cachedKeys) {
        if (timingSafeEqual(cachedKey.keyHash, providedKeyHash)) {
          return {
            valid: true,
            keyId: cachedKey.id,
          };
        }
      }

      // No match found
      logger.warn('Invalid API key attempt', {
        provider: 'secrets-manager',
        keyPrefix: apiKey.substring(0, 8),
      });

      return {
        valid: false,
        error: 'Invalid API key',
      };
    } catch (error) {
      logger.error('API key validation error', error as Error, {
        provider: 'secrets-manager',
      });
      return {
        valid: false,
        error: 'Internal validation error',
      };
    }
  }

  /**
   * Get the provider name
   */
  getProviderName(): string {
    return 'secrets-manager';
  }
}
