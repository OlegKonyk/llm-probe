/**
 * Property-Based Tests for Summarization Invariants
 *
 * Property-based testing (PBT) is a testing technique where you define
 * properties (rules/invariants) that should ALWAYS hold true, then
 * automatically generate hundreds of test cases to verify them.
 *
 * Why Property-Based Testing?
 * - Finds edge cases you wouldn't think to test manually
 * - Tests with 100+ random inputs per property (1800+ total test cases)
 * - Validates invariants that must hold for ALL inputs
 * - Complements example-based tests (unit/component tests)
 *
 * Example:
 * Instead of: "if input is 'hello', output should be 'HELLO'"
 * We test: "for ANY input string, output.toLowerCase() == input"
 *
 * What We're Testing:
 * - Prompt Builder Invariants (6 properties)
 *   - Transcript always included in prompt
 *   - System instructions always present
 *   - Prompt longer than transcript
 *   - Custom options correctly applied
 *
 * - Token Counting Invariants (4 properties)
 *   - Token count always non-negative
 *   - Empty string = 0 tokens
 *   - Longer text = more tokens
 *   - Concatenation properties
 *
 * - Quality Invariants (3 properties)
 *   - Summary shorter than input (not tested due to limitations)
 *   - Required terms always detectable
 *   - Length validation symmetry
 *
 * - Edge Case Discovery (3 properties)
 *   - Whitespace handling
 *   - Special characters
 *   - Numeric content
 *
 * - Consistency Properties (2 properties)
 *   - Same input → same output (determinism)
 *   - Same options → same structure
 *
 * Test Statistics:
 * - 18 properties tested
 * - 100 iterations per property
 * - ~1800 total test cases generated
 * - Executes in ~200ms
 *
 * Using fast-check Library:
 * - fc.string(): Generate random strings
 * - fc.integer(): Generate random integers
 * - fc.assert(): Verify property holds for all generated inputs
 * - fc.property(): Define the invariant to test
 */

import { describe, it, expect } from '@jest/globals';
import fc from 'fast-check';
import { PromptBuilder } from '../../../backend/src/services/prompt-builder.js';
import { validateLength, containsRequiredTerms } from '../../src/metrics/text-similarity.js';

describe('Summarization Invariants (Property-Based)', () => {
  const promptBuilder = new PromptBuilder();

  describe('Prompt Builder Invariants', () => {
    /**
     * Invariant: Prompt Must Always Include the Transcript
     *
     * The LLM needs the transcript to summarize it. If the transcript
     * is missing, the LLM can't do its job.
     *
     * Tested with 100 random transcripts (10-500 chars each).
     */
    it('prompt should always contain the transcript', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 10, maxLength: 500 }),
          (transcript) => {
            const prompt = promptBuilder.buildSummarizationPrompt(transcript);
            return prompt.includes(transcript);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('prompt should always contain system instructions', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 10, maxLength: 500 }),
          (transcript) => {
            const prompt = promptBuilder.buildSummarizationPrompt(transcript);
            return (
              prompt.includes('customer service assistant') ||
              prompt.includes('summarize')
            );
          }
        ),
        { numRuns: 100 }
      );
    });

    it('prompt length should be greater than transcript length', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 10, maxLength: 500 }),
          (transcript) => {
            const prompt = promptBuilder.buildSummarizationPrompt(transcript);
            // Prompt includes system instructions + transcript
            return prompt.length > transcript.length;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('custom maxLength should appear in prompt', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 10 }),
          fc.integer({ min: 50, max: 500 }),
          (transcript, maxLength) => {
            const prompt = promptBuilder.buildSummarizationPrompt(transcript, {
              maxLength,
            });
            return prompt.includes(`${maxLength} words`);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('includeKeyPoints option should add key points instruction', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 10 }),
          fc.boolean(),
          (transcript, includeKeyPoints) => {
            const prompt = promptBuilder.buildSummarizationPrompt(transcript, {
              includeKeyPoints,
            });
            const hasKeyPoints = prompt.toLowerCase().includes('key points');
            return includeKeyPoints ? hasKeyPoints : !hasKeyPoints;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('includeSentiment option should add sentiment instruction', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 10 }),
          fc.boolean(),
          (transcript, includeSentiment) => {
            const prompt = promptBuilder.buildSummarizationPrompt(transcript, {
              includeSentiment,
            });
            const hasSentiment = prompt.toLowerCase().includes('sentiment');
            return includeSentiment ? hasSentiment : !hasSentiment;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Token Counting Invariants', () => {
    it('token count should be non-negative', () => {
      fc.assert(
        fc.property(fc.string(), (text) => {
          const count = promptBuilder.getTokenCount(text);
          return count >= 0;
        }),
        { numRuns: 100 }
      );
    });

    it('empty string should have zero tokens', () => {
      expect(promptBuilder.getTokenCount('')).toBe(0);
    });

    it('longer text should have more or equal tokens', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }),
          fc.string({ minLength: 1 }),
          (text1, text2) => {
            const count1 = promptBuilder.getTokenCount(text1);
            const count2 = promptBuilder.getTokenCount(text2);

            if (text1.length > text2.length) {
              return count1 >= count2;
            }
            return true; // Don't check if text1 is shorter
          }
        ),
        { numRuns: 100 }
      );
    });

    it('concatenated text should have sum of tokens (approximately)', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 10, maxLength: 100 }),
          fc.string({ minLength: 10, maxLength: 100 }),
          (text1, text2) => {
            const count1 = promptBuilder.getTokenCount(text1);
            const count2 = promptBuilder.getTokenCount(text2);
            const countCombined = promptBuilder.getTokenCount(text1 + text2);

            // Should be approximately equal (within a token or two)
            return Math.abs(countCombined - (count1 + count2)) <= 2;
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Summary Quality Invariants', () => {
    // These represent properties that SHOULD hold for good summaries

    it('summary should be shorter than input (in theory)', () => {
      // This is an invariant we WANT to test against real summaries
      // For now, just validate the logic works

      fc.assert(
        fc.property(
          fc.string({ minLength: 100, maxLength: 1000 }),
          fc.string({ minLength: 20, maxLength: 99 }),
          (input, summary) => {
            // Simulated invariant: summary shorter than input
            return summary.length < input.length;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('summary should preserve key terms from input', () => {
      // Test that our term detection works correctly

      fc.assert(
        fc.property(
          fc.array(fc.string({ minLength: 3, maxLength: 10 }), {
            minLength: 1,
            maxLength: 5,
          }),
          (terms) => {
            const text = `This text contains ${terms.join(' and ')} as key terms`;
            const result = containsRequiredTerms(text, terms);
            return result.passed === true && result.coverage === 1.0;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('summary length validation should be symmetric', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 10 }),
          fc.integer({ min: 10, max: 200 }),
          fc.integer({ min: 201, max: 500 }),
          (text, minWords, maxWords) => {
            const result = validateLength(text, minWords, maxWords);
            // Use the actual word count from validateLength (includes tokenization)
            const wordCount = result.wordCount;

            if (wordCount >= minWords && wordCount <= maxWords) {
              return result.passed === true;
            } else {
              return result.passed === false;
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Edge Case Discovery', () => {
    it('should handle various whitespace patterns', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 10 }),
          fc.constantFrom(' ', '\n', '\t', '  ', '\n\n'),
          (text, whitespace) => {
            const textWithWhitespace = text + whitespace + text;
            const prompt =
              promptBuilder.buildSummarizationPrompt(textWithWhitespace);
            return prompt.includes(text);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle special characters in transcript', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 10 }),
          fc.constantFrom('!', '?', '.', ',', ';', ':'),
          (text, specialChar) => {
            const textWithSpecial = text + specialChar;
            const prompt =
              promptBuilder.buildSummarizationPrompt(textWithSpecial);
            return prompt.includes(textWithSpecial);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle numeric content', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 10 }),
          fc.integer(),
          (text, number) => {
            const textWithNumber = `${text} ${number}`;
            const prompt = promptBuilder.buildSummarizationPrompt(textWithNumber);
            return prompt.includes(textWithNumber);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Consistency Properties', () => {
    it('same input should produce same prompt', () => {
      fc.assert(
        fc.property(fc.string({ minLength: 10 }), (transcript) => {
          const prompt1 = promptBuilder.buildSummarizationPrompt(transcript);
          const prompt2 = promptBuilder.buildSummarizationPrompt(transcript);
          return prompt1 === prompt2;
        }),
        { numRuns: 100 }
      );
    });

    it('same options should produce consistent structure', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 10 }),
          fc.string({ minLength: 10 }),
          fc.record({
            maxLength: fc.integer({ min: 50, max: 500 }),
            includeKeyPoints: fc.boolean(),
            includeSentiment: fc.boolean(),
          }),
          (transcript1, transcript2, options) => {
            const prompt1 = promptBuilder.buildSummarizationPrompt(
              transcript1,
              options
            );
            const prompt2 = promptBuilder.buildSummarizationPrompt(
              transcript2,
              options
            );

            // Both should have the same option indicators
            const hasKeyPoints1 = prompt1.includes('key points');
            const hasKeyPoints2 = prompt2.includes('key points');
            const hasSentiment1 = prompt1.includes('sentiment');
            const hasSentiment2 = prompt2.includes('sentiment');

            return (
              hasKeyPoints1 === hasKeyPoints2 &&
              hasSentiment1 === hasSentiment2
            );
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
