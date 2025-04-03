import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { TokenCounter } from '../../../backend/src/utils/token-counter.js';

describe('TokenCounter Fallback', () => {
  describe('when tiktoken fails to load', () => {
    it('should use approximation for English text', () => {
      const counter = new TokenCounter();
      (counter as any).encoder = null;

      const text = 'Hello world this is a test';
      const tokens = counter.countTokens(text);

      const wordCount = text.split(/\s+/).length;
      const expected = Math.ceil(wordCount * 1.3);
      expect(tokens).toBe(expected);
    });

    it('should use character-based approximation for non-space languages', () => {
      const counter = new TokenCounter();
      (counter as any).encoder = null;

      const chineseText = '这是一个测试文本用于验证令牌计数器的回退机制';
      const tokens = counter.countTokens(chineseText);

      const charCount = chineseText.trim().length;
      // CJK languages: ~1 token per character in cl100k_base
      const expected = Math.ceil(charCount * 1.0);
      expect(tokens).toBe(expected);
    });

    it('should use character-based approximation for Japanese text', () => {
      const counter = new TokenCounter();
      (counter as any).encoder = null;

      const japaneseText = 'これはトークンカウンターのテストです';
      const tokens = counter.countTokens(japaneseText);

      const charCount = japaneseText.trim().length;
      // CJK languages: ~1 token per character in cl100k_base
      const expected = Math.ceil(charCount * 1.0);
      expect(tokens).toBe(expected);
    });

    it('should handle mixed English and CJK text', () => {
      const counter = new TokenCounter();
      (counter as any).encoder = null;

      const mixedText = 'Hello 世界 test テスト';
      const tokens = counter.countTokens(mixedText);

      expect(tokens).toBeGreaterThan(0);
      expect(tokens).toBeLessThan(100);
    });

    it('should return 0 for empty string', () => {
      const counter = new TokenCounter();
      (counter as any).encoder = null;

      const tokens = counter.countTokens('');
      expect(tokens).toBe(0);
    });

    it('should return 0 for whitespace-only string', () => {
      const counter = new TokenCounter();
      (counter as any).encoder = null;

      const tokens = counter.countTokens('   ');
      expect(tokens).toBe(0);
    });
  });

  describe('fallback detection logic', () => {
    it('should detect Chinese text using Unicode ranges', () => {
      const counter = new TokenCounter();
      (counter as any).encoder = null;

      const text = '这是一个很长的测试文本用于验证令牌计数器的回退机制';
      const tokens = counter.countTokens(text);

      const charCount = text.length;
      // CJK languages: ~1 token per character in cl100k_base
      expect(tokens).toBe(Math.ceil(charCount * 1.0));
    });

    it('should use word-based approximation for normal English', () => {
      const counter = new TokenCounter();
      (counter as any).encoder = null;

      const text = 'This is a normal English sentence';
      const tokens = counter.countTokens(text);

      const wordCount = text.split(/\s+/).length;
      expect(tokens).toBe(Math.ceil(wordCount * 1.3));
    });

    it('should NOT treat long German words as CJK', () => {
      const counter = new TokenCounter();
      (counter as any).encoder = null;

      // Long German word (>15 chars per word) - should use word-based approximation
      const text = 'Donaudampfschifffahrtsgesellschaftskapitän';
      const tokens = counter.countTokens(text);

      const wordCount = text.split(/\s+/).length; // 1 word
      expect(tokens).toBe(Math.ceil(wordCount * 1.3)); // 2 tokens, not 43
    });

    it('should NOT treat base64 strings as CJK', () => {
      const counter = new TokenCounter();
      (counter as any).encoder = null;

      const base64 = 'SGVsbG8gV29ybGQhIFRoaXMgaXMgYSB0ZXN0IG1lc3NhZ2U=';
      const tokens = counter.countTokens(base64);

      const wordCount = base64.split(/\s+/).length; // 1 word
      // Should use word-based approximation, not per-character
      expect(tokens).toBe(Math.ceil(wordCount * 1.3));
      expect(tokens).toBeLessThan(10); // Not ~48 tokens
    });

    it('should NOT treat URLs as CJK', () => {
      const counter = new TokenCounter();
      (counter as any).encoder = null;

      const url = 'https://example.com/api/v1/users/authentication-token';
      const tokens = counter.countTokens(url);

      const wordCount = url.split(/\s+/).length; // 1 word
      expect(tokens).toBe(Math.ceil(wordCount * 1.3));
      expect(tokens).toBeLessThan(10); // Not ~52 tokens
    });
  });

  describe('regression tests: fallback vs tiktoken', () => {
    it('should approximate Chinese text within 30% of tiktoken', () => {
      const counter = new TokenCounter();
      const chineseText = '这是一个测试文本用于验证令牌计数器的回退机制';

      // Real tiktoken count with encoder enabled
      const actualTokens = counter.countTokens(chineseText);

      // Fallback approximation (disable encoder)
      (counter as any).encoder = null;
      const fallbackTokens = counter.countTokens(chineseText);

      // Fallback should be within 30% of actual (approximations won't be perfect)
      const ratio = fallbackTokens / actualTokens;
      expect(ratio).toBeGreaterThan(0.7);
      expect(ratio).toBeLessThan(1.3);

      counter.free();
    });

    it('should approximate Japanese text within 30% of tiktoken', () => {
      const counter = new TokenCounter();
      const japaneseText = 'これはトークンカウンターのテストです';

      const actualTokens = counter.countTokens(japaneseText);

      (counter as any).encoder = null;
      const fallbackTokens = counter.countTokens(japaneseText);

      const ratio = fallbackTokens / actualTokens;
      expect(ratio).toBeGreaterThan(0.7);
      expect(ratio).toBeLessThan(1.3);

      counter.free();
    });

    it('should not severely undercount CJK text', () => {
      const counter = new TokenCounter();

      // The exact text from the review feedback
      const chineseText = '这是一个测试文本用于验证令牌计数器的回退机制';

      const actualTokens = counter.countTokens(chineseText);

      (counter as any).encoder = null;
      const fallbackTokens = counter.countTokens(chineseText);

      // Fallback must not undercount by more than 50%
      expect(fallbackTokens).toBeGreaterThan(actualTokens * 0.5);

      counter.free();
    });
  });
});
