/**
 * Web Bluetooth Adapter
 * Implements the IPrinterAdapter interface for Web Bluetooth API (H5 environment)
 */

import { IAdapterOptions, PrinterState } from '@/types';
import { BaseAdapter } from './BaseAdapter';
import { BluetoothPrintError, ErrorCode } from '@/errors/BluetoothError';

/**
 * Web Bluetooth device information
 */
interface WebBluetoothDeviceInfo {
  device: BluetoothDevice;
  server: BluetoothRemoteGATTServer;
  characteristic: BluetoothRemoteGATTCharacteristic;
}

/**
 * Request device options for Web Bluetooth
 */
export interface WebBluetoothRequestOptions {
  /** Filter by service UUIDs */
  serviceUUIDs?: string[];
  /** Filter by device name prefix */
  namePrefix?: string;
  /** Accept all devices (requires at least one optional service) */
  acceptAllDevices?: boolean;
  /** Optional services to access */
  optionalServices?: string[];
}

/**
 * Common printer service UUIDs
 */
const PRINTER_SERVICE_UUIDS = [
  '000018f0-0000-1000-8000-00805f9b34fb', // Common printer service
  '49535343-fe7d-4ae5-8fa9-9fafd205e455', // Nordic UART Service
  'e7810a71-73ae-499d-8c15-faa9aef0c3f2', // Serial Port Profile
];

/**
 * Web Bluetooth adapter for H5 environment
 *
 * @example
 * ```typescript
 * if (WebBluetoothAdapter.isSupported()) {
 *   const adapter = new WebBluetoothAdapter();
 *   const device = await adapter.requestDevice();
 *   await adapter.connect(device.id);
 *   await adapter.write(device.id, buffer);
 *   await adapter.disconnect(device.id);
 * }
 * ```
 */
export class WebBluetoothAdapter extends BaseAdapter {
  private devices: Map<string, WebBluetoothDeviceInfo> = new Map();

  /**
   * Check if Web Bluetooth API is supported in the current browser
   * @returns True if Web Bluetooth is supported
   */
  static isSupported(): boolean {
    return (
      typeof navigator !== 'undefined' &&
      typeof navigator.bluetooth !== 'undefined' &&
      typeof navigator.bluetooth.requestDevice === 'function'
    );
  }

  /**
   * Request a Bluetooth device from the user
   * This will show the browser's device picker dialog
   *
   * @param options - Request options for filtering devices
   * @returns The selected Bluetooth device
   * @throws {BluetoothPrintError} When Web Bluetooth is not supported or user cancels
   */
  async requestDevice(options?: WebBluetoothRequestOptions): Promise<BluetoothDevice> {
    if (!WebBluetoothAdapter.isSupported()) {
      throw new BluetoothPrintError(
        ErrorCode.PLATFORM_NOT_SUPPORTED,
        'Web Bluetooth API is not supported in this browser'
      );
    }

    this.logger.debug('Requesting Bluetooth device');

    try {
      const requestOptions: RequestDeviceOptions = this.buildRequestOptions(options);
      const device = await navigator.bluetooth.requestDevice(requestOptions);

      this.logger.info('Device selected:', device.name || device.id);
      return device;
    } catch (error) {
      const errorMessage = (error as Error).message || '';

      if (errorMessage.includes('cancelled') || errorMessage.includes('canceled')) {
        throw new BluetoothPrintError(
          ErrorCode.CONNECTION_FAILED,
          'User cancelled device selection'
        );
      }

      if (errorMessage.includes('permission') || errorMessage.includes('denied')) {
        throw new BluetoothPrintError(ErrorCode.CONNECTION_FAILED, 'Bluetooth permission denied');
      }

      throw new BluetoothPrintError(
        ErrorCode.CONNECTION_FAILED,
        'Failed to request Bluetooth device',
        error as Error
      );
    }
  }

  /**
   * Connect to a Bluetooth device
   *
   * @param deviceId - Bluetooth device ID
   * @throws {BluetoothPrintError} When connection fails
   */
  async connect(deviceId: string): Promise<void> {
    this.validateDeviceId(deviceId);

    // Check if already connected
    if (this.devices.has(deviceId)) {
      this.logger.warn('Device already connected:', deviceId);
      this.updateState(PrinterState.CONNECTED);
      return;
    }

    this.updateState(PrinterState.CONNECTING);
    this.logger.debug('Connecting to device:', deviceId);

    try {
      // Request device if not already have a reference
      const device = await this.getOrRequestDevice(deviceId);

      if (!device.gatt) {
        throw new BluetoothPrintError(ErrorCode.CONNECTION_FAILED, 'Device does not support GATT');
      }

      // Connect to GATT server with timeout
      const server = await this.connectWithTimeout(device.gatt, 10000);
      this.logger.info('GATT server connected');

      // Discover services and find writeable characteristic
      const characteristic = await this.discoverWriteableCharacteristic(server);

      // Store device info
      this.devices.set(deviceId, { device, server, characteristic });
      this.serviceCache.set(deviceId, {
        serviceId: characteristic.service?.uuid || '',
        characteristicId: characteristic.uuid,
      });

      // Listen for disconnection
      device.addEventListener('gattserverdisconnected', () => {
        this.handleDisconnection(deviceId);
      });

      this.updateState(PrinterState.CONNECTED);
      this.logger.info('Device connected successfully');
    } catch (error) {
      this.updateState(PrinterState.DISCONNECTED);
      this.logger.error('Connection failed:', error);

      if (error instanceof BluetoothPrintError) {
        throw error;
      }

      const errorMessage = (error as Error).message || '';
      if (errorMessage.includes('timeout')) {
        throw new BluetoothPrintError(
          ErrorCode.CONNECTION_TIMEOUT,
          `Connection to device ${deviceId} timed out`,
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
   * Disconnect from a Bluetooth device
   *
   * @param deviceId - Bluetooth device ID
   */
  disconnect(deviceId: string): Promise<void> {
    this.validateDeviceId(deviceId);
    this.updateState(PrinterState.DISCONNECTING);
    this.logger.debug('Disconnecting from device:', deviceId);

    try {
      const deviceInfo = this.devices.get(deviceId);
      if (deviceInfo?.server?.connected) {
        deviceInfo.server.disconnect();
      }
    } catch (error) {
      this.logger.warn('Disconnect error (ignored):', error);
    } finally {
      this.cleanupDeviceInfo(deviceId);
      this.updateState(PrinterState.DISCONNECTED);
      this.logger.info('Device disconnected successfully');
    }

    return Promise.resolve();
  }

  /**
   * Write data to the Bluetooth device
   *
   * @param deviceId - Bluetooth device ID
   * @param buffer - Data to write as ArrayBuffer
   * @param options - Write options (chunk size, delay, retries)
   * @throws {BluetoothPrintError} When write fails
   */
  async write(deviceId: string, buffer: ArrayBuffer, options?: IAdapterOptions): Promise<void> {
    this.validateDeviceId(deviceId);
    this.validateBuffer(buffer);

    const deviceInfo = this.devices.get(deviceId);
    if (!deviceInfo) {
      throw new BluetoothPrintError(
        ErrorCode.DEVICE_DISCONNECTED,
        'Device not connected. Call connect() first.'
      );
    }

    if (!deviceInfo.server.connected) {
      this.cleanupDeviceInfo(deviceId);
      throw new BluetoothPrintError(ErrorCode.DEVICE_DISCONNECTED, 'Device disconnected');
    }

    const validatedOptions = this.validateOptions(options);
    const { chunkSize, delay, retries } = validatedOptions;
    const data = new Uint8Array(buffer);
    const totalChunks = Math.ceil(data.length / chunkSize);

    this.logger.debug(`Writing ${data.length} bytes in ${totalChunks} chunks`);

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
          // Check connection before write
          if (!deviceInfo.server.connected) {
            this.cleanupDeviceInfo(deviceId);
            throw new BluetoothPrintError(ErrorCode.DEVICE_DISCONNECTED, 'Device disconnected');
          }

          await deviceInfo.characteristic.writeValueWithoutResponse(chunk.buffer);
          this.logger.debug(`Chunk ${chunkNum}/${totalChunks} written successfully`);
          break;
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
          await new Promise(r => setTimeout(r, delay * attempt));
        }
      }

      // Delay between chunks
      if (i + chunkSize < data.length) {
        await new Promise(r => setTimeout(r, delay));
      }
    }

    this.logger.info(`Successfully wrote ${data.length} bytes`);
  }

  /**
   * Build request options for navigator.bluetooth.requestDevice
   */
  private buildRequestOptions(options?: WebBluetoothRequestOptions): RequestDeviceOptions {
    if (options?.acceptAllDevices) {
      return {
        acceptAllDevices: true,
        optionalServices: options.optionalServices || PRINTER_SERVICE_UUIDS,
      };
    }

    const filters: BluetoothLEScanFilter[] = [];

    if (options?.serviceUUIDs?.length) {
      filters.push({ services: options.serviceUUIDs });
    }

    if (options?.namePrefix) {
      filters.push({ namePrefix: options.namePrefix });
    }

    // Default: filter by common printer services
    if (filters.length === 0) {
      return {
        acceptAllDevices: true,
        optionalServices: PRINTER_SERVICE_UUIDS,
      };
    }

    return {
      filters,
      optionalServices: options?.optionalServices || PRINTER_SERVICE_UUIDS,
    };
  }

  /**
   * Get existing device or request a new one
   */
  private async getOrRequestDevice(deviceId: string): Promise<BluetoothDevice> {
    // Check if we have a cached device
    const existingInfo = this.devices.get(deviceId);
    if (existingInfo?.device) {
      return existingInfo.device;
    }

    // Request a new device
    return this.requestDevice();
  }

  /**
   * Connect to GATT server with timeout
   */
  private async connectWithTimeout(
    gatt: BluetoothRemoteGATTServer,
    timeoutMs: number
  ): Promise<BluetoothRemoteGATTServer> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error('Connection timeout'));
      }, timeoutMs);

      gatt
        .connect()
        .then(server => {
          clearTimeout(timeoutId);
          resolve(server);
        })
        .catch(error => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
  }

  /**
   * Discover services and find a writeable characteristic
   */
  private async discoverWriteableCharacteristic(
    server: BluetoothRemoteGATTServer
  ): Promise<BluetoothRemoteGATTCharacteristic> {
    this.logger.debug('Discovering services');

    try {
      const services = await server.getPrimaryServices();

      for (const service of services) {
        try {
          const characteristics = await service.getCharacteristics();

          for (const char of characteristics) {
            if (char.properties.write || char.properties.writeWithoutResponse) {
              this.logger.info('Found writeable characteristic:', {
                service: service.uuid,
                characteristic: char.uuid,
              });
              return char;
            }
          }
        } catch (error) {
          this.logger.debug(`Failed to get characteristics for service ${service.uuid}:`, error);
        }
      }

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
   * Handle device disconnection
   */
  private handleDisconnection(deviceId: string): void {
    this.logger.warn('Device disconnected unexpectedly:', deviceId);
    this.cleanupDeviceInfo(deviceId);
    this.updateState(PrinterState.DISCONNECTED);
  }

  /**
   * Clean up device information
   */
  private cleanupDeviceInfo(deviceId: string): void {
    this.devices.delete(deviceId);
    this.cleanupDevice(deviceId);
  }
}
