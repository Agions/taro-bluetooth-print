/**
 * 打印机管理Hook
 * 提供打印任务管理、状态监控和打印功能
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { BluetoothPrinter } from '../BluetoothPrinter';
import { IPrintResult, IPrintRequest, IQueueStatus } from '../types';

export interface UsePrinterOptions {
  /** 是否自动初始化 */
  autoInitialize?: boolean;
  /** 打印超时时间（毫秒） */
  printTimeout?: number;
  /** 是否启用队列处理 */
  enableQueue?: boolean;
  /** 默认打印份数 */
  defaultCopies?: number;
}

export interface UsePrinterReturn {
  /** 打印机状态 */
  isInitialized: boolean;
  /** 是否正在打印 */
  isPrinting: boolean;
  /** 队列状态 */
  queueStatus: IQueueStatus;
  /** 当前错误 */
  error: string | null;

  /** 方法 */
  initialize: () => Promise<void>;
  printText: (text: string, options?: any) => Promise<IPrintResult>;
  printTemplate: (templateId: string, data: any, options?: any) => Promise<IPrintResult>;
  printImage: (imageData: ArrayBuffer | string, options?: any) => Promise<IPrintResult>;
  printBarcode: (data: string, type: string, options?: any) => Promise<IPrintResult>;
  printQRCode: (data: string, options?: any) => Promise<IPrintResult>;
  printBatch: (requests: IPrintRequest[]) => Promise<IPrintResult[]>;

  /** 队列管理 */
  getQueueStatus: () => IQueueStatus;
  clearQueue: () => void;
  pauseQueue: () => void;
  resumeQueue: () => void;

  /** 工具方法 */
  clearError: () => void;
  refreshStatus: () => void;

  /** 事件处理 */
  onJobQueued: (callback: (job: any) => void) => () => void;
  onJobStarted: (callback: (job: any) => void) => () => void;
  onJobCompleted: (callback: (job: any) => void) => () => void;
  onJobFailed: (callback: (job: any, error: any) => void) => () => void;
  onPrinterError: (callback: (error: string) => void) => () => void;
}

/**
 * 打印机管理Hook
 */
export function usePrinter(options: UsePrinterOptions = {}): UsePrinterReturn {
  const {
    autoInitialize = true,
    printTimeout = 30000,
    enableQueue = true,
    defaultCopies = 1
  } = options;

  // 状态管理
  const [isInitialized, setIsInitialized] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [queueStatus, setQueueStatus] = useState<IQueueStatus>({
    size: 0,
    processing: 0,
    completed: 0,
    failed: 0,
    paused: false,
    processingJobs: []
  });
  const [error, setError] = useState<string | null>(null);

  // 引用管理
  const printerRef = useRef<BluetoothPrinter | null>(null);
  const eventListenersRef = useRef<Map<string, Function[]>>(new Map());
  const statusIntervalRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * 初始化打印机管理器
   */
  const initialize = useCallback(async () => {
    try {
      setError(null);

      if (!printerRef.current) {
        printerRef.current = new BluetoothPrinter();
      }

      await printerRef.current.initialize();
      setIsInitialized(true);

      // 设置事件监听
      setupEventListeners();

      // 开始状态更新
      startStatusUpdates();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '初始化失败';
      setError(errorMessage);
      throw err;
    }
  }, []);

  /**
   * 打印文本
   */
  const printText = useCallback(async (text: string, options: any = {}) => {
    if (!isInitialized) {
      throw new Error('打印机未初始化');
    }

    try {
      setError(null);
      setIsPrinting(true);

      const printOptions = {
        copies: defaultCopies,
        timeout: printTimeout,
        ...options
      };

      const result = await printerRef.current!.printText(text, printOptions);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '打印失败';
      setError(errorMessage);
      throw err;
    } finally {
      setIsPrinting(false);
    }
  }, [isInitialized, defaultCopies, printTimeout]);

  /**
   * 打印模板
   */
  const printTemplate = useCallback(async (
    templateId: string,
    data: any,
    options: any = {}
  ) => {
    if (!isInitialized) {
      throw new Error('打印机未初始化');
    }

    try {
      setError(null);
      setIsPrinting(true);

      const printOptions = {
        copies: defaultCopies,
        timeout: printTimeout,
        ...options
      };

      const result = await printerRef.current!.printTemplate(templateId, data, printOptions);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '打印失败';
      setError(errorMessage);
      throw err;
    } finally {
      setIsPrinting(false);
    }
  }, [isInitialized, defaultCopies, printTimeout]);

  /**
   * 打印图片
   */
  const printImage = useCallback(async (imageData: ArrayBuffer | string, options: any = {}) => {
    if (!isInitialized) {
      throw new Error('打印机未初始化');
    }

    try {
      setError(null);
      setIsPrinting(true);

      const printOptions = {
        copies: defaultCopies,
        timeout: printTimeout,
        ...options
      };

      const result = await printerRef.current!.printImage(imageData, printOptions);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '打印失败';
      setError(errorMessage);
      throw err;
    } finally {
      setIsPrinting(false);
    }
  }, [isInitialized, defaultCopies, printTimeout]);

  /**
   * 打印条形码
   */
  const printBarcode = useCallback(async (
    data: string,
    type: string,
    options: any = {}
  ) => {
    if (!isInitialized) {
      throw new Error('打印机未初始化');
    }

    try {
      setError(null);
      setIsPrinting(true);

      const printOptions = {
        copies: defaultCopies,
        timeout: printTimeout,
        ...options
      };

      const result = await printerRef.current!.printBarcode(data, type, printOptions);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '打印失败';
      setError(errorMessage);
      throw err;
    } finally {
      setIsPrinting(false);
    }
  }, [isInitialized, defaultCopies, printTimeout]);

  /**
   * 打印二维码
   */
  const printQRCode = useCallback(async (data: string, options: any = {}) => {
    if (!isInitialized) {
      throw new Error('打印机未初始化');
    }

    try {
      setError(null);
      setIsPrinting(true);

      const printOptions = {
        copies: defaultCopies,
        timeout: printTimeout,
        ...options
      };

      const result = await printerRef.current!.printQRCode(data, printOptions);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '打印失败';
      setError(errorMessage);
      throw err;
    } finally {
      setIsPrinting(false);
    }
  }, [isInitialized, defaultCopies, printTimeout]);

  /**
   * 批量打印
   */
  const printBatch = useCallback(async (requests: IPrintRequest[]) => {
    if (!isInitialized) {
      throw new Error('打印机未初始化');
    }

    try {
      setError(null);
      setIsPrinting(true);

      // 为每个请求设置默认选项
      const enhancedRequests = requests.map(request => ({
        ...request,
        options: {
          copies: defaultCopies,
          timeout: printTimeout,
          ...request.options
        }
      }));

      const results = await printerRef.current!.printBatch(enhancedRequests);
      return results;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '批量打印失败';
      setError(errorMessage);
      throw err;
    } finally {
      setIsPrinting(false);
    }
  }, [isInitialized, defaultCopies, printTimeout]);

  /**
   * 获取队列状态
   */
  const getQueueStatus = useCallback((): IQueueStatus => {
    if (!isInitialized || !printerRef.current) {
      return {
        size: 0,
        processing: 0,
        completed: 0,
        failed: 0,
        paused: false,
        processingJobs: []
      };
    }

    return printerRef.current!.getQueueStatus();
  }, [isInitialized]);

  /**
   * 清空队列
   */
  const clearQueue = useCallback(() => {
    if (!isInitialized || !printerRef.current) return;

    try {
      printerRef.current!.clearQueue();
      refreshStatus();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '清空队列失败';
      setError(errorMessage);
    }
  }, [isInitialized]);

  /**
   * 暂停队列
   */
  const pauseQueue = useCallback(() => {
    if (!isInitialized || !printerRef.current) return;

    try {
      printerRef.current!.pauseQueue();
      refreshStatus();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '暂停队列失败';
      setError(errorMessage);
    }
  }, [isInitialized]);

  /**
   * 恢复队列
   */
  const resumeQueue = useCallback(() => {
    if (!isInitialized || !printerRef.current) return;

    try {
      printerRef.current!.resumeQueue();
      refreshStatus();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '恢复队列失败';
      setError(errorMessage);
    }
  }, [isInitialized]);

  /**
   * 刷新状态
   */
  const refreshStatus = useCallback(() => {
    const status = getQueueStatus();
    setQueueStatus(status);
  }, [getQueueStatus]);

  /**
   * 清空错误
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * 设置事件监听器
   */
  const setupEventListeners = useCallback(() => {
    if (!printerRef.current) return;

    const handleJobQueued = (job: any) => {
      refreshStatus();

      // 触发自定义事件监听器
      const listeners = eventListenersRef.current.get('jobQueued') || [];
      listeners.forEach(listener => listener(job));
    };

    const handleJobStarted = (job: any) => {
      refreshStatus();

      // 触发自定义事件监听器
      const listeners = eventListenersRef.current.get('jobStarted') || [];
      listeners.forEach(listener => listener(job));
    };

    const handleJobCompleted = (job: any) => {
      refreshStatus();

      // 触发自定义事件监听器
      const listeners = eventListenersRef.current.get('jobCompleted') || [];
      listeners.forEach(listener => listener(job));
    };

    const handleJobFailed = (job: any, error: any) => {
      refreshStatus();

      // 触发自定义事件监听器
      const listeners = eventListenersRef.current.get('jobFailed') || [];
      listeners.forEach(listener => listener(job, error));
    };

    const handlePrinterError = (err: string) => {
      setError(err);

      // 触发自定义事件监听器
      const listeners = eventListenersRef.current.get('printerError') || [];
      listeners.forEach(listener => listener(err));
    };

    // 注册事件监听
    printerRef.current.on('jobQueued', handleJobQueued);
    printerRef.current.on('jobStarted', handleJobStarted);
    printerRef.current.on('jobCompleted', handleJobCompleted);
    printerRef.current.on('jobFailed', handleJobFailed);
  }, [refreshStatus]);

  /**
   * 开始状态更新
   */
  const startStatusUpdates = useCallback(() => {
    // 定期更新队列状态
    statusIntervalRef.current = setInterval(() => {
      refreshStatus();
    }, 1000);
  }, [refreshStatus]);

  /**
   * 添加事件监听器
   */
  const addEventListener = useCallback((event: string, listener: Function) => {
    if (!eventListenersRef.current.has(event)) {
      eventListenersRef.current.set(event, []);
    }
    eventListenersRef.current.get(event)!.push(listener);

    // 返回清理函数
    return () => {
      const listeners = eventListenersRef.current.get(event);
      if (listeners) {
        const index = listeners.indexOf(listener);
        if (index > -1) {
          listeners.splice(index, 1);
        }
      }
    };
  }, []);

  // 便捷事件监听方法
  const onJobQueued = useCallback((callback: (job: any) => void) => {
    return addEventListener('jobQueued', callback);
  }, [addEventListener]);

  const onJobStarted = useCallback((callback: (job: any) => void) => {
    return addEventListener('jobStarted', callback);
  }, [addEventListener]);

  const onJobCompleted = useCallback((callback: (job: any) => void) => {
    return addEventListener('jobCompleted', callback);
  }, [addEventListener]);

  const onJobFailed = useCallback((callback: (job: any, error: any) => void) => {
    return addEventListener('jobFailed', callback);
  }, [addEventListener]);

  const onPrinterError = useCallback((callback: (error: string) => void) => {
    return addEventListener('printerError', callback);
  }, [addEventListener]);

  // 自动初始化
  useEffect(() => {
    if (autoInitialize) {
      initialize().catch(() => {
        // 初始化失败，不抛出错误
      });
    }
  }, [autoInitialize, initialize]);

  // 清理函数
  useEffect(() => {
    return () => {
      // 清理定时器
      if (statusIntervalRef.current) {
        clearInterval(statusIntervalRef.current);
      }

      // 销毁打印机实例
      if (printerRef.current) {
        printerRef.current.dispose().catch(() => {
          // 忽略销毁错误
        });
      }
    };
  }, []);

  return {
    // 状态
    isInitialized,
    isPrinting,
    queueStatus,
    error,

    // 方法
    initialize,
    printText,
    printTemplate,
    printImage,
    printBarcode,
    printQRCode,
    printBatch,

    // 队列管理
    getQueueStatus,
    clearQueue,
    pauseQueue,
    resumeQueue,

    // 工具方法
    clearError,
    refreshStatus,

    // 事件处理
    onJobQueued,
    onJobStarted,
    onJobCompleted,
    onJobFailed,
    onPrinterError,
  };
}