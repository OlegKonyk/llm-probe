import {
  BedrockRuntimeClient,
  ConverseCommand,
  type ConverseCommandInput,
} from '@aws-sdk/client-bedrock-runtime';
import type { LLMProvider, LLMOptions, LLMResponse } from './llm-provider.interface.js';
import { LLMGenerationError, LLMTimeoutError } from '../errors/llm-errors.js';
import { withTimeout } from '../utils/timeout.js';

export class BedrockProvider implements LLMProvider {
  private client: BedrockRuntimeClient;
  private model: string;
  private region: string;

  constructor() {
    this.region = process.env.AWS_REGION || 'us-east-2';
    this.model = process.env.BEDROCK_MODEL || 'us.amazon.nova-lite-v1:0';

    this.client = new BedrockRuntimeClient({
      region: this.region,
    });
  }

  async generate(prompt: string, options?: LLMOptions): Promise<LLMResponse> {
    const defaultTimeout = parseInt(process.env.BEDROCK_TIMEOUT_MS || '30000', 10);
    const timeoutMs = options?.timeoutMs ?? defaultTimeout;

    try {
      const input: ConverseCommandInput = {
        modelId: this.model,
        messages: [
          {
            role: 'user',
            content: [{ text: prompt }],
          },
        ],
        inferenceConfig: {
          temperature: options?.temperature ?? 0.7,
          maxTokens: options?.maxTokens ?? 4096,
        },
      };

      const command = new ConverseCommand(input);
      const response = await withTimeout(
        this.client.send(command),
        timeoutMs
      );

      if (!response.output?.message?.content?.[0]) {
        throw new LLMGenerationError('Bedrock returned empty response');
      }

      const contentBlock = response.output.message.content[0];
      if (!('text' in contentBlock) || !contentBlock.text) {
        throw new LLMGenerationError('Bedrock response does not contain text');
      }

      const inputTokens = response.usage?.inputTokens || 0;
      const outputTokens = response.usage?.outputTokens || 0;
      const totalTokens = inputTokens + outputTokens;

      return {
        text: contentBlock.text,
        tokensUsed: totalTokens,
        model: this.model,
        metadata: {
          inputTokens,
          outputTokens,
          stopReason: response.stopReason,
        },
      };
    } catch (error) {
      if (error instanceof LLMTimeoutError) {
        throw error;
      }

      if (error instanceof Error) {
        if (error.name === 'AccessDeniedException') {
          throw new LLMGenerationError(
            `Access denied to Bedrock model ${this.model}. Check IAM permissions and model access in AWS console.`,
            error
          );
        }

        if (error.name === 'ResourceNotFoundException') {
          throw new LLMGenerationError(
            `Bedrock model ${this.model} not found in region ${this.region}. Check BEDROCK_MODEL and AWS_REGION.`,
            error
          );
        }

        if (error.name === 'ThrottlingException') {
          throw new LLMGenerationError(
            'Bedrock API throttled. Too many requests. Try again later.',
            error
          );
        }

        throw new LLMGenerationError(
          `Bedrock generation failed: ${error.message}`,
          error
        );
      }
      throw error;
    }
  }

  getProviderName(): string {
    return 'bedrock';
  }

  getModel(): string {
    return this.model;
  }
}
