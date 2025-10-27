# 打印机管理器接口设计

## 设计目标

1. **统一打印接口**：支持多种打印机和打印格式
2. **命令队列管理**：支持批量打印和命令优先级
3. **模板系统**：支持可复用的打印模板
4. **状态管理**：完整的打印状态跟踪
5. **错误处理**：详细的错误分类和恢复机制

## 核心接口定义

### 1. 打印机管理器核心接口

```typescript
/**
 * 打印机管理器接口
 */
export interface IPrinterManager {
  /** 管理器是否已初始化 */
  readonly isInitialized: boolean;
  /** 当前连接的打印机列表 */
  readonly connectedPrinters: IPrinter[];
  /** 活跃的打印任务列表 */
  readonly activeJobs: IPrintJob[];
  /** 打印机状态 */
  readonly state: PrinterManagerState;

  /**
   * 初始化打印机管理器
   * @param options 初始化选项
   */
  initialize(options?: PrinterManagerOptions): Promise<boolean>;

  /**
   * 销毁打印机管理器
   */
  dispose(): Promise<void>;

  /**
   * 连接打印机
   * @param deviceId 设备ID
   * @param options 连接选项
   */
  connectPrinter(deviceId: string, options?: PrinterConnectionOptions): Promise<IPrinter>;

  /**
   * 断开打印机连接
   * @param printerId 打印机ID
   */
  disconnectPrinter(printerId: string): Promise<boolean>;

  /**
   * 获取连接的打印机
   * @param printerId 打印机ID
   */
  getPrinter(printerId: string): IPrinter | null;

  /**
   * 创建打印任务
   * @param data 打印数据
   * @param options 打印选项
   */
  createPrintJob(data: PrintJobData, options?: PrintJobOptions): IPrintJob;

  /**
   * 提交打印任务
   * @param job 打印任务
   */
  submitPrintJob(job: IPrintJob): Promise<IPrintJobResult>;

  /**
   * 取消打印任务
   * @param jobId 任务ID
   */
  cancelPrintJob(jobId: string): Promise<boolean>;

  /**
   * 获取打印任务状态
   * @param jobId 任务ID
   */
  getPrintJobStatus(jobId: string): Promise<IPrintJobStatus>;

  /**
   * 打印文本
   * @param text 文本内容
   * @param options 打印选项
   */
  printText(text: string, options?: TextPrintOptions): Promise<IPrintJobResult>;

  /**
   * 打印图片
   * @param imageData 图片数据
   * @param options 打印选项
   */
  printImage(imageData: ImageData, options?: ImagePrintOptions): Promise<IPrintJobResult>;

  /**
   * 打印条码
   * @param data 条码数据
   * @param options 打印选项
   */
  printBarcode(data: BarcodeData, options?: BarcodePrintOptions): Promise<IPrintJobResult>;

  /**
   * 打印二维码
   * @param data 二维码数据
   * @param options 打印选项
   */
  printQRCode(data: QRCodeData, options?: QRCodePrintOptions): Promise<IPrintJobResult>;

  /**
   * 使用模板打印
   * @param templateName 模板名称
   * @param data 模板数据
   * @param options 打印选项
   */
  printWithTemplate(templateName: string, data: unknown, options?: TemplatePrintOptions): Promise<IPrintJobResult>;

  /**
   * 获取可用模板列表
   */
  getAvailableTemplates(): string[];

  /**
   * 注册模板
   * @param name 模板名称
   * @param template 模板定义
   */
  registerTemplate(name: string, template: IPrintTemplate): void;

  /**
   * 获取打印机状态
   * @param printerId 打印机ID
   */
  getPrinterStatus(printerId: string): Promise<IPrinterStatus>;

  /**
   * 重置打印机
   * @param printerId 打印机ID
   */
  resetPrinter(printerId: string): Promise<boolean>;

  /**
   * 获取打印历史
   * @param options 查询选项
   */
  getPrintHistory(options?: PrintHistoryOptions): Promise<IPrintHistory[]>;

  /**
   * 注册事件监听器
   * @param event 事件类型
   * @param listener 事件监听器
   */
  addEventListener<T extends PrinterManagerEvent>(
    event: T['type'],
    listener: (event: T) => void
  ): () => void;

  /**
   * 移除事件监听器
   * @param event 事件类型
   * @param listener 事件监听器
   */
  removeEventListener<T extends PrinterManagerEvent>(
    event: T['type'],
    listener: (event: T) => void
  ): void;
}
```

### 2. 打印机接口

```typescript
/**
 * 打印机接口
 */
export interface IPrinter {
  /** 打印机唯一标识 */
  readonly id: string;
  /** 打印机名称 */
  readonly name: string;
  /** 打印机类型 */
  readonly type: PrinterType;
  /** 打印机型号 */
  readonly model?: string;
  /** 打印机厂商 */
  readonly manufacturer?: string;
  /** 连接信息 */
  readonly connection: IPrinterConnection;
  /** 打印机能力 */
  readonly capabilities: IPrinterCapabilities;
  /** 当前状态 */
  readonly status: PrinterStatus;
  /** 连接时间 */
  readonly connectedAt?: number;

  /**
   * 打印命令
   * @param commands 命令列表
   * @param options 打印选项
   */
  print(commands: IPrintCommand[], options?: PrintOptions): Promise<IPrintResult>;

  /**
   * 获取打印机状态
   */
  getStatus(): Promise<IPrinterStatus>;

  /**
   * 重置打印机
   */
  reset(): Promise<boolean>;

  /**
   * 自检
   */
  selfTest(): Promise<IPrinterSelfTestResult>;

  /**
   * 获取打印机信息
   */
  getPrinterInfo(): Promise<IPrinterInfo>;
}

/**
 * 打印机类型枚举
 */
export enum PrinterType {
  THERMAL = 'thermal',           // 热敏打印机
  DOT_MATRIX = 'dot_matrix',     // 点阵打印机
  INKJET = 'inkjet',             // 喷墨打印机
  LASER = 'laser',               // 激光打印机
  PORTABLE = 'portable',         // 便携式打印机
  LABEL = 'label',               // 标签打印机
  RECEIPT = 'receipt',           // 收据打印机
  UNKNOWN = 'unknown'            // 未知类型
}

/**
 * 打印机状态枚举
 */
export enum PrinterStatus {
  OFFLINE = 'offline',           // 离线
  ONLINE = 'online',             // 在线
  BUSY = 'busy',                 // 忙碌
  ERROR = 'error',               // 错误
  OUT_OF_PAPER = 'out_of_paper', // 缺纸
  OUT_OF_INK = 'out_of_ink',     // 缺墨
  COVER_OPEN = 'cover_open',     // 盖子打开
  PAPER_JAM = 'paper_jam',       // 卡纸
  OVERHEATED = 'overheated',     // 过热
  UNKNOWN = 'unknown'            // 未知状态
}

/**
 * 打印机连接信息
 */
export interface IPrinterConnection {
  /** 连接类型 */
  readonly type: ConnectionType;
  /** 设备ID */
  readonly deviceId: string;
  /** 服务ID */
  readonly serviceId?: string;
  /** 特征ID */
  readonly characteristicId?: string;
  /** 连接参数 */
  readonly parameters: ConnectionParameters;
  /** 连接质量 */
  readonly quality: ConnectionQuality;
}

/**
 * 连接类型枚举
 */
export enum ConnectionType {
  BLUETOOTH = 'bluetooth',
  USB = 'usb',
  WIFI = 'wifi',
  ETHERNET = 'ethernet',
  SERIAL = 'serial'
}

/**
 * 连接质量
 */
export interface ConnectionQuality {
  /** 信号强度 (0-100) */
  signalStrength: number;
  /** 连接稳定性 (0-100) */
  stability: number;
  /** 传输速度 */
  transferSpeed: number;
  /** 最后更新时间 */
  lastUpdated: number;
}

/**
 * 打印机能力
 */
export interface IPrinterCapabilities {
  /** 支持的打印模式 */
  printModes: PrintMode[];
  /** 支持的字体 */
  fonts: PrinterFont[];
  /** 最大打印宽度 */
  maxPrintWidth: number;
  /** 最大打印高度 */
  maxPrintHeight: number;
  /** 支持的分辨率 */
  resolutions: Resolution[];
  /** 支持的颜色模式 */
  colorModes: ColorMode[];
  /** 是否支持条码 */
  supportsBarcode: boolean;
  /** 支持的条码类型 */
  barcodeTypes: BarcodeType[];
  /** 是否支持二维码 */
  supportsQRCode: boolean;
  /** 是否支持图像打印 */
  supportsImage: boolean;
  /** 支持的图像格式 */
  imageFormats: ImageFormat[];
  /** 是否支持切纸 */
  supportsAutoCut: boolean;
  /** 纸张类型支持 */
  paperTypes: PaperType[];
  /** 最大纸张长度 */
  maxPaperLength?: number;
}

/**
 * 打印模式枚举
 */
export enum PrintMode {
  TEXT = 'text',
  GRAPHICS = 'graphics',
  BITMAP = 'bitmap',
  VECTOR = 'vector'
}

/**
 * 打印机字体
 */
export interface PrinterFont {
  /** 字体名称 */
  name: string;
  /** 字体大小 */
  size: number;
  /** 是否为粗体 */
  bold: boolean;
  /** 是否为斜体 */
  italic: boolean;
}

/**
 * 分辨率
 */
export interface Resolution {
  /** 水平DPI */
  xDpi: number;
  /** 垂直DPI */
  yDpi: number;
}

/**
 * 颜色模式枚举
 */
export enum ColorMode {
  MONOCHROME = 'monochrome',
  GRAYSCALE = 'grayscale',
  COLOR = 'color'
}

/**
 * 条码类型枚举
 */
export enum BarcodeType {
  UPC_A = 'upc_a',
  UPC_E = 'upc_e',
  EAN_13 = 'ean_13',
  EAN_8 = 'ean_8',
  CODE_39 = 'code_39',
  CODE_128 = 'code_128',
  ITF = 'itf',
  CODABAR = 'codabar',
  CODE_93 = 'code_93',
  PDF_417 = 'pdf_417',
  DATAMATRIX = 'datamatrix'
}

/**
 * 图像格式枚举
 */
export enum ImageFormat {
  BMP = 'bmp',
  PNG = 'png',
  JPEG = 'jpeg',
  TIFF = 'tiff',
  GIF = 'gif'
}

/**
 * 纸张类型枚举
 */
export enum PaperType {
  THERMAL = 'thermal',
  LABEL = 'label',
  CONTINUOUS = 'continuous',
  CUT_SHEET = 'cut_sheet',
  ENVELOPE = 'envelope'
}
```

### 3. 打印任务接口

```typescript
/**
 * 打印任务接口
 */
export interface IPrintJob {
  /** 任务唯一标识 */
  readonly id: string;
  /** 任务名称 */
  readonly name: string;
  /** 任务类型 */
  readonly type: PrintJobType;
  /** 任务数据 */
  readonly data: PrintJobData;
  /** 任务选项 */
  readonly options: PrintJobOptions;
  /** 目标打印机ID */
  readonly printerId: string;
  /** 任务状态 */
  readonly status: PrintJobStatus;
  /** 创建时间 */
  readonly createdAt: number;
  /** 开始时间 */
  readonly startedAt?: number;
  /** 完成时间 */
  readonly completedAt?: number;
  /** 进度信息 */
  readonly progress: IPrintJobProgress;
  /** 错误信息 */
  readonly error?: PrinterError;

  /**
   * 更新任务状态
   * @param status 新状态
   */
  updateStatus(status: PrintJobStatus): void;

  /**
   * 更新进度
   * @param progress 进度信息
   */
  updateProgress(progress: IPrintJobProgress): void;

  /**
   * 取消任务
   */
  cancel(): Promise<boolean>;

  /**
   * 暂停任务
   */
  pause(): Promise<boolean>;

  /**
   * 恢复任务
   */
  resume(): Promise<boolean>;
}

/**
 * 打印任务类型枚举
 */
export enum PrintJobType {
  TEXT = 'text',
  IMAGE = 'image',
  BARCODE = 'barcode',
  QRCODE = 'qrcode',
  TEMPLATE = 'template',
  MIXED = 'mixed'
}

/**
 * 打印任务状态枚举
 */
export enum PrintJobStatus {
  PENDING = 'pending',           // 等待中
  QUEUED = 'queued',            // 已排队
  PRINTING = 'printing',         // 打印中
  PAUSED = 'paused',            // 已暂停
  COMPLETED = 'completed',       // 已完成
  FAILED = 'failed',             // 失败
  CANCELLED = 'cancelled',       // 已取消
  TIMEOUT = 'timeout'            // 超时
}

/**
 * 打印任务数据
 */
export type PrintJobData =
  | TextPrintData
  | ImagePrintData
  | BarcodePrintData
  | QRCodePrintData
  | TemplatePrintData
  | MixedPrintData;

/**
 * 文本打印数据
 */
export interface TextPrintData {
  type: 'text';
  content: string;
}

/**
 * 图像打印数据
 */
export interface ImagePrintData {
  type: 'image';
  imageData: ImageData;
  width?: number;
  height?: number;
}

/**
 * 条码打印数据
 */
export interface BarcodePrintData {
  type: 'barcode';
  data: string;
  barcodeType: BarcodeType;
}

/**
 * 二维码打印数据
 */
export interface QRCodePrintData {
  type: 'qrcode';
  data: string;
  errorCorrectionLevel?: QRCodeErrorCorrectionLevel;
}

/**
 * 二维码纠错级别枚举
 */
export enum QRCodeErrorCorrectionLevel {
  L = 'L',  // ~7%
  M = 'M',  // ~15%
  Q = 'Q',  // ~25%
  H = 'H'   // ~30%
}

/**
 * 模板打印数据
 */
export interface TemplatePrintData {
  type: 'template';
  templateName: string;
  templateData: Record<string, unknown>;
}

/**
 * 混合打印数据
 */
export interface MixedPrintData {
  type: 'mixed';
  elements: PrintJobData[];
}

/**
 * 打印任务选项
 */
export interface PrintJobOptions {
  /** 任务优先级 */
  priority?: PrintJobPriority;
  /** 打印份数 */
  copies?: number;
  /** 打印质量 */
  quality?: PrintQuality;
  /** 是否自动切纸 */
  autoCut?: boolean;
  /** 任务超时时间 */
  timeout?: number;
  /** 重试次数 */
  retryCount?: number;
  /** 重试间隔 */
  retryInterval?: number;
  /** 是否保存到历史 */
  saveToHistory?: boolean;
  /** 自定义选项 */
  customOptions?: Record<string, unknown>;
}

/**
 * 打印任务优先级枚举
 */
export enum PrintJobPriority {
  LOW = 0,
  NORMAL = 1,
  HIGH = 2,
  URGENT = 3
}

/**
 * 打印质量枚举
 */
export enum PrintQuality {
  DRAFT = 'draft',
  NORMAL = 'normal',
  HIGH = 'high'
}

/**
 * 打印任务进度
 */
export interface IPrintJobProgress {
  /** 总进度 (0-100) */
  total: number;
  /** 当前步骤 */
  currentStep: number;
  /** 总步骤数 */
  totalSteps: number;
  /** 当前步骤描述 */
  currentStepDescription?: string;
  /** 估计剩余时间（毫秒） */
  estimatedTimeRemaining?: number;
  /** 已传输字节数 */
  bytesTransferred?: number;
  /** 总字节数 */
  totalBytes?: number;
}
```

### 4. 打印命令接口

```typescript
/**
 * 打印命令接口
 */
export interface IPrintCommand {
  /** 命令类型 */
  readonly type: CommandType;
  /** 命令数据 */
  readonly data: ArrayBuffer;
  /** 命令描述 */
  readonly description?: string;
  /** 命令优先级 */
  readonly priority?: number;
  /** 是否需要响应 */
  readonly requiresResponse?: boolean;
}

/**
 * 命令类型枚举
 */
export enum CommandType {
  INIT = 'init',                    // 初始化
  RESET = 'reset',                  // 重置
  TEXT = 'text',                    // 文本
  IMAGE = 'image',                  // 图像
  BARCODE = 'barcode',              // 条码
  QRCODE = 'qrcode',                // 二维码
  LINE_FEED = 'line_feed',          // 换行
  FORM_FEED = 'form_feed',          // 换页
  CUT = 'cut',                      // 切纸
  ALIGN_LEFT = 'align_left',        // 左对齐
  ALIGN_CENTER = 'align_center',    // 居中对齐
  ALIGN_RIGHT = 'align_right',      // 右对齐
  FONT_BOLD_ON = 'font_bold_on',    // 粗体开始
  FONT_BOLD_OFF = 'font_bold_off',  // 粗体结束
  FONT_UNDERLINE_ON = 'font_underline_on',    // 下划线开始
  FONT_UNDERLINE_OFF = 'font_underline_off',  // 下划线结束
  FONT_SIZE_NORMAL = 'font_size_normal',    // 正常字体
  FONT_SIZE_LARGE = 'font_size_large',      // 大字体
  CUSTOM = 'custom'                  // 自定义命令
}

/**
 * 打印结果
 */
export interface IPrintResult {
  /** 是否成功 */
  success: boolean;
  /** 传输的字节数 */
  bytesTransferred?: number;
  /** 执行时间（毫秒） */
  executionTime?: number;
  /** 错误信息 */
  error?: PrinterError;
  /** 响应数据 */
  response?: ArrayBuffer;
}

/**
 * 打印任务结果
 */
export interface IPrintJobResult {
  /** 任务ID */
  jobId: string;
  /** 是否成功 */
  success: boolean;
  /** 任务状态 */
  status: PrintJobStatus;
  /** 进度信息 */
  progress?: IPrintJobProgress;
  /** 错误信息 */
  error?: PrinterError;
  /** 执行时间（毫秒） */
  executionTime?: number;
}
```

### 5. 模板系统接口

```typescript
/**
 * 打印模板接口
 */
export interface IPrintTemplate {
  /** 模板名称 */
  readonly name: string;
  /** 模板版本 */
  readonly version: string;
  /** 模板描述 */
  readonly description?: string;
  /** 模板参数 */
  readonly parameters: TemplateParameter[];
  /** 模板布局 */
  readonly layout: TemplateLayout;
  /** 模板样式 */
  readonly styles?: TemplateStyles;

  /**
   * 渲染模板
   * @param data 模板数据
   * @param options 渲染选项
   */
  render(data: Record<string, unknown>, options?: TemplateRenderOptions): Promise<IPrintCommand[]>;

  /**
   * 验证模板数据
   * @param data 模板数据
   */
  validateData(data: Record<string, unknown>): TemplateValidationResult;
}

/**
 * 模板参数
 */
export interface TemplateParameter {
  /** 参数名称 */
  name: string;
  /** 参数类型 */
  type: TemplateParameterType;
  /** 是否必需 */
  required: boolean;
  /** 默认值 */
  defaultValue?: unknown;
  /** 参数描述 */
  description?: string;
  /** 验证规则 */
  validation?: TemplateValidationRule[];
}

/**
 * 模板参数类型枚举
 */
export enum TemplateParameterType {
  STRING = 'string',
  NUMBER = 'number',
  BOOLEAN = 'boolean',
  DATE = 'date',
  IMAGE = 'image',
  BARCODE = 'barcode',
  QRCODE = 'qrcode',
  ARRAY = 'array',
  OBJECT = 'object'
}

/**
 * 模板验证规则
 */
export interface TemplateValidationRule {
  /** 规则类型 */
  type: 'required' | 'minLength' | 'maxLength' | 'pattern' | 'range';
  /** 规则值 */
  value?: unknown;
  /** 错误消息 */
  message?: string;
}

/**
 * 模板布局
 */
export interface TemplateLayout {
  /** 页面设置 */
  page: PageSettings;
  /** 元素列表 */
  elements: TemplateElement[];
}

/**
 * 页面设置
 */
export interface PageSettings {
  /** 页面宽度 */
  width: number;
  /** 页面高度 */
  height?: number;
  /** 页边距 */
  margins: PageMargins;
  /** 页面方向 */
  orientation: PageOrientation;
}

/**
 * 页边距
 */
export interface PageMargins {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/**
 * 页面方向枚举
 */
export enum PageOrientation {
  PORTRAIT = 'portrait',
  LANDSCAPE = 'landscape'
}

/**
 * 模板元素
 */
export interface TemplateElement {
  /** 元素ID */
  id: string;
  /** 元素类型 */
  type: TemplateElementType;
  /** 元素位置 */
  position: ElementPosition;
  /** 元素样式 */
  styles?: ElementStyles;
  /** 数据绑定 */
  dataBinding?: DataBinding;
  /** 条件显示 */
  condition?: string;
}

/**
 * 模板元素类型枚举
 */
export enum TemplateElementType {
  TEXT = 'text',
  IMAGE = 'image',
  BARCODE = 'barcode',
  QRCODE = 'qrcode',
  LINE = 'line',
  RECTANGLE = 'rectangle',
  TABLE = 'table',
  LIST = 'list'
}

/**
 * 元素位置
 */
export interface ElementPosition {
  /** X坐标 */
  x: number;
  /** Y坐标 */
  y: number;
  /** 宽度 */
  width?: number;
  /** 高度 */
  height?: number;
  /** 对齐方式 */
  align?: ElementAlignment;
}

/**
 * 元素对齐方式枚举
 */
export enum ElementAlignment {
  LEFT = 'left',
  CENTER = 'center',
  RIGHT = 'right'
}

/**
 * 元素样式
 */
export interface ElementStyles {
  /** 字体大小 */
  fontSize?: number;
  /** 字体粗细 */
  fontWeight?: FontWeight;
  /** 字体系列 */
  fontFamily?: string;
  /** 文本对齐 */
  textAlign?: TextAlign;
  /** 颜色 */
  color?: string;
  /** 背景色 */
  backgroundColor?: string;
  /** 边框 */
  border?: Border;
  /** 边距 */
  margin?: Margin;
  /** 内边距 */
  padding?: Padding;
}

/**
 * 字体粗细枚举
 */
export enum FontWeight {
  NORMAL = 'normal',
  BOLD = 'bold'
}

/**
 * 文本对齐枚举
 */
export enum TextAlign {
  LEFT = 'left',
  CENTER = 'center',
  RIGHT = 'right'
}

/**
 * 边框
 */
export interface Border {
  width: number;
  style: BorderStyle;
  color: string;
}

/**
 * 边框样式枚举
 */
export enum BorderStyle {
  SOLID = 'solid',
  DASHED = 'dashed',
  DOTTED = 'dotted'
}

/**
 * 边距
 */
export interface Margin {
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;
}

/**
 * 内边距
 */
export interface Padding {
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;
}

/**
 * 数据绑定
 */
export interface DataBinding {
  /** 数据路径 */
  path: string;
  /** 格式化函数 */
  formatter?: string;
  /** 默认值 */
  defaultValue?: unknown;
}

/**
 * 模板渲染选项
 */
export interface TemplateRenderOptions {
  /** 是否包含调试信息 */
  debug?: boolean;
  /** 自定义变量 */
  variables?: Record<string, unknown>;
  /** 渲染器配置 */
  rendererConfig?: Record<string, unknown>;
}

/**
 * 模板验证结果
 */
export interface TemplateValidationResult {
  /** 是否有效 */
  valid: boolean;
  /** 错误列表 */
  errors: TemplateValidationError[];
  /** 警告列表 */
  warnings: TemplateValidationWarning[];
}

/**
 * 模板验证错误
 */
export interface TemplateValidationError {
  /** 参数路径 */
  path: string;
  /** 错误消息 */
  message: string;
  /** 错误代码 */
  code: string;
}

/**
 * 模板验证警告
 */
export interface TemplateValidationWarning {
  /** 参数路径 */
  path: string;
  /** 警告消息 */
  message: string;
  /** 警告代码 */
  code: string;
}

/**
 * 模板样式
 */
export interface TemplateStyles {
  /** 默认字体 */
  defaultFont?: PrinterFont;
  /** 默认颜色 */
  defaultColor?: string;
  /** 默认背景色 */
  defaultBackgroundColor?: string;
  /** 全局样式 */
  global?: Record<string, unknown>;
}
```

### 6. 事件接口

```typescript
/**
 * 打印机管理器事件基类
 */
export interface PrinterManagerEvent {
  /** 事件类型 */
  readonly type: string;
  /** 事件时间戳 */
  readonly timestamp: number;
  /** 管理器实例 */
  readonly manager: IPrinterManager;
}

/**
 * 打印机连接事件
 */
export interface PrinterConnectedEvent extends PrinterManagerEvent {
  readonly type: 'printerConnected';
  readonly printer: IPrinter;
}

/**
 * 打印机断开事件
 */
export interface PrinterDisconnectedEvent extends PrinterManagerEvent {
  readonly type: 'printerDisconnected';
  readonly printerId: string;
  readonly reason: DisconnectReason;
}

/**
 * 打印任务状态变更事件
 */
export interface PrintJobStatusChangedEvent extends PrinterManagerEvent {
  readonly type: 'printJobStatusChanged';
  readonly job: IPrintJob;
  readonly oldStatus: PrintJobStatus;
  readonly newStatus: PrintJobStatus;
}

/**
 * 打印进度更新事件
 */
export interface PrintProgressUpdatedEvent extends PrinterManagerEvent {
  readonly type: 'printProgressUpdated';
  readonly jobId: string;
  readonly progress: IPrintJobProgress;
}

/**
 * 打印任务完成事件
 */
export interface PrintJobCompletedEvent extends PrinterManagerEvent {
  readonly type: 'printJobCompleted';
  readonly job: IPrintJob;
  readonly result: IPrintJobResult;
}

/**
 * 打印错误事件
 */
export interface PrintErrorEvent extends PrinterManagerEvent {
  readonly type: 'printError';
  readonly jobId: string;
  readonly error: PrinterError;
}
```

## 使用示例

### 基本打印操作

```typescript
// 创建打印机管理器
const printerManager = createPrinterManager();

// 初始化
await printerManager.initialize({
  maxConcurrentJobs: 3,
  defaultTimeout: 30000
});

// 连接打印机
const printer = await printerManager.connectPrinter('device123', {
  autoReconnect: true,
  connectionTimeout: 10000
});

// 打印文本
const result = await printerManager.printText('Hello, World!', {
  align: 'center',
  bold: true,
  autoCut: true
});

if (result.success) {
  console.log('打印成功，任务ID:', result.jobId);
}
```

### 使用模板打印

```typescript
// 注册模板
const receiptTemplate = new ReceiptTemplate();
printerManager.registerTemplate('receipt', receiptTemplate);

// 使用模板打印
const result = await printerManager.printWithTemplate('receipt', {
  merchant: '测试商店',
  items: [
    { name: '商品A', price: 10.00, quantity: 2 },
    { name: '商品B', price: 5.50, quantity: 1 }
  ],
  total: 25.50,
  date: new Date().toLocaleString()
}, {
  copies: 2,
  autoCut: true
});
```

### 事件监听

```typescript
// 监听打印机连接事件
printerManager.addEventListener('printerConnected', (event) => {
  console.log('打印机已连接:', event.printer.name);
});

// 监听打印进度
printerManager.addEventListener('printProgressUpdated', (event) => {
  console.log(`打印进度: ${event.progress.total}%`);
});

// 监听打印完成
printerManager.addEventListener('printJobCompleted', (event) => {
  console.log('打印任务完成:', event.job.id);
});
```

这个打印机管理器接口设计提供了：

1. **完整的打印功能**：支持文本、图像、条码、二维码和模板打印
2. **灵活的模板系统**：可复用的打印模板，支持复杂布局
3. **强大的任务管理**：支持任务队列、优先级和状态跟踪
4. **详细的错误处理**：完整的错误分类和处理机制
5. **事件驱动架构**：实时状态更新和进度通知

这为打印机功能提供了统一、可扩展的接口规范。