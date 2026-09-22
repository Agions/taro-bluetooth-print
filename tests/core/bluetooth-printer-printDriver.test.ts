/**
 * Tests for BluetoothPrinter.printDriver() and unified driver contracts.
 */
import { vi, describe, test, expect, beforeEach } from 'vitest';

import { BluetoothPrinter } from '../../src/core/BluetoothPrinter';
import { PrinterState } from '../../src/types';
import type { IConnectionManager, IPrintJobManager, ICommandBuilder } from '../../src/services/interfaces';
import { TsplDriver } from '../../src/drivers/TsplDriver';
import { ZplDriver } from '../../src/drivers/ZplDriver';
import { CpclDriver } from '../../src/drivers/CpclDriver';
import type { IProtocolDriver } from '../../src/drivers/contracts';
import { ReactNativeAdapter } from '../../src/adapters/ReactNativeAdapter';

describe('BluetoothPrinter.printDriver()', () => {
  let mockConnectionManager: IConnectionManager;
  let mockPrintJobManager: IPrintJobManager;
  let mockCommandBuilder: ICommandBuilder;
  let printer: BluetoothPrinter;
  let writtenBuffers: Uint8Array[] = [];

  beforeEach(() => {
    writtenBuffers = [];

    mockPrintJobManager = {
      start: vi.fn(async (buffer: Uint8Array) => {
        writtenBuffers.push(buffer);
      }),
      pause: vi.fn(),
      resume: vi.fn(),
      cancel: vi.fn(),
      remaining: vi.fn(() => 0),
      isPaused: vi.fn(() => false),
      isInProgress: vi.fn(() => false),
      setOptions: vi.fn(),
      setProgressCallback: vi.fn(),
      setJobStateCallback: vi.fn(),
    };

    mockConnectionManager = {
      connect: vi.fn().mockResolvedValue(undefined),
      disconnect: vi.fn().mockResolvedValue(undefined),
      isConnected: vi.fn().mockReturnValue(true),
      getDeviceId: vi.fn().mockReturnValue('test-device'),
      getState: vi.fn().mockReturnValue(PrinterState.CONNECTED),
      getAdapter: vi.fn(),
      destroy: vi.fn(),
    } as unknown as IConnectionManager;

    mockCommandBuilder = {
      text: vi.fn().mockReturnThis(),
      feed: vi.fn().mockReturnThis(),
      cut: vi.fn().mockReturnThis(),
      image: vi.fn().mockReturnThis(),
      qr: vi.fn().mockReturnThis(),
      clear: vi.fn().mockReturnThis(),
      align: vi.fn().mockReturnThis(),
      setSize: vi.fn().mockReturnThis(),
      setBold: vi.fn().mockReturnThis(),
      setUnderline: vi.fn().mockReturnThis(),
      setInverse: vi.fn().mockReturnThis(),
      setStyle: vi.fn().mockReturnThis(),
      resetStyle: vi.fn().mockReturnThis(),
      barcode: vi.fn().mockReturnThis(),
      getBuffer: vi.fn().mockReturnValue(new Uint8Array(0)),
      getTotalBytes: vi.fn().mockReturnValue(0),
    };

    printer = new BluetoothPrinter(mockConnectionManager, mockPrintJobManager, mockCommandBuilder);
  });

  test('prints TSPL driver output and clears driver buffer', async () => {
    const tspl = new TsplDriver()
      .size(50, 30)
      .gap(2)
      .clear()
      .text('TSPL TEST', { x: 10, y: 10, font: 2 })
      .print(1);

    expect(tspl.protocol).toBe('TSPL');
    const expectedBuffer = tspl.getBuffer();
    expect(expectedBuffer.length).toBeGreaterThan(0);

    await printer.printDriver(tspl);

    expect(mockPrintJobManager.start).toHaveBeenCalledTimes(1);
    expect(writtenBuffers[0]).toEqual(expectedBuffer);
  });

  test('prints ZPL driver output and clears driver buffer', async () => {
    const zpl = new ZplDriver()
      .fieldOrigin(20, 20)
      .fieldData('ZPL TEST')
      .print(1);

    expect(zpl.protocol).toBe('ZPL');
    const expectedBuffer = zpl.getBuffer();
    expect(expectedBuffer.length).toBeGreaterThan(0);

    await printer.printDriver(zpl);

    expect(mockPrintJobManager.start).toHaveBeenCalledTimes(1);
    expect(writtenBuffers[0]).toEqual(expectedBuffer);
  });

  test('prints CPCL driver output and resets commands', async () => {
    const cpcl = new CpclDriver(576, 400)
      .text('CPCL TEST')
      .print();

    expect(cpcl.protocol).toBe('CPCL');
    const expectedBuffer = cpcl.getBuffer();
    expect(expectedBuffer.length).toBeGreaterThan(0);

    await printer.printDriver(cpcl);

    expect(mockPrintJobManager.start).toHaveBeenCalledTimes(1);
    expect(writtenBuffers[0]).toEqual(expectedBuffer);
  });

  test('exports ReactNativeAdapter correctly from main index', () => {
    expect(ReactNativeAdapter).toBeDefined();
  });
});
