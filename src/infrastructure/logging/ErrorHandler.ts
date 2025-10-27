/**
 * 统一错误处理器
 */

import {
  IErrorHandler,
  IErrorContext,
  IErrorReport,
  IRecoveryStrategy,
  IErrorPattern,
  ErrorSeverity,
  ErrorCategory,
  ILogEntry,
  LogLevel,
  ILogger
} from './types';
import { v4 as uuidv4 } from 'uuid';

/**
 * 统一错误处理器实现
 */
export class ErrorHandler implements IErrorHandler {
  /** 错误处理器名称 */
  public readonly name: string;

  /** 错误模式列表 */
  private patterns: IErrorPattern[] = [];

  /** 恢复策略列表 */
  private strategies: Map<string, IRecoveryStrategy> = new Map();

  /** 错误历史记录 */
  private errorHistory: IErrorReport[] = [];

  /** 错误统计 */
  private stats = {
    totalErrors: 0,
    errorsByCategory: {} as Record<ErrorCategory, number>,
    errorsBySeverity: {} as Record<ErrorSeverity, number>,
    recoveryAttempts: 0,
    successfulRecoveries: 0,
    failedRecoveries: 0
  };

  /** 日志记录器 */
  private logger: ILogger;

  /** 是否启用 */
  private enabled: boolean = true;

  /** 最大错误历史记录数 */
  private maxHistorySize: number;

  constructor(
    name: string,
    logger: ILogger,
    maxHistorySize: number = 1000
  ) {
    this.name = name;
    this.logger = logger;
    this.maxHistorySize = maxHistorySize;

    // 初始化统计
    this.initializeStats();
  }

  /**
   * 处理错误
   */
  public async handleError(
    error: Error,
    context?: Partial<IErrorContext>
  ): Promise<IErrorReport> {
    if (!this.enabled) {
      return this.createReport(error, context, false);
    }

    // 创建错误上下文
    const errorContext: IErrorContext = {
      timestamp: Date.now(),
      errorId: uuidv4(),
      correlationId: context?.correlationId || uuidv4(),
      userId: context?.userId,
      sessionId: context?.sessionId,
      operation: context?.operation,
      component: context?.component,
      data: context?.data,
      stackTrace: error.stack,
      originalError: error
    };

    // 分析错误
    const analysis = this.analyzeError(error);

    // 创建错误报告
    const report: IErrorReport = {
      id: errorContext.errorId,
      timestamp: errorContext.timestamp,
      error,
      context: errorContext,
      severity: analysis.severity,
      category: analysis.category,
      handled: false,
      recovered: false,
      recoveryAttempts: 0
    };

    // 记录错误
    this.logError(report);

    // 尝试恢复
    if (analysis.pattern?.recoveryStrategy) {
      report.handled = true;
      await this.attemptRecovery(report, analysis.pattern.recoveryStrategy);
    }

    // 更新统计
    this.updateStats(report);

    // 添加到历史记录
    this.addToHistory(report);

    return report;
  }

  /**
   * 注册错误模式
   */
  public registerPattern(pattern: IErrorPattern): void {
    this.patterns.push(pattern);
  }

  /**
   * 注册恢复策略
   */
  public registerStrategy(strategy: IRecoveryStrategy): void {
    this.strategies.set(strategy.name, strategy);
  }

  /**
   * 移除错误模式
   */
  public removePattern(name: string): void {
    this.patterns = this.patterns.filter(p => p.name !== name);
  }

  /**
   * 移除恢复策略
   */
  public removeStrategy(name: string): void {
    this.strategies.delete(name);
  }

  /**
   * 获取错误报告
   */
  public getErrorReport(errorId: string): IErrorReport | undefined {
    return this.errorHistory.find(report => report.id === errorId);
  }

  /**
   * 获取错误历史
   */
  public getErrorHistory(
    filter?: {
      category?: ErrorCategory;
      severity?: ErrorSeverity;
      component?: string;
      from?: Date;
      to?: Date;
      limit?: number;
    }
  ): IErrorReport[] {
    let history = [...this.errorHistory];

    if (filter) {
      if (filter.category) {
        history = history.filter(report => report.category === filter.category);
      }
      if (filter.severity) {
        history = history.filter(report => report.severity === filter.severity);
      }
      if (filter.component) {
        history = history.filter(report => report.context.component === filter.component);
      }
      if (filter.from) {
        history = history.filter(report => report.timestamp >= filter.from!.getTime());
      }
      if (filter.to) {
        history = history.filter(report => report.timestamp <= filter.to!.getTime());
      }
      if (filter.limit) {
        history = history.slice(0, filter.limit);
      }
    }

    return history.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * 获取错误统计
   */
  public getStats(): any {
    return {
      ...this.stats,
      recentErrors: this.errorHistory.slice(0, 10),
      topErrors: this.getTopErrors(),
      patternsCount: this.patterns.length,
      strategiesCount: this.strategies.size
    };
  }

  /**
   * 清空错误历史
   */
  public clearHistory(): void {
    this.errorHistory = [];
    this.resetStats();
  }

  /**
   * 启用/禁用错误处理器
   */
  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * 检查是否启用
   */
  public isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * 销毁错误处理器
   */
  public dispose(): void {
    this.enabled = false;
    this.patterns = [];
    this.strategies.clear();
    this.errorHistory = [];
    this.resetStats();
  }

  // 私有方法

  /**
   * 初始化统计
   */
  private initializeStats(): void {
    Object.values(ErrorCategory).forEach(category => {
      this.stats.errorsByCategory[category] = 0;
    });
    Object.values(ErrorSeverity).forEach(severity => {
      this.stats.errorsBySeverity[severity] = 0;
    });
  }

  /**
   * 分析错误
   */
  private analyzeError(error: Error): {
    severity: ErrorSeverity;
    category: ErrorCategory;
    pattern?: IErrorPattern;
  } {
    // 查找匹配的模式
    for (const pattern of this.patterns) {
      if (pattern.matcher(error)) {
        return {
          severity: pattern.severity,
          category: pattern.category,
          pattern
        };
      }
    }

    // 默认分析
    return {
      severity: this.determineSeverity(error),
      category: this.determineCategory(error)
    };
  }

  /**
   * 确定错误严重程度
   */
  private determineSeverity(error: Error): ErrorSeverity {
    if (error.name === 'TypeError' || error.name === 'ReferenceError') {
      return ErrorSeverity.CRITICAL;
    }
    if (error.message.includes('timeout') || error.message.includes('connection')) {
      return ErrorSeverity.HIGH;
    }
    if (error.message.includes('warning') || error.message.includes('deprecated')) {
      return ErrorSeverity.LOW;
    }
    return ErrorSeverity.MEDIUM;
  }

  /**
   * 确定错误类别
   */
  private determineCategory(error: Error): ErrorCategory {
    const message = error.message.toLowerCase();
    const name = error.name.toLowerCase();

    if (message.includes('bluetooth') || name.includes('bluetooth')) {
      return ErrorCategory.BLUETOOTH;
    }
    if (message.includes('printer') || name.includes('printer')) {
      return ErrorCategory.PRINTER;
    }
    if (message.includes('connection') || message.includes('network')) {
      return ErrorCategory.CONNECTION;
    }
    if (message.includes('validation') || name.includes('validation')) {
      return ErrorCategory.VALIDATION;
    }
    if (message.includes('permission') || name.includes('permission')) {
      return ErrorCategory.PERMISSION;
    }
    if (message.includes('timeout') || name.includes('timeout')) {
      return ErrorCategory.TIMEOUT;
    }
    if (message.includes('config') || name.includes('config')) {
      return ErrorCategory.CONFIGURATION;
    }
    if (message.includes('memory') || name.includes('memory')) {
      return ErrorCategory.RESOURCE;
    }
    if (message.includes('auth') || name.includes('auth')) {
      return ErrorCategory.SECURITY;
    }

    return ErrorCategory.SYSTEM;
  }

  /**
   * 记录错误
   */
  private logError(report: IErrorReport): void {
    const logLevel = this.getLogLevelForSeverity(report.severity);
    const logData = {
      errorId: report.id,
      category: report.category,
      severity: report.severity,
      component: report.context.component,
      operation: report.context.operation,
      correlationId: report.context.correlationId,
      error: {
        name: report.error.name,
        message: report.error.message,
        stack: report.error.stack
      },
      context: report.context.data
    };

    this.logger.log(
      logLevel,
      `Error: ${report.error.message}`,
      logData,
      report.error
    );
  }

  /**
   * 获取严重程度对应的日志级别
   */
  private getLogLevelForSeverity(severity: ErrorSeverity): LogLevel {
    switch (severity) {
      case ErrorSeverity.CRITICAL:
      case ErrorSeverity.HIGH:
        return LogLevel.ERROR;
      case ErrorSeverity.MEDIUM:
        return LogLevel.WARN;
      case ErrorSeverity.LOW:
        return LogLevel.INFO;
      case ErrorSeverity.TRACE:
        return LogLevel.DEBUG;
      default:
        return LogLevel.ERROR;
    }
  }

  /**
   * 尝试恢复
   */
  private async attemptRecovery(
    report: IErrorReport,
    strategyName: string
  ): Promise<void> {
    const strategy = this.strategies.get(strategyName);
    if (!strategy) {
      this.logger.warn(`Recovery strategy '${strategyName}' not found`);
      return;
    }

    report.recoveryAttempts++;
    this.stats.recoveryAttempts++;

    try {
      this.logger.debug(`Attempting recovery with strategy: ${strategyName}`);

      const recovered = await strategy.recover(report.error, report.context);

      if (recovered) {
        report.recovered = true;
        this.stats.successfulRecoveries++;
        this.logger.info(`Error recovery successful`, {
          errorId: report.id,
          strategy: strategyName,
          attempts: report.recoveryAttempts
        });
      } else {
        this.stats.failedRecoveries++;
        this.logger.warn(`Error recovery failed`, {
          errorId: report.id,
          strategy: strategyName,
          attempts: report.recoveryAttempts
        });
      }
    } catch (recoveryError) {
      this.stats.failedRecoveries++;
      this.logger.error(`Recovery strategy failed`, recoveryError, {
        originalErrorId: report.id,
        strategy: strategyName,
        attempts: report.recoveryAttempts
      });
    }
  }

  /**
   * 更新统计
   */
  private updateStats(report: IErrorReport): void {
    this.stats.totalErrors++;
    this.stats.errorsByCategory[report.category]++;
    this.stats.errorsBySeverity[report.severity]++;
  }

  /**
   * 添加到历史记录
   */
  private addToHistory(report: IErrorReport): void {
    this.errorHistory.unshift(report);

    // 限制历史记录大小
    if (this.errorHistory.length > this.maxHistorySize) {
      this.errorHistory = this.errorHistory.slice(0, this.maxHistorySize);
    }
  }

  /**
   * 获取最常见错误
   */
  private getTopErrors(limit: number = 10): Array<{
    message: string;
    count: number;
    category: ErrorCategory;
  }> {
    const errorCounts = new Map<string, { count: number; category: ErrorCategory }>();

    this.errorHistory.forEach(report => {
      const key = `${report.error.name}: ${report.error.message}`;
      const existing = errorCounts.get(key);
      if (existing) {
        existing.count++;
      } else {
        errorCounts.set(key, {
          count: 1,
          category: report.category
        });
      }
    });

    return Array.from(errorCounts.entries())
      .map(([message, data]) => ({
        message,
        count: data.count,
        category: data.category
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  /**
   * 重置统计
   */
  private resetStats(): void {
    this.stats = {
      totalErrors: 0,
      errorsByCategory: {} as Record<ErrorCategory, number>,
      errorsBySeverity: {} as Record<ErrorSeverity, number>,
      recoveryAttempts: 0,
      successfulRecoveries: 0,
      failedRecoveries: 0
    };
    this.initializeStats();
  }

  /**
   * 创建报告
   */
  private createReport(
    error: Error,
    context?: Partial<IErrorContext>,
    handled: boolean = false
  ): IErrorReport {
    const analysis = this.analyzeError(error);

    return {
      id: uuidv4(),
      timestamp: Date.now(),
      error,
      context: {
        timestamp: Date.now(),
        errorId: uuidv4(),
        correlationId: context?.correlationId || uuidv4(),
        userId: context?.userId,
        sessionId: context?.sessionId,
        operation: context?.operation,
        component: context?.component,
        data: context?.data,
        stackTrace: error.stack,
        originalError: error
      },
      severity: analysis.severity,
      category: analysis.category,
      handled,
      recovered: false,
      recoveryAttempts: 0
    };
  }
}

/**
 * 蓝牙错误恢复策略
 */
export class BluetoothRecoveryStrategy implements IRecoveryStrategy {
  public readonly name = 'bluetooth-recovery';

  async recover(error: Error, context?: IErrorContext): Promise<boolean> {
    try {
      // 实现蓝牙恢复逻辑
      if (error.message.includes('connection')) {
        // 尝试重新连接
        return await this.reconnectBluetooth();
      }
      if (error.message.includes('adapter')) {
        // 尝试重置适配器
        return await this.resetAdapter();
      }
      if (error.message.includes('permission')) {
        // 请求权限
        return await this.requestPermission();
      }

      return false;
    } catch (recoveryError) {
      console.error('Bluetooth recovery failed:', recoveryError);
      return false;
    }
  }

  private async reconnectBluetooth(): Promise<boolean> {
    // 实现蓝牙重连逻辑
    console.log('Attempting to reconnect Bluetooth...');
    return true; // 简化实现
  }

  private async resetAdapter(): Promise<boolean> {
    // 实现适配器重置逻辑
    console.log('Attempting to reset Bluetooth adapter...');
    return true; // 简化实现
  }

  private async requestPermission(): Promise<boolean> {
    // 实现权限请求逻辑
    console.log('Requesting Bluetooth permission...');
    return true; // 简化实现
  }
}

/**
 * 打印机错误恢复策略
 */
export class PrinterRecoveryStrategy implements IRecoveryStrategy {
  public readonly name = 'printer-recovery';

  async recover(error: Error, context?: IErrorContext): Promise<boolean> {
    try {
      // 实现打印机恢复逻辑
      if (error.message.includes('connection')) {
        // 尝试重新连接打印机
        return await this.reconnectPrinter();
      }
      if (error.message.includes('paper')) {
        // 提示检查纸张
        return await this.checkPaperStatus();
      }
      if (error.message.includes('queue')) {
        // 清空打印队列
        return await this.clearQueue();
      }

      return false;
    } catch (recoveryError) {
      console.error('Printer recovery failed:', recoveryError);
      return false;
    }
  }

  private async reconnectPrinter(): Promise<boolean> {
    console.log('Attempting to reconnect printer...');
    return true; // 简化实现
  }

  private async checkPaperStatus(): Promise<boolean> {
    console.log('Checking paper status...');
    return true; // 简化实现
  }

  private async clearQueue(): Promise<boolean> {
    console.log('Clearing print queue...');
    return true; // 简化实现
  }
}