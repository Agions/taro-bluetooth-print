/**
 * Taro Bluetooth Adapter
 * Implements the IPrinterAdapter interface for Taro framework
 */

import { IPrinterAdapter, IAdapterOptions, PrinterState } from '../types';
import { Logger } from '../utils/logger';
import { BluetoothPrintError, ErrorCode } from '../errors/BluetoothError';

// Declare Taro global for TypeScript
declare const Taro: any;

/**
 * Service information cache entry
 */
interface ServiceInfo {
  serviceId: string;
  characteristicId: string;
}

/**
 * Taro Bluetooth Low Energy adapter
 *
 * @example
 * ```typescript
 * const adapter = new TaroAdapter();
 * await adapter.connect('device-id-123');
 * await adapter.write('device-id-123', buffer);
 * await adapter.disconnect('device-id-123');
 * ```
 */
export class TaroAdapter implements IPrinterAdapter {
  private stateCallback?: (state: PrinterState) => void;
  private serviceCache: Map<string, ServiceInfo> = new Map();
  private readonly logger = Logger.scope('TaroAdapter');

  /**
   * Connects to a Bluetooth device and discovers services
   *
   * @param deviceId - Bluetooth device ID
   * @throws {BluetoothPrintError} When connection fails
   */
  async connect(deviceId: string): Promise<void> {
    this.updateState(PrinterState.CONNECTING);
    this.logger.debug('Connecting to device:', deviceId);

    try {
      await Taro.createBLEConnection({ deviceId });
      this.logger.info('BLE connection established');

      // Discover and cache services
      await this.discoverServices(deviceId);

      this.updateState(PrinterState.CONNECTED);
      this.logger.info('Device connected successfully');

      // Listen for connection state changes
      Taro.onBLEConnectionStateChange((res: any) => {
        if (res.deviceId === deviceId && !res.connected) {
          this.logger.warn('Device disconnected unexpectedly');
          this.updateState(PrinterState.DISCONNECTED);
          this.serviceCache.delete(deviceId);
        }
      });
    } catch (error) {
      this.updateState(PrinterState.DISCONNECTED);
      this.logger.error('Connection failed:', error);
      throw new BluetoothPrintError(
        ErrorCode.CONNECTION_FAILED,
        `Failed to connect to device ${deviceId}`,
        error as Error
      );
    }
  }

  /**
   * Disconnects from a Bluetooth device
   *
   * @param deviceId - Bluetooth device ID
   */
  async disconnect(deviceId: string): Promise<void> {
    this.updateState(PrinterState.DISCONNECTING);
    this.logger.debug('Disconnecting from device:', deviceId);

    try {
      await Taro.closeBLEConnection({ deviceId });
      this.serviceCache.delete(deviceId);
      this.updateState(PrinterState.DISCONNECTED);
      this.logger.info('Device disconnected successfully');
    } catch (error) {
      // Ignore error on disconnect, but log it
      this.logger.warn('Disconnect error (ignored):', error);
      this.serviceCache.delete(deviceId);
      this.updateState(PrinterState.DISCONNECTED);
    }
  }

  /**
   * Writes data to the Bluetooth device in chunks with retry logic
   *
   * @param deviceId - Bluetooth device ID
   * @param buffer - Data to write as ArrayBuffer
   * @param options - Write options (chunk size, delay, retries)
   * @throws {BluetoothPrintError} When write fails after retries
   */
  async write(deviceId: string, buffer: ArrayBuffer, options?: IAdapterOptions): Promise<void> {
    // Get cached service info or throw error
    const serviceInfo = this.serviceCache.get(deviceId);
    if (!serviceInfo) {
      throw new BluetoothPrintError(
        ErrorCode.SERVICE_NOT_FOUND,
        'Device not connected or services not discovered. Call connect() first.'
      );
    }

    const chunkSize = options?.chunkSize ?? 20;
    const delay = options?.delay ?? 20;
    const retries = options?.retries ?? 3;

    const data = new Uint8Array(buffer);
    const totalChunks = Math.ceil(data.length / chunkSize);

    this.logger.debug(`Writing ${data.length} bytes in ${totalChunks} chunks`);

    for (let i = 0; i < data.length; i += chunkSize) {
      const chunk = data.slice(i, i + chunkSize);
      const chunkNum = Math.floor(i / chunkSize) + 1;

      let attempt = 0;
      while (attempt <= retries) {
        try {
          await Taro.writeBLECharacteristicValue({
            deviceId,
            serviceId: serviceInfo.serviceId,
            characteristicId: serviceInfo.characteristicId,
            value: chunk.buffer,
          });

          this.logger.debug(`Chunk ${chunkNum}/${totalChunks} written successfully`);
          break; // Success
        } catch (error) {
          attempt++;
          if (attempt > retries) {
            this.logger.error(`Chunk ${chunkNum} failed after ${retries} retries`);
            throw new BluetoothPrintError(
              ErrorCode.WRITE_FAILED,
              `Failed to write chunk ${chunkNum}/${totalChunks}`,
              error as Error
            );
          }
          this.logger.warn(`Chunk ${chunkNum} write failed, retry ${attempt}/${retries}`);
          // Wait before retry
          await new Promise(r => setTimeout(r, delay * 2));
        }
      }

      // Small delay to prevent congestion
      if (i + chunkSize < data.length) {
        await new Promise(r => setTimeout(r, delay));
      }
    }

    this.logger.info(`Successfully wrote ${data.length} bytes`);
  }

  /**
   * Registers a callback for state changes
   *
   * @param callback - Callback function to invoke on state change
   */
  onStateChange(callback: (state: PrinterState) => void): void {
    this.stateCallback = callback;
  }

  /**
   * Discovers services and characteristics for a device
   * Caches the writeable characteristic for future writes
   *
   * @param deviceId - Bluetooth device ID
   * @throws {BluetoothPrintError} When no writeable characteristic is found
   */
  private async discoverServices(deviceId: string): Promise<void> {
    this.logger.debug('Discovering services for device:', deviceId);

    try {
      const services = await Taro.getBLEDeviceServices({ deviceId });

      for (const service of services.services) {
        const chars = await Taro.getBLEDeviceCharacteristics({
          deviceId,
          serviceId: service.uuid,
        });

        const writeChar = chars.characteristics.find(
          (c: any) => c.properties.write || c.properties.writeWithoutResponse
        );

        if (writeChar) {
          this.serviceCache.set(deviceId, {
            serviceId: service.uuid,
            characteristicId: writeChar.uuid,
          });
          this.logger.info('Found writeable characteristic:', {
            service: service.uuid,
            characteristic: writeChar.uuid,
          });
          return;
        }
      }

      // No writeable characteristic found
      throw new BluetoothPrintError(
        ErrorCode.CHARACTERISTIC_NOT_FOUND,
        'No writeable characteristic found. Make sure the device is a supported printer.'
      );
    } catch (error) {
      if (error instanceof BluetoothPrintError) {
        throw error;
      }
      throw new BluetoothPrintError(
        ErrorCode.SERVICE_DISCOVERY_FAILED,
        'Failed to discover device services',
        error as Error
      );
    }
  }

  /**
   * Updates the internal state and notifies callbacks
   *
   * @param state - New printer state
   */
  private updateState(state: PrinterState): void {
    if (this.stateCallback) {
      this.stateCallback(state);
    }
  }
}
