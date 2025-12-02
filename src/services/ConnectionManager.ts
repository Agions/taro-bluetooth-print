/**
 * Connection Manager Service
 *
 * Manages Bluetooth device connections
 */

import { Service } from 'typedi';
import type { IPrinterAdapter } from '@/types';
import { PrinterState } from '@/types';
import { IConnectionManager } from './interfaces';
import { AdapterFactory } from '@/adapters/AdapterFactory';
import { Logger } from '@/utils/logger';
import { BluetoothPrintError, ErrorCode } from '@/errors/BluetoothError';

/**
 * Connection Manager implementation
 */
@Service()
export class ConnectionManager implements IConnectionManager {
  private adapter: IPrinterAdapter;
  private deviceId: string | null = null;
  private state: PrinterState = PrinterState.DISCONNECTED;
  private readonly logger = Logger.scope('ConnectionManager');

  /**
   * Creates a new ConnectionManager instance
   */
  constructor(adapter?: IPrinterAdapter) {
    this.adapter = adapter || AdapterFactory.create();

    // Listen to adapter state changes
    this.adapter.onStateChange?.(state => {
      this.state = state;
      this.logger.debug('State changed:', state);
    });
  }

  /**
   * Connects to a Bluetooth device
   *
   * @param deviceId - Bluetooth device ID
   * @returns Promise<void>
   */
  async connect(deviceId: string): Promise<void> {
    this.logger.info('Connecting to device:', deviceId);

    try {
      this.deviceId = deviceId;
      await this.adapter.connect(deviceId);
      this.state = PrinterState.CONNECTED;
      this.logger.info('Connected successfully');
    } catch (error) {
      this.deviceId = null;
      this.state = PrinterState.DISCONNECTED;
      const printError =
        error instanceof BluetoothPrintError
          ? error
          : new BluetoothPrintError(
              ErrorCode.CONNECTION_FAILED,
              'Connection failed',
              error as Error
            );
      this.logger.error('Connection failed:', printError);
      throw printError;
    }
  }

  /**
   * Disconnects from the current device
   *
   * @returns Promise<void>
   */
  async disconnect(): Promise<void> {
    if (!this.deviceId) {
      this.logger.warn('Disconnect called but no device connected');
      return;
    }

    const deviceId = this.deviceId;
    this.logger.info('Disconnecting from device:', deviceId);

    try {
      await this.adapter.disconnect(deviceId);
      this.deviceId = null;
      this.state = PrinterState.DISCONNECTED;
      this.logger.info('Disconnected successfully');
    } catch (error) {
      const printError = new BluetoothPrintError(
        ErrorCode.DEVICE_DISCONNECTED,
        'Disconnect failed',
        error as Error
      );
      this.logger.error('Disconnect failed:', printError);
      throw printError;
    }
  }

  /**
   * Checks if a device is connected
   *
   * @returns boolean - True if connected, false otherwise
   */
  isConnected(): boolean {
    return this.state === PrinterState.CONNECTED;
  }

  /**
   * Gets the current device ID
   *
   * @returns string | null - Device ID or null if not connected
   */
  getDeviceId(): string | null {
    return this.deviceId;
  }

  /**
   * Gets the current connection state
   *
   * @returns PrinterState - Current state
   */
  getState(): PrinterState {
    return this.state;
  }

  /**
   * Gets the printer adapter instance
   *
   * @returns IPrinterAdapter - Printer adapter
   */
  getAdapter(): IPrinterAdapter {
    return this.adapter;
  }
}
