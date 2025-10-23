import { logger } from '../utils/logger';
import { WorkerManager } from '../utils/worker-manager';
import { PrinterImage } from './image';

/**
 * 优化的图像处理类，使用Web Worker处理图像
 */
export class OptimizedPrinterImage extends PrinterImage {
  private static workerManager: WorkerManager | null = null;
  private static isWorkerSupported: boolean = true;
  private static isInitializing: boolean = false;
  private static initPromise: Promise<void> | null = null;
  
  /**
   * 初始化Worker管理器
   * @param workerUrl Worker文件URL
   * @param loadingCallback 加载进度回调
   */
  static async initializeWorker(
    workerUrl: string = '/workers/image-worker.js',
    loadingCallback?: (progress: number) => void
  ): Promise<boolean> {
    // 避免重复初始化
    if (this.isInitializing) {
      if (this.initPromise) {
        await this.initPromise;
        return !!this.workerManager;
      }
      return false;
    }
    
    // 已经初始化成功
    if (this.workerManager) {
      return true;
    }
    
    // 已知不支持Worker
    if (!this.isWorkerSupported) {
      return false;
    }
    
    this.isInitializing = true;
    
    this.initPromise = new Promise<void>(async (resolve) => {
      try {
        // 检查环境是否支持Web Worker
        if (typeof Worker === 'undefined') {
          this.isWorkerSupported = false;
          logger.warn('当前环境不支持Web Worker，将使用主线程处理图像');
          return resolve();
        }
        
        // 创建Worker管理器
        this.workerManager = new WorkerManager(workerUrl);
        await this.workerManager.initialize(loadingCallback);
        
        logger.info('图像处理Worker初始化成功');
        resolve();
      } catch (error) {
        this.isWorkerSupported = false;
        logger.error('初始化图像处理Worker失败', error);
        this.workerManager = null;
        resolve();
      } finally {
        this.isInitializing = false;
      }
    });
    
    await this.initPromise;
    return !!this.workerManager;
  }
  
  /**
   * 销毁Worker
   */
  static destroyWorker(): void {
    if (this.workerManager) {
      this.workerManager.destroy();
      this.workerManager = null;
    }
  }
  
  /**
   * 使用Worker处理图像数据（如果可用）
   * @param imageData 图像数据
   * @param options 处理选项
   */
  static async processImageDataWithWorker(
    imageData: ImageData,
    options: {
      maxWidth?: number;
      threshold?: number;
      dithering?: boolean;
    } = {}
  ): Promise<ImageData> {
    // 尝试初始化Worker（如果还没有初始化）
    if (!this.workerManager && this.isWorkerSupported && !this.isInitializing) {
      await this.initializeWorker();
    }
    
    // 如果Worker可用，使用Worker处理
    if (this.workerManager) {
      try {
        return await this.workerManager.processImage(imageData, options);
      } catch (error) {
        logger.error('Worker处理图像失败，回退到主线程处理', error);
        // 出错时回退到原始方法
      }
    }
    
    // Worker不可用或处理失败时，使用主线程处理
    const { width, height, data } = imageData;
    const maxWidth = options.maxWidth || 384;
    const threshold = options.threshold || 128;
    const dithering = options.dithering !== undefined ? options.dithering : true;
    
    // 调整图像大小（如果需要）
    let processedData = data;
    let processedWidth = width;
    let processedHeight = height;
    
    if (width > maxWidth) {
      const ratio = maxWidth / width;
      processedWidth = maxWidth;
      processedHeight = Math.floor(height * ratio);
      
      // 创建canvas并调整大小
      const canvas = document.createElement('canvas');
      canvas.width = processedWidth;
      canvas.height = processedHeight;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('无法创建2D上下文');
      }
      
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = width;
      tempCanvas.height = height;
      
      const tempCtx = tempCanvas.getContext('2d');
      if (!tempCtx) {
        throw new Error('无法创建临时2D上下文');
      }
      
      // 将ImageData放入临时canvas
      tempCtx.putImageData(imageData, 0, 0);
      
      // 绘制并缩放图像
      ctx.drawImage(tempCanvas, 0, 0, width, height, 0, 0, processedWidth, processedHeight);
      
      // 获取调整大小后的图像数据
      const resizedImageData = ctx.getImageData(0, 0, processedWidth, processedHeight);
      processedData = resizedImageData.data;
    }
    
    // 应用抖动算法（如果需要）
    if (dithering) {
      processedData = this.ditheringProcess(
        processedData,
        processedWidth,
        processedHeight,
        threshold
      );
    }
    
    return new ImageData(
      processedData instanceof Uint8ClampedArray ? processedData : new Uint8ClampedArray(processedData),
      processedWidth,
      processedHeight
    );
  }
  
  /**
   * 重写图像处理方法，使用Worker处理（如果可用）
   */
  static async processImage(imageUrl: string, options: {
    maxWidth?: number;
    threshold?: number;
    dithering?: boolean;
  } = {}): Promise<Uint8Array> {
    try {
      // 加载图片并转换为ImageData
      const { data, width, height } = await this.urlToImageData(imageUrl, options.maxWidth || 384);
      
      // 创建ImageData对象
      const imageData = new ImageData(data, width, height);
      
      // 使用Worker处理图像
      const processedImageData = await this.processImageDataWithWorker(imageData, options);
      
      // 转换为点阵数据
      const rasterData = this.bitmapToRasterData(
        processedImageData.data,
        processedImageData.width,
        options.threshold || 128
      );
      
      // 生成打印命令
      return this.generateRasterCommand(rasterData, processedImageData.width, processedImageData.height);
    } catch (error) {
      logger.error('处理图片失败', error);
      // 失败时回退到原始方法
      return super.processImage(imageUrl, options);
    }
  }
  
  /**
   * 重写Base64图像处理方法
   */
  static async processBase64Image(base64: string, options: {
    maxWidth?: number;
    threshold?: number;
    dithering?: boolean;
  } = {}): Promise<Uint8Array> {
    // 确保是有效的Base64
    if (!base64.startsWith('data:image')) {
      base64 = `data:image/png;base64,${base64}`;
    }
    
    return await this.processImage(base64, options);
  }
} 