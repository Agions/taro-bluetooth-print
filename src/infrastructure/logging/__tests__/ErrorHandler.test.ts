/**
 * 错误处理器测试
 */

import {
  ErrorHandler,
  BluetoothRecoveryStrategy,
  PrinterRecoveryStrategy
} from '../ErrorHandler';
import { Logger, LogLevel } from '../Logger';
import { MemoryAppender } from '../LogAppender';
import { ErrorSeverity, ErrorCategory, IErrorPattern } from '../types';

describe('ErrorHandler', () => {
  let errorHandler: ErrorHandler;
  let logger: Logger;
  let memoryAppender: MemoryAppender;

  beforeEach(() => {
    memoryAppender = new MemoryAppender(LogLevel.TRACE);
    logger = new Logger('test-error-handler');
    logger.addAppender(memoryAppender);
    errorHandler = new ErrorHandler('test-handler', logger);
  });

  afterEach(() => {
    errorHandler.dispose();
    logger.dispose();
  });

  describe('基本错误处理', () => {
    it('应该能够处理基本错误', async () => {
      const error = new Error('test error');
      const report = await errorHandler.handleError(error);

      expect(report.id).toBeDefined();
      expect(report.error).toBe(error);
      expect(report.context).toBeDefined();
      expect(report.severity).toBeDefined();
      expect(report.category).toBeDefined();
      expect(report.handled).toBe(false);
      expect(report.recovered).toBe(false);
      expect(report.recoveryAttempts).toBe(0);
    });

    it('应该记录错误日志', async () => {
      const error = new Error('test error');
      await errorHandler.handleError(error, {
        operation: 'test-operation',
        component: 'test-component'
      });

      const logs = memoryAppender.getLogs();
      expect(logs.length).toBeGreaterThan(0);
      expect(logs.some(log => log.message.includes('test error'))).toBe(true);
    });

    it('应该支持错误上下文', async () => {
      const error = new Error('context error');
      const context = {
        userId: 'user-123',
        sessionId: 'session-456',
        operation: 'test-operation',
        component: 'test-component',
        data: { key: 'value' }
      };

      const report = await errorHandler.handleError(error, context);

      expect(report.context.userId).toBe('user-123');
      expect(report.context.sessionId).toBe('session-456');
      expect(report.context.operation).toBe('test-operation');
      expect(report.context.component).toBe('test-component');
      expect(report.context.data).toEqual({ key: 'value' });
    });
  });

  describe('错误模式匹配', () => {
    it('应该支持注册错误模式', async () => {
      const pattern: IErrorPattern = {
        name: 'test-pattern',
        matcher: (error) => error.message.includes('bluetooth'),
        severity: ErrorSeverity.HIGH,
        category: ErrorCategory.BLUETOOTH,
        recoveryStrategy: 'bluetooth-recovery'
      };

      errorHandler.registerPattern(pattern);

      const bluetoothError = new Error('bluetooth connection failed');
      const report = await errorHandler.handleError(bluetoothError);

      expect(report.severity).toBe(ErrorSeverity.HIGH);
      expect(report.category).toBe(ErrorCategory.BLUETOOTH);
      expect(report.handled).toBe(true);
    });

    it('应该支持移除错误模式', async () => {
      const pattern: IErrorPattern = {
        name: 'removable-pattern',
        matcher: (error) => error.message.includes('test'),
        severity: ErrorSeverity.HIGH,
        category: ErrorCategory.SYSTEM
      };

      errorHandler.registerPattern(pattern);
      errorHandler.removePattern('removable-pattern');

      const testError = new Error('test error');
      const report = await errorHandler.handleError(testError);

      // 应该使用默认分析，而不是注册的模式
      expect(report.severity).not.toBe(ErrorSeverity.HIGH);
    });
  });

  describe('恢复策略', () => {
    it('应该支持注册恢复策略', async () => {
      const mockStrategy = {
        name: 'mock-recovery',
        recover: jest.fn().mockResolvedValue(true)
      };

      errorHandler.registerStrategy(mockStrategy);

      const pattern: IErrorPattern = {
        name: 'recoverable-pattern',
        matcher: (error) => error.message.includes('recoverable'),
        severity: ErrorSeverity.MEDIUM,
        category: ErrorCategory.SYSTEM,
        recoveryStrategy: 'mock-recovery'
      };

      errorHandler.registerPattern(pattern);

      const recoverableError = new Error('recoverable error');
      const report = await errorHandler.handleError(recoverableError);

      expect(mockStrategy.recover).toHaveBeenCalledWith(recoverableError, expect.any(Object));
      expect(report.recovered).toBe(true);
      expect(report.recoveryAttempts).toBe(1);
    });

    it('应该处理恢复策略失败', async () => {
      const mockStrategy = {
        name: 'failing-recovery',
        recover: jest.fn().mockResolvedValue(false)
      };

      errorHandler.registerStrategy(mockStrategy);

      const pattern: IErrorPattern = {
        name: 'failing-pattern',
        matcher: (error) => error.message.includes('failing'),
        severity: ErrorSeverity.MEDIUM,
        category: ErrorCategory.SYSTEM,
        recoveryStrategy: 'failing-recovery'
      };

      errorHandler.registerPattern(pattern);

      const failingError = new Error('failing error');
      const report = await errorHandler.handleError(failingError);

      expect(mockStrategy.recover).toHaveBeenCalled();
      expect(report.recovered).toBe(false);
      expect(report.recoveryAttempts).toBe(1);
    });

    it('应该处理恢复策略异常', async () => {
      const mockStrategy = {
        name: 'exception-recovery',
        recover: jest.fn().mockRejectedValue(new Error('recovery failed'))
      };

      errorHandler.registerStrategy(mockStrategy);

      const pattern: IErrorPattern = {
        name: 'exception-pattern',
        matcher: (error) => error.message.includes('exception'),
        severity: ErrorSeverity.MEDIUM,
        category: ErrorCategory.SYSTEM,
        recoveryStrategy: 'exception-recovery'
      };

      errorHandler.registerPattern(pattern);

      const exceptionError = new Error('exception error');
      const report = await errorHandler.handleError(exceptionError);

      expect(mockStrategy.recover).toHaveBeenCalled();
      expect(report.recovered).toBe(false);
      expect(report.recoveryAttempts).toBe(1);

      // 应该记录恢复失败的日志
      const logs = memoryAppender.getLogs();
      expect(logs.some(log => log.level === LogLevel.ERROR && log.message.includes('Recovery strategy failed'))).toBe(true);
    });
  });

  describe('错误分析', () => {
    it('应该正确分类蓝牙错误', async () => {
      const bluetoothError = new Error('Bluetooth adapter not available');
      const report = await errorHandler.handleError(bluetoothError);

      expect(report.category).toBe(ErrorCategory.BLUETOOTH);
    });

    it('应该正确分类打印机错误', async () => {
      const printerError = new Error('Printer out of paper');
      const report = await errorHandler.handleError(printerError);

      expect(report.category).toBe(ErrorCategory.PRINTER);
    });

    it('应该正确分类连接错误', async () => {
      const connectionError = new Error('Connection timeout');
      const report = await errorHandler.handleError(connectionError);

      expect(report.category).toBe(ErrorCategory.CONNECTION);
    });

    it('应该正确确定错误严重程度', async () => {
      // TypeError 和 ReferenceError 应该是 CRITICAL
      const typeError = new TypeError('Cannot read property of undefined');
      const typeReport = await errorHandler.handleError(typeError);
      expect(typeReport.severity).toBe(ErrorSeverity.CRITICAL);

      // 超时和连接错误应该是 HIGH
      const timeoutError = new Error('Request timeout');
      const timeoutReport = await errorHandler.handleError(timeoutError);
      expect(timeoutReport.severity).toBe(ErrorSeverity.HIGH);

      // 警告性错误应该是 LOW
      const warningError = new Error('deprecated API usage warning');
      const warningReport = await errorHandler.handleError(warningError);
      expect(warningReport.severity).toBe(ErrorSeverity.LOW);
    });
  });

  describe('错误历史记录', () => {
    it('应该维护错误历史记录', async () => {
      const error1 = new Error('error 1');
      const error2 = new Error('error 2');
      const error3 = new Error('error 3');

      await errorHandler.handleError(error1);
      await errorHandler.handleError(error2);
      await errorHandler.handleError(error3);

      const history = errorHandler.getErrorHistory();
      expect(history).toHaveLength(3);
      expect(history[0].error.message).toBe('error 3'); // 最新的在前
      expect(history[1].error.message).toBe('error 2');
      expect(history[2].error.message).toBe('error 1');
    });

    it('应该支持按类别过滤错误历史', async () => {
      const bluetoothError = new Error('bluetooth error');
      const printerError = new Error('printer error');
      const systemError = new Error('system error');

      await errorHandler.handleError(bluetoothError);
      await errorHandler.handleError(printerError);
      await errorHandler.handleError(systemError);

      const bluetoothHistory = errorHandler.getErrorHistory({
        category: ErrorCategory.BLUETOOTH
      });
      expect(bluetoothHistory).toHaveLength(1);
      expect(bluetoothHistory[0].category).toBe(ErrorCategory.BLUETOOTH);

      const printerHistory = errorHandler.getErrorHistory({
        category: ErrorCategory.PRINTER
      });
      expect(printerHistory).toHaveLength(1);
      expect(printerHistory[0].category).toBe(ErrorCategory.PRINTER);
    });

    it('应该支持按严重程度过滤错误历史', async () => {
      const criticalError = new TypeError('critical error');
      const warningError = new Error('warning error');

      await errorHandler.handleError(criticalError);
      await errorHandler.handleError(warningError);

      const criticalHistory = errorHandler.getErrorHistory({
        severity: ErrorSeverity.CRITICAL
      });
      expect(criticalHistory).toHaveLength(1);
      expect(criticalHistory[0].severity).toBe(ErrorSeverity.CRITICAL);

      const warningHistory = errorHandler.getErrorHistory({
        severity: ErrorSeverity.LOW
      });
      expect(warningHistory).toHaveLength(1);
      expect(warningHistory[0].severity).toBe(ErrorSeverity.LOW);
    });

    it('应该支持按组件过滤错误历史', async () => {
      await errorHandler.handleError(new Error('component1 error'), {
        component: 'component1'
      });
      await errorHandler.handleError(new Error('component2 error'), {
        component: 'component2'
      });

      const component1History = errorHandler.getErrorHistory({
        component: 'component1'
      });
      expect(component1History).toHaveLength(1);
      expect(component1History[0].context.component).toBe('component1');
    });

    it('应该支持按时间范围过滤错误历史', async () => {
      const now = Date.now();
      const oneHourAgo = now - 60 * 60 * 1000;

      const oldError = new Error('old error');
      const recentError = new Error('recent error');

      // 模拟旧错误
      jest.spyOn(Date, 'now').mockReturnValue(oneHourAgo);
      await errorHandler.handleError(oldError);

      // 模拟新错误
      jest.spyOn(Date, 'now').mockReturnValue(now);
      await errorHandler.handleError(recentError);

      const recentHistory = errorHandler.getErrorHistory({
        from: new Date(now - 30 * 60 * 1000) // 最近30分钟
      });
      expect(recentHistory).toHaveLength(1);
      expect(recentHistory[0].error.message).toBe('recent error');

      jest.restoreAllMocks();
    });

    it('应该支持限制历史记录数量', async () => {
      for (let i = 0; i < 10; i++) {
        await errorHandler.handleError(new Error(`error ${i}`));
      }

      const limitedHistory = errorHandler.getErrorHistory({ limit: 5 });
      expect(limitedHistory).toHaveLength(5);
    });
  });

  describe('错误统计', () => {
    it('应该提供准确的错误统计', async () => {
      const bluetoothError = new Error('bluetooth error');
      const printerError = new Error('printer error');
      const typeError = new TypeError('type error');

      await errorHandler.handleError(bluetoothError);
      await errorHandler.handleError(printerError);
      await errorHandler.handleError(typeError);

      const stats = errorHandler.getStats();
      expect(stats.totalErrors).toBe(3);
      expect(stats.errorsByCategory[ErrorCategory.BLUETOOTH]).toBe(1);
      expect(stats.errorsByCategory[ErrorCategory.PRINTER]).toBe(1);
      expect(stats.errorsByCategory[ErrorCategory.SYSTEM]).toBe(1);
      expect(stats.errorsBySeverity[ErrorSeverity.MEDIUM]).toBe(2); // bluetooth, printer
      expect(stats.errorsBySeverity[ErrorSeverity.CRITICAL]).toBe(1); // type error
    });

    it('应该跟踪恢复统计', async () => {
      const successStrategy = {
        name: 'success-recovery',
        recover: jest.fn().mockResolvedValue(true)
      };

      const failStrategy = {
        name: 'fail-recovery',
        recover: jest.fn().mockResolvedValue(false)
      };

      errorHandler.registerStrategy(successStrategy);
      errorHandler.registerStrategy(failStrategy);

      const successPattern: IErrorPattern = {
        name: 'success-pattern',
        matcher: (error) => error.message.includes('success'),
        severity: ErrorSeverity.MEDIUM,
        category: ErrorCategory.SYSTEM,
        recoveryStrategy: 'success-recovery'
      };

      const failPattern: IErrorPattern = {
        name: 'fail-pattern',
        matcher: (error) => error.message.includes('fail'),
        severity: ErrorSeverity.MEDIUM,
        category: ErrorCategory.SYSTEM,
        recoveryStrategy: 'fail-recovery'
      };

      errorHandler.registerPattern(successPattern);
      errorHandler.registerPattern(failPattern);

      await errorHandler.handleError(new Error('success error'));
      await errorHandler.handleError(new Error('fail error'));

      const stats = errorHandler.getStats();
      expect(stats.recoveryAttempts).toBe(2);
      expect(stats.successfulRecoveries).toBe(1);
      expect(stats.failedRecoveries).toBe(1);
    });
  });

  describe('启用/禁用', () => {
    it('应该支持启用和禁用错误处理器', async () => {
      errorHandler.setEnabled(false);

      const error = new Error('disabled error');
      const report = await errorHandler.handleError(error);

      // 禁用时应该仍然返回报告，但不进行处理
      expect(report.id).toBeDefined();
      expect(report.error).toBe(error);

      // 检查是否没有记录日志
      const logs = memoryAppender.getLogs();
      expect(logs).toHaveLength(0);
    });
  });

  describe('错误报告查询', () => {
    it('应该支持通过ID查询错误报告', async () => {
      const error = new Error('queryable error');
      const report = await errorHandler.handleError(error);

      const foundReport = errorHandler.getErrorReport(report.id);
      expect(foundReport).toBe(report);
      expect(foundReport?.error.message).toBe('queryable error');
    });

    it('应该处理不存在的错误报告ID', () => {
      const foundReport = errorHandler.getErrorReport('non-existent-id');
      expect(foundReport).toBeUndefined();
    });
  });

  describe('资源清理', () => {
    it('应该支持清空错误历史', async () => {
      await errorHandler.handleError(new Error('error 1'));
      await errorHandler.handleError(new Error('error 2'));

      let history = errorHandler.getErrorHistory();
      expect(history).toHaveLength(2);

      errorHandler.clearHistory();

      history = errorHandler.getErrorHistory();
      expect(history).toHaveLength(0);

      const stats = errorHandler.getStats();
      expect(stats.totalErrors).toBe(0);
    });

    it('应该支持销毁错误处理器', async () => {
      await errorHandler.handleError(new Error('before dispose'));

      errorHandler.dispose();

      // 销毁后应该无法处理错误
      await expect(errorHandler.handleError(new Error('after dispose')))
        .rejects.toThrow();

      // 历史记录应该被清空
      const history = errorHandler.getErrorHistory();
      expect(history).toHaveLength(0);
    });
  });
});

describe('BluetoothRecoveryStrategy', () => {
  let strategy: BluetoothRecoveryStrategy;

  beforeEach(() => {
    strategy = new BluetoothRecoveryStrategy();
  });

  describe('蓝牙连接错误恢复', () => {
    it('应该尝试恢复蓝牙连接错误', async () => {
      const connectionError = new Error('Bluetooth connection failed');
      const recovered = await strategy.recover(connectionError);

      expect(recovered).toBe(true);
    });

    it('应该尝试恢复蓝牙适配器错误', async () => {
      const adapterError = new Error('Bluetooth adapter error');
      const recovered = await strategy.recover(adapterError);

      expect(recovered).toBe(true);
    });

    it('应该尝试恢复权限错误', async () => {
      const permissionError = new Error('Bluetooth permission denied');
      const recovered = await strategy.recover(permissionError);

      expect(recovered).toBe(true);
    });

    it('应该忽略不相关的错误', async () => {
      const unrelatedError = new Error('Unrelated error');
      const recovered = await strategy.recover(unrelatedError);

      expect(recovered).toBe(false);
    });
  });
});

describe('PrinterRecoveryStrategy', () => {
  let strategy: PrinterRecoveryStrategy;

  beforeEach(() => {
    strategy = new PrinterRecoveryStrategy();
  });

  describe('打印机错误恢复', () => {
    it('应该尝试恢复打印机连接错误', async () => {
      const connectionError = new Error('Printer connection failed');
      const recovered = await strategy.recover(connectionError);

      expect(recovered).toBe(true);
    });

    it('应该尝试恢复纸张错误', async () => {
      const paperError = new Error('Printer out of paper');
      const recovered = await strategy.recover(paperError);

      expect(recovered).toBe(true);
    });

    it('应该尝试恢复队列错误', async () => {
      const queueError = new Error('Print queue error');
      const recovered = await strategy.recover(queueError);

      expect(recovered).toBe(true);
    });

    it('应该忽略不相关的错误', async () => {
      const unrelatedError = new Error('Unrelated error');
      const recovered = await strategy.recover(unrelatedError);

      expect(recovered).toBe(false);
    });
  });
});