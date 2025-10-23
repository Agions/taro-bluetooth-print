import { logger } from './logger';

/**
 * 服务工作器配置选项
 */
export interface ServiceWorkerOptions {
  scope?: string;
  registrationOptions?: RegistrationOptions;
}

/**
 * 服务工作器管理器类
 * 用于注册、更新、卸载服务工作器，实现PWA离线功能支持
 */
export class ServiceWorkerManager {
  private registration: ServiceWorkerRegistration | null = null;
  private isRegistered: boolean = false;
  private updateAvailable: boolean = false;
  private updateListeners: Array<() => void> = [];
  
  /**
   * 构造函数
   */
  constructor(private swPath: string, private options: ServiceWorkerOptions = {}) {}
  
  /**
   * 检查是否支持服务工作器
   */
  public isSupported(): boolean {
    return 'serviceWorker' in navigator;
  }
  
  /**
   * 注册服务工作器
   */
  public async register(): Promise<boolean> {
    if (!this.isSupported()) {
      logger.warn('当前环境不支持Service Worker');
      return false;
    }
    
    try {
      // 注册服务工作器
      this.registration = await navigator.serviceWorker.register(this.swPath, {
        scope: this.options.scope || '/',
        ...(this.options.registrationOptions || {})
      });
      
      this.isRegistered = true;
      
      // 监听更新事件
      this.registration.addEventListener('updatefound', () => {
        const newWorker = this.registration?.installing;
        
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // 新版本已安装且存在旧版本
              this.updateAvailable = true;
              this.notifyUpdateAvailable();
            }
          });
        }
      });
      
      // 监听控制权变更
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        // 控制权已转移，页面将刷新
        logger.info('Service Worker控制权已转移');
      });
      
      logger.info('Service Worker注册成功', this.registration);
      return true;
    } catch (error) {
      logger.error('Service Worker注册失败', error);
      return false;
    }
  }
  
  /**
   * 检查更新
   */
  public async checkForUpdates(): Promise<boolean> {
    if (!this.isRegistered || !this.registration) {
      return false;
    }
    
    try {
      await this.registration.update();
      return this.updateAvailable;
    } catch (error) {
      logger.error('检查Service Worker更新失败', error);
      return false;
    }
  }
  
  /**
   * 应用更新（刷新页面）
   */
  public applyUpdate(): void {
    if (this.updateAvailable) {
      window.location.reload();
    }
  }
  
  /**
   * 卸载服务工作器
   */
  public async unregister(): Promise<boolean> {
    if (!this.isRegistered || !this.registration) {
      return false;
    }
    
    try {
      const result = await this.registration.unregister();
      if (result) {
        this.isRegistered = false;
        this.registration = null;
        logger.info('Service Worker卸载成功');
      }
      return result;
    } catch (error) {
      logger.error('Service Worker卸载失败', error);
      return false;
    }
  }
  
  /**
   * 添加更新可用监听器
   */
  public addUpdateListener(listener: () => void): void {
    this.updateListeners.push(listener);
    
    // 如果已经有更新，立即通知
    if (this.updateAvailable) {
      try {
        listener();
      } catch (e) {
        logger.error('执行更新监听器失败', e);
      }
    }
  }
  
  /**
   * 移除更新可用监听器
   */
  public removeUpdateListener(listener: () => void): void {
    const index = this.updateListeners.indexOf(listener);
    if (index !== -1) {
      this.updateListeners.splice(index, 1);
    }
  }
  
  /**
   * 通知所有监听器更新可用
   */
  private notifyUpdateAvailable(): void {
    this.updateListeners.forEach(listener => {
      try {
        listener();
      } catch (e) {
        logger.error('执行更新监听器失败', e);
      }
    });
  }
  
  /**
   * 获取缓存的资源列表
   */
  public async getCachedResources(): Promise<string[]> {
    if (!('caches' in window)) {
      return [];
    }
    
    try {
      const cacheNames = await window.caches.keys();
      const resources: string[] = [];
      
      for (const cacheName of cacheNames) {
        const cache = await window.caches.open(cacheName);
        const requests = await cache.keys();
        const urls = requests.map(request => request.url);
        resources.push(...urls);
      }
      
      return resources;
    } catch (error) {
      logger.error('获取缓存资源失败', error);
      return [];
    }
  }
  
  /**
   * 清除所有缓存
   */
  public async clearAllCaches(): Promise<boolean> {
    if (!('caches' in window)) {
      return false;
    }
    
    try {
      const cacheNames = await window.caches.keys();
      await Promise.all(
        cacheNames.map(cacheName => window.caches.delete(cacheName))
      );
      logger.info('所有缓存已清除');
      return true;
    } catch (error) {
      logger.error('清除缓存失败', error);
      return false;
    }
  }
} 