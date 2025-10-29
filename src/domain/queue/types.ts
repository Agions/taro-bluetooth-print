/**
 * 队列模块类型定义
 */

// 队列处理模式
export enum QueueProcessingMode {
  SEQUENTIAL = 'sequential',
  PARALLEL = 'parallel',
  PRIORITY = 'priority',
  DEADLINE = 'deadline'
}

// 队列状态
export type QueueStatus = 'idle' | 'processing' | 'paused' | 'stopped' | 'error';

// 队列状态接口
export interface IQueueStatus {
  /** 队列大小 */
  size: number;
  /** 正在处理的作业数 */
  processing: number;
  /** 已完成的作业数 */
  completed: number;
  /** 失败的作业数 */
  failed: number;
  /** 是否暂停 */
  paused: boolean;
  /** 正在处理的作业列表 */
  processingJobs: any[];
}

// 队列统计信息
export interface IPrintQueueStats {
  /** 队列ID */
  id: string;
  /** 队列名称 */
  name: string;
  /** 当前状态 */
  status: QueueStatus;
  /** 是否暂停 */
  isPaused: boolean;
  /** 暂停原因 */
  pauseReason?: string;
  /** 当前处理作业ID */
  currentJobId?: string;
  /** 总作业数 */
  totalJobs: number;
  /** 待处理作业数 */
  pendingJobs: number;
  /** 处理中作业数 */
  processingJobs: number;
  /** 暂停作业数 */
  pausedJobs: number;
  /** 重试作业数 */
  retryJobs: number;
  /** 已完成作业数 */
  completedJobs: number;
  /** 失败作业数 */
  failedJobs: number;
  /** 平均等待时间（毫秒） */
  averageWaitTime: number;
  /** 最旧作业年龄（毫秒） */
  oldestJobAge: number;
  /** 处理速率（每小时作业数） */
  processingRate: number;
  /** 最大队列大小 */
  maxQueueSize: number;
  /** 利用率（百分比） */
  utilizationRate: number;
  /** 队列配置 */
  config: IPrintQueueConfig;
  /** 最后更新时间 */
  lastUpdated: Date;
}

// 队列配置
export interface IPrintQueueConfig {
  /** 最大队列大小 */
  maxSize: number;
  /** 最大并发处理数 */
  maxConcurrency: number;
  /** 处理间隔（毫秒） */
  processingInterval: number;
  /** 是否自动开始 */
  autoStart: boolean;
  /** 是否持久化状态 */
  persistState: boolean;
  /** 重试延迟（毫秒） */
  retryDelay: number;
  /** 最大重试次数 */
  maxRetries: number;
  /** 作业超时时间（毫秒） */
  jobTimeout: number;
  /** 优先级模式 */
  priorityMode: 'fifo' | 'priority' | 'deadline';
  /** 处理模式 */
  processingMode: QueueProcessingMode;
  /** 是否启用指标 */
  enableMetrics: boolean;
  /** 是否启用日志 */
  enableLogging: boolean;
}

// 队列策略
export interface IPrintQueuePolicy {
  /** 最大重试次数 */
  maxRetries: number;
  /** 重试延迟（毫秒） */
  retryDelay: number;
  /** 作业超时时间（毫秒） */
  jobTimeout: number;
  /** 优先级模式 */
  priorityMode: 'fifo' | 'priority' | 'deadline';
  /** 处理模式 */
  processingMode: QueueProcessingMode;
  /** 队列溢出处理方式 */
  overflowAction: 'reject' | 'drop' | 'queue';
  /** 死信处理方式 */
  deadLetterAction: 'retry' | 'drop' | 'dead_letter';
  /** 是否启用优先级提升 */
  enablePriorityBoost: boolean;
  /** 是否启用截止时间调度 */
  enableDeadlineBased: boolean;
  /** 是否启用亲和性 */
  enableAffinity: boolean;
}

// 队列事件
export interface IPrintQueueEvent {
  /** 事件类型 */
  type: string;
  /** 队列ID */
  queueId: string;
  /** 时间戳 */
  timestamp: Date;
  /** 事件数据 */
  data?: any;
}

// 队列管理器接口
export interface IPrintQueueManager {
  /** 管理器名称 */
  readonly name: string;
  /** 队列列表 */
  readonly queues: Map<string, IPrintQueue>;
  /** 默认队列 */
  readonly defaultQueue?: IPrintQueue;

  /**
   * 创建队列
   */
  createQueue(name: string, config?: Partial<IPrintQueueConfig>): IPrintQueue;

  /**
   * 获取队列
   */
  getQueue(queueId: string): IPrintQueue | undefined;

  /**
   * 获取所有队列
   */
  getAllQueues(): IPrintQueue[];

  /**
   * 删除队列
   */
  deleteQueue(queueId: string): Promise<void>;

  /**
   * 获取统计信息
   */
  getStats(): {
    totalQueues: number;
    totalJobs: number;
    processingJobs: number;
    completedJobs: number;
    failedJobs: number;
    averageWaitTime: number;
    utilizationRate: number;
  };

  /**
   * 启动所有队列
   */
  startAll(): Promise<void>;

  /**
   * 停止所有队列
   */
  stopAll(): Promise<void>;

  /**
   * 暂停所有队列
   */
  pauseAll(reason?: string): void;

  /**
   * 恢复所有队列
   */
  resumeAll(): void;

  /**
   * 清空所有队列
   */
  clearAll(): Promise<void>;

  /**
   * 配置更新
   */
  updateConfig(queueId: string, config: Partial<IPrintQueueConfig>): Promise<void>;

  /**
   * 销毁管理器
   */
  dispose(): Promise<void>;
}

// 队列接口
export interface IPrintQueue {
  /** 队列ID */
  readonly id: string;
  /** 队列名称 */
  name: string;

  /**
   * 添加作业
   */
  addJob(job: IPrintJob): Promise<void>;

  /**
   * 移除作业
   */
  removeJob(jobId: string, reason?: string): Promise<IPrintJob | undefined>;

  /**
   * 获取作业列表
   */
  getJobs(): IPrintJob[];

  /**
   * 获取指定状态的作业
   */
  getJobsByStatus(status: PrintJobStatus): IPrintJob[];

  /**
   * 获取指定优先级的作业
   */
  getJobsByPriority(priority: PrintJobPriority): IPrintJob[];

  /**
   * 获取指定打印机的作业
   */
  getJobsByPrinter(printerId: string): IPrintJob[];

  /**
   * 查找作业
   */
  findJob(jobId: string): IPrintJob | undefined;

  /**
   * 获取队列长度
   */
  getLength(): number;

  /**
   * 检查是否为空
   */
  isEmpty(): boolean;

  /**
   * 检查是否已满
   */
  isFull(): boolean;

  /**
   * 开始处理
   */
  startProcessing(): Promise<void>;

  /**
   * 停止处理
   */
  stopProcessing(): Promise<void>;

  /**
   * 暂停
   */
  pause(reason?: string): void;

  /**
   * 恢复
   */
  resume(): void;

  /**
   * 清空队列
   */
  clearQueue(): Promise<void>;

  /**
   * 注册处理器
   */
  registerProcessor(type: string, processor: (job: IPrintJob) => Promise<void>): void;

  /**
   * 注销处理器
   */
  unregisterProcessor(type: string): void;

  /**
   * 获取统计信息
   */
  getQueueStats(): IPrintQueueStats;

  /**
   * 更新配置
   */
  updateConfig(config: Partial<IPrintQueueConfig>): Promise<void>;

  /**
   * 更新策略
   */
  updatePolicy(policy: Partial<IPrintQueuePolicy>): void;

  /**
   * 重新排序
   */
  resortQueue(): void;

  /**
   * 获取信息
   */
  getInfo(): {
    id: string;
    name: string;
    status: string;
    config: IPrintQueueConfig;
    policy: IPrintQueuePolicy;
    stats: IPrintQueueStats;
  };

  /**
   * 销毁
   */
  dispose(): Promise<void>;
}

// 作业调度器接口
export interface IJobScheduler {
  /** 调度器名称 */
  readonly name: string;

  /**
   * 调度作业
   */
  schedule(job: IPrintJob, scheduledTime: Date): Promise<void>;

  /**
   * 取消调度
   */
  unschedule(jobId: string): Promise<boolean>;

  /**
   * 获取调度作业
   */
  getScheduledJobs(): IPrintJob[];

  /**
   * 处理调度作业
   */
  processScheduledJobs(): Promise<void>;

  /**
   * 启动调度器
   */
  start(): void;

  /**
   * 停止调度器
   */
  stop(): void;

  /**
   * 销毁调度器
   */
  dispose(): void;
}

// 作业优先级管理器接口
export interface IPriorityManager {
  /**
   * 计算作业优先级
   */
  calculatePriority(job: IPrintJob): PrintJobPriority;

  /**
   * 设置优先级规则
   */
  setPriorityRules(rules: IPriorityRule[]): void;

  /**
   * 获取优先级规则
   */
  getPriorityRules(): IPriorityRule[];

  /**
   * 应用优先级提升
   */
  applyPriorityBoost(job: IPrintJob): void;

  /**
   * 重置优先级
   */
  resetPriority(job: IPrintJob): void;
}

// 优先级规则
export interface IPriorityRule {
  /** 规则ID */
  id: string;
  /** 规则名称 */
  name: string;
  /** 条件函数 */
  condition: (job: IPrintJob) => boolean;
  /** 目标优先级 */
  priority: PrintJobPriority;
  /** 规则权重 */
  weight: number;
  /** 是否启用 */
  enabled: boolean;
}

// 重试策略接口
export interface IRetryStrategy {
  /** 策略名称 */
  readonly name: string;

  /**
   * 计算重试延迟
   */
  calculateDelay(attempt: number, error?: Error): number;

  /**
   * 判断是否应该重试
   */
  shouldRetry(attempt: number, error?: Error): boolean;

  /**
   * 获取最大重试次数
   */
  getMaxRetries(): number;
}

// 重试策略实现
export class ExponentialBackoffRetry implements IRetryStrategy {
  public readonly name = 'exponential-backoff';

  constructor(
    private baseDelay: number = 1000,
    private maxDelay: number = 60000,
    private multiplier: number = 2,
    private maxRetries: number = 3
  ) {}

  calculateDelay(attempt: number): number {
    const delay = Math.min(this.baseDelay * Math.pow(this.multiplier, attempt), this.maxDelay);
    // 添加随机抖动
    return delay + Math.random() * 1000;
  }

  shouldRetry(attempt: number): boolean {
    return attempt < this.maxRetries;
  }

  getMaxRetries(): number {
    return this.maxRetries;
  }
}

export class FixedDelayRetry implements IRetryStrategy {
  public readonly name = 'fixed-delay';

  constructor(
    private delay: number = 5000,
    private maxRetries: number = 3
  ) {}

  calculateDelay(): number {
    return this.delay;
  }

  shouldRetry(attempt: number): boolean {
    return attempt < this.maxRetries;
  }

  getMaxRetries(): number {
    return this.maxRetries;
  }
}

export class LinearBackoffRetry implements IRetryStrategy {
  public readonly name = 'linear-backoff';

  constructor(
    private baseDelay: number = 1000,
    private increment: number = 1000,
    private maxDelay: number = 30000,
    private maxRetries: number = 3
  ) {}

  calculateDelay(attempt: number): number {
    const delay = Math.min(this.baseDelay + (attempt * this.increment), this.maxDelay);
    return delay + Math.random() * 500;
  }

  shouldRetry(attempt: number): boolean {
    return attempt < this.maxRetries;
  }

  getMaxRetries(): number {
    return this.maxRetries;
  }
}

// 队列监控接口
export interface IQueueMonitor {
  /**
   * 开始监控
   */
  startMonitoring(): void;

  /**
   * 停止监控
   */
  stopMonitoring(): void;

  /**
   * 获取监控指标
   */
  getMetrics(): IQueueMetrics;

  /**
   * 设置警报阈值
   */
  setAlertThresholds(thresholds: IAlertThresholds): void;

  /**
   * 检查警报
   */
  checkAlerts(): IAlert[];
}

// 队列指标
export interface IQueueMetrics {
  /** 时间戳 */
  timestamp: Date;
  /** 队列大小 */
  queueSize: number;
  /** 处理速率 */
  processingRate: number;
  /** 错误率 */
  errorRate: number;
  /** 平均等待时间 */
  averageWaitTime: number;
  /** 平均处理时间 */
  averageProcessingTime: number;
  /** 吞吐量 */
  throughput: number;
  /** 利用率 */
  utilizationRate: number;
}

// 警报阈值
export interface IAlertThresholds {
  /** 队列大小阈值 */
  queueSizeThreshold: number;
  /** 错误率阈值 */
  errorRateThreshold: number;
  /** 等待时间阈值 */
  waitTimeThreshold: number;
  /** 利用率阈值 */
  utilizationThreshold: number;
}

// 警报
export interface IAlert {
  /** 警报ID */
  id: string;
  /** 警报类型 */
  type: 'queue_size' | 'error_rate' | 'wait_time' | 'utilization';
  /** 严重程度 */
  severity: 'low' | 'medium' | 'high' | 'critical';
  /** 警报消息 */
  message: string;
  /** 当前值 */
  currentValue: number;
  /** 阈值 */
  threshold: number;
  /** 时间戳 */
  timestamp: Date;
  /** 队列ID */
  queueId: string;
}

// 重新导出打印相关类型
export { IPrintJob } from '../printer/types';

// 定义本地枚举以避免导出问题
export enum PrintJobStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  PAUSED = 'paused'
}

export enum PrintJobPriority {
  LOW = 1,
  NORMAL = 2,
  HIGH = 3,
  URGENT = 4,
  CRITICAL = 5
}