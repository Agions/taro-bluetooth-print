/**
 * React Native Bluetooth Adapter
 * Implements the IPrinterAdapter interface for React Native using react-native-ble-plx
 *
 * React Native does not have a native Web BLE API, so this adapter uses
 * the react-native-ble-plx library for BLE operations on iOS and Android.
 */

// Platform type - React Native availability is checked at runtime via Platform.OS
interface PlatformInterface {
  OS: string;
  select<T>(options: { ios?: T; android?: T; default?: T }): T;
}
const Platform = (globalThis as { Platform?: PlatformInterface }).Platform;

import { BaseAdapter } from './BaseAdapter';
import { IPrinterAdapter, IAdapterOptions, PrinterState } from '@/types';
import { Logger } from '@/utils/logger';
import { BluetoothPrintError, ErrorCode } from '@/errors/BluetoothError';

/**
 * BLE characteristic info with full UUIDs
 */
interface RNCharacteristic {
  uuid: string;
  isWritableWithResponse: boolean;
  isWritableWithoutResponse: boolean;
  isReadable: boolean;
  isNotifiable: boolean;
  isIndicatable: boolean;
}

/**
 * RNService info with characteristic list
 */
interface RNService {
  uuid: string;
  characteristics: RNCharacteristic[];
}

/**
 * React Native BLE Manager interface
 * Compatible with react-native-ble-plx API
 */
interface BLEManager {
  startDeviceScan(
    serviceUUIDs: string[] | null,
    options: Record<string, unknown> | null,
    onDeviceScanned: (error: unknown, device: unknown) => void
  ): void;
  stopDeviceScan(): void;
  connectToDevice(deviceIdentifier: string, options: Record<string, unknown>): Promise<unknown>;
  disconnectFromDevice(deviceIdentifier: string, force?: boolean): Promise<unknown>;
  discoverAllServicesAndCharacteristicsForDevice(deviceIdentifier: string): Promise<unknown>;
  writeCharacteristicWithResponseForDevice(
    deviceIdentifier: string,
    serviceUUID: string,
    characteristicUUID: string,
    value: string,
    transactionId?: string
  ): Promise<unknown>;
  writeCharacteristicWithoutResponseForDevice(
    deviceIdentifier: string,
    serviceUUID: string,
    characteristicUUID: string,
    value: string,
    transactionId?: string
  ): Promise<unknown>;
  readCharacteristicForDevice(
    deviceIdentifier: string,
    serviceUUID: string,
    characteristicUUID: string,
    transactionId?: string
  ): Promise<unknown>;
  monitorCharacteristicForDevice(
    deviceIdentifier: string,
    serviceUUID: string,
    characteristicUUID: string,
    onUpdate: (error: unknown, characteristic: unknown) => void,
    transactionId?: string
  ): { remove: () => void };
}

/**
 * BLE Device interface from react-native-ble-plx
 */
interface RNDevice {
  id: string;
  name: string | null;
  isConnected: boolean;
  rssi: number;
  mtu: number;
  requestConnectionPriority(): Promise<void>;
}

/**
 * React Native Bluetooth Low Energy adapter
 *
 * Uses react-native-ble-plx for BLE operations on iOS and Android.
 * This adapter does NOT extend MiniProgramAdapter because React Native
 * has a fundamentally different BLE API compared to mini-program platforms.
 *
 * @example
 * ```typescript
 * import BleManager from 'react-native-ble-plx';
 * import { ReactNativeAdapter } from 'taro-bluetooth-print';
 *
 * BleManager.start({ showAlert: false });
 *
 * const adapter = new ReactNativeAdapter({ bleManager: BleManager });
 * await adapter.connect('device-uuid-123');
 * await adapter.write('device-uuid-123', buffer);
 * await adapter.disconnect('device-uuid-123');
 * ```
 */
export class ReactNativeAdapter extends BaseAdapter implements IPrinterAdapter {
  private bleManager: BLEManager;
  private deviceCache: Map<string, RNDevice> = new Map();

  /**
   * Creates a new ReactNativeAdapter instance
   *
   * @param options - Configuration options
   * @param options.bleManager - BLE Manager instance (e.g., from react-native-ble-plx)
   * @throws {Error} If bleManager is not provided or not supported
   */
  constructor(options: { bleManager: BLEManager }) {
    super();

    if (!options?.bleManager) {
      throw new Error(
        'ReactNativeAdapter requires a bleManager instance (e.g., react-native-ble-plx). ' +
          'Please pass { bleManager: yourBleManager } in the constructor.'
      );
    }

    this.bleManager = options.bleManager;

    // Validate platform
    if (Platform && Platform.OS !== 'ios' && Platform.OS !== 'android') {
      Logger.scope('ReactNativeAdapter').warn(
        `Running on unsupported platform: ${Platform.OS}. BLE may not work correctly.`
      );
    }
  }

  /**
   * Connect to a Bluetooth device and discover services
   *
   * @param deviceId - Unique identifier (UUID) of the device to connect to
   * @throws {BluetoothPrintError} When connection fails or device not found
   */
  async connect(deviceId: string): Promise<void> {
    this.validateDeviceId(deviceId);

    if (this.isDeviceConnected(deviceId)) {
      Logger.scope('ReactNativeAdapter').warn('Device already connected:', deviceId);
      this.updateState(PrinterState.CONNECTED);
      return;
    }

    this.updateState(PrinterState.CONNECTING);
    Logger.scope('ReactNativeAdapter').debug('Connecting to device:', deviceId);

    try {
      // Add connection timeout
      const timeoutMs = 15000;
      const connectionPromise = this.performConnect(deviceId);

      let timeoutHandle: NodeJS.Timeout | null = null;
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutHandle = setTimeout(() => {
          reject(new Error('Connection timeout'));
        }, timeoutMs);
      });

      const device = await Promise.race([connectionPromise, timeoutPromise]);

      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
      }

      this.deviceCache.set(deviceId, device as RNDevice);
      await this.discoverServices(deviceId, device as RNDevice);

      this.updateState(PrinterState.CONNECTED);
      Logger.scope('ReactNativeAdapter').info('Device connected successfully');
    } catch (error) {
      this.updateState(PrinterState.DISCONNECTED);
      this.cleanupDevice(deviceId);

      const errorMsg = (error as Error).message || '';
      if (errorMsg.includes('timeout')) {
        throw new BluetoothPrintError(
          ErrorCode.CONNECTION_TIMEOUT,
          `Connection to device ${deviceId} timed out`,
          error as Error
        );
      } else if (errorMsg.includes('not found') || errorMsg.includes('not exist')) {
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
   * Perform the actual BLE connection
   */
  private async performConnect(deviceId: string): Promise<unknown> {
    const device = await (this.bleManager.connectToDevice(deviceId, {
      timeout: 10000,
    }) as Promise<RNDevice>);

    // Request connection priority for better throughput
    try {
      await device.requestConnectionPriority();
    } catch {
      // Ignore priority request errors
    }

    return device;
  }

  /**
   * Disconnect from a Bluetooth device
   *
   * @param deviceId - Unique identifier of the device to disconnect from
   */
  async disconnect(deviceId: string): Promise<void> {
    this.validateDeviceId(deviceId);
    this.updateState(PrinterState.DISCONNECTING);
    Logger.scope('ReactNativeAdapter').debug('Disconnecting from device:', deviceId);

    try {
      await (this.bleManager.disconnectFromDevice(deviceId, true) as Promise<void>);
      this.cleanupDevice(deviceId);
      this.deviceCache.delete(deviceId);
      this.updateState(PrinterState.DISCONNECTED);
      Logger.scope('ReactNativeAdapter').info('Device disconnected successfully');
    } catch (error) {
      Logger.scope('ReactNativeAdapter').warn('Disconnect error (ignored):', error);
      this.cleanupDevice(deviceId);
      this.deviceCache.delete(deviceId);
      this.updateState(PrinterState.DISCONNECTED);
    }
  }

  /**
   * Write data to the Bluetooth device in chunks
   *
   * Features:
   * - Automatic chunk size adjustment
   * - Dynamic delay for congestion control
   * - Retry with exponential backoff
   * - Write timeout per chunk
   *
   * @param deviceId - Unique identifier of the connected device
   * @param buffer - Data to write as ArrayBuffer
   * @param options - Optional write settings (chunkSize, delay, retries)
   * @throws {BluetoothPrintError} When write fails after all retries
   */
  async write(deviceId: string, buffer: ArrayBuffer, options?: IAdapterOptions): Promise<void> {
    this.validateDeviceId(deviceId);
    this.validateBuffer(buffer);
    const serviceInfo = this.getServiceInfo(deviceId);
    const validatedOptions = this.validateOptions(options);

    const device = this.deviceCache.get(deviceId);
    if (!device || !device.isConnected) {
      this.cleanupDevice(deviceId);
      throw new BluetoothPrintError(
        ErrorCode.DEVICE_DISCONNECTED,
        `Device ${deviceId} is not connected`
      );
    }

    let { chunkSize } = validatedOptions;
    const { delay, retries } = validatedOptions;
    const data = new Uint8Array(buffer);
    const totalChunks = Math.ceil(data.length / chunkSize);

    Logger.scope('ReactNativeAdapter').debug(
      `Writing ${data.length} bytes in ${totalChunks} chunks`
    );

    if (data.length === 0) {
      Logger.scope('ReactNativeAdapter').warn('No data to write');
      return;
    }

    // Adaptive transmission parameters
    let successCount = 0;
    let consecutiveFailures = 0;
    const minChunkSize = 10;
    const maxChunkSize = Math.min(512, device.mtu - 5); // Respect MTU if available
    let baseDelay = delay;
    const maxDelay = 200;

    for (let i = 0; i < data.length; i += chunkSize) {
      const chunk = data.slice(i, i + chunkSize);
      const chunkNum = Math.floor(i / chunkSize) + 1;
      let attempt = 0;
      let writeSuccess = false;

      while (attempt <= retries) {
        try {
          // Convert Uint8Array to base64 string for react-native-ble-plx
          const base64Value = this.arrayBufferToBase64(chunk.buffer);

          // Timeout per write
          const timeoutMs = Math.max(2000, Math.min(10000, 1000 + chunk.length * 10));
          let timeoutHandle: NodeJS.Timeout | null = null;

          const writePromise = (async () => {
            try {
              await (this.bleManager.writeCharacteristicWithResponseForDevice(
                deviceId,
                serviceInfo.serviceId,
                serviceInfo.characteristicId,
                base64Value
              ) as Promise<void>);
            } catch {
              // Fallback to without-response if with-response fails
              await (this.bleManager.writeCharacteristicWithoutResponseForDevice(
                deviceId,
                serviceInfo.serviceId,
                serviceInfo.characteristicId,
                base64Value
              ) as Promise<void>);
            }
          })();

          const timeoutPromise = new Promise<never>((_, reject) => {
            timeoutHandle = setTimeout(() => {
              reject(new Error(`Write timeout after ${timeoutMs}ms`));
            }, timeoutMs);
          });

          await Promise.race([writePromise, timeoutPromise]);

          if (timeoutHandle) {
            clearTimeout(timeoutHandle);
          }

          Logger.scope('ReactNativeAdapter').debug(
            `Chunk ${chunkNum}/${totalChunks} written successfully`
          );
          writeSuccess = true;
          break;
        } catch (error) {
          attempt++;
          if (attempt > retries) {
            Logger.scope('ReactNativeAdapter').error(
              `Chunk ${chunkNum} failed after ${retries} retries`
            );
            throw new BluetoothPrintError(
              ErrorCode.WRITE_FAILED,
              `Failed to write chunk ${chunkNum}/${totalChunks}`,
              error as Error
            );
          }
          Logger.scope('ReactNativeAdapter').warn(
            `Chunk ${chunkNum} write failed, retry ${attempt}/${retries}`
          );

          const retryDelay = baseDelay * Math.pow(2, attempt - 1);
          await new Promise(r => setTimeout(r, Math.min(retryDelay, maxDelay)));
        }
      }

      // Adaptive chunk size and delay adjustment
      if (writeSuccess) {
        successCount++;
        consecutiveFailures = 0;

        if (successCount % 3 === 0 && chunkSize < maxChunkSize) {
          chunkSize = Math.min(maxChunkSize, chunkSize + 5);
          baseDelay = Math.max(baseDelay / 1.2, validatedOptions.delay);
        }
      } else {
        consecutiveFailures++;
        successCount = Math.max(0, successCount - 1);

        if (consecutiveFailures >= 2 && chunkSize > minChunkSize) {
          chunkSize = Math.max(minChunkSize, chunkSize - 5);
          baseDelay = Math.min(baseDelay * 1.5, maxDelay);
          consecutiveFailures = 0;
        }
      }

      // Inter-chunk delay
      if (i + chunkSize < data.length) {
        await new Promise(r => setTimeout(r, baseDelay));
      }
    }

    Logger.scope('ReactNativeAdapter').info(`Successfully wrote ${data.length} bytes`);
  }

  /**
   * Start discovering nearby Bluetooth devices
   *
   * Note: This is optional in IPrinterAdapter. In React Native BLE,
   * device discovery is typically done via scan events.
   */
  startDiscovery?(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.bleManager.startDeviceScan(null, { allowDuplicates: false }, (error: unknown) => {
          if (error) {
            // eslint-disable-next-line @typescript-eslint/no-base-to-string
            reject(error instanceof Error ? error : new Error(String(error)));
          }
        });
        resolve();
      } catch (error) {
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    });
  }

  /**
   * Stop discovering nearby Bluetooth devices
   */
  stopDiscovery?(): Promise<void> {
    return new Promise(resolve => {
      this.bleManager.stopDeviceScan();
      resolve();
    });
  }

  /**
   * Discover services and characteristics for a connected device
   *
   * @param deviceId - Device identifier
   * @param device - Connected device object
   */
  private async discoverServices(deviceId: string, _device: RNDevice): Promise<void> {
    Logger.scope('ReactNativeAdapter').debug('Discovering services for device:', deviceId);

    try {
      const servicesResult = await (this.bleManager.discoverAllServicesAndCharacteristicsForDevice(
        deviceId
      ) as Promise<{ services: RNService[] }>);

      const services = servicesResult.services || [];

      for (const service of services) {
        const writeChar = service.characteristics.find(
          (c: RNCharacteristic) => c.isWritableWithResponse || c.isWritableWithoutResponse
        );

        if (writeChar) {
          this.serviceCache.set(deviceId, {
            serviceId: service.uuid,
            characteristicId: writeChar.uuid,
          });
          Logger.scope('ReactNativeAdapter').info('Found writeable characteristic:', {
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

  /**
   * Convert ArrayBuffer to base64 string for react-native-ble-plx
   *
   * @param buffer - ArrayBuffer to convert
   * @returns Base64 encoded string
   */
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i] ?? 0);
    }
    // Use built-in btoa (available in React Native)
    return globalThis.btoa(binary);
  }
}
