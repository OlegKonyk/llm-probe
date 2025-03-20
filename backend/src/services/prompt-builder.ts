export class PromptBuilder {
  /**
   * @param transcript - Call transcript to summarize
   * @param options - Configuration options
   * @returns Formatted prompt string
   */
  buildSummarizationPrompt(
    transcript: string,
    options: {
      maxLength?: number;
      includeKeyPoints?: boolean;
      includeSentiment?: boolean;
    } = {}
  ): string {
    const maxWords = options.maxLength || 150;

    let prompt = `You are a customer service assistant. Your task is to summarize call transcripts accurately and concisely.

Instructions:
- Provide a clear, concise summary in ${maxWords} words or less
- Focus on the main issue, customer request, and resolution
- Use professional, neutral language
- Extract key facts and action items`;

    if (options.includeKeyPoints) {
      prompt += '\n- List 2-3 key points from the conversation';
    }

    if (options.includeSentiment) {
      prompt += '\n- Indicate the overall sentiment (positive, neutral, or negative)';
    }

    prompt += `\n\nCall Transcript:
${transcript}

Summary:`;

    return prompt;
  }
}
