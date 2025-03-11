export class OllamaConnectionError extends Error {
  constructor(
    message: string,
    public readonly host: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'OllamaConnectionError';
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ModelNotFoundError extends Error {
  constructor(
    message: string,
    public readonly model: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'ModelNotFoundError';
    Error.captureStackTrace(this, this.constructor);
  }
}

export class LLMGenerationError extends Error {
  constructor(
    message: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'LLMGenerationError';
    Error.captureStackTrace(this, this.constructor);
  }
}

export class LLMTimeoutError extends Error {
  constructor(
    message: string,
    public readonly timeoutMs: number,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'LLMTimeoutError';
    Error.captureStackTrace(this, this.constructor);
  }
}
