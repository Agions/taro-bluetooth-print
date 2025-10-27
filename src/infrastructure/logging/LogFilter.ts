/**
 * 日志过滤器实现
 */

import {
  ILogFilter,
  ILogEntry,
  LogLevel,
  ILogContext
} from './types';

/**
 * 基础过滤器
 */
export abstract class BaseFilter implements ILogFilter {
  public abstract readonly name: string;

  abstract shouldLog(entry: ILogEntry): boolean;
}

/**
 * 级别过滤器
 */
export class LevelFilter extends BaseFilter {
  public readonly name: string;
  private minLevel: LogLevel;

  constructor(minLevel: LogLevel) {
    super();
    this.name = `level-filter-${LogLevel[minLevel]}`;
    this.minLevel = minLevel;
  }

  shouldLog(entry: ILogEntry): boolean {
    return entry.level >= this.minLevel;
  }

  setLevel(level: LogLevel): void {
    this.minLevel = level;
  }

  getLevel(): LogLevel {
    return this.minLevel;
  }
}

/**
 * 标签过滤器
 */
export class TagFilter extends BaseFilter {
  public readonly name: string;
  private allowedTags: Set<string>;
  private deniedTags: Set<string>;
  private mode: 'allow' | 'deny';

  constructor(
    tags: string[],
    mode: 'allow' | 'deny' = 'allow'
  ) {
    super();
    this.name = `tag-filter-${mode}`;
    this.mode = mode;
    this.allowedTags = new Set(mode === 'allow' ? tags : []);
    this.deniedTags = new Set(mode === 'deny' ? tags : []);
  }

  shouldLog(entry: ILogEntry): boolean {
    if (!entry.tags || entry.tags.length === 0) {
      return this.mode === 'allow' && this.allowedTags.size === 0;
    }

    if (this.mode === 'allow') {
      return entry.tags.some(tag => this.allowedTags.has(tag));
    } else {
      return !entry.tags.some(tag => this.deniedTags.has(tag));
    }
  }

  addTag(tag: string): void {
    if (this.mode === 'allow') {
      this.allowedTags.add(tag);
    } else {
      this.deniedTags.add(tag);
    }
  }

  removeTag(tag: string): void {
    if (this.mode === 'allow') {
      this.allowedTags.delete(tag);
    } else {
      this.deniedTags.delete(tag);
    }
  }

  getTags(): string[] {
    return Array.from(this.mode === 'allow' ? this.allowedTags : this.deniedTags);
  }
}

/**
 * 来源过滤器
 */
export class SourceFilter extends BaseFilter {
  public readonly name: string;
  private allowedSources: Set<string>;
  private deniedSources: Set<string>;
  private mode: 'allow' | 'deny';

  constructor(
    sources: string[],
    mode: 'allow' | 'deny' = 'allow'
  ) {
    super();
    this.name = `source-filter-${mode}`;
    this.mode = mode;
    this.allowedSources = new Set(mode === 'allow' ? sources : []);
    this.deniedSources = new Set(mode === 'deny' ? sources : []);
  }

  shouldLog(entry: ILogEntry): boolean {
    const source = entry.source || 'unknown';

    if (this.mode === 'allow') {
      return this.allowedSources.size === 0 || this.allowedSources.has(source);
    } else {
      return !this.deniedSources.has(source);
    }
  }

  addSource(source: string): void {
    if (this.mode === 'allow') {
      this.allowedSources.add(source);
    } else {
      this.deniedSources.add(source);
    }
  }

  removeSource(source: string): void {
    if (this.mode === 'allow') {
      this.allowedSources.delete(source);
    } else {
      this.deniedSources.delete(source);
    }
  }

  getSources(): string[] {
    return Array.from(this.mode === 'allow' ? this.allowedSources : this.deniedSources);
  }
}

/**
 * 消息模式过滤器
 */
export class MessagePatternFilter extends BaseFilter {
  public readonly name: string;
  private patterns: Array<{
    pattern: RegExp;
    action: 'include' | 'exclude';
  }>;

  constructor() {
    super();
    this.name = 'message-pattern-filter';
    this.patterns = [];
  }

  shouldLog(entry: ILogEntry): boolean {
    for (const { pattern, action } of this.patterns) {
      if (pattern.test(entry.message)) {
        return action === 'include';
      }
    }
    return true; // 默认包含
  }

  addPattern(pattern: RegExp, action: 'include' | 'exclude' = 'include'): void {
    this.patterns.push({ pattern, action });
  }

  removePattern(index: number): void {
    if (index >= 0 && index < this.patterns.length) {
      this.patterns.splice(index, 1);
    }
  }

  getPatterns(): Array<{ pattern: RegExp; action: 'include' | 'exclude' }> {
    return [...this.patterns];
  }

  clearPatterns(): void {
    this.patterns = [];
  }
}

/**
 * 时间范围过滤器
 */
export class TimeRangeFilter extends BaseFilter {
  public readonly name: string;
  private startTime?: Date;
  private endTime?: Date;

  constructor(startTime?: Date, endTime?: Date) {
    super();
    this.name = 'time-range-filter';
    this.startTime = startTime;
    this.endTime = endTime;
  }

  shouldLog(entry: ILogEntry): boolean {
    const entryTime = new Date(entry.timestamp);

    if (this.startTime && entryTime < this.startTime) {
      return false;
    }

    if (this.endTime && entryTime > this.endTime) {
      return false;
    }

    return true;
  }

  setTimeRange(startTime?: Date, endTime?: Date): void {
    this.startTime = startTime;
    this.endTime = endTime;
  }

  getTimeRange(): { startTime?: Date; endTime?: Date } {
    return {
      startTime: this.startTime,
      endTime: this.endTime
    };
  }
}

/**
 * 错误类型过滤器
 */
export class ErrorTypeFilter extends BaseFilter {
  public readonly name: string;
  private allowedErrorTypes: Set<string>;
  private deniedErrorTypes: Set<string>;
  private mode: 'allow' | 'deny';

  constructor(
    errorTypes: string[],
    mode: 'allow' | 'deny' = 'deny'
  ) {
    super();
    this.name = `error-type-filter-${mode}`;
    this.mode = mode;
    this.allowedErrorTypes = new Set(mode === 'allow' ? errorTypes : []);
    this.deniedErrorTypes = new Set(mode === 'deny' ? errorTypes : []);
  }

  shouldLog(entry: ILogEntry): boolean {
    if (!entry.error) {
      return true;
    }

    const errorType = entry.error.name;

    if (this.mode === 'allow') {
      return this.allowedErrors.size === 0 || this.allowedErrorTypes.has(errorType);
    } else {
      return !this.deniedErrorTypes.has(errorType);
    }
  }

  addErrorType(errorType: string): void {
    if (this.mode === 'allow') {
      this.allowedErrorTypes.add(errorType);
    } else {
      this.deniedErrorTypes.add(errorType);
    }
  }

  removeErrorType(errorType: string): void {
    if (this.mode === 'allow') {
      this.allowedErrorTypes.delete(errorType);
    } else {
      this.deniedErrorTypes.delete(errorType);
    }
  }

  getErrorTypes(): string[] {
    return Array.from(this.mode === 'allow' ? this.allowedErrorTypes : this.deniedErrorTypes);
  }
}

/**
 * 重复日志过滤器
 */
export class DuplicateFilter extends BaseFilter {
  public readonly name: string;
  private recentMessages: Map<string, number> = new Map();
  private windowMs: number;
  private maxDuplicates: number;

  constructor(windowMs: number = 5000, maxDuplicates: number = 3) {
    super();
    this.name = 'duplicate-filter';
    this.windowMs = windowMs;
    this.maxDuplicates = maxDuplicates;

    // 定期清理过期的记录
    setInterval(() => {
      this.cleanup();
    }, this.windowMs);
  }

  shouldLog(entry: ILogEntry): boolean {
    const key = this.generateKey(entry);
    const now = Date.now();
    const lastSeen = this.recentMessages.get(key);

    if (!lastSeen) {
      this.recentMessages.set(key, now);
      return true;
    }

    const timeDiff = now - lastSeen;
    if (timeDiff > this.windowMs) {
      this.recentMessages.set(key, now);
      return true;
    }

    return false;
  }

  private generateKey(entry: ILogEntry): string {
    return `${entry.level}:${entry.source || 'unknown'}:${entry.message}`;
  }

  private cleanup(): void {
    const now = Date.now();
    const cutoff = now - this.windowMs;

    for (const [key, timestamp] of this.recentMessages.entries()) {
      if (timestamp < cutoff) {
        this.recentMessages.delete(key);
      }
    }
  }

  clear(): void {
    this.recentMessages.clear();
  }

  setWindowMs(windowMs: number): void {
    this.windowMs = windowMs;
  }

  setMaxDuplicates(maxDuplicates: number): void {
    this.maxDuplicates = maxDuplicates;
  }
}

/**
 * 自定义过滤器
 */
export class CustomFilter extends BaseFilter {
  public readonly name: string;
  private filterFn: (entry: ILogEntry) => boolean;

  constructor(name: string, filterFn: (entry: ILogEntry) => boolean) {
    super();
    this.name = name;
    this.filterFn = filterFn;
  }

  shouldLog(entry: ILogEntry): boolean {
    return this.filterFn(entry);
  }

  setFilterFn(filterFn: (entry: ILogEntry) => boolean): void {
    this.filterFn = filterFn;
  }
}

/**
 * 复合过滤器（AND逻辑）
 */
export class AndFilter extends BaseFilter {
  public readonly name: string;
  private filters: ILogFilter[];

  constructor(...filters: ILogFilter[]) {
    super();
    this.name = 'and-filter';
    this.filters = filters;
  }

  shouldLog(entry: ILogEntry): boolean {
    return this.filters.every(filter => filter.shouldLog(entry));
  }

  addFilter(filter: ILogFilter): void {
    this.filters.push(filter);
  }

  removeFilter(filterName: string): void {
    this.filters = this.filters.filter(f => f.name !== filterName);
  }

  getFilters(): ILogFilter[] {
    return [...this.filters];
  }
}

/**
 * 复合过滤器（OR逻辑）
 */
export class OrFilter extends BaseFilter {
  public readonly name: string;
  private filters: ILogFilter[];

  constructor(...filters: ILogFilter[]) {
    super();
    this.name = 'or-filter';
    this.filters = filters;
  }

  shouldLog(entry: ILogEntry): boolean {
    return this.filters.some(filter => filter.shouldLog(entry));
  }

  addFilter(filter: ILogFilter): void {
    this.filters.push(filter);
  }

  removeFilter(filterName: string): void {
    this.filters = this.filters.filter(f => f.name !== filterName);
  }

  getFilters(): ILogFilter[] {
    return [...this.filters];
  }
}

/**
 * 上下文过滤器
 */
export class ContextFilter extends BaseFilter {
  public readonly name: string;
  private contextFilters: Array<{
    key: string;
    value: any;
    operator: 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'regex';
  }> = [];

  constructor() {
    super();
    this.name = 'context-filter';
  }

  shouldLog(entry: ILogEntry): boolean {
    for (const filter of this.contextFilters) {
      const contextValue = this.getContextValue(entry, filter.key);

      if (!this.matchesFilter(contextValue, filter.value, filter.operator)) {
        return false;
      }
    }
    return true;
  }

  addContextFilter(
    key: string,
    value: any,
    operator: 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'regex' = 'equals'
  ): void {
    this.contextFilters.push({ key, value, operator });
  }

  removeContextFilter(index: number): void {
    if (index >= 0 && index < this.contextFilters.length) {
      this.contextFilters.splice(index, 1);
    }
  }

  getContextFilters(): Array<{
    key: string;
    value: any;
    operator: 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'regex';
  }> {
    return [...this.contextFilters];
  }

  clearContextFilters(): void {
    this.contextFilters = [];
  }

  private getContextValue(entry: ILogEntry, key: string): any {
    const parts = key.split('.');
    let current: any = entry;

    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        return undefined;
      }
    }

    return current;
  }

  private matchesFilter(
    actualValue: any,
    expectedValue: any,
    operator: 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'regex'
  ): boolean {
    switch (operator) {
      case 'equals':
        return actualValue === expectedValue;
      case 'contains':
        return typeof actualValue === 'string' &&
               actualValue.includes(expectedValue);
      case 'startsWith':
        return typeof actualValue === 'string' &&
               actualValue.startsWith(expectedValue);
      case 'endsWith':
        return typeof actualValue === 'string' &&
               actualValue.endsWith(expectedValue);
      case 'regex':
        return typeof actualValue === 'string' &&
               expectedValue instanceof RegExp &&
               expectedValue.test(actualValue);
      default:
        return false;
    }
  }
}