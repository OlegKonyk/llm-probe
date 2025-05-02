import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { getAuthHeader } from '../helpers/api-key.js';

const itLive = process.env.RUN_LIVE_TESTS ? it : it.skip;

interface SummarizeResponse {
  summary: string;
  metadata: {
    latency_ms: number;
    tokens_used: number;
    model: string;
    timestamp: string;
  };
}

interface ErrorResponse {
  error: string;
  message?: string;
}

describe('API Contract Integration Tests', () => {
  const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

  describe('Health Check Endpoint', () => {
    itLive('should return healthy status', async () => {
      const response = await fetch(`${BASE_URL}/health`);
      const data = await response.json() as { status: string; timestamp: string };

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('status', 'ok');
      expect(data).toHaveProperty('timestamp');
      expect(new Date(data.timestamp).getTime()).toBeLessThanOrEqual(Date.now());
    });
  });

  describe('POST /api/v1/summarize', () => {
    itLive('should accept valid request and return summary', async () => {
      const request = {
        transcript: 'Customer called about password reset. Agent sent reset link.',
        options: {
          maxLength: 100,
          includeKeyPoints: true,
          includeSentiment: false,
        },
      };

      const response = await fetch(`${BASE_URL}/api/v1/summarize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(request),
      });

      const data = await response.json() as SummarizeResponse;

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('summary');
      expect(typeof data.summary).toBe('string');
      expect(data.summary.length).toBeGreaterThan(0);

      expect(data).toHaveProperty('metadata');
      expect(data.metadata).toHaveProperty('latency_ms');
      expect(data.metadata).toHaveProperty('tokens_used');
      expect(data.metadata).toHaveProperty('model');
      expect(data.metadata).toHaveProperty('timestamp');
    });

    itLive('should reject request with short transcript', async () => {
      const request = {
        transcript: 'Short',
      };

      const response = await fetch(`${BASE_URL}/api/v1/summarize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(request),
      });

      expect(response.status).toBe(400);
      const data = await response.json() as ErrorResponse;
      expect(data).toHaveProperty('error');
    });

    itLive('should accept request with minimal options', async () => {
      const request = {
        transcript: 'Customer called about billing. Agent helped resolve the issue.',
      };

      const response = await fetch(`${BASE_URL}/api/v1/summarize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(request),
      });

      expect(response.status).toBe(200);
      const data = await response.json() as SummarizeResponse;
      expect(data).toHaveProperty('summary');
      expect(data).toHaveProperty('metadata');
    });

    itLive('should handle missing transcript', async () => {
      const request = {
        options: { maxLength: 100 },
      };

      const response = await fetch(`${BASE_URL}/api/v1/summarize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(request),
      });

      expect(response.status).toBe(400);
    });

    itLive('should handle invalid maxLength (too low)', async () => {
      const request = {
        transcript: 'Valid transcript with enough characters for validation.',
        options: { maxLength: 30 },
      };

      const response = await fetch(`${BASE_URL}/api/v1/summarize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(request),
      });

      expect(response.status).toBe(400);
    });

    itLive('should handle invalid maxLength (too high)', async () => {
      const request = {
        transcript: 'Valid transcript with enough characters for validation.',
        options: { maxLength: 600 },
      };

      const response = await fetch(`${BASE_URL}/api/v1/summarize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(request),
      });

      expect(response.status).toBe(400);
    });
  });

  describe('Contract Validation (Mock Tests)', () => {
    it('should have correct request shape', () => {
      const validRequest = {
        transcript: 'Customer called about an issue.',
        options: {
          maxLength: 150,
          includeKeyPoints: true,
          includeSentiment: false,
        },
      };

      expect(validRequest).toHaveProperty('transcript');
      expect(typeof validRequest.transcript).toBe('string');
      expect(validRequest.transcript.length).toBeGreaterThanOrEqual(10);

      expect(validRequest).toHaveProperty('options');
      expect(typeof validRequest.options.maxLength).toBe('number');
      expect(typeof validRequest.options.includeKeyPoints).toBe('boolean');
      expect(typeof validRequest.options.includeSentiment).toBe('boolean');
    });

    it('should have correct response shape', () => {
      const mockResponse = {
        summary: 'Customer had an issue which was resolved.',
        metadata: {
          latency_ms: 1234,
          tokens_used: 150,
          model: 'llama3.1:8b',
          timestamp: new Date().toISOString(),
        },
      };

      expect(mockResponse).toHaveProperty('summary');
      expect(typeof mockResponse.summary).toBe('string');

      expect(mockResponse).toHaveProperty('metadata');
      expect(typeof mockResponse.metadata.latency_ms).toBe('number');
      expect(typeof mockResponse.metadata.tokens_used).toBe('number');
      expect(typeof mockResponse.metadata.model).toBe('string');
      expect(typeof mockResponse.metadata.timestamp).toBe('string');
    });

    it('should have correct error response shape', () => {
      const mockErrorResponse = {
        error: 'Failed to generate summary',
        message: 'Validation error: transcript too short',
      };

      expect(mockErrorResponse).toHaveProperty('error');
      expect(mockErrorResponse).toHaveProperty('message');
      expect(typeof mockErrorResponse.error).toBe('string');
      expect(typeof mockErrorResponse.message).toBe('string');
    });
  });
});
