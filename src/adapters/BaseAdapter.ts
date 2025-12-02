/**
 * Base Adapter Implementation
 * Provides common functionality for all platform-specific adapters
 */

import { IPrinterAdapter, IAdapterOptions, PrinterState } from '@/types';
import { Logger } from '@/utils/logger';
import { BluetoothPrintError, ErrorCode } from '@/errors/BluetoothError';

/**
 * Service information cache entry
 */
export interface ServiceInfo {
  serviceId: string;
  characteristicId: string;
}

/**
 * Base adapter class that provides common functionality for all platform-specific adapters
 */
export abstract class BaseAdapter implements IPrinterAdapter {
  protected stateCallback?: (state: PrinterState) => void;
  protected serviceCache: Map<string, ServiceInfo> = new Map();
  protected readonly logger = Logger.scope('BaseAdapter');

  /**
   * Connect to a Bluetooth device
   * @param deviceId - Unique identifier of the device to connect to
   */
  abstract connect(deviceId: string): Promise<void>;

  /**
   * Disconnect from a Bluetooth device
   * @param deviceId - Unique identifier of the device to disconnect from
   */
  abstract disconnect(deviceId: string): Promise<void>;

  /**
   * Write data to a connected Bluetooth device
   * @param deviceId - Unique identifier of the connected device
   * @param buffer - Data to write as ArrayBuffer
   * @param options - Optional settings for the write operation
   */
  abstract write(deviceId: string, buffer: ArrayBuffer, options?: IAdapterOptions): Promise<void>;

  /**
   * Start discovering nearby Bluetooth devices (optional)
   */
  startDiscovery?(): Promise<void>;

  /**
   * Stop discovering nearby Bluetooth devices (optional)
   */
  stopDiscovery?(): Promise<void>;

  /**
   * Register a callback for connection state changes
   * @param callback - Function to call when the state changes
   */
  onStateChange(callback: (state: PrinterState) => void): void {
    this.stateCallback = callback;
  }

  /**
   * Updates the internal state and notifies callbacks
   * @param state - New printer state
   */
  protected updateState(state: PrinterState): void {
    if (this.stateCallback) {
      this.stateCallback(state);
    }
  }

  /**
   * Validates device ID
   * @param deviceId - Device ID to validate
   * @throws BluetoothPrintError if device ID is invalid
   */
  protected validateDeviceId(deviceId: string): void {
    if (!deviceId || typeof deviceId !== 'string') {
      throw new BluetoothPrintError(ErrorCode.DEVICE_NOT_FOUND, 'Invalid device ID provided');
    }
  }

  /**
   * Validates buffer data
   * @param buffer - Buffer to validate
   * @throws BluetoothPrintError if buffer is invalid
   */
  protected validateBuffer(buffer: ArrayBuffer): void {
    if (!buffer || !(buffer instanceof ArrayBuffer)) {
      throw new BluetoothPrintError(ErrorCode.PRINT_JOB_FAILED, 'Invalid buffer data provided');
    }
  }

  /**
   * Validates adapter options
   * @param options - Options to validate
   * @returns Validated options with default values
   */
  protected validateOptions(options?: IAdapterOptions): Required<IAdapterOptions> {
    return {
      chunkSize: Math.max(1, Math.min(256, options?.chunkSize ?? 20)),
      delay: Math.max(10, Math.min(100, options?.delay ?? 20)),
      retries: Math.max(1, Math.min(10, options?.retries ?? 3)),
    };
  }

  /**
   * Gets service info from cache
   * @param deviceId - Device ID
   * @returns Service info if found, otherwise throws an error
   * @throws BluetoothPrintError if service info not found
   */
  protected getServiceInfo(deviceId: string): ServiceInfo {
    const serviceInfo = this.serviceCache.get(deviceId);
    if (!serviceInfo) {
      throw new BluetoothPrintError(
        ErrorCode.SERVICE_NOT_FOUND,
        'Device not connected or services not discovered. Call connect() first.'
      );
    }
    return serviceInfo;
  }

  /**
   * Checks if device is connected
   * @param deviceId - Device ID
   * @returns True if device is connected, false otherwise
   */
  protected isDeviceConnected(deviceId: string): boolean {
    return this.serviceCache.has(deviceId);
  }

  /**
   * Cleans up resources for a device
   * @param deviceId - Device ID
   */
  protected cleanupDevice(deviceId: string): void {
    this.serviceCache.delete(deviceId);
  }
}
