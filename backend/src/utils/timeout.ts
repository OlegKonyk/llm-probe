import { LLMTimeoutError } from '../errors/llm-errors.js';

/**
 * Wraps a promise with a timeout. If the promise doesn't resolve within
 * the specified timeout, it will be rejected with an LLMTimeoutError.
 *
 * @param promise - The promise to wrap
 * @param timeoutMs - Timeout in milliseconds
 * @returns A promise that resolves or rejects based on the original promise or timeout
 * @throws {LLMTimeoutError} When the timeout is exceeded
 */
export function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timeoutHandle: NodeJS.Timeout;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutHandle = setTimeout(
      () => reject(new LLMTimeoutError(`Request timed out after ${timeoutMs}ms`, timeoutMs)),
      timeoutMs
    );
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    clearTimeout(timeoutHandle);
  });
}
