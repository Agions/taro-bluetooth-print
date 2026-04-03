/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument */
/**
 * @fileoverview DiscoveryService uses dynamic adapter loading for platform-specific Bluetooth operations.
 * The platformAdapter field is typed as `BaseAdapter | undefined` because different adapters
 * (TaroAdapter, WebBluetoothAdapter, ReactNativeAdapter, etc.) are loaded based on runtime platform detection.
 */

/**
 * DiscoveryService - Enhanced printer discovery service
 * Supports filtering, sorting, auto-retry, and device caching
 */

import { EventEmitter } from '../core/EventEmitter';
import { IPrinterAdapter } from '../types';

export interface DiscoveredDevice {
  id: string;
  name: string;
  deviceId: string; // 原始设备 ID
  rssi?: number; // 信号强度
  appearance?: number; // 设备类型外观
  manufacturerData?: DataView; // 厂商数据
  serviceData?: Map<string, DataView>; // 服务数据
  txPowerLevel?: number; // 发射功率
  lastSeen: number; // 最后发现时间
  discoveredCount: number; // 被发现次数
}

export interface DiscoveryOptions {
  filters?: DeviceFilter[];
  sortBy?: SortOption[];
  timeout?: number; // 发现超时 (ms)
  maxDevices?: number; // 最大设备数
  enableCache?: boolean; // 启用设备缓存
  cacheExpiry?: number; // 缓存过期时间 (ms)
  autoRetry?: boolean; // 自动重试
  retryInterval?: number; // 重试间隔 (ms)
  maxRetries?: number; // 最大重试次数
}

export interface DeviceFilter {
  name?: string | string[]; // 设备名称 (支持通配符 * 或正则)
  namePattern?: RegExp; // 名称正则
  rssiThreshold?: number; // 最低信号强度
  manufacturerId?: number; // 厂商 ID
  manufacturerDataPrefix?: Uint8Array; // 厂商数据前缀匹配
  serviceUUIDs?: string[]; // 必需的服务 UUID
  appearance?: number[]; // 设备外观类型
}

export type SortOption = 'rssi' | 'name' | 'lastSeen' | 'discoveredCount';

export interface DiscoveryEvents {
  'device-found': DiscoveredDevice;
  'device-updated': DiscoveredDevice;
  'device-lost': DiscoveredDevice;
  'discovery-start': void;
  'discovery-stop': void;
  'discovery-complete': DiscoveredDevice[];
  'discovery-error': Error;
  retry: { attempt: number; maxRetries: number };
}

/**
 * 设备名称过滤器
 */
function matchesFilter(device: DiscoveredDevice, filter: DeviceFilter): boolean {
  // 名称过滤
  if (filter.name) {
    const names = Array.isArray(filter.name) ? filter.name : [filter.name];
    const matches = names.some(n => {
      if (n.includes('*')) {
        const pattern = n.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
        return new RegExp(`^${pattern}$`, 'i').test(device.name);
      }
      return device.name.toLowerCase().includes(n.toLowerCase());
    });
    if (!matches) return false;
  }

  // 名称正则过滤
  if (filter.namePattern && !filter.namePattern.test(device.name)) {
    return false;
  }

  // RSSI 过滤
  if (filter.rssiThreshold && (device.rssi ?? -100) < filter.rssiThreshold) {
    return false;
  }

  // 厂商 ID 过滤
  if (filter.manufacturerId !== undefined) {
    const mfgData = device.manufacturerData;
    if (!mfgData) return false;
    const view = new DataView(mfgData.buffer, mfgData.byteOffset, mfgData.byteLength);
    const mfgId = view.getUint16(0, true);
    if (mfgId !== filter.manufacturerId) return false;
  }

  // 外观过滤
  if (filter.appearance && device.appearance !== undefined) {
    if (!filter.appearance.includes(device.appearance)) {
      return false;
    }
  }

  return true;
}

/**
 * 设备排序
 */
function sortDevices(devices: DiscoveredDevice[], sortBy: SortOption[]): DiscoveredDevice[] {
  return [...devices].sort((a, b) => {
    for (const option of sortBy) {
      let cmp = 0;
      switch (option) {
        case 'rssi':
          cmp = (b.rssi ?? -100) - (a.rssi ?? -100);
          break;
        case 'name':
          cmp = a.name.localeCompare(b.name);
          break;
        case 'lastSeen':
          cmp = b.lastSeen - a.lastSeen;
          break;
        case 'discoveredCount':
          cmp = b.discoveredCount - a.discoveredCount;
          break;
      }
      if (cmp !== 0) return cmp;
    }
    return 0;
  });
}

/**
 * DiscoveryService - 增强型打印机发现服务
 */
export class DiscoveryService extends EventEmitter<DiscoveryEvents> {
  private discoveredDevices: Map<string, DiscoveredDevice> = new Map();
  private options: Required<DiscoveryOptions>;
  private isDiscovering: boolean = false;
  private stopTimeout: ReturnType<typeof setTimeout> | null = null;
  private platformAdapter?: IPrinterAdapter; // Platform-specific Bluetooth adapter

  constructor(options: DiscoveryOptions = {}) {
    super();
    this.options = {
      filters: options.filters ?? [],
      sortBy: options.sortBy ?? ['rssi'],
      timeout: options.timeout ?? 10000,
      maxDevices: options.maxDevices ?? 20,
      enableCache: options.enableCache ?? true,
      cacheExpiry: options.cacheExpiry ?? 30000,
      autoRetry: options.autoRetry ?? true,
      retryInterval: options.retryInterval ?? 5000,
      maxRetries: options.maxRetries ?? 3,
    };
  }

  /**
   * 设置平台适配器
   */
  setPlatformAdapter(adapter: IPrinterAdapter): void {
    this.platformAdapter = adapter;
  }

  /**
   * 开始发现设备
   */
  async startDiscovery(): Promise<DiscoveredDevice[]> {
    if (this.isDiscovering) {
      return this.getDevices();
    }

    this.isDiscovering = true;
    this.emit('discovery-start');

    // Clear expired cache
    if (this.options.enableCache) {
      this.clearExpiredCache();
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const devices = (await (this.platformAdapter as any)?.requestDevices?.()) ?? [];
      this.processDevices(devices);
    } catch (error) {
      this.emit('discovery-error', error as Error);
    }

    // Set timeout to stop discovery
    this.stopTimeout = setTimeout(() => {
      this.stopDiscovery();
    }, this.options.timeout);

    return this.getDevices();
  }

  /**
   * 停止发现
   */
  stopDiscovery(): void {
    if (this.stopTimeout) {
      clearTimeout(this.stopTimeout);
      this.stopTimeout = null;
    }

    void this.platformAdapter?.stopDiscovery?.();

    if (this.isDiscovering) {
      this.isDiscovering = false;
      this.emit('discovery-stop');
      this.emit('discovery-complete', this.getDevices());
    }
  }

  /**
   * 处理发现的设备
   */
  private processDevices(devices: any[]): void {
    for (const device of devices) {
      this.processDevice(device);
    }
  }

  /**
   * 处理单个设备
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private processDevice(deviceInfo: any): void {
    const deviceId = deviceInfo.deviceId || deviceInfo.id;
    const now = Date.now();

    const existing = this.discoveredDevices.get(deviceId);
    const isNew = !existing;

    const device: DiscoveredDevice = {
      id: deviceId,
      name: deviceInfo.name || `Device-${deviceId.slice(0, 8)}`,
      deviceId,
      rssi: deviceInfo.rssi ?? deviceInfo.RSSI,
      appearance: deviceInfo.appearance,
      manufacturerData: deviceInfo.manufacturerData,
      serviceData: deviceInfo.serviceData,
      txPowerLevel: deviceInfo.txPowerLevel,
      lastSeen: now,
      discoveredCount: existing ? existing.discoveredCount + 1 : 1,
    };

    this.discoveredDevices.set(deviceId, device);

    if (isNew) {
      this.emit('device-found', device);
    } else {
      this.emit('device-updated', device);
    }
  }

  /**
   * 获取过滤和排序后的设备列表
   */
  getDevices(): DiscoveredDevice[] {
    let devices = Array.from(this.discoveredDevices.values());

    // Apply filters
    for (const filter of this.options.filters) {
      devices = devices.filter(d => matchesFilter(d, filter));
    }

    // Apply max devices limit
    if (devices.length > this.options.maxDevices) {
      devices = sortDevices(devices, this.options.sortBy).slice(0, this.options.maxDevices);
    } else {
      // Sort even if under limit
      devices = sortDevices(devices, this.options.sortBy);
    }

    return devices;
  }

  /**
   * 获取单个设备
   */
  getDevice(deviceId: string): DiscoveredDevice | undefined {
    return this.discoveredDevices.get(deviceId);
  }

  /**
   * 获取所有发现的设备 (不过滤)
   */
  getAllDevices(): DiscoveredDevice[] {
    return Array.from(this.discoveredDevices.values());
  }

  /**
   * 获取设备数量
   */
  getDeviceCount(): number {
    return this.discoveredDevices.size;
  }

  /**
   * 手动添加设备到缓存
   */
  addDevice(device: Partial<DiscoveredDevice> & { deviceId: string }): DiscoveredDevice {
    const fullDevice: DiscoveredDevice = {
      id: device.deviceId,
      name: device.name || `Device-${device.deviceId.slice(0, 8)}`,
      deviceId: device.deviceId,
      rssi: device.rssi,
      appearance: device.appearance,
      manufacturerData: device.manufacturerData,
      serviceData: device.serviceData,
      txPowerLevel: device.txPowerLevel,
      lastSeen: Date.now(),
      discoveredCount: 1,
    };

    this.discoveredDevices.set(device.deviceId, fullDevice);
    this.emit('device-found', fullDevice);
    return fullDevice;
  }

  /**
   * 移除设备
   */
  removeDevice(deviceId: string): boolean {
    const device = this.discoveredDevices.get(deviceId);
    if (!device) return false;

    this.discoveredDevices.delete(deviceId);
    this.emit('device-lost', device);
    return true;
  }

  /**
   * 清除设备缓存
   */
  clearCache(): void {
    this.discoveredDevices.clear();
  }

  /**
   * 清除过期缓存
   */
  private clearExpiredCache(): void {
    const now = Date.now();
    const expired: string[] = [];

    for (const [id, device] of this.discoveredDevices) {
      if (now - device.lastSeen > this.options.cacheExpiry) {
        expired.push(id);
      }
    }

    for (const id of expired) {
      const device = this.discoveredDevices.get(id)!;
      this.discoveredDevices.delete(id);
      this.emit('device-lost', device);
    }
  }

  /**
   * 更新过滤选项
   */
  setFilters(filters: DeviceFilter[]): void {
    this.options.filters = filters;
  }

  /**
   * 添加过滤器
   */
  addFilter(filter: DeviceFilter): void {
    this.options.filters.push(filter);
  }

  /**
   * 清除过滤器
   */
  clearFilters(): void {
    this.options.filters = [];
  }

  /**
   * 更新排序选项
   */
  setSortOptions(sortBy: SortOption[]): void {
    this.options.sortBy = sortBy;
  }

  /**
   * 获取服务状态
   */
  getStatus(): {
    isDiscovering: boolean;
    deviceCount: number;
    filters: number;
    sortBy: SortOption[];
    nextRetry?: number;
  } {
    return {
      isDiscovering: this.isDiscovering,
      deviceCount: this.discoveredDevices.size,
      filters: this.options.filters.length,
      sortBy: this.options.sortBy,
    };
  }

  /**
   * 等待发现指定设备
   */
  async waitForDevice(
    predicate: (device: DiscoveredDevice) => boolean,
    timeout?: number
  ): Promise<DiscoveredDevice | null> {
    return new Promise(resolve => {
      const checkTimeout = timeout ?? this.options.timeout;

      const checkDevice = (device: DiscoveredDevice) => {
        if (predicate(device)) {
          this.off('device-found', checkDevice);
          this.off('device-updated', checkDevice);
          resolve(device);
        }
      };

      const timeoutId = setTimeout(() => {
        this.off('device-found', checkDevice);
        this.off('device-updated', checkDevice);
        resolve(null);
      }, checkTimeout);

      this.on('device-found', checkDevice);
      this.on('device-updated', checkDevice);

      // Check existing devices
      for (const device of this.discoveredDevices.values()) {
        if (predicate(device)) {
          clearTimeout(timeoutId);
          this.off('device-found', checkDevice);
          this.off('device-updated', checkDevice);
          resolve(device);
          return;
        }
      }
    });
  }

  /**
   * 销毁服务
   */
  destroy(): void {
    this.stopDiscovery();
    this.clearCache();
  }
}

// Singleton instance
export const discoveryService = new DiscoveryService();

export default DiscoveryService;
