/**
 * 配置管理模块
 * 集中管理库的配置项和常量
 */

import { logger, LogLevel, setLogLevel } from './logger';

// 默认纸张宽度（毫米）
export const DEFAULT_PAPER_WIDTHS = {
  NARROW: 58,  // 窄纸
  WIDE: 80     // 宽纸
};

// 默认编码
export const DEFAULT_ENCODINGS = {
  GBK: 'GBK',
  UTF8: 'UTF-8'
};

// 默认字符集
export const DEFAULT_CHAR_SETS = {
  CHINA: 'CHINA',
  USA: 'USA',
  FRANCE: 'FRANCE',
  GERMANY: 'GERMANY',
  UK: 'UK',
  JAPAN: 'JAPAN',
  KOREA: 'KOREA'
};

// 蓝牙相关默认值
export const BLUETOOTH_DEFAULTS = {
  CONNECT_RETRIES: 2,
  CONNECT_TIMEOUT: 10000,
  SCAN_TIMEOUT: 10000,
  COMMAND_RETRIES: 1,
  COMMAND_CHUNK_SIZE: 512,
  COMMAND_INTERVAL: 20
};

// 打印机相关默认值
export const PRINTER_DEFAULTS = {
  FEED_LINES: 2,
  BARCODE_HEIGHT: 80,
  BARCODE_WIDTH: 2,
  QRCODE_SIZE: 6,
  LINE_CHAR: '-',
  LINE_LENGTH: 32,
  TEXT_FEED: 2
};

// 打印机配置接口
export interface PrinterOptions {
  debug?: boolean;
  encoding?: string;
  characterSet?: string;
  beep?: boolean;
  paperWidth?: number;
  autoCut?: boolean;
}

// 打印机配置管理类
export class ConfigManager {
  private static instance: ConfigManager;
  private options: Required<PrinterOptions>;

  private constructor() {
    // 设置默认配置
    this.options = {
      debug: false,
      encoding: DEFAULT_ENCODINGS.GBK,
      characterSet: DEFAULT_CHAR_SETS.CHINA,
      beep: false,
      paperWidth: DEFAULT_PAPER_WIDTHS.NARROW,
      autoCut: true
    };
  }

  /**
   * 获取配置管理器单例
   */
  public static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  /**
   * 初始化配置
   * @param options 配置选项
   */
  public init(options: PrinterOptions): void {
    this.options = {
      ...this.options,
      ...options
    };

    // 设置调试模式
    if (this.options.debug) {
      setLogLevel(LogLevel.DEBUG);
      logger.debug('调试模式已启用');
      logger.debug('当前配置:', this.options);
    }
  }

  /**
   * 获取所有配置项
   */
  public getAllOptions(): Required<PrinterOptions> {
    return { ...this.options };
  }

  /**
   * 获取指定配置项
   * @param key 配置项名称
   */
  public getOption<K extends keyof Required<PrinterOptions>>(key: K): Required<PrinterOptions>[K] {
    return this.options[key];
  }

  /**
   * 更新指定配置项
   * @param key 配置项名称
   * @param value 配置项值
   */
  public setOption<K extends keyof PrinterOptions>(key: K, value: Required<PrinterOptions>[K]): void {
    this.options[key] = value;
    logger.debug(`配置项 ${key} 已更新为:`, value);
  }
}

// 导出配置管理器实例
export const configManager = ConfigManager.getInstance(); 