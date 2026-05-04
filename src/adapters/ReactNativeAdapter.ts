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
 * React Native BLE Chunk Write Strategy
 *
 * Wraps react-native-ble-plx's withResponse/withoutResponse fallback
 * into the ChunkWriteStrategy template.
 */
interface RNWriteOptions {
  arrayBufferToBase64: (buffer: ArrayBuffer | ArrayBufferLike) => string;
  bleManager: BLEManager;
}

class ReactNativeWriteStrategy extends ChunkWriteStrategy<RNWriteOptions> {
  constructor() {
    super('ReactNativeAdapter', {
      ...DEFAULT_ADAPTIVE_CONFIG,
      maxChunkSize: 512,
      connectionCheckInterval: 0, // RN doesn't need periodic connection checks
    });
  }

  protected computeTimeoutMs(chunkLength: number): number {
    return Math.max(2000, Math.min(10000, 1000 + chunkLength * 10));
  }

  protected async writeSingleChunk(
    chunk: Uint8Array,
    context: ChunkWriteContext,
    options?: RNWriteOptions
  ): Promise<ChunkWriteResult> {
    if (!options) {
      return { success: false, error: new Error('RNWriteOptions required') };
    }

    const base64Value = options.arrayBufferToBase64(chunk.buffer);

    try {
      // Try with-response first
      await (options.bleManager.writeCharacteristicWithResponseForDevice(
        context.deviceId,
        context.serviceId,
        context.characteristicId,
        base64Value
      ) as Promise<void>);
      return { success: true };
    } catch {
      // With-response BLE write failed — some devices don't support response mode;
      // retry as write-without-response as a best-effort fallback
      try {
        await (options.bleManager.writeCharacteristicWithoutResponseForDevice(
          context.deviceId,
          context.serviceId,
          context.characteristicId,
          base64Value
        ) as Promise<void>);
        return { success: true };
      } catch (error) {
        return { success: false, error: normalizeError(error) };
      }
    }
  }
}

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
  private writeStrategy = new ReactNativeWriteStrategy();

  /**
   * Creates a new ReactNativeAdapter instance
   *
   * @param options - Configuration options
   * @param options.bleManager - BLE Manager instance (e.g., from react-native-ble-plx)
   * @throws {BluetoothPrintError} If bleManager is not provided or not supported
   */
  constructor(options: { bleManager: BLEManager }) {
    super();

    if (!options?.bleManager) {
      throw new BluetoothPrintError(
        ErrorCode.INVALID_CONFIGURATION,
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
      const device = await withTimeout(
        this.performConnect(deviceId),
        timeoutMs,
        'Connection timeout'
      );

      this.deviceCache.set(deviceId, device as RNDevice);
      await this.discoverServices(deviceId, device as RNDevice);

      this.updateState(PrinterState.CONNECTED);
      Logger.scope('ReactNativeAdapter').info('Device connected successfully');
    } catch (error) {
      this.updateState(PrinterState.DISCONNECTED);
      this.cleanupDevice(deviceId);

      throw this.classifyConnectionError(error, deviceId);
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

    const device = this.deviceCache.get(deviceId);
    if (!device || !device.isConnected) {
      this.cleanupDevice(deviceId);
      throw new BluetoothPrintError(
        ErrorCode.DEVICE_DISCONNECTED,
        `Device ${deviceId} is not connected`
      );
    }

    await this.writeStrategy.execute(
      buffer,
      {
        deviceId,
        serviceId: serviceInfo.serviceId,
        characteristicId: serviceInfo.characteristicId,
      },
      options ?? {},
      {
        bleManager: this.bleManager,
        arrayBufferToBase64: this.arrayBufferToBase64.bind(this),
      }
    );
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
            reject(normalizeError(error));
          }
        });
        resolve();
      } catch (error) {
        reject(normalizeError(error));
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
    await this.discoverAndCacheServices(deviceId, async () => {
      const servicesResult = await (this.bleManager.discoverAllServicesAndCharacteristicsForDevice(
        deviceId
      ) as Promise<{ services: RNService[] }>);

      const services = servicesResult.services || [];

      return services.map(service => ({
        serviceId: service.uuid,
        characteristics: service.characteristics.map((c: RNCharacteristic) => ({
          characteristicId: c.uuid,
          isWritable: c.isWritableWithResponse || c.isWritableWithoutResponse,
        })),
      }));
    });
  }

  /**
   * Convert ArrayBuffer to base64 string for react-native-ble-plx
   *
   * @param buffer - ArrayBuffer to convert
   * @returns Base64 encoded string
   */
  private arrayBufferToBase64(buffer: ArrayBuffer | ArrayBufferLike): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i] ?? 0);
    }
    // Use built-in btoa (available in React Native)
    return globalThis.btoa(binary);
  }
}
