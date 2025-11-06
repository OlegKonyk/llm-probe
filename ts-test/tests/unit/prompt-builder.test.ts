/**
 * PromptBuilder Unit Tests
 *
 * Tests the prompt construction logic in isolation from the LLM.
 * Validates that prompts are built correctly with various configurations.
 *
 * What We're Testing:
 * - Default prompt structure and instructions
 * - Custom option handling (maxLength, includeKeyPoints, includeSentiment)
 * - Edge cases (empty input, very long input, special formatting)
 * - Token counting estimation
 *
 * Why These Tests Matter:
 * Prompt engineering is critical for LLM quality. Small changes to prompts
 * can significantly impact output quality. These tests ensure:
 * - Prompts remain consistent across deployments
 * - New features don't break existing prompt structure
 * - Token counting is accurate for cost estimation
 *
 * Test Pattern:
 * These are pure unit tests - no LLM calls, no I/O, just logic testing.
 * Fast execution (milliseconds) makes them ideal for TDD and CI/CD.
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { PromptBuilder } from '../../../backend/src/services/prompt-builder.js';

describe('PromptBuilder Unit Tests', () => {
  let promptBuilder: PromptBuilder;

  beforeEach(() => {
    promptBuilder = new PromptBuilder();
  });

  describe('buildSummarizationPrompt', () => {
    /**
     * Test: Basic Prompt Structure
     *
     * Validates that the default prompt includes all essential components:
     * - System role definition
     * - Core instructions (word limit, focus areas, tone)
     * - The transcript itself
     * - Output format indicator
     *
     * This is the most important test - if this fails, the LLM won't
     * know what to do.
     */
    it('should build basic summarization prompt with default options', () => {
      const transcript = 'Customer called about password reset. Agent sent reset link.';
      const prompt = promptBuilder.buildSummarizationPrompt(transcript);

      // Should contain system instruction
      expect(prompt).toContain('You are a customer service assistant');
      expect(prompt).toContain('summarize call transcripts');

      // Should contain default max length (150 words)
      expect(prompt).toContain('150 words or less');

      // Should contain basic instructions
      expect(prompt).toContain('main issue, customer request, and resolution');
      expect(prompt).toContain('professional, neutral language');

      // Should contain the transcript
      expect(prompt).toContain(transcript);

      // Should have Summary: section
      expect(prompt).toContain('Summary:');
    });

    it('should include custom max length when specified', () => {
      const transcript = 'Test transcript';
      const prompt = promptBuilder.buildSummarizationPrompt(transcript, {
        maxLength: 100,
      });

      expect(prompt).toContain('100 words or less');
      expect(prompt).not.toContain('150 words');
    });

    it('should include key points instruction when requested', () => {
      const transcript = 'Test transcript';
      const prompt = promptBuilder.buildSummarizationPrompt(transcript, {
        includeKeyPoints: true,
      });

      expect(prompt).toContain('List 2-3 key points from the conversation');
    });

    it('should NOT include key points instruction by default', () => {
      const transcript = 'Test transcript';
      const prompt = promptBuilder.buildSummarizationPrompt(transcript);

      expect(prompt).not.toContain('key points');
    });

    it('should include sentiment instruction when requested', () => {
      const transcript = 'Test transcript';
      const prompt = promptBuilder.buildSummarizationPrompt(transcript, {
        includeSentiment: true,
      });

      expect(prompt).toContain('overall sentiment');
      expect(prompt).toContain('positive, neutral, or negative');
    });

    it('should NOT include sentiment instruction by default', () => {
      const transcript = 'Test transcript';
      const prompt = promptBuilder.buildSummarizationPrompt(transcript);

      expect(prompt).not.toContain('sentiment');
    });

    it('should include both key points and sentiment when both requested', () => {
      const transcript = 'Test transcript';
      const prompt = promptBuilder.buildSummarizationPrompt(transcript, {
        includeKeyPoints: true,
        includeSentiment: true,
      });

      expect(prompt).toContain('key points');
      expect(prompt).toContain('sentiment');
    });

    it('should handle all options together', () => {
      const transcript = 'Customer called about billing issue.';
      const prompt = promptBuilder.buildSummarizationPrompt(transcript, {
        maxLength: 200,
        includeKeyPoints: true,
        includeSentiment: true,
      });

      expect(prompt).toContain('200 words or less');
      expect(prompt).toContain('key points');
      expect(prompt).toContain('sentiment');
      expect(prompt).toContain(transcript);
    });

    it('should handle empty transcript gracefully', () => {
      const prompt = promptBuilder.buildSummarizationPrompt('');

      expect(prompt).toContain('You are a customer service assistant');
      expect(prompt).toContain('Summary:');
    });

    it('should handle very long transcripts', () => {
      const longTranscript = 'A'.repeat(10000);
      const prompt = promptBuilder.buildSummarizationPrompt(longTranscript);

      expect(prompt).toContain(longTranscript);
      expect(prompt.length).toBeGreaterThan(10000);
    });

    it('should preserve transcript formatting', () => {
      const transcript = 'Line 1\nLine 2\nLine 3';
      const prompt = promptBuilder.buildSummarizationPrompt(transcript);

      expect(prompt).toContain('Line 1\nLine 2\nLine 3');
    });
  });

  describe('getTokenCount', () => {
    it('should calculate approximate token count', () => {
      // Rough estimation: ~4 chars per token
      const text = 'Hello world';
      const count = promptBuilder.getTokenCount(text);

      // 11 characters / 4 = 2.75, ceil = 3
      expect(count).toBe(3);
    });

    it('should handle empty string', () => {
      const count = promptBuilder.getTokenCount('');
      expect(count).toBe(0);
    });

    it('should handle single character', () => {
      const count = promptBuilder.getTokenCount('A');
      // 1 / 4 = 0.25, ceil = 1
      expect(count).toBe(1);
    });

    it('should handle exactly divisible by 4', () => {
      const text = 'Test'; // 4 characters
      const count = promptBuilder.getTokenCount(text);
      expect(count).toBe(1);
    });

    it('should round up for partial tokens', () => {
      const text = 'Hello'; // 5 characters
      const count = promptBuilder.getTokenCount(text);
      // 5 / 4 = 1.25, ceil = 2
      expect(count).toBe(2);
    });

    it('should handle long text', () => {
      const text = 'A'.repeat(1000); // 1000 characters
      const count = promptBuilder.getTokenCount(text);
      // 1000 / 4 = 250
      expect(count).toBe(250);
    });

    it('should be consistent', () => {
      const text = 'The quick brown fox jumps over the lazy dog';
      const count1 = promptBuilder.getTokenCount(text);
      const count2 = promptBuilder.getTokenCount(text);

      expect(count1).toBe(count2);
    });
  });
});

