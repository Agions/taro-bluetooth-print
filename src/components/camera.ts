import { logger } from '../utils/logger';
import { WorkerManager } from '../utils/worker-manager';

/**
 * 相机配置选项
 */
export interface CameraOptions {
  width?: number;
  height?: number;
  facingMode?: 'user' | 'environment';
  frameRate?: number;
  autoInitialize?: boolean;
  targetElement?: HTMLElement | string;
  guideBox?: boolean;
  autoAdjustSettings?: boolean;
  throttleInterval?: number; // 视频帧处理节流间隔（毫秒）
}

/**
 * 相机分析处理函数
 */
export type FrameProcessorFunction = (
  imageData: ImageData,
  timestamp: number
) => Promise<any> | any;

/**
 * 相机状态枚举
 */
export enum CameraState {
  CLOSED = 'closed',
  OPENING = 'opening',
  OPEN = 'open',
  ERROR = 'error'
}

/**
 * 相机组件类
 */
export class Camera {
  private video: HTMLVideoElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D | null = null;
  private guideBoxCanvas: HTMLCanvasElement | null = null;
  private guideBoxCtx: CanvasRenderingContext2D | null = null;
  private stream: MediaStream | null = null;
  private state: CameraState = CameraState.CLOSED;
  private frameProcessors: Map<string, FrameProcessorFunction> = new Map();
  private animationFrameId: number | null = null;
  private lastProcessTimestamp: number = 0;
  private workerManager: WorkerManager | null = null;
  private processingFrame: boolean = false;
  private capturePromiseResolvers: Array<(value: ImageData) => void> = [];
  private errorListeners: Array<(error: Error) => void> = [];
  
  private options: Required<CameraOptions> = {
    width: 1280,
    height: 720,
    facingMode: 'environment',
    frameRate: 30,
    autoInitialize: true,
    targetElement: null as any,
    guideBox: true,
    autoAdjustSettings: true,
    throttleInterval: 200
  };
  
  /**
   * 构造函数
   */
  constructor(options: CameraOptions = {}) {
    // 合并配置
    this.options = { ...this.options, ...options };
    
    // 创建DOM元素
    this.video = document.createElement('video');
    this.video.setAttribute('autoplay', 'true');
    this.video.setAttribute('muted', 'true');
    this.video.setAttribute('playsinline', 'true');
    
    this.canvas = document.createElement('canvas');
    this.canvas.style.display = 'none';
    
    // 设置尺寸
    this.setSize(this.options.width, this.options.height);
    
    // 获取绘图上下文
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
    
    // 挂载到目标元素
    if (this.options.targetElement) {
      this.mountTo(this.options.targetElement);
    }
    
    // 自动初始化
    if (this.options.autoInitialize) {
      this.initialize().catch(error => {
        logger.error('相机初始化失败', error);
      });
    }
  }
  
  /**
   * 设置相机尺寸
   */
  public setSize(width: number, height: number): void {
    this.options.width = width;
    this.options.height = height;
    
    this.video.width = width;
    this.video.height = height;
    this.canvas.width = width;
    this.canvas.height = height;
    
    // 更新辅助框
    if (this.guideBoxCanvas) {
      this.guideBoxCanvas.width = width;
      this.guideBoxCanvas.height = height;
      this.drawGuideBox();
    }
  }
  
  /**
   * 挂载相机到DOM元素
   */
  public mountTo(target: HTMLElement | string): void {
    const container = typeof target === 'string'
      ? document.querySelector(target) as HTMLElement
      : target;
    
    if (!container) {
      throw new Error(`找不到目标元素: ${target}`);
    }
    
    // 清空容器
    container.innerHTML = '';
    
    // 设置容器样式
    container.style.position = 'relative';
    container.style.overflow = 'hidden';
    
    // 设置视频样式
    this.video.style.width = '100%';
    this.video.style.height = '100%';
    this.video.style.objectFit = 'cover';
    
    // 添加视频元素
    container.appendChild(this.video);
    
    // 如果启用了辅助框，添加辅助框画布
    if (this.options.guideBox) {
      this.createGuideBoxCanvas(container);
    }
  }
  
  /**
   * 创建辅助框画布
   */
  private createGuideBoxCanvas(container: HTMLElement): void {
    // 如果已存在，先移除
    if (this.guideBoxCanvas && this.guideBoxCanvas.parentElement) {
      this.guideBoxCanvas.parentElement.removeChild(this.guideBoxCanvas);
    }
    
    // 创建新画布
    this.guideBoxCanvas = document.createElement('canvas');
    this.guideBoxCanvas.width = this.options.width;
    this.guideBoxCanvas.height = this.options.height;
    this.guideBoxCanvas.style.position = 'absolute';
    this.guideBoxCanvas.style.top = '0';
    this.guideBoxCanvas.style.left = '0';
    this.guideBoxCanvas.style.width = '100%';
    this.guideBoxCanvas.style.height = '100%';
    this.guideBoxCanvas.style.pointerEvents = 'none';
    
    this.guideBoxCtx = this.guideBoxCanvas.getContext('2d');
    
    // 添加到容器
    container.appendChild(this.guideBoxCanvas);
    
    // 绘制辅助框
    this.drawGuideBox();
  }
  
  /**
   * 绘制辅助框
   */
  private drawGuideBox(): void {
    if (!this.guideBoxCtx || !this.guideBoxCanvas) {
      return;
    }
    
    const { width, height } = this.guideBoxCanvas;
    
    // 清除画布
    this.guideBoxCtx.clearRect(0, 0, width, height);
    
    // 计算识别区域大小
    const boxWidth = Math.min(width, height) * 0.7;
    const boxHeight = boxWidth * 0.6; // 长方形区域
    
    const x = (width - boxWidth) / 2;
    const y = (height - boxHeight) / 2;
    
    // 绘制半透明遮罩
    this.guideBoxCtx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    this.guideBoxCtx.fillRect(0, 0, width, height);
    
    // 清除识别区域，形成镂空效果
    this.guideBoxCtx.clearRect(x, y, boxWidth, boxHeight);
    
    // 绘制边框
    this.guideBoxCtx.strokeStyle = '#4CAF50';
    this.guideBoxCtx.lineWidth = 3;
    this.guideBoxCtx.strokeRect(x, y, boxWidth, boxHeight);
    
    // 绘制角标
    const cornerSize = 20;
    this.guideBoxCtx.beginPath();
    
    // 左上角
    this.guideBoxCtx.moveTo(x, y + cornerSize);
    this.guideBoxCtx.lineTo(x, y);
    this.guideBoxCtx.lineTo(x + cornerSize, y);
    
    // 右上角
    this.guideBoxCtx.moveTo(x + boxWidth - cornerSize, y);
    this.guideBoxCtx.lineTo(x + boxWidth, y);
    this.guideBoxCtx.lineTo(x + boxWidth, y + cornerSize);
    
    // 右下角
    this.guideBoxCtx.moveTo(x + boxWidth, y + boxHeight - cornerSize);
    this.guideBoxCtx.lineTo(x + boxWidth, y + boxHeight);
    this.guideBoxCtx.lineTo(x + boxWidth - cornerSize, y + boxHeight);
    
    // 左下角
    this.guideBoxCtx.moveTo(x + cornerSize, y + boxHeight);
    this.guideBoxCtx.lineTo(x, y + boxHeight);
    this.guideBoxCtx.lineTo(x, y + boxHeight - cornerSize);
    
    this.guideBoxCtx.stroke();
    
    // 添加提示文字
    this.guideBoxCtx.font = '16px Arial';
    this.guideBoxCtx.fillStyle = 'white';
    this.guideBoxCtx.textAlign = 'center';
    this.guideBoxCtx.fillText('请将内容对准框内', width / 2, y + boxHeight + 30);
  }
  
  /**
   * 初始化相机
   */
  public async initialize(): Promise<boolean> {
    if (this.state === CameraState.OPEN || this.state === CameraState.OPENING) {
      return true;
    }
    
    this.state = CameraState.OPENING;
    
    try {
      // 检查是否支持getUserMedia
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('浏览器不支持getUserMedia');
      }
      
      // 获取媒体流
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: this.options.facingMode,
          width: { ideal: this.options.width },
          height: { ideal: this.options.height },
          frameRate: { ideal: this.options.frameRate }
        },
        audio: false
      };
      
      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // 设置视频源
      this.video.srcObject = this.stream;
      
      // 等待视频准备就绪
      await new Promise<void>((resolve) => {
        this.video.onloadedmetadata = () => {
          resolve();
        };
      });
      
      // 开始播放
      await this.video.play();
      
      // 获取实际的视频尺寸
      const actualWidth = this.video.videoWidth;
      const actualHeight = this.video.videoHeight;
      
      // 调整画布大小以匹配视频
      if (actualWidth > 0 && actualHeight > 0) {
        this.setSize(actualWidth, actualHeight);
      }
      
      // 如果启用了自动调整设置
      if (this.options.autoAdjustSettings) {
        this.adjustOptimalSettings();
      }
      
      // 开始渲染循环
      this.startFrameProcessing();
      
      this.state = CameraState.OPEN;
      return true;
    } catch (error) {
      this.state = CameraState.ERROR;
      this.notifyErrorListeners(error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }
  
  /**
   * 自动调整相机最佳设置
   */
  private async adjustOptimalSettings(): Promise<void> {
    try {
      if (!this.stream) return;
      
      const videoTrack = this.stream.getVideoTracks()[0];
      if (!videoTrack) return;
      
      // 扩展标准MediaTrackCapabilities类型以包含非标准属性
      interface ExtendedCapabilities extends MediaTrackCapabilities {
        contrast?: { min: number; max: number; step: number };
        sharpness?: { min: number; max: number; step: number };
        focusMode?: string[];
        [key: string]: any;
      }
      
      const capabilities = videoTrack.getCapabilities() as ExtendedCapabilities;
      const settings = videoTrack.getSettings();
      
      // 扩展标准MediaTrackConstraintSet类型以包含非标准约束
      interface ExtendedConstraints extends MediaTrackConstraintSet {
        contrast?: ConstrainDouble;
        sharpness?: ConstrainDouble;
        focusMode?: ConstrainDOMString;
        [key: string]: any;
      }
      
      const constraints: ExtendedConstraints = {};
      
      // 尝试设置最高对比度
      if (capabilities.contrast && 'max' in capabilities.contrast) {
        constraints.contrast = capabilities.contrast.max;
      }
      
      // 尝试设置最高锐度
      if (capabilities.sharpness && 'max' in capabilities.sharpness) {
        constraints.sharpness = capabilities.sharpness.max;
      }
      
      // 尝试启用自动对焦
      if (capabilities.focusMode && Array.isArray(capabilities.focusMode) && 
          capabilities.focusMode.includes('continuous')) {
        constraints.focusMode = 'continuous';
      }
      
      // 应用约束
      if (Object.keys(constraints).length > 0) {
        await videoTrack.applyConstraints(constraints);
      }
    } catch (error) {
      logger.warn('自动调整相机设置失败', error);
      // 错误不影响继续使用相机
    }
  }
  
  /**
   * 启动帧处理循环
   */
  private startFrameProcessing(): void {
    if (this.animationFrameId !== null) {
      return;
    }
    
    const processFrame = async (timestamp: number) => {
      if (this.state !== CameraState.OPEN) {
        this.animationFrameId = null;
        return;
      }
      
      // 节流处理
      const shouldProcess = 
        !this.processingFrame && 
        (timestamp - this.lastProcessTimestamp >= this.options.throttleInterval ||
         this.capturePromiseResolvers.length > 0);
      
      if (shouldProcess) {
        this.processingFrame = true;
        this.lastProcessTimestamp = timestamp;
        
        try {
          // 绘制视频帧到画布
          this.ctx?.drawImage(this.video, 0, 0);
          
          // 获取图像数据
          const imageData = this.ctx?.getImageData(0, 0, this.canvas.width, this.canvas.height);
          
          if (imageData) {
            // 解决等待中的捕获请求
            while (this.capturePromiseResolvers.length > 0) {
              const resolver = this.capturePromiseResolvers.shift();
              resolver?.(imageData);
            }
            
            // 如果有注册的帧处理器，则处理帧
            if (this.frameProcessors.size > 0) {
              for (const processor of this.frameProcessors.values()) {
                await processor(imageData, timestamp);
              }
            }
          }
        } catch (error) {
          logger.error('处理视频帧失败', error);
        } finally {
          this.processingFrame = false;
        }
      }
      
      // 继续下一帧
      this.animationFrameId = requestAnimationFrame(processFrame);
    };
    
    this.animationFrameId = requestAnimationFrame(processFrame);
  }
  
  /**
   * 添加帧处理器
   */
  public addFrameProcessor(id: string, processor: FrameProcessorFunction): void {
    this.frameProcessors.set(id, processor);
  }
  
  /**
   * 移除帧处理器
   */
  public removeFrameProcessor(id: string): boolean {
    return this.frameProcessors.delete(id);
  }
  
  /**
   * 捕获当前帧
   */
  public async captureFrame(): Promise<ImageData> {
    if (this.state !== CameraState.OPEN) {
      await this.initialize();
    }
    
    return new Promise<ImageData>((resolve) => {
      this.capturePromiseResolvers.push(resolve);
    });
  }
  
  /**
   * 切换前后摄像头
   */
  public async switchCamera(): Promise<boolean> {
    if (this.state !== CameraState.OPEN) {
      return false;
    }
    
    // 切换摄像头方向
    this.options.facingMode = this.options.facingMode === 'environment' ? 'user' : 'environment';
    
    // 关闭当前相机
    this.close();
    
    // 重新初始化
    return this.initialize();
  }
  
  /**
   * 关闭相机
   */
  public close(): void {
    // 停止渲染循环
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    
    // 停止所有轨道
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    
    // 清除视频源
    this.video.srcObject = null;
    
    this.state = CameraState.CLOSED;
  }
  
  /**
   * 设置Worker管理器
   */
  public setWorkerManager(manager: WorkerManager): void {
    this.workerManager = manager;
  }
  
  /**
   * 添加错误监听器
   */
  public addErrorListener(listener: (error: Error) => void): void {
    this.errorListeners.push(listener);
  }
  
  /**
   * 移除错误监听器
   */
  public removeErrorListener(listener: (error: Error) => void): void {
    const index = this.errorListeners.indexOf(listener);
    if (index !== -1) {
      this.errorListeners.splice(index, 1);
    }
  }
  
  /**
   * 通知所有错误监听器
   */
  private notifyErrorListeners(error: Error): void {
    this.errorListeners.forEach(listener => {
      try {
        listener(error);
      } catch (e) {
        logger.error('错误监听器执行失败', e);
      }
    });
  }
  
  /**
   * 销毁相机实例
   */
  public destroy(): void {
    this.close();
    
    // 清除所有处理器
    this.frameProcessors.clear();
    
    // 清除错误监听器
    this.errorListeners = [];
    
    // 移除DOM元素
    if (this.guideBoxCanvas && this.guideBoxCanvas.parentElement) {
      this.guideBoxCanvas.parentElement.removeChild(this.guideBoxCanvas);
    }
    
    if (this.video.parentElement) {
      this.video.parentElement.removeChild(this.video);
    }
  }
} 