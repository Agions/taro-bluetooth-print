/**
 * Tests for PrintJobManager single-point chunking & progress passthrough
 * 验证 PrintJobManager 取消 512B 盲切后，整体提交至 adapter.write 并由传输层驱动进度回调
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { PrintJobManager } from '../../src/services/PrintJobManager';
import type { IConnectionManager, IPrinterAdapter, IAdapterOptions } from '../../src';

describe('PrintJobManager - Single-point Chunking & Progress Passthrough', () => {
  let mockAdapter: IPrinterAdapter;
  let mockConnectionManager: IConnectionManager;
  let printJobManager: PrintJobManager;

  beforeEach(() => {
    mockAdapter = {
      connect: vi.fn().mockResolvedValue(undefined),
      disconnect: vi.fn().mockResolvedValue(undefined),
      write: vi.fn().mockImplementation(async (_deviceId, buffer: ArrayBuffer, options?: IAdapterOptions) => {
        // Simulate transport layer progressive chunk writes
        const total = buffer.byteLength;
        const chunkSize = 100;
        for (let written = chunkSize; written < total; written += chunkSize) {
          options?.onProgress?.(written, total);
        }
        options?.onProgress?.(total, total);
      }),
    };

    mockConnectionManager = {
      connect: vi.fn().mockResolvedValue(undefined),
      disconnect: vi.fn().mockResolvedValue(undefined),
      isConnected: vi.fn().mockReturnValue(true),
      getState: vi.fn().mockReturnValue('connected' as any),
      getDeviceId: vi.fn().mockReturnValue('dev-printer-001'),
      getAdapter: vi.fn().mockReturnValue(mockAdapter),
      onStateChange: vi.fn(),
    } as unknown as IConnectionManager;

    printJobManager = new PrintJobManager(mockConnectionManager);
  });

  test('submits full buffer to adapter.write once without intermediate 512B splitting', async () => {
    // 2500 bytes buffer (previously would be cut into 5 separate 512B chunks)
    const largeBuffer = new Uint8Array(2500);
    for (let i = 0; i < largeBuffer.length; i++) {
      largeBuffer[i] = i % 256;
    }

    const progressReports: number[] = [];
    printJobManager.setProgressCallback(written => {
      progressReports.push(written);
    });

    await printJobManager.start(largeBuffer);

    // Should only call adapter.write ONCE for the entire buffer
    expect(mockAdapter.write).toHaveBeenCalledTimes(1);

    // Progress updates should be received smoothly through transport onProgress callback
    expect(progressReports.length).toBeGreaterThan(0);
    expect(progressReports[progressReports.length - 1]).toBe(2500);
  });
});
