import { getAdapter } from './adapter';
import { logger } from '../utils/logger';
import { eventManager, EVENTS } from '../utils/events';
import { BLUETOOTH_DEFAULTS } from '../utils/config';
import { 
  BluetoothDevice, 
  BluetoothAdapter, 
  ConnectOptions, 
  DiscoveryOptions,
  PrinterError,
  ErrorCode
} from '../types';
import Taro from '@tarojs/taro';

/**
 * 蓝牙管理器类
 * 负责蓝牙设备的扫描、连接和通信
 */
export class BluetoothManager {
  private adapter: BluetoothAdapter;
  private isInitialized: boolean = false;
  private connectedDeviceId: string | null = null;
  private discoveryStarted: boolean = false;
  private discoveredDevices: Map<string, BluetoothDevice> = new Map();
  
  // 蓝牙服务UUID，用于打印机
  private serviceUUID: string = '49535343-FE7D-4AE5-8FA9-9FAFD205E455';
  // 蓝牙特征值UUID，用于写入数据
  private characteristicUUID: string = '49535343-8841-43F4-A8D4-ECBE34729BB3';

  /**
   * 创建蓝牙管理器实例
   */
  constructor() {
    this.adapter = getAdapter();
    logger.debug('蓝牙管理器已创建');
  }

  /**
   * 初始化蓝牙模块
   */
  async init(): Promise<boolean> {
    try {
      if (this.isInitialized) {
        return true;
      }
      
      logger.debug('正在初始化蓝牙适配器...');
      const result = await this.adapter.init();
      this.isInitialized = result;
      
      if (result) {
        logger.info('蓝牙适配器初始化成功');
        // 触发初始化成功事件
        eventManager.emit(EVENTS.BLUETOOTH_INITIALIZED, { success: true });
      } else {
        logger.error('蓝牙适配器初始化失败');
        eventManager.emit(EVENTS.BLUETOOTH_ERROR, new PrinterError(
          ErrorCode.BLUETOOTH_INIT_FAILED,
          '蓝牙适配器初始化失败'
        ));
      }
      
      return result;
    } catch (error) {
      this.isInitialized = false;
      const printerError = new PrinterError(
        ErrorCode.BLUETOOTH_INIT_FAILED,
        '初始化蓝牙模块失败'
      );
      logger.error(printerError.message, error);
      
      // 触发错误事件
      eventManager.emit(EVENTS.BLUETOOTH_ERROR, printerError);
      
      return false;
    }
  }

  /**
   * 开始搜索蓝牙设备
   * @param options 搜索选项
   */
  async startDiscovery(options: DiscoveryOptions = {}): Promise<boolean> {
    if (!this.isInitialized) {
      await this.init();
    }
    
    // 如果已经在搜索中，先停止
    if (this.discoveryStarted) {
      await this.stopDiscovery();
    }
    
    // 合并默认选项
    const finalOptions = {
      timeout: options.timeout || BLUETOOTH_DEFAULTS.SCAN_TIMEOUT,
      services: options.services || ['1812'], // 默认打印服务
      allowDuplicatesKey: options.allowDuplicatesKey || false
    };
    
    try {
      logger.debug('开始搜索蓝牙设备...', finalOptions);
      const result = await this.adapter.startDiscovery(finalOptions);
      this.discoveryStarted = result;
      
      if (result) {
        // 清空设备列表
        this.discoveredDevices.clear();
        
        // 触发搜索开始事件
        eventManager.emit(EVENTS.BLUETOOTH_DISCOVERY_STARTED, finalOptions);
        
        // 监听设备发现事件
        Taro.onBluetoothDeviceFound(res => {
          const devices = res.devices || [];
          devices.forEach(device => {
            this.discoveredDevices.set(device.deviceId, device);
            // 触发设备发现事件
            eventManager.emit(EVENTS.BLUETOOTH_DEVICE_FOUND, device);
          });
        });
        
        // 设置搜索超时
        if (finalOptions.timeout) {
          setTimeout(() => {
            if (this.discoveryStarted) {
              logger.debug(`搜索超时(${finalOptions.timeout}ms)，自动停止搜索`);
              this.stopDiscovery().catch(err => {
                logger.warn('停止搜索失败', err);
              });
            }
          }, finalOptions.timeout);
        }
      } else {
        logger.error('开始搜索蓝牙设备失败');
        eventManager.emit(EVENTS.BLUETOOTH_ERROR, new PrinterError(
          ErrorCode.BLUETOOTH_UNAVAILABLE,
          '开始搜索蓝牙设备失败'
        ));
      }
      
      return result;
    } catch (error) {
      const printerError = new PrinterError(
        ErrorCode.BLUETOOTH_UNAVAILABLE,
        '开始搜索蓝牙设备失败'
      );
      logger.error(printerError.message, error);
      
      // 触发错误事件
      eventManager.emit(EVENTS.BLUETOOTH_ERROR, printerError);
      
      return false;
    }
  }

  /**
   * 停止搜索蓝牙设备
   */
  async stopDiscovery(): Promise<boolean> {
    if (!this.discoveryStarted) {
      return true;
    }
    
    try {
      logger.debug('停止搜索蓝牙设备...');
      const result = await this.adapter.stopDiscovery();
      this.discoveryStarted = !result;
      
      if (result) {
        // 触发搜索停止事件
        eventManager.emit(EVENTS.BLUETOOTH_DISCOVERY_STOPPED, {
          devicesFound: this.discoveredDevices.size
        });
      }
      
      return result;
    } catch (error) {
      logger.error('停止搜索蓝牙设备失败', error);
      return false;
    }
  }

  /**
   * 获取已发现的蓝牙设备
   */
  async getDiscoveredDevices(): Promise<BluetoothDevice[]> {
    try {
      const devices = await this.adapter.getDiscoveredDevices();
      this.discoveredDevices.clear();
      devices.forEach(device => {
        this.discoveredDevices.set(device.deviceId, device);
      });
      return devices;
    } catch (error) {
      logger.error('获取已发现的蓝牙设备失败', error);
      return Array.from(this.discoveredDevices.values());
    }
  }

  /**
   * 连接蓝牙设备
   * @param deviceId 设备ID
   * @param options 连接选项
   */
  async connect(deviceId: string, options: ConnectOptions = {}): Promise<boolean> {
    // 参数检查
    if (!deviceId) {
      const error = new PrinterError(
        ErrorCode.INVALID_PARAM,
        '连接失败: 设备ID不能为空'
      );
      logger.error(error.message);
      eventManager.emit(EVENTS.BLUETOOTH_ERROR, error);
      return false;
    }

    // 默认选项
    const retries = options.retries ?? BLUETOOTH_DEFAULTS.CONNECT_RETRIES;
    const timeout = options.timeout ?? BLUETOOTH_DEFAULTS.CONNECT_TIMEOUT;

    // 确保蓝牙已初始化
    if (!this.isInitialized) {
      await this.init();
    }
    
    // 如果已连接，先断开
    if (this.connectedDeviceId && this.connectedDeviceId !== deviceId) {
      await this.disconnect();
    } else if (this.connectedDeviceId === deviceId) {
      // 已经连接到相同设备
      logger.info(`已连接到设备: ${deviceId}`);
      return true;
    }
    
    // 添加重试逻辑
    let lastError: Error | null = null;
    for (let i = 0; i <= retries; i++) {
      try {
        // 添加超时控制
        const connectPromise = this.adapter.connect(deviceId);
        const timeoutPromise = new Promise<boolean>((_, reject) => {
          setTimeout(() => reject(new PrinterError(
            ErrorCode.TIMEOUT_ERROR,
            `连接超时 (${timeout}ms)`
          )), timeout);
        });

        // 使用Promise.race实现超时控制
        const result = await Promise.race([connectPromise, timeoutPromise]) as boolean;
        
        if (result) {
          this.connectedDeviceId = deviceId;
          const message = `成功连接到设备: ${deviceId}${i > 0 ? ` (重试 ${i} 次)` : ''}`;
          logger.info(message);
          
          // 触发连接成功事件
          eventManager.emit(EVENTS.BLUETOOTH_CONNECTED, { 
            deviceId, 
            retryCount: i 
          });
          
          return true;
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        // 记录错误，但在最后一次重试前不返回
        const retryMsg = i < retries ? `，将在1秒后重试 (${i+1}/${retries})` : '';
        logger.warn(`连接设备 ${deviceId} 失败${retryMsg}`, error);
        
        if (i < retries) {
          // 等待1秒再重试
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }
    
    // 所有重试都失败
    const printerError = new PrinterError(
      ErrorCode.BLUETOOTH_CONNECT_FAILED,
      `连接蓝牙设备失败，已重试 ${retries} 次`
    );
    logger.error(printerError.message, lastError);
    
    // 触发错误事件
    eventManager.emit(EVENTS.BLUETOOTH_ERROR, printerError);
    
    return false;
  }

  /**
   * 断开蓝牙连接
   */
  async disconnect(): Promise<boolean> {
    if (!this.connectedDeviceId) {
      return true;
    }
    
    const deviceId = this.connectedDeviceId;
    
    try {
      logger.info(`正在断开设备连接: ${deviceId}`);
      const result = await this.adapter.disconnect(deviceId);
      
      if (result) {
        this.connectedDeviceId = null;
        logger.info(`已断开设备连接: ${deviceId}`);
        
        // 触发断开连接事件
        eventManager.emit(EVENTS.BLUETOOTH_DISCONNECTED, { deviceId });
      } else {
        logger.warn(`断开设备连接失败: ${deviceId}`);
      }
      
      return result;
    } catch (error) {
      const printerError = new PrinterError(
        ErrorCode.BLUETOOTH_DISCONNECT_FAILED,
        `断开蓝牙连接出错: ${deviceId}`
      );
      logger.error(printerError.message, error);
      
      // 触发错误事件
      eventManager.emit(EVENTS.BLUETOOTH_ERROR, printerError);
      
      // 即使出错，也将连接状态重置为未连接
      this.connectedDeviceId = null;
      return false;
    }
  }

  /**
   * 写入数据
   * @param data 要写入的数据
   */
  async writeData(data: ArrayBuffer): Promise<boolean> {
    if (!this.connectedDeviceId) {
      const error = new PrinterError(
        ErrorCode.PRINTER_NOT_CONNECTED,
        '未连接到蓝牙设备'
      );
      throw error;
    }
    
    try {
      logger.debug(`正在写入数据，大小: ${data.byteLength} 字节`);
      const result = await this.adapter.write(
        this.connectedDeviceId,
        this.serviceUUID,
        this.characteristicUUID,
        data
      );
      
      if (!result) {
        logger.error('写入数据失败');
        // 不抛出异常，防止中断命令批量发送流程
      }
      
      return result;
    } catch (error) {
      const printerError = new PrinterError(
        ErrorCode.BLUETOOTH_WRITE_FAILED,
        '写入数据失败'
      );
      logger.error(printerError.message, error);
      throw printerError;
    }
  }

  /**
   * 检查是否已连接
   */
  isConnected(): boolean {
    return !!this.connectedDeviceId;
  }

  /**
   * 获取已连接的设备ID
   */
  getConnectedDeviceId(): string | null {
    return this.connectedDeviceId;
  }
  
  /**
   * 获取适配器初始化状态
   */
  getInitStatus(): boolean {
    return this.isInitialized;
  }

  /**
   * 设置服务和特征值UUID
   * @param serviceUUID 服务UUID
   * @param characteristicUUID 特征值UUID
   */
  setServiceUUIDs(serviceUUID: string, characteristicUUID: string): void {
    this.serviceUUID = serviceUUID;
    this.characteristicUUID = characteristicUUID;
    logger.debug('已设置服务UUID:', serviceUUID);
    logger.debug('已设置特征值UUID:', characteristicUUID);
  }

  /**
   * 销毁蓝牙模块
   */
  async destroy(): Promise<boolean> {
    if (this.connectedDeviceId) {
      await this.disconnect();
    }
    
    if (this.discoveryStarted) {
      await this.stopDiscovery();
    }
    
    try {
      logger.debug('正在销毁蓝牙适配器...');
      const result = await this.adapter.destroy();
      this.isInitialized = !result;
      
      if (result) {
        logger.info('蓝牙适配器已销毁');
      } else {
        logger.warn('销毁蓝牙适配器失败');
      }
      
      return result;
    } catch (error) {
      const printerError = new PrinterError(
        ErrorCode.BLUETOOTH_UNAVAILABLE,
        '销毁蓝牙模块失败'
      );
      logger.error(printerError.message, error);
      return false;
    }
  }
}