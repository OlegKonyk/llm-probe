import { z } from 'zod';

export const summarizeRequestSchema = z.object({
  transcript: z.string().min(10, 'Transcript must be at least 10 characters'),
  options: z
    .object({
      maxLength: z.number().min(50).max(500).default(150),
      includeKeyPoints: z.boolean().default(true),
      includeSentiment: z.boolean().default(false),
    })
    .default({
      maxLength: 150,
      includeKeyPoints: true,
      includeSentiment: false,
    }),
});

export type SummarizeRequest = z.infer<typeof summarizeRequestSchema>;

export interface SummarizationResult {
  summary: string;
  tokensUsed: number;
  model: string;
}
