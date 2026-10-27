/**
 * Device Manager
 *
 * Manages Bluetooth device scanning, connection, and pairing.
 * Provides device discovery, filtering, and caching capabilities.
 *
 * Decoupled from direct Taro framework imports to support cross-platform usage
 * (WeChat/Alipay/ByteDance mini-programs, Web Bluetooth, React Native, and Node/SSR).
 *
 * @example
 * ```typescript
 * const manager = new DeviceManager();
 * manager.on('device-found', (device) => console.log('Found:', device.name));
 * await manager.startScan({ timeout: 10000 });
 * ```
 */

import { BluetoothPrintError, ErrorCode } from '@/errors/BaseError';
import { Logger } from '@/utils/logger';
import { emitAndThrow } from '@/utils/normalizeError';
import { EventEmitter } from '@/core/EventEmitter';
import type { IPrinterAdapter } from '@/types';
import type { IStorageAdapter } from '@/storage';

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
  advertisementData?: ArrayBuffer;
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
    callback: (data: DeviceManagerEvents[K]) => void
  ): void;
  off<K extends keyof DeviceManagerEvents>(
    event: K,
    callback: (data: DeviceManagerEvents[K]) => void
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

interface TaroBLEApi {
  openBluetoothAdapter: () => Promise<void>;
  closeBluetoothAdapter?: () => Promise<void>;
  startBluetoothDevicesDiscovery: (options: {
    allowDuplicatesKey?: boolean;
    services?: string[];
  }) => Promise<void>;
  stopBluetoothDevicesDiscovery: () => Promise<void>;
  onBluetoothDeviceFound: (
    callback: (res: {
      devices: Array<{
        deviceId: string;
        name?: string;
        localName?: string;
        RSSI?: number;
        advertisData?: ArrayBuffer;
        advertisServiceUUIDs?: string[];
      }>;
    }) => void
  ) => void;
  createBLEConnection: (options: { deviceId: string }) => Promise<void>;
  closeBLEConnection: (options: { deviceId: string }) => Promise<void>;
  getBLEDeviceServices: (options: {
    deviceId: string;
  }) => Promise<{ services: Array<{ uuid: string }> }>;
  getBLEDeviceCharacteristics: (options: {
    deviceId: string;
    serviceId: string;
  }) => Promise<{
    characteristics: Array<{
      uuid: string;
      properties: { write?: boolean; writeNoResponse?: boolean; writeWithoutResponse?: boolean };
    }>;
  }>;
  getStorageSync?: (key: string) => unknown;
  setStorageSync?: (key: string, data: unknown) => void;
}

function getTaroApi(): TaroBLEApi | null {
  const g = globalThis as Record<string, unknown>;
  if (g.Taro && typeof g.Taro === 'object' && 'openBluetoothAdapter' in g.Taro) {
    return g.Taro as unknown as TaroBLEApi;
  }
  if (g.wx && typeof g.wx === 'object' && 'openBluetoothAdapter' in g.wx) {
    return g.wx as unknown as TaroBLEApi;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod: unknown = typeof require === 'function' ? require('@tarojs/taro') : undefined;
    const candidate = (mod as { default?: unknown })?.default ?? mod;
    if (candidate && typeof candidate === 'object' && 'openBluetoothAdapter' in candidate) {
      return candidate as TaroBLEApi;
    }
  } catch {
    // optional Taro peer dependency not available
  }
  return null;
}

/**
 * Device Manager class
 * Manages Bluetooth device discovery and connection
 */
export class DeviceManager extends EventEmitter<DeviceManagerEvents> implements IDeviceManager {
  protected readonly logger = Logger.scope('DeviceManager');
  private readonly adapter?: IPrinterAdapter;
  private readonly storage?: IStorageAdapter;

  private discoveredDevices: Map<string, BluetoothDevice> = new Map();
  private deviceCache: Map<string, DeviceCacheEntry> = new Map();
  private isScanning = false;
  private scanTimeout: ReturnType<typeof setTimeout> | null = null;
  private currentScanOptions: ScanOptions | null = null;

  // Storage key for paired devices
  private readonly PAIRED_DEVICES_KEY = 'bluetooth_paired_devices';
  private readonly CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

  constructor(adapter?: IPrinterAdapter, storage?: IStorageAdapter) {
    super();
    this.adapter = adapter;
    this.storage = storage;
  }

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
      this.discoveredDevices.clear();

      if (this.adapter?.startDiscovery) {
        await this.adapter.startDiscovery(options, dev => {
          this.handleDeviceFound({
            devices: [
              {
                deviceId: dev.deviceId,
                name: dev.name,
                localName: dev.localName,
                RSSI: dev.rssi,
                advertisData: dev.advertisementData,
                advertisServiceUUIDs: dev.serviceUUIDs,
              },
            ],
          });
        });
      } else {
        const taro = getTaroApi();
        if (!taro) {
          throw new BluetoothPrintError(
            ErrorCode.INVALID_CONFIGURATION,
            'No IPrinterAdapter provided and no Taro Bluetooth environment detected'
          );
        }
        await this.initBluetooth(taro);
        await taro.startBluetoothDevicesDiscovery({
          allowDuplicatesKey: options?.allowDuplicates ?? false,
          services: options?.serviceUUIDs,
        });
        taro.onBluetoothDeviceFound(this.handleDeviceFound.bind(this));
      }

      this.isScanning = true;
      this.emit('scan-start', undefined);
      this.logger.info('Bluetooth scan started');

      this.scanTimeout = setTimeout(() => {
        this.stopScan().catch(err => {
          this.logger.error('Error stopping scan on timeout:', err);
        });
      }, timeout);
    } catch (error) {
      this.isScanning = false;
      emitAndThrow(error, this.emit.bind(this));
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

      if (this.adapter?.stopDiscovery) {
        await this.adapter.stopDiscovery();
      } else {
        const taro = getTaroApi();
        await taro?.stopBluetoothDevicesDiscovery();
      }

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
      if (this.storage) {
        const raw = this.storage.getItem(this.PAIRED_DEVICES_KEY);
        if (raw) {
          const stored = JSON.parse(raw) as BluetoothDevice[];
          if (Array.isArray(stored)) {
            return Promise.resolve(stored.map((d: BluetoothDevice) => ({ ...d, isPaired: true })));
          }
        }
        return Promise.resolve([]);
      }

      const taro = getTaroApi();
      const stored: unknown = taro?.getStorageSync
        ? taro.getStorageSync(this.PAIRED_DEVICES_KEY)
        : null;
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

      if (this.adapter) {
        await this.adapter.connect(deviceId);
      } else {
        const taro = getTaroApi();
        if (!taro) {
          throw new BluetoothPrintError(
            ErrorCode.INVALID_CONFIGURATION,
            'No IPrinterAdapter provided and no Taro Bluetooth environment detected'
          );
        }
        await taro.createBLEConnection({ deviceId });

        const servicesRes = await taro.getBLEDeviceServices({ deviceId });
        const services = servicesRes.services;

        if (services.length === 0) {
          throw new BluetoothPrintError(ErrorCode.SERVICE_NOT_FOUND, 'No services found on device');
        }

        let serviceId: string | undefined;
        let characteristicId: string | undefined;

        for (const service of services) {
          const charsRes = await taro.getBLEDeviceCharacteristics({
            deviceId,
            serviceId: service.uuid,
          });

          for (const char of charsRes.characteristics) {
            if (
              char.properties.write ||
              char.properties.writeNoResponse ||
              char.properties.writeWithoutResponse
            ) {
              serviceId = service.uuid;
              characteristicId = char.uuid;
            }
            if (characteristicId) break;
          }

          if (serviceId && characteristicId) break;
        }

        if (!serviceId || !characteristicId) {
          throw new BluetoothPrintError(
            ErrorCode.CHARACTERISTIC_NOT_FOUND,
            'No writable characteristic found'
          );
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
      }

      this.emit('device-connected', deviceId);
      this.logger.info(`Connected to device: ${deviceId}`);
    } catch (error) {
      emitAndThrow(error, this.emit.bind(this));
    }
  }

  /**
   * Disconnect from a Bluetooth device
   */
  async disconnect(deviceId: string): Promise<void> {
    try {
      this.logger.info(`Disconnecting from device: ${deviceId}`);
      if (this.adapter) {
        await this.adapter.disconnect(deviceId);
      } else {
        const taro = getTaroApi();
        await taro?.closeBLEConnection({ deviceId });
      }
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
   * Check if currently scanning
   */
  get scanning(): boolean {
    return this.isScanning;
  }

  /**
   * Initialize Bluetooth adapter
   */
  private async initBluetooth(taro: TaroBLEApi): Promise<void> {
    try {
      await taro.openBluetoothAdapter();
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
  private handleDeviceFound(res: {
    devices: Array<{
      deviceId: string;
      name?: string;
      localName?: string;
      RSSI?: number;
      advertisData?: ArrayBuffer;
      advertisServiceUUIDs?: string[];
    }>;
  }): void {
    for (const device of res.devices) {
      if (!device.name && !device.localName) {
        continue;
      }

      if (this.currentScanOptions?.nameFilter) {
        const name = device.name || device.localName || '';
        const filter = this.currentScanOptions.nameFilter;

        if (typeof filter === 'string' && !name.toLowerCase().includes(filter.toLowerCase())) {
          continue;
        } else if (filter instanceof RegExp && !filter.test(name)) {
          continue;
        }
      }

      const bluetoothDevice: BluetoothDevice = {
        deviceId: device.deviceId,
        name: device.name || device.localName || 'Unknown',
        rssi: device.RSSI,
        advertisementData: device.advertisData,
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
      let paired: BluetoothDevice[] = [];
      if (this.storage) {
        const raw = this.storage.getItem(this.PAIRED_DEVICES_KEY);
        if (raw) {
          try {
            paired = JSON.parse(raw) as BluetoothDevice[];
          } catch {
            paired = [];
          }
        }
      } else {
        const taro = getTaroApi();
        const stored: unknown = taro?.getStorageSync
          ? taro.getStorageSync(this.PAIRED_DEVICES_KEY)
          : null;
        paired = stored && Array.isArray(stored) ? (stored as BluetoothDevice[]) : [];
      }

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

      if (this.storage) {
        this.storage.setItem(this.PAIRED_DEVICES_KEY, JSON.stringify(paired));
      } else {
        const taro = getTaroApi();
        taro?.setStorageSync?.(this.PAIRED_DEVICES_KEY, paired);
      }
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

/**
 * Lazy singleton backing reference
 */
let _defaultDeviceManager: DeviceManager | null = null;

/**
 * Get or initialize the default shared DeviceManager instance.
 */
export function getDeviceManager(): DeviceManager {
  if (!_defaultDeviceManager) {
    _defaultDeviceManager = new DeviceManager();
  }
  return _defaultDeviceManager;
}

/**
 * Export singleton instance for convenience.
 * Lazily initialized upon first access to eliminate unwanted startup side effects.
 */
export const deviceManager: DeviceManager = new Proxy({} as DeviceManager, {
  get(_target, prop: string | symbol): unknown {
    const instance = getDeviceManager();
    const value: unknown = (instance as unknown as Record<string | symbol, unknown>)[prop];
    if (typeof value === 'function') {
      return (...args: unknown[]): unknown =>
        (value as (...innerArgs: unknown[]) => unknown).apply(instance, args);
    }
    return value;
  },
});
