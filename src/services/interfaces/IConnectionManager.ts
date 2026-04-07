/**
 * Connection Manager Interface
 *
 * Manages Bluetooth device connections
 */

import { PrinterState, IPrinterAdapter } from '@/types';

/**
 * Connection Manager Interface
 *
 * Manages Bluetooth device connections
 */
export interface IConnectionManager {
  /**
   * Connects to a Bluetooth device
   *
   * @param deviceId - Bluetooth device ID
   * @param options - Connection options
   * @returns Promise<void>
   */
  connect(deviceId: string, options?: { retries?: number; timeout?: number }): Promise<void>;

  /**
   * Disconnects from the current device
   *
   * @returns Promise<void>
   */
  disconnect(): Promise<void>;

  /**
   * Checks if a device is connected
   *
   * @returns boolean - True if connected, false otherwise
   */
  isConnected(): boolean;

  /**
   * Gets the current device ID
   *
   * @returns string | null - Device ID or null if not connected
   */
  getDeviceId(): string | null;

  /**
   * Gets the current connection state
   *
   * @returns PrinterState - Current state
   */
  getState(): PrinterState;

  /**
   * Gets the printer adapter instance
   *
   * @returns IPrinterAdapter - Printer adapter
   */
  getAdapter(): IPrinterAdapter;
}
