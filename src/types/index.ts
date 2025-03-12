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
  init(): Promise<boolean>;
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
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  INVALID_PARAM = 'INVALID_PARAM',
  
  // 蓝牙错误
  BLUETOOTH_UNAVAILABLE = 'BLUETOOTH_UNAVAILABLE',
  BLUETOOTH_INIT_FAILED = 'BLUETOOTH_INIT_FAILED',
  BLUETOOTH_CONNECT_FAILED = 'BLUETOOTH_CONNECT_FAILED',
  BLUETOOTH_DISCONNECT_FAILED = 'BLUETOOTH_DISCONNECT_FAILED',
  BLUETOOTH_SERVICE_NOT_FOUND = 'BLUETOOTH_SERVICE_NOT_FOUND',
  BLUETOOTH_CHARACTERISTIC_NOT_FOUND = 'BLUETOOTH_CHARACTERISTIC_NOT_FOUND',
  BLUETOOTH_WRITE_FAILED = 'BLUETOOTH_WRITE_FAILED',
  
  // 打印机错误
  PRINTER_NOT_CONNECTED = 'PRINTER_NOT_CONNECTED',
  PRINTER_COMMAND_FAILED = 'PRINTER_COMMAND_FAILED',
  PRINTER_IMAGE_PROCESS_FAILED = 'PRINTER_IMAGE_PROCESS_FAILED',
  PRINTER_INVALID_FORMAT = 'PRINTER_INVALID_FORMAT'
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