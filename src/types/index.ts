/**
 * 类型定义文件
 * 用于全局共享的类型和接口定义
 */

// 通用类型定义
export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;

// 通用结果类型
export interface Result<T = any> {
  success: boolean;
  data?: T;
  error?: Error;
  code?: string;
  message?: string;
}

// 蓝牙设备相关类型
export interface BluetoothDevice {
  deviceId: string;
  name?: string;
  RSSI?: number;
  advertisData?: ArrayBuffer;
  manufacturerData?: ArrayBuffer;
  serviceData?: Array<{
    serviceId: string;
    data: ArrayBuffer;
  }> | Record<string, any>; // 兼容微信小程序的IAnyObject类型
}

// 蓝牙适配器接口
export interface BluetoothAdapter {
  initialize(): Promise<boolean>;
  onBluetoothAdapterStateChange(callback: (state: { available: boolean, discovering: boolean }) => void): void;
  onBluetoothDeviceFound(callback: (device: BluetoothDevice) => void): void;
  onBluetoothDeviceConnectionChange(callback: (deviceId: string, connected: boolean) => void): void;
  startDiscovery(options?: DiscoveryOptions): Promise<boolean>;
  stopDiscovery(): Promise<boolean>;
  getDiscoveredDevices(): Promise<BluetoothDevice[]>;
  connect(deviceId: string): Promise<boolean>;
  disconnect(deviceId: string): Promise<boolean>;
  write(deviceId: string, serviceId: string, characteristicId: string, data: ArrayBuffer): Promise<boolean>;
  destroy(): Promise<boolean>;
}

// 蓝牙发现选项
export interface DiscoveryOptions {
  timeout?: number;
  services?: string[];
  allowDuplicatesKey?: boolean;
  namePrefix?: string;
  filterByName?: boolean;
  namePrefixes?: string[];
  onlyPrinters?: boolean;
}

// 蓝牙连接选项
export interface ConnectOptions {
  retries?: number;
  timeout?: number;
}

// 打印选项类型
export interface TextOptions {
  text?: string;
  align?: 'left' | 'center' | 'right';
  bold?: boolean;
  doubleHeight?: boolean;
  doubleWidth?: boolean;
  underline?: boolean;
  fontType?: 'A' | 'B' | 'C';
}

export interface ImageOptions {
  maxWidth?: number;
  threshold?: number;
  dithering?: boolean;
  align?: 'left' | 'center' | 'right';
}

export interface QRCodeOptions {
  size?: number;
  errorCorrection?: 'L' | 'M' | 'Q' | 'H';
  align?: 'left' | 'center' | 'right';
}

export type BarcodeType = 
  | 'UPC-A' 
  | 'UPC-E' 
  | 'EAN13' 
  | 'EAN8' 
  | 'CODE39' 
  | 'ITF' 
  | 'CODABAR' 
  | 'CODE93' 
  | 'CODE128';

export interface BarcodeOptions {
  height?: number;
  width?: number;
  position?: 'none' | 'above' | 'below' | 'both';
  align?: 'left' | 'center' | 'right';
  type?: BarcodeType;
}

export interface CommandSendOptions {
  retries?: number;
  chunkSize?: number;
  interval?: number;
}

// 收据相关类型
export interface ReceiptItem {
  name: string;
  price: number;
  quantity: number;
  discount?: number;
}

export interface PaymentInfo {
  method: string;
  amount: number;
}

export interface ReceiptOptions {
  title: string;
  merchant: string;
  address?: string;
  phone?: string;
  orderNo?: string;
  items: ReceiptItem[];
  subtotal?: number;
  discount?: number;
  tax?: number;
  total: number;
  payment?: PaymentInfo;
  date?: string;
  operator?: string;
  footer?: string;
  qrcode?: string;
  logo?: string;
}

// 错误类型定义
export enum ErrorCode {
  // 通用错误
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  INVALID_PARAM = 'INVALID_PARAM',
  
  // 蓝牙相关错误
  BLUETOOTH_UNAVAILABLE = 'BLUETOOTH_UNAVAILABLE',
  BLUETOOTH_INIT_FAILED = 'BLUETOOTH_INIT_FAILED',
  BLUETOOTH_CONNECT_FAILED = 'BLUETOOTH_CONNECT_FAILED',
  BLUETOOTH_WRITE_FAILED = 'BLUETOOTH_WRITE_FAILED',
  BLUETOOTH_READ_FAILED = 'BLUETOOTH_READ_FAILED',
  
  // 打印机相关错误
  PRINTER_NOT_CONNECTED = 'PRINTER_NOT_CONNECTED',
  PRINTER_BUSY = 'PRINTER_BUSY',
  PRINTER_OUT_OF_PAPER = 'PRINTER_OUT_OF_PAPER',
  PRINTER_OVERHEATED = 'PRINTER_OVERHEATED',
  PRINTER_INVALID_FORMAT = 'PRINTER_INVALID_FORMAT',
  
  // 命令队列相关错误
  COMMAND_QUEUE_FULL = 'COMMAND_QUEUE_FULL',
  COMMAND_FAILED = 'COMMAND_FAILED',
  QUEUE_CLEARED = 'QUEUE_CLEARED',
  
  // 性能相关错误
  PERFORMANCE_DEGRADED = 'PERFORMANCE_DEGRADED',
  MEMORY_LIMIT_EXCEEDED = 'MEMORY_LIMIT_EXCEEDED',
  
  // 电池相关错误
  BATTERY_LOW = 'BATTERY_LOW',
  BATTERY_CRITICAL = 'BATTERY_CRITICAL'
}

// 自定义错误类
export class PrinterError extends Error {
  public code: ErrorCode;
  
  constructor(code: ErrorCode, message?: string) {
    super(message || code);
    this.name = 'PrinterError';
    this.code = code;
  }
}

// 蓝牙相关类型增强

// 蓝牙打印机相关类型
export interface DeviceInfo {
  deviceId: string;
  name: string;
  localName?: string;
  RSSI?: number;
  advertisData?: ArrayBuffer;
  manufacturerData?: ArrayBuffer;
  serviceData?: Record<string, ArrayBuffer>;
  connectable?: boolean;
}

export interface IBlueToothPrinter {
  deviceId?: string | number;
  serviceId?: string;
  characteristicId?: string;
}

export interface TransmissionStats {
  totalBytes: number;
  successfulBytes: number;
  startTime: number;
  endTime: number;
  totalCommands: number;
  successfulCommands: number;
  retryCount: number;
  lastTransmissionSpeed: number;
  successRate?: number;
  duration?: number;
  transmissionSpeed?: number;
}

export interface FlowControlParams {
  chunkSize: number;
  chunkDelay: number;
  commandDelay: number;
  autoAdjust: boolean;
  minChunkDelay: number;
  maxChunkDelay: number;
  minChunkSize: number;
  maxChunkSize: number;
  qualityThreshold: number;
  lastQuality: number;
  delayBetweenChunks?: number;
}

export interface BatchWriteOptions {
  useChunks?: boolean;
  chunkSize?: number;
  delayBetweenCommands?: number;
  delayBetweenChunks?: number;
  retries?: number;
  autoAdjustParams?: boolean;
  batchSize?: number;
  parallel?: boolean;
  maxParallel?: number;
  highPriority?: boolean;
  commandDelay?: number;
}

export interface BatchWriteResult {
  success: boolean;
  failed: number;
  stats?: TransmissionStats;
}

export interface ConnectionHistoryEntry {
  deviceId: string;
  name?: string;
  lastConnected: number;
  connectCount: number;
  successRate: number;
  favorite: boolean;
}

export interface DeviceHealthInfo {
  status: 'healthy' | 'warning' | 'error';
  issues: string[];
  details: {
    deviceId: string | null;
    isInitialized: boolean;
    isConnected: boolean;
    transmissionQuality: number;
    batteryLevel: number | null;
    signalStrength: number | null;
    device?: BluetoothDevice;
    transmissionStats?: TransmissionStats;
    canWrite?: boolean;
    error?: any;
    [key: string]: any;
  };
}

// 新增：连接质量相关接口
export interface ConnectionQualityInfo {
  deviceId: string | null;
  signalStrength?: number;
  transmissionQuality: number;
  timestamp: number;
}

export interface SignalStrengthInfo {
  deviceId: string | null;
  signalStrength: number;
  threshold: number;
}

export interface TransmissionQualityInfo {
  deviceId: string | null;
  quality: number;
  threshold: number;
}

export interface QueuedCommand {
  id: string;
  command: ArrayBuffer;
  priority: number;
  timestamp: number;
  retries: number;
  maxRetries: number;
  resolve: (value: boolean) => void;
  reject: (reason: any) => void;
  useChunks: boolean;
  description?: string;
}