/**
 * @file Bluetooth Manager
 * @description 蓝牙管理模块，提供蓝牙设备发现、连接、数据传输等功能
 * 
 * @update 更新日志
 * 
 * ## 2025-03-13
 * ### 新增功能
 * - 增加性能优化配置系统
 *   - 可配置缓冲池大小和策略
 *   - 支持自定义性能参数
 *   - 提供性能监控和统计
 * - 增强缓存管理
 *   - 设备信息智能缓存
 *   - 缓冲区对象池
 *   - 自适应缓存优化
 * - 改进数据传输
 *   - 智能分片策略
 *   - 缓冲区复用机制
 *   - 批量写入优化
 * 
 * ### 性能优化
 * - 内存管理优化
 *   - 引入垃圾回收机制
 *   - 内存使用监控
 *   - 资源自动释放
 * - 传输性能优化
 *   - 动态调整传输参数
 *   - 性能数据分析
 *   - 自动优化策略
 * 
 * ### 监控与诊断
 * - 增强性能监控
 *   - 详细性能指标统计
 *   - 稳定性评分系统
 *   - 错误模式分析
 * - 改进诊断工具
 *   - 内存使用分析
 *   - 性能瓶颈检测
 *   - 自动优化建议
 * 
 * @version 2.0.0
 * @author Your Name
 * @copyright 2025
 */

import { getAdapter } from './adapter';
import { logger } from '../utils/logger';
import { eventManager, EVENTS } from '../utils/events';
import { BLUETOOTH_DEFAULTS } from '../utils/config';
import Taro from '@tarojs/taro';
import { BluetoothDevice, BluetoothAdapter, ConnectOptions, DiscoveryOptions } from '../types';
import { PrinterError, ErrorCode } from '../types';
import type { TransmissionStats, FlowControlParams, BatchWriteOptions, BatchWriteResult, DeviceHealthInfo, QueuedCommand } from '../types';

// 扩展 BatchWriteOptions 类型
interface ExtendedBatchWriteOptions extends BatchWriteOptions {
  batchSize?: number;
  parallel?: boolean;
  maxParallel?: number;
  commandDelay?: number;
  highPriority?: boolean;
}

// 扩展 ErrorCode
const ExtendedErrorCode = {
  ...ErrorCode,
  COMMAND_QUEUE_FULL: 'COMMAND_QUEUE_FULL',
  COMMAND_FAILED: 'COMMAND_FAILED',
  QUEUE_CLEARED: 'QUEUE_CLEARED'
} as const;

/**
 * 蓝牙管理器类
 * 负责蓝牙设备的扫描、连接和通信
 */
export class BluetoothManager {
  private adapter: BluetoothAdapter;
  private isInitialized: boolean = false;
  private discoveryStarted: boolean = false;
  private connectedDeviceId: string | null = null;
  private serviceUUID: string = '49535343-FE7D-4AE5-8FA9-9FAFD205E455';
  private characteristicUUID: string = '49535343-8841-43F4-A8D4-ECBE34729BB3';
  private commandQueue: QueuedCommand[] = [];
  private isProcessingQueue: boolean = false;
  private discoveredDevices: Map<string, BluetoothDevice> = new Map();
  private transmissionStats: TransmissionStats = {
    totalBytes: 0,
    successfulBytes: 0,
    totalCommands: 0,
    successfulCommands: 0,
    retryCount: 0,
    startTime: 0,
    endTime: 0,
    lastTransmissionSpeed: 0
  };

  // 性能配置
  private performanceConfig = {
    // 缓冲池配置
    bufferPoolSize: 32,
    maxBufferSize: 1024 * 1024, // 1MB
    minBufferSize: 512,
    bufferSizes: [20, 64, 256, 1024],
    
    // 命令处理配置
    maxBatchSize: 20,
    commandBatchSize: 10,
    maxParallelCommands: 3,
    commandTimeout: 5000,
    maxRetries: 3,
    retryDelay: 100,
    
    // 内存使用优化
    maxCacheSize: 50,
    cacheTimeout: 60000,
    gcInterval: 300000,
    eventHistoryTrimSize: 50,
    deviceCacheLifetime: 300000,
    
    // 资源使用优化
    maxConcurrentOperations: 5,
    operationTimeout: 10000,
    idleTimeout: 30000,
    inactiveResourceTimeout: 120000
  };

  private autoReconnect: boolean = false;
  private reconnectTimer: any = null;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 3;
  private reconnectDelay: number = 5000; // 5秒
  private currentRecoveryDelay: number = 1000; // 1秒
  private recoveryTimer: NodeJS.Timeout | null = null;
  private lastConnectedDevice: string | null = null;
  private batteryCheckInterval: NodeJS.Timeout | null = null;
  
  // 流量控制参数，会根据传输成功率自动调整
  private flowControl: FlowControlParams = {
    // 当前分片大小 (字节)
    chunkSize: 20,
    // 分片间延迟 (毫秒)
    chunkDelay: 20,
    // 命令间延迟 (毫秒)
    commandDelay: 50,
    // 自动调整速度
    autoAdjust: true,
    // 最小分片延迟
    minChunkDelay: 5,
    // 最大分片延迟
    maxChunkDelay: 100,
    // 最小分片大小
    minChunkSize: 10,
    // 最大分片大小  
    maxChunkSize: 200,
    // 传输质量阈值（用于智能调整参数）
    qualityThreshold: 0.95,
    // 上次传输质量（成功率）
    lastQuality: 1.0
  };
  
  // 设备连接历史管理
  private connectionHistory: Map<string, {
    deviceId: string;
    name?: string;
    lastConnected: number;
    connectCount: number;
    successRate: number;
    favorite: boolean;
  }> = new Map();
  
  private connectionQualityInterval: NodeJS.Timeout | null = null;
  private readonly QUALITY_CHECK_INTERVAL: number = 10000; // 10秒
  private qualityCheckInterval: number = this.QUALITY_CHECK_INTERVAL;
  private readonly RSSI_WARNING_THRESHOLD = -80; // dBm
  private readonly QUALITY_WARNING_THRESHOLD = 0.8;
  
  private recoveryAttempts: number = 0;
  private readonly MAX_RECOVERY_ATTEMPTS = 3;
  private readonly RECOVERY_DELAY: number = 1000; // 1秒
  private lastKnownState: {
    flowControl: FlowControlParams;
    batteryLevel: number | null;
    signalStrength: number | null;
    transmissionStats: TransmissionStats;
  } | null = null;
  
  // 在类的属性定义部分添加新的计数器
  private connectionStartTime: number = 0;
  private flowControlAdjustments: number = 0;
  private lastFlowControlAdjustment: number = 0;
  private lastReconnectTime: number = 0;
  
  private queuePaused: boolean = false;
  private queueProcessTimer: NodeJS.Timeout | null = null;
  private readonly QUEUE_PROCESS_INTERVAL = 50; // 毫秒
  private readonly QUEUE_MAX_SIZE = 100;
  private readonly DEFAULT_COMMAND_PRIORITY = 5;
  private readonly HIGH_PRIORITY = 10;
  private readonly LOW_PRIORITY = 1;
  
  
  // 加载设备历史记录
  private loadConnectionHistory(): void {
    try {
      const historyData = Taro.getStorageSync('bluetooth_connection_history');
      if (historyData) {
        const history = JSON.parse(historyData);
        if (Array.isArray(history)) {
          history.forEach(device => {
            if (device && device.deviceId) {
              this.connectionHistory.set(device.deviceId, device);
            }
          });
        }
        logger.debug(`已加载${this.connectionHistory.size}条设备历史记录`);
      }
    } catch (error) {
      logger.warn('加载设备历史记录失败', error);
    }
  }
  
  // 保存设备历史记录
  private saveConnectionHistory(): void {
    try {
      const history = Array.from(this.connectionHistory.values());
      Taro.setStorageSync('bluetooth_connection_history', JSON.stringify(history));
      logger.debug(`已保存${history.length}条设备历史记录`);
    } catch (error) {
      logger.warn('保存设备历史记录失败', error);
    }
  }
  
  // 更新设备连接历史
  private updateConnectionHistory(deviceId: string, success: boolean, device?: BluetoothDevice): void {
    if (!deviceId) return;
    
    const now = Date.now();
    const historyEntry = this.connectionHistory.get(deviceId) || {
      deviceId,
      lastConnected: now,
      connectCount: 0,
      successRate: 1.0,
      favorite: false
    };
    
    // 更新设备名称
    if (device?.name) {
      historyEntry.name = device.name;
    }
    
    // 更新连接次数和成功率
    historyEntry.connectCount++;
    if (success) {
      historyEntry.lastConnected = now;
      historyEntry.successRate = (historyEntry.successRate * (historyEntry.connectCount - 1) + 1) / historyEntry.connectCount;
    } else {
      historyEntry.successRate = (historyEntry.successRate * (historyEntry.connectCount - 1)) / historyEntry.connectCount;
    }
    
    // 限制历史记录的数量
    if (this.connectionHistory.size > 10) {
      // 如果超过10条，删除最旧的非收藏设备
      let oldestId: string | null = null;
      let oldestTime = now;
      
      this.connectionHistory.forEach((entry, id) => {
        if (!entry.favorite && entry.lastConnected < oldestTime) {
          oldestTime = entry.lastConnected;
          oldestId = id;
        }
      });
      
      if (oldestId) {
        this.connectionHistory.delete(oldestId);
      }
    }
    
    // 保存更新后的记录
    this.connectionHistory.set(deviceId, historyEntry);
    this.saveConnectionHistory();
  }

  /**
   * 创建蓝牙管理器实例
   */
  constructor() {
    this.adapter = getAdapter();
    logger.debug('蓝牙管理器已创建');
    
    // 监听蓝牙状态变化
    this.setupConnectionStateListener();
    
    // 加载设备历史记录
    this.loadConnectionHistory();
    
    // 初始化性能优化系统
    this.initPerformanceOptimizations();
  }

  /**
   * 设置连接状态监听
   * 用于检测意外断开并自动重连
   */
  private setupConnectionStateListener(): void {
    try {
      // 尝试注册连接状态变化监听
      Taro.onBLEConnectionStateChange(res => {
        const { deviceId, connected } = res;
        
        if (!connected && deviceId === this.connectedDeviceId) {
          // 设备意外断开
          logger.warn(`设备连接意外断开: ${deviceId}`);
          this.connectedDeviceId = null;
          
          // 触发断开连接事件
          eventManager.emit(EVENTS.BLUETOOTH_DISCONNECTED, { 
            deviceId,
            unexpected: true 
          });
          
          // 尝试恢复连接
          this.attemptRecovery().catch(err => {
            logger.error('恢复连接失败', err);
          });
        } else if (connected && deviceId === this.lastConnectedDevice) {
          // 恢复连接
          logger.info(`设备连接已恢复: ${deviceId}`);
          this.connectedDeviceId = deviceId;
          this.resetRecoveryState();
          
          // 恢复之前的状态
          this.restoreState().catch(err => {
            logger.warn('状态恢复失败', err);
          });
          
          // 触发连接成功事件
          eventManager.emit(EVENTS.BLUETOOTH_CONNECTED, { 
            deviceId,
            reconnected: true
          });
        }
      });
      
      logger.debug('已设置蓝牙连接状态监听');
    } catch (error) {
      logger.warn('设置蓝牙连接状态监听失败，可能不支持此功能', error);
    }
  }

  /**
   * 安排自动重连
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    
    if (this.reconnectAttempts >= this.maxReconnectAttempts || !this.lastConnectedDevice) {
      logger.warn(`已达到最大重连次数(${this.maxReconnectAttempts})或没有可重连的设备`);
      this.resetReconnectState();
      return;
    }
    
    this.reconnectAttempts++;
    
    // 延迟重连，避免频繁尝试
    const delay = this.reconnectDelay * this.reconnectAttempts; // 逐次增加延迟
    logger.info(`计划在${delay}ms后进行第${this.reconnectAttempts}次重连`);
    
    this.reconnectTimer = setTimeout(async () => {
      if (!this.isConnected() && this.lastConnectedDevice) {
        logger.info(`尝试重新连接到设备: ${this.lastConnectedDevice}（第${this.reconnectAttempts}次）`);
        
        try {
          const result = await this.connect(this.lastConnectedDevice, {
            retries: 0,  // 不在内部重试
            timeout: 10000  // 加长超时时间
          });
          
          if (result) {
            logger.info(`重连成功: ${this.lastConnectedDevice}`);
            this.resetReconnectState();
          } else {
            logger.warn(`重连失败: ${this.lastConnectedDevice}`);
            this.scheduleReconnect(); // 安排下一次重连
          }
        } catch (error) {
          logger.error(`重连出错: ${this.lastConnectedDevice}`, error);
          this.scheduleReconnect(); // 安排下一次重连
        }
      } else {
        this.resetReconnectState();
      }
    }, delay);
  }

  /**
   * 重置重连状态
   */
  private resetReconnectState(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.reconnectAttempts = 0;
  }

  /**
   * 启用自动重连
   * @param enable 是否启用
   * @param maxAttempts 最大尝试次数
   * @param delay 初始延迟（毫秒）
   */
  setAutoReconnect(enable: boolean, maxAttempts: number = 3, delay: number = 5000): void {
    this.autoReconnect = enable;
    this.maxReconnectAttempts = maxAttempts;
    this.reconnectDelay = delay;
    
    logger.debug(`${enable ? '启用' : '禁用'}自动重连，最大尝试次数: ${maxAttempts}，初始延迟: ${delay}ms`);
    
    if (!enable) {
      this.resetReconnectState();
    }
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
      allowDuplicatesKey: options.allowDuplicatesKey || false,
      namePrefix: options.namePrefix || '',
      filterByName: options.filterByName || false,
      namePrefixes: options.namePrefixes || [],
      onlyPrinters: options.onlyPrinters || false
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
            // 过滤设备
            if (this.shouldFilterDevice(device, finalOptions)) {
              return;
            }
            
            // 处理设备名称
            this.processDeviceName(device);
            
            // 添加到设备列表
            this.discoveredDevices.set(device.deviceId, device as any);
            
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
   * 判断设备是否应该被过滤掉
   * @param device 设备信息
   * @param options 搜索选项
   */
  private shouldFilterDevice(device: any, options: DiscoveryOptions): boolean {
    // 设备名称前缀过滤
    if (options.filterByName && device.name) {
      // 单个前缀匹配
      if (options.namePrefix && device.name.indexOf(options.namePrefix) !== 0) {
        return true;
      }
      
      // 多个前缀匹配（任一匹配即可）
      if (options.namePrefixes && options.namePrefixes.length > 0) {
        const matchesAnyPrefix = options.namePrefixes.some(prefix => 
          device.name && device.name.indexOf(prefix) === 0
        );
        
        if (!matchesAnyPrefix) {
          return true;
        }
      }
    }
    
    // 打印机设备过滤（需要符合打印机设备特征）
    if (options.onlyPrinters) {
      // 检查设备名称是否包含常见打印机标识
      const commonPrinterKeywords = [
        'print', 'prt', 'pos', 'tsc', 'gprinter', 'epson', 
        'star', 'zicox', 'hprt', 'sprt', 'zebra', 'iprint'
      ];
      
      const lowerName = device.name?.toLowerCase() || '';
      const hasPrinterKeyword = commonPrinterKeywords.some(keyword => 
        lowerName.includes(keyword)
      );
      
      // 检查设备服务是否包含打印服务
      const hasPrintService = 
        device.advertisServiceUUIDs?.some((id: string) => id.toLowerCase().includes('18f0')) ||
        device.advertisServiceUUIDs?.some((id: string) => id.toLowerCase().includes('1812'));
      
      if (!hasPrinterKeyword && !hasPrintService) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * 处理设备名称
   * 有些设备名称是乱码或空，尝试修复或使用替代名称
   */
  private processDeviceName(device: any): void {
    // 如果没有名称，尝试使用设备ID的最后6位作为名称
    if (!device.name) {
      device.name = `未命名设备 (${device.deviceId.slice(-6)})`;
      return;
    }
    
    // 检测名称是否可能是乱码
    const hasNonPrintableChars = /[^\x20-\x7E\u4e00-\u9fa5]/.test(device.name);
    const isTooShort = device.name.length < 2;
    
    if (hasNonPrintableChars || isTooShort) {
      // 如果可能是乱码，使用设备ID作为替代
      device.originalName = device.name; // 保留原始名称
      device.name = `设备 ${device.deviceId.slice(-6)}`;
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
    try {
      if (!this.adapter) {
        throw new Error('蓝牙适配器未初始化');
      }

      const result = await this.adapter.connect(deviceId);
      if (result) {
        this.connectedDeviceId = deviceId;
        this.connectionStartTime = Date.now();
        this.updateConnectionHistory(deviceId, true);
        eventManager.emit(EVENTS.BLUETOOTH_CONNECTED, { deviceId });
      }
      return result;
    } catch (error) {
      logger.error('连接设备失败:', error);
      this.updateConnectionHistory(deviceId, false);
      eventManager.emit(EVENTS.BLUETOOTH_CONNECTION_FAILED, { deviceId, error });
      return false;
    }
  }

  /**
   * 断开蓝牙连接
   */
  async disconnect(): Promise<boolean> {
    try {
      if (!this.adapter || !this.connectedDeviceId) {
      return true;
    }
    
      const result = await this.adapter.disconnect(this.connectedDeviceId);
      if (result) {
        this.lastConnectedDevice = this.connectedDeviceId;
        this.connectedDeviceId = null;
        eventManager.emit(EVENTS.BLUETOOTH_DISCONNECTED, { deviceId: this.lastConnectedDevice });
      }
      return result;
    } catch (error) {
      logger.error('断开连接失败:', error);
      return false;
    }
  }

  /**
   * 写入数据
   * @param data 要写入的数据
   */
  async writeData(data: ArrayBuffer): Promise<boolean> {
    try {
      if (!this.isConnected() || !this.adapter) {
        throw new Error('设备未连接');
      }

      const result = await this.adapter.write(
        this.connectedDeviceId!,
        this.serviceUUID,
        this.characteristicUUID,
        data
      );

      if (result) {
        this.transmissionStats.totalBytes += data.byteLength;
        this.transmissionStats.successfulBytes += data.byteLength;
        this.transmissionStats.totalCommands++;
        this.transmissionStats.successfulCommands++;
        this.updateTransmissionStats();
      }

      return result;
    } catch (error) {
      logger.error('写入数据失败:', error);
      this.transmissionStats.totalCommands++;
      this.transmissionStats.retryCount++;
      this.updateTransmissionStats();
      return false;
    }
  }

  /**
   * 分块写入数据
   * @param data 要写入的数据
   * @param chunkSize 每块大小
   * @param delayMs 每块之间的延迟时间(ms)
   * @returns 是否全部写入成功
   */
  async writeDataInChunks(
    data: ArrayBuffer, 
    chunkSize: number = 20, 
    delayMs: number = 20
  ): Promise<boolean> {
    // 记录开始时间
    const startTime = Date.now();
    
    const dataView = new Uint8Array(data);
    const totalLength = dataView.length;
    const chunks = Math.ceil(totalLength / chunkSize);
    
    logger.debug(`分片写入数据，总大小: ${totalLength} 字节，分${chunks}片发送`);
    
    // 用于跟踪写入成功的片段数量
    let successCount = 0;
    let failedChunks: number[] = [];
    
    // 为所有分片预分配缓冲区（如果可能）
    const chunkBuffers: ArrayBuffer[] = [];
    for (let i = 0; i < chunks; i++) {
      // 只有在合适大小时才使用池缓冲区
      if (chunkSize <= 1024) {
        chunkBuffers.push(this.getBufferFromPool(chunkSize));
      } else {
        chunkBuffers.push(new ArrayBuffer(chunkSize));
      }
    }
    
    try {
      for (let i = 0; i < chunks; i++) {
        const start = i * chunkSize;
        const end = Math.min(start + chunkSize, totalLength);
        const chunkLength = end - start;
        
        // 使用预分配的缓冲区
        const chunkBuffer = chunkBuffers[i];
        const chunkView = new Uint8Array(chunkBuffer, 0, chunkLength);
        chunkView.set(dataView.subarray(start, end));
        
        try {
          const result = await this.adapter.write(
            this.connectedDeviceId!,
            this.serviceUUID,
            this.characteristicUUID,
            chunkBuffer
          );
          
          if (result) {
            successCount++;
          } else {
            failedChunks.push(i);
            logger.warn(`第${i+1}/${chunks}片数据写入失败`);
          }
          
          // 添加延迟，避免蓝牙堵塞
          if (i < chunks - 1 && delayMs > 0) {
            await new Promise(resolve => setTimeout(resolve, delayMs));
          }
        } catch (err) {
          failedChunks.push(i);
          logger.warn(`第${i+1}/${chunks}片数据写入出错`, err);
          // 继续处理下一片，不中断整体流程
        }
      }
      
      // 重试失败的片段（最多重试一次）
      if (failedChunks.length > 0) {
        logger.debug(`尝试重新发送${failedChunks.length}个失败的数据片段`);
        
        for (const i of failedChunks) {
          const start = i * chunkSize;
          const end = Math.min(start + chunkSize, totalLength);
          const chunkLength = end - start;
          
          // 使用之前分配的缓冲区
          const chunkBuffer = chunkBuffers[i];
          
          try {
            const result = await this.adapter.write(
              this.connectedDeviceId!,
              this.serviceUUID,
              this.characteristicUUID,
              chunkBuffer
            );
            
            if (result) {
              successCount++;
              // 从失败列表中移除
              failedChunks = failedChunks.filter(idx => idx !== i);
            }
            
            // 添加更长的延迟进行重试
            await new Promise(resolve => setTimeout(resolve, delayMs * 2));
          } catch (err) {
            logger.warn(`重试：第${i+1}/${chunks}片数据写入仍然失败`, err);
          }
        }
      }
      
      // 释放所有分片缓冲区回到池
      for (const buffer of chunkBuffers) {
        if (buffer.byteLength <= 1024) {
          this.returnBufferToPool(buffer);
        }
      }
      
      const success = successCount === chunks;
      if (!success) {
        logger.error(`数据写入不完整，共${chunks}片，成功${successCount}片，失败${failedChunks.length}片`);
        // 触发蓝牙写入不完整事件
        eventManager.emit(EVENTS.BLUETOOTH_WRITE_INCOMPLETE, {
          total: chunks,
          success: successCount,
          failed: failedChunks.length
        });
        
        // 记录错误
        this.recordError('write_chunks_incomplete');
      } else {
        logger.debug(`数据写入完成，共${chunks}片`);
        this.recordSuccess();
      }
      
      // 记录操作时间
      this.recordOperationTime('write', Date.now() - startTime);
      
      return success;
    } catch (error) {
      // 释放所有分片缓冲区回到池
      for (const buffer of chunkBuffers) {
        if (buffer.byteLength <= 1024) {
          this.returnBufferToPool(buffer);
        }
      }
      
      const printerError = new PrinterError(
        ErrorCode.BLUETOOTH_WRITE_FAILED,
        '分片写入数据失败'
      );
      logger.error(printerError.message, error);
      
      // 触发错误事件
      eventManager.emit(EVENTS.BLUETOOTH_ERROR, printerError);
      
      // 记录错误
      this.recordError('write_chunks_failed');
      
      throw printerError;
    }
  }

  /**
   * 批量写入多个命令
   * @param commands 命令数组
   * @param options 选项
   */
  async writeBatch(
    commands: ArrayBuffer[],
    options: BatchWriteOptions = {}
  ): Promise<BatchWriteResult> {
    if (!this.isConnected()) {
      throw new PrinterError(
        ErrorCode.PRINTER_NOT_CONNECTED,
        '未连接到蓝牙设备'
      );
    }
    
    if (commands.length === 0) {
      return { success: true, failed: 0 };
    }
    
    // 重置传输统计
    this.resetTransmissionStats();
    
    // 计算总字节数
    let totalBytes = 0;
    for (const cmd of commands) {
      totalBytes += cmd.byteLength;
    }
    
    this.transmissionStats.totalBytes = totalBytes;
    this.transmissionStats.totalCommands = commands.length;
    this.transmissionStats.startTime = Date.now();
    
    logger.info(`批量发送${commands.length}条命令，总大小${totalBytes}字节，批处理大小${options.batchSize || this.performanceConfig.commandBatchSize}，${options.parallel ? '启用并行' : '串行'}处理`);
    
    try {
      // 成功和失败计数
      let successCount = 0;
      let successfulBytes = 0;
      
      if (options.parallel) {
        // 使用有限并行性处理命令
        // 将命令分成多个批次
        const batches: ArrayBuffer[][] = [];
        for (let i = 0; i < commands.length; i += options.batchSize || this.performanceConfig.commandBatchSize) {
          batches.push(commands.slice(i, i + (options.batchSize || this.performanceConfig.commandBatchSize)));
        }
        
        // 并行处理各批次，但限制最大并行数
        for (let i = 0; i < batches.length; i += options.maxParallel || this.performanceConfig.maxParallelCommands) {
          const currentBatches = batches.slice(i, i + (options.maxParallel || this.performanceConfig.maxParallelCommands));
          
          // 并行处理当前批次
          const batchPromises = currentBatches.map(async (batch) => {
            const results: { success: boolean; bytes: number }[] = [];
            
            for (const cmd of batch) {
              // 根据命令大小决定是否使用分片
              const useChunks = options.useChunks ?? (cmd.byteLength > this.flowControl.chunkSize);
              
              try {
                let result;
                if (useChunks) {
                  result = await this.writeDataInChunks(cmd, this.flowControl.chunkSize, this.flowControl.chunkDelay);
                } else {
                  result = await this.writeData(cmd);
                }
                
                results.push({ success: result, bytes: cmd.byteLength });
              } catch (err) {
                results.push({ success: false, bytes: cmd.byteLength });
              }
              
              // 每个命令之间添加延迟
              if (options.commandDelay) {
                await new Promise(resolve => setTimeout(resolve, options.commandDelay));
              }
            }
            
            return results;
          });
          
          // 等待当前批次完成
          const batchResults = await Promise.all(batchPromises);
          
          // 统计结果
          for (const results of batchResults) {
            for (const result of results) {
              if (result.success) {
                successCount++;
                successfulBytes += result.bytes;
              }
            }
          }
        }
      } else {
        // 串行处理所有命令
        for (let i = 0; i < commands.length; i++) {
          const cmd = commands[i];
          const useChunks = options.useChunks ?? (cmd.byteLength > this.flowControl.chunkSize);
          
          try {
            let result;
            if (useChunks) {
              result = await this.writeDataInChunks(cmd, this.flowControl.chunkSize, this.flowControl.chunkDelay);
            } else {
              result = await this.writeData(cmd);
            }
            
            if (result) {
              successCount++;
              successfulBytes += cmd.byteLength;
            }
          } catch (err) {
            // 继续处理其他命令
            logger.warn(`处理第${i+1}/${commands.length}条命令失败`, err);
          }
          
          // 每个命令之间添加延迟
          if (options.commandDelay && i < commands.length - 1) {
            await new Promise(resolve => setTimeout(resolve, options.commandDelay));
          }
        }
      }
      
      // 更新传输统计
      this.transmissionStats.endTime = Date.now();
      this.transmissionStats.successfulBytes = successfulBytes;
      this.transmissionStats.successfulCommands = successCount;
      
      // 计算传输速度和质量
      const transmissionTime = this.transmissionStats.endTime - this.transmissionStats.startTime;
      const transmissionSpeed = transmissionTime > 0 ? 
        (successfulBytes * 1000 / transmissionTime) : 0;
      this.transmissionStats.lastTransmissionSpeed = Math.round(transmissionSpeed);
      
      const quality = (successfulBytes / totalBytes) || 0;
      this.flowControl.lastQuality = quality;
      
      // 自动调整传输参数
      if (options.autoAdjustParams ?? this.flowControl.autoAdjust) {
        this.adjustTransmissionParams(quality, transmissionSpeed);
      }
      
      const success = successCount === commands.length;
      const failedCount = commands.length - successCount;
      
      if (!success) {
        logger.error(`批量命令执行不完整，共${commands.length}条命令，成功${successCount}条，失败${failedCount}条`);
        
        // 触发批量写入不完整事件
        eventManager.emit(EVENTS.BLUETOOTH_BATCH_INCOMPLETE, {
          total: commands.length,
          success: successCount,
          failed: failedCount,
          transmissionStats: this.getTransmissionStats()
        });
      } else {
        logger.debug(`批量命令执行完成，共${commands.length}条命令，耗时${transmissionTime}ms，速度${Math.round(transmissionSpeed)}字节/秒`);
        
        // 触发传输完成事件
        eventManager.emit(EVENTS.BLUETOOTH_TRANSMISSION_COMPLETE, {
          total: commands.length,
          bytes: successfulBytes,
          transmissionStats: this.getTransmissionStats()
        });
      }
      
      return { 
        success, 
        failed: failedCount,
        stats: this.getTransmissionStats()
      };
    } catch (error) {
      logger.error('批量命令执行出错', error);
      throw error;
    }
  }
  
  /**
   * 重置传输统计数据
   */
  private resetTransmissionStats(): void {
    this.transmissionStats = {
      totalBytes: 0,
      successfulBytes: 0,
      totalCommands: 0,
      successfulCommands: 0,
      retryCount: 0,
      startTime: 0,
      endTime: 0,
      lastTransmissionSpeed: 0
    };
  }
  
  /**
   * 获取传输统计信息
   */
  getTransmissionStats(): TransmissionStats {
    const stats = { ...this.transmissionStats };
    
    // 添加计算字段
    if (stats.totalBytes > 0) {
      stats.successRate = stats.successfulBytes / stats.totalBytes;
    }
    
    if (stats.endTime > stats.startTime) {
      stats.duration = stats.endTime - stats.startTime;
      stats.transmissionSpeed = Math.round(stats.successfulBytes * 1000 / stats.duration);
    } else {
      stats.duration = 0;
      stats.transmissionSpeed = 0;
    }
    
    return stats;
  }
  
  /**
   * 智能调整传输参数
   * 根据传输质量和速度优化分片大小和延迟
   */
  private adjustTransmissionParams(quality: number, speed: number): void {
    // 如果传输质量低于阈值，降低传输速度
    if (quality < this.flowControl.qualityThreshold) {
      // 减少分片大小
      this.flowControl.chunkSize = Math.max(
        this.flowControl.minChunkSize,
        this.flowControl.chunkSize - 5
      );
      
      // 增加延迟
      this.flowControl.chunkDelay = Math.min(
        this.flowControl.maxChunkDelay,
        this.flowControl.chunkDelay + 5
      );
      
      logger.debug(`传输质量较低(${quality.toFixed(2)})，调整参数：分片大小=${this.flowControl.chunkSize}，分片延迟=${this.flowControl.chunkDelay}ms`);
    } 
    // 如果传输质量良好，尝试提高速度
    else if (quality > 0.98 && this.transmissionStats.retryCount === 0) {
      // 仅在质量很高且无重试的情况下提高速度
      
      // 试着增加分片大小
      if (this.flowControl.chunkSize < this.flowControl.maxChunkSize) {
        this.flowControl.chunkSize = Math.min(
          this.flowControl.maxChunkSize,
          this.flowControl.chunkSize + 5
        );
      }
      // 或减少延迟
      else if (this.flowControl.chunkDelay > this.flowControl.minChunkDelay) {
        this.flowControl.chunkDelay = Math.max(
          this.flowControl.minChunkDelay,
          this.flowControl.chunkDelay - 2
        );
      }
      
      logger.debug(`传输质量良好(${quality.toFixed(2)})，优化参数：分片大小=${this.flowControl.chunkSize}，分片延迟=${this.flowControl.chunkDelay}ms`);
    }
  }
  
  /**
   * 手动设置流量控制参数
   */
  setFlowControlParams(params: Partial<FlowControlParams>): void {
    Object.assign(this.flowControl, params);
    this.flowControlAdjustments++;
    this.lastFlowControlAdjustment = Date.now();
    this.saveCurrentState();
  }
  
  /**
   * 获取当前流量控制参数
   */
  getFlowControlParams(): FlowControlParams {
    return { ...this.flowControl };
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

  /**
   * 获取设备信息
   * @param deviceId 设备ID（默认为当前连接的设备）
   */
  async getDeviceInfo(deviceId?: string): Promise<BluetoothDevice | null> {
    try {
      if (!this.adapter) {
        throw new Error('蓝牙适配器未初始化');
      }

      const targetDeviceId = deviceId || this.connectedDeviceId;
      if (!targetDeviceId) {
        return null;
      }

      // 先检查缓存
      const cachedInfo = this.getCachedDeviceInfo(targetDeviceId);
      if (cachedInfo) {
        return cachedInfo;
      }

      // 从已发现设备列表中查找
      const discoveredDevice = this.discoveredDevices.get(targetDeviceId);
      if (discoveredDevice) {
        this.updateDeviceInfoCache(targetDeviceId, discoveredDevice);
        return discoveredDevice;
      }

      // 如果设备已连接，获取实时信息
      if (this.isConnected() && targetDeviceId === this.connectedDeviceId) {
        const deviceInfo: BluetoothDevice = {
          deviceId: targetDeviceId,
          name: this.connectionHistory.get(targetDeviceId)?.name || '',
          RSSI: -1, // 使用默认值，因为adapter接口中没有getRSSI方法
          advertisData: new ArrayBuffer(0),
          manufacturerData: new ArrayBuffer(0)
        };
        
        this.updateDeviceInfoCache(targetDeviceId, deviceInfo);
        return deviceInfo;
      }

      return null;
    } catch (error) {
      logger.error('获取设备信息失败:', error);
      return null;
    }
  }
  
  /**
   * 获取设备电量信息
   * @param deviceId 设备ID（默认为当前连接的设备）
   */
  async getBatteryLevel(deviceId?: string): Promise<number | null> {
    const targetId = deviceId || this.connectedDeviceId;
    if (!targetId) {
      logger.warn('无法获取电量：未指定设备ID且未连接设备');
      return null;
    }
    
    try {
      // 尝试获取BLE设备的电池服务
      const services = await Taro.getBLEDeviceServices({
        deviceId: targetId
      });
      
      // 电池服务UUID
      const batteryServiceUUID = '180F';
      const batteryCharacteristicUUID = '2A19';
      
      // 查找电池服务
      const batteryService = services.services?.find(s => 
        s.uuid.toUpperCase().indexOf(batteryServiceUUID) >= 0
      );
      
      if (!batteryService) {
        logger.debug(`设备 ${targetId} 未提供电池服务`);
        return null;
      }
      
      // 获取电池服务的特征值
      const characteristics = await Taro.getBLEDeviceCharacteristics({
        deviceId: targetId,
        serviceId: batteryService.uuid
      });
      
      // 查找电池电量特征值
      const batteryCharacteristic = characteristics.characteristics?.find(c =>
        c.uuid.toUpperCase().indexOf(batteryCharacteristicUUID) >= 0
      );
      
      if (!batteryCharacteristic) {
        logger.debug(`设备 ${targetId} 的电池服务未提供电量特征值`);
        return null;
      }
      
      // 读取电池电量
      const result = await Taro.readBLECharacteristicValue({
        deviceId: targetId,
        serviceId: batteryService.uuid,
        characteristicId: batteryCharacteristic.uuid
      });
      
      if (result && result.errMsg.includes('ok')) {
        // 获取读取到的值，此处不需要额外调用getBLECharacteristicValue
        // 电量值会通过特定事件(onBLECharacteristicValueChange)返回
        // 注册监听电量特征值变化的事件
        return new Promise<number | null>((resolve) => {
          // 设置超时，防止长时间等待
          const timeout = setTimeout(() => {
            // 使用空回调函数，满足API要求
            Taro.offBLECharacteristicValueChange(() => {});
            resolve(null);
          }, 3000);
          
          // 创建监听回调
          const valueChangeHandler = (res: any) => {
            if (res.deviceId === targetId && 
                res.serviceId === batteryService.uuid && 
                res.characteristicId === batteryCharacteristic.uuid) {
              
              clearTimeout(timeout);
              Taro.offBLECharacteristicValueChange(() => {});
              
              // 解析电量值（通常是0-100的整数）
              const dataView = new DataView(res.value);
              const batteryLevel = dataView.getUint8(0);
              logger.debug(`设备 ${targetId} 电量: ${batteryLevel}%`);
              resolve(batteryLevel);
            }
          };
          
          // 监听特征值变化
          Taro.onBLECharacteristicValueChange(valueChangeHandler);
        });
      }
      
      return null;
    } catch (error) {
      logger.warn(`获取设备 ${targetId} 电量失败`, error);
      return null;
    }
  }

  /**
   * 设置低电量警告阈值并开始监控
   * @param threshold 电量阈值百分比（0-100）
   * @param interval 检查间隔（毫秒）
   */
  startBatteryMonitoring(threshold: number = 15, interval?: number): void {
    if (!this.connectedDeviceId) {
      logger.warn('未连接设备，无法启动电量监控');
      return;
    }
    
    // 停止之前的监控
    this.stopBatteryMonitoring();
    
    // 使用指定的间隔或当前设置的间隔
    const checkInterval = interval || this.batteryCheckIntervalMs;
    
    // 添加到实例属性
    this.batteryCheckInterval = setInterval(async () => {
      if (!this.connectedDeviceId) {
        this.stopBatteryMonitoring();
        return;
      }
      
      const batteryLevel = await this.getBatteryLevel();
      
      if (batteryLevel !== null) {
        // 触发电量更新事件
        eventManager.emit(EVENTS.BLUETOOTH_BATTERY_UPDATE, {
          deviceId: this.connectedDeviceId,
          level: batteryLevel
        });
        
        // 低电量警告
        if (batteryLevel <= threshold) {
          logger.warn(`设备 ${this.connectedDeviceId} 电量低: ${batteryLevel}%`);
          
          // 触发低电量事件
          eventManager.emit(EVENTS.BLUETOOTH_LOW_BATTERY, {
            deviceId: this.connectedDeviceId,
            level: batteryLevel,
            threshold
          });
          
          // 如果启用了自动电源管理，切换到激进节能模式
          if (this.powerSavingEnabled && this.powerSavingMode === 'auto') {
            this.applyPowerMode('aggressive');
          }
        }
        
        // 如果在自动电源管理模式下，根据电池电量调整模式
        if (this.powerSavingEnabled && this.powerSavingMode === 'auto') {
          this.detectBatteryAndAdjustPowerMode();
        }
      }
    }, checkInterval);
    
    logger.debug(`已启动电量监控，阈值: ${threshold}%，间隔: ${checkInterval}ms`);
  }
  
  /**
   * 停止电量监控
   */
  stopBatteryMonitoring(): void {
    if (this.batteryCheckInterval) {
      clearInterval(this.batteryCheckInterval);
      this.batteryCheckInterval = null;
      logger.debug('已停止电量监控');
    }
  }

  /**
   * 诊断蓝牙连接状态
   * 用于排查和解决常见问题
   */
  async diagnoseConnection(): Promise<DeviceHealthInfo> {
    const issues: string[] = [];
    const details: DeviceHealthInfo['details'] = {
      deviceId: this.connectedDeviceId,
      isInitialized: this.isInitialized,
      isConnected: this.isConnected(),
      transmissionQuality: this.flowControl.lastQuality,
      batteryLevel: null,
      signalStrength: null
    };
    
    // 检查初始化状态
    if (!this.isInitialized) {
      issues.push('蓝牙适配器未初始化');
    }
    
    // 检查连接状态
    if (!this.connectedDeviceId) {
      issues.push('未连接到设备');
    } else {
      try {
        // 测试服务可用性
        const device = await this.getDeviceInfo();
        if (device) {
          details.device = device;
          
          // 检查设备名称
          if (!device.name) {
            issues.push('设备名称为空，可能是设备连接不稳定');
          }
        }
        
        // 检查电池电量
        const batteryLevel = await this.getBatteryLevel();
        details.batteryLevel = batteryLevel;
        
        if (batteryLevel !== null && batteryLevel < 15) {
          issues.push(`设备电量低：${batteryLevel}%`);
        }
        
        // 获取信号强度（RSSI）
        try {
          // 获取设备信号强度信息
          // 注意：小程序通常需要在蓝牙设备发现阶段获取RSSI，
          // 这里尝试从已发现设备列表中获取
          const deviceInfo = await this.getDeviceInfo();
          if (deviceInfo && typeof deviceInfo.RSSI === 'number') {
            details.signalStrength = deviceInfo.RSSI;
            
            // 弱信号强度检查
            if (deviceInfo.RSSI < -80) {
              issues.push(`设备信号强度较弱：${deviceInfo.RSSI}dBm`);
            }
          } else {
            logger.debug('无法获取设备信号强度信息');
          }
        } catch (err) {
          logger.debug('获取设备信号强度失败', err);
        }
        
        // 测试写入能力
        const testData = new Uint8Array([0x00, 0x00, 0x00, 0x00]).buffer;
        const writeResult = await this.writeData(testData).catch(() => false);
        details.canWrite = writeResult;
        
        if (!writeResult) {
          issues.push('设备不响应数据写入命令');
        }
      } catch (error) {
        issues.push(`设备状态检查出错: ${error instanceof Error ? error.message : String(error)}`);
        details.error = error;
      }
    }
    
    // 检查传输统计信息
    if (this.transmissionStats.totalBytes > 0) {
      const transmissionStats = this.getTransmissionStats();
      details.transmissionStats = transmissionStats;
      
      if ((transmissionStats.successRate || 0) < 0.8) {
        issues.push(`传输成功率较低: ${((transmissionStats.successRate || 0) * 100).toFixed(1)}%`);
      }
    }
    
    // 确定总体状态
    let status: 'healthy' | 'warning' | 'error' = 'healthy';
    
    if (issues.length > 0) {
      status = issues.some(issue => 
        issue.includes('未初始化') || 
        issue.includes('未连接') || 
        issue.includes('不响应')
      ) ? 'error' : 'warning';
    }
    
    logger.info(`设备状态诊断：${status}`, issues);
    
    // 如果有问题但不严重，尝试自动修复
    if (status === 'warning' && this.isConnected()) {
      this.tryOptimizeConnection();
    }
    
    return {
      status,
      issues,
      details
    };
  }
  
  /**
   * 尝试优化连接状态
   * 自动执行一些修复和优化操作
   */
  private async tryOptimizeConnection(): Promise<void> {
    if (!this.connectedDeviceId) return;
    
    logger.debug('尝试优化蓝牙连接...');
    
    try {
      // 1. 重置特征值通知状态
      await Taro.notifyBLECharacteristicValueChange({
        deviceId: this.connectedDeviceId,
        serviceId: this.serviceUUID,
        characteristicId: this.characteristicUUID,
        state: false
      }).catch(() => null);
      
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // 2. 清理缓存数据
      const testData = new Uint8Array([0x00, 0x1B, 0x40]).buffer; // ESC @ 初始化指令
      await this.writeData(testData).catch(() => false);
      
      // 3. 测试新的流量控制参数
      this.setFlowControlParams({
        chunkSize: 20,  // 恢复默认值
        chunkDelay: 30, // 稍微增加延迟
        autoAdjust: true
      });
      
      logger.debug('连接优化完成');
    } catch (error) {
      logger.warn('连接优化失败', error);
    }
  }
  
  /**
   * 设置连接保活
   * 定期发送探测命令保持连接活跃
   * @param enable 是否启用
   * @param interval 间隔时间(毫秒)
   */
  private keepAliveInterval: NodeJS.Timeout | null = null;
  
  setKeepAlive(enable: boolean, interval: number = 30000): void {
    // 清除现有的保活定时器
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = null;
    }
    
    if (!enable) {
      logger.debug('已禁用连接保活');
      return;
    }
    
    logger.debug(`启用连接保活，间隔: ${interval}ms`);
    
    // 设置新的保活定时器
    this.keepAliveInterval = setInterval(async () => {
      if (!this.isConnected()) {
        logger.debug('设备未连接，暂停保活');
        return;
      }
      
      try {
        // 发送空命令保持连接
        const keepAliveData = new Uint8Array([0x00]).buffer;
        await this.writeData(keepAliveData);
        logger.debug('发送保活数据包');
      } catch (error) {
        logger.warn('保活数据发送失败', error);
        
        // 如果保活失败且配置了自动重连，尝试重新连接
        if (this.autoReconnect && this.connectedDeviceId) {
          logger.info('保活失败，尝试重新连接...');
          this.connectedDeviceId = null;
          this.lastConnectedDevice = this.connectedDeviceId; 
          this.scheduleReconnect();
        }
      }
    }, interval);
  }
  
  /**
   * 清理连接相关资源
   * 在组件卸载或页面关闭时调用
   */
  cleanup(): void {
    // 清理队列资源
    if (this.queueProcessTimer) {
      clearTimeout(this.queueProcessTimer);
      this.queueProcessTimer = null;
    }
    this.clearCommandQueue(true);
    
    // 调用原来的清理代码
    logger.debug('清理蓝牙连接资源...');
    
    // 清理电量监控
    this.stopBatteryMonitoring();
    
    // 清理保活定时器
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = null;
    }
    
    // 清理连接质量监控
    this.stopQualityMonitoring();
    
    // 清理重连定时器
    this.resetReconnectState();
    
    // 清理恢复计时器
    this.resetRecoveryState();
    
    // 关闭自动重连
    this.autoReconnect = false;
    
    // 断开连接但不触发重连
    if (this.connectedDeviceId) {
      this.disconnect().catch(err => {
        logger.warn('清理时断开连接失败', err);
      });
    }
    
    // 清理电源管理资源
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
      this.inactivityTimer = null;
    }
    
    // 清理性能监控资源
    if (this.performanceMonitorInterval) {
      clearInterval(this.performanceMonitorInterval);
      this.performanceMonitorInterval = null;
    }
    
    // 释放缓冲区池
    for (const size of this.performanceConfig.bufferSizes) {
      this.bufferPool.set(size, []);
    }
    
    // 清空缓存
    this.deviceInfoCache.clear();
    
    // 清理统计数据
    this.statsAggregator.writeTimes = [];
    this.statsAggregator.readTimes = [];
    this.statsAggregator.connectTimes = [];
    this.statsAggregator.discoverTimes = [];
    this.statsAggregator.errorCounts.clear();
  }

  /**
   * 获取收藏的设备列表
   */
  getFavoriteDevices(): BluetoothDevice[] {
    const favorites: BluetoothDevice[] = [];
    this.connectionHistory.forEach(history => {
      if (history.favorite) {
        favorites.push({
          deviceId: history.deviceId,
          name: history.name || `设备 ${history.deviceId.slice(-6)}`
        });
      }
    });
    return favorites;
  }
  
  /**
   * 设置设备收藏状态
   * @param deviceId 设备ID
   * @param favorite 是否收藏
   */
  setDeviceFavorite(deviceId: string, favorite: boolean): boolean {
    const historyEntry = this.connectionHistory.get(deviceId);
    if (historyEntry) {
      historyEntry.favorite = favorite;
      this.connectionHistory.set(deviceId, historyEntry);
      this.saveConnectionHistory();
      logger.debug(`设备 ${deviceId} ${favorite ? '已加入' : '已移出'}收藏列表`);
      return true;
    }
    return false;
  }
  
  /**
   * 获取最近连接的设备列表
   * @param limit 最大数量
   */
  getRecentDevices(limit: number = 5): BluetoothDevice[] {
    // 按最后连接时间排序
    const sortedHistory = Array.from(this.connectionHistory.values())
      .sort((a, b) => b.lastConnected - a.lastConnected)
      .slice(0, limit);
    
    return sortedHistory.map(history => ({
      deviceId: history.deviceId,
      name: history.name || `设备 ${history.deviceId.slice(-6)}`
    }));
  }
  
  /**
   * 清除设备历史记录
   * @param deviceId 指定设备ID，不指定则清除所有
   */
  clearDeviceHistory(deviceId?: string): void {
    if (deviceId) {
      this.connectionHistory.delete(deviceId);
    } else {
      this.connectionHistory.clear();
    }
    this.saveConnectionHistory();
    logger.debug(deviceId ? `已清除设备 ${deviceId} 的历史记录` : '已清除所有设备历史记录');
  }

  /**
   * 启动连接质量监控
   */
  startQualityMonitoring(): void {
    if (this.connectionQualityInterval) {
      clearInterval(this.connectionQualityInterval);
    }

    logger.debug('启动连接质量监控');
    
    this.connectionQualityInterval = setInterval(async () => {
      if (!this.isConnected()) {
        return;
      }

      try {
        const deviceInfo = await this.getDeviceInfo();
        const signalStrength = deviceInfo?.RSSI;
        const transmissionQuality = this.flowControl.lastQuality;

        const qualityInfo = {
          deviceId: this.connectedDeviceId,
          signalStrength,
          transmissionQuality,
          timestamp: Date.now()
        };

        // 触发质量更新事件
        eventManager.emit(EVENTS.BLUETOOTH_QUALITY_UPDATE, qualityInfo);

        // 检查信号强度
        if (typeof signalStrength === 'number' && signalStrength < this.RSSI_WARNING_THRESHOLD) {
          logger.warn(`蓝牙信号强度较弱: ${signalStrength}dBm`);
          eventManager.emit(EVENTS.BLUETOOTH_WEAK_SIGNAL, {
            deviceId: this.connectedDeviceId,
            signalStrength,
            threshold: this.RSSI_WARNING_THRESHOLD
          });
        }

        // 检查传输质量
        if (transmissionQuality < this.QUALITY_WARNING_THRESHOLD) {
          logger.warn(`传输质量较差: ${(transmissionQuality * 100).toFixed(1)}%`);
          eventManager.emit(EVENTS.BLUETOOTH_POOR_QUALITY, {
            deviceId: this.connectedDeviceId,
            quality: transmissionQuality,
            threshold: this.QUALITY_WARNING_THRESHOLD
          });

          // 尝试优化连接
          await this.tryOptimizeConnection();
        }
      } catch (error) {
        logger.warn('连接质量检查失败', error);
      }
    }, this.qualityCheckInterval);
  }

  /**
   * 停止连接质量监控
   */
  stopQualityMonitoring(): void {
    if (this.connectionQualityInterval) {
      clearInterval(this.connectionQualityInterval);
      this.connectionQualityInterval = null;
      logger.debug('已停止连接质量监控');
    }
  }

  /**
   * 保存当前状态
   */
  private saveCurrentState(): void {
    this.lastKnownState = {
      flowControl: { ...this.flowControl },
      batteryLevel: null,
      signalStrength: null,
      transmissionStats: { ...this.transmissionStats }
    };

    // 尝试获取最新的电量和信号强度
    this.getBatteryLevel().then(level => {
      if (this.lastKnownState) {
        this.lastKnownState.batteryLevel = level;
      }
    });

    this.getDeviceInfo().then(info => {
      if (this.lastKnownState && info?.RSSI) {
        this.lastKnownState.signalStrength = info.RSSI;
      }
    });
  }

  /**
   * 恢复之前的状态
   */
  private async restoreState(): Promise<boolean> {
    if (!this.lastKnownState || !this.isConnected()) {
      return false;
    }

    try {
      // 恢复流量控制参数
      this.flowControl = { ...this.lastKnownState.flowControl };
      
      // 验证连接是否正常
      const testData = new Uint8Array([0x00]).buffer;
      const writeResult = await this.writeData(testData);
      
      if (!writeResult) {
        throw new Error('连接状态验证失败');
      }

      // 重新启动监控
      this.startQualityMonitoring();
      this.startBatteryMonitoring();

      logger.info('成功恢复设备状态');
      return true;
    } catch (error) {
      logger.warn('恢复设备状态失败', error);
      return false;
    }
  }

  /**
   * 智能恢复连接
   */
  private async attemptRecovery(): Promise<boolean> {
    if (this.recoveryAttempts >= this.MAX_RECOVERY_ATTEMPTS) {
      logger.warn('达到最大恢复尝试次数');
      return false;
    }

    this.recoveryAttempts++;
    this.currentRecoveryDelay = Math.min(5000, this.currentRecoveryDelay + 500);

    try {
      // 1. 尝试重新初始化蓝牙
      if (!this.isInitialized) {
        const initResult = await this.init();
        if (!initResult) {
          throw new Error('蓝牙初始化失败');
        }
      }

      // 2. 尝试重新连接
      if (!this.isConnected() && this.lastConnectedDevice) {
        const connectResult = await this.connect(this.lastConnectedDevice, {
          timeout: 5000,
          retries: 1
        });

        if (!connectResult) {
          throw new Error('重新连接失败');
        }
      }

      // 3. 恢复之前的状态
      const restoreResult = await this.restoreState();
      if (!restoreResult) {
        throw new Error('状态恢复失败');
      }

      logger.info('连接恢复成功');
      this.resetRecoveryState();
      return true;
    } catch (error) {
      logger.error('恢复失败:', error);
      return false;
    }
  }

  /**
   * 安排恢复尝试
   */
  private scheduleRecovery(delay: number): void {
    const backoffDelay = this.currentRecoveryDelay * Math.pow(2, this.recoveryAttempts - 1);
    
    if (this.recoveryTimer) {
      clearTimeout(this.recoveryTimer);
    }

    this.recoveryTimer = setTimeout(() => {
      this.attemptRecovery();
    }, backoffDelay);
  }

  /**
   * 重置恢复状态
   */
  private resetRecoveryState(): void {
    this.recoveryAttempts = 0;
    if (this.recoveryTimer) {
      clearTimeout(this.recoveryTimer);
      this.recoveryTimer = null;
    }
  }

  /**
   * 获取设备性能报告
   */
  async getPerformanceReport(): Promise<{
    device: {
      id: string | null;
      name?: string;
      signalStrength?: number;
      batteryLevel?: number;
    };
    connection: {
      uptime: number;
      reconnections: number;
      lastReconnectTime?: number;
      quality: number;
    };
    transmission: {
      totalBytesSent: number;
      averageSpeed: number;
      successRate: number;
      errorRate: number;
      retryCount: number;
    };
    flowControl: {
      current: FlowControlParams;
      adjustments: number;
      lastAdjustmentTime?: number;
    };
  }> {
    const deviceInfo = await this.getDeviceInfo();
    const batteryLevel = await this.getBatteryLevel();
    const stats = this.getTransmissionStats();
    
    return {
      device: {
        id: this.connectedDeviceId,
        name: deviceInfo?.name,
        signalStrength: deviceInfo?.RSSI,
        batteryLevel: batteryLevel || undefined
      },
      connection: {
        uptime: this.getConnectionUptime(),
        reconnections: this.recoveryAttempts,
        lastReconnectTime: this.lastReconnectTime,
        quality: this.flowControl.lastQuality
      },
      transmission: {
        totalBytesSent: stats.totalBytes,
        averageSpeed: stats.transmissionSpeed || 0,
        successRate: stats.successRate || 0,
        errorRate: stats.totalBytes > 0 ? 
          (stats.totalBytes - stats.successfulBytes) / stats.totalBytes : 0,
        retryCount: stats.retryCount
      },
      flowControl: {
        current: { ...this.flowControl },
        adjustments: this.flowControlAdjustments,
        lastAdjustmentTime: this.lastFlowControlAdjustment
      }
    };
  }

  /**
   * 获取连接运行时间（毫秒）
   */
  private getConnectionUptime(): number {
    if (!this.connectionStartTime || !this.isConnected()) {
      return 0;
    }
    return Date.now() - this.connectionStartTime;
  }

  /**
   * 分析并优化传输性能
   */
  private analyzeAndOptimizePerformance(): void {
    const stats = this.getTransmissionStats();
    const quality = this.flowControl.lastQuality;
    
    // 性能分析
    const analysis = {
      transmissionEfficiency: stats.successRate || 0,
      throughput: stats.transmissionSpeed || 0,
      stability: quality,
      retryRate: stats.totalCommands > 0 ? 
        stats.retryCount / stats.totalCommands : 0
    };

    logger.debug('性能分析:', analysis);

    // 根据分析结果优化参数
    if (analysis.transmissionEfficiency < 0.9) {
      // 传输效率低，减小分片大小
      this.setFlowControlParams({
        chunkSize: Math.max(
          this.flowControl.minChunkSize,
          this.flowControl.chunkSize - 10
        )
      });
    } else if (analysis.stability > 0.95 && analysis.retryRate < 0.1) {
      // 性能良好，尝试提高传输速度
      this.setFlowControlParams({
        chunkSize: Math.min(
          this.flowControl.maxChunkSize,
          this.flowControl.chunkSize + 5
        ),
        chunkDelay: Math.max(
          this.flowControl.minChunkDelay,
          this.flowControl.chunkDelay - 2
        )
      });
    }
  }

  /**
   * 诊断并修复常见问题
   */
  async diagnoseAndRepair(): Promise<{
    status: 'healthy' | 'warning' | 'error';
    issues: string[];
    repairs: string[];
    success: boolean;
  }> {
    const issues: string[] = [];
    const repairs: string[] = [];
    let success = true;

    try {
      // 1. 检查初始化状态
      if (!this.isInitialized) {
        issues.push('蓝牙未初始化');
        logger.info('尝试初始化蓝牙...');
        const initResult = await this.init();
        if (initResult) {
          repairs.push('成功初始化蓝牙');
        } else {
          success = false;
        }
      }

      // 2. 检查连接状态
      if (!this.isConnected()) {
        issues.push('设备未连接');
        if (this.lastConnectedDevice) {
          logger.info('尝试重新连接...');
          const connectResult = await this.connect(this.lastConnectedDevice);
          if (connectResult) {
            repairs.push('成功重新连接到设备');
          } else {
            success = false;
          }
        }
      }

      // 3. 检查信号强度
      const deviceInfo = await this.getDeviceInfo();
      if (deviceInfo?.RSSI && deviceInfo.RSSI < this.RSSI_WARNING_THRESHOLD) {
        issues.push(`信号强度较弱: ${deviceInfo.RSSI}dBm`);
        repairs.push('建议靠近设备或排除信号干扰');
      }

      // 4. 检查传输质量
      const stats = this.getTransmissionStats();
      if ((stats.successRate || 0) < 0.9) {
        issues.push(`传输成功率较低: ${((stats.successRate || 0) * 100).toFixed(1)}%`);
        logger.info('尝试优化传输参数...');
        this.analyzeAndOptimizePerformance();
        repairs.push('已优化传输参数');
      }

      // 5. 检查电池状态
      const batteryLevel = await this.getBatteryLevel();
      if (batteryLevel !== null && batteryLevel < 20) {
        issues.push(`设备电量低: ${batteryLevel}%`);
        repairs.push('建议及时充电');
      }

      // 6. 验证写入功能
      if (this.isConnected()) {
        const testData = new Uint8Array([0x00]).buffer;
        const writeResult = await this.writeData(testData).catch(() => false);
        if (!writeResult) {
          issues.push('数据写入测试失败');
          logger.info('尝试重置连接...');
          await this.disconnect();
          await this.connect(this.lastConnectedDevice!);
          repairs.push('已重置连接');
        }
      }

      // 确定状态
      let status: 'healthy' | 'warning' | 'error' = 'healthy';
      if (issues.length > 0) {
        status = success ? 'warning' : 'error';
      }

      return {
        status,
        issues,
        repairs,
        success
      };
    } catch (error) {
      logger.error('诊断过程出错', error);
      return {
        status: 'error',
        issues: [...issues, '诊断过程出错'],
        repairs,
        success: false
      };
    }
  }

  /**
   * 添加命令到队列
   * @param command 命令数据
   * @param options 队列选项
   */
  queueCommand(
    command: ArrayBuffer, 
    options: {
      priority?: number;
      maxRetries?: number;
      useChunks?: boolean;
      description?: string;
    } = {}
  ): Promise<boolean> {
    // 默认选项
    const priority = options.priority ?? this.DEFAULT_COMMAND_PRIORITY;
    const maxRetries = options.maxRetries ?? 2;
    const useChunks = options.useChunks ?? (command.byteLength > this.flowControl.chunkSize);
    const description = options.description;
    
    // 创建唯一ID
    const id = `cmd_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    
    // 检查队列大小
    if (this.commandQueue.length >= this.QUEUE_MAX_SIZE) {
      logger.warn(`命令队列已满(${this.QUEUE_MAX_SIZE})，拒绝新命令`);
      return Promise.reject(new PrinterError(
        ErrorCode.COMMAND_QUEUE_FULL,
        `命令队列已满，最大容量: ${this.QUEUE_MAX_SIZE}`
      ));
    }
    
    // 创建Promise并添加到队列
    return new Promise<boolean>((resolve, reject) => {
      this.commandQueue.push({
        id,
        command,
        priority,
        timestamp: Date.now(),
        retries: 0,
        maxRetries,
        resolve,
        reject,
        useChunks,
        description
      });
      
      // 按优先级排序队列
      this.sortQueue();
      
      logger.debug(`命令已加入队列: ID=${id}, 大小=${command.byteLength}字节, 优先级=${priority}${description ? ', 描述=' + description : ''}`);
      
      // 启动队列处理
      this.startQueueProcessing();
    });
  }
  
  /**
   * 启动队列处理
   */
  private startQueueProcessing(): void {
    if (this.isProcessingQueue || this.queuePaused) {
      return;
    }
    
    this.isProcessingQueue = true;
    
    // 设置定时器处理队列
    this.processQueue();
  }
  
  /**
   * 处理命令队列
   */
  private async processQueue(): Promise<void> {
    if (this.queuePaused) {
      this.isProcessingQueue = false;
      return;
    }
    
    // 检查是否有命令需要处理
    if (this.commandQueue.length === 0) {
      this.isProcessingQueue = false;
      return;
    }
    
    // 检查是否已连接
    if (!this.isConnected()) {
      logger.warn('命令队列处理暂停: 设备未连接');
      this.isProcessingQueue = false;
      
      // 当设备重新连接时，会自动恢复队列处理
      return;
    }
    
    try {
      // 获取队首命令
      const cmd = this.commandQueue[0];
      
      logger.debug(`处理队列命令: ID=${cmd.id}, 大小=${cmd.command.byteLength}字节${cmd.retries > 0 ? ', 重试=' + cmd.retries : ''}`);
      
      // 发送命令
      let result: boolean;
      if (cmd.useChunks) {
        result = await this.writeDataInChunks(
          cmd.command, 
          this.flowControl.chunkSize,
          this.flowControl.chunkDelay
        );
      } else {
        result = await this.writeData(cmd.command);
      }
      
      if (result) {
        // 命令发送成功
        logger.debug(`队列命令成功: ID=${cmd.id}`);
        cmd.resolve(true);
        this.commandQueue.shift(); // 移除队首命令
      } else {
        // 命令发送失败
        cmd.retries++;
        
        if (cmd.retries <= cmd.maxRetries) {
          logger.debug(`队列命令失败，将重试: ID=${cmd.id}, 重试=${cmd.retries}/${cmd.maxRetries}`);
          // 重试时将命令移到队尾，以免阻塞其他命令
          const failedCmd = this.commandQueue.shift()!;
          // 等待延迟后再重试
          setTimeout(() => {
            this.commandQueue.push(failedCmd);
            this.sortQueue();
          }, 1000); // 等待1秒后重试
        } else {
          logger.warn(`队列命令失败，超过最大重试次数: ID=${cmd.id}`);
          cmd.reject(new PrinterError(
            ErrorCode.COMMAND_FAILED,
            `命令执行失败，已重试${cmd.retries - 1}次`
          ));
          this.commandQueue.shift(); // 移除队首命令
        }
      }
    } catch (error) {
      // 处理错误
      const cmd = this.commandQueue[0];
      logger.error(`队列命令执行出错: ID=${cmd.id}`, error);
      cmd.reject(error);
      this.commandQueue.shift(); // 移除队首命令
    } finally {
      // 继续处理队列中的下一条命令
      if (this.commandQueue.length > 0) {
        // 添加短延迟，避免过快发送
        this.queueProcessTimer = setTimeout(() => {
          this.processQueue();
        }, this.QUEUE_PROCESS_INTERVAL);
      } else {
        this.isProcessingQueue = false;
      }
    }
  }
  
  /**
   * 按优先级排序队列
   */
  private sortQueue(): void {
    this.commandQueue.sort((a, b) => {
      // 首先按优先级排序（高优先级在前）
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }
      // 其次按时间戳排序（先进先出）
      return a.timestamp - b.timestamp;
    });
  }
  
  /**
   * 暂停队列处理
   */
  pauseCommandQueue(): void {
    this.queuePaused = true;
    logger.info('命令队列处理已暂停');
    
    if (this.queueProcessTimer) {
      clearTimeout(this.queueProcessTimer);
      this.queueProcessTimer = null;
    }
  }
  
  /**
   * 恢复队列处理
   */
  resumeCommandQueue(): void {
    this.queuePaused = false;
    logger.info(`命令队列处理已恢复，队列中有${this.commandQueue.length}条命令`);
    
    if (this.commandQueue.length > 0 && !this.isProcessingQueue) {
      this.startQueueProcessing();
    }
  }
  
  /**
   * 清空命令队列
   * @param rejectRemaining 是否拒绝剩余命令
   */
  clearCommandQueue(rejectRemaining: boolean = true): number {
    const remainingCount = this.commandQueue.length;
    
    if (remainingCount === 0) {
      return 0;
    }
    
    if (rejectRemaining) {
      // 拒绝所有剩余命令
      const error = new PrinterError(
        ErrorCode.QUEUE_CLEARED,
        '命令队列已被清空'
      );
      
      this.commandQueue.forEach(cmd => {
        cmd.reject(error);
      });
    }
    
    this.commandQueue = [];
    logger.info(`命令队列已清空，丢弃了${remainingCount}条命令`);
    
    return remainingCount;
  }
  
  /**
   * 获取队列状态
   */
  getQueueStatus(): {
    queueLength: number;
    isPaused: boolean;
    isProcessing: boolean;
    highPriorityCount: number;
    normalPriorityCount: number;
    lowPriorityCount: number;
  } {
    const highPriorityCount = this.commandQueue.filter(cmd => cmd.priority >= this.HIGH_PRIORITY).length;
    const lowPriorityCount = this.commandQueue.filter(cmd => cmd.priority <= this.LOW_PRIORITY).length;
    const normalPriorityCount = this.commandQueue.length - highPriorityCount - lowPriorityCount;
    
    return {
      queueLength: this.commandQueue.length,
      isPaused: this.queuePaused,
      isProcessing: this.isProcessingQueue,
      highPriorityCount,
      normalPriorityCount,
      lowPriorityCount
    };
  }

  // 修改原有写入方法，使用队列系统
  async writeCommands(commands: ArrayBuffer[], options: ExtendedBatchWriteOptions = {}): Promise<BatchWriteResult> {
    if (!this.isConnected()) {
      const error = new PrinterError(
        ErrorCode.PRINTER_NOT_CONNECTED,
        '未连接到蓝牙设备'
      );
      throw error;
    }
    
    if (commands.length === 0) {
      return { success: true, failed: 0 };
    }
    
    // 重置传输统计
    this.resetTransmissionStats();
    
    // 计算总字节数
    let totalBytes = 0;
    for (const cmd of commands) {
      totalBytes += cmd.byteLength;
    }
    
    this.transmissionStats.totalBytes = totalBytes;
    this.transmissionStats.totalCommands = commands.length;
    this.transmissionStats.startTime = Date.now();
    
    logger.info(`通过队列发送${commands.length}条命令，总大小${totalBytes}字节`);
    
    // 将所有命令添加到队列
    const promises = commands.map((cmd, index) => {
      return this.queueCommand(cmd, {
        priority: options.highPriority ? this.HIGH_PRIORITY : this.DEFAULT_COMMAND_PRIORITY,
        maxRetries: options.retries ?? 1,
        useChunks: options.useChunks ?? true,
        description: `批量命令 ${index+1}/${commands.length}`
      });
    });
    
    // 等待所有命令完成
    try {
      const results = await Promise.allSettled(promises);
      
      // 统计成功和失败
      let successCount = 0;
      let successfulBytes = 0;
      
      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value) {
          successCount++;
          successfulBytes += commands[index].byteLength;
        }
      });
      
      // 更新传输统计
      this.transmissionStats.endTime = Date.now();
      this.transmissionStats.successfulBytes = successfulBytes;
      this.transmissionStats.successfulCommands = successCount;
      
      // 计算传输速度和质量
      const transmissionTime = this.transmissionStats.endTime - this.transmissionStats.startTime;
      const transmissionSpeed = transmissionTime > 0 ? 
        (successfulBytes * 1000 / transmissionTime) : 0;
      this.transmissionStats.lastTransmissionSpeed = Math.round(transmissionSpeed);
      
      const quality = (successfulBytes / totalBytes) || 0;
      this.flowControl.lastQuality = quality;
      
      // 自动调整传输参数
      if (options.autoAdjustParams ?? this.flowControl.autoAdjust) {
        this.adjustTransmissionParams(quality, transmissionSpeed);
      }
      
      const success = successCount === commands.length;
      const failedCount = commands.length - successCount;
      
      if (!success) {
        logger.error(`队列命令批量执行不完整，共${commands.length}条命令，成功${successCount}条，失败${failedCount}条`);
        
        // 触发批量写入不完整事件
        eventManager.emit(EVENTS.BLUETOOTH_BATCH_INCOMPLETE, {
          total: commands.length,
          success: successCount,
          failed: failedCount,
          transmissionStats: this.getTransmissionStats()
        });
      } else {
        logger.debug(`队列命令批量执行完成，共${commands.length}条命令，耗时${transmissionTime}ms，速度${Math.round(transmissionSpeed)}字节/秒`);
        
        // 触发传输完成事件
        eventManager.emit(EVENTS.BLUETOOTH_TRANSMISSION_COMPLETE, {
          total: commands.length,
          bytes: successfulBytes,
          transmissionStats: this.getTransmissionStats()
        });
      }
      
      return { 
        success, 
        failed: failedCount,
        stats: this.getTransmissionStats()
      };
    } catch (error) {
      logger.error('队列命令批量执行出错', error);
      throw error;
    }
  }

  // 电源管理选项
  private powerSavingEnabled: boolean = false;
  private powerSavingMode: 'auto' | 'aggressive' | 'balanced' | 'performance' = 'balanced';
  private inactivityTimer: NodeJS.Timeout | null = null;
  private readonly DEFAULT_INACTIVITY_TIMEOUT = 60000; // 60秒不活动后进入节能模式
  private inactivityTimeout: number = this.DEFAULT_INACTIVITY_TIMEOUT;
  private lastActivityTime: number = Date.now();
  private batteryCheckIntervalMs: number = 30000; // 30秒
  
  /**
   * 设置电源管理模式
   * @param enabled 是否启用节能模式
   * @param mode 节能模式类型
   * @param inactivityTimeout 不活动超时时间（毫秒）
   */
  setPowerManagement(
    enabled: boolean, 
    mode: 'auto' | 'aggressive' | 'balanced' | 'performance' = 'balanced',
    inactivityTimeout: number = this.DEFAULT_INACTIVITY_TIMEOUT
  ): void {
    this.powerSavingEnabled = enabled;
    this.powerSavingMode = mode;
    this.inactivityTimeout = inactivityTimeout;
    
    // 清除现有定时器
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
      this.inactivityTimer = null;
    }
    
    if (enabled) {
      this.resetActivityTimer();
      logger.info(`电源管理已启用，模式: ${mode}, 不活动超时: ${inactivityTimeout}ms`);
      
      if (mode === 'auto') {
        // 自动模式下，尝试根据设备电池电量决定节能策略
        this.detectBatteryAndAdjustPowerMode();
      } else {
        // 直接应用指定模式
        this.applyPowerMode(mode);
      }
    } else {
      // 禁用节能模式，应用性能模式
      this.applyPowerMode('performance');
      logger.info('电源管理已禁用，使用性能模式');
    }
  }
  
  /**
   * 更新活动状态，重置不活动计时器
   */
  private resetActivityTimer(): void {
    this.lastActivityTime = Date.now();
    
    if (!this.powerSavingEnabled) {
      return;
    }
    
    // 清除现有定时器
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
    }
    
    // 设置新定时器
    this.inactivityTimer = setTimeout(() => {
      this.handleInactivity();
    }, this.inactivityTimeout);
  }
  
  /**
   * 处理不活动状态
   */
  private handleInactivity(): void {
    if (!this.isConnected() || !this.powerSavingEnabled) {
      return;
    }
    
    const inactiveTime = Date.now() - this.lastActivityTime;
    logger.debug(`设备不活动时间: ${Math.round(inactiveTime / 1000)}秒, 进入节能模式`);
    
    // 根据当前模式应用节能策略
    if (this.powerSavingMode === 'auto') {
      // 自动模式下应用平衡模式
      this.applyPowerMode('balanced');
    } else if (this.powerSavingMode === 'performance') {
      // 如果当前是性能模式，则切换到平衡模式
      this.applyPowerMode('balanced');
    } else {
      // 应用当前模式
      this.applyPowerMode(this.powerSavingMode);
    }
    
    // 减少电池检查频率
    this.adjustBatteryCheckInterval(60000); // 1分钟检查一次
  }
  
  /**
   * 根据电池电量自动调整电源模式
   */
  private async detectBatteryAndAdjustPowerMode(): Promise<void> {
    if (!this.isConnected() || !this.powerSavingEnabled) {
      return;
    }
    
    try {
      const batteryLevel = await this.getBatteryLevel();
      
      if (batteryLevel === null) {
        // 无法获取电池电量，使用平衡模式
        this.applyPowerMode('balanced');
        return;
      }
      
      if (batteryLevel <= 15) {
        // 电量不足15%，使用激进节能模式
        this.applyPowerMode('aggressive');
        logger.info(`设备电量低(${batteryLevel}%)，切换到激进节能模式`);
      } else if (batteryLevel <= 30) {
        // 电量不足30%，使用平衡模式
        this.applyPowerMode('balanced');
        logger.debug(`设备电量适中(${batteryLevel}%)，使用平衡节能模式`);
      } else {
        // 电量充足，使用性能模式
        this.applyPowerMode('performance');
        logger.debug(`设备电量充足(${batteryLevel}%)，使用性能模式`);
      }
    } catch (error) {
      logger.warn('获取电池电量失败，使用平衡模式', error);
      this.applyPowerMode('balanced');
    }
  }
  
  /**
   * 应用指定的电源模式
   * @param mode 电源模式
   */
  private applyPowerMode(mode: 'aggressive' | 'balanced' | 'performance'): void {
    switch (mode) {
      case 'aggressive':
        this.qualityCheckInterval = 30000; // 30秒检查一次质量
        this.flowControl.chunkSize = 10;
        this.flowControl.delayBetweenChunks = 50;
        break;
      
      case 'balanced':
        this.qualityCheckInterval = 20000; // 20秒检查一次质量
        this.flowControl.chunkSize = 20;
        this.flowControl.delayBetweenChunks = 20;
        break;
      
      case 'performance':
        this.qualityCheckInterval = 10000; // 10秒检查一次质量
        this.flowControl.chunkSize = 40;
        this.flowControl.delayBetweenChunks = 10;
        break;
    }

    // 更新监控间隔
    if (this.connectionQualityInterval) {
      clearInterval(this.connectionQualityInterval);
      this.startQualityMonitoring();
    }
  }
  
  /**
   * 调整电池检查间隔
   */
  private adjustBatteryCheckInterval(interval: number): void {
    this.batteryCheckIntervalMs = interval;
    
    // 如果已启动电池监控，重新启动以应用新间隔
    if (this.batteryCheckInterval) {
      this.stopBatteryMonitoring();
      this.startBatteryMonitoring();
    }
  }

  // 调试模式设置
  private debugMode: boolean = false;
  private debugLogEnabled: boolean = false;
  private debugEvents: {
    type: string;
    data: any;
    timestamp: number;
  }[] = [];
  private readonly MAX_DEBUG_EVENTS = 100;
  
  /**
   * 启用调试模式
   * @param enabled 是否启用
   * @param logToConsole 是否将调试信息记录到控制台
   */
  setDebugMode(enabled: boolean, logToConsole: boolean = false): void {
    this.debugMode = enabled;
    this.debugLogEnabled = logToConsole;
    
    if (enabled) {
      this.debugEvents = []; // 清空之前的事件
      logger.info(`蓝牙调试模式已${enabled ? '启用' : '禁用'}${logToConsole ? '，将记录到控制台' : ''}`);
    }
  }
  
  /**
   * 记录调试事件
   * @param type 事件类型
   * @param data 事件数据
   */
  private logDebugEvent(type: string, data: any): void {
    if (!this.debugMode) {
      return;
    }
    
    // 添加到事件队列
    this.debugEvents.push({
      type,
      data,
      timestamp: Date.now()
    });
    
    // 限制队列大小
    if (this.debugEvents.length > this.MAX_DEBUG_EVENTS) {
      this.debugEvents.shift();
    }
    
    // 输出到控制台
    if (this.debugLogEnabled) {
      console.log(`[蓝牙调试] ${type}:`, data);
    }
  }
  
  /**
   * 获取调试事件日志
   * @param limit 最大返回数量，0表示全部
   */
  getDebugEvents(limit: number = 0): {
    type: string;
    data: any;
    timestamp: number;
  }[] {
    if (limit <= 0 || limit >= this.debugEvents.length) {
      return [...this.debugEvents];
    }
    return this.debugEvents.slice(-limit);
  }
  
  /**
   * 清除调试事件日志
   */
  clearDebugEvents(): void {
    this.debugEvents = [];
    logger.debug('调试事件日志已清空');
  }
  
  /**
   * 导出诊断报告
   * @returns 包含详细诊断信息的对象
   */
  async exportDiagnosticReport(): Promise<{
    timestamp: number;
    device: any;
    adapter: any;
    connection: any;
    performance: any;
    errors: any[];
    events: any[];
    config: any;
  }> {
    // 收集设备信息
    const deviceInfo = await this.getDeviceInfo();
    const batteryLevel = await this.getBatteryLevel();
    const healthInfo = await this.diagnoseConnection();
    
    // 收集性能信息
    const performance = await this.getPerformanceReport();
    
    // 收集事件历史
    const events = this.debugMode ? this.getDebugEvents() : [];
    
    // 收集错误历史
    const errors = this.debugEvents
      .filter(event => event.type.includes('error') || event.type.includes('failed'))
      .map(event => ({
        type: event.type,
        data: event.data,
        timestamp: event.timestamp
      }));
    
    // 构建诊断报告
    const report = {
      timestamp: Date.now(),
      device: {
        id: this.connectedDeviceId,
        name: deviceInfo?.name,
        info: deviceInfo,
        batteryLevel,
        health: healthInfo
      },
      adapter: {
        initialized: this.isInitialized,
        discoveryActive: this.discoveryStarted,
        discoveredDevices: Array.from(this.discoveredDevices.values()).map(d => ({
          id: d.deviceId,
          name: d.name,
          rssi: d.RSSI
        }))
      },
      connection: {
        isConnected: this.isConnected(),
        uptime: this.getConnectionUptime(),
        reconnectAttempts: this.recoveryAttempts,
        lastReconnectTime: this.lastReconnectTime,
        serviceUUID: this.serviceUUID,
        characteristicUUID: this.characteristicUUID
      },
      performance,
      errors,
      events,
      config: {
        flowControl: this.getFlowControlParams(),
        powerSaving: {
          enabled: this.powerSavingEnabled,
          mode: this.powerSavingMode,
          inactivityTimeout: this.inactivityTimeout
        },
        queue: this.getQueueStatus(),
        autoReconnect: this.autoReconnect,
        maxReconnectAttempts: this.maxReconnectAttempts
      }
    };
    
    // 记录报告生成事件
    this.logDebugEvent('diagnostic_report_generated', {
      timestamp: report.timestamp,
      deviceId: this.connectedDeviceId
    });
    
    return report;
  }
  
  /**
   * 自动检测和解决常见问题
   * @returns 自动修复结果
   */
  async autoTroubleshoot(): Promise<{
    issues: string[];
    fixes: string[];
    success: boolean;
    remainingIssues: string[];
  }> {
    // 首先诊断连接
    const diagnosis = await this.diagnoseAndRepair();
    
    // 如果诊断修复失败，尝试更强力的修复方法
    if (!diagnosis.success) {
      logger.info('常规诊断修复失败，尝试更强力的修复方法...');
      
      const issues = [...diagnosis.issues];
      const fixes = [...diagnosis.repairs];
      let success = false;
      
      try {
        // 1. 强制重置连接
        if (this.connectedDeviceId) {
          await this.disconnect();
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        // 2. 重新初始化蓝牙适配器
        await this.destroy();
        await new Promise(resolve => setTimeout(resolve, 1000));
        const initResult = await this.init();
        
        if (initResult) {
          fixes.push('已重置蓝牙适配器');
          
          // 3. 如果有上次连接的设备，尝试重新连接
          if (this.lastConnectedDevice) {
            const connectResult = await this.connect(this.lastConnectedDevice, {
              retries: 2,
              timeout: 10000
            });
            
            if (connectResult) {
              fixes.push(`已重新连接到设备: ${this.lastConnectedDevice}`);
              success = true;
            } else {
              issues.push('强制重连失败');
            }
          } else {
            issues.push('没有可重连的设备');
          }
        } else {
          issues.push('重置蓝牙适配器失败');
        }
      } catch (error) {
        issues.push(`自动修复过程出错: ${error instanceof Error ? error.message : String(error)}`);
      }
      
      // 记录自动修复结果
      this.logDebugEvent('auto_troubleshoot_result', {
        success,
        issues,
        fixes
      });
      
      return {
        issues,
        fixes,
        success,
        remainingIssues: success ? [] : issues
      };
    }
    
    // 记录自动修复结果
    this.logDebugEvent('auto_troubleshoot_result', {
      success: diagnosis.success,
      issues: diagnosis.issues,
      fixes: diagnosis.repairs
    });
    
    return {
      issues: diagnosis.issues,
      fixes: diagnosis.repairs,
      success: diagnosis.success,
      remainingIssues: diagnosis.success ? [] : diagnosis.issues
    };
  }

  /**
   * 模拟蓝牙环境，用于在没有真实设备的情况下进行测试
   * @param mockOptions 模拟选项
   */
  enableMockEnvironment(mockOptions: {
    simulateConnection?: boolean;
    simulateDelay?: number;
    simulateErrors?: boolean;
    errorRate?: number;
  } = {}): void {
    // 在生产环境中，此代码会被移除
    if (process.env.NODE_ENV === 'production') {
      logger.warn('模拟环境不能在生产环境中启用');
      return;
    }
    
    // 默认选项
    const options = {
      simulateConnection: mockOptions.simulateConnection ?? true,
      simulateDelay: mockOptions.simulateDelay ?? 100,
      simulateErrors: mockOptions.simulateErrors ?? false,
      errorRate: mockOptions.errorRate ?? 0.1
    };
    
    logger.info('启用蓝牙模拟环境', options);
    
    // 记录调试事件
    this.logDebugEvent('mock_environment_enabled', options);
    
    // 模拟蓝牙设备
    const mockDevice: BluetoothDevice = {
      deviceId: 'mock_device_001',
      name: '模拟蓝牙打印机',
      RSSI: -60
    };
    
    // 覆盖方法以模拟蓝牙行为
    if (options.simulateConnection) {
      // 劫持实例方法
      const originalConnect = this.connect.bind(this);
      this.connect = async (deviceId: string) => {
        this.logDebugEvent('mock_connect', { deviceId });
        
        await new Promise(resolve => setTimeout(resolve, options.simulateDelay));
        
        // 模拟随机错误
        if (options.simulateErrors && Math.random() < options.errorRate) {
          this.logDebugEvent('mock_connect_error', { deviceId });
          return false;
        }
        
        this.connectedDeviceId = deviceId;
        this.logDebugEvent('mock_connect_success', { deviceId });
        
        return true;
      };
      
      // 添加模拟设备到已发现设备列表
      this.discoveredDevices.set(mockDevice.deviceId, mockDevice);
    }
    
    // 警告提示
    console.warn('蓝牙模拟环境已启用，这不会与真实设备通信');
  }
  
  /**
   * 获取连接活动日志
   * 用于分析连接行为和调试问题
   * @param maxEntries 最大条目数
   */
  getConnectionActivityLog(maxEntries: number = 50): any[] {
    return this.debugEvents
      .filter(event => 
        event.type.includes('connect') || 
        event.type.includes('disconnect') || 
        event.type.includes('write') ||
        event.type.includes('discover')
      )
      .slice(-maxEntries);
  }


  // 缓冲区池，用于减少内存分配
  private bufferPool: Map<number, ArrayBuffer[]> = new Map();
  
  // 设备信息缓存
  private deviceInfoCache: Map<string, {
    info: BluetoothDevice;
    timestamp: number;
  }> = new Map();

  // 连接状态缓存
  private connectionStateCache: {
    isConnected: boolean;
    lastStateChangeTime: number;
    consecutiveErrorCount: number;
    lastCommandTime: number;
    lastSuccessTime: number;
  } = {
    isConnected: false,
    lastStateChangeTime: 0,
    consecutiveErrorCount: 0,
    lastCommandTime: 0,
    lastSuccessTime: 0
  };

  // 统计聚合器
  private statsAggregator = {
    writeTimes: [] as number[],
    readTimes: [] as number[],
    discoverTimes: [] as number[],
    connectTimes: [] as number[],
    errorCounts: new Map<string, number>()
  };

  // 性能监控计时器
  private performanceMonitorInterval: NodeJS.Timeout | null = null;

  /**
   * 初始化性能优化系统
   */
  private initPerformanceOptimizations(): void {
    // 初始化缓冲区池
    this.initBufferPool();
    
    // 启动性能监控
    this.startPerformanceMonitoring();
    
    // 启动垃圾回收计时器
    this.startGarbageCollector();
    
    logger.debug('已初始化性能优化系统');
  }
  
  /**
   * 初始化缓冲区池
   */
  private initBufferPool(): void {
    // 为每种大小创建缓冲区池
    for (const size of this.performanceConfig.bufferSizes) {
      const buffers: ArrayBuffer[] = [];
      for (let i = 0; i < this.performanceConfig.bufferPoolSize; i++) {
        buffers.push(new ArrayBuffer(size));
      }
      this.bufferPool.set(size, buffers);
    }
    
    logger.debug(`缓冲区池已初始化，支持 ${this.performanceConfig.bufferSizes.join(', ')} 字节大小`);
  }
  
  /**
   * 从缓冲区池获取缓冲区
   * @param size 需要的缓冲区大小
   */
  private getBufferFromPool(size: number): ArrayBuffer {
    // 找到最接近且不小于请求大小的缓冲区类型
    const availableSizes = [...this.performanceConfig.bufferSizes].sort((a, b) => a - b);
    let bestFitSize = availableSizes.find(s => s >= size) || availableSizes[availableSizes.length - 1];
    
    // 如果找不到合适的大小，直接创建新缓冲区
    if (bestFitSize < size) {
      return new ArrayBuffer(size);
    }
    
    // 从池中获取
    const pool = this.bufferPool.get(bestFitSize);
    if (pool && pool.length > 0) {
      return pool.pop()!;
    }
    
    // 池为空，创建新缓冲区
    return new ArrayBuffer(bestFitSize);
  }
  
  /**
   * 将缓冲区归还池
   * @param buffer 要归还的缓冲区
   */
  private returnBufferToPool(buffer: ArrayBuffer): void {
    const size = buffer.byteLength;
    
    // 检查是否是支持的大小
    if (!this.performanceConfig.bufferSizes.includes(size)) {
      return; // 不支持的大小，丢弃
    }
    
    // 获取对应的池
    const pool = this.bufferPool.get(size);
    if (pool && pool.length < this.performanceConfig.bufferPoolSize * 2) {
      pool.push(buffer);
    }
  }
  
  /**
   * 启动性能监控
   */
  private startPerformanceMonitoring(): void {
    if (this.performanceMonitorInterval) {
      clearInterval(this.performanceMonitorInterval);
    }
    
    this.performanceMonitorInterval = setInterval(() => {
      this.analyzePerformanceMetrics();
    }, 60000); // 每分钟分析一次
  }
  
  /**
   * 分析性能指标并进行自动优化
   */
  private analyzePerformanceMetrics(): void {
    if (!this.isConnected()) {
      return;
    }
    
    try {
      // 计算平均写入时间
      const avgWriteTime = this.calculateAverage(this.statsAggregator.writeTimes);
      
      // 计算连接稳定性
      const stabilityScore = this.calculateStabilityScore();
      
      // 分析错误模式
      const mostCommonError = this.getMostCommonError();
      
      // 超过阈值时自动优化
      if (avgWriteTime > 100) { // 写入平均超过100ms
        // 减小批量大小，增加间隔
        this.performanceConfig.commandBatchSize = Math.max(1, this.performanceConfig.commandBatchSize - 1);
        this.flowControl.chunkDelay = Math.min(this.flowControl.maxChunkDelay, this.flowControl.chunkDelay + 5);
      } else if (avgWriteTime < 20 && stabilityScore > 0.9) { // 写入速度快且稳定
        // 增大批量大小，减少间隔
        this.performanceConfig.commandBatchSize = Math.min(20, this.performanceConfig.commandBatchSize + 1);
        this.flowControl.chunkDelay = Math.max(this.flowControl.minChunkDelay, this.flowControl.chunkDelay - 2);
      }
      
      // 根据错误模式调整
      if (mostCommonError) {
        if (mostCommonError.includes('timeout')) {
          // 超时问题，调整重试间隔
          this.currentRecoveryDelay = Math.min(5000, this.currentRecoveryDelay + 500);
        } else if (mostCommonError.includes('failed')) {
          // 写入失败，可能是数据问题
          this.flowControl.chunkSize = Math.max(this.flowControl.minChunkSize, this.flowControl.chunkSize - 5);
        }
      }
      
      // 清理收集的统计数据
      this.trimPerformanceStats();
      
      logger.debug('性能自动优化完成', {
        avgWriteTime,
        stabilityScore,
        commandBatchSize: this.performanceConfig.commandBatchSize,
        chunkDelay: this.flowControl.chunkDelay,
        chunkSize: this.flowControl.chunkSize
      });
    } catch (error) {
      logger.warn('性能指标分析失败', error);
    }
  }
  
  /**
   * 计算稳定性分数
   */
  private calculateStabilityScore(): number {
    if (this.statsAggregator.writeTimes.length === 0) {
      return 1.0;
    }
    
    // 计算成功率
    const successRate = this.transmissionStats.successfulBytes / Math.max(1, this.transmissionStats.totalBytes);
    
    // 计算错误率
    const errorRate = this.connectionStateCache.consecutiveErrorCount / Math.max(1, this.statsAggregator.writeTimes.length);
    
    // 计算写入时间的标准差（时间波动性）
    const avgWriteTime = this.calculateAverage(this.statsAggregator.writeTimes);
    const stdDevWriteTime = this.calculateStdDev(this.statsAggregator.writeTimes, avgWriteTime);
    const normalizedStdDev = stdDevWriteTime / Math.max(1, avgWriteTime);
    
    // 综合评分 (0-1之间，越高越稳定)
    return 0.4 * successRate + 0.3 * (1 - errorRate) + 0.3 * (1 - Math.min(1, normalizedStdDev));
  }
  
  /**
   * 获取最常见的错误类型
   */
  private getMostCommonError(): string | null {
    const errorCounts: Record<string, number> = {};
    let maxCount = 0;
    let mostCommonError: string | null = null;
    
    for (const [error, count] of this.statsAggregator.errorCounts.entries()) {
      errorCounts[error] = (errorCounts[error] || 0) + count;
      if (count > maxCount) {
        maxCount = count;
        mostCommonError = error;
      }
    }
    
    return mostCommonError;
  }
  
  /**
   * 裁剪性能统计数据
   */
  private trimPerformanceStats(): void {
    // 保留最新的N个数据点
    const keepCount = 100;
    
    if (this.statsAggregator.writeTimes.length > keepCount) {
      this.statsAggregator.writeTimes = this.statsAggregator.writeTimes.slice(-keepCount);
    }
    
    if (this.statsAggregator.readTimes.length > keepCount) {
      this.statsAggregator.readTimes = this.statsAggregator.readTimes.slice(-keepCount);
    }
    
    if (this.statsAggregator.connectTimes.length > keepCount) {
      this.statsAggregator.connectTimes = this.statsAggregator.connectTimes.slice(-keepCount);
    }
    
    if (this.statsAggregator.discoverTimes.length > keepCount) {
      this.statsAggregator.discoverTimes = this.statsAggregator.discoverTimes.slice(-keepCount);
    }
    
    // 定期清理错误计数
    if (this.statsAggregator.errorCounts.size > 20) {
      // 只保留出现频率较高的错误
      const entries = [...this.statsAggregator.errorCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);
      
      this.statsAggregator.errorCounts = new Map(entries);
    }
  }
  
  /**
   * 计算数组平均值
   */
  private calculateAverage(arr: number[]): number {
    if (arr.length === 0) return 0;
    return arr.reduce((sum, val) => sum + val, 0) / arr.length;
  }
  
  /**
   * 计算标准差
   */
  private calculateStdDev(arr: number[], avg?: number): number {
    if (arr.length === 0) return 0;
    
    const mean = avg !== undefined ? avg : this.calculateAverage(arr);
    const squareDiffs = arr.map(value => {
      const diff = value - mean;
      return diff * diff;
    });
    
    return Math.sqrt(this.calculateAverage(squareDiffs));
  }
  
  /**
   * 启动垃圾回收计时器
   */
  private startGarbageCollector(): void {
    setInterval(() => {
      this.performGarbageCollection();
    }, this.performanceConfig.gcInterval);
  }
  
  /**
   * 执行垃圾回收
   */
  private performGarbageCollection(): void {
    try {
      // 清理设备信息缓存
      const now = Date.now();
      for (const [deviceId, entry] of this.deviceInfoCache.entries()) {
        if (now - entry.timestamp > this.performanceConfig.deviceCacheLifetime) {
          this.deviceInfoCache.delete(deviceId);
        }
      }
      
      // 清理调试事件
      if (this.debugEvents.length > this.performanceConfig.eventHistoryTrimSize) {
        this.debugEvents = this.debugEvents.slice(-this.performanceConfig.eventHistoryTrimSize / 2);
      }
      
      // 优化缓冲区池
      for (const [size, pool] of this.bufferPool.entries()) {
        if (pool.length > this.performanceConfig.bufferPoolSize * 1.5) {
          this.bufferPool.set(size, pool.slice(0, this.performanceConfig.bufferPoolSize));
        }
      }
      
      // 如果长时间无活动，释放更多资源
      if (Date.now() - this.lastActivityTime > this.performanceConfig.inactiveResourceTimeout) {
        // 停止不必要的监控
        this.stopQualityMonitoring();
        
        // 清空缓冲区池
        for (const size of this.performanceConfig.bufferSizes) {
          this.bufferPool.set(size, []);
        }
        
        logger.debug('长时间无活动，已释放资源');
      }
    } catch (error) {
      logger.warn('执行垃圾回收失败', error);
    }
  }
  
  /**
   * 获取缓存的设备信息
   */
  private getCachedDeviceInfo(deviceId: string): BluetoothDevice | null {
    const cached = this.deviceInfoCache.get(deviceId);
    if (cached && Date.now() - cached.timestamp < this.performanceConfig.deviceCacheLifetime) {
      return cached.info;
    }
    return null;
  }
  
  /**
   * 更新设备信息缓存
   */
  private updateDeviceInfoCache(deviceId: string, info: BluetoothDevice): void {
    this.deviceInfoCache.set(deviceId, {
      info,
      timestamp: Date.now()
    });
  }

  /**
   * 记录操作耗时
   */
  private recordOperationTime(operation: 'write' | 'read' | 'connect' | 'discover', timeMs: number): void {
    switch (operation) {
      case 'write':
        this.statsAggregator.writeTimes.push(timeMs);
        break;
      case 'read':
        this.statsAggregator.readTimes.push(timeMs);
        break;
      case 'connect':
        this.statsAggregator.connectTimes.push(timeMs);
        break;
      case 'discover':
        this.statsAggregator.discoverTimes.push(timeMs);
        break;
    }
  }
  
  /**
   * 记录错误
   */
  private recordError(errorType: string): void {
    const count = this.statsAggregator.errorCounts.get(errorType) || 0;
    this.statsAggregator.errorCounts.set(errorType, count + 1);
    
    // 更新连续错误计数
    this.connectionStateCache.consecutiveErrorCount++;
  }
  
  /**
   * 记录成功操作
   */
  private recordSuccess(): void {
    // 重置连续错误计数
    this.connectionStateCache.consecutiveErrorCount = 0;
    this.connectionStateCache.lastSuccessTime = Date.now();
  }

  /**
   * 设置性能配置参数
   * @param config 性能配置
   */
  setPerformanceConfig(config: Partial<typeof this.performanceConfig>): void {
    this.performanceConfig = { ...this.performanceConfig, ...config };
    
    // 如果修改了缓冲区大小，重新初始化缓冲区池
    if (config.bufferSizes || config.bufferPoolSize) {
      this.initBufferPool();
    }
    
    logger.debug('已更新性能配置', this.performanceConfig);
  }

  /**
   * 获取当前性能配置
   */
  getPerformanceConfig(): typeof this.performanceConfig {
    return { ...this.performanceConfig };
  }

  /**
   * 获取性能统计信息
   */
  getPerformanceStats(): {
    operations: {
      write: { count: number; avgTime: number; stdDev: number };
      read: { count: number; avgTime: number; stdDev: number };
      connect: { count: number; avgTime: number; stdDev: number };
      discover: { count: number; avgTime: number; stdDev: number };
    };
    memoryUsage: {
      bufferPoolSize: number;
      deviceCacheSize: number;
      eventHistorySize: number;
    };
    stability: {
      score: number;
      consecutiveErrors: number;
      errorDistribution: Record<string, number>;
    };
  } {
    // 计算各操作的统计信息
    const writeAvg = this.calculateAverage(this.statsAggregator.writeTimes);
    const readAvg = this.calculateAverage(this.statsAggregator.readTimes);
    const connectAvg = this.calculateAverage(this.statsAggregator.connectTimes);
    const discoverAvg = this.calculateAverage(this.statsAggregator.discoverTimes);
    
    return {
      operations: {
        write: {
          count: this.statsAggregator.writeTimes.length,
          avgTime: writeAvg,
          stdDev: this.calculateStdDev(this.statsAggregator.writeTimes, writeAvg)
        },
        read: {
          count: this.statsAggregator.readTimes.length,
          avgTime: readAvg,
          stdDev: this.calculateStdDev(this.statsAggregator.readTimes, readAvg)
        },
        connect: {
          count: this.statsAggregator.connectTimes.length,
          avgTime: connectAvg,
          stdDev: this.calculateStdDev(this.statsAggregator.connectTimes, connectAvg)
        },
        discover: {
          count: this.statsAggregator.discoverTimes.length,
          avgTime: discoverAvg,
          stdDev: this.calculateStdDev(this.statsAggregator.discoverTimes, discoverAvg)
        }
      },
      memoryUsage: {
        bufferPoolSize: [...this.bufferPool.values()].reduce((total, pool) => total + pool.length, 0),
        deviceCacheSize: this.deviceInfoCache.size,
        eventHistorySize: this.debugEvents.length
      },
      stability: {
        score: this.calculateStabilityScore(),
        consecutiveErrors: this.connectionStateCache.consecutiveErrorCount,
        errorDistribution: Object.fromEntries(this.statsAggregator.errorCounts)
      }
    };
  }

  // 添加高级缓存相关方法
  /**
   * 预热缓存，提前加载常用数据到缓存
   * 在应用启动时或需要准备大量操作前调用，可提高后续操作速度
   */
  async preloadCache(): Promise<void> {
    try {
      // 预加载最近使用的设备信息
      const recentDevices = Array.from(this.connectionHistory.entries())
        .sort((a, b) => b[1].lastConnected - a[1].lastConnected)
        .slice(0, 5);

      for (const [deviceId] of recentDevices) {
        const deviceInfo = await this.getDeviceInfo(deviceId);
        if (deviceInfo) {
          this.updateDeviceInfoCache(deviceId, deviceInfo);
        }
      }

      // 初始化常用大小的缓冲区池
      this.initBufferPool();

      logger.info('缓存预加载完成');
    } catch (error) {
      logger.error('缓存预加载失败:', error);
    }
  }
  
  /**
   * 清理缓存，释放内存
   * @param type 指定要清理的缓存类型，默认全部
   */
  clearCache(type?: 'device' | 'buffer' | 'stats' | 'all'): void {
    if (!type || type === 'all' || type === 'device') {
      this.deviceInfoCache.clear();
      logger.debug('设备信息缓存已清空');
    }
    
    if (!type || type === 'all' || type === 'buffer') {
      for (const size of this.performanceConfig.bufferSizes) {
        this.bufferPool.set(size, []);
      }
      logger.debug('缓冲区池已清空');
    }
    
    if (!type || type === 'all' || type === 'stats') {
      this.statsAggregator.writeTimes = [];
      this.statsAggregator.readTimes = [];
      this.statsAggregator.connectTimes = [];
      this.statsAggregator.discoverTimes = [];
      this.statsAggregator.errorCounts.clear();
      logger.debug('性能统计缓存已清空');
    }
    
    if (type === 'all') {
      // 触发垃圾回收
      this.performGarbageCollection();
    }
  }
  
  /**
   * 优化缓存大小，根据当前情况调整缓存配置
   */
  optimizeCache(): void {
    logger.debug('正在优化缓存...');
    
    // 分析缓存使用情况
    const deviceCacheSize = this.deviceInfoCache.size;
    const bufferPoolSize = [...this.bufferPool.values()].reduce((total, pool) => total + pool.length, 0);
    const debugEventSize = this.debugEvents.length;
    
    // 根据使用情况调整缓存配置
    if (deviceCacheSize > 100) {
      // 设备缓存过大，减少生命周期
      this.performanceConfig.deviceCacheLifetime = Math.max(60000, this.performanceConfig.deviceCacheLifetime / 2);
    } else if (deviceCacheSize < 10) {
      // 设备缓存使用率低，适当增加生命周期
      this.performanceConfig.deviceCacheLifetime = Math.min(600000, this.performanceConfig.deviceCacheLifetime * 1.5);
    }
    
    // 调整缓冲区池大小
    if (bufferPoolSize > this.performanceConfig.bufferPoolSize * 3) {
      // 缓冲区使用太多，减少
      for (const [size, pool] of this.bufferPool.entries()) {
        this.bufferPool.set(size, pool.slice(0, this.performanceConfig.bufferPoolSize / 2));
      }
    } else if (bufferPoolSize < this.performanceConfig.bufferPoolSize / 2) {
      // 缓冲区使用率低，增加一些常用大小的缓冲区
      const mostUsedSizes = this.findMostUsedBufferSizes();
      for (const size of mostUsedSizes) {
        const pool = this.bufferPool.get(size) || [];
        const addCount = this.performanceConfig.bufferPoolSize - pool.length;
        for (let i = 0; i < addCount; i++) {
          pool.push(new ArrayBuffer(size));
        }
        this.bufferPool.set(size, pool);
      }
    }
    
    logger.debug('缓存优化完成');
  }
  
  /**
   * 找出最常用的缓冲区大小
   */
  private findMostUsedBufferSizes(): number[] {
    // 这里可以基于历史使用情况进行分析
    // 简化实现，直接返回最小的两种大小
    return this.performanceConfig.bufferSizes.slice(0, 2);
  }

  /**
   * 获取当前蓝牙内存使用情况
   */
  getMemoryUsage(): {
    bufferPools: { size: number; count: number; memoryUsage: number }[];
    totalBufferMemory: number;
    cacheMemory: number;
    totalMemoryUsage: number;
  } {
    // 计算缓冲区池内存使用
    const bufferPools: { size: number; count: number; memoryUsage: number }[] = [];
    let totalBufferMemory = 0;
    
    for (const [size, pool] of this.bufferPool.entries()) {
      const poolMemory = size * pool.length;
      totalBufferMemory += poolMemory;
      
      bufferPools.push({
        size,
        count: pool.length,
        memoryUsage: poolMemory
      });
    }
    
    // 估算缓存内存使用
    // 每个设备信息条目约占1KB内存
    const deviceCacheMemory = this.deviceInfoCache.size * 1024;
    
    // 每个调试事件约占0.5KB内存
    const debugEventsMemory = this.debugEvents.length * 512;
    
    // 统计数据约占10KB
    const statsMemory = 10240;
    
    const cacheMemory = deviceCacheMemory + debugEventsMemory + statsMemory;
    
    return {
      bufferPools,
      totalBufferMemory,
      cacheMemory,
      totalMemoryUsage: totalBufferMemory + cacheMemory
    };
  }

  private updateTransmissionStats(): void {
    const now = Date.now();
    this.transmissionStats.endTime = now;
    
    // 计算成功率
    if (this.transmissionStats.totalCommands > 0) {
      this.transmissionStats.successRate = this.transmissionStats.successfulCommands / this.transmissionStats.totalCommands;
    }
    
    // 计算传输时长
    if (this.transmissionStats.startTime > 0) {
      this.transmissionStats.duration = now - this.transmissionStats.startTime;
    }
    
    // 计算传输速度 (bytes/second)
    if (this.transmissionStats.duration && this.transmissionStats.duration > 0) {
      this.transmissionStats.transmissionSpeed = (this.transmissionStats.successfulBytes * 1000) / this.transmissionStats.duration;
      this.transmissionStats.lastTransmissionSpeed = this.transmissionStats.transmissionSpeed;
    }
  }

  // 合并事件历史记录
  private mergeEventHistory(history: any[], maxEntries: number = 100): any[] {
    return history
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(-maxEntries);
  }
}