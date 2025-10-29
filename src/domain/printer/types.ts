/**
 * 打印机领域类型定义
 */

export type PrinterState =
  | 'idle'
  | 'ready'
  | 'printing'
  | 'paused'
  | 'error'
  | 'offline'
  | 'maintenance';

export type PrintJobState =
  | 'pending'
  | 'processing'
  | 'printing'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface IPrinter {
  /** 打印机ID */
  id: string;
  /** 打印机名称 */
  name: string;
  /** 打印机状态 */
  state: PrinterState;
  /** 打印机类型 */
  type: PrinterType;
  /** 连接信息 */
  connection: IPrinterConnection;
  /** 打印机配置 */
  config: IPrinterConfig;
  /** 当前任务 */
  currentJob?: IPrintJob;
  /** 打印机能力 */
  capabilities: IPrinterCapabilities;
  /** 最后更新时间 */
  lastUpdated: number;
}

export interface IPrinterConnection {
  /** 连接ID */
  id: string;
  /** 连接类型 */
  type: 'bluetooth' | 'usb' | 'network';
  /** 是否已连接 */
  connected: boolean;
  /** 连接地址 */
  address: string;
  /** 信号强度（蓝牙） */
  rssi?: number;
  /** 连接质量 */
  quality?: number;
}

export interface IPrinterConfig {
  /** 打印密度 */
  density: number;
  /** 打印速度 */
  speed: number;
  /** 纸张宽度 */
  paperWidth: number;
  /** 是否自动切割 */
  autoCut: boolean;
  /** 字符集 */
  charset: string;
  /** 对齐方式 */
  align: 'left' | 'center' | 'right';
  /** 打印浓度 */
  darkness?: number;
}

export interface IPrinterCapabilities {
  /** 支持的命令集 */
  commands: string[];
  /** 支持的媒体类型 */
  mediaTypes: string[];
  /** 最大打印宽度 */
  maxWidth: number;
  /** 支持的颜色 */
  colors: 'monochrome' | 'color';
  /** 支持的分辨率 */
  resolution: {
    horizontal: number;
    vertical: number;
  };
  /** 是否支持图形打印 */
  supportsGraphics: boolean;
  /** 是否支持条码 */
  supportsBarcode: boolean;
  /** 是否支持二维码 */
  supportsQRCode: boolean;
}

export type PrinterType = 'thermal' | 'label' | 'pos' | 'inkjet' | 'laser';

export interface IPrintJob {
  /** 任务ID */
  id: string;
  /** 任务名称 */
  name: string;
  /** 任务状态 */
  state: PrintJobState;
  /** 任务内容 */
  content: IPrintContent;
  /** 打印选项 */
  options: IPrintOptions;
  /** 优先级 */
  priority: 'low' | 'normal' | 'high';
  /** 创建时间 */
  createdAt: number;
  /** 开始时间 */
  startedAt?: number;
  /** 完成时间 */
  completedAt?: number;
  /** 重试次数 */
  retryCount: number;
  /** 错误信息 */
  error?: string;
  /** 进度信息 */
  progress?: {
    current: number;
    total: number;
    percentage: number;
  };
}

export interface IPrintContent {
  /** 内容类型 */
  type: 'text' | 'image' | 'template' | 'barcode' | 'qrCode';
  /** 内容数据 */
  data: string | ArrayBuffer | ITemplateData;
  /** 内容长度 */
  length?: number;
}

export interface ITemplateData {
  /** 模板ID */
  templateId: string;
  /** 模板数据 */
  data: Record<string, any>;
  /** 模板版本 */
  version?: string;
}

export interface IPrintOptions {
  /** 打印份数 */
  copies?: number;
  /** 打印质量 */
  quality?: 'low' | 'medium' | 'high';
  /** 是否预览 */
  preview?: boolean;
  /** 超时时间 */
  timeout?: number;
  /** 自定义参数 */
  [key: string]: any;
}

export interface IPrintResult {
  /** 是否成功 */
  success: boolean;
  /** 任务ID */
  jobId: string;
  /** 结果消息 */
  message?: string;
  /** 错误信息 */
  error?: string;
  /** 打印时间戳 */
  timestamp: number;
}

export interface IPrintDriver {
  /** 驱动名称 */
  name: string;
  /** 支持的打印机类型 */
  supportedTypes: PrinterType[];
  /** 初始化驱动 */
  initialize(config: IPrinterConfig): Promise<boolean>;
  /** 打印文本 */
  printText(text: string, options?: IPrintOptions): Promise<IPrintResult>;
  /** 打印图像 */
  printImage(imageData: ArrayBuffer, options?: IPrintOptions): Promise<IPrintResult>;
  /** 打印条码 */
  printBarcode(data: string, type: string, options?: IPrintOptions): Promise<IPrintResult>;
  /** 打印二维码 */
  printQRCode(data: string, options?: IPrintOptions): Promise<IPrintResult>;
  /** 获取状态 */
  getStatus(): Promise<PrinterState>;
  /** 重置打印机 */
  reset(): Promise<boolean>;
}

export interface IPrinterManager {
  /** 注册打印机 */
  register(printer: IPrinter): void;
  /** 注销打印机 */
  unregister(printerId: string): void;
  /** 获取打印机 */
  getPrinter(id: string): IPrinter | null;
  /** 获取所有打印机 */
  getAllPrinters(): IPrinter[];
  /** 获取可用打印机 */
  getAvailablePrinters(): IPrinter[];
  /** 连接打印机 */
  connect(printerId: string): Promise<boolean>;
  /** 断开打印机 */
  disconnect(printerId: string): Promise<boolean>;
  /** 打印任务 */
  print(printerId: string, content: IPrintContent, options?: IPrintOptions): Promise<IPrintResult>;
}