/**
 * 蓝牙打印库主类型定义
 */

import { ITemplate } from './domain/template/types';
import { IPrinter, IPrintJob } from './domain/printer/types';
import { IQueueStatus } from './domain/queue/types';

// 主配置接口
export interface IBluetoothPrinterConfig {
  /** 蓝牙配置 */
  bluetooth: {
    /** 扫描超时时间（毫秒） */
    scanTimeout: number;
    /** 连接超时时间（毫秒） */
    connectionTimeout: number;
    /** 是否自动重连 */
    autoReconnect: boolean;
    /** 最大重连次数 */
    maxReconnectAttempts: number;
    /** 重连间隔（毫秒） */
    reconnectInterval: number;
  };

  /** 打印机配置 */
  printer: {
    /** 默认打印密度 */
    density: number;
    /** 默认打印速度 */
    speed: number;
    /** 默认纸张宽度 */
    paperWidth: number;
    /** 是否自动切割 */
    autoCut: boolean;
    /** 默认字符集 */
    charset: string;
    /** 默认对齐方式 */
    align: 'left' | 'center' | 'right';
  };

  /** 队列配置 */
  queue: {
    /** 最大队列大小 */
    maxSize: number;
    /** 并发处理数量 */
    concurrency: number;
    /** 重试次数 */
    retryAttempts: number;
    /** 重试间隔（毫秒） */
    retryDelay: number;
    /** 是否自动处理 */
    autoProcess: boolean;
    /** 处理间隔（毫秒） */
    processInterval: number;
  };

  /** 模板配置 */
  template: {
    /** 是否启用缓存 */
    enableCache: boolean;
    /** 缓存大小 */
    cacheSize: number;
    /** 缓存超时时间（毫秒） */
    cacheTimeout: number;
    /** 是否启用验证 */
    enableValidation: boolean;
  };

  /** 日志配置 */
  logging: {
    /** 日志级别 */
    level: 'debug' | 'info' | 'warn' | 'error';
    /** 是否启用控制台输出 */
    enableConsole: boolean;
    /** 是否启用文件输出 */
    enableFile: boolean;
    /** 日志文件路径 */
    filePath?: string;
    /** 最大文件大小 */
    maxFileSize: number;
    /** 最大文件数量 */
    maxFiles: number;
  };

  /** 事件配置 */
  events: {
    /** 是否启用事件总线 */
    enabled: boolean;
    /** 最大事件监听器数量 */
    maxListeners: number;
    /** 是否启用事件历史 */
    enableHistory: boolean;
    /** 事件历史大小 */
    historySize: number;
  };
}

// 主选项接口
export interface IBluetoothPrinterOptions {
  /** 是否调试模式 */
  debug?: boolean;
  /** 自定义事件总线 */
  eventBus?: any;
  /** 自定义日志器 */
  logger?: any;
  /** 自定义配置管理器 */
  configManager?: any;
}

// 设备信息接口
export interface IDeviceInfo {
  /** 设备ID */
  id: string;
  /** 设备ID */
  deviceId: string;
  /** 设备名称 */
  name: string;
  /** 设备地址 */
  address: string;
  /** 设备类型 */
  type?: 'printer' | 'unknown';
  /** 是否已配对 */
  paired?: boolean;
  /** 信号强度 */
  rssi?: number;
  /** 是否可用 */
  available?: boolean;
  /** 服务列表 */
  services?: string[];
  /** 是否已连接 */
  connected?: boolean;
  /** 广播名称 */
  localName?: string;
  /** 广播数据 */
  advertisementData?: any;
}

// 连接信息接口
export interface IConnectionInfo {
  /** 连接ID */
  id: string;
  /** 设备ID */
  deviceId: string;
  /** 连接状态 */
  connected: boolean;
  /** 连接时间 */
  connectedAt: Date;
  /** 最后活动时间 */
  lastActivity: Date;
  /** 连接质量 */
  quality?: number;
  /** 传输速度 */
  speed?: number;
}

// 打印请求接口
export interface IPrintRequest {
  /** 请求类型 */
  type: 'text' | 'template' | 'image' | 'barcode' | 'qrcode' | 'raw';
  /** 打印内容 */
  content: any;
  /** 打印选项 */
  options?: any;
  /** 优先级 */
  priority?: number;
  /** 设备ID（可选，不指定则使用默认设备） */
  deviceId?: string;
}

// 打印结果接口
export interface IPrintResult {
  /** 是否成功 */
  success: boolean;
  /** 作业ID */
  jobId?: string;
  /** 错误信息 */
  error?: string;
  /** 打印时间 */
  printTime?: number;
  /** 使用设备 */
  deviceId?: string;
}

// 模板信息接口
export interface ITemplateInfo {
  /** 模板ID */
  id: string;
  /** 模板名称 */
  name: string;
  /** 模板类型 */
  type: string;
  /** 模板描述 */
  description?: string;
  /** 创建时间 */
  createdAt: Date;
  /** 更新时间 */
  updatedAt: Date;
  /** 版本号 */
  version: string;
  /** 标签 */
  tags: string[];
}

// 库状态接口
export interface IBluetoothPrinterStatus {
  /** 是否已初始化 */
  initialized: boolean;
  /** 蓝牙状态 */
  bluetooth: {
    enabled: boolean;
    scanning: boolean;
    connectedDevices: number;
  };
  /** 打印机状态 */
  printers: {
    total: number;
    connected: number;
    ready: number;
  };
  /** 队列状态 */
  queue: IQueueStatus;
  /** 模板状态 */
  templates: {
    total: number;
    enabled: number;
  };
  /** 当前配置 */
  config: IBluetoothPrinterConfig;
}

// 蓝牙打印事件映射
export interface BluetoothPrinterEvent {
  /** 初始化完成 */
  initialized: () => void;
  /** 配置更新 */
  configUpdated: (config: Partial<IBluetoothPrinterConfig>) => void;
  /** 设备发现 */
  deviceDiscovered: (device: IDeviceInfo) => void;
  /** 设备连接 */
  deviceConnected: (connection: IConnectionInfo) => void;
  /** 设备断开 */
  deviceDisconnected: (deviceId: string) => void;
  /** 连接失败 */
  connectionFailed: (error: Error) => void;
  /** 打印机添加 */
  printerAdded: (printer: IPrinter) => void;
  /** 打印机移除 */
  printerRemoved: (printerId: string) => void;
  /** 打印机状态变化 */
  printerStatusChanged: (status: { printerId: string; status: string }) => void;
  /** 作业入队 */
  jobQueued: (job: IPrintJob) => void;
  /** 作业开始 */
  jobStarted: (job: IPrintJob) => void;
  /** 作业完成 */
  jobCompleted: (job: IPrintJob) => void;
  /** 作业失败 */
  jobFailed: (job: IPrintJob, error: Error) => void;
  /** 模板注册 */
  templateRegistered: (template: ITemplate) => void;
  /** 模板渲染 */
  templateRendered: (result: { templateId: string; renderTime: number }) => void;
  /** 模板错误 */
  templateError: (error: Error) => void;
}

// 蓝牙打印库接口
export interface IBluetoothPrinter {
  /** 设备ID */
  deviceId?: string;
  /** 服务ID */
  serviceId?: string;
  /** 特征ID */
  characteristicId?: string;

  /** 初始化库 */
  initialize(): Promise<void>;

  /** 设备管理 */
  scanDevices(timeout?: number): Promise<IDeviceInfo[]>;
  connectDevice(deviceId: string): Promise<IConnectionInfo>;
  disconnectDevice(deviceId: string): Promise<void>;
  getConnectedDevices(): IConnectionInfo[];

  /** 打印功能 */
  printText(text: string, options?: any): Promise<IPrintResult>;
  printTemplate(templateId: string, data: any, options?: any): Promise<IPrintResult>;
  printImage(imageData: ArrayBuffer | string, options?: any): Promise<IPrintResult>;
  printBarcode(data: string, type: string, options?: any): Promise<IPrintResult>;
  printQRCode(data: string, options?: any): Promise<IPrintResult>;
  printBatch(requests: IPrintRequest[]): Promise<IPrintResult[]>;

  /** 队列管理 */
  getQueueStatus(): IQueueStatus;
  clearQueue(): void;
  pauseQueue(): void;
  resumeQueue(): void;

  /** 模板管理 */
  registerTemplate(template: ITemplate): Promise<void>;
  getTemplate(templateId: string): ITemplateInfo | undefined;
  getTemplates(): ITemplateInfo[];
  previewTemplate(templateId: string, data: any): Promise<string>;

  /** 状态和配置 */
  getStatus(): IBluetoothPrinterStatus;
  updateConfig(config: Partial<IBluetoothPrinterConfig>): void;
  getConfig(): IBluetoothPrinterConfig;

  /** 事件处理 */
  on<K extends keyof BluetoothPrinterEvent>(
    event: K,
    listener: BluetoothPrinterEvent[K]
  ): this;
  off<K extends keyof BluetoothPrinterEvent>(
    event: K,
    listener: BluetoothPrinterEvent[K]
  ): this;

  /** 销毁 */
  dispose(): Promise<void>;
}

// 打印机管理器接口（简化版）
export interface IPrinterManager {
  /** 打印文本 */
  printText(text: string, options?: any): Promise<IPrintResult>;
  /** 打印模板 */
  printTemplate(templateId: string, data: any, options?: any): Promise<IPrintResult>;
  /** 打印图片 */
  printImage(imageData: ArrayBuffer | string, options?: any): Promise<IPrintResult>;
  /** 打印条形码 */
  printBarcode(data: string, type: string, options?: any): Promise<IPrintResult>;
  /** 打印二维码 */
  printQRCode(data: string, options?: any): Promise<IPrintResult>;
  /** 批量打印 */
  printBatch(requests: IPrintRequest[]): Promise<IPrintResult[]>;

  /** 初始化 */
  initialize(): Promise<void>;
  /** 销毁 */
  dispose(): Promise<void>;

  /** 事件处理 */
  on(event: string, listener: (...args: any[]) => void): void;
  off(event: string, listener: (...args: any[]) => void): void;

  /** 打印机管理 */
  getPrinters(): IPrinter[];
  getConnectedPrinters(): IPrinter[];
  getReadyPrinters(): IPrinter[];
}

// 默认配置
export const DEFAULT_CONFIG: IBluetoothPrinterConfig = {
  bluetooth: {
    scanTimeout: 10000,
    connectionTimeout: 15000,
    autoReconnect: true,
    maxReconnectAttempts: 3,
    reconnectInterval: 2000
  },
  printer: {
    density: 8,
    speed: 4,
    paperWidth: 58,
    autoCut: false,
    charset: 'PC437',
    align: 'left'
  },
  queue: {
    maxSize: 100,
    concurrency: 1,
    retryAttempts: 3,
    retryDelay: 1000,
    autoProcess: true,
    processInterval: 500
  },
  template: {
    enableCache: true,
    cacheSize: 50,
    cacheTimeout: 300000, // 5分钟
    enableValidation: true
  },
  logging: {
    level: 'info',
    enableConsole: true,
    enableFile: false,
    maxFileSize: 10485760, // 10MB
    maxFiles: 5
  },
  events: {
    enabled: true,
    maxListeners: 100,
    enableHistory: false,
    historySize: 1000
  }
};

// 错误类型
export class BluetoothPrinterError extends Error {
  public code: string;
  public category: 'bluetooth' | 'printer' | 'queue' | 'template' | 'config' | 'general';

  constructor(
    code: string,
    message: string,
    category: BluetoothPrinterError['category'] = 'general'
  ) {
    super(message);
    this.name = 'BluetoothPrinterError';
    this.code = code;
    this.category = category;
  }
}

// 蓝牙相关错误
export class BluetoothError extends BluetoothPrinterError {
  constructor(code: string, message: string) {
    super(code, message, 'bluetooth');
    this.name = 'BluetoothError';
  }
}

// 打印机相关错误
export class PrinterError extends BluetoothPrinterError {
  constructor(code: string, message: string) {
    super(code, message, 'printer');
    this.name = 'PrinterError';
  }
}

// 队列相关错误
export class QueueError extends BluetoothPrinterError {
  constructor(code: string, message: string) {
    super(code, message, 'queue');
    this.name = 'QueueError';
  }
}

// 模板相关错误
export class TemplateError extends BluetoothPrinterError {
  constructor(code: string, message: string) {
    super(code, message, 'template');
    this.name = 'TemplateError';
  }
}

// 配置相关错误
export class ConfigError extends BluetoothPrinterError {
  constructor(code: string, message: string) {
    super(code, message, 'config');
    this.name = 'ConfigError';
  }
}

// 错误代码常量
export const ERROR_CODES = {
  // 通用错误
  UNKNOWN: 'UNKNOWN',
  INVALID_ARGUMENT: 'INVALID_ARGUMENT',
  NOT_INITIALIZED: 'NOT_INITIALIZED',
  ALREADY_INITIALIZED: 'ALREADY_INITIALIZED',

  // 蓝牙错误
  BLUETOOTH_NOT_AVAILABLE: 'BLUETOOTH_NOT_AVAILABLE',
  BLUETOOTH_PERMISSION_DENIED: 'BLUETOOTH_PERMISSION_DENIED',
  BLUETOOTH_SCAN_FAILED: 'BLUETOOTH_SCAN_FAILED',
  BLUETOOTH_CONNECTION_FAILED: 'BLUETOOTH_CONNECTION_FAILED',
  BLUETOOTH_CONNECTION_LOST: 'BLUETOOTH_CONNECTION_LOST',
  DEVICE_NOT_FOUND: 'DEVICE_NOT_FOUND',

  // 打印机错误
  PRINTER_NOT_FOUND: 'PRINTER_NOT_FOUND',
  PRINTER_NOT_CONNECTED: 'PRINTER_NOT_CONNECTED',
  PRINTER_BUSY: 'PRINTER_BUSY',
  PRINTER_ERROR: 'PRINTER_ERROR',
  PRINTER_OUT_OF_PAPER: 'PRINTER_OUT_OF_PAPER',
  PRINTER_OVERHEAT: 'PRINTER_OVERHEAT',

  // 队列错误
  QUEUE_FULL: 'QUEUE_FULL',
  QUEUE_EMPTY: 'QUEUE_EMPTY',
  QUEUE_PAUSED: 'QUEUE_PAUSED',
  JOB_NOT_FOUND: 'JOB_NOT_FOUND',
  JOB_FAILED: 'JOB_FAILED',

  // 模板错误
  TEMPLATE_NOT_FOUND: 'TEMPLATE_NOT_FOUND',
  TEMPLATE_INVALID: 'TEMPLATE_INVALID',
  TEMPLATE_RENDER_FAILED: 'TEMPLATE_RENDER_FAILED',

  // 配置错误
  CONFIG_INVALID: 'CONFIG_INVALID',
  CONFIG_NOT_FOUND: 'CONFIG_NOT_FOUND'
} as const;

// 导出ErrorCode类型以解决导出问题
export type ErrorCode = keyof typeof ERROR_CODES;

// 导出其他缺少的类型
export type TextOptions = {
  align?: 'left' | 'center' | 'right';
  bold?: boolean;
  underline?: boolean;
  size?: number;
};

export type ReceiptOptions = {
  title?: string;
  items?: ReceiptItem[];
  footer?: string;
};

export type ReceiptItem = {
  name: string;
  quantity?: number;
  price?: number;
  total?: number;
};

// 兼容旧版本的类型别名（为现有代码提供向后兼容）
export type IBlueToothPrinter = IBluetoothPrinter;
export type DeviceInfo = IDeviceInfo;
