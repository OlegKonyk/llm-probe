import { get_encoding, TiktokenEncoding } from 'tiktoken';
import { logger } from './logger.js';

const AVG_TOKENS_PER_WORD = 1.3;

export class TokenCounter {
  private encoder: ReturnType<typeof get_encoding> | null = null;
  private encodingName: TiktokenEncoding = 'cl100k_base';

  constructor(encoding: TiktokenEncoding = 'cl100k_base') {
    this.encodingName = encoding;
    this.initializeEncoder();
  }

  private initializeEncoder(): void {
    try {
      this.encoder = get_encoding(this.encodingName);
      logger.info('Token counter initialized', {
        encoding: this.encodingName,
      });
    } catch (error) {
      logger.warn('Failed to initialize tiktoken encoder, falling back to approximation', {
        error: error instanceof Error ? error.message : String(error),
        encoding: this.encodingName,
      });
      this.encoder = null;
    }
  }

  countTokens(text: string): number {
    if (!text || text.length === 0) {
      return 0;
    }

    // Try tiktoken first
    if (this.encoder) {
      try {
        const tokens = this.encoder.encode(text);
        return tokens.length;
      } catch (error) {
        logger.warn('tiktoken encoding failed, using approximation', {
          error: error instanceof Error ? error.message : String(error),
          textLength: text.length,
        });
        this.encoder = null;
      }
    }

    // Fallback to word-based approximation
    return this.approximateTokens(text);
  }

  private approximateTokens(text: string): number {
    const trimmed = text.trim();
    if (trimmed.length === 0) {
      return 0;
    }
    const words = trimmed.split(/\s+/).length;
    return Math.ceil(words * AVG_TOKENS_PER_WORD);
  }

  free(): void {
    if (this.encoder) {
      this.encoder.free();
      this.encoder = null;
    }
  }
}

let globalCounter: TokenCounter | null = null;

export function getTokenCounter(): TokenCounter {
  if (!globalCounter) {
    globalCounter = new TokenCounter();
  }
  return globalCounter;
}

export function countTokens(text: string): number {
  const counter = getTokenCounter();
  return counter.countTokens(text);
}
