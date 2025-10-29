/**
 * Taro 蓝牙打印库主入口文件
 * 导出所有公共API和类型
 */

// 主类和工厂函数 - 使用简化版以确保构建成功
export { BluetoothPrinterSimple as BluetoothPrinter, createBluetoothPrinterSimple as createBluetoothPrinter } from './BluetoothPrinterSimple';

// 类型定义
export {
  // 主接口
  IBluetoothPrinter,
  IBluetoothPrinterConfig,
  IBluetoothPrinterOptions,
  IBluetoothPrinterStatus,

  // 设备和连接
  IDeviceInfo,
  IConnectionInfo,

  // 打印相关
  IPrintRequest,
  IPrintResult,
  IPrinterManager,

  // 队列和模板
  IQueueStatus,
  ITemplateInfo,

  // 事件
  BluetoothPrinterEvent,

  // 默认配置
  DEFAULT_CONFIG,

  // 错误类
  BluetoothPrinterError,
  BluetoothError,
  PrinterError,
  QueueError,
  TemplateError,
  ConfigError,

  // 错误代码
  ERROR_CODES
} from './types';

// 领域模块导出（高级用户可能需要直接访问）
export { BluetoothAdapter } from './domain/bluetooth/BluetoothAdapter';
export { PrinterManager } from './domain/printer/PrinterManager';
export { PrintQueue } from './domain/queue/PrintQueue';
export { TemplateEngine } from './domain/template/TemplateEngine';

// 模板相关导出
export {
  ITemplate,
  ITemplateRenderer,
  ITemplateContext,
  TemplateType,
  IReceiptTemplate,
  ILabelTemplate
} from './domain/template/types';

export { TextTemplateRenderer } from './domain/template/renderers/TextTemplateRenderer';
export { ReceiptTemplateRenderer } from './domain/template/renderers/ReceiptTemplateRenderer';
export { LabelTemplateRenderer } from './domain/template/renderers/LabelTemplateRenderer';

// 蓝牙相关导出
export {
  IBluetoothAdapter,
  IBluetoothDevice,
  IBluetoothConnection,
  IBluetoothScanOptions,
  BluetoothState
} from './domain/bluetooth/types';

// 打印机相关导出
export {
  IPrinter,
  IPrintJob,
  IPrintDriver,
  PrinterState,
  PrintJobState
} from './domain/printer/types';

// 队列相关导出
export {
  IPrintQueue,
  IQueueConfig,
  QueueStatus,
  IQueuePolicy
} from './domain/queue/types';

// 基础设施导出（高级用户和扩展开发者）
export { Container, ServiceLifecycle } from './infrastructure/di';
export { EventBus, IEventBus } from './infrastructure/events';
export { Logger, createLogger } from './infrastructure/logging';
export { BluetoothPrinterConfigManager } from './infrastructure/config/BluetoothPrinterConfigManager';

// 工厂类导出
export { BluetoothAdapterFactory } from './infrastructure/bluetooth/BluetoothAdapterFactory';
export { PrinterDriverFactory } from './infrastructure/printer/PrinterDriverFactory';

// 便捷导出 - 创建常用配置
export const createDefaultConfig = (): Partial<IBluetoothPrinterConfig> => ({
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
    cacheTimeout: 300000,
    enableValidation: true
  },
  logging: {
    level: 'info',
    enableConsole: true,
    enableFile: false,
    maxFileSize: 10485760,
    maxFiles: 5
  },
  events: {
    enabled: true,
    maxListeners: 100,
    enableHistory: false,
    historySize: 1000
  }
});

// 创建开发环境配置
export const createDevelopmentConfig = (): Partial<IBluetoothPrinterConfig> => ({
  ...createDefaultConfig(),
  logging: {
    level: 'debug',
    enableConsole: true,
    enableFile: false,
    maxFileSize: 10485760,
    maxFiles: 5
  },
  events: {
    enabled: true,
    maxListeners: 100,
    enableHistory: true,
    historySize: 1000
  }
});

// 创建生产环境配置
export const createProductionConfig = (): Partial<IBluetoothPrinterConfig> => ({
  ...createDefaultConfig(),
  logging: {
    level: 'warn',
    enableConsole: false,
    enableFile: true,
    maxFileSize: 52428800, // 50MB
    maxFiles: 10
  },
  events: {
    enabled: true,
    maxListeners: 50,
    enableHistory: false,
    historySize: 0
  }
});

// 版本信息
export const VERSION = '2.0.0';

// 库信息
export const LIB_INFO = {
  name: 'taro-bluetooth-printer',
  version: VERSION,
  description: 'Taro蓝牙打印库 - 支持多种打印机和模板',
  author: 'Taro Bluetooth Printer Team',
  homepage: 'https://github.com/example/taro-bluetooth-printer',
  repository: 'https://github.com/example/taro-bluetooth-printer.git',
  license: 'MIT',
  keywords: ['taro', 'bluetooth', 'printer', 'thermal', 'receipt', 'label'],
  engines: {
    node: '>=14.0.0'
  },
  dependencies: {
    // 核心依赖将在package.json中定义
  }
};

// 默认导出主类
export { BluetoothPrinterSimple as default } from './BluetoothPrinterSimple';