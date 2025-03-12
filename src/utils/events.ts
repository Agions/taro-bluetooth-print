/**
 * 事件管理系统
 * 提供发布-订阅模式，用于组件间通信和状态管理
 */

import { logger } from './logger';

// 事件类型定义
export type EventCallback = (...args: any[]) => void;

// 事件管理器类
export class EventManager {
  private static instance: EventManager;
  private listeners: Map<string, EventCallback[]> = new Map();

  private constructor() {}

  /**
   * 获取事件管理器单例
   */
  public static getInstance(): EventManager {
    if (!EventManager.instance) {
      EventManager.instance = new EventManager();
    }
    return EventManager.instance;
  }

  /**
   * 注册事件监听器
   * @param eventName 事件名称
   * @param callback 回调函数
   * @returns 取消订阅的函数
   */
  public on(eventName: string, callback: EventCallback): () => void {
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, []);
    }
    
    this.listeners.get(eventName)!.push(callback);
    logger.debug(`事件 ${eventName} 添加了新的监听器`);
    
    // 返回取消订阅的函数
    return () => this.off(eventName, callback);
  }

  /**
   * 注册一次性事件监听器
   * @param eventName 事件名称
   * @param callback 回调函数
   * @returns 取消订阅的函数
   */
  public once(eventName: string, callback: EventCallback): () => void {
    const onceCallback: EventCallback = (...args: any[]) => {
      this.off(eventName, onceCallback);
      callback(...args);
    };
    
    return this.on(eventName, onceCallback);
  }

  /**
   * 移除事件监听器
   * @param eventName 事件名称
   * @param callback 回调函数，如果不提供则移除所有该事件的监听器
   */
  public off(eventName: string, callback?: EventCallback): void {
    if (!this.listeners.has(eventName)) {
      return;
    }
    
    if (!callback) {
      // 移除所有该事件的监听器
      this.listeners.delete(eventName);
      logger.debug(`事件 ${eventName} 的所有监听器已移除`);
      return;
    }
    
    // 移除特定回调函数
    const callbacks = this.listeners.get(eventName)!;
    const index = callbacks.indexOf(callback);
    
    if (index !== -1) {
      callbacks.splice(index, 1);
      logger.debug(`事件 ${eventName} 的一个监听器已移除`);
      
      // 如果没有监听器了，清理Map
      if (callbacks.length === 0) {
        this.listeners.delete(eventName);
      }
    }
  }

  /**
   * 触发事件
   * @param eventName 事件名称
   * @param args 事件参数
   */
  public emit(eventName: string, ...args: any[]): void {
    if (!this.listeners.has(eventName)) {
      return;
    }
    
    const callbacks = [...this.listeners.get(eventName)!];
    callbacks.forEach(callback => {
      try {
        callback(...args);
      } catch (error) {
        logger.error(`事件 ${eventName} 的监听器执行出错:`, error);
      }
    });
    
    logger.debug(`事件 ${eventName} 已触发, 参数:`, args);
  }

  /**
   * 获取事件监听器数量
   * @param eventName 事件名称
   * @returns 监听器数量
   */
  public listenerCount(eventName: string): number {
    return this.listeners.has(eventName) ? this.listeners.get(eventName)!.length : 0;
  }

  /**
   * 获取所有已注册的事件
   * @returns 事件名称数组
   */
  public eventNames(): string[] {
    return Array.from(this.listeners.keys());
  }

  /**
   * 移除所有事件监听器
   */
  public removeAllListeners(): void {
    this.listeners.clear();
    logger.debug('所有事件监听器已移除');
  }
}

// 导出事件管理器实例
export const eventManager = EventManager.getInstance();

// 导出常用事件名称
export const EVENTS = {
  // 蓝牙相关事件
  BLUETOOTH_INITIALIZED: 'bluetooth:initialized',
  BLUETOOTH_DISCOVERY_STARTED: 'bluetooth:discovery_started',
  BLUETOOTH_DISCOVERY_STOPPED: 'bluetooth:discovery_stopped',
  BLUETOOTH_DEVICE_FOUND: 'bluetooth:device_found',
  BLUETOOTH_CONNECTED: 'bluetooth:connected',
  BLUETOOTH_DISCONNECTED: 'bluetooth:disconnected',
  BLUETOOTH_ERROR: 'bluetooth:error',
  
  // 打印机相关事件
  PRINTER_COMMAND_SENT: 'printer:command_sent',
  PRINTER_PRINT_STARTED: 'printer:print_started',
  PRINTER_PRINT_COMPLETED: 'printer:print_completed',
  PRINTER_ERROR: 'printer:error'
}; 