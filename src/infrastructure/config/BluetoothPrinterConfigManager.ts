/**
 * 蓝牙打印库配置管理器
 * 扩展基础配置管理器，提供蓝牙打印库特定的配置功能
 */

import { ConfigManager } from './ConfigManager';
import { IBluetoothPrinterConfig, DEFAULT_CONFIG } from '../../types';

/**
 * 蓝牙打印库配置管理器
 */
export class BluetoothPrinterConfigManager extends ConfigManager {
  private printerConfig: IBluetoothPrinterConfig;

  constructor(initialConfig?: Partial<IBluetoothPrinterConfig>) {
    super();
    this.printerConfig = this.mergeConfig(DEFAULT_CONFIG, initialConfig || {});
    this.setupPrinterConfig();
  }

  /**
   * 获取完整配置
   */
  public getConfig(): IBluetoothPrinterConfig {
    return { ...this.printerConfig };
  }

  /**
   * 更新配置
   */
  public updateConfig(updates: Partial<IBluetoothPrinterConfig>): void {
    this.printerConfig = this.mergeConfig(this.printerConfig, updates);
    this.updateProviderConfig();
    this.emit('configUpdated', updates);
  }

  /**
   * 获取蓝牙配置
   */
  public getBluetoothConfig() {
    return this.printerConfig.bluetooth;
  }

  /**
   * 更新蓝牙配置
   */
  public updateBluetoothConfig(config: Partial<IBluetoothPrinterConfig['bluetooth']>): void {
    this.printerConfig.bluetooth = { ...this.printerConfig.bluetooth, ...config };
    this.updateProviderConfig();
    this.emit('bluetoothConfigUpdated', config);
  }

  /**
   * 获取打印机配置
   */
  public getPrinterConfig() {
    return this.printerConfig.printer;
  }

  /**
   * 更新打印机配置
   */
  public updatePrinterConfig(config: Partial<IBluetoothPrinterConfig['printer']>): void {
    this.printerConfig.printer = { ...this.printerConfig.printer, ...config };
    this.updateProviderConfig();
    this.emit('printerConfigUpdated', config);
  }

  /**
   * 获取队列配置
   */
  public getQueueConfig() {
    return this.printerConfig.queue;
  }

  /**
   * 更新队列配置
   */
  public updateQueueConfig(config: Partial<IBluetoothPrinterConfig['queue']>): void {
    this.printerConfig.queue = { ...this.printerConfig.queue, ...config };
    this.updateProviderConfig();
    this.emit('queueConfigUpdated', config);
  }

  /**
   * 获取模板配置
   */
  public getTemplateConfig() {
    return this.printerConfig.template;
  }

  /**
   * 更新模板配置
   */
  public updateTemplateConfig(config: Partial<IBluetoothPrinterConfig['template']>): void {
    this.printerConfig.template = { ...this.printerConfig.template, ...config };
    this.updateProviderConfig();
    this.emit('templateConfigUpdated', config);
  }

  /**
   * 获取日志配置
   */
  public getLoggingConfig() {
    return this.printerConfig.logging;
  }

  /**
   * 更新日志配置
   */
  public updateLoggingConfig(config: Partial<IBluetoothPrinterConfig['logging']>): void {
    this.printerConfig.logging = { ...this.printerConfig.logging, ...config };
    this.updateProviderConfig();
    this.emit('loggingConfigUpdated', config);
  }

  /**
   * 获取事件配置
   */
  public getEventsConfig() {
    return this.printerConfig.events;
  }

  /**
   * 更新事件配置
   */
  public updateEventsConfig(config: Partial<IBluetoothPrinterConfig['events']>): void {
    this.printerConfig.events = { ...this.printerConfig.events, ...config };
    this.updateProviderConfig();
    this.emit('eventsConfigUpdated', config);
  }

  /**
   * 重置为默认配置
   */
  public resetToDefaults(): void {
    this.printerConfig = { ...DEFAULT_CONFIG };
    this.updateProviderConfig();
    this.emit('configReset');
  }

  /**
   * 导出配置
   */
  public exportConfig(): string {
    return JSON.stringify(this.printerConfig, null, 2);
  }

  /**
   * 导入配置
   */
  public importConfig(configJson: string): void {
    try {
      const config = JSON.parse(configJson) as Partial<IBluetoothPrinterConfig>;
      const mergedConfig = this.mergeConfig(DEFAULT_CONFIG, config);

      // 验证配置
      this.validatePrinterConfig(mergedConfig);

      this.printerConfig = mergedConfig;
      this.updateProviderConfig();
      this.emit('configImported', config);
    } catch (error) {
      throw new Error(`Failed to import config: ${error.message}`);
    }
  }

  /**
   * 从环境变量加载配置
   */
  public loadFromEnv(): void {
    const envConfig: Partial<IBluetoothPrinterConfig> = {
      bluetooth: {
        scanTimeout: parseInt(process.env.BLUETOOTH_SCAN_TIMEOUT || '0') || undefined,
        connectionTimeout: parseInt(process.env.BLUETOOTH_CONNECTION_TIMEOUT || '0') || undefined,
        autoReconnect: process.env.BLUETOOTH_AUTO_RECONNECT === 'true',
        maxReconnectAttempts: parseInt(process.env.BLUETOOTH_MAX_RECONNECT || '0') || undefined,
        reconnectInterval: parseInt(process.env.BLUETOOTH_RECONNECT_INTERVAL || '0') || undefined
      },
      printer: {
        density: parseInt(process.env.PRINTER_DENSITY || '0') || undefined,
        speed: parseInt(process.env.PRINTER_SPEED || '0') || undefined,
        paperWidth: parseInt(process.env.PRINTER_PAPER_WIDTH || '0') || undefined,
        autoCut: process.env.PRINTER_AUTO_CUT === 'true',
        charset: process.env.PRINTER_CHARSET || undefined,
        align: (process.env.PRINTER_ALIGN as any) || undefined
      },
      queue: {
        maxSize: parseInt(process.env.QUEUE_MAX_SIZE || '0') || undefined,
        concurrency: parseInt(process.env.QUEUE_CONCURRENCY || '0') || undefined,
        retryAttempts: parseInt(process.env.QUEUE_RETRY_ATTEMPTS || '0') || undefined,
        retryDelay: parseInt(process.env.QUEUE_RETRY_DELAY || '0') || undefined,
        autoProcess: process.env.QUEUE_AUTO_PROCESS === 'true',
        processInterval: parseInt(process.env.QUEUE_PROCESS_INTERVAL || '0') || undefined
      },
      template: {
        enableCache: process.env.TEMPLATE_ENABLE_CACHE === 'true',
        cacheSize: parseInt(process.env.TEMPLATE_CACHE_SIZE || '0') || undefined,
        cacheTimeout: parseInt(process.env.TEMPLATE_CACHE_TIMEOUT || '0') || undefined,
        enableValidation: process.env.TEMPLATE_ENABLE_VALIDATION === 'true'
      },
      logging: {
        level: (process.env.LOG_LEVEL as any) || undefined,
        enableConsole: process.env.LOG_ENABLE_CONSOLE !== 'false',
        enableFile: process.env.LOG_ENABLE_FILE === 'true',
        filePath: process.env.LOG_FILE_PATH || undefined,
        maxFileSize: parseInt(process.env.LOG_MAX_FILE_SIZE || '0') || undefined,
        maxFiles: parseInt(process.env.LOG_MAX_FILES || '0') || undefined
      },
      events: {
        enabled: process.env.EVENTS_ENABLED !== 'false',
        maxListeners: parseInt(process.env.EVENTS_MAX_LISTENERS || '0') || undefined,
        enableHistory: process.env.EVENTS_ENABLE_HISTORY === 'true',
        historySize: parseInt(process.env.EVENTS_HISTORY_SIZE || '0') || undefined
      }
    };

    // 移除undefined值
    this.cleanUndefinedValues(envConfig);

    this.updateConfig(envConfig);
  }

  /**
   * 保存配置到文件
   */
  public async saveToFile(filePath: string): Promise<void> {
    try {
      const fs = require('fs').promises;
      await fs.writeFile(filePath, this.exportConfig(), 'utf8');
      this.emit('configSaved', filePath);
    } catch (error) {
      throw new Error(`Failed to save config to file: ${error.message}`);
    }
  }

  /**
   * 从文件加载配置
   */
  public async loadFromFile(filePath: string): Promise<void> {
    try {
      const fs = require('fs').promises;
      const configJson = await fs.readFile(filePath, 'utf8');
      this.importConfig(configJson);
      this.emit('configLoaded', filePath);
    } catch (error) {
      throw new Error(`Failed to load config from file: ${error.message}`);
    }
  }

  /**
   * 验证配置
   */
  public validateConfig(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const config = this.printerConfig;

    // 验证蓝牙配置
    if (config.bluetooth.scanTimeout <= 0) {
      errors.push('蓝牙扫描超时时间必须大于0');
    }
    if (config.bluetooth.connectionTimeout <= 0) {
      errors.push('蓝牙连接超时时间必须大于0');
    }
    if (config.bluetooth.maxReconnectAttempts < 0) {
      errors.push('最大重连次数不能为负数');
    }
    if (config.bluetooth.reconnectInterval < 0) {
      errors.push('重连间隔不能为负数');
    }

    // 验证打印机配置
    if (config.printer.density < 1 || config.printer.density > 16) {
      errors.push('打印密度必须在1-16之间');
    }
    if (config.printer.speed < 1 || config.printer.speed > 8) {
      errors.push('打印速度必须在1-8之间');
    }
    if (config.printer.paperWidth <= 0) {
      errors.push('纸张宽度必须大于0');
    }

    // 验证队列配置
    if (config.queue.maxSize <= 0) {
      errors.push('队列最大大小必须大于0');
    }
    if (config.queue.concurrency <= 0) {
      errors.push('并发处理数量必须大于0');
    }
    if (config.queue.retryAttempts < 0) {
      errors.push('重试次数不能为负数');
    }
    if (config.queue.retryDelay < 0) {
      errors.push('重试延迟不能为负数');
    }
    if (config.queue.processInterval <= 0) {
      errors.push('处理间隔必须大于0');
    }

    // 验证模板配置
    if (config.template.cacheSize <= 0) {
      errors.push('模板缓存大小必须大于0');
    }
    if (config.template.cacheTimeout <= 0) {
      errors.push('模板缓存超时时间必须大于0');
    }

    // 验证日志配置
    if (config.logging.maxFileSize <= 0) {
      errors.push('日志文件最大大小必须大于0');
    }
    if (config.logging.maxFiles <= 0) {
      errors.push('日志文件最大数量必须大于0');
    }

    // 验证事件配置
    if (config.events.maxListeners <= 0) {
      errors.push('最大事件监听器数量必须大于0');
    }
    if (config.events.historySize < 0) {
      errors.push('事件历史大小不能为负数');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  // 私有方法

  /**
   * 设置打印机配置到提供者
   */
  private setupPrinterConfig(): void {
    this.updateProviderConfig();
  }

  /**
   * 更新提供者配置
   */
  private updateProviderConfig(): void {
    // 更新基础配置管理器的配置
    this.set('bluetooth', this.printerConfig.bluetooth);
    this.set('printer', this.printerConfig.printer);
    this.set('queue', this.printerConfig.queue);
    this.set('template', this.printerConfig.template);
    this.set('logging', this.printerConfig.logging);
    this.set('events', this.printerConfig.events);
  }

  /**
   * 合并配置
   */
  private mergeConfig(
    base: IBluetoothPrinterConfig,
    updates: Partial<IBluetoothPrinterConfig>
  ): IBluetoothPrinterConfig {
    return {
      bluetooth: { ...base.bluetooth, ...updates.bluetooth },
      printer: { ...base.printer, ...updates.printer },
      queue: { ...base.queue, ...updates.queue },
      template: { ...base.template, ...updates.template },
      logging: { ...base.logging, ...updates.logging },
      events: { ...base.events, ...updates.events }
    };
  }

  /**
   * 验证打印机配置
   */
  private validatePrinterConfig(config: IBluetoothPrinterConfig): void {
    const validation = this.validateConfig();
    if (!validation.valid) {
      throw new Error(`配置验证失败: ${validation.errors.join(', ')}`);
    }
  }

  /**
   * 清理undefined值
   */
  private cleanUndefinedValues(obj: any): void {
    if (obj === null || obj === undefined) {
      return;
    }

    if (typeof obj === 'object') {
      for (const key in obj) {
        if (obj[key] === undefined) {
          delete obj[key];
        } else if (typeof obj[key] === 'object') {
          this.cleanUndefinedValues(obj[key]);
        }
      }
    }
  }
}