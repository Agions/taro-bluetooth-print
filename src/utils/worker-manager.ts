import { logger } from './logger';

/**
 * Worker管理器类，用于与Web Worker通信
 */
export class WorkerManager {
  private worker: Worker | null = null;
  private isInitialized: boolean = false;
  private isInitializing: boolean = false;
  private taskQueue: Map<string, { 
    resolve: (value: any) => void;
    reject: (reason: any) => void;
    timeout: NodeJS.Timeout | null;
  }> = new Map();
  private taskCounter: number = 0;
  private loadingCallback: ((progress: number) => void) | null = null;
  
  constructor(private workerUrl: string, private timeout: number = 30000) {}
  
  /**
   * 初始化Worker
   */
  public async initialize(loadingCallback?: (progress: number) => void): Promise<void> {
    if (this.isInitialized) {
      return;
    }
    
    if (this.isInitializing) {
      // 等待初始化完成
      return new Promise((resolve, reject) => {
        const checkInterval = setInterval(() => {
          if (this.isInitialized) {
            clearInterval(checkInterval);
            resolve();
          } else if (!this.isInitializing) {
            clearInterval(checkInterval);
            reject(new Error('Worker初始化失败'));
          }
        }, 100);
      });
    }
    
    this.isInitializing = true;
    this.loadingCallback = loadingCallback || null;
    
    try {
      // 检查是否支持Web Worker
      if (typeof Worker === 'undefined') {
        throw new Error('当前环境不支持Web Worker');
      }
      
      // 创建Worker
      this.worker = new Worker(this.workerUrl);
      
      // 设置消息监听
      this.worker.onmessage = this.handleWorkerMessage.bind(this);
      this.worker.onerror = this.handleWorkerError.bind(this);
      
      // 等待worker初始化完成
      await new Promise<void>((resolve, reject) => {
        const readyTimeout = setTimeout(() => {
          reject(new Error('Worker初始化超时'));
        }, 10000);
        
        const messageHandler = (e: MessageEvent) => {
          if (e.data && e.data.type === 'ready') {
            this.worker?.removeEventListener('message', messageHandler);
            clearTimeout(readyTimeout);
            resolve();
          }
        };
        
        this.worker?.addEventListener('message', messageHandler);
      });
      
      this.isInitialized = true;
      this.isInitializing = false;
      
      // 通知加载完成
      if (this.loadingCallback) {
        this.loadingCallback(1);
      }
      
      logger.info('Worker初始化完成');
    } catch (error) {
      this.isInitializing = false;
      logger.error('Worker初始化失败', error);
      this.terminateWorker();
      throw error;
    }
  }
  
  /**
   * 处理Worker消息
   */
  private handleWorkerMessage(event: MessageEvent): void {
    const { id, result, error } = event.data;
    
    if (!id || !this.taskQueue.has(id)) {
      return;
    }
    
    const task = this.taskQueue.get(id)!;
    
    // 清除超时定时器
    if (task.timeout !== null) {
      clearTimeout(task.timeout);
    }
    
    // 处理结果
    if (error) {
      task.reject(new Error(error));
    } else {
      task.resolve(result);
    }
    
    // 从队列中移除任务
    this.taskQueue.delete(id);
  }
  
  /**
   * 处理Worker错误
   */
  private handleWorkerError(error: ErrorEvent): void {
    logger.error('Worker错误:', error);
    
    // 处理所有待处理任务的错误
    this.taskQueue.forEach((task, id) => {
      task.reject(new Error('Worker发生错误: ' + error.message));
      if (task.timeout !== null) {
        clearTimeout(task.timeout);
      }
    });
    
    this.taskQueue.clear();
  }
  
  /**
   * 发送任务到Worker
   */
  public async sendTask<T = any>(type: string, data: any): Promise<T> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    if (!this.worker) {
      throw new Error('Worker未初始化');
    }
    
    return new Promise<T>((resolve, reject) => {
      const id = `task_${Date.now()}_${this.taskCounter++}`;
      
      // 设置超时
      const timeoutId = setTimeout(() => {
        if (this.taskQueue.has(id)) {
          this.taskQueue.delete(id);
          reject(new Error(`任务执行超时: ${type}`));
        }
      }, this.timeout);
      
      // 添加到任务队列
      this.taskQueue.set(id, {
        resolve,
        reject,
        timeout: timeoutId
      });
      
      // 发送消息到Worker
      if (this.worker) {
        this.worker.postMessage({
          id,
          type,
          data
        });
      } else {
        clearTimeout(timeoutId);
        reject(new Error('Worker未初始化'));
      }
    });
  }
  
  /**
   * 处理图像
   */
  public async processImage(imageData: ImageData, options: {
    maxWidth?: number;
    threshold?: number;
    dithering?: boolean;
  } = {}): Promise<ImageData> {
    return this.sendTask<ImageData>('processImage', { imageData, options });
  }
  
  /**
   * 执行OCR识别
   */
  public async performOCR(imageData: ImageData, options?: {
    language?: string;
    detectOrientation?: boolean;
  }): Promise<{
    text: string;
    confidence: number;
    regions?: Array<{
      text: string;
      boundingBox: { x: number, y: number, width: number, height: number }
    }>;
  }> {
    return this.sendTask('performOCR', { imageData, options });
  }
  
  /**
   * 终止Worker
   */
  public terminateWorker(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    
    this.isInitialized = false;
    this.isInitializing = false;
    
    // 处理所有等待中的任务
    this.taskQueue.forEach((task) => {
      task.reject(new Error('Worker已终止'));
      if (task.timeout !== null) {
        clearTimeout(task.timeout);
      }
    });
    
    this.taskQueue.clear();
    logger.info('Worker已终止');
  }
  
  /**
   * 销毁管理器
   */
  public destroy(): void {
    this.terminateWorker();
  }
} 