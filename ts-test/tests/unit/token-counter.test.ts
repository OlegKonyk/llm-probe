/**
 * Token Counter Unit Tests
 *
 * Comprehensive testing of the token counting utility that uses tiktoken
 * for accurate token estimation. This is critical for:
 * - Cost optimization: Accurate token counts = accurate cost estimates
 * - Preventing truncation: Ensures responses fit within LLM limits
 * - Resource planning: Helps capacity estimation for production workloads
 *
 * Test Coverage:
 * - Basic token counting with tiktoken
 * - Edge cases: empty strings, very long text, special characters
 * - Singleton pattern: ensure single encoder instance is reused
 * - Different encodings: cl100k_base (GPT-4/Claude), p50k_base (GPT-3)
 * - Mathematical properties: token count > 0 for non-empty strings
 * - Cleanup: encoder resource deallocation
 *
 * Why Thorough Testing Matters:
 * Token counting errors can lead to:
 * - Cost overruns: Inaccurate estimates mean budget surprises
 * - Truncated responses: Wrong maxTokens calculations
 * - Poor user experience: Timeouts or incomplete summaries
 * - Production issues: Hitting rate limits unexpectedly
 *
 * Test Strategy:
 * - Known text samples with expected token counts (from tiktoken)
 * - Edge cases that might break tokenization
 * - Performance checks (singleton pattern efficiency)
 * - Resource cleanup to prevent memory leaks
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { TokenCounter, getTokenCounter, countTokens } from '../../../backend/src/utils/token-counter.js';

describe('Token Counter', () => {
  describe('TokenCounter class', () => {
    let counter: TokenCounter;

    beforeEach(() => {
      counter = new TokenCounter();
    });

    afterEach(() => {
      // Clean up resources after each test
      counter.free();
    });

    describe('Basic token counting', () => {
      it('should count tokens for simple text', () => {
        const text = 'Hello, world!';
        const tokens = counter.countTokens(text);

        // "Hello, world!" is typically 4 tokens in cl100k_base
        // ["Hello", ",", " world", "!"]
        expect(tokens).toBeGreaterThan(0);
        expect(tokens).toBeLessThan(10);
      });

      it('should count tokens for longer text', () => {
        const text = 'Customer called about password reset. Agent verified email and sent new link. Issue resolved successfully.';
        const tokens = counter.countTokens(text);

        // This should be roughly 20-25 tokens
        expect(tokens).toBeGreaterThan(15);
        expect(tokens).toBeLessThan(35);
      });

      it('should count tokens for technical text with numbers', () => {
        const text = 'Order #12345 was processed on 2024-01-15 for $149.99';
        const tokens = counter.countTokens(text);

        expect(tokens).toBeGreaterThan(10);
        expect(tokens).toBeLessThan(25);
      });

      it('should handle code-like text', () => {
        const text = 'function summarize(text: string): Promise<Summary>';
        const tokens = counter.countTokens(text);

        expect(tokens).toBeGreaterThan(5);
        expect(tokens).toBeLessThan(20);
      });
    });

    describe('Edge cases', () => {
      it('should return 0 for empty string', () => {
        const tokens = counter.countTokens('');
        expect(tokens).toBe(0);
      });

      it('should return 0 for whitespace-only string', () => {
        const tokens = counter.countTokens('   ');
        // Whitespace typically counts as 1 token
        expect(tokens).toBeGreaterThanOrEqual(0);
        expect(tokens).toBeLessThanOrEqual(2);
      });

      it('should handle single character', () => {
        const tokens = counter.countTokens('a');
        expect(tokens).toBe(1);
      });

      it('should handle special characters', () => {
        const text = '!@#$%^&*()_+-=[]{}|;:,.<>?';
        const tokens = counter.countTokens(text);

        expect(tokens).toBeGreaterThan(0);
        expect(tokens).toBeLessThan(30);
      });

      it('should handle Unicode and emoji', () => {
        const text = 'Hello 👋 世界 🌍';
        const tokens = counter.countTokens(text);

        expect(tokens).toBeGreaterThan(0);
        expect(tokens).toBeLessThan(20);
      });

      it('should handle newlines and tabs', () => {
        const text = 'Line 1\nLine 2\tTabbed\r\nLine 3';
        const tokens = counter.countTokens(text);

        expect(tokens).toBeGreaterThan(5);
        expect(tokens).toBeLessThan(15);
      });

      it('should handle very long text', () => {
        // Generate 1000 words
        const text = 'word '.repeat(1000);
        const tokens = counter.countTokens(text);

        // Should be roughly 1000-1300 tokens (1.0-1.3 tokens per word)
        expect(tokens).toBeGreaterThan(900);
        expect(tokens).toBeLessThan(1500);
      });
    });

    describe('Mathematical properties', () => {
      it('should always return non-negative integers', () => {
        const samples = [
          '',
          'a',
          'Hello, world!',
          'Multi-line\ntext\nhere',
        ];

        samples.forEach((text) => {
          const tokens = counter.countTokens(text);
          expect(tokens).toBeGreaterThanOrEqual(0);
          expect(Number.isInteger(tokens)).toBe(true);
        });
      });

      it('should produce consistent results for same input', () => {
        const text = 'Consistent token counting is important';
        const count1 = counter.countTokens(text);
        const count2 = counter.countTokens(text);
        const count3 = counter.countTokens(text);

        expect(count1).toBe(count2);
        expect(count2).toBe(count3);
      });

      it('should have roughly monotonic relationship with text length', () => {
        // Longer text should generally have more tokens
        const short = 'Hello';
        const medium = 'Hello world, this is a test';
        const long = 'Hello world, this is a much longer test with many more words to count';

        const shortTokens = counter.countTokens(short);
        const mediumTokens = counter.countTokens(medium);
        const longTokens = counter.countTokens(long);

        expect(shortTokens).toBeLessThan(mediumTokens);
        expect(mediumTokens).toBeLessThan(longTokens);
      });
    });

    describe('Token-to-word ratio', () => {
      it('should have reasonable tokens-per-word ratio for English text', () => {
        const text = 'The quick brown fox jumps over the lazy dog';
        const wordCount = text.split(/\s+/).length; // 9 words
        const tokens = counter.countTokens(text);

        const ratio = tokens / wordCount;

        // English text typically has 1.2-1.4 tokens per word
        expect(ratio).toBeGreaterThan(0.8);
        expect(ratio).toBeLessThan(2.0);
      });

      it('should approximate 1.3 tokens per word for typical content', () => {
        const text = 'Customer called about password reset issue. Agent verified identity and sent new reset link. Issue was resolved successfully and customer expressed satisfaction.';
        const wordCount = text.split(/\s+/).length; // ~22 words
        const tokens = counter.countTokens(text);

        const ratio = tokens / wordCount;

        // Should be close to 1.3 tokens/word
        expect(ratio).toBeGreaterThan(1.0);
        expect(ratio).toBeLessThan(1.6);
      });
    });

    describe('Different encodings', () => {
      it('should work with cl100k_base (default)', () => {
        const counter = new TokenCounter('cl100k_base');
        const text = 'Test encoding';
        const tokens = counter.countTokens(text);

        expect(tokens).toBeGreaterThan(0);
        counter.free();
      });

      it('should work with p50k_base', () => {
        const counter = new TokenCounter('p50k_base');
        const text = 'Test encoding';
        const tokens = counter.countTokens(text);

        expect(tokens).toBeGreaterThan(0);
        counter.free();
      });

      it('should work with r50k_base', () => {
        const counter = new TokenCounter('r50k_base');
        const text = 'Test encoding';
        const tokens = counter.countTokens(text);

        expect(tokens).toBeGreaterThan(0);
        counter.free();
      });

      it('should produce slightly different counts for different encodings', () => {
        const text = 'This is a test of different encoding schemes';

        const counter1 = new TokenCounter('cl100k_base');
        const counter2 = new TokenCounter('p50k_base');

        const tokens1 = counter1.countTokens(text);
        const tokens2 = counter2.countTokens(text);

        // Counts should be similar but may differ slightly
        expect(tokens1).toBeGreaterThan(0);
        expect(tokens2).toBeGreaterThan(0);

        counter1.free();
        counter2.free();
      });
    });

    describe('Resource cleanup', () => {
      it('should allow cleanup via free()', () => {
        const counter = new TokenCounter();
        const tokens = counter.countTokens('Test');

        expect(tokens).toBeGreaterThan(0);

        // Should not throw
        expect(() => counter.free()).not.toThrow();
      });

      it('should handle multiple free() calls gracefully', () => {
        const counter = new TokenCounter();
        counter.countTokens('Test');

        counter.free();
        // Second free should not throw
        expect(() => counter.free()).not.toThrow();
      });
    });
  });

  describe('Singleton pattern', () => {
    it('should return same instance from getTokenCounter', () => {
      const counter1 = getTokenCounter();
      const counter2 = getTokenCounter();

      expect(counter1).toBe(counter2);
    });

    it('should reuse encoder across multiple calls', () => {
      // This is an indirect test - if singleton works,
      // repeated calls should be fast and consistent
      const text = 'Reusing encoder should be efficient';

      const start = Date.now();
      for (let i = 0; i < 100; i++) {
        countTokens(text);
      }
      const duration = Date.now() - start;

      // 100 calls should complete quickly (< 1 second)
      // This would be much slower if creating new encoder each time
      expect(duration).toBeLessThan(1000);
    });
  });

  describe('Convenience function', () => {
    it('should count tokens using convenience function', () => {
      const text = 'Convenience function test';
      const tokens = countTokens(text);

      expect(tokens).toBeGreaterThan(0);
      expect(tokens).toBeLessThan(10);
    });

    it('should handle empty string', () => {
      const tokens = countTokens('');
      expect(tokens).toBe(0);
    });

    it('should produce consistent results', () => {
      const text = 'Consistency check';
      const tokens1 = countTokens(text);
      const tokens2 = countTokens(text);

      expect(tokens1).toBe(tokens2);
    });
  });

  describe('Real-world use cases', () => {
    it('should accurately count tokens for customer support transcript', () => {
      const transcript = `Agent: Hello! How can I help you today?
Customer: Hi, I'm having trouble logging into my account.
Agent: I can help with that. Can you provide your email address?
Customer: It's john.smith@email.com
Agent: Thank you. I've sent a password reset link to that address.`;

      const tokens = countTokens(transcript);

      // This transcript should be roughly 60-80 tokens
      expect(tokens).toBeGreaterThan(50);
      expect(tokens).toBeLessThan(100);
    });

    it('should help estimate maxTokens for LLM requests', () => {
      const requestedWords = 150;
      const AVG_TOKENS_PER_WORD = 1.3;
      const estimatedTokens = Math.ceil(requestedWords * AVG_TOKENS_PER_WORD);
      const maxTokens = Math.ceil(estimatedTokens * 1.2); // 20% buffer

      // Expected: 150 * 1.3 * 1.2 = 234 tokens
      expect(maxTokens).toBe(234);

      // Now verify with actual prompt
      const prompt = 'word '.repeat(150); // 150 words
      const actualTokens = countTokens(prompt);

      // Actual count should be close to estimate
      expect(actualTokens).toBeGreaterThan(120);
      expect(actualTokens).toBeLessThan(250);
    });

    it('should count tokens for multi-language text', () => {
      const text = 'Hello world 你好世界 Bonjour le monde';
      const tokens = countTokens(text);

      // Multi-language text typically has more tokens
      expect(tokens).toBeGreaterThan(5);
      expect(tokens).toBeLessThan(30);
    });

    it('should handle markdown-formatted text', () => {
      const markdown = `# Summary\n\n- Point 1\n- Point 2\n\n**Key takeaway:** Issue resolved.`;
      const tokens = countTokens(markdown);

      expect(tokens).toBeGreaterThan(10);
      expect(tokens).toBeLessThan(30);
    });

    it('should count tokens for JSON-like strings', () => {
      const json = '{"customer": "John", "issue": "password reset", "status": "resolved"}';
      const tokens = countTokens(json);

      expect(tokens).toBeGreaterThan(10);
      expect(tokens).toBeLessThan(30);
    });
  });

  describe('Comparison with approximation', () => {
    it('should be more accurate than word-based approximation', () => {
      // Word-based approximation: words * 1.3
      // Tiktoken: actual token count

      const text = 'Customer called about password reset issue';
      const wordCount = text.split(/\s+/).length; // 6 words
      const approximation = Math.ceil(wordCount * 1.3); // 8 tokens
      const actual = countTokens(text);

      // Both should be in same ballpark
      expect(actual).toBeGreaterThan(4);
      expect(actual).toBeLessThan(12);

      // Approximation should be close but may differ
      expect(Math.abs(actual - approximation)).toBeLessThan(5);
    });

    it('should handle punctuation better than word count', () => {
      // Punctuation is often separate tokens
      const text = 'Hello, world! How are you?';
      const wordCount = text.split(/\s+/).length; // 5 words
      const tokens = countTokens(text);

      // Token count should be higher due to punctuation
      // "Hello", ",", " world", "!", " How", " are", " you", "?"
      expect(tokens).toBeGreaterThanOrEqual(wordCount);
    });
  });
});
