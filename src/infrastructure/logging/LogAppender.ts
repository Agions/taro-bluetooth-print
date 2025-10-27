/**
 * 日志输出器实现
 */

import {
  ILogAppender,
  ILogEntry,
  LogLevel
} from './types';

/**
 * 控制台输出器
 */
export class ConsoleAppender implements ILogAppender {
  readonly name = 'console';
  readonly level: LogLevel;
  private _enabled: boolean = true;

  constructor(level: LogLevel = LogLevel.INFO) {
    this.level = level;
  }

  append(entry: ILogEntry): void {
    if (!this._enabled || entry.level < this.level) {
      return;
    }

    const message = this.formatMessage(entry);
    const method = this.getConsoleMethod(entry.level);

    if (method) {
      method(message);
    }
  }

  flush(): void {
    // 控制台输出不需要刷新
  }

  close(): void {
    this._enabled = false;
  }

  isEnabled(): boolean {
    return this._enabled;
  }

  setEnabled(enabled: boolean): void {
    this._enabled = enabled;
  }

  private formatMessage(entry: ILogEntry): string {
    const timestamp = new Date(entry.timestamp).toISOString();
    const source = entry.source ? `[${entry.source}]` : '';
    const tags = entry.tags && entry.tags.length > 0 ? `[${entry.tags.join(',')}]` : '';
    const prefix = `${timestamp} ${source} ${tags}`.trim();

    return `${prefix} ${entry.message}`;
  }

  private getConsoleMethod(level: LogLevel): ConsoleMethod | null {
    switch (level) {
      case LogLevel.TRACE:
        return console.debug;
      case LogLevel.DEBUG:
        return console.debug;
      case LogLevel.INFO:
        return console.info;
      case LogLevel.WARN:
        return console.warn;
      case LogLevel.ERROR:
        return console.error;
      case LogLevel.FATAL:
        return console.error;
      default:
        return null;
    }
  }
}

/**
   * 文件输出器
   */
export class FileAppender implements ILogAppender {
  readonly name: string;
  readonly level: LogLevel;
  private filePath: string;
  private maxSize: number;
  private maxFiles: number;
  private _enabled: boolean = true;
  private currentFileSize: number = 0;
  private currentFileIndex: number = 0;

  constructor(
    filePath: string,
    options: {
      level?: LogLevel;
      maxSize?: number;
      maxFiles?: number;
    } = {}
  ) {
    this.name = `file:${filePath}`;
    this.level = options.level || LogLevel.INFO;
    this.filePath = filePath;
    this.maxSize = options.maxSize || 10 * 1024 * 1024; // 10MB
    this.maxFiles = options.maxFiles || 5;
  }

  async append(entry: ILogEntry): Promise<void> {
    if (!this._enabled || entry.level < this.level) {
      return;
    }

    const message = this.formatMessage(entry);
    const messageSize = Buffer.byteLength(message, 'utf8');

    // 检查是否需要轮转文件
    if (this.currentFileSize + messageSize > this.maxSize) {
      await this.rotateFile();
    }

    // 写入文件
    await this.writeToFile(message);
    this.currentFileSize += messageSize;
  }

  async flush(): Promise<void> {
    // 文件输出器通常由系统自动刷新
  }

  async close(): Promise<void> {
    this._enabled = false;
  }

  isEnabled(): boolean {
    return this._enabled;
  }

  setEnabled(enabled: boolean): void {
    this._enabled = enabled;
  }

  private formatMessage(entry: ILogEntry): string {
    const timestamp = new Date(entry.timestamp).toISOString();
    const level = LogLevel[entry.level];
    const source = entry.source ? `[${entry.source}]` : '';
    const tags = entry.tags && entry.tags.length > 0 ? `[${entry.tags.join(',')}]` : '';
    const data = entry.data ? `\nData: ${JSON.stringify(entry.data, null, 2)}` : '';
    const error = entry.error ? `\nError: ${entry.error.stack}` : '';

    return `${timestamp} [${level}]${source}${tags} ${entry.message}${data}${error}\n`;
  }

  private async rotateFile(): Promise<void> {
    this.currentFileIndex++;
    this.currentFileSize = 0;

    // 删除旧文件
    if (this.currentFileIndex > this.maxFiles) {
      const oldFilePath = this.getFilePath(this.currentFileIndex - this.maxFiles);
      try {
        const fs = require('fs').promises;
        await fs.unlink(oldFilePath);
      } catch (error) {
        console.error(`Error deleting old log file ${oldFilePath}:`, error);
      }
    }
  }

  private async writeToFile(message: string): Promise<void> {
    const fs = require('fs').promises;
    const filePath = this.getFilePath(this.currentFileIndex);

    try {
      await fs.appendFile(filePath, message, 'utf-8');
    } catch (error) {
      console.error(`Error writing to log file ${filePath}:`, error);
    }
  }

  private getFilePath(index: number): string {
    const ext = require('path').extname(this.filePath);
    const baseName = this.filePath.slice(0, -ext.length || this.filePath.length);
    return index > 0 ? `${baseName}.${index}${ext}` : this.filePath;
  }
}

/**
   * 远程输出器
 */
export class RemoteAppender implements ILogAppender {
  readonly name: string;
  readonly level: LogLevel;
  private endpoint: string;
  private headers: Record<string, string>;
  private batchSize: number;
  private flushInterval: number;
  private _enabled: boolean = true;
  private buffer: ILogEntry[] = [];
  private flushTimer?: NodeJS.Timeout;

  constructor(
    endpoint: string,
    options: {
      level?: LogLevel;
      headers?: Record<string, string>;
      batchSize?: number;
      flushInterval?: number;
    } = {}
  ) {
    this.name = `remote:${endpoint}`;
    this.level = options.level || LogLevel.INFO;
    this.endpoint = endpoint;
    this.headers = options.headers || {};
    this.batchSize = options.batchSize || 100;
    this.flushInterval = options.flushInterval || 5000;

    // 设置定时刷新
    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.flushInterval);
  }

  async append(entry: ILogEntry): Promise<void> {
    if (!this._enabled || entry.level < this.level) {
      return;
    }

    this.buffer.push(entry);

    if (this.buffer.length >= this.batchSize) {
      await this.flush();
    }
  }

  async flush(): Promise<void> {
    if (this.buffer.length === 0) {
      return;
    }

    const entries = [...this.buffer];
    this.buffer = [];

    try {
      await this.sendToRemote(entries);
    } catch (error) {
      console.error('Failed to send logs to remote endpoint:', error);
      // 重新加入缓冲区，下次重试
      this.buffer.unshift(...entries);
    }
  }

  async close(): Promise<void> {
    this._enabled = false;

    // 清除定时器
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = undefined;
    }

    // 刷新剩余日志
    await this.flush();
  }

  isEnabled(): boolean {
    return this._enabled;
  }

  setEnabled(enabled: boolean): void {
    this._enabled = enabled;
  }

  private async sendToRemote(entries: ILogEntry[]): Promise<void> {
    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.headers
      },
      body: JSON.stringify({
        logs: entries,
        timestamp: Date.now()
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
  }
}

/**
   * 内存输出器（用于测试）
 */
export class MemoryAppender implements ILogAppender {
  readonly name = 'memory';
  readonly level: LogLevel;
  private _enabled: boolean = true;
  private logs: ILogEntry[] = [];
  private maxLogs: number;

  constructor(level: LogLevel = LogLevel.INFO, maxLogs: number = 1000) {
    this.name = 'memory';
    this.level = level;
    this.maxLogs = maxLogs;
  }

  append(entry: ILogEntry): void {
    if (!this._enabled || entry.level < this.level) {
      return;
    }

    this.logs.push(entry);

    // 限制日志数量
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }
  }

  flush(): void {
    // 内存输出器不需要刷新
  }

  close(): void {
    this._enabled = false;
    this.logs = [];
  }

  isEnabled(): boolean {
    return this._enabled;
  }

  setEnabled(enabled: boolean): void {
    this._enabled = enabled;
  }

  /**
   * 获取所有日志
   */
  getLogs(): ILogEntry[] {
    return [...this.logs];
  }

  /**
   * 清空日志
   */
  clearLogs(): void {
    this.logs = [];
  }

  /**
   * 获取指定数量的日志
   */
  getRecentLogs(count: number): ILogEntry[] {
    return this.logs.slice(-count);
  }

  /**
   * 按级别过滤日志
   */
  getLogsByLevel(level: LogLevel): ILogEntry[] {
    return this.logs.filter(log => log.level === level);
  }

  /**
   * 按时间范围过滤日志
   */
  getLogsByTimeRange(startTime: number, endTime: number): ILogEntry[] {
    return this.logs.filter(
      log => log.timestamp >= startTime && log.timestamp <= endTime
    );
  }
}

/**
   * 多路输出器
 */
export class MultiplexAppender implements ILogAppender {
  readonly name = 'multiplex';
  readonly level: LogLevel;
  private appenders: ILogAppender[] = [];
  private _enabled: boolean = true;

  constructor(level: LogLevel = LogLevel.INFO) {
    this.name = 'multiplex';
    this.level = level;
  }

  addAppender(appender: ILogAppender): void {
    this.appenders.push(appender);
  }

  removeAppender(name: string): void {
    const index = this.appenders.findIndex(a => a.name === name);
    if (index !== -1) {
      const appender = this.appenders[index];
      appender.close();
      this.appenders.splice(index, 1);
    }
  }

  async append(entry: ILogEntry): Promise<void> {
    if (!this._enabled || entry.level < this.level) {
      return;
    }

    // 并发输出到所有输出器
    await Promise.all(
      this.appenders.map(appender => {
        try {
          return appender.append(entry);
        } catch (error) {
          console.error(`Error in appender '${appender.name}':`, error);
        }
      })
    );
  }

  async flush(): Promise<void> {
    await Promise.all(
      this.appenders.map(appender => {
        try {
          return appender.flush();
        } catch (error) {
          console.error(`Error flushing appender '${appender.name}':`, error);
        }
      })
    );
  }

  async close(): Promise<void> {
    this._enabled = false;

    await Promise.all(
      this.appenders.map(appender => {
        try {
          return appender.close();
        } catch (error) {
          console.error(`Error closing appender '${appender.name}':`, error);
        }
      })
    );

    this.appenders = [];
  }

  isEnabled(): boolean {
    return this._enabled;
  }

  setEnabled(enabled: boolean): void {
    this._enabled = enabled;
  }

  getAppenders(): ILogAppender[] {
    return [...this.appenders];
  }
}

/**
   * 缓冲输出器
 */
export class BufferedAppender implements ILogAppender {
  readonly name: string;
  readonly level: LogLevel;
  private targetAppender: ILogAppender;
  private buffer: ILogEntry[] = [];
  private bufferSize: number;
  private flushInterval: number;
  private flushTimer?: NodeJS.Timeout;
  private _enabled: boolean = true;

  constructor(
    targetAppender: ILogAppender,
    options: {
      bufferSize?: number;
      flushInterval?: number;
    } = {}
  ) {
    this.name = `buffered:${targetAppender.name}`;
    this.level = options.bufferSize || targetAppender.level;
    this.targetAppender = targetAppender;
    this.bufferSize = options.bufferSize || 1000;
    this.flushInterval = options.flushInterval || 5000;

    // 设置定时刷新
    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.flushInterval);
  }

  async append(entry: ILogEntry): Promise<void> {
    if (!this._enabled || entry.level < this.level) {
      return;
    }

    this.buffer.push(entry);

    if (this.buffer.length >= this.bufferSize) {
      await this.flush();
    }
  }

  async flush(): Promise<void> {
    if (this.buffer.length === 0) {
      return;
    }

    const entries = [...this.buffer];
    this.buffer = [];

    // 批量输出到目标输出器
    for (const entry of entries) {
      await this.targetAppender.append(entry);
    }

    // 刷新目标输出器
    await this.targetAppender.flush();
  }

  async close(): Promise<void> {
    this._enabled = false;

    // 清除定时器
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = undefined;
    }

    // 刷新剩余日志
    await this.flush();
    await this.targetAppender.close();
  }

  isEnabled(): boolean {
    return this._enabled;
  }

  setEnabled(enabled: boolean): void {
    this._enabled = enabled;
  }

  /**
   * 获取缓冲区大小
   */
  getBufferSize(): number {
    return this.buffer.length;
  }
}