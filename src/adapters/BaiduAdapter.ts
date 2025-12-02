/**
 * Baidu Bluetooth Adapter
 * Implements the IPrinterAdapter interface for Baidu Smart Program
 */

import { IAdapterOptions, PrinterState } from '@/types';
import { BaseAdapter } from './BaseAdapter';
import { BluetoothPrintError, ErrorCode } from '@/errors/BluetoothError';

// Declare Baidu global for TypeScript
interface BaiduBLEService {
  uuid: string;
}

interface BaiduBLECharacteristicProperties {
  write?: boolean;
  writeWithoutResponse?: boolean;
  read?: boolean;
  notify?: boolean;
  indicate?: boolean;
}

interface BaiduBLECharacteristic {
  uuid: string;
  properties: BaiduBLECharacteristicProperties;
}

interface BaiduBLEDeviceServicesResult {
  services: BaiduBLEService[];
}

interface BaiduBLEDeviceCharacteristicsResult {
  characteristics: BaiduBLECharacteristic[];
}

interface BaiduBLEConnectionStateResult {
  connected: boolean;
}

interface BaiduBLEConnectionOptions {
  deviceId: string;
}

interface BaiduBLEWriteOptions {
  deviceId: string;
  serviceId: string;
  characteristicId: string;
  value: ArrayBuffer;
}

interface BaiduBLEConnectionStateChangeCallback {
  (res: { deviceId: string; connected: boolean }): void;
}

interface BaiduGlobal {
  createBLEConnection(options: BaiduBLEConnectionOptions): Promise<void>;
  closeBLEConnection(options: BaiduBLEConnectionOptions): Promise<void>;
  getBLEConnectionState(options: BaiduBLEConnectionOptions): Promise<BaiduBLEConnectionStateResult>;
  writeBLECharacteristicValue(options: BaiduBLEWriteOptions): Promise<void>;
  getBLEDeviceServices(options: BaiduBLEConnectionOptions): Promise<BaiduBLEDeviceServicesResult>;
  getBLEDeviceCharacteristics(options: {
    deviceId: string;
    serviceId: string;
  }): Promise<BaiduBLEDeviceCharacteristicsResult>;
  onBLEConnectionStateChange(callback: BaiduBLEConnectionStateChangeCallback): void;
}

declare const swan: BaiduGlobal;

/**
 * Baidu Bluetooth Low Energy adapter
 *
 * @example
 * ```typescript
 * const adapter = new BaiduAdapter();
 * await adapter.connect('device-id-123');
 * await adapter.write('device-id-123', buffer);
 * await adapter.disconnect('device-id-123');
 * ```
 */
export class BaiduAdapter extends BaseAdapter {
  /**
   * Connects to a Bluetooth device and discovers services
   *
   * @param deviceId - Bluetooth device ID
   * @throws {BluetoothPrintError} When connection fails
   */
  async connect(deviceId: string): Promise<void> {
    this.validateDeviceId(deviceId);

    // Check if already connected
    if (this.isDeviceConnected(deviceId)) {
      this.logger.warn('Device already connected:', deviceId);
      this.updateState(PrinterState.CONNECTED);
      return;
    }

    this.updateState(PrinterState.CONNECTING);
    this.logger.debug('Connecting to device:', deviceId);

    try {
      // Add connection timeout handling
      let timeoutId: NodeJS.Timeout | undefined;
      const connectionPromise = swan.createBLEConnection({
        deviceId,
      });

      const timeoutPromise = new Promise((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error('Connection timeout after 10 seconds'));
        }, 10000);
      });

      await Promise.race([connectionPromise, timeoutPromise]);
      if (timeoutId) {
        clearTimeout(timeoutId); // Clear timeout after successful connection
      }
      this.logger.info('BLE connection established');

      // Discover and cache services
      await this.discoverServices(deviceId);

      this.updateState(PrinterState.CONNECTED);
      this.logger.info('Device connected successfully');

      // Listen for connection state changes
      swan.onBLEConnectionStateChange((res: { deviceId: string; connected: boolean }) => {
        if (res.deviceId === deviceId && !res.connected) {
          this.logger.warn('Device disconnected unexpectedly');
          this.updateState(PrinterState.DISCONNECTED);
          this.cleanupDevice(deviceId);
        }
      });
    } catch (error) {
      this.updateState(PrinterState.DISCONNECTED);
      this.logger.error('Connection failed:', error);

      // Return more specific error codes based on error message
      const errorMessage = (error as Error).message || '';
      if (errorMessage.includes('timeout')) {
        throw new BluetoothPrintError(
          ErrorCode.CONNECTION_TIMEOUT,
          `Connection to device ${deviceId} timed out`,
          error as Error
        );
      } else if (errorMessage.includes('not found')) {
        throw new BluetoothPrintError(
          ErrorCode.DEVICE_NOT_FOUND,
          `Device ${deviceId} not found`,
          error as Error
        );
      }

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
    this.validateDeviceId(deviceId);
    this.updateState(PrinterState.DISCONNECTING);
    this.logger.debug('Disconnecting from device:', deviceId);

    try {
      await swan.closeBLEConnection({
        deviceId,
      });
      this.cleanupDevice(deviceId);
      this.updateState(PrinterState.DISCONNECTED);
      this.logger.info('Device disconnected successfully');
    } catch (error) {
      // Ignore error on disconnect, but log it
      this.logger.warn('Disconnect error (ignored):', error);
      this.cleanupDevice(deviceId);
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
    this.validateDeviceId(deviceId);
    this.validateBuffer(buffer);
    const serviceInfo = this.getServiceInfo(deviceId);
    const validatedOptions = this.validateOptions(options);

    // Validate device is still connected
    try {
      const state = await swan.getBLEConnectionState({
        deviceId,
      });
      if (!state.connected) {
        this.cleanupDevice(deviceId);
        throw new BluetoothPrintError(ErrorCode.DEVICE_DISCONNECTED, 'Device disconnected');
      }
    } catch (error) {
      this.cleanupDevice(deviceId);
      throw new BluetoothPrintError(
        ErrorCode.DEVICE_DISCONNECTED,
        'Device disconnected',
        error as Error
      );
    }

    const { chunkSize, delay, retries } = validatedOptions;
    const data = new Uint8Array(buffer);
    const totalChunks = Math.ceil(data.length / chunkSize);

    this.logger.debug(`Writing ${data.length} bytes in ${totalChunks} chunks`);

    // If no data to write, return directly
    if (data.length === 0) {
      this.logger.warn('No data to write');
      return;
    }

    for (let i = 0; i < data.length; i += chunkSize) {
      const chunk = data.slice(i, i + chunkSize);
      const chunkNum = Math.floor(i / chunkSize) + 1;

      let attempt = 0;
      while (attempt <= retries) {
        try {
          // Add write timeout handling
          const writePromise = swan.writeBLECharacteristicValue({
            deviceId,
            serviceId: serviceInfo.serviceId,
            characteristicId: serviceInfo.characteristicId,
            value: chunk.buffer,
          });

          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => {
              reject(new Error('Write timeout after 5 seconds'));
            }, 5000);
          });

          await Promise.race([writePromise, timeoutPromise]);

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
   * Discovers services and characteristics for a device
   * Caches the writeable characteristic for future writes
   *
   * @param deviceId - Bluetooth device ID
   * @throws {BluetoothPrintError} When no writeable characteristic is found
   */
  private async discoverServices(deviceId: string): Promise<void> {
    this.logger.debug('Discovering services for device:', deviceId);

    try {
      const services = await swan.getBLEDeviceServices({
        deviceId,
      });

      for (const service of services.services) {
        const chars = await swan.getBLEDeviceCharacteristics({
          deviceId,
          serviceId: service.uuid,
        });

        const writeChar = chars.characteristics.find(
          (c: BaiduBLECharacteristic) => c.properties.write || c.properties.writeWithoutResponse
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
}
