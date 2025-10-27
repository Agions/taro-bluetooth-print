/**
 * 模板引擎核心实现
 */

import {
  ITemplateEngine,
  ITemplate,
  ITemplateContext,
  ITemplateRenderer,
  ITemplateFunction,
  ITemplateFilter,
  ITemplateCache,
  ITemplateConfig,
  TemplateType
} from './types';
import { EventEmitter } from 'events';
import { Logger } from '../../infrastructure/logging';

/**
 * 模板引擎核心实现
 */
export class TemplateEngine extends EventEmitter implements ITemplateEngine {
  /** 引擎名称 */
  public readonly name: string;

  /** 引擎版本 */
  public readonly version: string;

  /** 引擎配置 */
  private config: ITemplateConfig;

  /** 模板缓存 */
  private cache: ITemplateCache;

  /** 注册的模板 */
  private templates: Map<string, ITemplate> = new Map();

  /** 注册的渲染器 */
  private renderers: Map<TemplateType, ITemplateRenderer> = new Map();

  /** 注册的函数 */
  private functions: Map<string, ITemplateFunction> = new Map();

  /** 注册的过滤器 */
  private filters: Map<string, ITemplateFilter> = new Map();

  /** 日志记录器 */
  private logger: Logger;

  /** 是否已初始化 */
  private initialized: boolean = false;

  constructor(
    name: string,
    version: string = '1.0.0',
    config?: Partial<ITemplateConfig>
  ) {
    super();
    this.name = name;
    this.version = version;
    this.config = this.mergeConfig(config);
    this.cache = this.createCache();
    this.logger = new Logger(`TemplateEngine-${name}`);

    this.initialize();
  }

  /**
   * 注册模板
   */
  public async registerTemplate(template: ITemplate): Promise<void> {
    try {
      // 验证模板
      this.validateTemplate(template);

      // 添加到模板列表
      this.templates.set(template.id, template);

      // 预编译模板（如果需要）
      if (this.config.precompile) {
        await this.precompileTemplate(template);
      }

      this.emit('templateRegistered', template);
      this.logger.info('Template registered', { templateId: template.id, name: template.name });
    } catch (error) {
      this.logger.error('Failed to register template', error, { templateId: template.id });
      throw error;
    }
  }

  /**
   * 注销模板
   */
  public async unregisterTemplate(templateId: string): Promise<void> {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }

    try {
      // 清除缓存
      this.cache.clear(templateId);

      // 从模板列表移除
      this.templates.delete(templateId);

      this.emit('templateUnregistered', template);
      this.logger.info('Template unregistered', { templateId });
    } catch (error) {
      this.logger.error('Failed to unregister template', error, { templateId });
      throw error;
    }
  }

  /**
   * 获取模板
   */
  public getTemplate(templateId: string): ITemplate | undefined {
    return this.templates.get(templateId);
  }

  /**
   * 按名称获取模板
   */
  public getTemplateByName(name: string): ITemplate | undefined {
    for (const template of this.templates.values()) {
      if (template.name === name) {
        return template;
      }
    }
    return undefined;
  }

  /**
   * 获取所有模板
   */
  public getTemplates(): ITemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * 按类型获取模板
   */
  public getTemplatesByType(type: TemplateType): ITemplate[] {
    return Array.from(this.templates.values()).filter(template => template.type === type);
  }

  /**
   * 注册渲染器
   */
  public registerRenderer(type: TemplateType, renderer: ITemplateRenderer): void {
    this.renderers.set(type, renderer);
    this.logger.info('Renderer registered', { type, renderer: renderer.name });
  }

  /**
   * 注销渲染器
   */
  public unregisterRenderer(type: TemplateType): void {
    this.renderers.delete(type);
    this.logger.info('Renderer unregistered', { type });
  }

  /**
   * 注册函数
   */
  public registerFunction(name: string, func: ITemplateFunction): void {
    this.functions.set(name, func);
    this.logger.info('Function registered', { name, function: func.name });
  }

  /**
   * 注销函数
   */
  public unregisterFunction(name: string): void {
    this.functions.delete(name);
    this.logger.info('Function unregistered', { name });
  }

  /**
   * 注册过滤器
   */
  public registerFilter(name: string, filter: ITemplateFilter): void {
    this.filters.set(name, filter);
    this.logger.info('Filter registered', { name, filter: filter.name });
  }

  /**
   * 注销过滤器
   */
  public unregisterFilter(name: string): void {
    this.filters.delete(name);
    this.logger.info('Filter unregistered', { name });
  }

  /**
   * 渲染模板
   */
  public async render(
    templateId: string,
    data: any,
    context?: Partial<ITemplateContext>
  ): Promise<ArrayBuffer> {
    try {
      const template = this.templates.get(templateId);
      if (!template) {
        throw new Error(`Template ${templateId} not found`);
      }

      // 创建渲染上下文
      const renderContext = this.createContext(context);

      // 检查缓存
      if (this.config.enableCache && this.config.cacheStrategy !== 'none') {
        const cacheKey = this.generateCacheKey(templateId, data, renderContext);
        const cached = this.cache.get(cacheKey);
        if (cached) {
          this.emit('templateCacheHit', { templateId, cacheKey });
          return cached;
        }
      }

      // 渲染模板
      const result = await this.renderTemplate(template, data, renderContext);

      // 缓存结果
      if (this.config.enableCache && this.config.cacheStrategy !== 'none') {
        const cacheKey = this.generateCacheKey(templateId, data, renderContext);
        this.cache.set(cacheKey, result);
      }

      this.emit('templateRendered', { templateId, size: result.byteLength });
      this.logger.debug('Template rendered', { templateId, size: result.byteLength });

      return result;
    } catch (error) {
      this.logger.error('Template render failed', error, { templateId });
      this.emit('templateRenderError', { templateId, error });
      throw error;
    }
  }

  /**
   * 批量渲染模板
   */
  public async renderBatch(
    requests: Array<{
      templateId: string;
      data: any;
      context?: Partial<ITemplateContext>;
    }>
  ): Promise<ArrayBuffer[]> {
    try {
      const renderPromises = requests.map(request =>
        this.render(request.templateId, request.data, request.context)
      );

      const results = await Promise.all(renderPromises);

      this.emit('templateBatchRendered', { count: requests.length });
      this.logger.info('Batch template render completed', { count: requests.length });

      return results;
    } catch (error) {
      this.logger.error('Batch template render failed', error);
      this.emit('templateBatchRenderError', { error, count: requests.length });
      throw error;
    }
  }

  /**
   * 验证模板
   */
  public async validateTemplate(templateId: string): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }

    try {
      const errors: string[] = [];
      const warnings: string[] = [];

      // 基本验证
      if (!template.name) {
        errors.push('Template name is required');
      }

      if (!template.content) {
        errors.push('Template content is required');
      }

      // 渲染器验证
      const renderer = this.renderers.get(template.type);
      if (!renderer) {
        errors.push(`No renderer found for template type: ${template.type}`);
      } else {
        const rendererValidation = await renderer.validate(template);
        errors.push(...rendererValidation.errors);
        warnings.push(...rendererValidation.warnings);
      }

      // 模板语法验证
      if (template.type === TemplateType.TEXT) {
        const syntaxValidation = this.validateTextTemplate(template);
        errors.push(...syntaxValidation.errors);
        warnings.push(...syntaxValidation.warnings);
      }

      const result = {
        valid: errors.length === 0,
        errors,
        warnings
      };

      this.emit('templateValidated', { templateId, result });
      return result;
    } catch (error) {
      this.logger.error('Template validation failed', error, { templateId });
      throw error;
    }
  }

  /**
   * 预编译模板
   */
  public async precompileAll(): Promise<void> {
    if (!this.config.precompile) {
      return;
    }

    try {
      const precompilePromises = Array.from(this.templates.values()).map(async template => {
        try {
          await this.precompileTemplate(template);
        } catch (error) {
          this.logger.error('Template precompile failed', error, { templateId: template.id });
        }
      });

      await Promise.all(precompilePromises);

      this.emit('allTemplatesPrecompiled');
      this.logger.info('All templates precompiled');
    } catch (error) {
      this.logger.error('Template precompile failed', error);
      throw error;
    }
  }

  /**
   * 清空缓存
   */
  public clearCache(templateId?: string): void {
    if (templateId) {
      this.cache.clear(templateId);
      this.logger.info('Template cache cleared', { templateId });
    } else {
      this.cache.clearAll();
      this.logger.info('All template cache cleared');
    }
  }

  /**
   * 获取引擎统计信息
   */
  public getStats(): {
    templates: number;
    renderers: number;
    functions: number;
    filters: number;
    cacheStats: {
      size: number;
      hits: number;
      misses: number;
      hitRate: number;
    };
    config: ITemplateConfig;
  } {
    return {
      templates: this.templates.size,
      renderers: this.renderers.size,
      functions: this.functions.size,
      filters: this.filters.size,
      cacheStats: this.cache.getStats(),
      config: { ...this.config }
    };
  }

  /**
   * 更新配置
   */
  public updateConfig(config: Partial<ITemplateConfig>): void {
    this.config = { ...this.config, ...config };

    // 重新创建缓存
    if (config.enableCache !== undefined || config.cacheSize !== undefined) {
      this.cache.dispose();
      this.cache = this.createCache();
    }

    this.emit('configUpdated', this.config);
    this.logger.info('Engine config updated', this.config);
  }

  /**
   * 销毁引擎
   */
  public dispose(): Promise<void> {
    return new Promise((resolve) => {
      // 清空缓存
      this.cache.dispose();

      // 清理资源
      this.templates.clear();
      this.renderers.clear();
      this.functions.clear();
      this.filters.clear();
      this.removeAllListeners();

      this.initialized = false;
      this.emit('disposed');
      this.logger.info('Template engine disposed');

      resolve();
    });
  }

  // 私有方法

  /**
   * 初始化引擎
   */
  private async initialize(): Promise<void> {
    try {
      // 注册默认函数
      this.registerDefaultFunctions();

      // 注册默认过滤器
      this.registerDefaultFilters();

      // 注册默认渲染器
      await this.registerDefaultRenderers();

      this.initialized = true;
      this.emit('initialized');
      this.logger.info('Template engine initialized');
    } catch (error) {
      this.logger.error('Failed to initialize template engine', error);
      throw error;
    }
  }

  /**
   * 合并配置
   */
  private mergeConfig(config?: Partial<ITemplateConfig>): ITemplateConfig {
    return {
      enableCache: true,
      cacheSize: 100,
      cacheStrategy: 'lru',
      cacheTimeout: 300000, // 5分钟
      precompile: false,
      enableValidation: true,
      enableCompression: false,
      maxTemplateSize: 1024 * 1024, // 1MB
      maxRenderTime: 10000, // 10秒
      ...config
    };
  }

  /**
   * 创建缓存
   */
  private createCache(): ITemplateCache {
    return new MemoryCache(this.config.cacheSize, this.config.cacheTimeout);
  }

  /**
   * 验证模板
   */
  private validateTemplate(template: ITemplate): void {
    if (!template.id) {
      throw new Error('Template ID is required');
    }

    if (!template.name) {
      throw new Error('Template name is required');
    }

    if (!Object.values(TemplateType).includes(template.type)) {
      throw new Error(`Invalid template type: ${template.type}`);
    }

    if (this.templates.has(template.id)) {
      throw new Error(`Template with ID ${template.id} already exists`);
    }

    if (!this.renderers.has(template.type)) {
      throw new Error(`No renderer found for template type: ${template.type}`);
    }

    if (template.content && this.config.maxTemplateSize) {
      const size = this.getTemplateSize(template.content);
      if (size > this.config.maxTemplateSize) {
        throw new Error(`Template size ${size} exceeds maximum ${this.config.maxTemplateSize}`);
      }
    }
  }

  /**
   * 预编译模板
   */
  private async precompileTemplate(template: ITemplate): Promise<void> {
    const renderer = this.renderers.get(template.type);
    if (renderer && renderer.precompile) {
      await renderer.precompile(template);
    }
  }

  /**
   * 创建渲染上下文
   */
  private createContext(context?: Partial<ITemplateContext>): ITemplateContext {
    return {
      engine: this,
      functions: this.functions,
      filters: this.filters,
      config: this.config,
      locale: 'zh-CN',
      timezone: 'Asia/Shanghai',
      timestamp: new Date(),
      ...context
    };
  }

  /**
   * 渲染模板
   */
  private async renderTemplate(
    template: ITemplate,
    data: any,
    context: ITemplateContext
  ): Promise<ArrayBuffer> {
    const renderer = this.renderers.get(template.type);
    if (!renderer) {
      throw new Error(`No renderer found for template type: ${template.type}`);
    }

    // 设置超时
    const renderPromise = renderer.render(template, data, context);
    const timeoutPromise = new Promise<ArrayBuffer>((_, reject) => {
      setTimeout(() => reject(new Error('Template render timeout')), this.config.maxRenderTime);
    });

    return Promise.race([renderPromise, timeoutPromise]);
  }

  /**
   * 验证文本模板
   */
  private validateTextTemplate(template: ITemplate): {
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (typeof template.content === 'string') {
      const content = template.content as string;

      // 检查未闭合的变量
      const variablePattern = /\{\{([^}]+)\}\}/g;
      const variables = content.match(variablePattern) || [];

      for (const variable of variables) {
        if (!variable.includes('}}')) {
          errors.push(`Unclosed variable: ${variable}`);
        }
      }

      // 检查未知的函数调用
      const functionPattern = /\{\{\s*(\w+)\s*\(/g;
      let match;
      while ((match = functionPattern.exec(content)) !== null) {
        const functionName = match[1];
        if (!this.functions.has(functionName)) {
          warnings.push(`Unknown function: ${functionName}`);
        }
      }

      // 检查未知的过滤器
      const filterPattern = /\|\s*(\w+)\s*(?:\(|$)/g;
      while ((match = filterPattern.exec(content)) !== null) {
        const filterName = match[1];
        if (!this.filters.has(filterName)) {
          warnings.push(`Unknown filter: ${filterName}`);
        }
      }
    }

    return { errors, warnings };
  }

  /**
   * 生成缓存键
   */
  private generateCacheKey(templateId: string, data: any, context: ITemplateContext): string {
    const dataHash = this.hashObject(data);
    const contextHash = this.hashObject({
      locale: context.locale,
      timezone: context.timezone
    });
    return `${templateId}_${dataHash}_${contextHash}`;
  }

  /**
   * 哈希对象
   */
  private hashObject(obj: any): string {
    const str = JSON.stringify(obj);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * 获取模板大小
   */
  private getTemplateSize(content: any): number {
    if (typeof content === 'string') {
      return new Blob([content]).size;
    } else if (content instanceof ArrayBuffer) {
      return content.byteLength;
    } else if (Array.isArray(content)) {
      return content.reduce((total, item) => total + this.getTemplateSize(item), 0);
    } else if (typeof content === 'object' && content !== null) {
      return new Blob([JSON.stringify(content)]).size;
    }
    return 0;
  }

  /**
   * 注册默认函数
   */
  private registerDefaultFunctions(): void {
    // 日期时间函数
    this.registerFunction('now', {
      name: 'now',
      description: 'Get current timestamp',
      execute: () => new Date(),
      async: false
    });

    this.registerFunction('formatDate', {
      name: 'formatDate',
      description: 'Format date string',
      execute: (date: Date, format?: string) => {
        if (!date) return '';
        if (format === 'iso') return date.toISOString();
        if (format === 'date') return date.toLocaleDateString();
        if (format === 'time') return date.toLocaleTimeString();
        return date.toLocaleString();
      },
      async: false
    });

    // 字符串函数
    this.registerFunction('upper', {
      name: 'upper',
      description: 'Convert to uppercase',
      execute: (text: string) => text ? text.toUpperCase() : '',
      async: false
    });

    this.registerFunction('lower', {
      name: 'lower',
      description: 'Convert to lowercase',
      execute: (text: string) => text ? text.toLowerCase() : '',
      async: false
    });

    this.registerFunction('trim', {
      name: 'trim',
      description: 'Trim whitespace',
      execute: (text: string) => text ? text.trim() : '',
      async: false
    });

    // 数学函数
    this.registerFunction('add', {
      name: 'add',
      description: 'Add two numbers',
      execute: (a: number, b: number) => (a || 0) + (b || 0),
      async: false
    });

    this.registerFunction('multiply', {
      name: 'multiply',
      description: 'Multiply two numbers',
      execute: (a: number, b: number) => (a || 0) * (b || 0),
      async: false
    });

    // 数组函数
    this.registerFunction('join', {
      name: 'join',
      description: 'Join array elements',
      execute: (array: any[], separator: string = ',') => Array.isArray(array) ? array.join(separator) : '',
      async: false
    });

    this.registerFunction('length', {
      name: 'length',
      description: 'Get array or string length',
      execute: (value: any) => {
        if (Array.isArray(value)) return value.length;
        if (typeof value === 'string') return value.length;
        if (value && typeof value === 'object') return Object.keys(value).length;
        return 0;
      },
      async: false
    });
  }

  /**
   * 注册默认过滤器
   */
  private registerDefaultFilters(): void {
    this.registerFilter('default', {
      name: 'default',
      description: 'Provide default value',
      execute: (value: any, defaultValue: any) => value !== null && value !== undefined ? value : defaultValue,
      async: false
    });

    this.registerFilter('number', {
      name: 'number',
      description: 'Format number',
      execute: (value: any, decimals?: number) => {
        const num = Number(value);
        if (isNaN(num)) return '0';
        return decimals !== undefined ? num.toFixed(decimals) : num.toString();
      },
      async: false
    });

    this.registerFilter('currency', {
      name: 'currency',
      description: 'Format currency',
      execute: (value: any, currency: string = '¥') => {
        const num = Number(value);
        if (isNaN(num)) return `${currency}0.00`;
        return `${currency}${num.toFixed(2)}`;
      },
      async: false
    });

    this.registerFilter('date', {
      name: 'date',
      description: 'Format date',
      execute: (value: any, format?: string) => {
        const date = new Date(value);
        if (isNaN(date.getTime())) return '';
        if (format === 'iso') return date.toISOString();
        if (format === 'date') return date.toLocaleDateString();
        if (format === 'time') return date.toLocaleTimeString();
        return date.toLocaleString();
      },
      async: false
    });
  }

  /**
   * 注册默认渲染器
   */
  private async registerDefaultRenderers(): Promise<void> {
    // 文本模板渲染器
    this.registerRenderer(TemplateType.TEXT, new TextTemplateRenderer());

    // 收据模板渲染器
    this.registerRenderer(TemplateType.RECEIPT, new ReceiptTemplateRenderer());

    // 标签模板渲染器
    this.registerRenderer(TemplateType.LABEL, new LabelTemplateRenderer());
  }
}

/**
 * 内存缓存实现
 */
class MemoryCache implements ITemplateCache {
  private cache: Map<string, { data: ArrayBuffer; timestamp: number }>;
  private maxSize: number;
  private timeout: number;
  private hits = 0;
  private misses = 0;

  constructor(maxSize: number, timeout: number) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.timeout = timeout;
  }

  get(key: string): ArrayBuffer | undefined {
    const item = this.cache.get(key);
    if (!item) {
      this.misses++;
      return undefined;
    }

    if (Date.now() - item.timestamp > this.timeout) {
      this.cache.delete(key);
      this.misses++;
      return undefined;
    }

    this.hits++;
    return item.data;
  }

  set(key: string, data: ArrayBuffer): void {
    // 如果缓存已满，删除最旧的条目
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  clear(key?: string): void {
    if (key) {
      this.cache.delete(key);
    } else {
      this.cache.clear();
    }
  }

  clearAll(): void {
    this.cache.clear();
  }

  getStats(): { size: number; hits: number; misses: number; hitRate: number } {
    const total = this.hits + this.misses;
    return {
      size: this.cache.size,
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? (this.hits / total) * 100 : 0
    };
  }

  dispose(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }
}

// 导入渲染器类（需要创建）
import { TextTemplateRenderer } from './renderers/TextTemplateRenderer';
import { ReceiptTemplateRenderer } from './renderers/ReceiptTemplateRenderer';
import { LabelTemplateRenderer } from './renderers/LabelTemplateRenderer';