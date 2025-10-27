/**
 * 日志格式化器实现
 */

import {
  ILogFormatter,
  ILogEntry,
  IStructuredLog,
  LogLevel
} from './types';

/**
 * 基础格式化器
 */
export abstract class BaseFormatter implements ILogFormatter {
  public abstract readonly name: string;

  abstract format(entry: ILogEntry): string;
}

/**
 * 简单文本格式化器
 */
export class SimpleFormatter extends BaseFormatter {
  public readonly name = 'simple';

  format(entry: ILogEntry): string {
    const timestamp = new Date(entry.timestamp).toISOString();
    const level = LogLevel[entry.level].padEnd(5);
    const source = entry.source ? `[${entry.source}]` : '';
    const tags = entry.tags && entry.tags.length > 0 ? `[${entry.tags.join(',')}]` : '';

    return `${timestamp} ${level} ${source}${tags} ${entry.message}`;
  }
}

/**
 * 详细文本格式化器
 */
export class DetailedFormatter extends BaseFormatter {
  public readonly name = 'detailed';

  private includeStackTrace: boolean;
  private includeData: boolean;

  constructor(options: {
    includeStackTrace?: boolean;
    includeData?: boolean;
  } = {}) {
    super();
    this.includeStackTrace = options.includeStackTrace ?? true;
    this.includeData = options.includeData ?? true;
  }

  format(entry: ILogEntry): string {
    const lines: string[] = [];

    // 基本信息
    const timestamp = new Date(entry.timestamp).toISOString();
    const level = LogLevel[entry.level];
    const source = entry.source || 'unknown';

    lines.push(`${timestamp} [${level}] [${source}] ${entry.message}`);

    // 标签
    if (entry.tags && entry.tags.length > 0) {
      lines.push(`Tags: ${entry.tags.join(', ')}`);
    }

    // 附加数据
    if (this.includeData && entry.data) {
      lines.push(`Data: ${JSON.stringify(entry.data, null, 2)}`);
    }

    // 错误信息
    if (entry.error) {
      lines.push(`Error: ${entry.error.name}: ${entry.error.message}`);
      if (this.includeStackTrace && entry.error.stack) {
        lines.push(`Stack Trace:\n${entry.error.stack}`);
      }
    }

    // 其他字段
    if (entry.sessionId) {
      lines.push(`Session ID: ${entry.sessionId}`);
    }
    if (entry.userId) {
      lines.push(`User ID: ${entry.userId}`);
    }
    if (entry.requestId) {
      lines.push(`Request ID: ${entry.requestId}`);
    }
    if (entry.correlationId) {
      lines.push(`Correlation ID: ${entry.correlationId}`);
    }

    return lines.join('\n');
  }

  setIncludeStackTrace(include: boolean): void {
    this.includeStackTrace = include;
  }

  setIncludeData(include: boolean): void {
    this.includeData = include;
  }
}

/**
 * JSON格式化器
 */
export class JsonFormatter extends BaseFormatter {
  public readonly name = 'json';

  private prettyPrint: boolean;
  private includeMetadata: boolean;

  constructor(options: {
    prettyPrint?: boolean;
    includeMetadata?: boolean;
  } = {}) {
    super();
    this.prettyPrint = options.prettyPrint ?? false;
    this.includeMetadata = options.includeMetadata ?? true;
  }

  format(entry: ILogEntry): string {
    const log: any = {
      timestamp: entry.timestamp,
      level: LogLevel[entry.level],
      message: entry.message
    };

    if (this.includeMetadata) {
      if (entry.source) log.source = entry.source;
      if (entry.tags && entry.tags.length > 0) log.tags = entry.tags;
      if (entry.data) log.data = entry.data;
      if (entry.sessionId) log.sessionId = entry.sessionId;
      if (entry.userId) log.userId = entry.userId;
      if (entry.requestId) log.requestId = entry.requestId;
      if (entry.correlationId) log.correlationId = entry.correlationId;
      if (entry.id) log.id = entry.id;
      if (entry.duration) log.duration = entry.duration;
      if (entry.memory) log.memory = entry.memory;
    }

    if (entry.error) {
      log.error = {
        name: entry.error.name,
        message: entry.error.message,
        stack: entry.error.stack
      };
    }

    return JSON.stringify(log, null, this.prettyPrint ? 2 : 0);
  }

  setPrettyPrint(pretty: boolean): void {
    this.prettyPrint = pretty;
  }

  setIncludeMetadata(include: boolean): void {
    this.includeMetadata = include;
  }
}

/**
 * 结构化日志格式化器（ELK兼容）
 */
export class StructuredFormatter extends BaseFormatter {
  public readonly name = 'structured';

  format(entry: ILogEntry): string {
    const structuredLog: IStructuredLog = {
      '@timestamp': new Date(entry.timestamp).toISOString(),
      '@level': LogLevel[entry.level].toLowerCase(),
      '@message': entry.message
    };

    // 添加可选字段
    if (entry.source) structuredLog['@source'] = entry.source;
    if (entry.tags && entry.tags.length > 0) structuredLog['@tags'] = entry.tags;
    if (entry.id) structuredLog['@id'] = entry.id;
    if (entry.sessionId) structuredLog['@session_id'] = entry.sessionId;
    if (entry.userId) structuredLog['@user_id'] = entry.userId;
    if (entry.requestId) structuredLog['@request_id'] = entry.requestId;
    if (entry.correlationId) structuredLog['@correlation_id'] = entry.correlationId;

    // 错误信息
    if (entry.error) {
      structuredLog['@error'] = {
        name: entry.error.name,
        message: entry.error.message,
        stack: entry.error.stack || ''
      };
    }

    // 性能信息
    if (entry.duration) {
      structuredLog['@performance'] = {
        operation: entry.context?.operation || 'unknown',
        duration: entry.duration
      };
    }

    if (entry.memory) {
      if (!structuredLog['@performance']) {
        structuredLog['@performance'] = {};
      }
      structuredLog['@performance'].memory = entry.memory;
    }

    // 附加数据
    if (entry.data) {
      Object.assign(structuredLog, entry.data);
    }

    return JSON.stringify(structuredLog);
  }
}

/**
 * 彩色控制台格式化器
 */
export class ColorFormatter extends BaseFormatter {
  public readonly name = 'color';

  private colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    gray: '\x1b[90m'
  };

  private levelColors = {
    [LogLevel.TRACE]: this.colors.gray,
    [LogLevel.DEBUG]: this.colors.cyan,
    [LogLevel.INFO]: this.colors.green,
    [LogLevel.WARN]: this.colors.yellow,
    [LogLevel.ERROR]: this.colors.red,
    [LogLevel.FATAL]: this.colors.red + this.colors.bright
  };

  format(entry: ILogEntry): string {
    const timestamp = new Date(entry.timestamp).toISOString();
    const level = LogLevel[entry.level];
    const source = entry.source ? `[${entry.source}]` : '';
    const tags = entry.tags && entry.tags.length > 0 ? `[${entry.tags.join(',')}]` : '';

    const levelColor = this.levelColors[entry.level] || this.colors.white;
    const timestampColor = this.colors.dim;
    const sourceColor = this.colors.blue;
    const tagsColor = this.colors.magenta;
    const messageColor = this.colors.white;
    const resetColor = this.colors.reset;

    return (
      timestampColor + timestamp + resetColor + ' ' +
      levelColor + level.padEnd(5) + resetColor + ' ' +
      sourceColor + source + resetColor +
      (tags ? tagsColor + tags + resetColor + ' ' : '') +
      messageColor + entry.message + resetColor
    );
  }

  /**
   * 检查是否支持颜色输出
   */
  private supportsColor(): boolean {
    return (
      process?.stdout?.isTTY &&
      process?.env?.TERM !== 'dumb' &&
      !process?.env?.NO_COLOR
    );
  }

  /**
   * 获取禁用颜色的格式化器
   */
  static noColor(): ColorFormatter {
    const formatter = new ColorFormatter();
    // 重写format方法，不使用颜色
    formatter.format = (entry: ILogEntry): string => {
      const timestamp = new Date(entry.timestamp).toISOString();
      const level = LogLevel[entry.level];
      const source = entry.source ? `[${entry.source}]` : '';
      const tags = entry.tags && entry.tags.length > 0 ? `[${entry.tags.join(',')}]` : '';

      return `${timestamp} ${level.padEnd(5)} ${source}${tags} ${entry.message}`;
    };
    return formatter;
  }
}

/**
 * 模板格式化器
 */
export class TemplateFormatter extends BaseFormatter {
  public readonly name = 'template';
  private template: string;

  constructor(template: string) {
    super();
    this.template = template;
  }

  format(entry: ILogEntry): string {
    let result = this.template;

    // 替换占位符
    const replacements: Record<string, string> = {
      '{timestamp}': new Date(entry.timestamp).toISOString(),
      '{level}': LogLevel[entry.level],
      '{message}': entry.message,
      '{source}': entry.source || '',
      '{tags}': entry.tags ? entry.tags.join(',') : '',
      '{sessionId}': entry.sessionId || '',
      '{userId}': entry.userId || '',
      '{requestId}': entry.requestId || '',
      '{correlationId}': entry.correlationId || ''
    };

    for (const [placeholder, value] of Object.entries(replacements)) {
      result = result.replace(new RegExp(placeholder, 'g'), value);
    }

    // 处理条件格式化
    result = result.replace(/\{if:(\w+)\}(.+?)\{endif\}/g, (match, field, content) => {
      const fieldValue = (entry as any)[field];
      return fieldValue ? content : '';
    });

    return result;
  }

  setTemplate(template: string): void {
    this.template = template;
  }

  getTemplate(): string {
    return this.template;
  }
}

/**
 * 模式格式化器（支持多个格式化器轮换）
 */
export class PatternFormatter extends BaseFormatter {
  public readonly name = 'pattern';
  private patterns: Array<{
    condition: (entry: ILogEntry) => boolean;
    formatter: ILogFormatter;
  }> = [];
  private defaultFormatter: ILogFormatter;

  constructor(defaultFormatter: ILogFormatter) {
    super();
    this.defaultFormatter = defaultFormatter;
  }

  format(entry: ILogEntry): string {
    // 查找匹配的模式
    for (const pattern of this.patterns) {
      if (pattern.condition(entry)) {
        return pattern.formatter.format(entry);
      }
    }

    // 使用默认格式化器
    return this.defaultFormatter.format(entry);
  }

  addPattern(
    condition: (entry: ILogEntry) => boolean,
    formatter: ILogFormatter
  ): void {
    this.patterns.push({ condition, formatter });
  }

  removePattern(index: number): void {
    if (index >= 0 && index < this.patterns.length) {
      this.patterns.splice(index, 1);
    }
  }

  getPatterns(): Array<{
    condition: (entry: ILogEntry) => boolean;
    formatter: ILogFormatter;
  }> {
    return [...this.patterns];
  }

  clearPatterns(): void {
    this.patterns = [];
  }

  setDefaultFormatter(formatter: ILogFormatter): void {
    this.defaultFormatter = formatter;
  }
}

/**
 * 预定义的格式化器常量
 */
export const Formatters = {
  SIMPLE: new SimpleFormatter(),
  DETAILED: new DetailedFormatter(),
  JSON: new JsonFormatter(),
  JSON_PRETTY: new JsonFormatter({ prettyPrint: true }),
  STRUCTURED: new StructuredFormatter(),
  COLOR: new ColorFormatter(),
  COLOR_NO_COLOR: ColorFormatter.noColor(),
  TEMPLATE_COMPACT: new TemplateFormatter('{timestamp} {level} {message}'),
  TEMPLATE_DETAILED: new TemplateFormatter(
    '{timestamp} [{level}] [{source}] {message}{if:tags} [{tags}]{endif}'
  )
};

/**
 * 创建格式化器的工厂函数
 */
export function createFormatter(
  type: 'simple' | 'detailed' | 'json' | 'structured' | 'color' | 'template',
  options?: any
): ILogFormatter {
  switch (type) {
    case 'simple':
      return new SimpleFormatter();
    case 'detailed':
      return new DetailedFormatter(options);
    case 'json':
      return new JsonFormatter(options);
    case 'structured':
      return new StructuredFormatter();
    case 'color':
      return new ColorFormatter();
    case 'template':
      return new TemplateFormatter(options?.template || '{timestamp} {level} {message}');
    default:
      return new SimpleFormatter();
  }
}