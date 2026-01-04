/**
 * Device Manager
 *
 * Manages Bluetooth device scanning, connection, and pairing.
 * Provides device discovery, filtering, and caching capabilities.
 *
 * @example
 * ```typescript
 * const manager = new DeviceManager();
 * manager.on('device-found', (device) => console.log('Found:', device.name));
 * await manager.startScan({ timeout: 10000 });
 * ```
 */

import Taro from '@tarojs/taro';
import { Logger } from '@/utils/logger';

/**
 * Bluetooth device information
 */
export interface BluetoothDevice {
  /** Unique device identifier */
  deviceId: string;
  /** Device name */
  name: string;
  /** Signal strength (RSSI) */
  rssi?: number;
  /** Advertisement data */
  advertisData?: ArrayBuffer;
  /** Service UUIDs */
  serviceUUIDs?: string[];
  /** Local name from advertisement */
  localName?: string;
  /** Whether device is paired */
  isPaired?: boolean;
  /** Last connection timestamp */
  lastConnected?: number;
}

/**
 * Scan options
 */
export interface ScanOptions {
  /** Scan timeout in milliseconds (default: 15000) */
  timeout?: number;
  /** Filter by service UUIDs */
  serviceUUIDs?: string[];
  /** Filter by device name (string or RegExp) */
  nameFilter?: string | RegExp;
  /** Allow duplicate device reports (default: false) */
  allowDuplicates?: boolean;
}

/**
 * Device manager events
 */
export interface DeviceManagerEvents {
  'device-found': BluetoothDevice;
  'scan-start': void;
  'scan-stop': void;
  'device-connected': string;
  'device-disconnected': string;
  error: Error;
}

/**
 * Event handler type
 */
type EventHandler<T> = (data: T) => void;

/**
 * Device manager interface
 */
export interface IDeviceManager {
  startScan(options?: ScanOptions): Promise<void>;
  stopScan(): Promise<void>;
  getDiscoveredDevices(): BluetoothDevice[];
  getPairedDevices(): Promise<BluetoothDevice[]>;
  connect(deviceId: string): Promise<void>;
  disconnect(deviceId: string): Promise<void>;
  getDeviceInfo(deviceId: string): BluetoothDevice | null;
  on<K extends keyof DeviceManagerEvents>(
    event: K,
    callback: EventHandler<DeviceManagerEvents[K]>
  ): void;
  off<K extends keyof DeviceManagerEvents>(
    event: K,
    callback: EventHandler<DeviceManagerEvents[K]>
  ): void;
}

/**
 * Device cache entry
 */
interface DeviceCacheEntry {
  device: BluetoothDevice;
  serviceId?: string;
  characteristicId?: string;
  cachedAt: number;
}

/**
 * Device Manager class
 * Manages Bluetooth device discovery and connection
 */
export class DeviceManager implements IDeviceManager {
  private readonly logger = Logger.scope('DeviceManager');
  private readonly listeners: Map<string, Set<EventHandler<unknown>>> = new Map();
  private discoveredDevices: Map<string, BluetoothDevice> = new Map();
  private deviceCache: Map<string, DeviceCacheEntry> = new Map();
  private isScanning = false;
  private scanTimeout: ReturnType<typeof setTimeout> | null = null;
  private currentScanOptions: ScanOptions | null = null;

  // Storage key for paired devices
  private readonly PAIRED_DEVICES_KEY = 'bluetooth_paired_devices';
  private readonly CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

  /**
   * Start scanning for Bluetooth devices
   */
  async startScan(options?: ScanOptions): Promise<void> {
    if (this.isScanning) {
      this.logger.warn('Scan already in progress');
      return;
    }

    this.currentScanOptions = options ?? {};
    const timeout = options?.timeout ?? 15000;

    try {
      await this.initBluetooth();
      this.discoveredDevices.clear();

      await Taro.startBluetoothDevicesDiscovery({
        allowDuplicatesKey: options?.allowDuplicates ?? false,
        services: options?.serviceUUIDs,
      });

      this.isScanning = true;
      this.emit('scan-start', undefined);
      this.logger.info('Bluetooth scan started');

      Taro.onBluetoothDeviceFound(this.handleDeviceFound.bind(this));

      this.scanTimeout = setTimeout(() => {
        this.stopScan().catch(err => {
          this.logger.error('Error stopping scan on timeout:', err);
        });
      }, timeout);
    } catch (error) {
      this.isScanning = false;
      const err = error instanceof Error ? error : new Error(String(error));
      this.emit('error', err);
      throw err;
    }
  }

  /**
   * Stop scanning for Bluetooth devices
   */
  async stopScan(): Promise<void> {
    if (!this.isScanning) {
      return;
    }

    try {
      if (this.scanTimeout) {
        clearTimeout(this.scanTimeout);
        this.scanTimeout = null;
      }

      await Taro.stopBluetoothDevicesDiscovery();

      this.isScanning = false;
      this.currentScanOptions = null;
      this.emit('scan-stop', undefined);
      this.logger.info('Bluetooth scan stopped');
    } catch (error) {
      this.logger.error('Error stopping scan:', error);
      throw error;
    }
  }

  /**
   * Get list of discovered devices
   */
  getDiscoveredDevices(): BluetoothDevice[] {
    return Array.from(this.discoveredDevices.values());
  }

  /**
   * Get list of previously paired devices
   */
  getPairedDevices(): Promise<BluetoothDevice[]> {
    try {
      const stored: unknown = Taro.getStorageSync(this.PAIRED_DEVICES_KEY);
      if (stored && Array.isArray(stored)) {
        return Promise.resolve(
          (stored as BluetoothDevice[]).map((d: BluetoothDevice) => ({ ...d, isPaired: true }))
        );
      }
      return Promise.resolve([]);
    } catch (error) {
      this.logger.error('Error getting paired devices:', error);
      return Promise.resolve([]);
    }
  }

  /**
   * Connect to a Bluetooth device
   */
  async connect(deviceId: string): Promise<void> {
    try {
      this.logger.info(`Connecting to device: ${deviceId}`);

      await Taro.createBLEConnection({ deviceId });

      const servicesRes = await Taro.getBLEDeviceServices({ deviceId });
      const services = servicesRes.services;

      if (services.length === 0) {
        throw new Error('No services found on device');
      }

      let serviceId: string | undefined;
      let characteristicId: string | undefined;

      for (const service of services) {
        const charsRes = await Taro.getBLEDeviceCharacteristics({
          deviceId,
          serviceId: service.uuid,
        });

        for (const char of charsRes.characteristics) {
          if (char.properties.write || char.properties.writeNoResponse) {
            serviceId = service.uuid;
            characteristicId = char.uuid;
            break;
          }
        }

        if (characteristicId) break;
      }

      if (!serviceId || !characteristicId) {
        throw new Error('No writable characteristic found');
      }

      const device = this.discoveredDevices.get(deviceId);
      if (device) {
        this.deviceCache.set(deviceId, {
          device,
          serviceId,
          characteristicId,
          cachedAt: Date.now(),
        });
        this.savePairedDevice(device);
      }

      this.emit('device-connected', deviceId);
      this.logger.info(`Connected to device: ${deviceId}`);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.emit('error', err);
      throw err;
    }
  }

  /**
   * Disconnect from a Bluetooth device
   */
  async disconnect(deviceId: string): Promise<void> {
    try {
      this.logger.info(`Disconnecting from device: ${deviceId}`);
      await Taro.closeBLEConnection({ deviceId });
      this.emit('device-disconnected', deviceId);
      this.logger.info(`Disconnected from device: ${deviceId}`);
    } catch (error) {
      this.logger.error('Error disconnecting:', error);
      throw error;
    }
  }

  /**
   * Get device information
   */
  getDeviceInfo(deviceId: string): BluetoothDevice | null {
    const discovered = this.discoveredDevices.get(deviceId);
    if (discovered) {
      return discovered;
    }

    const cached = this.deviceCache.get(deviceId);
    if (cached && Date.now() - cached.cachedAt < this.CACHE_EXPIRY) {
      return cached.device;
    }

    return null;
  }

  /**
   * Get cached service info for a device
   */
  getCachedServiceInfo(deviceId: string): { serviceId: string; characteristicId: string } | null {
    const cached = this.deviceCache.get(deviceId);
    if (cached && cached.serviceId && cached.characteristicId) {
      return {
        serviceId: cached.serviceId,
        characteristicId: cached.characteristicId,
      };
    }
    return null;
  }

  /**
   * Register event listener
   */
  on<K extends keyof DeviceManagerEvents>(
    event: K,
    callback: EventHandler<DeviceManagerEvents[K]>
  ): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback as EventHandler<unknown>);
  }

  /**
   * Remove event listener
   */
  off<K extends keyof DeviceManagerEvents>(
    event: K,
    callback: EventHandler<DeviceManagerEvents[K]>
  ): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.delete(callback as EventHandler<unknown>);
    }
  }

  /**
   * Check if currently scanning
   */
  get scanning(): boolean {
    return this.isScanning;
  }

  /**
   * Emit an event
   */
  private emit<K extends keyof DeviceManagerEvents>(event: K, data: DeviceManagerEvents[K]): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          this.logger.error(`Error in event handler for "${event}":`, error);
        }
      });
    }
  }

  /**
   * Initialize Bluetooth adapter
   */
  private async initBluetooth(): Promise<void> {
    try {
      await Taro.openBluetoothAdapter();
    } catch (error: unknown) {
      const taroError = error as { errCode?: number; errMsg?: string };
      if (taroError.errCode !== 10001) {
        throw error;
      }
    }
  }

  /**
   * Handle device found event
   */
  private handleDeviceFound(res: Taro.onBluetoothDeviceFound.CallbackResult): void {
    for (const device of res.devices) {
      if (!device.name && !device.localName) {
        continue;
      }

      if (this.currentScanOptions?.nameFilter) {
        const name = device.name || device.localName || '';
        const filter = this.currentScanOptions.nameFilter;

        if (typeof filter === 'string') {
          if (!name.toLowerCase().includes(filter.toLowerCase())) {
            continue;
          }
        } else if (filter instanceof RegExp) {
          if (!filter.test(name)) {
            continue;
          }
        }
      }

      const bluetoothDevice: BluetoothDevice = {
        deviceId: device.deviceId,
        name: device.name || device.localName || 'Unknown',
        rssi: device.RSSI,
        advertisData: device.advertisData,
        serviceUUIDs: device.advertisServiceUUIDs,
        localName: device.localName,
      };

      const existing = this.discoveredDevices.get(device.deviceId);
      if (!existing) {
        this.discoveredDevices.set(device.deviceId, bluetoothDevice);
        this.emit('device-found', bluetoothDevice);
        this.logger.debug(`Device found: ${bluetoothDevice.name} (${device.deviceId})`);
      } else if (this.currentScanOptions?.allowDuplicates) {
        existing.rssi = device.RSSI;
        this.emit('device-found', existing);
      }
    }
  }

  /**
   * Save device to paired devices list
   */
  private savePairedDevice(device: BluetoothDevice): void {
    try {
      const stored: unknown = Taro.getStorageSync(this.PAIRED_DEVICES_KEY);
      const paired: BluetoothDevice[] =
        stored && Array.isArray(stored) ? (stored as BluetoothDevice[]) : [];
      const existing = paired.findIndex(d => d.deviceId === device.deviceId);

      const updatedDevice: BluetoothDevice = {
        ...device,
        isPaired: true,
        lastConnected: Date.now(),
      };

      if (existing >= 0) {
        paired[existing] = updatedDevice;
      } else {
        paired.push(updatedDevice);
      }

      Taro.setStorageSync(this.PAIRED_DEVICES_KEY, paired);
    } catch (error) {
      this.logger.error('Error saving paired device:', error);
    }
  }

  /**
   * Clear all cached data
   */
  clearCache(): void {
    this.deviceCache.clear();
    this.discoveredDevices.clear();
  }
}

// Export singleton instance for convenience
export const deviceManager = new DeviceManager();
