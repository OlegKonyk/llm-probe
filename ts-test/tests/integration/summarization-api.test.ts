import { describe, it, expect, jest, beforeAll, afterAll } from '@jest/globals';

interface SummaryResponse {
  summary: string;
}

interface ErrorResponse {
  error: string;
  message?: string;
}

describe('Summarization API', () => {
  const BASE_URL = 'http://localhost:3000';

  beforeAll(async () => {
    await new Promise(resolve => setTimeout(resolve, 5000));

    let attempts = 0;
    while (attempts < 10) {
      try {
        const response = await fetch(`${BASE_URL}/health`);
        if (response.ok) break;
      } catch (error) {
        // Backend not ready yet
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;
    }
  }, 60000);

  describe('POST /api/v1/summarize', () => {
    it('should return summary for valid request', async () => {
      const response = await fetch(`${BASE_URL}/api/v1/summarize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: 'Customer called about password reset. Agent verified email and sent reset link. Customer confirmed they received it and issue was resolved.',
          options: {
            maxLength: 50,
            includeKeyPoints: true,
            includeSentiment: false,
          },
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json() as SummaryResponse;
      expect(data).toHaveProperty('summary');
      expect(typeof data.summary).toBe('string');
      expect(data.summary.length).toBeGreaterThan(0);
    });

    it('should reject request with transcript exceeding token limit', async () => {
      const longTranscript = 'word '.repeat(10000);

      const response = await fetch(`${BASE_URL}/api/v1/summarize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: longTranscript,
        }),
      });

      expect(response.status).toBe(413);
      const data = await response.json() as ErrorResponse;
      expect(data).toHaveProperty('error');
      expect(data.error).toBe('Payload Too Large');
    });

    it('should reject request with empty transcript', async () => {
      const response = await fetch(`${BASE_URL}/api/v1/summarize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: '',
        }),
      });

      expect(response.status).toBe(400);
      const data = await response.json() as ErrorResponse;
      expect(data).toHaveProperty('error');
    });

    it('should reject request with missing transcript', async () => {
      const response = await fetch(`${BASE_URL}/api/v1/summarize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          options: { maxLength: 100 },
        }),
      });

      expect(response.status).toBe(400);
      const data = await response.json() as ErrorResponse;
      expect(data).toHaveProperty('error');
    });

    it('should apply default options when not provided', async () => {
      const response = await fetch(`${BASE_URL}/api/v1/summarize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: 'Customer had issue with login. Agent helped reset password. Issue resolved.',
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json() as SummaryResponse;
      expect(data).toHaveProperty('summary');
    });

    it('should reject invalid maxLength', async () => {
      const response = await fetch(`${BASE_URL}/api/v1/summarize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: 'Test transcript',
          options: { maxLength: 1000 },
        }),
      });

      expect(response.status).toBe(400);
      const data = await response.json() as ErrorResponse;
      expect(data).toHaveProperty('error');
    });

    it('should handle provider errors gracefully', async () => {
      const response = await fetch(`${BASE_URL}/api/v1/summarize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: 'x'.repeat(20),
        }),
      });

      expect([200, 500, 503]).toContain(response.status);
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits with sequential requests', async () => {
      // Use a low threshold to test rate limiting without overwhelming the server
      // Backend should be started with RATE_LIMIT_MAX_REQUESTS=5 for this test
      const maxRequests = 7; // Exceed limit of 5
      const responses: Response[] = [];

      for (let i = 0; i < maxRequests; i++) {
        const response = await fetch(`${BASE_URL}/api/v1/summarize`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            transcript: 'Test transcript for rate limit',
          }),
        });
        responses.push(response);
      }

      const rateLimited = responses.some(r => r.status === 429);
      expect(rateLimited).toBe(true);
    }, 30000);
  });

  describe('CORS', () => {
    it('should include CORS headers for allowed origins', async () => {
      const response = await fetch(`${BASE_URL}/health`, {
        method: 'GET',
        headers: { 'Origin': 'http://localhost:3000' },
      });

      expect(response.headers.has('access-control-allow-origin')).toBe(true);
    });
  });
});
