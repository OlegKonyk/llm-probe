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

const DEFAULT_CACHE_TTL_MS = 300000;

export class SecretsManagerApiKeyProvider implements ApiKeyProvider {
  private client: SecretsManagerClient;
  private secretName: string;
  private cacheTtlMs: number;
  private cachedKeys: CachedKey[] = [];
  private lastFetchTime: number = 0;

  constructor(secretName?: string, region?: string, cacheTtlMs?: number) {
    const awsRegion = region || process.env.AWS_REGION || 'us-east-1';
    this.secretName = secretName || process.env.API_KEYS_SECRET_NAME || '';
    this.cacheTtlMs = cacheTtlMs || parseInt(process.env.API_KEYS_CACHE_TTL_MS || String(DEFAULT_CACHE_TTL_MS), 10);

    if (!this.secretName) {
      throw new Error(
        'API_KEYS_SECRET_NAME environment variable is required when using secrets-manager API key provider'
      );
    }

    // AWS SDK will automatically use credentials from:
    // 1. Environment variables (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)
    // 2. AWS SSO (configured via aws configure sso)
    // 3. IAM roles (in production on ECS/EC2)
    // 4. Instance metadata service
    this.client = new SecretsManagerClient({
      region: awsRegion,
    });
  }

  async initialize(): Promise<void> {
    await this.loadApiKeys();

    logger.info('Secrets Manager API key provider initialized', {
      provider: 'secrets-manager',
      secretName: this.secretName,
      keyCount: this.cachedKeys.length,
      cacheTtlMs: this.cacheTtlMs,
    });
  }

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

  async validateApiKey(apiKey: string): Promise<ApiKeyValidationResult> {
    if (!apiKey) {
      return {
        valid: false,
        error: 'API key is required',
      };
    }

    try {
      await this.refreshCacheIfNeeded();

      const providedKeyHash = createHash('sha256').update(apiKey).digest();

      for (const cachedKey of this.cachedKeys) {
        if (timingSafeEqual(cachedKey.keyHash, providedKeyHash)) {
          return {
            valid: true,
            keyId: cachedKey.id,
          };
        }
      }

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

  getProviderName(): string {
    return 'secrets-manager';
  }
}
