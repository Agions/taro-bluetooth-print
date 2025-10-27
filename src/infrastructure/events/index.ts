/**
 * 事件系统模块导出
 */

// 核心类
export { EventBus, EventBusFactory } from './EventBus';
export {
  BaseEventHandler,
  SyncEventHandler,
  AsyncEventHandler,
  FunctionEventHandler,
  BatchEventHandler,
  ConditionalEventHandler
} from './EventHandler';

// 事件基类
export {
  BaseEvent,
  DomainEvent,
  IntegrationEvent,
  ApplicationEvent,
  EventFactory,
  EventBuilder
} from './Event';

// 类型定义
export type {
  IEvent,
  IDomainEvent,
  IIntegrationEvent,
  IApplicationEvent,
  IEventHandler,
  IEventBus,
  IEventMiddleware,
  IEventStore,
  IEventDispatcher,
  IEventListener,
  IEventProjection,
  IEventSnapshot,
  IEventSnapshotStore,
  IEventSerializer,
  IEventValidator,
  IEventFilter,
  IEventRouter,
  IEventChannel,
  RetryConfig,
  ValidationResult,
  ValidationError,
  ValidationWarning,
  IEventBusConfig,
  IEventStatistics
} from './types';

// 创建默认实例
export const defaultEventBus = EventBusFactory.createDefault({
  name: 'DefaultEventBus'
});

// 事件类型常量
export const EventTypes = {
  // 系统事件
  SYSTEM_STARTED: 'system.started',
  SYSTEM_STOPPED: 'system.stopped',
  SYSTEM_ERROR: 'system.error',

  // 蓝牙事件
  BLUETOOTH_ADAPTER_READY: 'bluetooth.adapter.ready',
  BLUETOOTH_ADAPTER_ERROR: 'bluetooth.adapter.error',
  BLUETOOTH_DEVICE_DISCOVERED: 'bluetooth.device.discovered',
  BLUETOOTH_DEVICE_CONNECTED: 'bluetooth.device.connected',
  BLUETOOTH_DEVICE_DISCONNECTED: 'bluetooth.device.disconnected',
  BLUETOOTH_CONNECTION_LOST: 'bluetooth.connection.lost',
  BLUETOOTH_DATA_RECEIVED: 'bluetooth.data.received',
  BLUETOOTH_DATA_SENT: 'bluetooth.data.sent',

  // 打印机事件
  PRINTER_ADDED: 'printer.added',
  PRINTER_REMOVED: 'printer.removed',
  PRINTER_CONNECTED: 'printer.connected',
  PRINTER_DISCONNECTED: 'printer.disconnected',
  PRINTER_READY: 'printer.ready',
  PRINTER_ERROR: 'printer.error',
  PRINTER_STATUS_CHANGED: 'printer.status.changed',

  // 打印作业事件
  PRINT_JOB_CREATED: 'print.job.created',
  PRINT_JOB_STARTED: 'print.job.started',
  PRINT_JOB_PROGRESS: 'print.job.progress',
  PRINT_JOB_COMPLETED: 'print.job.completed',
  PRINT_JOB_FAILED: 'print.job.failed',
  PRINT_JOB_CANCELLED: 'print.job.cancelled',
  PRINT_JOB_PAUSED: 'print.job.paused',
  PRINT_JOB_RESUMED: 'print.job.resumed',

  // 队列事件
  QUEUE_STARTED: 'queue.started',
  QUEUE_STOPPED: 'queue.stopped',
  QUEUE_PAUSED: 'queue.paused',
  QUEUE_RESUMED: 'queue.resumed',
  QUEUE_CLEARED: 'queue.cleared',

  // 配置事件
  CONFIG_CHANGED: 'config.changed',
  CONFIG_LOADED: 'config.loaded',
  CONFIG_SAVED: 'config.saved',
  CONFIG_VALIDATION_FAILED: 'config.validation.failed',

  // 模板事件
  TEMPLATE_REGISTERED: 'template.registered',
  TEMPLATE_REMOVED: 'template.removed',
  TEMPLATE_RENDERED: 'template.rendered',
  TEMPLATE_RENDER_FAILED: 'template.render.failed',

  // 错误事件
  ERROR_OCCURRED: 'error.occurred',
  ERROR_RECOVERED: 'error.recovered',
  ERROR_REPORTED: 'error.reported',

  // 监控事件
  METRICS_COLLECTED: 'metrics.collected',
  PERFORMANCE_MEASURED: 'performance.measured',
  HEALTH_CHECK_COMPLETED: 'health.check.completed'
} as const;

// 事件源常量
export const EventSources = {
  BLUETOOTH_ADAPTER: 'bluetooth.adapter',
  PRINTER_MANAGER: 'printer.manager',
  PRINT_QUEUE: 'print.queue',
  TEMPLATE_ENGINE: 'template.engine',
  CONFIG_MANAGER: 'config.manager',
  ERROR_HANDLER: 'error.handler',
  PERFORMANCE_MONITOR: 'performance.monitor',
  HEALTH_CHECKER: 'health.checker',
  USER_INTERFACE: 'user.interface',
  SYSTEM: 'system'
} as const;

// 事件中间件
export class LoggingMiddleware implements IEventMiddleware {
  readonly name = 'Logging';
  readonly priority = 100;

  async process(event: IEvent, next: () => Promise<void>): Promise<void> {
    console.log(`[${new Date().toISOString()}] Processing event: ${event.type} (${event.id})`);
    const startTime = Date.now();

    try {
      await next();
      const duration = Date.now() - startTime;
      console.log(`[${new Date().toISOString()}] Event processed successfully: ${event.type} (${duration}ms)`);
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`[${new Date().toISOString()}] Event processing failed: ${event.type} (${duration}ms)`, error);
      throw error;
    }
  }
}

export class MetricsMiddleware implements IEventMiddleware {
  readonly name = 'Metrics';
  readonly priority = 90;
  private metrics: Map<string, { count: number; totalTime: number; errors: number }> = new Map();

  async process(event: IEvent, next: () => Promise<void>): Promise<void> {
    const startTime = Date.now();
    let success = true;

    try {
      await next();
    } catch (error) {
      success = false;
      throw error;
    } finally {
      const duration = Date.now() - startTime;
      const current = this.metrics.get(event.type) || { count: 0, totalTime: 0, errors: 0 };

      this.metrics.set(event.type, {
        count: current.count + 1,
        totalTime: current.totalTime + duration,
        errors: current.errors + (success ? 0 : 1)
      });
    }
  }

  getMetrics(): Record<string, any> {
    const result: Record<string, any> = {};
    for (const [eventType, metrics] of this.metrics) {
      result[eventType] = {
        ...metrics,
        averageTime: metrics.count > 0 ? metrics.totalTime / metrics.count : 0,
        errorRate: metrics.count > 0 ? (metrics.errors / metrics.count) * 100 : 0
      };
    }
    return result;
  }

  resetMetrics(): void {
    this.metrics.clear();
  }
}

export class ValidationMiddleware implements IEventMiddleware {
  readonly name = 'Validation';
  readonly priority = 95;

  constructor(private validator?: IEventValidator) {}

  async process(event: IEvent, next: () => Promise<void>): Promise<void> {
    if (this.validator) {
      const validation = this.validator.validate(event);
      if (!validation.isValid) {
        throw new Error(`Event validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
      }
    }

    await next();
  }
}

// 事件工具函数
export class EventUtils {
  /**
   * 创建事件ID
   */
  static createEventId(eventType: string): string {
    return `${eventType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 验证事件格式
   */
  static validateEvent(event: any): event is IEvent {
    return (
      event &&
      typeof event.id === 'string' &&
      typeof event.type === 'string' &&
      typeof event.timestamp === 'number' &&
      event.id.length > 0 &&
      event.type.length > 0 &&
      event.timestamp > 0
    );
  }

  /**
   * 克隆事件
   */
  static cloneEvent<T extends IEvent>(event: T, modifications?: Partial<T>): T {
    return {
      ...event,
      ...modifications,
      id: this.createEventId(event.type),
      timestamp: Date.now()
    };
  }

  /**
   * 创建相关事件
   */
  static createRelatedEvent<T extends IEvent>(
    originalEvent: IEvent,
    eventType: string,
    data?: any,
    options?: {
      correlationId?: string;
      causationId?: string;
      source?: string;
    }
  ): T {
    return {
      id: this.createEventId(eventType),
      type: eventType,
      timestamp: Date.now(),
      data,
      source: options?.source || originalEvent.source,
      correlationId: options?.correlationId || (originalEvent as any).correlationId,
      causationId: options?.causationId || originalEvent.id,
      metadata: {
        ...(originalEvent.metadata || {}),
        relatedTo: originalEvent.id
      }
    } as T;
  }

  /**
   * 过滤过期事件
   */
  static filterExpiredEvents(events: IEvent[], maxAge: number): IEvent[] {
    const now = Date.now();
    return events.filter(event => now - event.timestamp <= maxAge);
  }

  /**
   * 按类型分组事件
   */
  static groupEventsByType(events: IEvent[]): Record<string, IEvent[]> {
    return events.reduce((groups, event) => {
      if (!groups[event.type]) {
        groups[event.type] = [];
      }
      groups[event.type].push(event);
      return groups;
    }, {} as Record<string, IEvent[]>);
  }

  /**
   * 按时间范围过滤事件
   */
  static filterEventsByTimeRange(
    events: IEvent[],
    startTime?: number,
    endTime?: number
  ): IEvent[] {
    return events.filter(event => {
      if (startTime && event.timestamp < startTime) return false;
      if (endTime && event.timestamp > endTime) return false;
      return true;
    });
  }

  /**
   * 事件转换为字符串
   */
  static eventToString(event: IEvent): string {
    return `${event.type}(id=${event.id}, timestamp=${new Date(event.timestamp).toISOString()})`;
  }
}