/**
 * Taro Bluetooth Adapter
 * Implements the IPrinterAdapter interface for Taro framework
 */

import { IAdapterOptions, PrinterState } from '@/types';
import { BaseAdapter } from './BaseAdapter';
import { BluetoothPrintError, ErrorCode } from '@/errors/BluetoothError';

// Declare Taro global for TypeScript
interface TaroBLEService {
  uuid: string;
}

interface TaroBLECharacteristicProperties {
  write?: boolean;
  writeWithoutResponse?: boolean;
  read?: boolean;
  notify?: boolean;
  indicate?: boolean;
}

interface TaroBLECharacteristic {
  uuid: string;
  properties: TaroBLECharacteristicProperties;
}

interface TaroBLEDeviceServicesResult {
  services: TaroBLEService[];
}

interface TaroBLEDeviceCharacteristicsResult {
  characteristics: TaroBLECharacteristic[];
}

interface TaroBLEConnectionStateResult {
  connected: boolean;
}

interface TaroBLEConnectionOptions {
  deviceId: string;
}

interface TaroBLEWriteOptions {
  deviceId: string;
  serviceId: string;
  characteristicId: string;
  value: ArrayBuffer;
}

interface TaroBLEConnectionStateChangeCallback {
  (res: { deviceId: string; connected: boolean }): void;
}

interface TaroGlobal {
  createBLEConnection(options: TaroBLEConnectionOptions): Promise<void>;
  closeBLEConnection(options: TaroBLEConnectionOptions): Promise<void>;
  getBLEConnectionState(options: TaroBLEConnectionOptions): Promise<TaroBLEConnectionStateResult>;
  writeBLECharacteristicValue(options: TaroBLEWriteOptions): Promise<void>;
  getBLEDeviceServices(options: TaroBLEConnectionOptions): Promise<TaroBLEDeviceServicesResult>;
  getBLEDeviceCharacteristics(options: {
    deviceId: string;
    serviceId: string;
  }): Promise<TaroBLEDeviceCharacteristicsResult>;
  onBLEConnectionStateChange(callback: TaroBLEConnectionStateChangeCallback): void;
}

declare const Taro: TaroGlobal;

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
export class TaroAdapter extends BaseAdapter {
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
      const connectionPromise = Taro.createBLEConnection({ deviceId });
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
      Taro.onBLEConnectionStateChange((res: { deviceId: string; connected: boolean }) => {
        if (res.deviceId === deviceId && !res.connected) {
          this.logger.warn('Device disconnected unexpectedly');
          this.updateState(PrinterState.DISCONNECTED);
          this.cleanupDevice(deviceId);
        }
      });
    } catch (error) {
      this.updateState(PrinterState.DISCONNECTED);
      this.logger.error('Connection failed:', error);

      // 根据错误类型返回更具体的错误代码
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
      await Taro.closeBLEConnection({ deviceId });
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

    // 验证设备是否仍处于连接状态
    try {
      const state = await Taro.getBLEConnectionState({ deviceId });
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

    let { chunkSize } = validatedOptions;
    const { delay, retries } = validatedOptions;
    const data = new Uint8Array(buffer);
    let totalChunks = Math.ceil(data.length / chunkSize);

    this.logger.debug(`Writing ${data.length} bytes in ${totalChunks} chunks`);

    // 如果没有数据要写入，直接返回
    if (data.length === 0) {
      this.logger.warn('No data to write');
      return;
    }

    // 网络状况监控变量
    let successCount = 0;
    let failureCount = 0;
    let consecutiveFailures = 0;
    const minChunkSize = 10; // 最小块大小
    const maxChunkSize = 256; // 最大块大小
    let baseDelay = delay; // 基础延迟
    const maxDelay = 200; // 最大延迟
    const connectionCheckInterval = 5; // 每5个块检查一次连接状态

    for (let i = 0; i < data.length; i += chunkSize) {
      // 定期检查连接状态
      if (i > 0 && Math.floor(i / chunkSize) % connectionCheckInterval === 0) {
        try {
          const state = await Taro.getBLEConnectionState({ deviceId });
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
      }

      const chunk = data.slice(i, i + chunkSize);
      const chunkNum = Math.floor(i / chunkSize) + 1;
      let attempt = 0;
      let writeSuccess = false;

      while (attempt <= retries) {
        try {
          // 根据块大小动态调整超时时间 (1秒基础时间 + 每字节5ms)
          const timeoutMs = Math.max(1000, Math.min(10000, 1000 + chunk.length * 5));

          // 添加写入超时处理
          const writePromise = Taro.writeBLECharacteristicValue({
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

          // 使用指数退避算法，重试间隔随重试次数增加而增加
          const retryDelay = baseDelay * Math.pow(2, attempt - 1);
          await new Promise(r => setTimeout(r, Math.min(retryDelay, maxDelay)));
        }
      }

      // 动态调整块大小和延迟
      if (writeSuccess) {
        successCount++;
        consecutiveFailures = 0;
        failureCount = Math.max(0, failureCount - 1);

        // 网络状况改善，增加块大小，减少延迟
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

        // 网络状况恶化，减少块大小，增加延迟
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
          (c: TaroBLECharacteristic) => c.properties.write || c.properties.writeWithoutResponse
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
