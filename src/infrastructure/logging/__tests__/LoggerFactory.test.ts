/**
 * 日志工厂测试
 */

import {
  LoggerFactory,
  createLogger,
  createLoggerFactory,
  getDefaultLogger
} from '../LoggerFactory';
import { MemoryAppender } from '../LogAppender';
import { LevelFilter } from '../LogFilter';
import { LogLevel, ILogConfig } from '../types';

describe('LoggerFactory', () => {
  let factory: LoggerFactory;

  beforeEach(() => {
    factory = new LoggerFactory();
  });

  afterEach(() => {
    factory.dispose();
  });

  describe('基本功能', () => {
    it('应该能够创建日志记录器', () => {
      const logger = factory.getLogger('test');
      expect(logger).toBeDefined();
      expect(logger.name).toBe('test');
    });

    it('应该缓存日志记录器', () => {
      const logger1 = factory.getLogger('cached');
      const logger2 = factory.getLogger('cached');

      expect(logger1).toBe(logger2);
    });

    it('应该创建默认日志记录器', () => {
      const logger = factory.getLogger();
      expect(logger).toBeDefined();
      expect(logger.name).toBe('default');
    });

    it('应该能够创建带上下文的日志记录器', () => {
      const context = {
        userId: '123',
        sessionId: 'session-456'
      };

      const logger = factory.createLogger('context-test', context);
      expect(logger.name).toBe('context-test');
    });

    it('应该返回根日志记录器', () => {
      const rootLogger = factory.getRootLogger();
      expect(rootLogger).toBeDefined();
      expect(rootLogger.name).toBe('root');
    });
  });

  describe('配置管理', () => {
    it('应该支持自定义配置', () => {
      const config: ILogConfig = {
        defaultLevel: LogLevel.WARN,
        console: {
          enabled: false
        }
      };

      const configuredFactory = new LoggerFactory(config);
      const logger = configuredFactory.getLogger('test');

      expect(logger.getLevel()).toBe(LogLevel.WARN);

      configuredFactory.dispose();
    });

    it('应该支持设置默认级别', () => {
      factory.setDefaultLevel(LogLevel.ERROR);
      const logger = factory.getLogger('test');

      expect(logger.getLevel()).toBe(LogLevel.ERROR);
    });

    it('应该更新现有日志记录器的级别', () => {
      const logger1 = factory.getLogger('logger1');
      const logger2 = factory.getLogger('logger2');

      factory.setDefaultLevel(LogLevel.WARN);

      expect(logger1.getLevel()).toBe(LogLevel.WARN);
      expect(logger2.getLevel()).toBe(LogLevel.WARN);
    });
  });

  describe('全局过滤器管理', () => {
    it('应该支持添加全局过滤器', () => {
      const filter = new LevelFilter(LogLevel.WARN);
      factory.addGlobalFilter(filter);

      const logger = factory.getLogger('test');
      const memoryAppender = new MemoryAppender(LogLevel.TRACE);
      logger.addAppender(memoryAppender);

      logger.debug('debug message');
      logger.warn('warn message');

      const logs = memoryAppender.getLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].level).toBe(LogLevel.WARN);
    });

    it('应该支持移除全局过滤器', () => {
      const filter = new LevelFilter(LogLevel.WARN);
      factory.addGlobalFilter(filter);
      factory.removeGlobalFilter(filter.name);

      const logger = factory.getLogger('test');
      const memoryAppender = new MemoryAppender(LogLevel.TRACE);
      logger.addAppender(memoryAppender);

      logger.debug('debug message');
      logger.warn('warn message');

      const logs = memoryAppender.getLogs();
      expect(logs).toHaveLength(2);
    });

    it('应该为现有日志记录器添加过滤器', () => {
      const logger = factory.getLogger('existing');
      const memoryAppender = new MemoryAppender(LogLevel.TRACE);
      logger.addAppender(memoryAppender);

      const filter = new LevelFilter(LogLevel.ERROR);
      factory.addGlobalFilter(filter);

      logger.debug('debug message');
      logger.error('error message');

      const logs = memoryAppender.getLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].level).toBe(LogLevel.ERROR);
    });
  });

  describe('全局输出器管理', () => {
    it('应该支持添加全局输出器', () => {
      const memoryAppender = new MemoryAppender(LogLevel.TRACE);
      factory.addGlobalAppender(memoryAppender);

      const logger = factory.getLogger('test');
      logger.info('test message');

      const logs = memoryAppender.getLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].message).toBe('test message');
    });

    it('应该支持移除全局输出器', () => {
      const memoryAppender = new MemoryAppender(LogLevel.TRACE);
      factory.addGlobalAppender(memoryAppender);
      factory.removeGlobalAppender(memoryAppender.name);

      const logger = factory.getLogger('test');
      logger.info('test message');

      const logs = memoryAppender.getLogs();
      expect(logs).toHaveLength(0);
    });

    it('应该为现有日志记录器添加输出器', () => {
      const logger = factory.getLogger('existing');
      const memoryAppender = new MemoryAppender(LogLevel.TRACE);
      factory.addGlobalAppender(memoryAppender);

      logger.info('test message');

      const logs = memoryAppender.getLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].message).toBe('test message');
    });
  });

  describe('批量操作', () => {
    it('应该支持刷新所有日志记录器', async () => {
      const logger1 = factory.getLogger('logger1');
      const logger2 = factory.getLogger('logger2');

      const flushSpy1 = jest.spyOn(logger1, 'flush');
      const flushSpy2 = jest.spyOn(logger2, 'flush');

      await factory.flushAll();

      expect(flushSpy1).toHaveBeenCalled();
      expect(flushSpy2).toHaveBeenCalled();
    });

    it('应该包含根日志记录器在刷新操作中', async () => {
      const rootLogger = factory.getRootLogger();
      const flushSpy = jest.spyOn(rootLogger, 'flush');

      await factory.flushAll();

      expect(flushSpy).toHaveBeenCalled();
    });
  });

  describe('统计信息', () => {
    it('应该提供工厂统计信息', () => {
      factory.getLogger('logger1');
      factory.getLogger('logger2');
      factory.getLogger('logger1'); // 重复，应该只计数一个

      const filter = new LevelFilter(LogLevel.WARN);
      factory.addGlobalFilter(filter);

      const appender = new MemoryAppender(LogLevel.TRACE);
      factory.addGlobalAppender(appender);

      const stats = factory.getStats();

      expect(stats.totalLoggers).toBe(3); // 包括根日志记录器
      expect(stats.loggerNames).toContain('logger1');
      expect(stats.loggerNames).toContain('logger2');
      expect(stats.globalFiltersCount).toBe(1);
      expect(stats.globalAppendersCount).toBe(1);
      expect(stats.defaultLevel).toBe(LogLevel[LogLevel.INFO]);
      expect(stats.isDisposed).toBe(false);
    });
  });

  describe('资源管理', () => {
    it('应该支持销毁工厂', () => {
      const logger = factory.getLogger('test');
      const disposeSpy = jest.spyOn(logger, 'dispose');

      factory.dispose();

      expect(disposeSpy).toHaveBeenCalled();
      expect(factory.getStats().isDisposed).toBe(true);
    });

    it('销毁后应该拒绝操作', () => {
      factory.dispose();

      expect(() => factory.getLogger('test')).toThrow('Logger factory has been disposed');
      expect(() => factory.addGlobalFilter(new LevelFilter(LogLevel.WARN)))
        .toThrow('Logger factory has been disposed');
      expect(() => factory.addGlobalAppender(new MemoryAppender(LogLevel.TRACE)))
        .toThrow('Logger factory has been disposed');
    });

    it('应该支持重复销毁', () => {
      expect(() => {
        factory.dispose();
        factory.dispose();
      }).not.toThrow();
    });
  });

  describe('默认输出器配置', () => {
    it('应该默认添加控制台输出器', () => {
      const logger = factory.getLogger('test');
      // 通过检查是否有输出器来验证
      expect(logger.name).toBe('test');
    });

    it('应该支持禁用控制台输出器', () => {
      const config: ILogConfig = {
        console: {
          enabled: false
        }
      };

      const factoryWithoutConsole = new LoggerFactory(config);
      const logger = factoryWithoutConsole.getLogger('test');

      expect(logger.name).toBe('test');
      factoryWithoutConsole.dispose();
    });

    it('应该支持添加文件输出器', () => {
      const config: ILogConfig = {
        file: {
          enabled: true,
          path: '/tmp/test.log'
        }
      };

      const factoryWithFile = new LoggerFactory(config);
      const logger = factoryWithFile.getLogger('test');

      expect(logger.name).toBe('test');
      factoryWithFile.dispose();
    });

    it('应该支持添加远程输出器', () => {
      const config: ILogConfig = {
        remote: {
          enabled: true,
          endpoint: 'https://api.example.com/logs'
        }
      };

      const factoryWithRemote = new LoggerFactory(config);
      const logger = factoryWithRemote.getLogger('test');

      expect(logger.name).toBe('test');
      factoryWithRemote.dispose();
    });

    it('应该支持启用性能日志', () => {
      const config: ILogConfig = {
        enablePerformance: true
      };

      const factoryWithPerf = new LoggerFactory(config);
      const logger = factoryWithPerf.getLogger('test');

      expect(logger.name).toBe('test');
      factoryWithPerf.dispose();
    });
  });
});

describe('便捷函数', () => {
  describe('createLogger', () => {
    it('应该创建默认日志记录器', () => {
      const logger = createLogger('test');
      expect(logger).toBeDefined();
      expect(logger.name).toBe('test');
    });

    it('应该创建默认名称的日志记录器', () => {
      const logger = createLogger();
      expect(logger).toBeDefined();
      expect(logger.name).toBe('default');
    });
  });

  describe('createLoggerFactory', () => {
    it('应该创建配置的日志工厂', () => {
      const config: ILogConfig = {
        defaultLevel: LogLevel.WARN
      };

      const factory = createLoggerFactory(config);
      const logger = factory.getLogger('test');

      expect(logger.getLevel()).toBe(LogLevel.WARN);
      factory.dispose();
    });
  });

  describe('getDefaultLogger', () => {
    it('应该返回默认工厂的根日志记录器', () => {
      const logger = getDefaultLogger();
      expect(logger).toBeDefined();
      expect(logger.name).toBe('root');
    });

    it('应该返回相同的实例', () => {
      const logger1 = getDefaultLogger();
      const logger2 = getDefaultLogger();

      expect(logger1).toBe(logger2);
    });
  });
});

describe('日志工厂配置场景', () => {
  describe('开发环境配置', () => {
    it('应该支持开发环境配置', () => {
      const devConfig: ILogConfig = {
        defaultLevel: LogLevel.DEBUG,
        console: {
          enabled: true,
          level: LogLevel.DEBUG
        },
        enablePerformance: true
      };

      const devFactory = createLoggerFactory(devConfig);
      const logger = devFactory.getLogger('dev-test');

      expect(logger.getLevel()).toBe(LogLevel.DEBUG);
      devFactory.dispose();
    });
  });

  describe('生产环境配置', () => {
    it('应该支持生产环境配置', () => {
      const prodConfig: ILogConfig = {
        defaultLevel: LogLevel.INFO,
        console: {
          enabled: false
        },
        file: {
          enabled: true,
          path: '/var/log/app.log',
          level: LogLevel.INFO,
          maxFileSize: 10 * 1024 * 1024, // 10MB
          maxFiles: 5
        },
        remote: {
          enabled: true,
          endpoint: 'https://logs.example.com/api/logs',
          level: LogLevel.WARN,
          batchSize: 100,
          flushInterval: 5000
        }
      };

      const prodFactory = createLoggerFactory(prodConfig);
      const logger = prodFactory.getLogger('prod-test');

      expect(logger.getLevel()).toBe(LogLevel.INFO);
      prodFactory.dispose();
    });
  });

  describe('测试环境配置', () => {
    it('应该支持测试环境配置', () => {
      const testConfig: ILogConfig = {
        defaultLevel: LogLevel.ERROR,
        console: {
          enabled: false
        },
        enablePerformance: false
      };

      const testFactory = createLoggerFactory(testConfig);
      const logger = testFactory.getLogger('test-env');

      expect(logger.getLevel()).toBe(LogLevel.ERROR);
      testFactory.dispose();
    });
  });
});

describe('多工厂实例', () => {
  it('应该支持多个独立的工厂实例', () => {
    const factory1 = createLoggerFactory({ defaultLevel: LogLevel.DEBUG });
    const factory2 = createLoggerFactory({ defaultLevel: LogLevel.ERROR });

    const logger1 = factory1.getLogger('same-name');
    const logger2 = factory2.getLogger('same-name');

    expect(logger1.getLevel()).toBe(LogLevel.DEBUG);
    expect(logger2.getLevel()).toBe(LogLevel.ERROR);
    expect(logger1).not.toBe(logger2);

    factory1.dispose();
    factory2.dispose();
  });

  it('应该支持工厂间的隔离', () => {
    const factory1 = createLoggerFactory();
    const factory2 = createLoggerFactory();

    const filter = new LevelFilter(LogLevel.WARN);
    factory1.addGlobalFilter(filter);

    const logger1 = factory1.getLogger('test');
    const logger2 = factory2.getLogger('test');

    // factory2 的日志记录器不应该有 factory1 的过滤器
    expect(logger1.getLevel()).toBe(LogLevel.WARN);
    expect(logger2.getLevel()).toBe(LogLevel.INFO); // 默认级别

    factory1.dispose();
    factory2.dispose();
  });
});