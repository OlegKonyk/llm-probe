// API key validation interface for different provider strategies

export interface ApiKeyValidationResult {
  valid: boolean;
  keyId?: string;
  error?: string;
}

export interface ApiKeyProvider {
  validateApiKey(apiKey: string): Promise<ApiKeyValidationResult>;
  getProviderName(): string;
  initialize(): Promise<void>;
}
