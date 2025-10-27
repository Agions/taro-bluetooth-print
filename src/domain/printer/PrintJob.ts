/**
 * 打印作业实现
 */

import {
  IPrintJob,
  PrintJobStatus,
  PrintJobPriority,
  IPrintJobData,
  IPrintJobProgress
} from './types';

/**
 * 打印作业实现
 */
export class PrintJob implements IPrintJob {
  /** 作业ID */
  public readonly id: string;

  /** 打印机ID */
  public readonly printerId: string;

  /** 作业名称 */
  public name: string;

  /** 作业数据 */
  public data: IPrintJobData;

  /** 作业优先级 */
  public readonly priority: PrintJobPriority;

  /** 作业状态 */
  public status: PrintJobStatus;

  /** 创建时间 */
  public readonly createdAt: Date;

  /** 更新时间 */
  public updatedAt: Date;

  /** 开始时间 */
  public startedAt?: Date;

  /** 完成时间 */
  public completedAt?: Date;

  /** 失败时间 */
  public failedAt?: Date;

  /** 重试次数 */
  public retryCount: number;

  /** 最大重试次数 */
  public maxRetries: number;

  /** 超时时间（毫秒） */
  public timeout: number;

  /** 进度信息 */
  public progress: IPrintJobProgress;

  /** 错误信息 */
  public error?: string;

  /** 作业标签 */
  public tags: string[];

  /** 作业元数据 */
  public metadata: Record<string, any>;

  constructor(
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
  ) {
    this.id = this.generateJobId();
    this.printerId = printerId;
    this.data = data;
    this.name = options?.name || `Print Job ${this.id}`;
    this.priority = options?.priority || PrintJobPriority.NORMAL;
    this.status = PrintJobStatus.PENDING;
    this.createdAt = new Date();
    this.updatedAt = new Date();
    this.retryCount = 0;
    this.maxRetries = options?.maxRetries || 3;
    this.timeout = options?.timeout || 30000;
    this.tags = options?.tags || [];
    this.metadata = options?.metadata || {};
    this.progress = this.createInitialProgress();
  }

  /**
   * 检查作业是否已完成（成功或失败）
   */
  public isCompleted(): boolean {
    return this.status === PrintJobStatus.COMPLETED ||
           this.status === PrintJobStatus.FAILED ||
           this.status === PrintJobStatus.CANCELLED;
  }

  /**
   * 检查作业是否正在处理
   */
  public isProcessing(): boolean {
    return this.status === PrintJobStatus.PROCESSING ||
           this.status === PrintJobStatus.PAUSED;
  }

  /**
   * 检查作业是否可以重试
   */
  public canRetry(): boolean {
    return this.status === PrintJobStatus.FAILED &&
           this.retryCount < this.maxRetries;
  }

  /**
   * 检查作业是否已超时
   */
  public isTimeout(): boolean {
    if (!this.startedAt || this.isCompleted()) {
      return false;
    }

    const elapsed = Date.now() - this.startedAt.getTime();
    return elapsed > this.timeout;
  }

  /**
   * 更新作业状态
   */
  public updateStatus(status: PrintJobStatus): void {
    const previousStatus = this.status;
    this.status = status;
    this.updatedAt = new Date();

    switch (status) {
      case PrintJobStatus.PROCESSING:
        if (!this.startedAt) {
          this.startedAt = new Date();
        }
        this.progress.startTime = this.startedAt;
        break;

      case PrintJobStatus.COMPLETED:
        if (!this.completedAt) {
          this.completedAt = new Date();
        }
        this.progress.completedTime = this.completedAt;
        this.progress.percentage = 100;
        break;

      case PrintJobStatus.FAILED:
        if (!this.failedAt) {
          this.failedAt = new Date();
        }
        break;

      case PrintJobStatus.PAUSED:
        this.progress.isPaused = true;
        break;

      case PrintJobStatus.RETRY:
        this.retryCount++;
        break;
    }

    // 状态转换时的特殊处理
    if (previousStatus === PrintJobStatus.PAUSED && status === PrintJobStatus.PROCESSING) {
      this.progress.isPaused = false;
    }
  }

  /**
   * 更新进度
   */
  public updateProgress(progress: Partial<IPrintJobProgress>): void {
    this.progress = { ...this.progress, ...progress };
    this.updatedAt = new Date();
  }

  /**
   * 设置进度百分比
   */
  public setProgress(percentage: number, message?: string): void {
    this.updateProgress({
      percentage: Math.max(0, Math.min(100, percentage)),
      message: message || this.progress.message,
      lastUpdateTime: new Date()
    });
  }

  /**
   * 增加进度
   */
  public incrementProgress(delta: number, message?: string): void {
    const newPercentage = Math.min(100, this.progress.percentage + delta);
    this.setProgress(newPercentage, message);
  }

  /**
   * 设置错误信息
   */
  public setError(error: string): void {
    this.error = error;
    this.updateStatus(PrintJobStatus.FAILED);
    this.updateProgress({
      errorMessage: error,
      lastUpdateTime: new Date()
    });
  }

  /**
   * 清除错误信息
   */
  public clearError(): void {
    this.error = undefined;
    this.updateProgress({
      errorMessage: undefined,
      lastUpdateTime: new Date()
    });
  }

  /**
   * 添加标签
   */
  public addTag(tag: string): void {
    if (!this.tags.includes(tag)) {
      this.tags.push(tag);
    }
  }

  /**
   * 移除标签
   */
  public removeTag(tag: string): void {
    const index = this.tags.indexOf(tag);
    if (index !== -1) {
      this.tags.splice(index, 1);
    }
  }

  /**
   * 检查是否有指定标签
   */
  public hasTag(tag: string): boolean {
    return this.tags.includes(tag);
  }

  /**
   * 设置元数据
   */
  public setMetadata(key: string, value: any): void {
    this.metadata[key] = value;
  }

  /**
   * 获取元数据
   */
  public getMetadata(key: string): any {
    return this.metadata[key];
  }

  /**
   * 获取作业持续时间
   */
  public getDuration(): number | null {
    if (!this.startedAt) {
      return null;
    }

    const endTime = this.completedAt || this.failedAt || new Date();
    return endTime.getTime() - this.startedAt.getTime();
  }

  /**
   * 获取作业剩余时间（估算）
   */
  public getEstimatedRemainingTime(): number | null {
    if (!this.startedAt || this.isCompleted() || this.progress.percentage === 0) {
      return null;
    }

    const elapsed = Date.now() - this.startedAt.getTime();
    const estimatedTotal = (elapsed / this.progress.percentage) * 100;
    return Math.max(0, estimatedTotal - elapsed);
  }

  /**
   * 获取作业摘要
   */
  public getSummary(): {
    id: string;
    name: string;
    printerId: string;
    status: PrintJobStatus;
    priority: PrintJobPriority;
    progress: IPrintJobProgress;
    retryCount: number;
    maxRetries: number;
    tags: string[];
    createdAt: Date;
    startedAt?: Date;
    completedAt?: Date;
    duration?: number;
    isCompleted: boolean;
    isProcessing: boolean;
    canRetry: boolean;
    isTimeout: boolean;
    error?: string;
  } {
    return {
      id: this.id,
      name: this.name,
      printerId: this.printerId,
      status: this.status,
      priority: this.priority,
      progress: this.progress,
      retryCount: this.retryCount,
      maxRetries: this.maxRetries,
      tags: [...this.tags],
      createdAt: this.createdAt,
      startedAt: this.startedAt,
      completedAt: this.completedAt,
      duration: this.getDuration() || undefined,
      isCompleted: this.isCompleted(),
      isProcessing: this.isProcessing(),
      canRetry: this.canRetry(),
      isTimeout: this.isTimeout(),
      error: this.error
    };
  }

  /**
   * 序列化为JSON
   */
  public toJSON(): {
    id: string;
    printerId: string;
    name: string;
    data: IPrintJobData;
    priority: PrintJobPriority;
    status: PrintJobStatus;
    createdAt: string;
    updatedAt: string;
    startedAt?: string;
    completedAt?: string;
    failedAt?: string;
    retryCount: number;
    maxRetries: number;
    timeout: number;
    progress: IPrintJobProgress;
    error?: string;
    tags: string[];
    metadata: Record<string, any>;
  } {
    return {
      id: this.id,
      printerId: this.printerId,
      name: this.name,
      data: this.data,
      priority: this.priority,
      status: this.status,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
      startedAt: this.startedAt?.toISOString(),
      completedAt: this.completedAt?.toISOString(),
      failedAt: this.failedAt?.toISOString(),
      retryCount: this.retryCount,
      maxRetries: this.maxRetries,
      timeout: this.timeout,
      progress: this.progress,
      error: this.error,
      tags: [...this.tags],
      metadata: { ...this.metadata }
    };
  }

  /**
   * 从JSON创建作业实例
   */
  public static fromJSON(json: any): PrintJob {
    const job = new PrintJob(
      json.printerId,
      json.data,
      {
        name: json.name,
        priority: json.priority,
        timeout: json.timeout,
        maxRetries: json.maxRetries,
        tags: json.tags,
        metadata: json.metadata
      }
    );

    // 覆盖自动生成的ID
    (job as any).id = json.id;

    job.status = json.status;
    job.updatedAt = new Date(json.updatedAt);
    job.retryCount = json.retryCount || 0;
    job.progress = json.progress;
    job.error = json.error;

    if (json.startedAt) {
      job.startedAt = new Date(json.startedAt);
    }
    if (json.completedAt) {
      job.completedAt = new Date(json.completedAt);
    }
    if (json.failedAt) {
      job.failedAt = new Date(json.failedAt);
    }

    return job;
  }

  /**
   * 克隆作业
   */
  public clone(): PrintJob {
    const cloned = new PrintJob(
      this.printerId,
      { ...this.data },
      {
        name: this.name,
        priority: this.priority,
        timeout: this.timeout,
        maxRetries: this.maxRetries,
        tags: [...this.tags],
        metadata: { ...this.metadata }
      }
    );

    // 覆盖自动生成的ID和状态
    (cloned as any).id = this.id;
    cloned.status = this.status;
    cloned.startedAt = this.startedAt;
    cloned.completedAt = this.completedAt;
    cloned.failedAt = this.failedAt;
    cloned.retryCount = this.retryCount;
    cloned.progress = { ...this.progress };
    cloned.error = this.error;

    return cloned;
  }

  // 私有方法

  /**
   * 生成作业ID
   */
  private generateJobId(): string {
    return 'job_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * 创建初始进度
   */
  private createInitialProgress(): IPrintJobProgress {
    return {
      percentage: 0,
      currentPage: 0,
      totalPages: 0,
      message: 'Waiting to start',
      startTime: undefined,
      completedTime: undefined,
      estimatedTimeRemaining: undefined,
      isPaused: false,
      errorMessage: undefined,
      lastUpdateTime: new Date()
    };
  }
}