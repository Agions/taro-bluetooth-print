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
export class EventEmitter<T> {
  // 使用Map存储事件监听器，Set确保每个监听器唯一
  private listeners: Map<keyof T, Set<(data: T[keyof T]) => void>> = new Map();

  // Debug mode flag
  private debugMode = false;

  /**
   * Subscribe to an event
   *
   * @param event - Event name
   * @param handler - Event handler function
   * @returns Unsubscribe function
   */
  on<K extends keyof T>(event: K, handler: (data: T[K]) => void): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler as (data: T[keyof T]) => void);

    if (this.debugMode) {
      console.debug(`EventEmitter: Added listener for "${String(event)}"`, {
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
    const wrappedHandler = (data: T[K]) => {
      handler(data);
      this.off(event, wrappedHandler);
    };
    return this.on(event, wrappedHandler as (data: T[K]) => void);
  }

  /**
   * Adds a listener to the beginning of the listeners array for the specified event
   *
   * @param event - Event name
   * @param handler - Event handler function
   * @returns Unsubscribe function
   */
  prepend<K extends keyof T>(event: K, handler: (data: T[K]) => void): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }

    // Create a new set with the new handler first, then add existing handlers
    const existingHandlers = this.listeners.get(event)!;
    const newHandlers = new Set<(data: T[keyof T]) => void>();
    newHandlers.add(handler as (data: T[keyof T]) => void);
    existingHandlers.forEach(h => newHandlers.add(h));

    this.listeners.set(event, newHandlers);

    if (this.debugMode) {
      console.debug(`EventEmitter: Prepend listener for "${String(event)}"`, {
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
    const wrappedHandler = (data: T[K]) => {
      handler(data);
      this.off(event, wrappedHandler);
    };
    return this.prepend(event, wrappedHandler as (data: T[K]) => void);
  }

  /**
   * Unsubscribe from an event
   *
   * @param event - Event name
   * @param handler - Event handler function to remove
   */
  off<K extends keyof T>(event: K, handler: (data: T[K]) => void): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.delete(handler as (data: T[keyof T]) => void);

      if (this.debugMode) {
        console.debug(`EventEmitter: Removed listener for "${String(event)}"`, {
          listenerCount: handlers.size,
        });
      }

      // 当没有监听器时，移除事件以释放内存
      if (handlers.size === 0) {
        this.listeners.delete(event);

        if (this.debugMode) {
          console.debug(`EventEmitter: Removed event "${String(event)}" (no more listeners)`);
        }
      }
    }
  }

  /**
   * Emit an event to all subscribers
   *
   * @param event - Event name
   * @param data - Event payload (required for non-void events, optional for void events)
   */
  protected emit<K extends keyof T>(
    event: K,
    ...args: undefined extends T[K] ? [data?: T[K]] : [data: T[K]]
  ): void {
    const data = args[0] as T[K];

    if (this.debugMode) {
      console.debug(`EventEmitter: Emitting "${String(event)}"`, {
        data,
        listenerCount: this.listenerCount(event),
      });
    }

    const handlers = this.listeners.get(event);
    // 如果没有监听器，直接返回，避免不必要的操作
    if (!handlers || handlers.size === 0) {
      return;
    }

    // 复制监听器集合，避免在遍历过程中修改集合导致问题
    const handlersCopy = new Set(handlers);
    const handlerArray = Array.from(handlersCopy);

    // 使用for循环代替forEach，提高性能
    for (let i = 0; i < handlerArray.length; i++) {
      const handler = handlerArray[i];
      if (typeof handler === 'function') {
        try {
          // 根据事件类型决定是否传递数据
          if (data === undefined || data === null) {
            // @ts-expect-error - 类型安全由调用方保证
            handler();
          } else {
            handler(data);
          }
        } catch (error) {
          // 捕获并处理事件处理程序中的错误，避免影响其他监听器
          console.error(`Error in event handler for "${String(event)}":`, error);
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

    if (this.debugMode) {
      console.debug(`EventEmitter: Emitting async "${String(event)}"`, {
        data,
        listenerCount: this.listenerCount(event),
      });
    }

    const handlers = this.listeners.get(event);
    // 如果没有监听器，直接返回，避免不必要的操作
    if (!handlers || handlers.size === 0) {
      return;
    }

    // 复制监听器集合，避免在遍历过程中修改集合导致问题
    const handlersCopy = new Set(handlers);
    const promises: Promise<void>[] = [];

    handlersCopy.forEach(handler => {
      promises.push(
        new Promise<void>(resolve => {
          try {
            // 根据事件类型决定是否传递数据
            if (data === undefined || data === null) {
              // @ts-expect-error - 类型安全由调用方保证
              handler();
            } else {
              handler(data);
            }
          } catch (error) {
            // 捕获并处理事件处理程序中的错误，避免影响其他监听器
            console.error(`Error in event handler for "${String(event)}":`, error);
          } finally {
            resolve();
          }
        })
      );
    });

    await Promise.all(promises);

    if (this.debugMode) {
      console.debug(`EventEmitter: Finished emitting async "${String(event)}"`);
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
      this.listeners.delete(event);

      if (this.debugMode) {
        console.debug(
          `EventEmitter: Removed all ${listenerCount} listeners for "${String(event)}"`
        );
      }
    } else {
      // 移除所有事件的监听器
      const eventCount = this.listeners.size;
      this.listeners.clear();

      if (this.debugMode) {
        console.debug(`EventEmitter: Removed all ${eventCount} events and their listeners`);
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
    return this.listeners.get(event)?.size ?? 0;
  }

  /**
   * Get all listeners for an event
   *
   * @param event - Event name
   * @returns Array of event handlers
   */
  getListeners<K extends keyof T>(event: K): Array<(data: T[K]) => void> {
    const handlers = this.listeners.get(event);
    if (!handlers) {
      return [];
    }
    return Array.from(handlers) as Array<(data: T[K]) => void>;
  }

  /**
   * Get all event names that have listeners
   *
   * @returns Array of event names
   */
  eventNames(): Array<keyof T> {
    return Array.from(this.listeners.keys());
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
    console.debug(`EventEmitter: Debug mode ${enabled ? 'enabled' : 'disabled'}`);
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
    return this.listeners.size;
  }

  /**
   * Get the total number of listeners across all events
   *
   * @returns Total number of listeners
   */
  getTotalListeners(): number {
    let total = 0;
    for (const handlers of this.listeners.values()) {
      total += handlers.size;
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
