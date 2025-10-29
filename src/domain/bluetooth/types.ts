/**
 * 蓝牙领域类型定义
 */

export type BluetoothState =
  | 'unavailable'
  | 'available'
  | 'scanning'
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'error';

// 确保BluetoothState也被导出为值
export const BluetoothStateValues = {
  UNAVAILABLE: 'unavailable' as const,
  AVAILABLE: 'available' as const,
  SCANNING: 'scanning' as const,
  CONNECTING: 'connecting' as const,
  CONNECTED: 'connected' as const,
  DISCONNECTED: 'disconnected' as const,
  ERROR: 'error' as const
} as const;

export interface IBluetoothDevice {
  /** 设备ID */
  id: string;
  /** 设备名称 */
  name: string;
  /** 设备地址 */
  address: string;
  /** 信号强度 */
  rssi: number;
  /** 设备是否可用 */
  available: boolean;
  /** 服务列表 */
  services: string[];
  /** 是否已连接 */
  connected: boolean;
  /** 设备类型 */
  deviceType?: string;
  /** 制造商 */
  manufacturer?: string;
  /** 型号 */
  model?: string;
  /** 额外属性 */
  [key: string]: any;
}

export interface IBluetoothConnection {
  /** 连接ID */
  id: string;
  /** 设备ID */
  deviceId: string;
  /** 连接状态 */
  state: BluetoothState;
  /** 连接时间 */
  connectedAt: number;
  /** 最后活动时间 */
  lastActivity: number;
  /** 连接配置 */
  config: IBluetoothConnectionConfig;
}

export interface IBluetoothConnectionConfig {
  /** 超时时间 */
  timeout: number;
  /** 是否自动重连 */
  autoReconnect: boolean;
  /** 最大重连次数 */
  maxReconnectAttempts: number;
  /** 重连间隔 */
  reconnectInterval: number;
}

export interface IBluetoothAdapter {
  /** 初始化适配器 */
  initialize(): Promise<boolean>;
  /** 扫描设备 */
  scan(options?: IBluetoothScanOptions): Promise<IBluetoothDevice[]>;
  /** 停止扫描 */
  stopScan(): Promise<void>;
  /** 连接设备 */
  connect(deviceId: string, options?: IBluetoothConnectOptions): Promise<boolean>;
  /** 断开连接 */
  disconnect(deviceId: string): Promise<boolean>;
  /** 写入数据 */
  write(deviceId: string, serviceId: string, characteristicId: string, data: ArrayBuffer): Promise<boolean>;
  /** 读取数据 */
  read(deviceId: string, serviceId: string, characteristicId: string): Promise<ArrayBuffer>;
  /** 启用通知 */
  startNotifications(deviceId: string, serviceId: string, characteristicId: string): Promise<boolean>;
  /** 停止通知 */
  stopNotifications(deviceId: string, serviceId: string, characteristicId: string): Promise<boolean>;
  /** 获取服务 */
  getServices(deviceId: string): Promise<IBluetoothService[]>;
  /** 获取特征 */
  getCharacteristics(deviceId: string, serviceId: string): Promise<IBluetoothCharacteristic[]>;
}

export interface IBluetoothScanOptions {
  /** 扫描超时时间 */
  timeout?: number;
  /** 允许的设备类型 */
  allowDuplicates?: boolean;
  /** 服务UUID过滤 */
  services?: string[];
  /** 设备名称过滤 */
  name?: string;
  /** 信号强度过滤 */
  rssi?: {
    min?: number;
    max?: number;
  };
}

export interface IBluetoothConnectOptions {
  /** 连接超时时间 */
  timeout?: number;
  /** 是否自动重连 */
  autoReconnect?: boolean;
}

export interface IBluetoothService {
  /** 服务UUID */
  uuid: string;
  /** 是否为主要服务 */
  isPrimary: boolean;
  /** 服务名称 */
  name?: string;
}

export interface IBluetoothCharacteristic {
  /** 特征UUID */
  uuid: string;
  /** 特征属性 */
  properties: string[];
  /** 特征名称 */
  name?: string;
  /** 特征值 */
  value?: ArrayBuffer;
}

export interface IBluetoothPlatformAdapter {
  /** 平台类型 */
  platform: string;
  /** 是否支持蓝牙 */
  isSupported: boolean;
  /** 蓝牙权限状态 */
  permissions: {
    scanning: boolean;
    connecting: boolean;
  };
}

export interface IBluetoothError {
  /** 错误代码 */
  code: string;
  /** 错误消息 */
  message: string;
  /** 错误详情 */
  details?: any;
  /** 错误时间戳 */
  timestamp: number;
}