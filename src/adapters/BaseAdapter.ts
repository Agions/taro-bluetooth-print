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
 * BLE characteristic properties (common across all mini-program platforms)
 */
export interface BLECharacteristicProperties {
  write?: boolean;
  writeWithoutResponse?: boolean;
  read?: boolean;
  notify?: boolean;
  indicate?: boolean;
}

/**
 * BLE characteristic (common across all mini-program platforms)
 */
export interface BLECharacteristic {
  uuid: string;
  properties: BLECharacteristicProperties;
}

/**
 * Unified mini-program BLE API interface.
 * All mini-program platforms (Taro/WeChat, Alipay, Baidu, ByteDance)
 * share the same API shape, only the global object differs.
 */
export interface MiniProgramBLEApi {
  createBLEConnection(options: { deviceId: string }): Promise<void>;
  closeBLEConnection(options: { deviceId: string }): Promise<void>;
  getBLEConnectionState(options: { deviceId: string }): Promise<{ connected: boolean }>;
  writeBLECharacteristicValue(options: {
    deviceId: string;
    serviceId: string;
    characteristicId: string;
    value: ArrayBuffer;
  }): Promise<void>;
  getBLEDeviceServices(options: {
    deviceId: string;
  }): Promise<{ services: Array<{ uuid: string }> }>;
  getBLEDeviceCharacteristics(options: {
    deviceId: string;
    serviceId: string;
  }): Promise<{ characteristics: BLECharacteristic[] }>;
  onBLEConnectionStateChange(
    callback: (res: { deviceId: string; connected: boolean }) => void
  ): void;
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

/**
 * Base adapter for mini-program platforms (Taro/WeChat, Alipay, Baidu, ByteDance).
 *
 * Implements connect/disconnect/write/discoverServices once with adaptive transmission.
 * Subclasses only need to implement `getApi()` to return the platform-specific BLE API object.
 */
export abstract class MiniProgramAdapter extends BaseAdapter {
  /**
   * Returns the platform-specific BLE API object.
   * Subclasses must implement this to return the appropriate global (Taro, my, swan, tt).
   */
  protected abstract getApi(): MiniProgramBLEApi;

  /**
   * Connects to a Bluetooth device and discovers services
   *
   * @param deviceId - Bluetooth device ID
   * @throws {BluetoothPrintError} When connection fails
   */
  async connect(deviceId: string): Promise<void> {
    this.validateDeviceId(deviceId);

    // 检查是否已连接
    if (this.isDeviceConnected(deviceId)) {
      this.logger.warn('Device already connected:', deviceId);
      this.updateState(PrinterState.CONNECTED);
      return;
    }

    this.updateState(PrinterState.CONNECTING);
    this.logger.debug('Connecting to device:', deviceId);

    try {
      // 添加连接超时处理
      let timeoutId: NodeJS.Timeout | undefined;
      const connectionPromise = this.getApi().createBLEConnection({ deviceId });
      const timeoutPromise = new Promise((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error('Connection timeout after 10 seconds'));
        }, 10000);
      });

      await Promise.race([connectionPromise, timeoutPromise]);
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      this.logger.info('BLE connection established');

      // Discover and cache services
      await this.discoverServices(deviceId);

      this.updateState(PrinterState.CONNECTED);
      this.logger.info('Device connected successfully');

      // Listen for connection state changes
      this.getApi().onBLEConnectionStateChange(
        (res: { deviceId: string; connected: boolean }) => {
          if (res.deviceId === deviceId && !res.connected) {
            this.logger.warn('Device disconnected unexpectedly');
            this.updateState(PrinterState.DISCONNECTED);
            this.cleanupDevice(deviceId);
          }
        }
      );
    } catch (error) {
      this.updateState(PrinterState.DISCONNECTED);
      this.logger.error('Connection failed:', error);

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
      await this.getApi().closeBLEConnection({ deviceId });
      this.cleanupDevice(deviceId);
      this.updateState(PrinterState.DISCONNECTED);
      this.logger.info('Device disconnected successfully');
    } catch (error) {
      this.logger.warn('Disconnect error (ignored):', error);
      this.cleanupDevice(deviceId);
      this.updateState(PrinterState.DISCONNECTED);
    }
  }

  /**
   * Writes data to the Bluetooth device in chunks with adaptive transmission.
   *
   * Features:
   * - Automatic chunk size adjustment based on success/failure rate
   * - Dynamic delay adjustment for congestion control
   * - Periodic connection state checks
   * - Exponential backoff for retries
   * - Write timeout per chunk
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

    // 验证设备是否仍处于连接状态
    await this.checkConnectionState(deviceId);

    let { chunkSize } = validatedOptions;
    const { delay, retries } = validatedOptions;
    const data = new Uint8Array(buffer);
    let totalChunks = Math.ceil(data.length / chunkSize);

    this.logger.debug(`Writing ${data.length} bytes in ${totalChunks} chunks`);

    if (data.length === 0) {
      this.logger.warn('No data to write');
      return;
    }

    // 自适应传输参数
    let successCount = 0;
    let failureCount = 0;
    let consecutiveFailures = 0;
    const minChunkSize = 10;
    const maxChunkSize = 256;
    let baseDelay = delay;
    const maxDelay = 200;
    const connectionCheckInterval = 5;

    for (let i = 0; i < data.length; i += chunkSize) {
      // 定期检查连接状态
      if (i > 0 && Math.floor(i / chunkSize) % connectionCheckInterval === 0) {
        await this.checkConnectionState(deviceId);
      }

      const chunk = data.slice(i, i + chunkSize);
      const chunkNum = Math.floor(i / chunkSize) + 1;
      let attempt = 0;
      let writeSuccess = false;

      while (attempt <= retries) {
        try {
          const timeoutMs = Math.max(1000, Math.min(10000, 1000 + chunk.length * 5));

          const writePromise = this.getApi().writeBLECharacteristicValue({
            deviceId,
            serviceId: serviceInfo.serviceId,
            characteristicId: serviceInfo.characteristicId,
            value: chunk.buffer,
          });

          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => {
              reject(new Error(`Write timeout after ${timeoutMs} milliseconds`));
            }, timeoutMs);
          });

          await Promise.race([writePromise, timeoutPromise]);

          this.logger.debug(`Chunk ${chunkNum}/${totalChunks} written successfully`);
          writeSuccess = true;
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

          const retryDelay = baseDelay * Math.pow(2, attempt - 1);
          await new Promise(r => setTimeout(r, Math.min(retryDelay, maxDelay)));
        }
      }

      // 动态调整块大小和延迟
      if (writeSuccess) {
        successCount++;
        consecutiveFailures = 0;
        failureCount = Math.max(0, failureCount - 1);

        if (successCount % 3 === 0 && chunkSize < maxChunkSize) {
          chunkSize = Math.min(maxChunkSize, chunkSize + 5);
          baseDelay = Math.max(baseDelay / 1.2, validatedOptions.delay);
          totalChunks = Math.ceil((data.length - i - chunkSize) / chunkSize) + chunkNum;
          this.logger.debug(`Increased chunk size to ${chunkSize}, delay to ${baseDelay}`);
        }
      } else {
        failureCount++;
        consecutiveFailures++;
        successCount = Math.max(0, successCount - 1);

        if (consecutiveFailures >= 2 && chunkSize > minChunkSize) {
          chunkSize = Math.max(minChunkSize, chunkSize - 5);
          baseDelay = Math.min(baseDelay * 1.5, maxDelay);
          totalChunks = Math.ceil((data.length - i - chunkSize) / chunkSize) + chunkNum;
          this.logger.debug(`Decreased chunk size to ${chunkSize}, delay to ${baseDelay}`);
          consecutiveFailures = 0;
        }
      }

      // Small delay to prevent congestion
      if (i + chunkSize < data.length) {
        await new Promise(r => setTimeout(r, baseDelay));
      }
    }

    this.logger.info(`Successfully wrote ${data.length} bytes`);
  }

  /**
   * Check connection state, throw if disconnected
   */
  private async checkConnectionState(deviceId: string): Promise<void> {
    try {
      const state = await this.getApi().getBLEConnectionState({ deviceId });
      if (!state.connected) {
        this.cleanupDevice(deviceId);
        throw new BluetoothPrintError(ErrorCode.DEVICE_DISCONNECTED, 'Device disconnected');
      }
    } catch (error) {
      if (error instanceof BluetoothPrintError) {
        throw error;
      }
      this.cleanupDevice(deviceId);
      throw new BluetoothPrintError(
        ErrorCode.DEVICE_DISCONNECTED,
        'Device disconnected',
        error as Error
      );
    }
  }

  /**
   * Discovers services and characteristics for a device.
   * Caches the writeable characteristic for future writes.
   *
   * @param deviceId - Bluetooth device ID
   * @throws {BluetoothPrintError} When no writeable characteristic is found
   */
  private async discoverServices(deviceId: string): Promise<void> {
    this.logger.debug('Discovering services for device:', deviceId);

    try {
      const services = await this.getApi().getBLEDeviceServices({ deviceId });

      for (const service of services.services) {
        const chars = await this.getApi().getBLEDeviceCharacteristics({
          deviceId,
          serviceId: service.uuid,
        });

        const writeChar = chars.characteristics.find(
          (c: BLECharacteristic) => c.properties.write || c.properties.writeWithoutResponse
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
