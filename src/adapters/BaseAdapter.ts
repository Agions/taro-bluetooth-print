/**
 * Base Adapter Implementation
 * Provides common functionality for all platform-specific adapters
 */

import { IPrinterAdapter, IAdapterOptions, PrinterState } from '@/types';
import { Logger } from '@/utils/logger';
import { normalizeError } from '@/utils/normalizeError';
import { withTimeout } from '@/utils/withTimeout';
import { BluetoothPrintError, ErrorCode } from '@/errors/baseError';
import {
  ChunkWriteStrategy,
  type ChunkWriteContext,
  type ChunkWriteResult,
  DEFAULT_ADAPTIVE_CONFIG,
} from './ChunkWriteStrategy';

/**
 * MiniProgram BLE Chunk Write Strategy
 *
 * Wraps the platform-specific writeBLECharacteristicValue call
 * into the ChunkWriteStrategy template with Promise.race timeout.
 */
class MiniProgramWriteStrategy extends ChunkWriteStrategy {
  constructor(private api: MiniProgramBLEApi) {
    super('MiniProgramAdapter', {
      ...DEFAULT_ADAPTIVE_CONFIG,
      connectionCheckInterval: 5,
    });
  }

  protected async writeSingleChunk(
    chunk: Uint8Array,
    context: ChunkWriteContext
  ): Promise<ChunkWriteResult> {
    const timeoutMs = this.computeTimeoutMs(chunk.length);

    try {
      const writePromise = this.api.writeBLECharacteristicValue({
        deviceId: context.deviceId,
        serviceId: context.serviceId,
        characteristicId: context.characteristicId,
        value: chunk.buffer,
      });

      let writeTimeoutId: ReturnType<typeof setTimeout> | undefined;
      const timeoutPromise = new Promise<never>((_, reject) => {
        writeTimeoutId = setTimeout(() => {
          reject(new Error(`Write timeout after ${timeoutMs}ms`));
        }, timeoutMs);
      });

      await Promise.race([writePromise, timeoutPromise]);
      if (writeTimeoutId) clearTimeout(writeTimeoutId);

      return { success: true };
    } catch (error) {
      return { success: false, error: normalizeError(error) };
    }
  }

  async checkConnection(deviceId: string): Promise<void> {
    try {
      const state = await this.api.getBLEConnectionState({ deviceId });
      if (!state.connected) {
        throw new BluetoothPrintError(ErrorCode.DEVICE_DISCONNECTED, 'Device disconnected');
      }
    } catch (error) {
      if (error instanceof BluetoothPrintError) throw error;
      throw new BluetoothPrintError(
        ErrorCode.DEVICE_DISCONNECTED,
        'Device disconnected',
        normalizeError(error)
      );
    }
  }
}

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
    value: ArrayBuffer | ArrayBufferLike;
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
  /**
   * Classifies a connection error into the appropriate BluetoothPrintError.
   * Examines the error message to determine whether it was a timeout,
   * device-not-found, or generic connection failure.
   *
   * @param error - The original error
   * @param deviceId - The device ID that failed to connect
   * @returns A classified BluetoothPrintError
   */
  protected classifyConnectionError(error: unknown, deviceId: string): BluetoothPrintError {
    const errorMessage = normalizeError(error).message;
    if (errorMessage.includes('timeout')) {
      return new BluetoothPrintError(
        ErrorCode.CONNECTION_TIMEOUT,
        `Connection to device ${deviceId} timed out`,
        normalizeError(error)
      );
    } else if (errorMessage.includes('not found') || errorMessage.includes('not exist')) {
      return new BluetoothPrintError(
        ErrorCode.DEVICE_NOT_FOUND,
        `Device ${deviceId} not found`,
        normalizeError(error)
      );
    }
    return new BluetoothPrintError(
      ErrorCode.CONNECTION_FAILED,
      `Failed to connect to device ${deviceId}`,
      normalizeError(error)
    );
  }

  /**
   * Template method for discovering BLE services and caching the writeable characteristic.
   * Subclasses provide a platform-specific discovery function that returns a normalised
   * list of services with their characteristics.
   *
   * @param deviceId - Bluetooth device ID
   * @param discoverFn - Function that returns normalised service/characteristic info
   * @throws {BluetoothPrintError} When no writeable characteristic is found
   */
  protected async discoverAndCacheServices(
    deviceId: string,
    discoverFn: () => Promise<
      Array<{
        serviceId: string;
        characteristics: Array<{ characteristicId: string; isWritable: boolean }>;
      }>
    >
  ): Promise<void> {
    this.logger.debug('Discovering services for device:', deviceId);

    try {
      const services = await discoverFn();

      for (const service of services) {
        const writeChar = service.characteristics.find(c => c.isWritable);

        if (writeChar) {
          this.serviceCache.set(deviceId, {
            serviceId: service.serviceId,
            characteristicId: writeChar.characteristicId,
          });
          this.logger.info('Found writeable characteristic:', {
            service: service.serviceId,
            characteristic: writeChar.characteristicId,
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
        normalizeError(error)
      );
    }
  }

  /**
   * Cleanup resources and destroy the adapter instance.
   * Removes all event listeners and releases resources.
   */
  destroy(): void {
    this.logger.debug('Destroying BaseAdapter');
    this.serviceCache.clear();
    this.stateCallback = undefined;
  }
}

/**
 * Base adapter for mini-program platforms (Taro/WeChat, Alipay, Baidu, ByteDance).
 *
 * Implements connect/disconnect/write/discoverServices once with adaptive transmission.
 * Subclasses only need to implement `getApi()` to return the platform-specific BLE API object.
 */
export abstract class MiniProgramAdapter extends BaseAdapter {
  private writeStrategy: MiniProgramWriteStrategy | null = null;

  /**
   * Returns the platform-specific BLE API object.
   * Subclasses must implement this to return the appropriate global (Taro, my, swan, tt).
   */
  protected abstract getApi(): MiniProgramBLEApi;

  /**
   * Lazy-init the write strategy using the adapter's API
   */
  private getWriteStrategy(): MiniProgramWriteStrategy {
    if (!this.writeStrategy) {
      this.writeStrategy = new MiniProgramWriteStrategy(this.getApi());
    }
    return this.writeStrategy;
  }

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
      await withTimeout(
        this.getApi().createBLEConnection({ deviceId }),
        10000,
        'Connection timeout after 10 seconds'
      );
      this.logger.info('BLE connection established');

      // Discover and cache services
      await this.discoverServices(deviceId);

      this.updateState(PrinterState.CONNECTED);
      this.logger.info('Device connected successfully');

      // Listen for connection state changes
      this.getApi().onBLEConnectionStateChange((res: { deviceId: string; connected: boolean }) => {
        if (res.deviceId === deviceId && !res.connected) {
          this.logger.warn('Device disconnected unexpectedly');
          this.updateState(PrinterState.DISCONNECTED);
          this.cleanupDevice(deviceId);
        }
      });
    } catch (error) {
      this.updateState(PrinterState.DISCONNECTED);
      this.logger.error('Connection failed:', error);
      throw this.classifyConnectionError(error, deviceId);
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

    await this.getWriteStrategy().execute(
      buffer,
      {
        deviceId,
        serviceId: serviceInfo.serviceId,
        characteristicId: serviceInfo.characteristicId,
      },
      options ?? {}
    );
  }

  /**
   * Discovers services and characteristics for a device.
   * Caches the writeable characteristic for future writes.
   *
   * @param deviceId - Bluetooth device ID
   * @throws {BluetoothPrintError} When no writeable characteristic is found
   */
  private async discoverServices(deviceId: string): Promise<void> {
    await this.discoverAndCacheServices(deviceId, async () => {
      const services = await this.getApi().getBLEDeviceServices({ deviceId });
      const result: Array<{
        serviceId: string;
        characteristics: Array<{ characteristicId: string; isWritable: boolean }>;
      }> = [];
      for (const service of services.services) {
        const chars = await this.getApi().getBLEDeviceCharacteristics({
          deviceId,
          serviceId: service.uuid,
        });
        result.push({
          serviceId: service.uuid,
          characteristics: chars.characteristics.map((c: BLECharacteristic) => ({
            characteristicId: c.uuid,
            isWritable: c.properties.write || c.properties.writeWithoutResponse,
          })),
        });
      }
      return result;
    });
  }
}
