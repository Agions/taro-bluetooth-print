/**
 * Timeout utility for Promise-based operations.
 *
 * Wraps a promise with a timeout, rejecting if the operation
 * does not complete within the specified duration.
 * Automatically cleans up the timer on success or failure.
 *
 * @template T - The resolved value type of the promise
 *
 * @example
 * ```typescript
 * const result = await withTimeout(
 *   adapter.connect(deviceId),
 *   10000,
 *   'Connection timeout after 10 seconds'
 * );
 * ```
 */

/**
 * Execute a promise with a timeout guard.
 *
 * @param promise - The promise to wrap
 * @param timeoutMs - Timeout in milliseconds
 * @param message - Error message if timeout occurs (default: 'Operation timed out')
 * @returns The resolved value of the promise
 * @throws Error if the promise does not settle within timeoutMs
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  message = 'Operation timed out'
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`${message} after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }
  }
}
