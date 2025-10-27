/**
 * 蓝牙模块导出
 */

// 类型定义
export type {
  IBluetoothAdapter,
  IBluetoothDevice,
  IBluetoothCharacteristic,
  IBluetoothScanOptions,
  IBluetoothConnectionOptions,
  IBluetoothEvent,
  IBluetoothCommand,
  IBluetoothAdapterConfig,
  IBluetoothPlatformAdapter,
  BluetoothEventType,
  BluetoothCommandType,
  BluetoothState,
  BluetoothDeviceState,
  BluetoothDeviceType,
  CharacteristicProperty
} from './types';

// 核心实现
export { BluetoothAdapter } from './BluetoothAdapter';
export { BluetoothDevice } from './BluetoothDevice';
export { BluetoothPlatformAdapter } from './BluetoothPlatformAdapter';

// 平台适配器
export { TaroBluetoothAdapter } from './adapters/TaroBluetoothAdapter';

// 工厂函数
export function createBluetoothAdapter(
  name: string,
  platformAdapter: IBluetoothPlatformAdapter,
  config?: Partial<IBluetoothAdapterConfig>
): BluetoothAdapter {
  return new BluetoothAdapter(name, platformAdapter, config);
}

export function createTaroBluetoothAdapter(
  name: string,
  config?: Partial<IBluetoothAdapterConfig>
): BluetoothAdapter {
  const taroAdapter = new TaroBluetoothAdapter();
  return new BluetoothAdapter(name, taroAdapter, config);
}

// 设备工厂函数
export function createBluetoothDevice(
  id: string,
  name: string,
  address: string,
  type?: BluetoothDeviceType
): BluetoothDevice {
  return new BluetoothDevice(id, name, address, type);
}

// 便捷工具函数
export class BluetoothUtils {
  /**
   * 生成设备ID
   */
  static generateDeviceId(): string {
    return 'device_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * 格式化信号强度
   */
  static formatRSSI(rssi: number): string {
    if (rssi >= -50) return 'Excellent';
    if (rssi >= -70) return 'Good';
    if (rssi >= -90) return 'Fair';
    return 'Poor';
  }

  /**
   * 估算距离（米）
   */
  static estimateDistance(rssi: number, txPower: number = -59): number {
    if (rssi === 0) return -1.0;

    const ratio = rssi * 1.0 / txPower;
    if (ratio < 1.0) {
      return Math.pow(ratio, 10);
    } else {
      return (0.89976) * Math.pow(ratio, 7.7095) + 0.111;
    }
  }

  /**
   * 验证设备ID格式
   */
  static isValidDeviceId(deviceId: string): boolean {
    return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(deviceId) ||
           /^[0-9a-fA-F]{12}$/.test(deviceId);
  }

  /**
   * 验证UUID格式
   */
  static isValidUUID(uuid: string): boolean {
    return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(uuid);
  }

  /**
   * 标准化UUID
   */
  static normalizeUUID(uuid: string): string {
    if (!uuid) return '';

    // 移除可能的破折号
    const clean = uuid.replace(/-/g, '');

    if (clean.length === 32) {
      return `${clean.substr(0, 8)}-${clean.substr(8, 4)}-${clean.substr(12, 4)}-${clean.substr(16, 4)}-${clean.substr(20, 12)}`;
    }

    return uuid;
  }

  /**
   * 比较UUID
   */
  static compareUUID(uuid1: string, uuid2: string): boolean {
    return this.normalizeUUID(uuid1).toLowerCase() === this.normalizeUUID(uuid2).toLowerCase();
  }

  /**
   * 解析广播数据
   */
  static parseAdvertisementData(data: ArrayBuffer): {
    localName?: string;
    manufacturerData?: ArrayBuffer;
    serviceUuids: string[];
    serviceData: Map<string, ArrayBuffer>;
    txPowerLevel?: number;
  } {
    const result = {
      serviceUuids: [] as string[],
      serviceData: new Map<string, ArrayBuffer>()
    };

    if (!data || data.byteLength === 0) {
      return result;
    }

    const bytes = new Uint8Array(data);
    let offset = 0;

    while (offset < bytes.length) {
      const length = bytes[offset++];
      if (length === 0 || offset + length > bytes.length) {
        break;
      }

      const type = bytes[offset++];
      const payload = bytes.slice(offset, offset + length - 1);
      offset += length - 1;

      switch (type) {
        case 0x02: // Incomplete List of 16-bit Service Class UUIDs
        case 0x03: // Complete List of 16-bit Service Class UUIDs
          result.serviceUuids.push(...this.parseServiceUUIDs(payload, 2));
          break;
        case 0x04: // Incomplete List of 32-bit Service Class UUIDs
        case 0x05: // Complete List of 32-bit Service Class UUIDs
          result.serviceUuids.push(...this.parseServiceUUIDs(payload, 4));
          break;
        case 0x06: // Incomplete List of 128-bit Service Class UUIDs
        case 0x07: // Complete List of 128-bit Service Class UUIDs
          result.serviceUuids.push(...this.parseServiceUUIDs(payload, 16));
          break;
        case 0x08: // Shortened Local Name
        case 0x09: // Complete Local Name
          result.localName = new TextDecoder().decode(payload);
          break;
        case 0x0A: // Tx Power Level
          if (payload.length === 1) {
            result.txPowerLevel = payload[0];
          }
          break;
        case 0x16: // Service Data - 16-bit UUID
          if (payload.length >= 2) {
            const serviceId = this.bytesToUUID(payload.slice(0, 2));
            const data = payload.slice(2).buffer;
            result.serviceData.set(serviceId, data);
          }
          break;
        case 0xFF: // Manufacturer Specific Data
          if (payload.length >= 2) {
            result.manufacturerData = payload.buffer;
          }
          break;
      }
    }

    return result;
  }

  /**
   * 解析服务UUID
   */
  private static parseServiceUUIDs(payload: Uint8Array, uuidLength: number): string[] {
    const uuids: string[] = [];

    for (let i = 0; i < payload.length; i += uuidLength) {
      const uuidBytes = payload.slice(i, i + uuidLength);
      uuids.push(this.bytesToUUID(uuidBytes));
    }

    return uuids;
  }

  /**
   * 字节数组转UUID字符串
   */
  private static bytesToUUID(bytes: Uint8Array): string {
    if (bytes.length === 2) {
      const value = (bytes[1] << 8) | bytes[0];
      return value.toString(16).padStart(4, '0');
    } else if (bytes.length === 4) {
      const value = (bytes[3] << 24) | (bytes[2] << 16) | (bytes[1] << 8) | bytes[0];
      return value.toString(16).padStart(8, '0');
    } else if (bytes.length === 16) {
      const hex = Array.from(bytes)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
      return `${hex.substr(0, 8)}-${hex.substr(8, 4)}-${hex.substr(12, 4)}-${hex.substr(16, 4)}-${hex.substr(20, 12)}`;
    }
    return '';
  }

  /**
   * 创建扫描过滤器
   */
  static createScanFilter(options: {
    name?: string;
    namePrefix?: string;
    serviceUuids?: string[];
    manufacturerId?: number;
    minRSSI?: number;
  } = {}): (device: IBluetoothDevice) => boolean {
    return (device: IBluetoothDevice) => {
      // 名称过滤
      if (options.name && device.name !== options.name) {
        return false;
      }

      // 名称前缀过滤
      if (options.namePrefix && !device.name.startsWith(options.namePrefix)) {
        return false;
      }

      // 信号强度过滤
      if (options.minRSSI && device.rssi < options.minRSSI) {
        return false;
      }

      // 服务UUID过滤
      if (options.serviceUuids && options.serviceUuids.length > 0) {
        const hasService = options.serviceUuids.some(uuid =>
          device.services.includes(uuid)
        );
        if (!hasService) {
          return false;
        }
      }

      // 制造商ID过滤
      if (options.manufacturerId && device.metadata.manufacturerId !== options.manufacturerId) {
        return false;
      }

      return true;
    };
  }

  /**
   * 排序设备列表
   */
  static sortDevices(
    devices: IBluetoothDevice[],
    sortBy: 'rssi' | 'name' | 'lastSeen' = 'rssi',
    order: 'asc' | 'desc' = 'desc'
  ): IBluetoothDevice[] {
    return [...devices].sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'rssi':
          comparison = a.rssi - b.rssi;
          break;
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'lastSeen':
          const aTime = a.lastConnected?.getTime() || 0;
          const bTime = b.lastConnected?.getTime() || 0;
          comparison = aTime - bTime;
          break;
      }

      return order === 'asc' ? comparison : -comparison;
    });
  }

  /**
   * 查找设备
   */
  static findDevice(
    devices: IBluetoothDevice[],
    predicate: (device: IBluetoothDevice) => boolean
  ): IBluetoothDevice | undefined {
    return devices.find(predicate);
  }

  /**
   * 过滤设备
   */
  static filterDevices(
    devices: IBluetoothDevice[],
    predicate: (device: IBluetoothDevice) => boolean
  ): IBluetoothDevice[] {
    return devices.filter(predicate);
  }
}

// 常量定义
export const BLUETOOTH_CONSTANTS = {
  // 标准服务UUID
  SERVICES: {
    GENERIC_ACCESS: '1800',
    GENERIC_ATTRIBUTE: '1801',
    DEVICE_INFORMATION: '180A',
    BATTERY: '180F',
    HUMAN_INTERFACE_DEVICE: '1812',
    ENVIRONMENTAL_SENSING: '181A',
    IMMEDIATE_ALERT: '1802',
    LINK_LOSS: '1803',
    TX_POWER: '1804',
    CURRENT_TIME: '1805',
    REFERENCE_TIME_UPDATE: '1806',
    NEXT_DST_CHANGE: '1807',
    GLUCOSE: '1808',
    HEALTH_THERMOMETER: '1809',
    DEVICE_INFORMATION: '180A',
    HEART_RATE: '180D',
    PHONE_ALERT_STATUS: '180E',
    BATTERY_SERVICE: '180F',
    BLOOD_PRESSURE: '1810',
    ALERT_NOTIFICATION_SERVICE: '1811',
    HUMAN_INTERFACE_DEVICE: '1812',
    SCAN_PARAMETERS: '1813',
    SCAN_INTERVAL_WINDOW: '1814',
    HTTP_PROXY: '1815',
    TRANSSPORT_DISCOVERY: '1816',
    OBJECT_TRANSFER: '1817',
    FIRMWARE_UPDATE: '1818',
    LOCATION_AND_NAVIGATION: '1819',
    WEIGHT_SCALE: '181A',
    WEIGHT_MANAGEMENT: '181B',
    USER_MANAGEMENT: '181C',
    ALERT_LEVEL: '1822',
    PULSE_OXIMETER: '182D'
  },

  // 标准特征值UUID
  CHARACTERISTICS: {
    DEVICE_NAME: '2A00',
    APPEARANCE: '2A01',
    PERIPHERAL_PRIVACY_FLAG: '2A02',
    RECONNECTION_ADDRESS: '2A03',
    PERIPHERAL_PREFERRED_CONNECTION_PARAMETERS: '2A04',
    SERVICE_CHANGED: '2A05',
    BATTERY_LEVEL: '2A19',
    SYSTEM_ID: '2A23',
    MODEL_NUMBER: '2A24',
    SERIAL_NUMBER: '2A25',
    FIRMWARE_REVISION: '2A26',
    HARDWARE_REVISION: '2A27',
    SOFTWARE_REVISION: '2A28',
    MANUFACTURER_NAME: '2A29'
  },

  // 默认配置
  DEFAULT_CONFIG: {
    SCAN_TIMEOUT: 30000,
    CONNECTION_TIMEOUT: 10000,
    MAX_RETRY_ATTEMPTS: 3,
    AUTO_RECONNECT: true,
    ENABLE_LOGGING: true
  } as const
};

// 默认实例
export const defaultBluetoothAdapterFactory = () => {
  return createTaroBluetoothAdapter('default', BLUETOOTH_CONSTANTS.DEFAULT_CONFIG);
};