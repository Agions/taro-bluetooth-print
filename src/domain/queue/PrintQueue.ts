/**
 * 打印队列管理器
 */

import {
  IPrintQueue,
  IPrintJob,
  IPrintQueueConfig,
  IPrintQueueStats,
  IPrintQueuePolicy,
  QueueProcessingMode,
  PrintJobStatus,
  PrintJobPriority
} from './types';
import { EventEmitter } from 'events';
import { Logger } from '../../infrastructure/logging';
import { ConfigManager } from '../../infrastructure/config';

/**
 * 打印队列管理器实现
 */
export class PrintQueue extends EventEmitter implements IPrintQueue {
  /** 队列ID */
  public readonly id: string;

  /** 队列名称 */
  public name: string;

  /** 队列配置 */
  private config: IPrintQueueConfig;

  /** 作业列表 */
  private jobs: IPrintJob[] = [];

  /** 已完成的作业列表 */
  private completedJobs: IPrintJob[] = [];

  /** 失败的作业列表 */
  private failedJobs: IPrintJob[] = [];

  /** 是否正在处理 */
  private isProcessing: boolean = false;

  /** 处理器映射 */
  private processors: Map<string, (job: IPrintJob) => Promise<void>> = new Map();

  /** 队列策略 */
  private policy: IPrintQueuePolicy;

  /** 日志记录器 */
  private logger: Logger;

  /** 配置管理器 */
  private configManager: ConfigManager;

  /** 处理定时器 */
  private processingTimer?: NodeJS.Timeout;

  /** 当前处理的作业 */
  private currentJob?: IPrintJob;

  /** 暂停状态 */
  private isPaused: boolean = false;

  /** 暂停原因 */
  private pauseReason?: string;

  /** 队列状态 */
  private status: 'idle' | 'processing' | 'paused' | 'stopped' = 'idle';

  constructor(
    name: string,
    configManager: ConfigManager,
    config?: Partial<IPrintQueueConfig>
  ) {
    super();
    this.id = this.generateQueueId();
    this.name = name;
    this.configManager = configManager;
    this.logger = new Logger(`PrintQueue-${name}`);
    this.config = this.mergeConfig(config);
    this.policy = this.createDefaultPolicy();

    this.initialize();
  }

  /**
   * 添加作业到队列
   */
  public async addJob(job: IPrintJob): Promise<void> {
    try {
      // 验证作业
      this.validateJob(job);

      // 检查队列容量
      if (this.jobs.length >= this.config.maxSize) {
        if (this.policy.overflowAction === 'reject') {
          throw new Error('Queue is full');
        } else if (this.policy.overflowAction === 'drop') {
          // 移除最旧的低优先级作业
          this.dropLowestPriorityJob();
        }
      }

      // 应用队列策略
      await this.applyQueuePolicy(job);

      // 添加到队列
      this.jobs.push(job);

      // 排序队列
      this.sortQueue();

      // 保存配置
      await this.saveQueueState();

      this.emit('jobAdded', job);
      this.emit('queueChanged', this.getQueueStats());
      this.logger.info('Job added to queue', { jobId: job.id, queueSize: this.jobs.length });

      // 如果队列空闲，开始处理
      if (this.status === 'idle' && !this.isPaused) {
        this.startProcessing();
      }
    } catch (error) {
      this.logger.error('Failed to add job to queue', error, { jobId: job.id });
      this.emit('jobAddError', { job, error });
      throw error;
    }
  }

  /**
   * 从队列移除作业
   */
  public async removeJob(jobId: string, reason?: string): Promise<IPrintJob | undefined> {
    const jobIndex = this.jobs.findIndex(job => job.id === jobId);
    if (jobIndex === -1) {
      return undefined;
    }

    const job = this.jobs[jobIndex];

    // 如果正在处理该作业，尝试取消
    if (this.currentJob?.id === jobId) {
      await this.cancelCurrentJob(reason || 'Removed from queue');
    }

    // 从队列移除
    this.jobs.splice(jobIndex, 1);

    // 更新作业状态
    job.updateStatus(PrintJobStatus.CANCELLED);

    // 保存配置
    await this.saveQueueState();

    this.emit('jobRemoved', job, reason);
    this.emit('queueChanged', this.getQueueStats());
    this.logger.info('Job removed from queue', { jobId, reason });

    return job;
  }

  /**
   * 获取队列中的作业
   */
  public getJobs(): IPrintJob[] {
    return [...this.jobs];
  }

  /**
   * 获取指定状态的作业
   */
  public getJobsByStatus(status: PrintJobStatus): IPrintJob[] {
    return this.jobs.filter(job => job.status === status);
  }

  /**
   * 获取指定优先级的作业
   */
  public getJobsByPriority(priority: PrintJobPriority): IPrintJob[] {
    return this.jobs.filter(job => job.priority === priority);
  }

  /**
   * 获取指定打印机的作业
   */
  public getJobsByPrinter(printerId: string): IPrintJob[] {
    return this.jobs.filter(job => job.printerId === printerId);
  }

  /**
   * 查找作业
   */
  public findJob(jobId: string): IPrintJob | undefined {
    return this.jobs.find(job => job.id === jobId);
  }

  /**
   * 获取队列长度
   */
  public getLength(): number {
    return this.jobs.length;
  }

  /**
   * 检查队列是否为空
   */
  public isEmpty(): boolean {
    return this.jobs.length === 0;
  }

  /**
   * 检查队列是否已满
   */
  public isFull(): boolean {
    return this.jobs.length >= this.config.maxSize;
  }

  /**
   * 开始处理队列
   */
  public async startProcessing(): Promise<void> {
    if (this.isProcessing || this.isPaused) {
      return;
    }

    this.isProcessing = true;
    this.status = 'processing';

    this.emit('processingStarted');
    this.logger.info('Queue processing started');

    // 启动处理循环
    this.scheduleNextProcess();
  }

  /**
   * 停止处理队列
   */
  public async stopProcessing(): Promise<void> {
    this.isProcessing = false;
    this.status = 'stopped';

    if (this.processingTimer) {
      clearTimeout(this.processingTimer);
      this.processingTimer = undefined;
    }

    // 取消当前作业
    if (this.currentJob) {
      await this.cancelCurrentJob('Processing stopped');
    }

    this.emit('processingStopped');
    this.logger.info('Queue processing stopped');
  }

  /**
   * 暂停队列处理
   */
  public pause(reason?: string): void {
    this.isPaused = true;
    this.pauseReason = reason;
    this.status = 'paused';

    this.emit('queuePaused', reason);
    this.logger.info('Queue paused', { reason });
  }

  /**
   * 恢复队列处理
   */
  public resume(): void {
    this.isPaused = false;
    this.pauseReason = undefined;
    this.status = this.isProcessing ? 'processing' : 'idle';

    this.emit('queueResumed');
    this.logger.info('Queue resumed');

    // 如果正在处理且有作业，继续处理
    if (this.isProcessing && this.jobs.length > 0) {
      this.scheduleNextProcess();
    }
  }

  /**
   * 清空队列
   */
  public async clearQueue(): Promise<void> {
    // 停止处理
    await this.stopProcessing();

    // 取消所有作业
    const jobsToCancel = [...this.jobs];
    for (const job of jobsToCancel) {
      job.updateStatus(PrintJobStatus.CANCELLED);
      this.completedJobs.push(job);
    }

    // 清空队列
    this.jobs = [];

    // 保存配置
    await this.saveQueueState();

    this.emit('queueCleared');
    this.emit('queueChanged', this.getQueueStats());
    this.logger.info('Queue cleared');
  }

  /**
   * 注册作业处理器
   */
  public registerProcessor(type: string, processor: (job: IPrintJob) => Promise<void>): void {
    this.processors.set(type, processor);
    this.logger.info('Processor registered', { type });
  }

  /**
   * 注销作业处理器
   */
  public unregisterProcessor(type: string): void {
    this.processors.delete(type);
    this.logger.info('Processor unregistered', { type });
  }

  /**
   * 获取队列统计信息
   */
  public getQueueStats(): IPrintQueueStats {
    const now = Date.now();
    const jobs = this.jobs;

    return {
      id: this.id,
      name: this.name,
      status: this.status,
      isPaused: this.isPaused,
      pauseReason: this.pauseReason,
      currentJobId: this.currentJob?.id,
      totalJobs: jobs.length,
      pendingJobs: jobs.filter(j => j.status === PrintJobStatus.PENDING).length,
      processingJobs: jobs.filter(j => j.status === PrintJobStatus.PROCESSING).length,
      pausedJobs: jobs.filter(j => j.status === PrintJobStatus.PAUSED).length,
      retryJobs: jobs.filter(j => j.status === PrintJobStatus.RETRY).length,
      completedJobs: this.completedJobs.length,
      failedJobs: this.failedJobs.length,
      averageWaitTime: this.calculateAverageWaitTime(),
      oldestJobAge: this.calculateOldestJobAge(),
      processingRate: this.calculateProcessingRate(),
      maxQueueSize: this.config.maxSize,
      utilizationRate: (jobs.length / this.config.maxSize) * 100,
      config: { ...this.config },
      lastUpdated: new Date()
    };
  }

  /**
   * 更新队列配置
   */
  public async updateConfig(config: Partial<IPrintQueueConfig>): Promise<void> {
    this.config = { ...this.config, ...config };

    // 应用新配置
    await this.applyQueueConfig();

    this.emit('configUpdated', this.config);
    this.logger.info('Queue config updated', this.config);
  }

  /**
   * 更新队列策略
   */
  public updatePolicy(policy: Partial<IPrintQueuePolicy>): void {
    this.policy = { ...this.policy, ...policy };
    this.emit('policyUpdated', this.policy);
    this.logger.info('Queue policy updated', this.policy);
  }

  /**
   * 重新排序队列
   */
  public resortQueue(): void {
    this.sortQueue();
    this.emit('queueResorted');
    this.logger.info('Queue resorted');
  }

  /**
   * 获取队列信息
   */
  public getInfo(): {
    id: string;
    name: string;
    status: string;
    config: IPrintQueueConfig;
    policy: IPrintQueuePolicy;
    stats: IPrintQueueStats;
  } {
    return {
      id: this.id,
      name: this.name,
      status: this.status,
      config: { ...this.config },
      policy: { ...this.policy },
      stats: this.getQueueStats()
    };
  }

  /**
   * 销毁队列
   */
  public async dispose(): Promise<void> {
    try {
      // 停止处理
      await this.stopProcessing();

      // 保存最终状态
      await this.saveQueueState();

      // 清理资源
      this.jobs = [];
      this.completedJobs = [];
      this.failedJobs = [];
      this.processors.clear();
      this.removeAllListeners();

      this.emit('disposed');
      this.logger.info('Queue disposed');
    } catch (error) {
      this.logger.error('Failed to dispose queue', error);
      throw error;
    }
  }

  // 私有方法

  /**
   * 初始化队列
   */
  private async initialize(): Promise<void> {
    try {
      // 加载配置
      await this.loadConfiguration();

      // 恢复队列状态
      await this.restoreQueueState();

      // 启动自动处理
      if (this.config.autoStart) {
        this.startProcessing();
      }

      this.logger.info('Print queue initialized', { id: this.id, name: this.name });
    } catch (error) {
      this.logger.error('Failed to initialize print queue', error);
      throw error;
    }
  }

  /**
   * 生成队列ID
   */
  private generateQueueId(): string {
    return 'queue_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * 合并配置
   */
  private mergeConfig(config?: Partial<IPrintQueueConfig>): IPrintQueueConfig {
    return {
      maxSize: 100,
      maxConcurrency: 3,
      processingInterval: 1000,
      autoStart: true,
      persistState: true,
      retryDelay: 5000,
      maxRetries: 3,
      jobTimeout: 30000,
      priorityMode: 'fifo', // fifo, priority, deadline
      processingMode: 'sequential', // sequential, parallel
      enableMetrics: true,
      enableLogging: true,
      ...config
    };
  }

  /**
   * 创建默认策略
   */
  private createDefaultPolicy(): IPrintQueuePolicy {
    return {
      maxRetries: 3,
      retryDelay: 5000,
      jobTimeout: 30000,
      priorityMode: 'fifo',
      processingMode: 'sequential',
      overflowAction: 'reject',
      deadLetterAction: 'retry',
      enablePriorityBoost: false,
      enableDeadlineBased: false,
      enableAffinity: false
    };
  }

  /**
   * 验证作业
   */
  private validateJob(job: IPrintJob): void {
    if (!job.id) {
      throw new Error('Job ID is required');
    }

    if (!job.printerId) {
      throw new Error('Printer ID is required');
    }

    if (!job.data) {
      throw new Error('Job data is required');
    }

    // 检查是否已存在
    if (this.jobs.some(j => j.id === job.id)) {
      throw new Error(`Job ${job.id} already exists in queue`);
    }
  }

  /**
   * 应用队列策略
   */
  private async applyQueuePolicy(job: IPrintJob): Promise<void> {
    // 设置最大重试次数
    if (job.maxRetries === undefined) {
      job.maxRetries = this.policy.maxRetries;
    }

    // 设置超时时间
    if (job.timeout === undefined) {
      job.timeout = this.policy.jobTimeout;
    }

    // 应用优先级提升
    if (this.policy.enablePriorityBoost && job.tags) {
      for (const tag of job.tags) {
        if (tag.startsWith('priority:')) {
          const priority = tag.split(':')[1] as PrintJobPriority;
          if (Object.values(PrintJobPriority).includes(priority)) {
            (job as any).priority = priority;
            break;
          }
        }
      }
    }

    // 应用截止时间优先级
    if (this.policy.enableDeadlineBased && job.metadata.deadline) {
      const deadline = new Date(job.metadata.deadline);
      const now = new Date();
      const timeToDeadline = deadline.getTime() - now.getTime();

      // 根据截止时间调整优先级
      if (timeToDeadline < 5 * 60 * 1000) { // 5分钟内
        (job as any).priority = PrintJobPriority.HIGH;
      } else if (timeToDeadline < 30 * 60 * 1000) { // 30分钟内
        (job as any).priority = PrintJobPriority.NORMAL;
      }
    }
  }

  /**
   * 排序队列
   */
  private sortQueue(): void {
    switch (this.policy.priorityMode) {
      case 'priority':
        this.sortByPriority();
        break;
      case 'deadline':
        this.sortByDeadline();
        break;
      case 'fifo':
      default:
        this.sortByFIFO();
        break;
    }
  }

  /**
   * 按FIFO排序
   */
  private sortByFIFO(): void {
    this.jobs.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  /**
   * 按优先级排序
   */
  private sortByPriority(): void {
    const priorityOrder = {
      [PrintJobPriority.HIGH]: 3,
      [PrintJobPriority.NORMAL]: 2,
      [PrintJobPriority.LOW]: 1
    };

    this.jobs.sort((a, b) => {
      const aPriority = priorityOrder[a.priority];
      const bPriority = priorityOrder[b.priority];

      if (aPriority !== bPriority) {
        return bPriority - aPriority;
      }

      // 相同优先级按创建时间排序
      return a.createdAt.getTime() - b.createdAt.getTime();
    });
  }

  /**
   * 按截止时间排序
   */
  private sortByDeadline(): void {
    this.jobs.sort((a, b) => {
      const aDeadline = a.metadata.deadline ? new Date(a.metadata.deadline).getTime() : Infinity;
      const bDeadline = b.metadata.deadline ? new Date(b.metadata.deadline).getTime() : Infinity;

      if (aDeadline !== bDeadline) {
        return aDeadline - bDeadline;
      }

      return a.createdAt.getTime() - b.createdAt.getTime();
    });
  }

  /**
   * 移除最低优先级作业
   */
  private dropLowestPriorityJob(): void {
    if (this.jobs.length === 0) {
      return;
    }

    // 找到优先级最低的作业
    const lowestPriorityJob = this.jobs.reduce((lowest, current) => {
      const priorityOrder = {
        [PrintJobPriority.HIGH]: 3,
        [PrintJobPriority.NORMAL]: 2,
        [PrintJobPriority.LOW]: 1
      };

      const lowestPriority = priorityOrder[lowest.priority];
      const currentPriority = priorityOrder[current.priority];

      if (currentPriority < lowestPriority) {
        return current;
      }

      if (currentPriority === lowestPriority && current.createdAt < lowest.createdAt) {
        return current;
      }

      return lowest;
    });

    // 移除作业
    const index = this.jobs.indexOf(lowestPriorityJob);
    if (index !== -1) {
      this.jobs.splice(index, 1);
      lowestPriorityJob.updateStatus(PrintJobStatus.CANCELLED);
      this.failedJobs.push(lowestPriorityJob);

      this.emit('jobDropped', lowestPriorityJob);
      this.logger.warn('Job dropped due to queue overflow', { jobId: lowestPriorityJob.id });
    }
  }

  /**
   * 调度下一次处理
   */
  private scheduleNextProcess(): void {
    if (this.processingTimer) {
      clearTimeout(this.processingTimer);
    }

    this.processingTimer = setTimeout(() => {
      this.processNextJob();
    }, this.config.processingInterval);
  }

  /**
   * 处理下一个作业
   */
  private async processNextJob(): Promise<void> {
    if (!this.isProcessing || this.isPaused || this.jobs.length === 0) {
      this.status = this.isPaused ? 'paused' : 'idle';
      return;
    }

    // 获取下一个待处理的作业
    const job = this.getNextJob();
    if (!job) {
      this.status = 'idle';
      return;
    }

    this.currentJob = job;
    job.updateStatus(PrintJobStatus.PROCESSING);
    job.startedAt = new Date();

    this.emit('jobStarted', job);
    this.logger.info('Job processing started', { jobId: job.id });

    try {
      // 获取处理器
      const processor = this.getProcessorForJob(job);
      if (!processor) {
        throw new Error(`No processor found for job type: ${job.data.type}`);
      }

      // 执行处理
      await this.executeJobWithTimeout(job, processor);

      // 处理成功
      job.updateStatus(PrintJobStatus.COMPLETED);
      job.completedAt = new Date();
      this.completedJobs.push(job);

      // 从队列移除
      const index = this.jobs.indexOf(job);
      if (index !== -1) {
        this.jobs.splice(index, 1);
      }

      this.emit('jobCompleted', job);
      this.logger.info('Job processing completed', { jobId: job.id });
    } catch (error) {
      // 处理失败
      job.updateStatus(PrintJobStatus.FAILED);
      job.failedAt = new Date();
      job.error = error.message;

      this.emit('jobFailed', job, error);
      this.logger.error('Job processing failed', error, { jobId: job.id });

      // 决定是否重试
      if (job.canRetry()) {
        job.updateStatus(PrintJobStatus.RETRY);
        this.logger.info('Job scheduled for retry', { jobId: job.id, retryCount: job.retryCount });

        // 延迟重试
        setTimeout(() => {
          // 作业会回到队列等待下次处理
        }, this.policy.retryDelay);
      } else {
        this.failedJobs.push(job);
        const index = this.jobs.indexOf(job);
        if (index !== -1) {
          this.jobs.splice(index, 1);
        }
      }
    } finally {
      this.currentJob = undefined;

      // 保存状态
      await this.saveQueueState();

      // 调度下一个处理
      this.scheduleNextProcess();
    }
  }

  /**
   * 获取下一个待处理的作业
   */
  private getNextJob(): IPrintJob | undefined {
    return this.jobs.find(job =>
      job.status === PrintJobStatus.PENDING ||
      job.status === PrintJobStatus.RETRY
    );
  }

  /**
   * 获取作业处理器
   */
  private getProcessorForJob(job: IPrintJob): ((job: IPrintJob) => Promise<void>) | undefined {
    return this.processors.get(job.data.type);
  }

  /**
   * 带超时执行作业
   */
  private async executeJobWithTimeout(
    job: IPrintJob,
    processor: (job: IPrintJob) => Promise<void>
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Job timeout after ${job.timeout}ms`));
      }, job.timeout);

      processor(job)
        .then(() => {
          clearTimeout(timeout);
          resolve();
        })
        .catch((error) => {
          clearTimeout(timeout);
          reject(error);
        });
    });
  }

  /**
   * 取消当前作业
   */
  private async cancelCurrentJob(reason: string): Promise<void> {
    if (!this.currentJob) {
      return;
    }

    const job = this.currentJob;
    job.updateStatus(PrintJobStatus.CANCELLED);

    this.emit('jobCancelled', job, reason);
    this.logger.info('Current job cancelled', { jobId: job.id, reason });

    this.currentJob = undefined;
  }

  /**
   * 计算平均等待时间
   */
  private calculateAverageWaitTime(): number {
    if (this.jobs.length === 0) {
      return 0;
    }

    const now = Date.now();
    const totalWaitTime = this.jobs.reduce((sum, job) => {
      return sum + (now - job.createdAt.getTime());
    }, 0);

    return totalWaitTime / this.jobs.length;
  }

  /**
   * 计算最旧作业年龄
   */
  private calculateOldestJobAge(): number {
    if (this.jobs.length === 0) {
      return 0;
    }

    const oldestJob = this.jobs.reduce((oldest, current) =>
      current.createdAt < oldest.createdAt ? current : oldest
    );

    return Date.now() - oldestJob.createdAt.getTime();
  }

  /**
   * 计算处理速率
   */
  private calculateProcessingRate(): number {
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;

    const recentCompletedJobs = this.completedJobs.filter(job =>
      job.completedAt && job.completedAt.getTime() > oneHourAgo
    );

    return recentCompletedJobs.length; // 每小时完成数
  }

  /**
   * 加载配置
   */
  private async loadConfiguration(): Promise<void> {
    try {
      const savedConfig = await this.configManager.get(`printQueue.${this.id}.config`);
      if (savedConfig) {
        this.config = this.mergeConfig(savedConfig);
      }

      const savedPolicy = await this.configManager.get(`printQueue.${this.id}.policy`);
      if (savedPolicy) {
        this.policy = { ...this.policy, ...savedPolicy };
      }
    } catch (error) {
      this.logger.warn('Failed to load queue configuration', error);
    }
  }

  /**
   * 保存队列状态
   */
  private async saveQueueState(): Promise<void> {
    if (!this.config.persistState) {
      return;
    }

    try {
      const state = {
        jobs: this.jobs.map(job => job.toJSON()),
        completedJobs: this.completedJobs.map(job => job.toJSON()),
        failedJobs: this.failedJobs.map(job => job.toJSON()),
        status: this.status,
        isPaused: this.isPaused,
        pauseReason: this.pauseReason
      };

      await this.configManager.set(`printQueue.${this.id}.state`, state);
    } catch (error) {
      this.logger.warn('Failed to save queue state', error);
    }
  }

  /**
   * 恢复队列状态
   */
  private async restoreQueueState(): Promise<void> {
    if (!this.config.persistState) {
      return;
    }

    try {
      const state = await this.configManager.get(`printQueue.${this.id}.state`);
      if (state) {
        // 恢复作业状态
        this.jobs = state.jobs.map((jobData: any) => {
          const job = { ...jobData, createdAt: new Date(jobData.createdAt) };
          // 重置处理中的作业状态
          if (job.status === PrintJobStatus.PROCESSING) {
            job.status = PrintJobStatus.PENDING;
          }
          return job;
        });

        this.completedJobs = state.completedJobs.map((jobData: any) => ({
          ...jobData,
          createdAt: new Date(jobData.createdAt)
        }));

        this.failedJobs = state.failedJobs.map((jobData: any) => ({
          ...jobData,
          createdAt: new Date(jobData.createdAt)
        }));

        this.status = state.status || 'idle';
        this.isPaused = state.isPaused || false;
        this.pauseReason = state.pauseReason;

        // 重新排序队列
        this.sortQueue();

        this.logger.info('Queue state restored', {
          jobsCount: this.jobs.length,
          completedCount: this.completedJobs.length,
          failedCount: this.failedJobs.length
        });
      }
    } catch (error) {
      this.logger.warn('Failed to restore queue state', error);
    }
  }

  /**
   * 应用队列配置
   */
  private async applyQueueConfig(): Promise<void> {
    // 如果队列大小减小，移除多余作业
    if (this.jobs.length > this.config.maxSize) {
      const excessJobs = this.jobs.splice(this.config.maxSize);
      for (const job of excessJobs) {
        job.updateStatus(PrintJobStatus.CANCELLED);
        this.failedJobs.push(job);
        this.emit('jobDropped', job);
      }
    }

    // 保存配置
    await this.configManager.set(`printQueue.${this.id}.config`, this.config);
  }
}