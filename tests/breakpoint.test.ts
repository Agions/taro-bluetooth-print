import { vi, describe, test, expect, beforeEach, afterEach, Mock } from 'vitest';
import { TextEncoder } from 'util';
global.TextEncoder = TextEncoder as any;

import { BluetoothPrinter } from '../src/core/BluetoothPrinter';
import { TaroAdapter } from '../src/adapters/TaroAdapter';
import { PrinterState } from '../src/types';
import { IPrinterAdapter } from '../src/types';

// Mock Taro API
global.Taro = {
  getBLEConnectionState: vi.fn().mockResolvedValue({ connected: true }),
} as any;

// Create a mock adapter that implements IPrinterAdapter interface
describe('BluetoothPrinter Breakpoint', () => {
  let printer: BluetoothPrinter;
  let mockAdapter: Mock<IPrinterAdapter>;

  beforeEach(async () => {
    // Create a mock adapter that implements IPrinterAdapter interface
    mockAdapter = {
      connect: vi.fn().mockResolvedValue(undefined),
      disconnect: vi.fn().mockResolvedValue(undefined),
      write: vi.fn().mockResolvedValue(undefined),
      startDiscovery: vi.fn().mockResolvedValue(undefined),
      stopDiscovery: vi.fn().mockResolvedValue(undefined),
      onStateChange: vi.fn()
    };

    printer = new BluetoothPrinter(mockAdapter as any);
    await printer.connect('test-device');
  });

  test('pause stops printing', async () => {
    // Mock write to take some time so we can pause
    let writeCount = 0;
    mockAdapter.write.mockImplementation(async () => {
      writeCount++;
      // Only pause after first write
      if (writeCount === 1) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    });

    // Add a lot of data (more than 512 bytes chunk size)
    for (let i = 0; i < 100; i++) {
      printer.text('1234567890'); // 10 bytes * 100 = 1000 bytes
    }

    const printPromise = printer.print();

    // Pause immediately
    printer.pause();

    await printPromise;

    // Should have stopped early.
    // Check remaining bytes.
    expect(printer.remaining()).toBeGreaterThan(0);
    expect(printer.state).toBe(PrinterState.PAUSED);
  });

  test('resume continues printing', async () => {
    // Create a mock that will wait for our signal before completing the first write
    let resumeWrite: () => void = () => {};
    const writePromise = new Promise<void>(resolve => {
      resumeWrite = resolve;
    });

    mockAdapter.write.mockImplementation(async () => {
      // Wait for our signal
      await writePromise;
    });

    // Add a lot of data to ensure multiple write calls
    for (let i = 0; i < 100; i++) {
      printer.text('1234567890');
    }

    // Start print in background
    const printPromise = printer.print();

    // Wait a bit for the print job to start
    await new Promise(resolve => setTimeout(resolve, 10));

    // Pause the job
    printer.pause();

    // Now allow the first write to complete
    resumeWrite();

    // Wait for the print promise to resolve (it should be paused)
    await printPromise;

    // Check that the job is paused and has remaining bytes
    expect(printer.remaining()).toBeGreaterThan(0);
    expect((printer as any)['printJobManager'].isPaused()).toBe(true);

    // Resume the job
    await printer.resume();

    // Check that the job completed
    expect(printer.remaining()).toBe(0);
  });

  test('cancel clears job', async () => {
    // Create a mock that will wait for our signal before completing the first write
    let resumeWrite: () => void = () => {};
    const writePromise = new Promise<void>(resolve => {
      resumeWrite = resolve;
    });

    mockAdapter.write.mockImplementation(async () => {
      // Wait for our signal
      await writePromise;
    });

    // Add a lot of data to ensure multiple write calls
    for (let i = 0; i < 100; i++) {
      printer.text('1234567890');
    }

    // Start print in background
    const printPromise = printer.print();

    // Wait a bit for the print job to start
    await new Promise(resolve => setTimeout(resolve, 10));

    // Pause the job
    printer.pause();

    // Now allow the first write to complete
    resumeWrite();

    // Wait for the print promise to resolve (it should be paused)
    await printPromise;

    // Check that the job is paused and has remaining bytes
    expect(printer.remaining()).toBeGreaterThan(0);
    expect((printer as any)['printJobManager'].isPaused()).toBe(true);

    // Cancel the job
    printer.cancel();

    // Check that the job was cancelled
    expect(printer.remaining()).toBe(0);
    expect(printer.state).toBe(PrinterState.CONNECTED);
  });
});
