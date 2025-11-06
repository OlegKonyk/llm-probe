/**
 * API Key Helper for Integration Tests
 *
 * Provides test API key and authentication helper functions for integration
 * and E2E tests that call the actual backend API endpoints.
 *
 * Why This Exists:
 * - Integration tests need to authenticate against the real API
 * - E2E tests validate the full authentication flow
 * - Tests must use the same key configured in backend/.env (API_KEY)
 * - Centralizes test authentication logic in one place
 *
 * Security Considerations:
 *
 * Safe Practices:
 * - This is a TEST-ONLY key, never used in production
 * - Safe to commit to version control (public repository)
 * - Key is 64 hex characters (256-bit security) but only for testing
 * - No real user data or production systems use this key
 *
 * Important Notes:
 * - Must match API_KEY in backend/.env for tests to pass
 * - If tests fail with 401 Unauthorized, verify key matches .env
 * - Rotate key if repository becomes public (rare for test keys)
 * - Backend enforces rate limiting: 100 requests per 15 minutes per key
 *
 * Usage Context:
 * - Used By: Integration tests, E2E tests, API contract tests
 * - Not Used By: Unit tests (they mock the API, don't call it)
 * - Required For: All tests in tests/integration/, tests/e2e/
 *
 * @example
 * // Simple usage with fetch
 * const response = await fetch('http://localhost:3000/api/v1/summarize', {
 *   headers: {
 *     'Content-Type': 'application/json',
 *     ...getAuthHeader(),  // Adds Authorization: Bearer <key>
 *   },
 *   body: JSON.stringify({ transcript: '...' })
 * });
 *
 * @example
 * // Manual header construction
 * const headers = {
 *   'Authorization': `Bearer ${TEST_API_KEY}`
 * };
 */

/**
 * Test API Key
 *
 * This key must match the API_KEY environment variable in backend/.env
 * for integration tests to authenticate successfully.
 *
 * Generated with: openssl rand -hex 32
 * Length: 64 hex characters (256 bits)
 * Format: Plain hexadecimal string (no dashes or special characters)
 */
export const TEST_API_KEY = '0f047ab2a85506283762e82d7d99329bb0a8ec7b3dc8a6d990b67e1e17805f89';

/**
 * Get Authorization Header for API Requests
 *
 * Convenience function that formats the test API key as an Authorization
 * header following the Bearer token authentication scheme.
 *
 * Returns an object that can be spread into fetch/axios headers.
 *
 * @returns Object with Authorization header in Bearer token format
 *
 * @example
 * const response = await fetch(url, {
 *   headers: {
 *     'Content-Type': 'application/json',
 *     ...getAuthHeader(),  // Spreads { Authorization: 'Bearer <key>' }
 *   }
 * });
 */
export function getAuthHeader(): { Authorization: string } {
  return {
    Authorization: `Bearer ${TEST_API_KEY}`,
  };
}
