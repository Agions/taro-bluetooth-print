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
export class EventEmitter<T extends Record<string, any>> {
  private listeners: Map<keyof T, Set<Function>> = new Map();

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
    this.listeners.get(event)!.add(handler);

    // Return unsubscribe function
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
    return this.on(event, wrappedHandler);
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
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.listeners.delete(event);
      }
    }
  }

  /**
   * Emit an event to all subscribers
   *
   * @param event - Event name
   * @param data - Event payload (optional for void events)
   */
  protected emit<K extends keyof T>(event: K, ...args: T[K] extends void ? [] : [T[K]]): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      const data = args[0];
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in event handler for "${String(event)}":`, error);
        }
      });
    }
  }

  /**
   * Remove all event listeners
   */
  protected removeAllListeners(): void {
    this.listeners.clear();
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
}
