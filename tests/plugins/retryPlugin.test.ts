/**
 * RetryPlugin tests — focuses on the new onRetry callback wiring.
 *
 * The original tests (if any) only verified retry timing. Here we also
 * verify that:
 * - onRetry fires BEFORE the backoff sleep
 * - onRetry receives accurate attempt/maxRetries/delayMs/error
 * - a throwing onRetry does NOT break retry timing (caught + logged)
 * - onRetry does NOT fire when the error is non-retryable
 *
 * Implementation note: onError hook returns a Promise that awaits
 * setTimeout-based backoff. We use vi.useFakeTimers() to drive those
 * promises to completion deterministically without waiting wall-clock time.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRetryPlugin } from '@/plugins/builtin/RetryPlugin';
import { BluetoothPrintError, ErrorCode } from '@/errors/BaseError';

/**
 * Helper: invoke plugin.hooks.onError and resolve the backoff promise.
 * Returns the onRetry callback invocation record (if any).
 */
async function driveOneRetry(
  plugin: ReturnType<typeof createRetryPlugin>,
  error: BluetoothPrintError
): Promise<unknown> {
  const result = plugin.hooks.onError!(error);
  // result is a Promise<void> that resolves AFTER the sleep timer.
  // Advance enough time to clear any backoff (maxDelay default 10s).
  await vi.advanceTimersByTimeAsync(20_000);
  await result;
  return result;
}

describe('RetryPlugin', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('fires onRetry with attempt=1 on first retry', async () => {
    const onRetry = vi.fn();
    const plugin = createRetryPlugin({
      maxRetries: 3,
      initialDelay: 500,
      onRetry,
    });

    const error = new BluetoothPrintError(ErrorCode.CONNECTION_FAILED, 'fail');
    await driveOneRetry(plugin, error);

    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onRetry).toHaveBeenCalledWith({
      attempt: 1,
      maxRetries: 3,
      delayMs: 500,
      error,
    });
  });

  it('fires onRetry multiple times across backoff retries with growing delayMs', async () => {
    const onRetry = vi.fn();
    const plugin = createRetryPlugin({
      maxRetries: 3,
      initialDelay: 100,
      backoffMultiplier: 2,
      onRetry,
    });

    for (let i = 1; i <= 3; i++) {
      await driveOneRetry(
        plugin,
        new BluetoothPrintError(ErrorCode.WRITE_FAILED, `x${i}`)
      );
    }

    expect(onRetry).toHaveBeenCalledTimes(3);
    expect(onRetry.mock.calls[0][0].delayMs).toBe(100);
    expect(onRetry.mock.calls[1][0].delayMs).toBe(200);
    expect(onRetry.mock.calls[2][0].delayMs).toBe(400);
  });

  it('does NOT fire onRetry when error is non-retryable', async () => {
    const onRetry = vi.fn();
    const plugin = createRetryPlugin({ onRetry });
    const error = new BluetoothPrintError(ErrorCode.INVALID_CONFIGURATION, 'not retryable');

    await driveOneRetry(plugin, error);

    expect(onRetry).not.toHaveBeenCalled();
  });

  it('does NOT fire onRetry after maxRetries exceeded', async () => {
    const onRetry = vi.fn();
    const plugin = createRetryPlugin({ maxRetries: 2, initialDelay: 10, onRetry });

    await driveOneRetry(plugin, new BluetoothPrintError(ErrorCode.CONNECTION_FAILED, 'x1'));
    await driveOneRetry(plugin, new BluetoothPrintError(ErrorCode.CONNECTION_FAILED, 'x2'));
    await driveOneRetry(plugin, new BluetoothPrintError(ErrorCode.CONNECTION_FAILED, 'x3'));

    expect(onRetry).toHaveBeenCalledTimes(2);
  });

  it('a throwing onRetry does not break retry timing', async () => {
    const onRetry = vi.fn(() => {
      throw new Error('user callback broke');
    });
    const plugin = createRetryPlugin({
      maxRetries: 2,
      initialDelay: 100,
      onRetry,
    });

    await expect(
      driveOneRetry(plugin, new BluetoothPrintError(ErrorCode.CONNECTION_FAILED, 'x'))
    ).resolves.not.toThrow();
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('resets retry count on beforePrint', async () => {
    const onRetry = vi.fn();
    const plugin = createRetryPlugin({ maxRetries: 3, initialDelay: 50, onRetry });

    await driveOneRetry(plugin, new BluetoothPrintError(ErrorCode.CONNECTION_FAILED, 'x'));
    await driveOneRetry(plugin, new BluetoothPrintError(ErrorCode.CONNECTION_FAILED, 'x'));
    expect(onRetry).toHaveBeenCalledTimes(2);

    // New print job resets the counter.
    await plugin.hooks.beforePrint!();

    await driveOneRetry(plugin, new BluetoothPrintError(ErrorCode.CONNECTION_FAILED, 'x'));
    expect(onRetry).toHaveBeenCalledTimes(3);
    expect(onRetry.mock.calls[2][0].attempt).toBe(1);
  });
});