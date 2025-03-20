import { describe, it, expect, beforeEach } from '@jest/globals';
import { PromptBuilder } from '../../src/services/prompt-builder.js';

describe('PromptBuilder', () => {
  let promptBuilder: PromptBuilder;

  beforeEach(() => {
    promptBuilder = new PromptBuilder();
  });

  describe('buildSummarizationPrompt', () => {
    it('should build basic prompt with defaults', () => {
      const transcript = 'Customer called about password reset. Agent sent reset link.';
      const prompt = promptBuilder.buildSummarizationPrompt(transcript);

      expect(prompt).toContain('You are a customer service assistant');
      expect(prompt).toContain('150 words or less');
      expect(prompt).toContain(transcript);
      expect(prompt).toContain('Summary:');
    });

    it('should include custom max length', () => {
      const transcript = 'Test transcript';
      const prompt = promptBuilder.buildSummarizationPrompt(transcript, {
        maxLength: 100,
      });

      expect(prompt).toContain('100 words or less');
    });

    it('should include key points when requested', () => {
      const transcript = 'Test transcript';
      const prompt = promptBuilder.buildSummarizationPrompt(transcript, {
        includeKeyPoints: true,
      });

      expect(prompt).toContain('2-3 key points');
    });

    it('should include sentiment when requested', () => {
      const transcript = 'Test transcript';
      const prompt = promptBuilder.buildSummarizationPrompt(transcript, {
        includeSentiment: true,
      });

      expect(prompt).toContain('sentiment');
    });

    it('should handle all options together', () => {
      const transcript = 'Test transcript';
      const prompt = promptBuilder.buildSummarizationPrompt(transcript, {
        maxLength: 200,
        includeKeyPoints: true,
        includeSentiment: true,
      });

      expect(prompt).toContain('200 words or less');
      expect(prompt).toContain('2-3 key points');
      expect(prompt).toContain('sentiment');
    });
  });
});
