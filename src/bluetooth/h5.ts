/**
 * H5 平台蓝牙适配器实现
 * 使用 Web Bluetooth API 提供蓝牙功能支持
 */

import { BluetoothAdapter, BluetoothDevice } from './adapter';
import { logger } from '../utils/logger';

// 类型别名，避免与全局类型冲突
type WebBluetoothNavigator = Navigator & {
  bluetooth?: {
    requestDevice(options?: any): Promise<any>;
    getAvailability(): Promise<boolean>;
  };
};

// Web Bluetooth API 的设备类型
interface WebBluetoothDevice {
  id: string;
  name: string;
  gatt: BluetoothRemoteGATTServer;
}

// Bluetooth 类型定义（按需使用）
// type BluetoothServiceUUID = string | number;
// type BluetoothCharacteristicUUID = string | number;

export default class H5BluetoothAdapter implements BluetoothAdapter {
  private bluetooth: any = null;
  private device: WebBluetoothDevice | null = null;
  private gattServer: BluetoothRemoteGATTServer | null = null;
  private services: Map<string, BluetoothRemoteGATTService> = new Map();
  private characteristics: Map<string, Map<string, BluetoothRemoteGATTCharacteristic>> = new Map();
  private eventListeners: Map<string, EventListener> = new Map();

  constructor() {
    this.bluetooth = (navigator as WebBluetoothNavigator).bluetooth;
  }

  /**
   * 初始化蓝牙适配器
   * @returns {Promise<boolean>} 初始化是否成功
   */
  async initialize(): Promise<boolean> {
    if (!this.bluetooth) {
      throw new Error('Web Bluetooth API 不可用');
    }
    return Promise.resolve(true);
  }

  /**
   * 监听蓝牙状态变化
   * @param callback 回调函数
   */
  onBluetoothAdapterStateChange(callback: (state: { available: boolean, discovering: boolean }) => void): void {
    const listener = () => {
      const state = {
        available: !!this.bluetooth,
        discovering: false // H5 平台不支持主动发现
      };
      callback(state);
    };
    this.eventListeners.set('adapterStateChange', listener);
    window.addEventListener('load', listener as EventListener);
  }

  /**
   * 监听设备发现
   * @param callback 回调函数
   */
  onBluetoothDeviceFound(callback: (device: BluetoothDevice) => void): void {
    const listener = (event: Event) => {
      const device = event.target as unknown as WebBluetoothDevice;
      callback({
        deviceId: device.id,
        name: device.name || '未知设备',
        deviceName: device.name
      });
    };
    this.eventListeners.set('deviceFound', listener);
    window.addEventListener('devicefound', listener as EventListener);
  }

  /**
   * 监听连接状态变化
   * @param callback 回调函数
   */
  onBluetoothDeviceConnectionChange(callback: (deviceId: string, connected: boolean) => void): void {
    const listener = (event: Event) => {
      const device = event.target as unknown as WebBluetoothDevice;
      callback(device.id, device.gatt?.connected || false);
    };
    this.eventListeners.set('connectionChange', listener);
    window.addEventListener('connectionchange', listener as EventListener);
  }

  /**
   * 获取蓝牙适配器状态
   * @returns {Promise<any>} 适配器状态
   */
  async getAdapterState(): Promise<any> {
    return {
      available: !!this.bluetooth,
      discovering: false // H5 平台不支持主动发现
    };
  }

  /**
   * 开始搜索蓝牙设备
   * @returns {Promise<boolean>} 是否成功开始搜索
   */
  async startDiscovery(): Promise<boolean> {
    try {
      const options = {
        filters: [{ services: ['0000180f-0000-1000-8000-00805f9b34fb'] }], // 心率服务
        optionalServices: ['0000180f-0000-1000-8000-00805f9b34fb']
      };
      const device = await this.bluetooth.requestDevice(options);
      this.device = device;
      return true;
    } catch (error) {
      logger.error('开始搜索设备失败:', error);
      return false;
    }
  }

  /**
   * 停止搜索蓝牙设备
   * @returns {Promise<boolean>} 是否成功停止搜索
   */
  async stopDiscovery(): Promise<boolean> {
    // H5 平台不支持主动发现，无需实现
    return true;
  }

  /**
   * 获取已发现的蓝牙设备
   * @returns {Promise<BluetoothDevice[]>} 已发现的设备列表
   */
  async getDiscoveredDevices(): Promise<BluetoothDevice[]> {
    if (!this.device) {
      return [];
    }
    return [{
      deviceId: this.device.id,
      name: this.device.name || '未知设备',
      deviceName: this.device.name
    }];
  }

  /**
   * 连接蓝牙设备
   * @param deviceId 设备ID
   * @returns {Promise<boolean>} 是否成功连接
   */
  async connect(deviceId: string): Promise<boolean> {
    try {
      if (this.device?.id !== deviceId) {
        throw new Error('设备ID不匹配');
      }
      
      this.gattServer = await this.device.gatt.connect();
      return true;
    } catch (error) {
      logger.error('连接设备失败:', error);
      return false;
    }
  }

  /**
   * 断开连接
   * @returns {Promise<boolean>} 是否成功断开连接
   */
  async disconnect(deviceId?: string): Promise<boolean> {
    try {
      if (deviceId && this.device?.id !== deviceId) {
        throw new Error('设备ID不匹配');
      }
      
      if (this.gattServer) {
        this.gattServer.disconnect();
        this.gattServer = null;
      }
      return true;
    } catch (error) {
      logger.error('断开连接失败:', error);
      return false;
    }
  }

  /**
   * 获取服务
   * @returns {Promise<any>} 服务列表
   */
  async getServices(deviceId: string): Promise<any> {
    if (!this.gattServer) {
      throw new Error('未连接设备');
    }
    
    if (this.device?.id !== deviceId) {
      throw new Error('设备ID不匹配');
    }
    const services = await this.gattServer.getPrimaryServices();
    services.forEach(service => {
      this.services.set(service.uuid, service);
    });
    return services;
  }

  /**
   * 获取特征值
   * @param serviceId 服务ID
   * @returns {Promise<any>} 特征值列表
   */
  async getCharacteristics(deviceId: string, serviceId: string): Promise<any> {
    if (this.device?.id !== deviceId) {
      throw new Error('设备ID不匹配');
    }
    
    const service = this.services.get(serviceId);
    if (!service) {
      throw new Error('服务不存在');
    }
    const characteristics = await service.getCharacteristics();
    const serviceMap = this.characteristics.get(serviceId) || new Map();
    characteristics.forEach(characteristic => {
      serviceMap.set(characteristic.uuid, characteristic);
    });
    this.characteristics.set(serviceId, serviceMap);
    return characteristics;
  }

  /**
   * 写入数据
   * @param serviceId 服务ID
   * @param characteristicId 特征值ID
   * @param data 要写入的数据
   * @returns {Promise<boolean>} 是否成功写入
   */
  async write(deviceId: string, serviceId: string, characteristicId: string, data: ArrayBuffer): Promise<boolean> {
    try {
      if (this.device?.id !== deviceId) {
        throw new Error('设备ID不匹配');
      }
      
      const service = this.services.get(serviceId);
      if (!service) {
        throw new Error('服务不存在');
      }

      const characteristic = this.characteristics.get(serviceId)?.get(characteristicId);
      if (!characteristic) {
        throw new Error('特征值不存在');
      }

      await characteristic.writeValue(data);
      return true;
    } catch (error) {
      logger.error('写入数据失败:', error);
      return false;
    }
  }

  /**
   * 读取数据
   * @param serviceId 服务ID
   * @param characteristicId 特征值ID
   * @returns {Promise<ArrayBuffer>} 读取的数据
   */
  async read(deviceId: string, serviceId: string, characteristicId: string): Promise<ArrayBuffer> {
    try {
      if (this.device?.id !== deviceId) {
        throw new Error('设备ID不匹配');
      }
      
      const service = this.services.get(serviceId);
      if (!service) {
        throw new Error('服务不存在');
      }

      const characteristic = this.characteristics.get(serviceId)?.get(characteristicId);
      if (!characteristic) {
        throw new Error('特征值不存在');
      }

      const data = await characteristic.readValue();
      // 确保返回正确的ArrayBuffer类型
      if (data.buffer instanceof ArrayBuffer) {
        return data.buffer;
      } else {
        // 处理DataView或其他类型
        const uint8Array = new Uint8Array(data.byteLength);
        for (let i = 0; i < data.byteLength; i++) {
          uint8Array[i] = data.getUint8(i);
        }
        return uint8Array.buffer;
      }
    } catch (error) {
      logger.error('读取数据失败:', error);
      throw error;
    }
  }

  /**
   * 销毁适配器
   * @returns {Promise<boolean>} 是否成功销毁
   */
  async destroy(): Promise<boolean> {
    // 清理事件监听器
    this.eventListeners.forEach((listener, key) => {
      window.removeEventListener(key, listener as EventListener);
    });
    this.eventListeners.clear();

    // 断开连接
    await this.disconnect();

    // 清理资源
    this.device = null;
    this.gattServer = null;
    this.services.clear();
    this.characteristics.clear();

    return true;
  }
}
