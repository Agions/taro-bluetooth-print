/**
 * 打印机模块导出
 */

// 类型定义
export type {
  IPrinterManager,
  IPrinter,
  IPrintJob,
  IPrintQueue,
  IPrinterDriver,
  IPrintTemplate,
  IPrintTemplateEngine,
  IPrinterCommand,
  IPrinterManagerConfig,
  IPrinterEvent,
  IPrinterCapabilities,
  IPrinterStatus,
  IPrintJobData,
  IPrintJobProgress,
  PrinterEventType,
  PrinterType,
  PrinterState,
  PrintJobStatus,
  PrintJobPriority,
  CharacteristicProperty
} from './types';

// 核心实现
export { PrinterManager } from './PrinterManager';
export { Printer } from './Printer';
export { PrintJob } from './PrintJob';
export { PrinterDriver } from './PrinterDriver';

// 打印机驱动
export { ThermalPrinterDriver } from './drivers/ThermalPrinterDriver';

// 工厂函数
export function createPrinterManager(
  name: string,
  bluetoothAdapter: any,
  configManager: any,
  templateEngine: any,
  config?: Partial<IPrinterManagerConfig>
): PrinterManager {
  return new PrinterManager(name, bluetoothAdapter, configManager, templateEngine, config);
}

export function createPrinter(
  id: string,
  name: string,
  type: PrinterType,
  deviceId: string,
  capabilities?: Partial<IPrinterCapabilities>
): Printer {
  return new Printer(id, name, type, deviceId, capabilities);
}

export function createPrintJob(
  printerId: string,
  data: IPrintJobData,
  options?: {
    name?: string;
    priority?: PrintJobPriority;
    timeout?: number;
    maxRetries?: number;
    tags?: string[];
    metadata?: Record<string, any>;
  }
): PrintJob {
  return new PrintJob(printerId, data, options);
}

// 便捷工具函数
export class PrinterUtils {
  /**
   * 生成打印机ID
   */
  static generatePrinterId(): string {
    return 'printer_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * 生成作业ID
   */
  static generateJobId(): string {
    return 'job_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * 验证打印机ID格式
   */
  static isValidPrinterId(printerId: string): boolean {
    return /^printer_[a-z0-9]{9}$/.test(printerId);
  }

  /**
   * 验证作业ID格式
   */
  static isValidJobId(jobId: string): boolean {
    return /^job_\d+_[a-z0-9]{9}$/.test(jobId);
  }

  /**
   * 格式化文件大小
   */
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * 格式化持续时间
   */
  static formatDuration(milliseconds: number): string {
    if (milliseconds < 1000) {
      return `${milliseconds}ms`;
    }

    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  /**
   * 计算打印时间估算
   */
  static estimatePrintTime(
    data: IPrintJobData,
    printerSpeed: number = 100 // mm/second
  ): number {
    // 基于数据类型估算打印时间
    let estimatedLength = 0;

    switch (data.type) {
      case 'text':
        const text = data.content as string;
        const lines = text.split('\n').length;
        estimatedLength = lines * 8; // 假设每行8mm
        break;

      case 'raw':
        if (typeof data.content === 'string') {
          const content = data.content as string;
          estimatedLength = content.length * 0.3; // 假设每个字符0.3mm
        }
        break;

      case 'template':
        estimatedLength = 100; // 默认模板长度
        break;

      case 'commands':
        const commands = data.content as IPrinterCommand[];
        estimatedLength = commands.length * 5; // 每个命令5mm
        break;
    }

    // 添加切纸时间
    estimatedLength += 10;

    // 转换为毫秒
    return (estimatedLength / printerSpeed) * 1000;
  }

  /**
   * 创建打印作业数据
   */
  static createTextData(text: string): IPrintJobData {
    return {
      type: 'text',
      content: text
    };
  }

  static createTemplateData(
    template: IPrintTemplate,
    data: any
  ): IPrintJobData {
    return {
      type: 'template',
      content: { template, data }
    };
  }

  static createRawData(content: any): IPrintJobData {
    return {
      type: 'raw',
      content
    };
  }

  static createCommandsData(commands: IPrinterCommand[]): IPrintJobData {
    return {
      type: 'commands',
      content: commands
    };
  }

  /**
   * 创建打印命令
   */
  static createCommand(
    type: string,
    value?: any,
    data?: any
  ): IPrinterCommand {
    return {
      type,
      value,
      data
    };
  }

  /**
   * 创建文本命令
   */
  static createTextCommand(text: string): IPrinterCommand {
    return this.createCommand('text', text);
  }

  static createLineFeedCommand(lines: number = 1): IPrinterCommand {
    return this.createCommand('lineFeed', lines);
  }

  static createAlignCommand(align: 'left' | 'center' | 'right'): IPrinterCommand {
    return this.createCommand('align', align);
  }

  static createFontSizeCommand(size: 'small' | 'normal' | 'large'): IPrinterCommand {
    return this.createCommand('fontSize', size);
  }

  static createBoldCommand(enable: boolean = true): IPrinterCommand {
    return this.createCommand('bold', enable);
  }

  static createCutCommand(partial: boolean = false): IPrinterCommand {
    return this.createCommand(partial ? 'partialCut' : 'cut');
  }

  static createFeedCommand(lines: number = 3): IPrinterCommand {
    return this.createCommand('feed', lines);
  }

  /**
   * 创建打印模板
   */
  static createTemplate(
    name: string,
    type: 'receipt' | 'label' | 'text',
    content: any
  ): IPrintTemplate {
    return {
      id: this.generateTemplateId(),
      name,
      type,
      content,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  /**
   * 生成模板ID
   */
  private static generateTemplateId(): string {
    return 'template_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * 验证打印机能力
   */
  static validateCapabilities(
    printer: IPrinter,
    requiredCapabilities: string[]
  ): boolean {
    return requiredCapabilities.every(capability =>
      printer.capabilities.features?.includes(capability) || false
    );
  }

  /**
   * 获取打印机错误信息
   */
  static getErrorMessage(error: any): string {
    if (typeof error === 'string') {
      return error;
    }

    if (error?.message) {
      return error.message;
    }

    if (error?.errMsg) {
      return error.errMsg;
    }

    return 'Unknown error';
  }

  /**
   * 检查打印作业是否可以重试
   */
  static canRetryJob(job: IPrintJob): boolean {
    return job.status === PrintJobStatus.FAILED &&
           job.retryCount < job.maxRetries;
  }

  /**
   * 获取作业状态显示名称
   */
  static getStatusDisplayName(status: PrintJobStatus): string {
    const statusNames = {
      [PrintJobStatus.PENDING]: '等待中',
      [PrintJobStatus.PROCESSING]: '打印中',
      [PrintJobStatus.PAUSED]: '已暂停',
      [PrintJobStatus.COMPLETED]: '已完成',
      [PrintJobStatus.FAILED]: '打印失败',
      [PrintJobStatus.CANCELLED]: '已取消',
      [PrintJobStatus.RETRY]: '重试中'
    };

    return statusNames[status] || status;
  }

  /**
   * 获取打印机状态显示名称
   */
  static getPrinterStateDisplayName(state: PrinterState): string {
    const stateNames = {
      [PrinterState.DISCONNECTED]: '未连接',
      [PrinterState.CONNECTING]: '连接中',
      [PrinterState.CONNECTED]: '已连接',
      [PrinterState.PRINTING]: '打印中',
      [PrinterState.ERROR]: '错误',
      [PrinterState.OFFLINE]: '离线',
      [PrinterState.UNKNOWN]: '未知'
    };

    return stateNames[state] || state;
  }

  /**
   * 排序打印作业
   */
  static sortJobs(
    jobs: IPrintJob[],
    sortBy: 'priority' | 'createdAt' | 'status' = 'priority',
    order: 'asc' | 'desc' = 'desc'
  ): IPrintJob[] {
    return [...jobs].sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'priority':
          const priorityOrder = {
            [PrintJobPriority.HIGH]: 3,
            [PrintJobPriority.NORMAL]: 2,
            [PrintJobPriority.LOW]: 1
          };
          comparison = priorityOrder[b.priority] - priorityOrder[a.priority];
          break;

        case 'createdAt':
          comparison = a.createdAt.getTime() - b.createdAt.getTime();
          break;

        case 'status':
          const statusOrder = {
            [PrintJobStatus.PROCESSING]: 1,
            [PrintJobStatus.PENDING]: 2,
            [PrintJobStatus.RETRY]: 3,
            [PrintJobStatus.PAUSED]: 4,
            [PrintJobStatus.COMPLETED]: 5,
            [PrintJobStatus.FAILED]: 6,
            [PrintJobStatus.CANCELLED]: 7
          };
          comparison = statusOrder[a.status] - statusOrder[b.status];
          break;
      }

      return order === 'asc' ? comparison : -comparison;
    });
  }

  /**
   * 过滤打印作业
   */
  static filterJobs(
    jobs: IPrintJob[],
    filter: {
      status?: PrintJobStatus;
      printerId?: string;
      priority?: PrintJobPriority;
      tags?: string[];
      dateFrom?: Date;
      dateTo?: Date;
    }
  ): IPrintJob[] {
    return jobs.filter(job => {
      if (filter.status && job.status !== filter.status) {
        return false;
      }

      if (filter.printerId && job.printerId !== filter.printerId) {
        return false;
      }

      if (filter.priority && job.priority !== filter.priority) {
        return false;
      }

      if (filter.tags && filter.tags.length > 0) {
        const hasTag = filter.tags.some(tag => job.hasTag(tag));
        if (!hasTag) {
          return false;
        }
      }

      if (filter.dateFrom && job.createdAt < filter.dateFrom) {
        return false;
      }

      if (filter.dateTo && job.createdAt > filter.dateTo) {
        return false;
      }

      return true;
    });
  }

  /**
   * 计算队列统计信息
   */
  static calculateQueueStats(jobs: IPrintJob[]): {
    total: number;
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    cancelled: number;
    paused: number;
    retry: number;
    byPriority: Record<PrintJobPriority, number>;
    averageWaitTime: number;
  } {
    const now = Date.now();
    const waitTimes: number[] = [];
    const byPriority = {
      [PrintJobPriority.HIGH]: 0,
      [PrintJobPriority.NORMAL]: 0,
      [PrintJobPriority.LOW]: 0
    };

    const stats = {
      total: jobs.length,
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
      cancelled: 0,
      paused: 0,
      retry: 0,
      byPriority,
      averageWaitTime: 0
    };

    for (const job of jobs) {
      // 状态统计
      switch (job.status) {
        case PrintJobStatus.PENDING:
          stats.pending++;
          waitTimes.push(now - job.createdAt.getTime());
          break;
        case PrintJobStatus.PROCESSING:
          stats.processing++;
          waitTimes.push(now - job.createdAt.getTime());
          break;
        case PrintJobStatus.COMPLETED:
          stats.completed++;
          break;
        case PrintJobStatus.FAILED:
          stats.failed++;
          break;
        case PrintJobStatus.CANCELLED:
          stats.cancelled++;
          break;
        case PrintJobStatus.PAUSED:
          stats.paused++;
          waitTimes.push(now - job.createdAt.getTime());
          break;
        case PrintJobStatus.RETRY:
          stats.retry++;
          waitTimes.push(now - job.createdAt.getTime());
          break;
      }

      // 优先级统计
      stats.byPriority[job.priority]++;
    }

    // 计算平均等待时间
    if (waitTimes.length > 0) {
      stats.averageWaitTime = waitTimes.reduce((sum, time) => sum + time, 0) / waitTimes.length;
    }

    return stats;
  }
}

// 常量定义
export const PRINTER_CONSTANTS = {
  // 打印机类型
  TYPES: {
    THERMAL: 'thermal' as PrinterType,
    POS: 'pos' as PrinterType,
    INKJET: 'inkjet' as PrinterType,
    LASER: 'laser' as PrinterType
  },

  // 打印机状态
  STATES: {
    DISCONNECTED: 'disconnected' as PrinterState,
    CONNECTING: 'connecting' as PrinterState,
    CONNECTED: 'connected' as PrinterState,
    PRINTING: 'printing' as PrinterState,
    ERROR: 'error' as PrinterState,
    OFFLINE: 'offline' as PrinterState,
    UNKNOWN: 'unknown' as PrinterState
  },

  // 作业状态
  JOB_STATUS: {
    PENDING: 'pending' as PrintJobStatus,
    PROCESSING: 'processing' as PrintJobStatus,
    PAUSED: 'paused' as PrintJobStatus,
    COMPLETED: 'completed' as PrintJobStatus,
    FAILED: 'failed' as PrintJobStatus,
    CANCELLED: 'cancelled' as PrintJobStatus,
    RETRY: 'retry' as PrintJobStatus
  },

  // 作业优先级
  JOB_PRIORITY: {
    LOW: 'low' as PrintJobPriority,
    NORMAL: 'normal' as PrintJobPriority,
    HIGH: 'high' as PrintJobPriority
  },

  // 默认配置
  DEFAULT_CONFIG: {
    MAX_QUEUE_SIZE: 100,
    CONNECTION_TIMEOUT: 10000,
    JOB_TIMEOUT: 30000,
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 1000,
    AUTO_RECONNECT: true,
    ENABLE_LOGGING: true,
    ENABLE_METRICS: true
  } as const
};

// 默认实例
export const defaultPrinterManager = (bluetoothAdapter: any, configManager: any, templateEngine: any) => {
  return createPrinterManager('default', bluetoothAdapter, configManager, templateEngine, PRINTER_CONSTANTS.DEFAULT_CONFIG);
};