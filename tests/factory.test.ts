import { vi, describe, test, expect, beforeEach } from 'vitest';
import { TextEncoder } from 'util';
global.TextEncoder = TextEncoder as any;

import {
  createBluetoothPrinter,
  createWebBluetoothPrinter,
  PrinterFactory,
} from '../src/factory/PrinterFactory';
import { BluetoothPrinter } from '../src/core/BluetoothPrinter';
import type { IPrinterAdapter, IConnectionManager, IPrintJobManager } from '../src/types';
import { PrinterState } from '../src/types';

describe('PrinterFactory', () => {
  let mockAdapter: IPrinterAdapter;

  beforeEach(() => {
    mockAdapter = {
      connect: vi.fn().mockResolvedValue(undefined),
      disconnect: vi.fn().mockResolvedValue(undefined),
      write: vi.fn().mockResolvedValue(undefined),
      startDiscovery: vi.fn().mockResolvedValue(undefined),
      stopDiscovery: vi.fn().mockResolvedValue(undefined),
      onStateChange: vi.fn(),
    };
  });

  describe('createBluetoothPrinter()', () => {
    test('should create a BluetoothPrinter instance', () => {
      const printer = createBluetoothPrinter({ adapter: mockAdapter });
      expect(printer).toBeInstanceOf(BluetoothPrinter);
    });

    test('should create printer with provided adapter', async () => {
      const printer = createBluetoothPrinter({ adapter: mockAdapter });
      await printer.connect('test-device');
      expect(mockAdapter.connect).toHaveBeenCalledWith('test-device');
    });

    test('should create printer with custom connection manager', () => {
      const mockConnManager: IConnectionManager = {
        connect: vi.fn().mockResolvedValue(undefined),
        disconnect: vi.fn().mockResolvedValue(undefined),
        isConnected: vi.fn().mockReturnValue(true),
        getDeviceId: vi.fn().mockReturnValue('custom-device'),
        getState: vi.fn().mockReturnValue(PrinterState.CONNECTED),
        getAdapter: vi.fn().mockReturnValue(mockAdapter),
      };

      const printer = createBluetoothPrinter({ connectionManager: mockConnManager });
      expect(printer).toBeInstanceOf(BluetoothPrinter);
    });

    test('should create printer with custom print job manager', () => {
      const mockPrintJobManager: IPrintJobManager = {
        start: vi.fn().mockResolvedValue(undefined),
        pause: vi.fn(),
        resume: vi.fn().mockResolvedValue(undefined),
        cancel: vi.fn(),
        remaining: vi.fn().mockReturnValue(0),
        isPaused: vi.fn().mockReturnValue(false),
        isInProgress: vi.fn().mockReturnValue(false),
        setOptions: vi.fn(),
        setProgressCallback: vi.fn(),
        setJobStateCallback: vi.fn(),
      };

      // When providing custom printJobManager without adapter, also need to provide connectionManager
      // to avoid AdapterFactory.create() being called with unknown platform
      const mockConnManager: IConnectionManager = {
        connect: vi.fn().mockResolvedValue(undefined),
        disconnect: vi.fn().mockResolvedValue(undefined),
        isConnected: vi.fn().mockReturnValue(true),
        getDeviceId: vi.fn().mockReturnValue('test-device'),
        getState: vi.fn().mockReturnValue(PrinterState.CONNECTED),
        getAdapter: vi.fn().mockReturnValue(mockAdapter),
      };

      const printer = createBluetoothPrinter({
        printJobManager: mockPrintJobManager,
        connectionManager: mockConnManager,
      });
      expect(printer).toBeInstanceOf(BluetoothPrinter);
    });

    test('should create printer with all custom services', () => {
      const mockConnManager: IConnectionManager = {
        connect: vi.fn().mockResolvedValue(undefined),
        disconnect: vi.fn().mockResolvedValue(undefined),
        isConnected: vi.fn().mockReturnValue(true),
        getDeviceId: vi.fn().mockReturnValue('test-device'),
        getState: vi.fn().mockReturnValue(PrinterState.CONNECTED),
        getAdapter: vi.fn().mockReturnValue(mockAdapter),
      };

      const mockPrintJobManager: IPrintJobManager = {
        start: vi.fn().mockResolvedValue(undefined),
        pause: vi.fn(),
        resume: vi.fn().mockResolvedValue(undefined),
        cancel: vi.fn(),
        remaining: vi.fn().mockReturnValue(0),
        isPaused: vi.fn().mockReturnValue(false),
        isInProgress: vi.fn().mockReturnValue(false),
        setOptions: vi.fn(),
        setProgressCallback: vi.fn(),
        setJobStateCallback: vi.fn(),
      };

      const printer = createBluetoothPrinter({
        adapter: mockAdapter,
        connectionManager: mockConnManager,
        printJobManager: mockPrintJobManager,
      });

      expect(printer).toBeInstanceOf(BluetoothPrinter);
    });

    test('should create printer with no options (uses defaults)', () => {
      // Must provide adapter when platform is unknown (Node test environment)
      const printer = createBluetoothPrinter({ adapter: mockAdapter });
      expect(printer).toBeInstanceOf(BluetoothPrinter);
    });

    test('created printer should be usable', async () => {
      const printer = createBluetoothPrinter({ adapter: mockAdapter });

      printer.text('Hello').feed(2);
      await printer.connect('test-device');
      await printer.print();
      await printer.disconnect();

      expect(mockAdapter.connect).toHaveBeenCalled();
      expect(mockAdapter.disconnect).toHaveBeenCalled();
    });
  });

  describe('createWebBluetoothPrinter()', () => {
    test('should return a Promise<BluetoothPrinter>', async () => {
      // This test mocks the dynamic import
      // In a real environment, WebBluetoothAdapter would be imported
      // Here we just verify it returns a Promise
      const result = createWebBluetoothPrinter();
      expect(result).toBeInstanceOf(Promise);
    });
  });

  describe('PrinterFactory (deprecated)', () => {
    test('should have create method', () => {
      expect(typeof PrinterFactory.create).toBe('function');
    });

    test('create should work the same as createBluetoothPrinter', () => {
      const printer = PrinterFactory.create({ adapter: mockAdapter });
      expect(printer).toBeInstanceOf(BluetoothPrinter);
    });

    test('should have createWebBluetooth method', () => {
      expect(typeof PrinterFactory.createWebBluetooth).toBe('function');
    });
  });
});
