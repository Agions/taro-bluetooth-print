/**
 * 模板模块类型定义
 */

// 模板类型
export enum TemplateType {
  TEXT = 'text',
  RECEIPT = 'receipt',
  LABEL = 'label',
  TICKET = 'ticket',
  INVOICE = 'invoice',
  REPORT = 'report',
  CUSTOM = 'custom'
}

// 模板接口
export interface ITemplate {
  /** 模板ID */
  id: string;
  /** 模板名称 */
  name: string;
  /** 模板类型 */
  type: TemplateType;
  /** 模板内容 */
  content: any;
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
  /** 模板变量定义 */
  variables?: ITemplateVariable[];
  /** 模板元数据 */
  metadata: Record<string, any>;
  /** 是否启用 */
  enabled: boolean;
}

// 模板变量定义
export interface ITemplateVariable {
  /** 变量名 */
  name: string;
  /** 变量类型 */
  type: 'string' | 'number' | 'boolean' | 'date' | 'array' | 'object';
  /** 是否必需 */
  required: boolean;
  /** 默认值 */
  defaultValue?: any;
  /** 变量描述 */
  description?: string;
  /** 验证规则 */
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    enum?: any[];
  };
}

// 模板上下文
export interface ITemplateContext {
  /** 模板引擎 */
  engine: ITemplateEngine;
  /** 注册的函数 */
  functions: Map<string, ITemplateFunction>;
  /** 注册的过滤器 */
  filters: Map<string, ITemplateFilter>;
  /** 引擎配置 */
  config: ITemplateConfig;
  /** 语言环境 */
  locale: string;
  /** 时区 */
  timezone: string;
  /** 时间戳 */
  timestamp: Date;
  /** 用户数据 */
  user?: any;
  /** 附加上下文 */
  [key: string]: any;
}

// 模板引擎接口
export interface ITemplateEngine {
  /** 引擎名称 */
  readonly name: string;
  /** 引擎版本 */
  readonly version: string;

  /**
   * 注册模板
   */
  registerTemplate(template: ITemplate): Promise<void>;

  /**
   * 注销模板
   */
  unregisterTemplate(templateId: string): Promise<void>;

  /**
   * 获取模板
   */
  getTemplate(templateId: string): ITemplate | undefined;

  /**
   * 按名称获取模板
   */
  getTemplateByName(name: string): ITemplate | undefined;

  /**
   * 获取所有模板
   */
  getTemplates(): ITemplate[];

  /**
   * 按类型获取模板
   */
  getTemplatesByType(type: TemplateType): ITemplate[];

  /**
   * 注册渲染器
   */
  registerRenderer(type: TemplateType, renderer: ITemplateRenderer): void;

  /**
   * 注销渲染器
   */
  unregisterRenderer(type: TemplateType): void;

  /**
   * 注册函数
   */
  registerFunction(name: string, func: ITemplateFunction): void;

  /**
   * 注销函数
   */
  unregisterFunction(name: string): void;

  /**
   * 注册过滤器
   */
  registerFilter(name: string, filter: ITemplateFilter): void;

  /**
   * 注销过滤器
   */
  unregisterFilter(name: string): void;

  /**
   * 渲染模板
   */
  render(templateId: string, data: any, context?: Partial<ITemplateContext>): Promise<ArrayBuffer>;

  /**
   * 批量渲染模板
   */
  renderBatch(requests: Array<{
    templateId: string;
    data: any;
    context?: Partial<ITemplateContext>;
  }>): Promise<ArrayBuffer[]>;

  /**
   * 验证模板
   */
  validateTemplate(templateId: string): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  }>;

  /**
   * 预编译模板
   */
  precompileAll(): Promise<void>;

  /**
   * 清空缓存
   */
  clearCache(templateId?: string): void;

  /**
   * 获取统计信息
   */
  getStats(): {
    templates: number;
    renderers: number;
    functions: number;
    filters: number;
    cacheStats: {
      size: number;
      hits: number;
      misses: number;
      hitRate: number;
    };
    config: ITemplateConfig;
  };

  /**
   * 更新配置
   */
  updateConfig(config: Partial<ITemplateConfig>): void;

  /**
   * 销毁引擎
   */
  dispose(): Promise<void>;
}

// 模板渲染器接口
export interface ITemplateRenderer {
  /** 渲染器名称 */
  readonly name: string;
  /** 支持的模板类型 */
  readonly supportedTypes: TemplateType[];

  /**
   * 渲染模板
   */
  render(template: ITemplate, data: any, context: ITemplateContext): Promise<ArrayBuffer>;

  /**
   * 验证模板
   */
  validate(template: ITemplate): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  }>;

  /**
   * 预编译模板
   */
  precompile?(template: ITemplate): Promise<void>;

  /**
   * 获取渲染器信息
   */
  getInfo(): {
    name: string;
    supportedTypes: TemplateType[];
    features: string[];
  };
}

// 模板函数接口
export interface ITemplateFunction {
  /** 函数名称 */
  readonly name: string;
  /** 函数描述 */
  readonly description: string;
  /** 是否异步 */
  readonly async: boolean;

  /**
   * 执行函数
   */
  execute(...args: any[]): any;

  /**
   * 验证参数
   */
  validate?(args: any[]): {
    valid: boolean;
    errors: string[];
  };
}

// 模板过滤器接口
export interface ITemplateFilter {
  /** 过滤器名称 */
  readonly name: string;
  /** 过滤器描述 */
  readonly description: string;
  /** 是否异步 */
  readonly async: boolean;

  /**
   * 执行过滤器
   */
  execute(value: any, ...args: any[]): any;

  /**
   * 验证参数
   */
  validate?(value: any, args: any[]): {
    valid: boolean;
    errors: string[];
  };
}

// 模板缓存接口
export interface ITemplateCache {
  /**
   * 获取缓存
   */
  get(key: string): ArrayBuffer | undefined;

  /**
   * 设置缓存
   */
  set(key: string, data: ArrayBuffer): void;

  /**
   * 清除缓存
   */
  clear(key?: string): void;

  /**
   * 清空所有缓存
   */
  clearAll(): void;

  /**
   * 获取统计信息
   */
  getStats(): {
    size: number;
    hits: number;
    misses: number;
    hitRate: number;
  };

  /**
   * 销毁缓存
   */
  dispose(): void;
}

// 模板配置
export interface ITemplateConfig {
  /** 是否启用缓存 */
  enableCache: boolean;
  /** 缓存大小 */
  cacheSize: number;
  /** 缓存策略 */
  cacheStrategy: 'lru' | 'fifo' | 'none';
  /** 缓存超时时间（毫秒） */
  cacheTimeout: number;
  /** 是否预编译 */
  precompile: boolean;
  /** 是否启用验证 */
  enableValidation: boolean;
  /** 是否启用压缩 */
  enableCompression: boolean;
  /** 最大模板大小（字节） */
  maxTemplateSize: number;
  /** 最大渲染时间（毫秒） */
  maxRenderTime: number;
}

// 模板验证结果
export interface ITemplateValidationResult {
  /** 是否有效 */
  valid: boolean;
  /** 错误列表 */
  errors: string[];
  /** 警告列表 */
  warnings: string[];
  /** 验证时间 */
  validationTime: Date;
}

// 模板渲染结果
export interface ITemplateRenderResult {
  /** 渲染结果 */
  data: ArrayBuffer;
  /** 渲染时间 */
  renderTime: number;
  /** 是否命中缓存 */
  cacheHit: boolean;
  /** 使用的模板 */
  templateId: string;
  /** 渲染上下文 */
  context: ITemplateContext;
}

// 模板事件
export interface ITemplateEvent {
  /** 事件类型 */
  type: string;
  /** 模板ID */
  templateId?: string;
  /** 时间戳 */
  timestamp: Date;
  /** 事件数据 */
  data?: any;
}

// 模板管理器接口
export interface ITemplateManager {
  /** 管理器名称 */
  readonly name: string;

  /**
   * 创建模板
   */
  createTemplate(template: Omit<ITemplate, 'id' | 'createdAt' | 'updatedAt' | 'version'>): Promise<ITemplate>;

  /**
   * 更新模板
   */
  updateTemplate(templateId: string, updates: Partial<ITemplate>): Promise<ITemplate>;

  /**
   * 删除模板
   */
  deleteTemplate(templateId: string): Promise<void>;

  /**
   * 复制模板
   */
  copyTemplate(templateId: string, newName: string): Promise<ITemplate>;

  /**
   * 导入模板
   */
  importTemplate(templateData: any): Promise<ITemplate>;

  /**
   * 导出模板
   */
  exportTemplate(templateId: string): Promise<any>;

  /**
   * 获取模板列表
   */
  listTemplates(filter?: {
    type?: TemplateType;
    tags?: string[];
    enabled?: boolean;
  }): Promise<ITemplate[]>;

  /**
   * 搜索模板
   */
  searchTemplates(query: string): Promise<ITemplate[]>;

  /**
   * 获取模板使用统计
   */
  getUsageStats(templateId: string): Promise<{
    renderCount: number;
    lastUsed?: Date;
    averageRenderTime: number;
    errorCount: number;
  }>;

  /**
   * 批量操作
   */
  batchOperation(operations: Array<{
    type: 'create' | 'update' | 'delete';
    template?: Omit<ITemplate, 'id' | 'createdAt' | 'updatedAt' | 'version'>;
    templateId?: string;
    updates?: Partial<ITemplate>;
  }>): Promise<{
    success: string[];
    failed: Array<{ operation: any; error: any }>;
  }>;
}

// 模板变量值
export interface ITemplateVariableValue {
  /** 变量名 */
  name: string;
  /** 变量值 */
  value: any;
  /** 是否已设置 */
  isSet: boolean;
  /** 是否符合验证规则 */
  isValid: boolean;
  /** 验证错误 */
  validationErrors: string[];
}

// 模板数据解析器接口
export interface ITemplateDataParser {
  /** 解析器名称 */
  readonly name: string;
  /** 支持的数据格式 */
  readonly supportedFormats: string[];

  /**
   * 解析数据
   */
  parse(data: string, format: string): Promise<any>;

  /**
   * 序列化数据
   */
  serialize(data: any, format: string): Promise<string>;
}

// 模板压缩器接口
export interface ITemplateCompressor {
  /** 压缩器名称 */
  readonly name: string;

  /**
   * 压缩数据
   */
  compress(data: ArrayBuffer): Promise<ArrayBuffer>;

  /**
   * 解压数据
   */
  decompress(data: ArrayBuffer): Promise<ArrayBuffer>;
}

// 模板国际化接口
export interface ITemplateI18n {
  /**
   * 获取本地化字符串
   */
  t(key: string, params?: Record<string, any>, locale?: string): string;

  /**
   * 设置语言环境
   */
  setLocale(locale: string): void;

  /**
   * 获取当前语言环境
   */
  getLocale(): string;

  /**
   * 添加翻译资源
   */
  addResource(locale: string, namespace: string, resource: Record<string, string>): void;
}

// 模板安全接口
export interface ITemplateSecurity {
  /**
   * 验证模板安全性
   */
  validateSecurity(template: ITemplate): Promise<{
    safe: boolean;
    risks: string[];
    recommendations: string[];
  }>;

  /**
   * 沙箱执行函数
   */
  executeInSandbox(func: ITemplateFunction, args: any[], context: ITemplateContext): Promise<any>;

  /**
   * 清理数据
   */
  sanitizeData(data: any): any;
}

// 收据模板特定类型
export interface IReceiptTemplate {
  /** 商家信息 */
  merchant: {
    name: string;
    address?: string;
    phone?: string;
    logo?: string;
  };

  /** 订单信息 */
  order: {
    id: string;
    items: Array<{
      name: string;
      quantity: number;
      price: number;
      total?: number;
    }>;
    subtotal: number;
    tax?: number;
    discount?: number;
    total: number;
    currency?: string;
  };

  /** 交易信息 */
  transaction: {
    id?: string;
    time: Date;
    paymentMethod?: string;
    status?: string;
  };

  /** 客户信息 */
  customer?: {
    name?: string;
    phone?: string;
    email?: string;
  };

  /** 页脚信息 */
  footer?: {
    text?: string;
    qrCode?: string;
    barcode?: string;
  };
}

// 标签模板特定类型
export interface ILabelTemplate {
  /** 标签尺寸 */
  size: {
    width: number;
    height: number;
    unit: 'mm' | 'inch';
  };

  /** 标签内容 */
  content: {
    title?: string;
    text?: string;
    barcode?: {
      type: 'code128' | 'code39' | 'ean13' | 'qr';
      data: string;
    };
    qrCode?: {
      data: string;
      errorCorrection?: 'L' | 'M' | 'Q' | 'H';
    };
    image?: {
      url: string;
      width?: number;
      height?: number;
    };
  };

  /** 标签布局 */
  layout?: {
    orientation: 'portrait' | 'landscape';
    margins: {
      top: number;
      right: number;
      bottom: number;
      left: number;
    };
  };
}