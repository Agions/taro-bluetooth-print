/**
 * 打印模板管理器
 * 管理和注册打印模板
 */

import { PrintTemplate } from './base';
import { ReceiptTemplate } from './receipt';
import { logger } from '../../utils/logger';
import { PrinterError, ErrorCode } from '../../types';

// 模板构造函数类型
type TemplateConstructor<T = any> = new (data: T, name?: string) => PrintTemplate<T>;

/**
 * 模板管理器类
 * 用于注册和获取打印模板
 */
export class TemplateManager {
  private static instance: TemplateManager;
  private templates: Map<string, TemplateConstructor> = new Map();
  
  private constructor() {
    // 注册内置模板
    this.registerBuiltinTemplates();
  }
  
  /**
   * 获取模板管理器单例
   */
  public static getInstance(): TemplateManager {
    if (!TemplateManager.instance) {
      TemplateManager.instance = new TemplateManager();
    }
    return TemplateManager.instance;
  }
  
  /**
   * 注册内置模板
   */
  private registerBuiltinTemplates(): void {
    // 注册收据模板
    this.register('receipt', ReceiptTemplate);
    
    logger.debug('内置打印模板已注册');
  }
  
  /**
   * 注册模板
   * @param name 模板名称
   * @param templateClass 模板类
   */
  public register<T>(name: string, templateClass: TemplateConstructor<T>): void {
    this.templates.set(name.toLowerCase(), templateClass);
    logger.debug(`模板 "${name}" 已注册`);
  }
  
  /**
   * 获取模板实例
   * @param name 模板名称
   * @param data 模板数据
   * @throws 如果模板不存在则抛出错误
   */
  public getTemplate<T>(name: string, data: T): PrintTemplate<T> {
    const templateName = name.toLowerCase();
    const TemplateClass = this.templates.get(templateName);
    
    if (!TemplateClass) {
      const error = new PrinterError(
        ErrorCode.PRINTER_INVALID_FORMAT,
        `模板 "${name}" 不存在`
      );
      logger.error(error.message);
      throw error;
    }
    
    return new TemplateClass(data, name);
  }
  
  /**
   * 检查模板是否存在
   * @param name 模板名称
   */
  public hasTemplate(name: string): boolean {
    return this.templates.has(name.toLowerCase());
  }
  
  /**
   * 获取所有已注册模板名称
   */
  public getTemplateNames(): string[] {
    return Array.from(this.templates.keys());
  }
  
  /**
   * 取消注册模板
   * @param name 模板名称
   */
  public unregister(name: string): boolean {
    return this.templates.delete(name.toLowerCase());
  }
}

// 导出模板管理器实例
export const templateManager = TemplateManager.getInstance();

// 导出模板类
export { PrintTemplate } from './base';
export { ReceiptTemplate } from './receipt'; 