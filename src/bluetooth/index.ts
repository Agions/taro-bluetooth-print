/**
 * @file Bluetooth Manager
 * @description 蓝牙管理模块，提供蓝牙设备发现、连接和通信等功能
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
 * @version 1.0.8
 * @author agions
 * @copyright 2025
 */

import { Platform } from '../utils/platform';
import { BluetoothAdapter, BluetoothDevice } from './adapter';
import { logger } from '../utils/logger';
// 后续会用于事件通知
// import { eventManager, EVENTS } from '../utils/events';
// 后续会用于错误处理
// import { PrinterError, ErrorCode } from '../types';

/**
 * 蓝牙管理器类
 * 负责管理蓝牙设备的连接和数据传输
 */
export class BluetoothManager {
  private adapter: BluetoothAdapter | null = null;
  private initialized = false;

  /**
   * 初始化蓝牙管理器
   * @returns {Promise<boolean>} 初始化是否成功
   */
  async init(): Promise<boolean> {
    if (this.initialized) {
      return true;
    }

    try {
      const platform = Platform.getPlatform();
      const Adapter = platform === 'h5' ? require('./h5').default : require('./adapter').default;
      this.adapter = new Adapter();
      
      if (this.adapter && typeof this.adapter.initialize === 'function') {
        await this.adapter.initialize();
        this.initialized = true;
        return true;
      } else {
        logger.error('初始化失败: 适配器未提供初始化方法');
        return false;
      }
    } catch (error) {
      logger.error('初始化蓝牙管理器失败:', error);
      return false;
    }
  }

  /**
   * 销毁蓝牙管理器
   * @returns {Promise<boolean>} 是否成功销毁
   */
  async destroy(): Promise<boolean> {
    try {
      if (this.adapter) {
        await this.adapter.destroy();
        this.adapter = null;
        this.initialized = false;
        return true;
      }
      return true;
    } catch (error) {
      logger.error('销毁蓝牙管理器失败:', error);
      return false;
    }
  }

  /**
   * 监听蓝牙适配器状态变化
   * @param callback 回调函数
   */
  onBluetoothAdapterStateChange(callback: (state: { available: boolean; discovering: boolean }) => void): void {
    if (this.adapter) {
      this.adapter.onBluetoothAdapterStateChange(callback);
    } else {
      logger.warn('蓝牙适配器未初始化，无法监听状态变化');
    }
  }

  /**
   * 监听设备发现
   * @param callback 回调函数
   */
  onBluetoothDeviceFound(callback: (device: BluetoothDevice) => void): void {
    if (this.adapter) {
      this.adapter.onBluetoothDeviceFound(callback);
    } else {
      logger.warn('蓝牙适配器未初始化，无法监听设备发现');
    }
  }

  /**
   * 监听连接状态变化
   * @param callback 回调函数
   */
  onBluetoothDeviceConnectionChange(callback: (deviceId: string, connected: boolean) => void): void {
    if (this.adapter) {
      this.adapter.onBluetoothDeviceConnectionChange(callback);
    } else {
      logger.warn('蓝牙适配器未初始化，无法监听连接状态变化');
    }
  }

  /**
   * 获取蓝牙适配器状态
   * @returns {Promise<any>} 适配器状态
   */
  async getAdapterState(): Promise<any> {
    if (!this.adapter) {
      throw new Error('蓝牙管理器未初始化');
    }
    // 兼容不同适配器实现
    if (typeof this.adapter.getAdapterState === 'function') {
      return this.adapter.getAdapterState();
    }
    // 返回默认状态
    return { available: false, discovering: false };
  }

  /**
   * 开始搜索蓝牙设备
   * @returns {Promise<boolean>} 是否成功开始搜索
   */
  async startDiscovery(): Promise<boolean> {
    if (!this.adapter) {
      throw new Error('蓝牙管理器未初始化');
    }
    return this.adapter.startDiscovery();
  }

  /**
   * 停止搜索蓝牙设备
   * @returns {Promise<boolean>} 是否成功停止搜索
   */
  async stopDiscovery(): Promise<boolean> {
    if (!this.adapter) {
      throw new Error('蓝牙管理器未初始化');
    }
    return this.adapter.stopDiscovery();
  }

  /**
   * 获取已发现的蓝牙设备
   * @returns {Promise<BluetoothDevice[]>} 已发现的设备列表
   */
  async getDiscoveredDevices(): Promise<BluetoothDevice[]> {
    if (!this.adapter) {
      throw new Error('蓝牙管理器未初始化');
    }
    return this.adapter.getDiscoveredDevices();
  }

  /**
   * 连接蓝牙设备
   * @param deviceId 设备ID
   * @returns {Promise<boolean>} 是否成功连接
   */
  async connect(deviceId: string): Promise<boolean> {
    if (!this.adapter) {
      throw new Error('蓝牙管理器未初始化');
    }
    return this.adapter.connect(deviceId);
  }

  /**
   * 断开连接
   * @param deviceId 设备ID
   * @returns {Promise<boolean>} 是否成功断开连接
   */
  async disconnect(deviceId?: string): Promise<boolean> {
    if (!this.adapter) {
      throw new Error('蓝牙管理器未初始化');
    }
    return this.adapter.disconnect(deviceId || '');
  }

  /**
   * 获取服务
   * @param deviceId 设备ID
   * @returns {Promise<any>} 服务列表
   */
  async getServices(deviceId: string): Promise<any> {
    if (!this.adapter) {
      throw new Error('蓝牙管理器未初始化');
    }
    // 兼容不同适配器实现
    if (typeof this.adapter.getServices === 'function') {
      return this.adapter.getServices(deviceId);
    }
    // 返回空数组表示无服务
    return [];
  }

  /**
   * 获取特征值
   * @param deviceId 设备ID
   * @param serviceId 服务ID
   * @returns {Promise<any>} 特征值列表
   */
  async getCharacteristics(deviceId: string, serviceId: string): Promise<any> {
    if (!this.adapter) {
      throw new Error('蓝牙管理器未初始化');
    }
    // 兼容不同适配器实现
    if (typeof this.adapter.getCharacteristics === 'function') {
      return this.adapter.getCharacteristics(deviceId, serviceId);
    }
    // 返回空数组表示无特征值
    return [];
  }

  /**
   * 写入数据
   * @param deviceId 设备ID
   * @param serviceId 服务ID
   * @param characteristicId 特征值ID
   * @param data 要写入的数据
   * @returns {Promise<boolean>} 是否成功写入
   */
  async write(deviceId: string, serviceId: string, characteristicId: string, data: ArrayBuffer): Promise<boolean> {
    if (!this.adapter) {
      throw new Error('蓝牙管理器未初始化');
    }
    return this.adapter.write(deviceId, serviceId, characteristicId, data);
  }

  /**
   * 读取数据
   * @param deviceId 设备ID
   * @param serviceId 服务ID
   * @param characteristicId 特征值ID
   * @returns {Promise<ArrayBuffer>} 读取的数据
   */
  async read(deviceId: string, serviceId: string, characteristicId: string): Promise<ArrayBuffer> {
    if (!this.adapter) {
      throw new Error('蓝牙管理器未初始化');
    }
    // 兼容不同适配器实现
    if (typeof this.adapter.read === 'function') {
      return this.adapter.read(deviceId, serviceId, characteristicId);
    }
    // 返回空ArrayBuffer
    return new ArrayBuffer(0);
  }

  /**
   * 写入数据（打印机专用）
   * @param data 要写入的数据
   * @returns {Promise<boolean>} 是否成功写入
   */
  async writeData(data: ArrayBuffer): Promise<boolean> {
    try {
      if (!this.adapter) {
        throw new Error('蓝牙管理器未初始化');
      }

      const devices = await this.getDiscoveredDevices();
      if (devices.length === 0) {
        throw new Error('没有可用的蓝牙设备');
      }

      // 我们选择第一个设备，或者通过其他方式确定要连接的设备
      const device = devices[0];

      if (!device) {
        throw new Error('未找到设备');
      }

      // 检查设备连接状态
      // 注意：这里我们假设已经连接，实际中可能需要先尝试连接
      const isConnected = await this.connect(device.deviceId).catch(() => false);
      if (!isConnected) {
        throw new Error('无法连接设备');
      }

      // 获取服务
      const services = await this.getServices(device.deviceId);
      if (!services || services.length === 0) {
        throw new Error('没有可用的蓝牙服务');
      }

      // 选择适用于打印机的服务
      let writableService: any = services[0];
      for (const service of services) {
        if (!service || typeof service.uuid !== 'string') continue;
        const characteristics = await this.getCharacteristics(device.deviceId, service.uuid);
        if (characteristics && characteristics.length > 0 &&
            characteristics.some((c: any) => c && c.properties && c.properties.write)) {
          writableService = service;
          break;
        }
      }

      // 获取特征值
      const characteristics = await this.getCharacteristics(device.deviceId, writableService.uuid);
      if (!characteristics || characteristics.length === 0) {
        throw new Error('没有可用的特征值');
      }

      // 找到可写入的特征值
      const writableCharacteristic = characteristics.find((c: any) => 
        c && c.properties && c.properties.write);
      if (!writableCharacteristic || !writableCharacteristic.uuid) {
        throw new Error('没有可写入的特征值');
      }

      // 写入数据
      return await this.write(device.deviceId, writableService.uuid, writableCharacteristic.uuid, data);
    } catch (error) {
      console.error('写入数据失败:', error);
      return false;
    }
  }
}
