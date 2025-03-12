/**
 * 打印模板系统基类
 * 提供可扩展的模板结构
 */

import { Commands } from '../commands';
import { textToBuffer } from '../../utils/encoding';
import { logger } from '../../utils/logger';
import { TextOptions } from '../../types';

/**
 * 打印模板基类
 * 所有打印模板都应继承此类
 */
export abstract class PrintTemplate<T = any> {
  // 模板数据
  protected data: T;
  // 模板命令缓存
  protected commands: Uint8Array[] = [];
  // 模板名称
  protected name: string;
  
  /**
   * 创建打印模板实例
   * @param data 模板数据
   * @param name 模板名称（默认为类名）
   */
  constructor(data: T, name?: string) {
    this.data = data;
    this.name = name || this.constructor.name;
  }
  
  /**
   * 构建打印命令
   * 子类必须实现此方法
   */
  public abstract build(): Promise<Uint8Array[]>;
  
  /**
   * 获取模板名称
   */
  public getName(): string {
    return this.name;
  }
  
  /**
   * 设置模板数据
   * @param data 模板数据
   */
  public setData(data: T): void {
    this.data = data;
    this.commands = []; // 清除命令缓存
  }
  
  /**
   * 获取模板数据
   */
  public getData(): T {
    return this.data;
  }
  
  /**
   * 重置模板状态
   */
  public reset(): void {
    this.commands = [];
  }
  
  // ---------- 辅助方法 ----------
  
  /**
   * 创建文本命令
   * @param text 文本内容
   * @param options 文本选项
   */
  protected textCommand(text: string, options: TextOptions = {}): Uint8Array[] {
    const commands: Uint8Array[] = [];
    
    // 对齐方式
    if (options.align === 'center') {
      commands.push(Commands.ALIGN_CENTER);
    } else if (options.align === 'right') {
      commands.push(Commands.ALIGN_RIGHT);
    } else {
      commands.push(Commands.ALIGN_LEFT);
    }
    
    // 字体样式
    if (options.bold) {
      commands.push(Commands.BOLD_ON);
    }
    
    if (options.underline) {
      commands.push(Commands.UNDERLINE_ON);
    }
    
    // 字体大小
    if (options.doubleHeight && options.doubleWidth) {
      commands.push(Commands.TEXT_LARGE);
    } else if (options.doubleHeight) {
      commands.push(Commands.TEXT_MEDIUM);
    } else {
      commands.push(Commands.TEXT_NORMAL);
    }
    
    // 添加文本
    commands.push(textToBuffer(text));
    
    // 恢复默认样式
    if (options.bold) {
      commands.push(Commands.BOLD_OFF);
    }
    
    if (options.underline) {
      commands.push(Commands.UNDERLINE_OFF);
    }
    
    return commands;
  }
  
  /**
   * 创建分隔线命令
   * @param char 分隔线字符
   * @param length 长度
   */
  protected lineCommand(char: string = '-', length: number = 32): Uint8Array[] {
    const line = char.repeat(length);
    return [textToBuffer(line)];
  }
  
  /**
   * 创建居中文本命令
   * @param text 文本内容
   * @param options 文本选项
   */
  protected centerTextCommand(text: string, options: Omit<TextOptions, 'align'> = {}): Uint8Array[] {
    return this.textCommand(text, { ...options, align: 'center' });
  }
  
  /**
   * 创建左对齐文本命令
   * @param text 文本内容
   * @param options 文本选项
   */
  protected leftTextCommand(text: string, options: Omit<TextOptions, 'align'> = {}): Uint8Array[] {
    return this.textCommand(text, { ...options, align: 'left' });
  }
  
  /**
   * 创建右对齐文本命令
   * @param text 文本内容
   * @param options 文本选项
   */
  protected rightTextCommand(text: string, options: Omit<TextOptions, 'align'> = {}): Uint8Array[] {
    return this.textCommand(text, { ...options, align: 'right' });
  }
  
  /**
   * 创建走纸命令
   * @param lines 行数
   */
  protected feedCommand(lines: number = 1): Uint8Array[] {
    const commands: Uint8Array[] = [];
    for (let i = 0; i < lines; i++) {
      commands.push(Commands.LF);
    }
    return commands;
  }
  
  /**
   * 创建初始化命令
   */
  protected initCommand(): Uint8Array[] {
    return [Commands.INIT];
  }
  
  /**
   * 创建切纸命令
   */
  protected cutCommand(): Uint8Array[] {
    return [Commands.CUT];
  }
  
  /**
   * 添加多个命令到缓存
   * @param commandArrays 命令数组的数组
   */
  protected addCommands(...commandArrays: Uint8Array[][]): void {
    commandArrays.forEach(commands => {
      this.commands.push(...commands);
    });
  }
  
  /**
   * 验证模板数据是否有效
   * @param requiredFields 必需的字段
   * @throws 如果缺少必需字段则抛出错误
   */
  protected validateData(requiredFields: Array<keyof T>): void {
    const missingFields = requiredFields.filter(
      field => this.data[field] === undefined || this.data[field] === null
    );
    
    if (missingFields.length > 0) {
      const error = new Error(
        `模板 ${this.name} 缺少必需字段: ${missingFields.join(', ')}`
      );
      logger.error(error.message);
      throw error;
    }
  }
} 