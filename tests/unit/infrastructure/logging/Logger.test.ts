/**
 * 日志系统单元测试
 */

import { Logger, createLogger } from '../../../../src/infrastructure/logging';
import { ILogger, LogLevel } from '../../../../src/infrastructure/logging/types';

describe('Logger', () => {
  let logger: ILogger;

  beforeEach(() => {
    logger = new Logger('TestLogger');
  });

  afterEach(() => {
    logger.dispose();
  });

  describe('基础功能', () => {
    it('应该正确创建Logger实例', () => {
      expect(logger).toBeInstanceOf(Logger);
      expect(logger.getName()).toBe('TestLogger');
      expect(logger.getLevel()).toBe('info');
    });

    it('应该能够设置和获取日志级别', () => {
      logger.setLevel('debug');
      expect(logger.getLevel()).toBe('debug');

      logger.setLevel('warn');
      expect(logger.getLevel()).toBe('warn');

      logger.setLevel('error');
      expect(logger.getLevel()).toBe('error');
    });

    it('应该能够设置和获取Logger名称', () => {
      logger.setName('NewLogger');
      expect(logger.getName()).toBe('NewLogger');
    });

    it('应该能够记录不同级别的日志', () => {
      const mockLogger = logger as any;
      const initialLogCount = mockLogger.getLogs().length;

      logger.debug('Debug message');
      logger.info('Info message');
      logger.warn('Warn message');
      logger.error('Error message');

      const logs = mockLogger.getLogs();
      expect(logs.length).toBe(initialLogCount + 4);
      expect(logs[initialLogCount].level).toBe('debug');
      expect(logs[initialLogCount].message).toBe('Debug message');
      expect(logs[initialLogCount + 1].level).toBe('info');
      expect(logs[initialLogCount + 2].level).toBe('warn');
      expect(logs[initialLogCount + 3].level).toBe('error');
    });

    it('应该能够记录带元数据的日志', () => {
      const mockLogger = logger as any;
      const metaData = { userId: 123, action: 'test' };

      logger.info('User action', metaData);

      const logs = mockLogger.getLogs();
      const lastLog = logs[logs.length - 1];
      expect(lastLog.meta).toEqual(metaData);
      expect(lastLog.message).toBe('User action');
    });

    it('应该能够记录带错误的日志', () => {
      const mockLogger = logger as any;
      const error = new Error('Test error');
      const metaData = { context: 'test' };

      logger.error('Error occurred', error, metaData);

      const logs = mockLogger.getLogs();
      const lastLog = logs[logs.length - 1];
      expect(lastLog.level).toBe('error');
      expect(lastLog.message).toBe('Error occurred');
      expect(lastLog.meta?.error).toBe(error);
      expect(lastLog.meta?.context).toBe('test');
    });
  });

  describe('日志级别过滤', () => {
    beforeEach(() => {
      // 清空之前的日志
      (logger as any).clearLogs();
    });

    it('应该根据级别过滤日志', () => {
      logger.setLevel('warn');

      logger.debug('Debug message'); // 不应该记录
      logger.info('Info message');   // 不应该记录
      logger.warn('Warn message');   // 应该记录
      logger.error('Error message'); // 应该记录

      const logs = (logger as any).getLogs();
      expect(logs.length).toBe(2);
      expect(logs[0].level).toBe('warn');
      expect(logs[1].level).toBe('error');
    });

    it('应该支持error级别（只记录error）', () => {
      logger.setLevel('error');

      logger.debug('Debug message');
      logger.info('Info message');
      logger.warn('Warn message');
      logger.error('Error message');

      const logs = (logger as any).getLogs();
      expect(logs.length).toBe(1);
      expect(logs[0].level).toBe('error');
    });

    it('应该支持debug级别（记录所有级别）', () => {
      logger.setLevel('debug');

      logger.debug('Debug message');
      logger.info('Info message');
      logger.warn('Warn message');
      logger.error('Error message');

      const logs = (logger as any).getLogs();
      expect(logs.length).toBe(4);
      expect(logs.map(l => l.level)).toEqual(['debug', 'info', 'warn', 'error']);
    });
  });

  describe('日志查询', () => {
    beforeEach(() => {
      // 清空并添加测试日志
      (logger as any).clearLogs();
      logger.debug('Debug message 1');
      logger.info('Info message 1');
      logger.warn('Warn message 1');
      logger.error('Error message 1');
      logger.info('Info message 2');
    });

    it('应该能够获取所有日志', () => {
      const logs = (logger as any).getLogs();
      expect(logs.length).toBe(5);
      expect(logs[0].message).toBe('Debug message 1');
      expect(logs[4].message).toBe('Info message 2');
    });

    it('应该能够按级别获取日志', () => {
      const infoLogs = (logger as any).getLogsByLevel('info');
      expect(infoLogs.length).toBe(2);
      expect(infoLogs[0].message).toBe('Info message 1');
      expect(infoLogs[1].message).toBe('Info message 2');

      const errorLogs = (logger as any).getLogsByLevel('error');
      expect(errorLogs.length).toBe(1);
      expect(errorLogs[0].message).toBe('Error message 1');
    });

    it('应该能够清空日志', () => {
      expect((logger as any).getLogs().length).toBe(5);

      (logger as any).clearLogs();

      expect((logger as any).getLogs().length).toBe(0);
    });

    it('应该能够验证日志时间戳', () => {
      const logs = (logger as any).getLogs();
      const now = Date.now();

      logs.forEach(log => {
        expect(log.timestamp).toBeInstanceOf(Date);
        expect(log.timestamp.getTime()).toBeLessThanOrEqual(now);
        expect(log.timestamp.getTime()).toBeGreaterThan(now - 1000); // 在最近1秒内
      });
    });
  });

  describe('工厂函数', () => {
    it('createLogger应该创建Logger实例', () => {
      const createdLogger = createLogger('FactoryLogger');
      expect(createdLogger).toBeInstanceOf(Logger);
      expect(createdLogger.getName()).toBe('FactoryLogger');
    });

    it('createLogger应该使用默认名称', () => {
      const createdLogger = createLogger();
      expect(createdLogger.getName()).toBe('Logger');
    });

    it('createLogger应该创建独立实例', () => {
      const logger1 = createLogger('Logger1');
      const logger2 = createLogger('Logger2');

      expect(logger1).not.toBe(logger2);
      expect(logger1.getName()).toBe('Logger1');
      expect(logger2.getName()).toBe('Logger2');

      // 测试独立性
      logger1.info('Message from logger1');
      logger2.info('Message from logger2');

      expect((logger1 as any).getLogs()).toHaveLength(1);
      expect((logger2 as any).getLogs()).toHaveLength(1);
      expect((logger1 as any).getLogs()[0].message).toBe('Message from logger1');
      expect((logger2 as any).getLogs()[0].message).toBe('Message from logger2');
    });
  });

  describe('边界情况', () => {
    it('应该处理空消息', () => {
      const mockLogger = logger as any;
      const initialCount = mockLogger.getLogs().length;

      logger.info('');
      logger.warn('');

      const logs = mockLogger.getLogs();
      expect(logs.length).toBe(initialCount + 2);
      expect(logs[initialCount].message).toBe('');
      expect(logs[initialCount + 1].message).toBe('');
    });

    it('应该处理undefined和null元数据', () => {
      const mockLogger = logger as any;
      const initialCount = mockLogger.getLogs().length;

      logger.info('Message', undefined);
      logger.info('Message', null);

      const logs = mockLogger.getLogs();
      expect(logs.length).toBe(initialCount + 2);
      expect(logs[initialCount].meta).toBeUndefined();
      expect(logs[initialCount + 1].meta).toBeNull();
    });

    it('应该处理复杂对象作为元数据', () => {
      const complexMeta = {
        user: {
          id: 123,
          name: 'Test User',
          roles: ['admin', 'user']
        },
        request: {
          id: 'req-123',
          timestamp: new Date(),
          headers: {
            'user-agent': 'test-agent'
          }
        }
      };

      logger.info('Complex meta', complexMeta);

      const logs = (logger as any).getLogs();
      const lastLog = logs[logs.length - 1];
      expect(lastLog.meta).toEqual(complexMeta);
    });

    it('应该处理循环引用的元数据', () => {
      const circularMeta: any = { prop: 'value' };
      circularMeta.self = circularMeta;

      // 应该不抛出错误
      expect(() => {
        logger.info('Circular meta', circularMeta);
      }).not.toThrow();
    });
  });

  describe('性能测试', () => {
    it('应该能够处理大量日志记录', () => {
      const mockLogger = logger as any;
      const startTime = Date.now();

      for (let i = 0; i < 1000; i++) {
        logger.info(`Message ${i}`, { index: i });
      }

      const duration = Date.now() - startTime;
      const logs = mockLogger.getLogs();

      expect(logs.length).toBeGreaterThanOrEqual(1000);
      // 性能要求：1000条日志应在100ms内完成
      expect(duration).toBeLessThan(100);
    });

    it('日志查询应该高效', () => {
      // 添加大量日志
      for (let i = 0; i < 1000; i++) {
        logger.info(`Message ${i}`);
        if (i % 10 === 0) {
          logger.warn(`Warning ${i}`);
        }
      }

      const startTime = Date.now();

      const allLogs = (logger as any).getLogs();
      const infoLogs = (logger as any).getLogsByLevel('info');
      const warnLogs = (logger as any).getLogsByLevel('warn');

      const duration = Date.now() - startTime;

      expect(allLogs.length).toBe(1000);
      expect(infoLogs.length).toBe(900);
      expect(warnLogs.length).toBe(100);
      // 查询应该很快
      expect(duration).toBeLessThan(10);
    });
  });

  describe('内存管理', () => {
    it('清空日志应该释放内存', () => {
      const mockLogger = logger as any;
      const initialLogs = mockLogger.getLogs();

      // 添加大量日志
      for (let i = 0; i < 100; i++) {
        logger.info(`Message ${i}`, { data: 'x'.repeat(1000) }); // 大量数据
      }

      expect(mockLogger.getLogs().length).toBe(initialLogs.length + 100);

      // 清空日志
      mockLogger.clearLogs();

      expect(mockLogger.getLogs().length).toBe(0);
    });

    it('销毁Logger应该清理资源', () => {
      const mockLogger = logger as any;

      // 添加一些日志
      logger.info('Test message');
      expect(mockLogger.getLogs().length).toBeGreaterThan(0);

      // 销毁Logger
      logger.dispose();

      expect(mockLogger.isDisposed()).toBe(true);
      expect(mockLogger.getLogs().length).toBe(0);
    });

    it('销毁后的Logger不能记录日志', () => {
      logger.dispose();

      expect(() => {
        logger.info('Should not log');
      }).not.toThrow(); // 应该静默忽略

      expect(() => {
        logger.error('Should not error');
      }).not.toThrow();
    });
  });

  describe('多线程安全（模拟）', () => {
    it('应该能够处理并发日志记录', async () => {
      const mockLogger = logger as any;
      const promises: Promise<void>[] = [];

      // 创建多个并发的日志记录任务
      for (let i = 0; i < 10; i++) {
        const promise = new Promise<void>((resolve) => {
          setTimeout(() => {
            for (let j = 0; j < 10; j++) {
              logger.info(`Concurrent message ${i}-${j}`);
            }
            resolve();
          }, Math.random() * 10);
        });
        promises.push(promise);
      }

      await Promise.all(promises);

      const logs = mockLogger.getLogs();
      expect(logs.length).toBe(100);

      // 验证所有消息都被记录
      for (let i = 0; i < 10; i++) {
        for (let j = 0; j < 10; j++) {
          const expectedMessage = `Concurrent message ${i}-${j}`;
          expect(logs.some(log => log.message === expectedMessage)).toBe(true);
        }
      }
    });
  });

  describe('扩展性', () => {
    it('应该支持自定义日志格式', () => {
      // 测试Logger能够处理特殊字符和Unicode
      logger.info('Unicode test: 🚀 🎉 ✨');
      logger.info('Special chars: \n\t\r\\\'"');
      logger.info('Emoji test: 😊 😂 ❤️ 🎈');

      const logs = (logger as any).getLogs();
      expect(logs.length).toBe(3);
      expect(logs[0].message).toBe('Unicode test: 🚀 🎉 ✨');
      expect(logs[1].message).toBe('Special chars: \n\t\r\\\'"');
      expect(logs[2].message).toBe('Emoji test: 😊 😂 ❤️ 🎈');
    });

    it('应该支持非常长的消息', () => {
      const longMessage = 'x'.repeat(10000);
      logger.info(longMessage);

      const logs = (logger as any).getLogs();
      expect(logs.length).toBe(1);
      expect(logs[0].message).toBe(longMessage);
    });
  });
});