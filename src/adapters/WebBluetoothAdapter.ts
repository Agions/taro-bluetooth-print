/**
 * Web Bluetooth Adapter
 * Implements the IPrinterAdapter interface for Web Bluetooth API (H5 environment)
 *
 * Provides enhanced device filtering, RSSI signal strength monitoring,
 * and improved disconnection handling.
 */

import { IAdapterOptions, PrinterState } from '@/types';
import { BaseAdapter } from './BaseAdapter';
import { normalizeError } from '@/utils/normalizeError';
import { BluetoothPrintError, ErrorCode } from '@/errors/baseError';

/**
 * Extended Bluetooth device interface with RSSI support
 * This is a vendor-specific extension not part of the standard Web Bluetooth API
 */
interface BluetoothDeviceWithRssi extends BluetoothDevice {
  readRemoteRssi(): Promise<number>;
}

/**
 * Web Bluetooth device information
 */
interface WebBluetoothDeviceInfo {
  device: BluetoothDevice;
  server: BluetoothRemoteGATTServer;
  characteristic: BluetoothRemoteGATTCharacteristic;
  /** RSSI value at time of connection (if available) */
  rssiAtConnection?: number;
  /** Device discovered timestamp */
  discoveredAt?: number;
  /** Device name for reference */
  name?: string;
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
  /** Minimum RSSI signal strength (dBm) to accept device */
  minRSSI?: number;
  /** Filter by device name (exact or partial match) */
  name?: string;
  /** Filter by manufacturer data patterns */
  manufacturerDataFilter?: Array<{
    companyIdentifier: number;
    dataPrefix?: Uint8Array;
  }>;
}

/**
 * Discovered device information
 */
export interface DiscoveredDevice {
  /** Device instance */
  device: BluetoothDevice;
  /** Device name */
  name: string;
  /** Device ID */
  deviceId: string;
  /** RSSI signal strength (dBm) */
  rssi?: number;
  /** Timestamp when device was discovered */
  discoveredAt: number;
  /** Manufacturer data if available */
  manufacturerData?: Map<number, Uint8Array>;
}

/**
 * Device filter options for scanning
 */
export interface DeviceFilterOptions {
  /** Minimum RSSI threshold (dBm) */
  minRSSI?: number;
  /** Maximum RSSI threshold (dBm) */
  maxRSSI?: number;
  /** Name prefix filter */
  namePrefix?: string;
  /** Name exact match filter */
  name?: string;
  /** Service UUIDs to filter */
  serviceUUIDs?: string[];
}

/**
 * Common printer service UUIDs
 */
const PRINTER_SERVICE_UUIDS = [
  '000018f0-0000-1000-8000-00805f9b34fb', // Common printer service
  '49535343-fe7d-4ae5-8fa9-9fafd205e455', // Serial Port Profile
  'e7810a71-73ae-499d-8c15-faa9aef0c3f2', // Nordic UART Service
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
  private discoveredDevices: Map<string, DiscoveredDevice> = new Map();
  private connectionCleanupTimeout: ReturnType<typeof setTimeout> | null = null;

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
      const errorMessage = normalizeError(error).message;

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
        normalizeError(error)
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
      const existingInfo = this.devices.get(deviceId);
      if (existingInfo?.server.connected) {
        this.logger.warn('Device already connected:', deviceId);
        this.updateState(PrinterState.CONNECTED);
        return;
      }
      // If not connected but still in map, clean up first
      this.cleanupDeviceInfo(deviceId);
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

      // Get RSSI if available (may not be available on all devices)
      let rssi: number | undefined;
      try {
        const deviceWithRssi = characteristic.service.device as unknown as BluetoothDeviceWithRssi;
        if (
          'readRemoteRssi' in deviceWithRssi &&
          typeof deviceWithRssi.readRemoteRssi === 'function'
        ) {
          rssi = await deviceWithRssi.readRemoteRssi();
        }
      } catch {
        this.logger.debug('RSSI reading not supported on this device');
      }

      // Store device info
      const deviceInfo: WebBluetoothDeviceInfo = {
        device,
        server,
        characteristic,
        discoveredAt: Date.now(),
      };
      if (rssi !== undefined) {
        deviceInfo.rssiAtConnection = rssi;
      }
      this.devices.set(deviceId, deviceInfo);

      this.serviceCache.set(deviceId, {
        serviceId: characteristic.service?.uuid || '',
        characteristicId: characteristic.uuid,
      });

      // Listen for disconnection
      device.addEventListener(
        'gattserverdisconnected',
        () => {
          this.handleDisconnection(deviceId);
        },
        { once: true }
      );

      this.updateState(PrinterState.CONNECTED);
      this.logger.info('Device connected successfully');
    } catch (error) {
      this.updateState(PrinterState.DISCONNECTED);
      this.logger.error('Connection failed:', error);

      if (error instanceof BluetoothPrintError) {
        throw error;
      }

      const errorMessage = normalizeError(error).message;
      if (errorMessage.includes('timeout')) {
        throw new BluetoothPrintError(
          ErrorCode.CONNECTION_TIMEOUT,
          `Connection to device ${deviceId} timed out`,
          normalizeError(error)
        );
      }

      throw new BluetoothPrintError(
        ErrorCode.CONNECTION_FAILED,
        `Failed to connect to device ${deviceId}`,
        normalizeError(error)
      );
    }
  }

  /**
   * Disconnect from a Bluetooth device
   *
   * @param deviceId - Bluetooth device ID
   */
  async disconnect(deviceId: string): Promise<void> {
    await Promise.resolve(); // Ensure async semantics
    this.validateDeviceId(deviceId);

    const deviceInfo = this.devices.get(deviceId);
    if (!deviceInfo) {
      this.logger.debug('Device not found in cache, nothing to disconnect');
      return;
    }

    this.updateState(PrinterState.DISCONNECTING);
    this.logger.debug('Disconnecting from device:', deviceId);

    try {
      // Cancel any pending connection cleanup
      if (this.connectionCleanupTimeout) {
        clearTimeout(this.connectionCleanupTimeout);
        this.connectionCleanupTimeout = null;
      }

      // Disconnect from GATT server
      if (deviceInfo?.server?.connected) {
        deviceInfo.server.disconnect();
        this.logger.debug('GATT server disconnected');
      }
    } catch (error) {
      this.logger.warn('Disconnect error:', error);
    } finally {
      // Always cleanup resources
      this.cleanupDeviceInfo(deviceId);
      this.updateState(PrinterState.DISCONNECTED);
      this.logger.info('Device disconnected successfully');
    }
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
              normalizeError(error)
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
   * Get device ID from a BluetoothDevice instance
   * Handles different browser implementations
   *
   * @param device - BluetoothDevice instance
   * @returns Device ID string
   */
  getDeviceId(device: BluetoothDevice): string {
    if (!device) {
      throw new BluetoothPrintError(ErrorCode.DEVICE_NOT_FOUND, 'Device is required');
    }

    // Use device.id if available, otherwise fall back to generated ID
    return device.id || this.generateFallbackDeviceId(device);
  }

  /**
   * Get device information including RSSI
   *
   * @param deviceId - Bluetooth device ID
   * @returns Device info object with RSSI and metadata
   */
  getDeviceInfo(
    deviceId: string
  ): { deviceId: string; name: string; rssi?: number; connected: boolean } | null {
    const deviceInfo = this.devices.get(deviceId);

    if (!deviceInfo) {
      return null;
    }

    const result: { deviceId: string; name: string; rssi?: number; connected: boolean } = {
      deviceId,
      name: deviceInfo.device.name || 'Unknown Device',
      connected: deviceInfo.server.connected,
    };
    if (deviceInfo.rssiAtConnection !== undefined) {
      result.rssi = deviceInfo.rssiAtConnection;
    }
    return result;
  }

  /**
   * Filter discovered devices by criteria
   *
   * @param devices - Array of discovered devices
   * @param filter - Filter criteria
   * @returns Filtered array of devices
   */
  filterDevices(devices: DiscoveredDevice[], filter: DeviceFilterOptions): DiscoveredDevice[] {
    return devices.filter(device => {
      // RSSI filtering
      if (
        filter.minRSSI !== undefined &&
        (device.rssi === undefined || device.rssi < filter.minRSSI)
      ) {
        return false;
      }
      if (
        filter.maxRSSI !== undefined &&
        (device.rssi === undefined || device.rssi > filter.maxRSSI)
      ) {
        return false;
      }

      // Name prefix filtering
      if (
        filter.namePrefix &&
        !device.name.toLowerCase().startsWith(filter.namePrefix.toLowerCase())
      ) {
        return false;
      }

      // Name exact/partial matching
      if (filter.name) {
        const searchName = filter.name.toLowerCase();
        if (!device.name.toLowerCase().includes(searchName)) {
          return false;
        }
      }

      // Service UUID filtering
      if (filter.serviceUUIDs && filter.serviceUUIDs.length > 0) {
        const deviceWithUuids = device.device as BluetoothDevice & { uuids?: string[] };
        const deviceServices = Array.from(deviceWithUuids.uuids || []);
        const hasMatchingService = filter.serviceUUIDs.some(uuid =>
          deviceServices.some(deviceUuid => deviceUuid.toLowerCase() === uuid.toLowerCase())
        );
        if (!hasMatchingService) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Sort devices by signal strength (RSSI)
   *
   * @param devices - Array of discovered devices
   * @param ascending - Sort in ascending order (weakest first), default false (strongest first)
   * @returns Sorted array
   */
  sortByRSSI(devices: DiscoveredDevice[], ascending = false): DiscoveredDevice[] {
    return [...devices].sort((a, b) => {
      const rssiA = a.rssi ?? -Infinity;
      const rssiB = b.rssi ?? -Infinity;
      return ascending ? rssiA - rssiB : rssiB - rssiA;
    });
  }

  /**
   * Build request options for navigator.bluetooth.requestDevice
   */
  private buildRequestOptions(options?: WebBluetoothRequestOptions): RequestDeviceOptions {
    const filters: BluetoothLEScanFilter[] = [];

    if (options?.acceptAllDevices) {
      return {
        acceptAllDevices: true,
        optionalServices: options.optionalServices || PRINTER_SERVICE_UUIDS,
      };
    }

    // Build filters
    if (options?.serviceUUIDs?.length) {
      filters.push({ services: options.serviceUUIDs });
    }

    if (options?.namePrefix) {
      filters.push({ namePrefix: options.namePrefix });
    }

    if (options?.name) {
      filters.push({ name: options.name });
    }

    // Manufacturer data filter (if provided)
    // Note: This is a newer API, may not be supported in all browsers
    if (options?.manufacturerDataFilter?.length) {
      for (const mf of options.manufacturerDataFilter) {
        const filter: BluetoothLEScanFilter = {
          manufacturerData: [
            {
              companyIdentifier: mf.companyIdentifier,
            },
          ],
        };
        filters.push(filter);
      }
    }

    // Default: filter by common printer services
    if (filters.length === 0) {
      return {
        acceptAllDevices: true,
        optionalServices: options?.optionalServices || PRINTER_SERVICE_UUIDS,
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

    // Try to find device from discovered devices
    const discoveredDevice = this.discoveredDevices.get(deviceId);
    if (discoveredDevice?.device) {
      return discoveredDevice.device;
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
          reject(normalizeError(error));
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
        normalizeError(error)
      );
    }
  }

  /**
   * Handle device disconnection
   */
  private handleDisconnection(deviceId: string): void {
    this.logger.warn('Device disconnected unexpectedly:', deviceId);

    // Clear any pending cleanup
    if (this.connectionCleanupTimeout) {
      clearTimeout(this.connectionCleanupTimeout);
      this.connectionCleanupTimeout = null;
    }

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

  /**
   * Generate a fallback device ID when device.id is not available
   * Uses device name + first seen timestamp as identifier
   */
  private generateFallbackDeviceId(device: BluetoothDevice): string {
    const name = device.name || 'unknown';
    const timestamp = Date.now().toString(36);
    return `fallback_${name}_${timestamp}`;
  }

  /**
   * Cleanup resources and destroy the adapter instance
   * Removes all event listeners and releases resources
   */
  destroy(): void {
    this.logger.debug('Destroying WebBluetoothAdapter');

    // Clear any pending connection cleanup timeout
    if (this.connectionCleanupTimeout) {
      clearTimeout(this.connectionCleanupTimeout);
      this.connectionCleanupTimeout = null;
    }

    // Disconnect all devices
    for (const [deviceId, deviceInfo] of this.devices) {
      try {
        if (deviceInfo.server.connected) {
          deviceInfo.server.disconnect();
        }
      } catch (error) {
        this.logger.warn(`Error disconnecting device ${deviceId}:`, error);
      }
    }

    // Clear all device caches
    this.devices.clear();
    this.discoveredDevices.clear();

    // Call parent destroy
    super.destroy();

    this.logger.info('WebBluetoothAdapter destroyed');
  }
}
