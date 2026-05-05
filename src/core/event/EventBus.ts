/**
 * 事件总线 - 提供强大的事件驱动能力
 * 支持事件订阅、发布、一次性监听、异步处理等
 */

import { normalizeError } from '@/utils/normalizeError';
import { Logger } from '@/utils/logger';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type EventHandler<T = any> = (payload: T) => void | Promise<void>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type EventFilter<T = any> = (payload: T) => boolean;

export interface EventSubscription {
  unsubscribe(): void;
}

export interface EventOptions {
  /** 优先级，数字越小优先级越高 */
  priority?: number;
  /** 过滤器 */
  filter?: EventFilter<any>;
  /** 是否只监听一次 */
  once?: boolean;
  /** 超时时间（毫秒） */
  timeout?: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface EventListener<T = any> {
  handler: EventHandler<T>;
  options: Required<Pick<EventOptions, 'priority'>> & Omit<EventOptions, 'priority'>;
  id: string;
}

export class EventBus {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private listeners = new Map<string | symbol, EventListener<any>[]>();
  private listenerIdCounter = 0;

  /**
   * 订阅事件
   */
  on<T>(
    event: string | symbol,
    handler: EventHandler<T>,
    options: EventOptions = {}
  ): EventSubscription {
    const id = this.generateListenerId();
    const listener: EventListener<T> = {
      handler,
      options: {
        priority: options.priority ?? 100,
        filter: options.filter,
        once: options.once ?? false,
        timeout: options.timeout,
      },
      id,
    };

    const eventKey = String(event);
    if (!this.listeners.has(eventKey)) {
      this.listeners.set(eventKey, []);
    }

    const listeners = this.listeners.get(eventKey)!;
    listeners.push(listener);

    // 按优先级排序
    listeners.sort((a, b) => a.options.priority - b.options.priority);

    return {
      unsubscribe: () => {
        this.off(event, handler);
      },
    };
  }

  /**
   * 只监听一次
   */
  once<T>(
    event: string | symbol,
    handler: EventHandler<T>,
    options: Omit<EventOptions, 'once'> = {}
  ): EventSubscription {
    return this.on(event, handler, { ...options, once: true });
  }

  /**
   * 取消订阅
   */
  off<T>(event: string | symbol, handler: EventHandler<T>): void {
    const eventKey = String(event);
    const listeners = this.listeners.get(eventKey);
    if (!listeners) return;

    const index = listeners.findIndex(l => l.handler === handler);
    if (index !== -1) {
      listeners.splice(index, 1);
    }

    if (listeners.length === 0) {
      this.listeners.delete(eventKey);
    }
  }

  /**
   * 发布事件
   */
  async emit<T>(event: string | symbol, payload: T): Promise<void> {
    const eventKey = String(event);
    const listeners = this.listeners.get(eventKey);
    if (!listeners || listeners.length === 0) return;

    const toRemove: number[] = [];

    for (let i = 0; i < listeners.length; i++) {
      const listener = listeners[i];
      if (!listener) continue;

      // 应用过滤器
      if (listener.options.filter && !listener.options.filter(payload)) {
        continue;
      }

      try {
        if (listener.options.timeout) {
          await this.executeWithTimeout(listener.handler, payload, listener.options.timeout);
        } else {
          await listener.handler(payload);
        }
      } catch (error) {
        Logger.error(`Error in event handler for "${eventKey}":`, error);
      }

      // 标记一次性监听器
      if (listener.options.once) {
        toRemove.push(i);
      }
    }

    // 移除一次性监听器
    for (let i = toRemove.length - 1; i >= 0; i--) {
      const index = toRemove[i];
      if (index !== undefined) {
        listeners.splice(index, 1);
      }
    }

    if (listeners.length === 0) {
      this.listeners.delete(eventKey);
    }
  }

  /**
   * 同步发布事件（不等待处理完成）
   */
  emitSync<T>(event: string | symbol, payload: T): void {
    this.emit(event, payload).catch(error => {
      Logger.error(`Error in async event handler for "${String(event)}":`, error);
    });
  }

  /**
   * 等待特定事件
   */
  waitFor<T>(event: string | symbol, timeout?: number, filter?: EventFilter<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = timeout
        ? setTimeout(() => {
            subscription.unsubscribe();
            reject(new Error(`Timeout waiting for event "${String(event)}"`));
          }, timeout)
        : null;

      const subscription = this.once<T>(
        event,
        payload => {
          if (timer) clearTimeout(timer);
          resolve(payload);
        },
        { filter }
      );
    });
  }

  /**
   * 检查是否有监听器
   */
  hasListeners(event: string | symbol): boolean {
    const listeners = this.listeners.get(String(event));
    return !!listeners && listeners.length > 0;
  }

  /**
   * 获取监听器数量
   */
  listenerCount(event: string | symbol): number {
    const listeners = this.listeners.get(String(event));
    return listeners?.length ?? 0;
  }

  /**
   * 移除所有监听器
   */
  removeAllListeners(event?: string | symbol): void {
    if (event) {
      this.listeners.delete(String(event));
    } else {
      this.listeners.clear();
    }
  }

  /**
   * 获取所有事件名称
   */
  eventNames(): (string | symbol)[] {
    return Array.from(this.listeners.keys());
  }

  private generateListenerId(): string {
    return `listener_${++this.listenerIdCounter}`;
  }

  private executeWithTimeout<T>(
    handler: EventHandler<T>,
    payload: T,
    timeout: number
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Event handler timed out after ${timeout}ms`));
      }, timeout);

      Promise.resolve(handler(payload))
        .then(() => {
          clearTimeout(timer);
          resolve();
        })
        .catch(error => {
          clearTimeout(timer);
          reject(normalizeError(error));
        });
    });
  }
}

// 全局事件总线实例
export const globalEventBus = new EventBus();
