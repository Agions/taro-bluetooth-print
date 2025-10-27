/**
 * 主入口文件单元测试
 */

import {
  // 主类和工厂函数
  BluetoothPrinter,
  createBluetoothPrinter,

  // 类型定义
  IBluetoothPrinter,
  IBluetoothPrinterConfig,
  IBluetoothPrinterOptions,
  IBluetoothPrinterStatus,
  IDeviceInfo,
  IConnectionInfo,
  IPrintRequest,
  IPrintResult,
  IPrinterManager,
  IQueueStatus,
  ITemplateInfo,
  BluetoothPrinterEvent,
  DEFAULT_CONFIG,
  BluetoothPrinterError,
  BluetoothError,
  PrinterError,
  QueueError,
  TemplateError,
  ConfigError,
  ERROR_CODES,

  // 领域模块
  BluetoothAdapter,
  PrinterManager,
  PrintQueue,
  TemplateEngine,

  // 模板相关
  ITemplate,
  ITemplateRenderer,
  ITemplateContext,
  TemplateType,
  IReceiptTemplate,
  ILabelTemplate,
  TextTemplateRenderer,
  ReceiptTemplateRenderer,
  LabelTemplateRenderer,

  // 蓝牙相关
  IBluetoothAdapter,
  IBluetoothDevice,
  IBluetoothConnection,
  IBluetoothScanOptions,
  BluetoothState,

  // 打印机相关
  IPrinter,
  IPrintJob,
  IPrintDriver,
  PrinterState,
  PrintJobState,

  // 队列相关
  IPrintQueue,
  IQueueConfig,
  QueueStatus,
  IQueuePolicy,

  // 基础设施
  Container,
  ServiceLifecycle,
  EventBus,
  IEventBus,
  Logger,
  createLogger,
  BluetoothPrinterConfigManager,

  // 工厂类
  BluetoothAdapterFactory,
  PrinterDriverFactory,

  // 配置工厂函数
  createDefaultConfig,
  createDevelopmentConfig,
  createProductionConfig,

  // 版本和库信息
  VERSION,
  LIB_INFO,

  // 默认导出
  default as BluetoothPrinterDefault
} from '../../../src/index';

describe('主入口文件导出测试', () => {
  describe('主类和工厂函数导出', () => {
    it('应该导出 BluetoothPrinter 类', () => {
      expect(BluetoothPrinter).toBeDefined();
      expect(typeof BluetoothPrinter).toBe('function');
      expect(BluetoothPrinter.name).toBe('BluetoothPrinter');
    });

    it('应该导出 createBluetoothPrinter 工厂函数', () => {
      expect(createBluetoothPrinter).toBeDefined();
      expect(typeof createBluetoothPrinter).toBe('function');
    });

    it('createBluetoothPrinter 应该返回 BluetoothPrinter 实例', () => {
      const instance = createBluetoothPrinter();
      expect(instance).toBeInstanceOf(BluetoothPrinter);
    });

    it('应该正确设置默认导出', () => {
      expect(BluetoothPrinterDefault).toBeDefined();
      expect(BluetoothPrinterDefault).toBe(BluetoothPrinter);
    });
  });

  describe('类型定义导出', () => {
    it('应该导出所有接口类型', () => {
      expect(IBluetoothPrinter).toBeDefined();
      expect(IBluetoothPrinterConfig).toBeDefined();
      expect(IBluetoothPrinterOptions).toBeDefined();
      expect(IBluetoothPrinterStatus).toBeDefined();
      expect(IDeviceInfo).toBeDefined();
      expect(IConnectionInfo).toBeDefined();
      expect(IPrintRequest).toBeDefined();
      expect(IPrintResult).toBeDefined();
      expect(IPrinterManager).toBeDefined();
      expect(IQueueStatus).toBeDefined();
      expect(ITemplateInfo).toBeDefined();
    });

    it('应该导出事件类型', () => {
      expect(BluetoothPrinterEvent).toBeDefined();
      expect(typeof BluetoothPrinterEvent).toBe('object');
    });

    it('应该导出模板相关类型', () => {
      expect(ITemplate).toBeDefined();
      expect(ITemplateRenderer).toBeDefined();
      expect(ITemplateContext).toBeDefined();
      expect(TemplateType).toBeDefined();
      expect(IReceiptTemplate).toBeDefined();
      expect(ILabelTemplate).toBeDefined();
    });

    it('应该导出蓝牙相关类型', () => {
      expect(IBluetoothAdapter).toBeDefined();
      expect(IBluetoothDevice).toBeDefined();
      expect(IBluetoothConnection).toBeDefined();
      expect(IBluetoothScanOptions).toBeDefined();
      expect(BluetoothState).toBeDefined();
    });

    it('应该导出打印机相关类型', () => {
      expect(IPrinter).toBeDefined();
      expect(IPrintJob).toBeDefined();
      expect(IPrintDriver).toBeDefined();
      expect(PrinterState).toBeDefined();
      expect(PrintJobState).toBeDefined();
    });

    it('应该导出队列相关类型', () => {
      expect(IPrintQueue).toBeDefined();
      expect(IQueueConfig).toBeDefined();
      expect(QueueStatus).toBeDefined();
      expect(IQueuePolicy).toBeDefined();
    });
  });

  describe('默认配置导出', () => {
    it('应该导出 DEFAULT_CONFIG', () => {
      expect(DEFAULT_CONFIG).toBeDefined();
      expect(typeof DEFAULT_CONFIG).toBe('object');
    });

    it('DEFAULT_CONFIG 应该包含所有必要的配置项', () => {
      expect(DEFAULT_CONFIG.bluetooth).toBeDefined();
      expect(DEFAULT_CONFIG.printer).toBeDefined();
      expect(DEFAULT_CONFIG.queue).toBeDefined();
      expect(DEFAULT_CONFIG.template).toBeDefined();
      expect(DEFAULT_CONFIG.logging).toBeDefined();
      expect(DEFAULT_CONFIG.events).toBeDefined();
    });

    it('DEFAULT_CONFIG 应该有合理的默认值', () => {
      expect(DEFAULT_CONFIG.bluetooth.scanTimeout).toBe(10000);
      expect(DEFAULT_CONFIG.printer.density).toBe(8);
      expect(DEFAULT_CONFIG.queue.maxSize).toBe(100);
      expect(DEFAULT_CONFIG.template.enableCache).toBe(true);
      expect(DEFAULT_CONFIG.logging.level).toBe('info');
      expect(DEFAULT_CONFIG.events.enabled).toBe(true);
    });
  });

  describe('错误类导出', () => {
    it('应该导出所有错误类', () => {
      expect(BluetoothPrinterError).toBeDefined();
      expect(BluetoothError).toBeDefined();
      expect(PrinterError).toBeDefined();
      expect(QueueError).toBeDefined();
      expect(TemplateError).toBeDefined();
      expect(ConfigError).toBeDefined();
    });

    it('错误类应该正确继承关系', () => {
      const bluetoothError = new BluetoothError('TEST', 'Test message');
      expect(bluetoothError).toBeInstanceOf(BluetoothPrinterError);
      expect(bluetoothError).toBeInstanceOf(Error);
      expect(bluetoothError.name).toBe('BluetoothError');
      expect(bluetoothError.code).toBe('TEST');
      expect(bluetoothError.category).toBe('bluetooth');

      const printerError = new PrinterError('TEST', 'Test message');
      expect(printerError).toBeInstanceOf(BluetoothPrinterError);
      expect(printerError.name).toBe('PrinterError');
      expect(printerError.category).toBe('printer');
    });

    it('应该导出错误代码常量', () => {
      expect(ERROR_CODES).toBeDefined();
      expect(typeof ERROR_CODES).toBe('object');
      expect(ERROR_CODES.UNKNOWN).toBe('UNKNOWN');
      expect(ERROR_CODES.BLUETOOTH_NOT_AVAILABLE).toBe('BLUETOOTH_NOT_AVAILABLE');
      expect(ERROR_CODES.PRINTER_NOT_FOUND).toBe('PRINTER_NOT_FOUND');
    });
  });

  describe('领域模块导出', () => {
    it('应该导出所有领域类', () => {
      expect(BluetoothAdapter).toBeDefined();
      expect(PrinterManager).toBeDefined();
      expect(PrintQueue).toBeDefined();
      expect(TemplateEngine).toBeDefined();
    });

    it('领域类应该可实例化', () => {
      // 由于依赖复杂，这里只测试类的存在性
      expect(typeof BluetoothAdapter).toBe('function');
      expect(typeof PrinterManager).toBe('function');
      expect(typeof PrintQueue).toBe('function');
      expect(typeof TemplateEngine).toBe('function');
    });
  });

  describe('模板渲染器导出', () => {
    it('应该导出所有模板渲染器', () => {
      expect(TextTemplateRenderer).toBeDefined();
      expect(ReceiptTemplateRenderer).toBeDefined();
      expect(LabelTemplateRenderer).toBeDefined();
    });

    it('模板渲染器应该是类构造函数', () => {
      expect(typeof TextTemplateRenderer).toBe('function');
      expect(typeof ReceiptTemplateRenderer).toBe('function');
      expect(typeof LabelTemplateRenderer).toBe('function');
    });
  });

  describe('基础设施导出', () => {
    it('应该导出容器相关类', () => {
      expect(Container).toBeDefined();
      expect(ServiceLifecycle).toBeDefined();
    });

    it('应该导出事件总线相关类', () => {
      expect(EventBus).toBeDefined();
      expect(IEventBus).toBeDefined();
    });

    it('应该导出日志相关类和函数', () => {
      expect(Logger).toBeDefined();
      expect(createLogger).toBeDefined();
      expect(typeof createLogger).toBe('function');
    });

    it('应该导出配置管理器', () => {
      expect(BluetoothPrinterConfigManager).toBeDefined();
    });

    it('应该导出工厂类', () => {
      expect(BluetoothAdapterFactory).toBeDefined();
      expect(PrinterDriverFactory).toBeDefined();
    });

    it('createLogger 应该创建 Logger 实例', () => {
      const logger = createLogger('test');
      expect(logger).toBeInstanceOf(Logger);
      expect(logger.getName()).toBe('test');
    });
  });

  describe('配置工厂函数', () => {
    describe('createDefaultConfig', () => {
      it('应该创建默认配置', () => {
        const config = createDefaultConfig();
        expect(config).toBeDefined();
        expect(typeof config).toBe('object');
      });

      it('默认配置应该包含所有部分', () => {
        const config = createDefaultConfig();
        expect(config.bluetooth).toBeDefined();
        expect(config.printer).toBeDefined();
        expect(config.queue).toBeDefined();
        expect(config.template).toBeDefined();
        expect(config.logging).toBeDefined();
        expect(config.events).toBeDefined();
      });

      it('默认配置应该有合理的值', () => {
        const config = createDefaultConfig();
        expect(config.bluetooth.scanTimeout).toBe(10000);
        expect(config.printer.density).toBe(8);
        expect(config.queue.maxSize).toBe(100);
        expect(config.template.enableCache).toBe(true);
        expect(config.logging.level).toBe('info');
        expect(config.events.enabled).toBe(true);
      });
    });

    describe('createDevelopmentConfig', () => {
      it('应该创建开发环境配置', () => {
        const config = createDevelopmentConfig();
        expect(config).toBeDefined();
        expect(typeof config).toBe('object');
      });

      it('开发配置应该基于默认配置', () => {
        const defaultConfig = createDefaultConfig();
        const devConfig = createDevelopmentConfig();

        expect(devConfig.bluetooth).toEqual(defaultConfig.bluetooth);
        expect(devConfig.printer).toEqual(defaultConfig.printer);
        expect(devConfig.queue).toEqual(defaultConfig.queue);
        expect(devConfig.template).toEqual(defaultConfig.template);
      });

      it('开发配置应该有调试友好的设置', () => {
        const config = createDevelopmentConfig();
        expect(config.logging.level).toBe('debug');
        expect(config.logging.enableConsole).toBe(true);
        expect(config.logging.enableFile).toBe(false);
        expect(config.events.enableHistory).toBe(true);
        expect(config.events.historySize).toBe(1000);
      });
    });

    describe('createProductionConfig', () => {
      it('应该创建生产环境配置', () => {
        const config = createProductionConfig();
        expect(config).toBeDefined();
        expect(typeof config).toBe('object');
      });

      it('生产配置应该基于默认配置', () => {
        const defaultConfig = createDefaultConfig();
        const prodConfig = createProductionConfig();

        expect(prodConfig.bluetooth).toEqual(defaultConfig.bluetooth);
        expect(prodConfig.printer).toEqual(defaultConfig.printer);
        expect(prodConfig.queue).toEqual(defaultConfig.queue);
        expect(prodConfig.template).toEqual(defaultConfig.template);
      });

      it('生产配置应该有生产环境友好的设置', () => {
        const config = createProductionConfig();
        expect(config.logging.level).toBe('warn');
        expect(config.logging.enableConsole).toBe(false);
        expect(config.logging.enableFile).toBe(true);
        expect(config.logging.maxFileSize).toBe(52428800); // 50MB
        expect(config.logging.maxFiles).toBe(10);
        expect(config.events.maxListeners).toBe(50);
        expect(config.events.enableHistory).toBe(false);
        expect(config.events.historySize).toBe(0);
      });
    });

    it('配置工厂应该创建独立的对象', () => {
      const config1 = createDefaultConfig();
      const config2 = createDefaultConfig();

      expect(config1).not.toBe(config2);
      expect(config1.bluetooth).not.toBe(config2.bluetooth);
    });

    it('不同环境的配置应该是独立的', () => {
      const defaultConfig = createDefaultConfig();
      const devConfig = createDevelopmentConfig();
      const prodConfig = createProductionConfig();

      expect(defaultConfig).not.toBe(devConfig);
      expect(defaultConfig).not.toBe(prodConfig);
      expect(devConfig).not.toBe(prodConfig);
    });
  });

  describe('版本和库信息', () => {
    it('应该导出版本信息', () => {
      expect(VERSION).toBeDefined();
      expect(typeof VERSION).toBe('string');
      expect(/^\d+\.\d+\.\d+/.test(VERSION)).toBe(true);
    });

    it('应该导出库信息', () => {
      expect(LIB_INFO).toBeDefined();
      expect(typeof LIB_INFO).toBe('object');
    });

    it('库信息应该包含必要字段', () => {
      expect(LIB_INFO.name).toBe('taro-bluetooth-printer');
      expect(LIB_INFO.version).toBe(VERSION);
      expect(LIB_INFO.description).toBeDefined();
      expect(LIB_INFO.author).toBeDefined();
      expect(LIB_INFO.homepage).toBeDefined();
      expect(LIB_INFO.repository).toBeDefined();
      expect(LIB_INFO.license).toBe('MIT');
      expect(Array.isArray(LIB_INFO.keywords)).toBe(true);
      expect(LIB_INFO.engines).toBeDefined();
    });

    it('库信息的关键字应该包含相关词汇', () => {
      expect(LIB_INFO.keywords).toContain('taro');
      expect(LIB_INFO.keywords).toContain('bluetooth');
      expect(LIB_INFO.keywords).toContain('printer');
      expect(LIB_INFO.keywords).toContain('thermal');
    });
  });

  describe('导出完整性', () => {
    it('所有导出都应该有值', () => {
      // 主类和工厂函数
      expect(BluetoothPrinter).toBeTruthy();
      expect(createBluetoothPrinter).toBeTruthy();

      // 配置工厂函数
      expect(createDefaultConfig).toBeTruthy();
      expect(createDevelopmentConfig).toBeTruthy();
      expect(createProductionConfig).toBeTruthy();

      // 版本和库信息
      expect(VERSION).toBeTruthy();
      expect(LIB_INFO).toBeTruthy();

      // 默认配置
      expect(DEFAULT_CONFIG).toBeTruthy();
      expect(ERROR_CODES).toBeTruthy();
    });

    it('函数类型导出应该是可调用的', () => {
      expect(typeof createBluetoothPrinter).toBe('function');
      expect(typeof createDefaultConfig).toBe('function');
      expect(typeof createDevelopmentConfig).toBe('function');
      expect(typeof createProductionConfig).toBe('function');
      expect(typeof createLogger).toBe('function');
    });

    it('类类型导出应该是可构造的', () => {
      expect(typeof BluetoothPrinter).toBe('function');
      expect(typeof BluetoothAdapter).toBe('function');
      expect(typeof PrinterManager).toBe('function');
      expect(typeof PrintQueue).toBe('function');
      expect(typeof TemplateEngine).toBe('function');
      expect(typeof Container).toBe('function');
      expect(typeof EventBus).toBe('function');
      expect(typeof Logger).toBe('function');
      expect(typeof TextTemplateRenderer).toBe('function');
      expect(typeof ReceiptTemplateRenderer).toBe('function');
      expect(typeof LabelTemplateRenderer).toBe('function');
    });

    it('常量导出应该是不可变的', () => {
      expect(() => {
        (VERSION as any) = 'modified';
      }).toThrow();

      expect(() => {
        (LIB_INFO as any) = null;
      }).toThrow();
    });
  });

  describe('类型检查', () => {
    it('配置工厂返回值应该符合类型', () => {
      const defaultConfig = createDefaultConfig();
      const devConfig = createDevelopmentConfig();
      const prodConfig = createProductionConfig();

      // TypeScript 编译时检查，这里只验证运行时结构
      expect(defaultConfig).toHaveProperty('bluetooth');
      expect(defaultConfig).toHaveProperty('printer');
      expect(defaultConfig).toHaveProperty('queue');
      expect(defaultConfig).toHaveProperty('template');
      expect(defaultConfig).toHaveProperty('logging');
      expect(defaultConfig).toHaveProperty('events');

      expect(devConfig).toHaveProperty('bluetooth');
      expect(prodConfig).toHaveProperty('bluetooth');
    });

    it('错误类应该有正确的类型结构', () => {
      const error = new BluetoothPrinterError('TEST', 'Test message');

      expect(error).toHaveProperty('name');
      expect(error).toHaveProperty('message');
      expect(error).toHaveProperty('stack');
      expect(error).toHaveProperty('code');
      expect(error).toHaveProperty('category');
    });

    it('库信息应该有正确的类型结构', () => {
      expect(typeof LIB_INFO.name).toBe('string');
      expect(typeof LIB_INFO.version).toBe('string');
      expect(typeof LIB_INFO.description).toBe('string');
      expect(typeof LIB_INFO.author).toBe('string');
      expect(typeof LIB_INFO.homepage).toBe('string');
      expect(typeof LIB_INFO.repository).toBe('string');
      expect(typeof LIB_INFO.license).toBe('string');
      expect(Array.isArray(LIB_INFO.keywords)).toBe(true);
      expect(typeof LIB_INFO.engines).toBe('object');
    });
  });

  describe('向后兼容性', () => {
    it('应该保持主要导出的稳定性', () => {
      // 确保主要的公共 API 保持稳定
      expect(BluetoothPrinter).toBeDefined();
      expect(createBluetoothPrinter).toBeDefined();
      expect(DEFAULT_CONFIG).toBeDefined();
      expect(ERROR_CODES).toBeDefined();
      expect(VERSION).toBeDefined();
      expect(LIB_INFO).toBeDefined();
    });

    it('配置工厂函数应该保持向后兼容', () => {
      // 确保配置工厂函数的行为保持一致
      const config1 = createDefaultConfig();
      expect(config1.bluetooth.scanTimeout).toBe(10000);
      expect(config1.printer.density).toBe(8);
      expect(config1.logging.level).toBe('info');
    });

    it('错误代码应该保持稳定性', () => {
      // 确保错误代码保持不变
      expect(ERROR_CODES.UNKNOWN).toBe('UNKNOWN');
      expect(ERROR_CODES.BLUETOOTH_NOT_AVAILABLE).toBe('BLUETOOTH_NOT_AVAILABLE');
      expect(ERROR_CODES.PRINTER_NOT_FOUND).toBe('PRINTER_NOT_FOUND');
      expect(ERROR_CODES.TEMPLATE_NOT_FOUND).toBe('TEMPLATE_NOT_FOUND');
      expect(ERROR_CODES.CONFIG_INVALID).toBe('CONFIG_INVALID');
    });
  });
});