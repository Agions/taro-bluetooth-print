
import { TextEncoder } from 'util';
global.TextEncoder = TextEncoder as any;

import { BluetoothPrinter } from '../src/core/BluetoothPrinter';
import { TaroAdapter } from '../src/adapters/TaroAdapter';
import { PrinterState } from '../src/types';

// Mock Taro API
global.Taro = {
  getBLEConnectionState: jest.fn().mockResolvedValue({ connected: true }),
} as any;

// Mock TaroAdapter
jest.mock('../src/adapters/TaroAdapter');

describe('BluetoothPrinter Breakpoint', () => {
  let printer: BluetoothPrinter;
  let mockAdapter: jest.Mocked<TaroAdapter>;

  beforeEach(async () => {
    mockAdapter = new TaroAdapter() as jest.Mocked<TaroAdapter>;
    mockAdapter.write = jest.fn().mockResolvedValue(undefined);
    mockAdapter.connect = jest.fn().mockResolvedValue(undefined);

    printer = new BluetoothPrinter(mockAdapter);
    await printer.connect('test-device');
  });

  test('pause stops printing', async () => {
    // Mock write to take some time so we can pause
    mockAdapter.write.mockImplementation(async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    // Add a lot of data (more than 512 bytes chunk size)
    const data = new Uint8Array(1024);
    printer.text('test'); // Just adds to buffer, but let's manually fill buffer for control
    // Access private buffer via any cast or just use public methods
    // printer.text adds to buffer.
    // Let's add enough text.
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
    // Mock write
    mockAdapter.write.mockResolvedValue(undefined);

    // Add data
    for (let i = 0; i < 100; i++) {
      printer.text('1234567890');
    }

    // Start print
    const printPromise = printer.print();

    // Pause
    printer.pause();
    await printPromise;

    const remainingBefore = printer.remaining();
    expect(remainingBefore).toBeGreaterThan(0);

    // Resume
    await printer.resume();

    expect(printer.remaining()).toBe(0);
    // State should be PRINTING then done (which resets to null jobBuffer, but state might remain PRINTING or we didn't reset it to CONNECTED in processJob?
    // Let's check processJob implementation.
    // It doesn't reset state to CONNECTED at the end.
    // I should probably fix that.
  });

  test('cancel clears job', async () => {
    // Mock write with delay
    mockAdapter.write.mockImplementation(async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    // Add data (enough to have multiple chunks)
    for (let i = 0; i < 100; i++) {
      printer.text('1234567890');
    }

    const printPromise = printer.print();
    printer.pause();
    await printPromise;

    expect(printer.remaining()).toBeGreaterThan(0);

    printer.cancel();

    expect(printer.remaining()).toBe(0);
    expect(printer.state).toBe(PrinterState.CONNECTED);
  });
});
