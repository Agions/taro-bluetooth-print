/**
 * Type-safe event emitter for pub/sub pattern
 *
 * @template T - Event map type with event names as keys and payload types as values
 *
 * @example
 * ```typescript
 * interface MyEvents {
 *   'connected': { deviceId: string };
 *   'error': Error;
 *   'progress': { current: number; total: number };
 *   'ready': void;
 * }
 *
 * class MyClass extends EventEmitter<MyEvents> {
 *   connect() {
 *     this.emit('connected', { deviceId: '123' });
 *   }
 * }
 *
 * const instance = new MyClass();
 * const unsubscribe = instance.on('connected', (data) => {
 *   console.log('Connected to:', data.deviceId);
 * });
 * ```
 */
import { Logger } from '@/utils/logger';

export class EventEmitter<T> {
  private listeners: { [K in keyof T]?: Set<(data: T[K]) => void> } = {};
  private debugMode = false;
  protected readonly logger = Logger.scope('EventEmitter');

  /** 确保事件监听器集合存在 */
  private ensureListeners<K extends keyof T>(event: K): Set<(data: T[K]) => void> {
    if (!this.listeners[event]) {
      this.listeners[event] = new Set<(data: T[K]) => void>();
    }
    return this.listeners[event] as Set<(data: T[K]) => void>;
  }

  /**
   * Subscribe to an event
   *
   * @param event - Event name
   * @param handler - Event handler function
   * @returns Unsubscribe function
   */
  on<K extends keyof T>(event: K, handler: (data: T[K]) => void): () => void {
    const existing = this.ensureListeners(event);
    existing.add(handler);

    if (this.debugMode) {
      this.logger.debug(`EventEmitter: Added listener for "${String(event)}"`, {
        listenerCount: this.listenerCount(event),
      });
    }

    // 返回取消订阅函数
    return () => this.off(event, handler);
  }

  /**
   * Subscribe to an event, but only for the first occurrence
   *
   * @param event - Event name
   * @param handler - Event handler function
   * @returns Unsubscribe function
   */
  once<K extends keyof T>(event: K, handler: (data: T[K]) => void): () => void {
    const wrappedHandler = this.wrapOnceHandler(event, handler);
    return this.on(event, wrappedHandler);
  }

  /**
   * Adds a listener to the beginning of the listeners array for the specified event
   *
   * @param event - Event name
   * @param handler - Event handler function
   * @returns Unsubscribe function
   */
  prepend<K extends keyof T>(event: K, handler: (data: T[K]) => void): () => void {
    const existingHandlers = this.ensureListeners(event);
    const newHandlers = new Set<(data: T[K]) => void>();
    newHandlers.add(handler);
    existingHandlers.forEach(h => newHandlers.add(h));

    this.listeners[event] = newHandlers;

    if (this.debugMode) {
      this.logger.debug(`EventEmitter: Prepend listener for "${String(event)}"`, {
        listenerCount: this.listenerCount(event),
      });
    }

    return () => this.off(event, handler);
  }

  /**
   * Adds a one-time listener to the beginning of the listeners array for the specified event
   *
   * @param event - Event name
   * @param handler - Event handler function
   * @returns Unsubscribe function
   */
  prependOnce<K extends keyof T>(event: K, handler: (data: T[K]) => void): () => void {
    const wrappedHandler = this.wrapOnceHandler(event, handler);
    return this.prepend(event, wrappedHandler);
  }

  /**
   * Create a one-shot wrapper that auto-removes itself after the first invocation.
   * Shared by once() and prependOnce().
   */
  private wrapOnceHandler<K extends keyof T>(
    event: K,
    handler: (data: T[K]) => void
  ): (data: T[K]) => void {
    const wrappedHandler = (data: T[K]) => {
      handler(data);
      this.off(event, wrappedHandler);
    };
    return wrappedHandler;
  }

  /**
   * Unsubscribe from an event
   *
   * @param event - Event name
   * @param handler - Event handler function to remove
   */
  off<K extends keyof T>(event: K, handler: (data: T[K]) => void): void {
    const handlers = this.listeners[event];
    if (handlers) {
      handlers.delete(handler);

      if (this.debugMode) {
        this.logger.debug(`EventEmitter: Removed listener for "${String(event)}"`, {
          listenerCount: handlers.size,
        });
      }

      // 当没有监听器时，移除事件以释放内存
      if (handlers.size === 0) {
        delete this.listeners[event];

        if (this.debugMode) {
          this.logger.debug(`EventEmitter: Removed event "${String(event)}" (no more listeners)`);
        }
      }
    }
  }

  /** 获取事件监听器，如果不存在则返回空 Set */
  private getHandlers<K extends keyof T>(event: K): Set<(data: T[K]) => void> {
    return this.listeners[event] ?? new Set();
  }

  /**
   * Emit an event to all subscribers
   *
   * @param event - Event name
   * @param data - Event payload
   */
  protected emit<K extends keyof T>(
    event: K,
    ...args: undefined extends T[K] ? [data?: T[K]] : [data: T[K]]
  ): void {
    const data = args[0] as T[K];
    const handlers = this.getHandlers(event);

    if (this.debugMode) {
      this.logger.debug(`EventEmitter: Emitting "${String(event)}"`, {
        data,
        listenerCount: handlers.size,
      });
    }

    // 如果没有监听器，直接返回，避免不必要的操作
    if (handlers.size === 0) {
      return;
    }

    // Iterate directly over the Set. Since Set is insertion-ordered and
    // for...of snapshots the iterator at the start, handlers added/removed
    // during iteration won't affect the current emit cycle.
    for (const handler of handlers) {
      if (typeof handler === 'function') {
        try {
          handler(data);
        } catch (error) {
          // 捕获并处理事件处理程序中的错误，避免影响其他监听器
          this.logger.error(`Error in event handler for "${String(event)}":`, error);
        }
      }
    }
  }

  /**
   * Asynchronously emit an event to all subscribers, waiting for all handlers to complete
   *
   * @param event - Event name
   * @param data - Event payload (required for non-void events, optional for void events)
   * @returns Promise that resolves when all handlers have completed
   */
  protected async emitAsync<K extends keyof T>(
    event: K,
    ...args: undefined extends T[K] ? [data?: T[K]] : [data: T[K]]
  ): Promise<void> {
    const data = args[0] as T[K];
    const handlers = this.getHandlers(event);

    if (this.debugMode) {
      this.logger.debug(`EventEmitter: Emitting async "${String(event)}"`, {
        data,
        listenerCount: handlers.size,
      });
    }

    // 如果没有监听器，直接返回，避免不必要的操作
    if (handlers.size === 0) {
      return;
    }

    // Iterate directly over the Set snapshot (for...of snapshots at start)
    const promises: Promise<void>[] = [];

    handlers.forEach(handler => {
      promises.push(
        (async () => {
          try {
            const result = handler(data);
            // 等待异步 handler 完成
            if (result != null && typeof (result as Promise<void>).then === 'function') {
              await (result as Promise<void>);
            }
          } catch (error) {
            // 捕获并处理事件处理程序中的错误，避免影响其他监听器
            this.logger.error(`Error in event handler for "${String(event)}":`, error);
          }
        })()
      );
    });

    await Promise.all(promises);

    if (this.debugMode) {
      this.logger.debug(`EventEmitter: Finished emitting async "${String(event)}"`);
    }
  }

  /**
   * Remove all event listeners
   * @param event - Optional event name to remove all listeners for a specific event
   */
  protected removeAllListeners<K extends keyof T>(event?: K): void {
    if (event) {
      // 移除特定事件的所有监听器
      const listenerCount = this.listenerCount(event);
      delete this.listeners[event];

      if (this.debugMode) {
        this.logger.debug(
          `EventEmitter: Removed all ${listenerCount} listeners for "${String(event)}"`
        );
      }
    } else {
      // 移除所有事件的监听器
      const eventCount = Object.keys(this.listeners).length;
      this.listeners = {};

      if (this.debugMode) {
        this.logger.debug(`EventEmitter: Removed all ${eventCount} events and their listeners`);
      }
    }
  }

  /**
   * Get the number of listeners for an event
   *
   * @param event - Event name
   * @returns Number of listeners
   */
  listenerCount<K extends keyof T>(event: K): number {
    return this.listeners[event]?.size ?? 0;
  }

  /**
   * Get all listeners for an event
   *
   * @param event - Event name
   * @returns Array of event handlers
   */
  getListeners<K extends keyof T>(event: K): Array<(data: T[K]) => void> {
    const handlers = this.listeners[event];
    if (!handlers) {
      return [];
    }
    return Array.from(handlers);
  }

  /**
   * Get all event names that have listeners
   *
   * @returns Array of event names
   */
  eventNames(): Array<keyof T> {
    return Object.keys(this.listeners) as Array<keyof T>;
  }

  /**
   * Check if there are any listeners for an event
   *
   * @param event - Event name
   * @returns True if there are listeners, false otherwise
   */
  hasListeners<K extends keyof T>(event: K): boolean {
    return this.listenerCount(event) > 0;
  }

  /**
   * Set debug mode on or off
   *
   * @param enabled - Whether to enable debug mode
   */
  setDebugMode(enabled: boolean): void {
    this.debugMode = enabled;
    this.logger.debug(`EventEmitter: Debug mode ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Check if debug mode is enabled
   *
   * @returns True if debug mode is enabled, false otherwise
   */
  isDebugMode(): boolean {
    return this.debugMode;
  }

  /**
   * Get the total number of events with listeners
   *
   * @returns Total number of events
   */
  getTotalEvents(): number {
    return Object.keys(this.listeners).length;
  }

  /**
   * Get the total number of listeners across all events
   *
   * @returns Total number of listeners
   */
  getTotalListeners(): number {
    let total = 0;
    for (const key of Object.keys(this.listeners) as Array<keyof T>) {
      total += this.listeners[key]?.size ?? 0;
    }
    return total;
  }

  /**
   * Reset the event emitter by removing all listeners
   */
  protected reset(): void {
    this.removeAllListeners();
    this.debugMode = false;
  }
}
