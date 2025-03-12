import { getAdapter, BluetoothDevice, BluetoothAdapter } from './adapter';
import { logger } from '../utils/logger';
import Taro from '@tarojs/taro';

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

  constructor() {
    this.adapter = getAdapter();
  }

  /**
   * 初始化蓝牙模块
   */
  async init(): Promise<boolean> {
    try {
      const result = await this.adapter.init();
      this.isInitialized = result;
      return result;
    } catch (error) {
      logger.error('初始化蓝牙模块失败', error);
      return false;
    }
  }

  /**
   * 开始搜索蓝牙设备
   */
  async startDiscovery(): Promise<boolean> {
    if (!this.isInitialized) {
      await this.init();
    }
    
    try {
      const result = await this.adapter.startDiscovery();
      this.discoveryStarted = result;
      
      // 监听蓝牙设备发现事件
      Taro.onBluetoothDeviceFound(res => {
        const devices = res.devices || [];
        devices.forEach(device => {
          this.discoveredDevices.set(device.deviceId, device);
        });
      });
      
      return result;
    } catch (error) {
      logger.error('开始搜索蓝牙设备失败', error);
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
      const result = await this.adapter.stopDiscovery();
      this.discoveryStarted = !result;
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
   * @param deviceId 蓝牙设备ID
   */
  async connect(deviceId: string): Promise<boolean> {
    if (!this.isInitialized) {
      await this.init();
    }
    
    // 如果已连接，先断开
    if (this.connectedDeviceId && this.connectedDeviceId !== deviceId) {
      await this.disconnect();
    }
    
    try {
      const result = await this.adapter.connect(deviceId);
      if (result) {
        this.connectedDeviceId = deviceId;
      }
      return result;
    } catch (error) {
      logger.error('连接蓝牙设备失败', error);
      return false;
    }
  }

  /**
   * 断开蓝牙连接
   */
  async disconnect(): Promise<boolean> {
    if (!this.connectedDeviceId) {
      return true;
    }
    
    try {
      const result = await this.adapter.disconnect(this.connectedDeviceId);
      if (result) {
        this.connectedDeviceId = null;
      }
      return result;
    } catch (error) {
      logger.error('断开蓝牙连接失败', error);
      return false;
    }
  }

  /**
   * 写入数据
   * @param data 要写入的数据
   */
  async writeData(data: ArrayBuffer): Promise<boolean> {
    if (!this.connectedDeviceId) {
      throw new Error('未连接到蓝牙设备');
    }
    
    try {
      return await this.adapter.write(
        this.connectedDeviceId,
        this.serviceUUID,
        this.characteristicUUID,
        data
      );
    } catch (error) {
      logger.error('写入数据失败', error);
      return false;
    }
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
      const result = await this.adapter.destroy();
      this.isInitialized = !result;
      return result;
    } catch (error) {
      logger.error('销毁蓝牙模块失败', error);
      return false;
    }
  }
}