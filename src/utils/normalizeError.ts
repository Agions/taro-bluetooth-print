/**
 * Normalizes an unknown error value into a proper Error instance.
 *
 * This utility function eliminates the common `error instanceof Error ? error : new Error(String(error))`
 * pattern found across catch clauses, providing a single consistent way to normalize errors.
 *
 * @param error - The error value caught in a catch clause (type `unknown`)
 * @returns A proper Error instance
 *
 * @example
 * ```typescript
 * try {
 *   riskyOperation();
 * } catch (err) {
 *   throw normalizeError(err);
 * }
 * ```
 */
export function normalizeError(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  }

  if (error === null || error === undefined) {
    return new Error('Unknown error (null or undefined)');
  }

  // String() is intentional here — we need to produce a human-readable message
  // from an unknown value, even if it yields '[object Object]'.
  // eslint-disable-next-line @typescript-eslint/no-base-to-string
  return new Error(String(error));
}

/**
 * Type-safe emit function type for error events
 */
type ErrorEmitFn = (event: 'error', error: Error) => void;

/**
 * Normalizes an error, emits it as an 'error' event, and then throws it.
 *
 * This utility combines the common pattern of:
 * 1. Normalizing an unknown error
 * 2. Emitting it as an 'error' event
 * 3. Throwing the normalized error
 *
 * @param error - The error value caught in a catch clause (type `unknown`)
 * @param emitFn - The emit function to call with the 'error' event
 * @throws The normalized Error (always throws)
 *
 * @example
 * ```typescript
 * class MyService extends EventEmitter<Events> {
 *   async doWork() {
 *     try {
 *       await riskyOperation();
 *     } catch (err) {
 *       emitAndThrow(err, this.emit.bind(this));
 *     }
 *   }
 * }
 * ```
 */
export function emitAndThrow(error: unknown, emitFn: ErrorEmitFn): never {
  const normalizedError = normalizeError(error);
  emitFn('error', normalizedError);
  throw normalizedError;
}
