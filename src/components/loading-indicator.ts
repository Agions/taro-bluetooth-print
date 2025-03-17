/**
 * 加载指示器配置
 */
export interface LoadingIndicatorOptions {
  container?: HTMLElement | string;
  color?: string;
  size?: number;
  text?: string;
  showProgress?: boolean;
  showText?: boolean;
  zIndex?: number;
}

/**
 * 加载状态指示器组件
 */
export class LoadingIndicator {
  private container: HTMLElement;
  private overlay: HTMLElement;
  private spinner: HTMLElement;
  private textElement: HTMLElement | null = null;
  private progressElement: HTMLElement | null = null;
  private progressValue: number = 0;
  private isVisible: boolean = false;
  private errorTimeout: number | null = null;
  
  private options: Required<LoadingIndicatorOptions> = {
    container: document.body,
    color: '#2196F3',
    size: 40,
    text: '加载中...',
    showProgress: false,
    showText: true,
    zIndex: 9999
  };
  
  /**
   * 构造函数
   */
  constructor(options: LoadingIndicatorOptions = {}) {
    // 合并配置
    this.options = { ...this.options, ...options };
    
    // 获取容器
    this.container = typeof this.options.container === 'string'
      ? document.querySelector(this.options.container) as HTMLElement || document.body
      : this.options.container || document.body;
    
    // 创建覆盖层
    this.overlay = document.createElement('div');
    this.spinner = document.createElement('div');
    
    // 设置样式
    this.setupStyles();
    
    // 添加文本元素（如果需要）
    if (this.options.showText) {
      this.textElement = document.createElement('div');
      this.textElement.style.marginTop = '15px';
      this.textElement.style.color = '#fff';
      this.textElement.style.fontFamily = 'Arial, sans-serif';
      this.textElement.style.fontSize = '14px';
      this.textElement.style.textAlign = 'center';
      this.textElement.textContent = this.options.text;
      this.overlay.appendChild(this.textElement);
    }
    
    // 添加进度元素（如果需要）
    if (this.options.showProgress) {
      this.createProgressElement();
    }
  }
  
  /**
   * 设置样式
   */
  private setupStyles(): void {
    // 覆盖层样式
    Object.assign(this.overlay.style, {
      position: 'absolute',
      top: '0',
      left: '0',
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      zIndex: String(this.options.zIndex),
      opacity: '0',
      transition: 'opacity 0.3s ease',
      pointerEvents: 'none'
    });
    
    // 旋转器样式
    Object.assign(this.spinner.style, {
      width: `${this.options.size}px`,
      height: `${this.options.size}px`,
      border: `4px solid rgba(255, 255, 255, 0.3)`,
      borderTop: `4px solid ${this.options.color}`,
      borderRadius: '50%',
      animation: 'spin 1s linear infinite'
    });
    
    // 添加动画
    const styleSheet = document.createElement('style');
    styleSheet.textContent = `
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(styleSheet);
    
    // 添加到DOM
    this.overlay.appendChild(this.spinner);
    this.container.appendChild(this.overlay);
    
    // 确保容器有定位
    if (window.getComputedStyle(this.container).position === 'static') {
      this.container.style.position = 'relative';
    }
  }
  
  /**
   * 创建进度指示器
   */
  private createProgressElement(): void {
    if (this.progressElement) {
      return;
    }
    
    // 创建进度容器
    const progressContainer = document.createElement('div');
    Object.assign(progressContainer.style, {
      width: '200px',
      height: '6px',
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      borderRadius: '3px',
      marginTop: '10px',
      overflow: 'hidden'
    });
    
    // 创建进度条
    this.progressElement = document.createElement('div');
    Object.assign(this.progressElement.style, {
      height: '100%',
      width: '0%',
      backgroundColor: this.options.color,
      transition: 'width 0.3s ease'
    });
    
    // 添加到DOM
    progressContainer.appendChild(this.progressElement);
    this.overlay.appendChild(progressContainer);
  }
  
  /**
   * 显示加载指示器
   */
  public show(text?: string): void {
    // 清除任何可能存在的错误超时
    if (this.errorTimeout !== null) {
      clearTimeout(this.errorTimeout);
      this.errorTimeout = null;
    }
    
    if (text && this.textElement) {
      this.textElement.textContent = text;
    } else if (this.textElement) {
      this.textElement.textContent = this.options.text;
    }
    
    if (this.textElement) {
      this.textElement.style.color = '#fff';
    }
    
    // 显示覆盖层
    this.overlay.style.opacity = '1';
    this.overlay.style.pointerEvents = 'auto';
    
    // 重置进度
    this.updateProgress(0);
    
    this.isVisible = true;
  }
  
  /**
   * 隐藏加载指示器
   */
  public hide(): void {
    this.overlay.style.opacity = '0';
    this.overlay.style.pointerEvents = 'none';
    this.isVisible = false;
  }
  
  /**
   * 更新加载进度
   * @param progress 进度值（0-1）
   */
  public updateProgress(progress: number): void {
    if (!this.progressElement) {
      return;
    }
    
    this.progressValue = Math.max(0, Math.min(1, progress));
    this.progressElement.style.width = `${this.progressValue * 100}%`;
  }
  
  /**
   * 显示错误消息
   * @param errorMessage 错误消息
   * @param duration 显示时长（毫秒）
   */
  public showError(errorMessage: string, duration: number = 3000): void {
    if (!this.textElement) {
      return;
    }
    
    // 显示错误消息
    this.textElement.textContent = errorMessage;
    this.textElement.style.color = '#FF5252';
    
    // 隐藏旋转器
    this.spinner.style.display = 'none';
    
    // 隐藏进度条
    if (this.progressElement && this.progressElement.parentElement) {
      this.progressElement.parentElement.style.display = 'none';
    }
    
    // 显示覆盖层
    this.overlay.style.opacity = '1';
    this.overlay.style.pointerEvents = 'auto';
    this.isVisible = true;
    
    // 设置自动隐藏
    if (duration > 0) {
      if (this.errorTimeout !== null) {
        clearTimeout(this.errorTimeout);
      }
      
      this.errorTimeout = window.setTimeout(() => {
        this.hideError();
        this.errorTimeout = null;
      }, duration);
    }
  }
  
  /**
   * 隐藏错误消息
   */
  public hideError(): void {
    if (!this.isVisible) {
      return;
    }
    
    // 恢复旋转器
    this.spinner.style.display = '';
    
    // 恢复进度条
    if (this.progressElement && this.progressElement.parentElement) {
      this.progressElement.parentElement.style.display = '';
    }
    
    // 恢复文本
    if (this.textElement) {
      this.textElement.textContent = this.options.text;
      this.textElement.style.color = '#fff';
    }
    
    // 隐藏覆盖层
    this.hide();
  }
  
  /**
   * 销毁指示器
   */
  public destroy(): void {
    if (this.overlay && this.overlay.parentElement) {
      this.overlay.parentElement.removeChild(this.overlay);
    }
    
    if (this.errorTimeout !== null) {
      clearTimeout(this.errorTimeout);
      this.errorTimeout = null;
    }
  }
} 