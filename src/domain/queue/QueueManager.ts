/**
 * 队列管理器
 */

import {
  IPrintQueueManager,
  IPrintQueue,
  IPrintQueueConfig,
  IPrintQueueStats,
  QueueStatus
} from './types';
import { PrintQueue } from './PrintQueue';
import { ConfigManager } from '../../infrastructure/config';
import { Logger } from '../../infrastructure/logging';
import { EventEmitter } from 'events';

/**
 * 队列管理器实现
 */
export class QueueManager extends EventEmitter implements IPrintQueueManager {
  /** 管理器名称 */
  public readonly name: string;

  /** 队列映射 */
  private queues: Map<string, IPrintQueue> = new Map();

  /** 默认队列 */
  private defaultQueue?: IPrintQueue;

  /** 配置管理器 */
  private configManager: ConfigManager;

  /** 日志记录器 */
  private logger: Logger;

  /** 管理器配置 */
  private config: {
    enableMetrics: boolean;
    enablePersistence: boolean;
    maxQueues: number;
    defaultQueueConfig: Partial<IPrintQueueConfig>;
  };

  constructor(
    name: string,
    configManager: ConfigManager,
    config?: Partial<typeof QueueManager.prototype.config>
  ) {
    super();
    this.name = name;
    this.configManager = configManager;
    this.logger = new Logger(`QueueManager-${name}`);
    this.config = {
      enableMetrics: true,
      enablePersistence: true,
      maxQueues: 10,
      defaultQueueConfig: {
        maxSize: 100,
        autoStart: true,
        persistState: true
      },
      ...config
    };

    this.initialize();
  }

  /**
   * 创建队列
   */
  public createQueue(name: string, config?: Partial<IPrintQueueConfig>): IPrintQueue {
    if (this.queues.size >= this.config.maxQueues) {
      throw new Error(`Maximum number of queues (${this.config.maxQueues}) reached`);
    }

    // 检查名称是否已存在
    for (const [id, queue] of this.queues) {
      if (queue.name === name) {
        throw new Error(`Queue with name '${name}' already exists`);
      }
    }

    // 创建队列
    const queueConfig = { ...this.config.defaultQueueConfig, ...config };
    const queue = new PrintQueue(name, this.configManager, queueConfig);

    // 设置队列事件监听
    this.setupQueueEventListeners(queue);

    // 添加到管理器
    this.queues.set(queue.id, queue);

    // 如果是第一个队列，设置为默认队列
    if (!this.defaultQueue) {
      this.defaultQueue = queue;
    }

    this.emit('queueCreated', queue);
    this.logger.info('Queue created', { queueId: queue.id, name });

    return queue;
  }

  /**
   * 获取队列
   */
  public getQueue(queueId: string): IPrintQueue | undefined {
    return this.queues.get(queueId);
  }

  /**
   * 按名称获取队列
   */
  public getQueueByName(name: string): IPrintQueue | undefined {
    for (const queue of this.queues.values()) {
      if (queue.name === name) {
        return queue;
      }
    }
    return undefined;
  }

  /**
   * 获取所有队列
   */
  public getAllQueues(): IPrintQueue[] {
    return Array.from(this.queues.values());
  }

  /**
   * 获取队列统计信息
   */
  public getQueueStats(queueId: string): IPrintQueueStats | undefined {
    const queue = this.queues.get(queueId);
    return queue?.getQueueStats();
  }

  /**
   * 删除队列
   */
  public async deleteQueue(queueId: string): Promise<void> {
    const queue = this.queues.get(queueId);
    if (!queue) {
      throw new Error(`Queue ${queueId} not found`);
    }

    // 不能删除默认队列
    if (this.defaultQueue?.id === queueId) {
      throw new Error('Cannot delete default queue');
    }

    try {
      // 停止并销毁队列
      await queue.dispose();

      // 从管理器移除
      this.queues.delete(queueId);

      this.emit('queueDeleted', queue);
      this.logger.info('Queue deleted', { queueId, name: queue.name });
    } catch (error) {
      this.logger.error('Failed to delete queue', error, { queueId });
      throw error;
    }
  }

  /**
   * 设置默认队列
   */
  public setDefaultQueue(queueId: string): void {
    const queue = this.queues.get(queueId);
    if (!queue) {
      throw new Error(`Queue ${queueId} not found`);
    }

    this.defaultQueue = queue;
    this.emit('defaultQueueChanged', queue);
    this.logger.info('Default queue changed', { queueId, name: queue.name });
  }

  /**
   * 获取默认队列
   */
  public getDefaultQueue(): IPrintQueue | undefined {
    return this.defaultQueue;
  }

  /**
   * 获取管理器统计信息
   */
  public getStats(): {
    totalQueues: number;
    totalJobs: number;
    processingJobs: number;
    completedJobs: number;
    failedJobs: number;
    averageWaitTime: number;
    utilizationRate: number;
    queueStats: Array<{ queueId: string; name: string; stats: IPrintQueueStats }>;
  } {
    const queueStats = Array.from(this.queues.values()).map(queue => ({
      queueId: queue.id,
      name: queue.name,
      stats: queue.getQueueStats()
    }));

    const totals = queueStats.reduce(
      (acc, { stats }) => ({
        totalJobs: acc.totalJobs + stats.totalJobs,
        processingJobs: acc.processingJobs + stats.processingJobs,
        completedJobs: acc.completedJobs + stats.completedJobs,
        failedJobs: acc.failedJobs + stats.failedJobs,
        averageWaitTime: acc.averageWaitTime + stats.averageWaitTime,
        utilizationRate: acc.utilizationRate + stats.utilizationRate
      }),
      {
        totalJobs: 0,
        processingJobs: 0,
        completedJobs: 0,
        failedJobs: 0,
        averageWaitTime: 0,
        utilizationRate: 0
      }
    );

    // 计算平均值
    const queueCount = queueStats.length;
    totals.averageWaitTime = queueCount > 0 ? totals.averageWaitTime / queueCount : 0;
    totals.utilizationRate = queueCount > 0 ? totals.utilizationRate / queueCount : 0;

    return {
      totalQueues: this.queues.size,
      ...totals,
      queueStats
    };
  }

  /**
   * 启动所有队列
   */
  public async startAll(): Promise<void> {
    const startPromises = Array.from(this.queues.values()).map(async queue => {
      try {
        await queue.startProcessing();
      } catch (error) {
        this.logger.error('Failed to start queue', error, { queueId: queue.id });
      }
    });

    await Promise.all(startPromises);

    this.emit('allQueuesStarted');
    this.logger.info('All queues started');
  }

  /**
   * 停止所有队列
   */
  public async stopAll(): Promise<void> {
    const stopPromises = Array.from(this.queues.values()).map(async queue => {
      try {
        await queue.stopProcessing();
      } catch (error) {
        this.logger.error('Failed to stop queue', error, { queueId: queue.id });
      }
    });

    await Promise.all(stopPromises);

    this.emit('allQueuesStopped');
    this.logger.info('All queues stopped');
  }

  /**
   * 暂停所有队列
   */
  public pauseAll(reason?: string): void {
    for (const queue of this.queues.values()) {
      try {
        queue.pause(reason);
      } catch (error) {
        this.logger.error('Failed to pause queue', error, { queueId: queue.id });
      }
    }

    this.emit('allQueuesPaused', reason);
    this.logger.info('All queues paused', { reason });
  }

  /**
   * 恢复所有队列
   */
  public resumeAll(): void {
    for (const queue of this.queues.values()) {
      try {
        queue.resume();
      } catch (error) {
        this.logger.error('Failed to resume queue', error, { queueId: queue.id });
      }
    }

    this.emit('allQueuesResumed');
    this.logger.info('All queues resumed');
  }

  /**
   * 清空所有队列
   */
  public async clearAll(): Promise<void> {
    const clearPromises = Array.from(this.queues.values()).map(async queue => {
      try {
        await queue.clearQueue();
      } catch (error) {
        this.logger.error('Failed to clear queue', error, { queueId: queue.id });
      }
    });

    await Promise.all(clearPromises);

    this.emit('allQueuesCleared');
    this.logger.info('All queues cleared');
  }

  /**
   * 重新排序所有队列
   */
  public resortAll(): void {
    for (const queue of this.queues.values()) {
      try {
        queue.resortQueue();
      } catch (error) {
        this.logger.error('Failed to resort queue', error, { queueId: queue.id });
      }
    }

    this.emit('allQueuesResorted');
    this.logger.info('All queues resorted');
  }

  /**
   * 更新队列配置
   */
  public async updateConfig(queueId: string, config: Partial<IPrintQueueConfig>): Promise<void> {
    const queue = this.queues.get(queueId);
    if (!queue) {
      throw new Error(`Queue ${queueId} not found`);
    }

    await queue.updateConfig(config);
    this.logger.info('Queue config updated', { queueId });
  }

  /**
   * 批量更新配置
   */
  public async updateAllConfigs(config: Partial<IPrintQueueConfig>): Promise<void> {
    const updatePromises = Array.from(this.queues.values()).map(async queue => {
      try {
        await queue.updateConfig(config);
      } catch (error) {
        this.logger.error('Failed to update queue config', error, { queueId: queue.id });
      }
    });

    await Promise.all(updatePromises);
    this.logger.info('All queue configs updated');
  }

  /**
   * 获取忙碌队列列表
   */
  public getBusyQueues(): IPrintQueue[] {
    return Array.from(this.queues.values()).filter(queue =>
      queue.getQueueStats().status === 'processing'
    );
  }

  /**
   * 获取空闲队列列表
   */
  public getIdleQueues(): IPrintQueue[] {
    return Array.from(this.queues.values()).filter(queue =>
      queue.getQueueStats().status === 'idle'
    );
  }

  /**
   * 获取暂停队列列表
   */
  public getPausedQueues(): IPrintQueue[] {
    return Array.from(this.queues.values()).filter(queue =>
      queue.getQueueStats().isPaused
    );
  }

  /**
   * 获取高负载队列列表
   */
  public getHighLoadQueues(threshold: number = 80): IPrintQueue[] {
    return Array.from(this.queues.values()).filter(queue =>
      queue.getQueueStats().utilizationRate > threshold
    );
  }

  /**
   * 查找可用队列
   */
  public findAvailableQueue(criteria?: {
    name?: string;
    status?: QueueStatus;
    maxLoad?: number;
    printerId?: string;
  }): IPrintQueue | undefined {
    let candidates = Array.from(this.queues.values());

    // 按名称过滤
    if (criteria?.name) {
      candidates = candidates.filter(queue => queue.name === criteria.name);
    }

    // 按状态过滤
    if (criteria?.status) {
      candidates = candidates.filter(queue => queue.getQueueStats().status === criteria.status);
    }

    // 按负载过滤
    if (criteria?.maxLoad !== undefined) {
      candidates = candidates.filter(queue =>
        queue.getQueueStats().utilizationRate <= criteria.maxLoad
      );
    }

    // 按打印机过滤
    if (criteria?.printerId) {
      candidates = candidates.filter(queue =>
        queue.getJobsByPrinter(criteria!.printerId).length > 0
      );
    }

    // 返回负载最低的队列
    return candidates.reduce((lowest, current) => {
      const lowestLoad = lowest.getQueueStats().utilizationRate;
      const currentLoad = current.getQueueStats().utilizationRate;
      return currentLoad < lowestLoad ? current : lowest;
    }, candidates[0]);
  }

  /**
   * 平衡队列负载
   */
  public async balanceQueues(): Promise<void> {
    this.logger.info('Starting queue balancing');

    const queues = Array.from(this.queues.values());
    const avgLoad = queues.reduce((sum, queue) => sum + queue.getQueueStats().utilizationRate, 0) / queues.length;

    // 找出高负载和低负载队列
    const highLoadQueues = queues.filter(queue => queue.getQueueStats().utilizationRate > avgLoad + 10);
    const lowLoadQueues = queues.filter(queue => queue.getQueueStats().utilizationRate < avgLoad - 10);

    // 从高负载队列移动作业到低负载队列
    for (const highLoadQueue of highLoadQueues) {
      const targetQueue = lowLoadQueues.find(queue =>
        queue.getQueueStats().utilizationRate < avgLoad - 10
      );

      if (targetQueue) {
        // 移动一些待处理作业
        const jobs = highLoadQueue.getJobsByStatus('pending').slice(0, 5);
        for (const job of jobs) {
          try {
            await highLoadQueue.removeJob(job.id, 'Load balancing');
            await targetQueue.addJob(job);
            this.logger.info('Job moved for load balancing', {
              fromQueue: highLoadQueue.id,
              toQueue: targetQueue.id,
              jobId: job.id
            });
          } catch (error) {
            this.logger.error('Failed to move job for load balancing', error, { jobId: job.id });
          }
        }
      }
    }

    this.emit('queuesBalanced');
    this.logger.info('Queue balancing completed');
  }

  /**
   * 健康检查
   */
  public async healthCheck(): Promise<{
    healthy: boolean;
    issues: Array<{
      type: string;
      queueId: string;
      message: string;
      severity: 'low' | 'medium' | 'high';
    }>;
  }> {
    const issues: Array<{
      type: string;
      queueId: string;
      message: string;
      severity: 'low' | 'medium' | 'high';
    }> = [];

    for (const queue of this.queues.values()) {
      const stats = queue.getQueueStats();

      // 检查队列状态
      if (stats.status === 'error') {
        issues.push({
          type: 'queue_error',
          queueId: queue.id,
          message: 'Queue is in error state',
          severity: 'high'
        });
      }

      // 检查队列大小
      if (stats.utilizationRate > 90) {
        issues.push({
          type: 'high_utilization',
          queueId: queue.id,
          message: `Queue utilization is ${stats.utilizationRate.toFixed(1)}%`,
          severity: 'medium'
        });
      }

      // 检查等待时间
      if (stats.averageWaitTime > 60000) { // 1分钟
        issues.push({
          type: 'high_wait_time',
          queueId: queue.id,
          message: `Average wait time is ${stats.averageWaitTime}ms`,
          severity: 'medium'
        });
      }

      // 检查失败率
      const totalJobs = stats.completedJobs + stats.failedJobs;
      if (totalJobs > 0 && (stats.failedJobs / totalJobs) > 0.1) { // 10%失败率
        issues.push({
          type: 'high_failure_rate',
          queueId: queue.id,
          message: `Failure rate is ${((stats.failedJobs / totalJobs) * 100).toFixed(1)}%`,
          severity: 'high'
        });
      }

      // 检查最旧作业
      if (stats.oldestJobAge > 300000) { // 5分钟
        issues.push({
          type: 'old_job',
          queueId: queue.id,
          message: `Oldest job is ${stats.oldestJobAge}ms old`,
          severity: 'low'
        });
      }
    }

    return {
      healthy: issues.length === 0,
      issues
    };
  }

  /**
   * 导出配置
   */
  public exportConfig(): {
    manager: typeof QueueManager.prototype.config;
    queues: Array<{
      id: string;
      name: string;
      config: IPrintQueueConfig;
    }>;
  } {
    return {
      manager: this.config,
      queues: Array.from(this.queues.values()).map(queue => ({
        id: queue.id,
        name: queue.name,
        config: queue.getQueueStats().config
      }))
    };
  }

  /**
   * 导入配置
   */
  public async importConfig(config: {
    manager?: Partial<typeof QueueManager.prototype.config>;
    queues?: Array<{
      name: string;
      config: Partial<IPrintQueueConfig>;
    }>;
  }): Promise<void> {
    try {
      // 导入管理器配置
      if (config.manager) {
        this.config = { ...this.config, ...config.manager };
      }

      // 导入队列配置
      if (config.queues) {
        for (const queueConfig of config.queues) {
          let queue = this.getQueueByName(queueConfig.name);
          if (!queue) {
            queue = this.createQueue(queueConfig.name, queueConfig.config);
          } else {
            await queue.updateConfig(queueConfig.config);
          }
        }
      }

      this.logger.info('Configuration imported successfully');
    } catch (error) {
      this.logger.error('Failed to import configuration', error);
      throw error;
    }
  }

  /**
   * 销毁管理器
   */
  public async dispose(): Promise<void> {
    try {
      // 停止所有队列
      await this.stopAll();

      // 销毁所有队列
      const disposePromises = Array.from(this.queues.values()).map(async queue => {
        try {
          await queue.dispose();
        } catch (error) {
          this.logger.error('Failed to dispose queue', error, { queueId: queue.id });
        }
      });

      await Promise.all(disposePromises);

      // 清理资源
      this.queues.clear();
      this.defaultQueue = undefined;
      this.removeAllListeners();

      this.emit('disposed');
      this.logger.info('Queue manager disposed');
    } catch (error) {
      this.logger.error('Failed to dispose queue manager', error);
      throw error;
    }
  }

  // 私有方法

  /**
   * 初始化管理器
   */
  private async initialize(): Promise<void> {
    try {
      // 加载配置
      await this.loadConfiguration();

      // 恢复队列
      await this.restoreQueues();

      this.logger.info('Queue manager initialized', { name: this.name });
    } catch (error) {
      this.logger.error('Failed to initialize queue manager', error);
      throw error;
    }
  }

  /**
   * 设置队列事件监听
   */
  private setupQueueEventListeners(queue: IPrintQueue): void {
    queue.on('jobAdded', (job) => {
      this.emit('queueJobAdded', { queueId: queue.id, job });
    });

    queue.on('jobRemoved', (job, reason) => {
      this.emit('queueJobRemoved', { queueId: queue.id, job, reason });
    });

    queue.on('jobStarted', (job) => {
      this.emit('queueJobStarted', { queueId: queue.id, job });
    });

    queue.on('jobCompleted', (job) => {
      this.emit('queueJobCompleted', { queueId: queue.id, job });
    });

    queue.on('jobFailed', (job, error) => {
      this.emit('queueJobFailed', { queueId: queue.id, job, error });
    });

    queue.on('queueChanged', (stats) => {
      this.emit('queueChanged', { queueId: queue.id, stats });
    });

    queue.on('error', (error) => {
      this.emit('queueError', { queueId: queue.id, error });
    });
  }

  /**
   * 加载配置
   */
  private async loadConfiguration(): Promise<void> {
    try {
      const savedConfig = await this.configManager.get(`queueManager.${this.name}.config`);
      if (savedConfig) {
        this.config = { ...this.config, ...savedConfig };
      }
    } catch (error) {
      this.logger.warn('Failed to load manager configuration', error);
    }
  }

  /**
   * 恢复队列
   */
  private async restoreQueues(): Promise<void> {
    if (!this.config.enablePersistence) {
      return;
    }

    try {
      const savedQueues = await this.configManager.get(`queueManager.${this.name}.queues`);
      if (savedQueues && Array.isArray(savedQueues)) {
        for (const queueData of savedQueues) {
          try {
            const queue = this.createQueue(queueData.name, queueData.config);
            if (queueData.isDefault) {
              this.defaultQueue = queue;
            }
          } catch (error) {
            this.logger.error('Failed to restore queue', error, { name: queueData.name });
          }
        }
      }
    } catch (error) {
      this.logger.warn('Failed to restore queues', error);
    }
  }
}