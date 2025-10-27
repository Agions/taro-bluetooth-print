/**
 * 日志记录器测试
 */

import {
  Logger,
  PerformanceLogger,
  StructuredLogger,
  ErrorLogger,
  AuditLogger,
  LogLevel
} from '../Logger';
import { MemoryAppender } from '../LogAppender';
import { LevelFilter } from '../LogFilter';

describe('Logger', () => {
  let logger: Logger;
  let memoryAppender: MemoryAppender;

  beforeEach(() => {
    memoryAppender = new MemoryAppender(LogLevel.TRACE);
    logger = new Logger('test');
    logger.addAppender(memoryAppender);
  });

  afterEach(() => {
    logger.dispose();
  });

  describe('基本日志记录', () => {
    it('应该能够记录不同级别的日志', () => {
      logger.trace('trace message');
      logger.debug('debug message');
      logger.info('info message');
      logger.warn('warn message');
      logger.error('error message');
      logger.fatal('fatal message');

      const logs = memoryAppender.getLogs();
      expect(logs).toHaveLength(6);
      expect(logs[0].level).toBe(LogLevel.TRACE);
      expect(logs[0].message).toBe('trace message');
      expect(logs[1].level).toBe(LogLevel.DEBUG);
      expect(logs[2].level).toBe(LogLevel.INFO);
      expect(logs[3].level).toBe(LogLevel.WARN);
      expect(logs[4].level).toBe(LogLevel.ERROR);
      expect(logs[5].level).toBe(LogLevel.FATAL);
    });

    it('应该支持设置日志级别过滤', () => {
      logger.setLevel(LogLevel.WARN);

      logger.debug('debug message');
      logger.info('info message');
      logger.warn('warn message');
      logger.error('error message');

      const logs = memoryAppender.getLogs();
      expect(logs).toHaveLength(2);
      expect(logs[0].level).toBe(LogLevel.WARN);
      expect(logs[1].level).toBe(LogLevel.ERROR);
    });

    it('应该支持附加数据', () => {
      const data = { userId: 123, action: 'test' };
      logger.info('message with data', data);

      const logs = memoryAppender.getLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].data).toEqual(data);
    });

    it('应该支持错误对象', () => {
      const error = new Error('test error');
      logger.error('error message', error);

      const logs = memoryAppender.getLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].error).toBe(error);
      expect(logs[0].stack).toBe(error.stack);
    });
  });

  describe('标签管理', () => {
    it('应该支持设置标签', () => {
      logger.setTags(['tag1', 'tag2']);
      logger.info('message with tags');

      const logs = memoryAppender.getLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].tags).toEqual(['tag1', 'tag2']);
    });

    it('应该支持添加和移除标签', () => {
      logger.addTag('tag1');
      logger.addTag('tag2');
      logger.info('message with tags');

      let logs = memoryAppender.getLogs();
      expect(logs[0].tags).toEqual(['tag1', 'tag2']);

      logger.removeTag('tag1');
      logger.info('message after removing tag');

      logs = memoryAppender.getLogs();
      expect(logs[1].tags).toEqual(['tag2']);
    });
  });

  describe('过滤器管理', () => {
    it('应该支持添加过滤器', () => {
      const filter = new LevelFilter(LogLevel.WARN);
      logger.addFilter(filter);

      logger.debug('debug message');
      logger.warn('warn message');
      logger.error('error message');

      const logs = memoryAppender.getLogs();
      expect(logs).toHaveLength(2);
      expect(logs[0].level).toBe(LogLevel.WARN);
      expect(logs[1].level).toBe(LogLevel.ERROR);
    });

    it('应该支持移除过滤器', () => {
      const filter = new LevelFilter(LogLevel.WARN);
      logger.addFilter(filter);
      logger.removeFilter(filter.name);

      logger.debug('debug message');
      logger.warn('warn message');

      const logs = memoryAppender.getLogs();
      expect(logs).toHaveLength(2);
    });
  });

  describe('子日志记录器', () => {
    it('应该能够创建子记录器', () => {
      const childLogger = logger.child('child', { module: 'test' });
      childLogger.addAppender(memoryAppender);

      childLogger.info('child message');

      const logs = memoryAppender.getLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].source).toBe('child');
      expect(logs[0].data?.module).toBe('test');
    });

    it('子记录器应该继承父记录器的配置', () => {
      logger.setLevel(LogLevel.WARN);
      logger.addTag('parent-tag');

      const childLogger = logger.child('child');
      childLogger.addAppender(memoryAppender);

      childLogger.debug('debug message');
      childLogger.warn('warn message');

      const logs = memoryAppender.getLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].level).toBe(LogLevel.WARN);
      expect(logs[0].tags).toContain('parent-tag');
    });
  });

  describe('上下文日志记录器', () => {
    it('应该支持创建带上下文的记录器', () => {
      const contextLogger = logger.withContext({
        userId: '123',
        sessionId: 'session-456'
      });
      contextLogger.addAppender(memoryAppender);

      contextLogger.info('context message');

      const logs = memoryAppender.getLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].userId).toBe('123');
      expect(logs[0].sessionId).toBe('session-456');
    });
  });

  describe('性能计时器', () => {
    it('应该支持性能计时', async () => {
      const timer = logger.startTimer('test-operation');

      await new Promise(resolve => setTimeout(resolve, 10));

      const duration = timer.end({ result: 'success' });

      expect(duration).toBeGreaterThan(0);

      const logs = memoryAppender.getLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].message).toContain('test-operation');
      expect(logs[0].data?.duration).toBe(duration);
    });
  });

  describe('统计信息', () => {
    it('应该提供日志统计信息', () => {
      logger.info('info message');
      logger.warn('warn message');
      logger.error('error message');

      const stats = logger.getStats();
      expect(stats.totalLogs).toBe(3);
      expect(stats.logsByLevel[LogLevel.INFO]).toBe(1);
      expect(stats.logsByLevel[LogLevel.WARN]).toBe(1);
      expect(stats.logsByLevel[LogLevel.ERROR]).toBe(1);
      expect(stats.errorCount).toBe(1);
      expect(stats.warningCount).toBe(1);
    });

    it('应该能够重置统计信息', () => {
      logger.info('info message');
      logger.resetStats();

      const stats = logger.getStats();
      expect(stats.totalLogs).toBe(0);
    });
  });

  describe('启用/禁用', () => {
    it('应该支持启用和禁用日志记录', () => {
      logger.setEnabled(false);
      logger.info('disabled message');
      logger.setEnabled(true);
      logger.info('enabled message');

      const logs = memoryAppender.getLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].message).toBe('enabled message');
    });
  });
});

describe('PerformanceLogger', () => {
  let perfLogger: PerformanceLogger;
  let memoryAppender: MemoryAppender;

  beforeEach(() => {
    memoryAppender = new MemoryAppender(LogLevel.TRACE);
    perfLogger = new PerformanceLogger('test-perf');
    perfLogger.addAppender(memoryAppender);
  });

  afterEach(() => {
    perfLogger.dispose();
  });

  describe('异步函数测量', () => {
    it('应该能够测量异步函数执行时间', async () => {
      const asyncFn = async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return 'result';
      };

      const result = await perfLogger.measureAsync('async-operation', asyncFn);

      expect(result).toBe('result');

      const logs = memoryAppender.getLogs();
      expect(logs.length).toBeGreaterThan(1); // debug + info
      expect(logs.some(log => log.message.includes('async-operation'))).toBe(true);
      expect(logs.some(log => log.data?.duration)).toBe(true);
    });

    it('应该处理异步函数错误', async () => {
      const asyncFn = async () => {
        throw new Error('async error');
      };

      await expect(perfLogger.measureAsync('failing-operation', asyncFn))
        .rejects.toThrow('async error');

      const logs = memoryAppender.getLogs();
      expect(logs.some(log => log.level === LogLevel.ERROR)).toBe(true);
    });
  });

  describe('同步函数测量', () => {
    it('应该能够测量同步函数执行时间', () => {
      const syncFn = () => {
        let sum = 0;
        for (let i = 0; i < 1000; i++) {
          sum += i;
        }
        return sum;
      };

      const result = perfLogger.measure('sync-operation', syncFn);

      expect(result).toBeGreaterThan(0);

      const logs = memoryAppender.getLogs();
      expect(logs.some(log => log.message.includes('sync-operation'))).toBe(true);
    });

    it('应该处理同步函数错误', () => {
      const syncFn = () => {
        throw new Error('sync error');
      };

      expect(() => perfLogger.measure('failing-sync-operation', syncFn))
        .toThrow('sync error');

      const logs = memoryAppender.getLogs();
      expect(logs.some(log => log.level === LogLevel.ERROR)).toBe(true);
    });
  });
});

describe('StructuredLogger', () => {
  let structuredLogger: StructuredLogger;
  let memoryAppender: MemoryAppender;

  beforeEach(() => {
    memoryAppender = new MemoryAppender(LogLevel.TRACE);
    structuredLogger = new StructuredLogger('test-structured');
    structuredLogger.addAppender(memoryAppender);
  });

  afterEach(() => {
    structuredLogger.dispose();
  });

  describe('结构化日志记录', () => {
    it('应该支持结构化日志记录', () => {
      const structuredData = {
        http: {
          method: 'GET',
          url: '/api/test',
          statusCode: 200,
          duration: 150
        },
        userId: '123'
      };

      structuredLogger.logStructured(LogLevel.INFO, 'HTTP Request', structuredData);

      const logs = memoryAppender.getLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].data).toMatchObject({
        structured: true,
        ...structuredData
      });
    });
  });

  describe('专用日志记录方法', () => {
    it('应该支持记录HTTP请求', () => {
      structuredLogger.logRequest('GET', '/api/test', 200, 150, {
        userId: '123'
      });

      const logs = memoryAppender.getLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].data).toMatchObject({
        http: {
          method: 'GET',
          url: '/api/test',
          statusCode: 200,
          duration: 150
        },
        userId: '123'
      });
    });

    it('应该支持记录数据库操作', () => {
      structuredLogger.logDatabaseOperation('SELECT', 'users', 50, 10);

      const logs = memoryAppender.getLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].data).toMatchObject({
        database: {
          operation: 'SELECT',
          table: 'users',
          duration: 50,
          affectedRows: 10
        }
      });
    });

    it('应该支持记录用户行为', () => {
      structuredLogger.logUserAction('login', 'user-123', {
        ip: '192.168.1.1',
        userAgent: 'Mozilla/5.0'
      });

      const logs = memoryAppender.getLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].data).toMatchObject({
        user: {
          action: 'login',
          userId: 'user-123'
        },
        ip: '192.168.1.1',
        userAgent: 'Mozilla/5.0'
      });
    });
  });
});

describe('ErrorLogger', () => {
  let errorLogger: ErrorLogger;
  let memoryAppender: MemoryAppender;

  beforeEach(() => {
    memoryAppender = new MemoryAppender(LogLevel.TRACE);
    errorLogger = new ErrorLogger('test-error');
    errorLogger.addAppender(memoryAppender);
  });

  afterEach(() => {
    errorLogger.dispose();
  });

  describe('异常记录', () => {
    it('应该支持记录异常详情', () => {
      const error = new Error('test error');
      const context = { userId: '123', operation: 'login' };

      errorLogger.logException(error, context, 'Retry login');

      const logs = memoryAppender.getLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].level).toBe(LogLevel.FATAL);
      expect(logs[0].error).toBe(error);
      expect(logs[0].data).toMatchObject({
        recovery: 'Retry login',
        userId: '123',
        operation: 'login'
      });
    });

    it('应该支持记录错误恢复', () => {
      const originalError = new Error('connection failed');
      const context = { attempt: 2 };

      errorLogger.logRecovery('reconnect', originalError, context);

      const logs = memoryAppender.getLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].level).toBe(LogLevel.INFO);
      expect(logs[0].data).toMatchObject({
        operation: 'reconnect',
        fromError: {
          message: 'connection failed'
        },
        attempt: 2
      });
    });
  });
});

describe('AuditLogger', () => {
  let auditLogger: AuditLogger;
  let memoryAppender: MemoryAppender;

  beforeEach(() => {
    memoryAppender = new MemoryAppender(LogLevel.TRACE);
    auditLogger = new AuditLogger('test-audit');
    auditLogger.addAppender(memoryAppender);
  });

  afterEach(() => {
    auditLogger.dispose();
  });

  describe('审计日志记录', () => {
    it('应该支持记录审计日志', () => {
      auditLogger.audit('USER_LOGIN', 'user-management', 'user-123', {
        ip: '192.168.1.1',
        success: true
      });

      const logs = memoryAppender.getLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].data).toMatchObject({
        audit: {
          action: 'USER_LOGIN',
          resource: 'user-management',
          user: 'user-123'
        },
        ip: '192.168.1.1',
        success: true
      });
    });

    it('应该支持获取审计记录', () => {
      auditLogger.audit('USER_LOGIN', 'auth', 'user-123');
      auditLogger.audit('USER_LOGOUT', 'auth', 'user-456');
      auditLogger.audit('USER_LOGIN', 'auth', 'user-789');

      const trail = auditLogger.getAuditTrail();
      expect(trail).toHaveLength(3);
      expect(trail[0].action).toBe('USER_LOGIN'); // 最新的在前
      expect(trail[1].action).toBe('USER_LOGOUT');
      expect(trail[2].action).toBe('USER_LOGIN');
    });

    it('应该支持过滤审计记录', () => {
      auditLogger.audit('USER_LOGIN', 'auth', 'user-123');
      auditLogger.audit('USER_LOGOUT', 'auth', 'user-123');
      auditLogger.audit('USER_LOGIN', 'auth', 'user-456');

      const user123Trail = auditLogger.getAuditTrail({
        user: 'user-123'
      });
      expect(user123Trail).toHaveLength(2);
      expect(user123Trail.every(record => record.user === 'user-123')).toBe(true);

      const loginTrail = auditLogger.getAuditTrail({
        action: 'USER_LOGIN'
      });
      expect(loginTrail).toHaveLength(2);
      expect(loginTrail.every(record => record.action === 'USER_LOGIN')).toBe(true);
    });

    it('应该支持导出审计记录', () => {
      auditLogger.audit('USER_LOGIN', 'auth', 'user-123');

      const exported = auditLogger.exportAuditTrail();
      const parsed = JSON.parse(exported);

      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].action).toBe('USER_LOGIN');
    });

    it('应该支持清空审计记录', () => {
      auditLogger.audit('USER_LOGIN', 'auth', 'user-123');
      auditLogger.clearAuditTrail();

      const trail = auditLogger.getAuditTrail();
      expect(trail).toHaveLength(0);
    });
  });
});