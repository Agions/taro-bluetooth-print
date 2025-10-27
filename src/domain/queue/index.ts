/**
 * 队列模块导出
 */

// 类型定义
export type {
  IPrintQueue,
  IPrintQueueManager,
  IPrintQueueConfig,
  IPrintQueuePolicy,
  IPrintQueueStats,
  IPrintQueueEvent,
  IJobScheduler,
  IPriorityManager,
  IPriorityRule,
  IQueueMonitor,
  IQueueMetrics,
  IAlertThresholds,
  IAlert,
  QueueProcessingMode,
  QueueStatus
} from './types';

// 重试策略
export {
  ExponentialBackoffRetry,
  FixedDelayRetry,
  LinearBackoffRetry,
  IRetryStrategy
} from './types';

// 核心实现
export { PrintQueue } from './PrintQueue';
export { QueueManager } from './QueueManager';

// 工厂函数
export function createQueue(
  name: string,
  configManager: any,
  config?: Partial<IPrintQueueConfig>
): PrintQueue {
  return new PrintQueue(name, configManager, config);
}

export function createQueueManager(
  name: string,
  configManager: any,
  config?: Partial<typeof QueueManager.prototype.config>
): QueueManager {
  return new QueueManager(name, configManager, config);
}

// 便捷工具函数
export class QueueUtils {
  /**
   * 生成队列ID
   */
  static generateQueueId(): string {
    return 'queue_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * 验证队列ID格式
   */
  static isValidQueueId(queueId: string): boolean {
    return /^queue_\d+_[a-z0-9]{9}$/.test(queueId);
  }

  /**
   * 格式化队列状态
   */
  static formatQueueStatus(status: QueueStatus): string {
    const statusNames = {
      idle: '空闲',
      processing: '处理中',
      paused: '已暂停',
      stopped: '已停止',
      error: '错误'
    };

    return statusNames[status] || status;
  }

  /**
   * 格式化利用率
   */
  static formatUtilizationRate(rate: number): string {
    return `${rate.toFixed(1)}%`;
  }

  /**
   * 格式化时间
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
   * 计算队列健康分数
   */
  static calculateHealthScore(stats: IPrintQueueStats): number {
    let score = 100;

    // 利用率影响 (最高-30分)
    if (stats.utilizationRate > 90) {
      score -= 30;
    } else if (stats.utilizationRate > 80) {
      score -= 20;
    } else if (stats.utilizationRate > 70) {
      score -= 10;
    }

    // 错误率影响 (最高-40分)
    const totalJobs = stats.completedJobs + stats.failedJobs;
    if (totalJobs > 0) {
      const errorRate = stats.failedJobs / totalJobs;
      if (errorRate > 0.2) {
        score -= 40;
      } else if (errorRate > 0.1) {
        score -= 30;
      } else if (errorRate > 0.05) {
        score -= 20;
      } else if (errorRate > 0.01) {
        score -= 10;
      }
    }

    // 等待时间影响 (最高-20分)
    if (stats.averageWaitTime > 60000) { // 1分钟
      score -= 20;
    } else if (stats.averageWaitTime > 30000) { // 30秒
      score -= 15;
    } else if (stats.averageWaitTime > 10000) { // 10秒
      score -= 10;
    } else if (stats.averageWaitTime > 5000) { // 5秒
      score -= 5;
    }

    // 状态影响 (最高-10分)
    if (stats.status === 'error') {
      score -= 10;
    } else if (stats.status === 'paused') {
      score -= 5;
    }

    return Math.max(0, score);
  }

  /**
   * 获取健康等级
   */
  static getHealthLevel(score: number): 'excellent' | 'good' | 'fair' | 'poor' | 'critical' {
    if (score >= 90) return 'excellent';
    if (score >= 75) return 'good';
    if (score >= 60) return 'fair';
    if (score >= 40) return 'poor';
    return 'critical';
  }

  /**
   * 格式化健康等级
   */
  static formatHealthLevel(level: string): string {
    const levelNames = {
      excellent: '优秀',
      good: '良好',
      fair: '一般',
      poor: '较差',
      critical: '危险'
    };

    return levelNames[level as keyof typeof levelNames] || level;
  }

  /**
   * 创建优先级规则
   */
  static createPriorityRule(
    id: string,
    name: string,
    condition: (job: any) => boolean,
    priority: any,
    weight: number = 1
  ): any {
    return {
      id,
      name,
      condition,
      priority,
      weight,
      enabled: true
    };
  }

  /**
   * 创建重试策略
   */
  static createRetryStrategy(
    type: 'exponential' | 'fixed' | 'linear',
    options?: {
      baseDelay?: number;
      maxDelay?: number;
      increment?: number;
      multiplier?: number;
      maxRetries?: number;
    }
  ): IRetryStrategy {
    switch (type) {
      case 'exponential':
        return new ExponentialBackoffRetry(
          options?.baseDelay,
          options?.maxDelay,
          options?.multiplier,
          options?.maxRetries
        );
      case 'linear':
        return new LinearBackoffRetry(
          options?.baseDelay,
          options?.increment,
          options?.maxDelay,
          options?.maxRetries
        );
      case 'fixed':
      default:
        return new FixedDelayRetry(
          options?.baseDelay,
          options?.maxRetries
        );
    }
  }

  /**
   * 创建队列配置
   */
  static createQueueConfig(config?: Partial<IPrintQueueConfig>): IPrintQueueConfig {
    return {
      maxSize: 100,
      maxConcurrency: 3,
      processingInterval: 1000,
      autoStart: true,
      persistState: true,
      retryDelay: 5000,
      maxRetries: 3,
      jobTimeout: 30000,
      priorityMode: 'fifo',
      processingMode: 'sequential',
      enableMetrics: true,
      enableLogging: true,
      ...config
    };
  }

  /**
   * 创建队列策略
   */
  static createQueuePolicy(policy?: Partial<IPrintQueuePolicy>): IPrintQueuePolicy {
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
      enableAffinity: false,
      ...policy
    };
  }

  /**
   * 分析队列性能
   */
  static analyzePerformance(stats: IPrintQueueStats): {
    efficiency: number;
    throughput: number;
    reliability: number;
    responseTime: number;
    bottlenecks: string[];
    recommendations: string[];
  } {
    const recommendations: string[] = [];
    const bottlenecks: string[] = [];

    // 计算效率
    const efficiency = Math.max(0, 100 - stats.utilizationRate);

    // 计算吞吐量 (作业/小时)
    const throughput = stats.processingRate;

    // 计算可靠性
    const totalJobs = stats.completedJobs + stats.failedJobs;
    const reliability = totalJobs > 0 ? (stats.completedJobs / totalJobs) * 100 : 100;

    // 响应时间 (毫秒)
    const responseTime = stats.averageWaitTime + stats.averageProcessingTime || 0;

    // 分析瓶颈
    if (stats.utilizationRate > 85) {
      bottlenecks.push('高利用率');
      recommendations.push('考虑增加队列大小或并行处理');
    }

    if (stats.averageWaitTime > 30000) {
      bottlenecks.push('长等待时间');
      recommendations.push('优化处理逻辑或增加处理器');
    }

    if (reliability < 95) {
      bottlenecks.push('低可靠性');
      recommendations.push('检查错误处理和重试策略');
    }

    if (stats.oldestJobAge > 60000) {
      bottlenecks.push('积压作业');
      recommendations.push('增加处理频率或减少作业复杂度');
    }

    return {
      efficiency,
      throughput,
      reliability,
      responseTime,
      bottlenecks,
      recommendations
    };
  }

  /**
   * 比较队列性能
   */
  static compareQueues(
    queue1Stats: IPrintQueueStats,
    queue2Stats: IPrintQueueStats
  ): {
    winner: 'queue1' | 'queue2' | 'tie';
    scores: {
      queue1: number;
      queue2: number;
    };
    comparison: {
      utilization: number;
      throughput: number;
      reliability: number;
      waitTime: number;
    };
  } {
    const queue1Score = this.calculateHealthScore(queue1Stats);
    const queue2Score = this.calculateHealthScore(queue2Stats);

    const utilizationDiff = queue1Stats.utilizationRate - queue2Stats.utilizationRate;
    const throughputDiff = queue1Stats.processingRate - queue2Stats.processingRate;

    const queue1Reliability = queue1Stats.completedJobs / (queue1Stats.completedJobs + queue1Stats.failedJobs) || 0;
    const queue2Reliability = queue2Stats.completedJobs / (queue2Stats.completedJobs + queue2Stats.failedJobs) || 0;
    const reliabilityDiff = queue1Reliability - queue2Reliability;

    const waitTimeDiff = queue1Stats.averageWaitTime - queue2Stats.averageWaitTime;

    return {
      winner: queue1Score > queue2Score ? 'queue1' : queue1Score < queue2Score ? 'queue2' : 'tie',
      scores: { queue1: queue1Score, queue2: queue2Score },
      comparison: {
        utilization: utilizationDiff,
        throughput: throughputDiff,
        reliability: reliabilityDiff * 100,
        waitTime: waitTimeDiff
      }
    };
  }

  /**
   * 优化队列配置建议
   */
  static optimizeConfig(stats: IPrintQueueStats): {
    currentConfig: IPrintQueueConfig;
    recommendedConfig: IPrintQueueConfig;
    changes: Array<{
      property: string;
      current: any;
      recommended: any;
      reason: string;
    }>;
  } {
    const currentConfig = stats.config;
    const recommendedConfig = { ...currentConfig };
    const changes: Array<{
      property: string;
      current: any;
      recommended: any;
      reason: string;
    }> = [];

    // 基于利用率调整队列大小
    if (stats.utilizationRate > 90) {
      recommendedConfig.maxSize = Math.min(currentConfig.maxSize * 1.5, 500);
      changes.push({
        property: 'maxSize',
        current: currentConfig.maxSize,
        recommended: recommendedConfig.maxSize,
        reason: '队列利用率过高，建议增加容量'
      });
    } else if (stats.utilizationRate < 30 && currentConfig.maxSize > 50) {
      recommendedConfig.maxSize = Math.max(currentConfig.maxSize * 0.8, 20);
      changes.push({
        property: 'maxSize',
        current: currentConfig.maxSize,
        recommended: recommendedConfig.maxSize,
        reason: '队列利用率过低，可以减少容量'
      });
    }

    // 基于等待时间调整处理间隔
    if (stats.averageWaitTime > 30000) {
      recommendedConfig.processingInterval = Math.max(currentConfig.processingInterval * 0.5, 100);
      changes.push({
        property: 'processingInterval',
        current: currentConfig.processingInterval,
        recommended: recommendedConfig.processingInterval,
        reason: '等待时间过长，建议增加处理频率'
      });
    }

    // 基于错误率调整重试次数
    const totalJobs = stats.completedJobs + stats.failedJobs;
    if (totalJobs > 0) {
      const errorRate = stats.failedJobs / totalJobs;
      if (errorRate > 0.2 && currentConfig.maxRetries < 5) {
        recommendedConfig.maxRetries = Math.min(currentConfig.maxRetries + 1, 5);
        changes.push({
          property: 'maxRetries',
          current: currentConfig.maxRetries,
          recommended: recommendedConfig.maxRetries,
          reason: '错误率较高，建议增加重试次数'
        });
      }
    }

    return {
      currentConfig,
      recommendedConfig,
      changes
    };
  }
}

// 常量定义
export const QUEUE_CONSTANTS = {
  // 默认配置
  DEFAULT_CONFIG: {
    MAX_SIZE: 100,
    MAX_CONCURRENCY: 3,
    PROCESSING_INTERVAL: 1000,
    AUTO_START: true,
    PERSIST_STATE: true,
    RETRY_DELAY: 5000,
    MAX_RETRIES: 3,
    JOB_TIMEOUT: 30000,
    PRIORITY_MODE: 'fifo' as const,
    PROCESSING_MODE: 'sequential' as const,
    ENABLE_METRICS: true,
    ENABLE_LOGGING: true
  } as const,

  // 优先级模式
  PRIORITY_MODES: {
    FIFO: 'fifo' as const,
    PRIORITY: 'priority' as const,
    DEADLINE: 'deadline' as const
  } as const,

  // 处理模式
  PROCESSING_MODES: {
    SEQUENTIAL: 'sequential' as const,
    PARALLEL: 'parallel' as const,
    PRIORITY: 'priority' as const,
    DEADLINE: 'deadline' as const
  } as const,

  // 溢出处理方式
  OVERFLOW_ACTIONS: {
    REJECT: 'reject' as const,
    DROP: 'drop' as const,
    QUEUE: 'queue' as const
  } as const,

  // 死信处理方式
  DEAD_LETTER_ACTIONS: {
    RETRY: 'retry' as const,
    DROP: 'drop' as const,
    DEAD_LETTER: 'dead_letter' as const
  } as const,

  // 健康分数阈值
  HEALTH_THRESHOLDS: {
    EXCELLENT: 90,
    GOOD: 75,
    FAIR: 60,
    POOR: 40,
    CRITICAL: 0
  } as const
};

// 默认实例
export const defaultQueueManager = (configManager: any) => {
  return createQueueManager('default', configManager);
};