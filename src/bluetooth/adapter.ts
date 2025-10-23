/**
 * 蓝牙适配器实现
 * 提供跨平台的蓝牙功能支持
 */

import Taro from '@tarojs/taro';

export enum Platform {
  WEAPP = 'weapp',
  H5 = 'h5',
  RN = 'rn',
  HARMONY = 'harmony'
}

/**
 * 蓝牙设备接口
 */
export interface BluetoothDevice {
  deviceId: string;
  name: string;
  deviceName: string;
  RSSI?: number; // 信号强度（可选）
  localName?: string; // 本地名称（可选）
  gatt?: any; // H5 平台特有属性
}

/**
 * 蓝牙适配器接口
 */
export interface BluetoothAdapter {
  /**
   * 初始化蓝牙适配器
   * @returns {Promise<boolean>} 初始化是否成功
   */
  initialize(): Promise<boolean>;

  /**
   * 监听蓝牙状态变化
   * @param callback 回调函数
   */
  onBluetoothAdapterStateChange(callback: (state: { available: boolean, discovering: boolean }) => void): void;

  /**
   * 监听设备发现
   * @param callback 回调函数
   */
  onBluetoothDeviceFound(callback: (device: BluetoothDevice) => void): void;

  /**
   * 监听连接状态变化
   * @param callback 回调函数
   */
  onBluetoothDeviceConnectionChange(callback: (deviceId: string, connected: boolean) => void): void;

  /**
   * 获取蓝牙适配器状态
   * @returns {Promise<any>} 适配器状态
   */
  getAdapterState(): Promise<any>;

  /**
   * 开始搜索蓝牙设备
   * @returns {Promise<boolean>} 是否成功开始搜索
   */
  startDiscovery(): Promise<boolean>;

  /**
   * 停止搜索蓝牙设备
   * @returns {Promise<boolean>} 是否成功停止搜索
   */
  stopDiscovery(): Promise<boolean>;

  /**
   * 获取已发现的蓝牙设备
   * @returns {Promise<BluetoothDevice[]>} 已发现的设备列表
   */
  getDiscoveredDevices(): Promise<BluetoothDevice[]>;

  /**
   * 连接蓝牙设备
   * @param deviceId 设备ID
   * @returns {Promise<boolean>} 是否成功连接
   */
  connect(deviceId: string): Promise<boolean>;

  /**
   * 断开连接
   * @param deviceId 设备ID
   * @returns {Promise<boolean>} 是否成功断开连接
   */
  disconnect(deviceId?: string): Promise<boolean>;

  /**
   * 获取服务
   * @param deviceId 设备ID
   * @returns {Promise<any>} 服务列表
   */
  getServices(deviceId: string): Promise<any>;

  /**
   * 获取特征值
   * @param deviceId 设备ID
   * @param serviceId 服务ID
   * @returns {Promise<any>} 特征值列表
   */
  getCharacteristics(deviceId: string, serviceId: string): Promise<any>;

  /**
   * 写入数据
   * @param deviceId 设备ID
   * @param serviceId 服务ID
   * @param characteristicId 特征值ID
   * @param data 要写入的数据
   * @returns {Promise<boolean>} 是否成功写入
   */
  write(deviceId: string, serviceId: string, characteristicId: string, data: ArrayBuffer): Promise<boolean>;

  /**
   * 读取数据
   * @param deviceId 设备ID
   * @param serviceId 服务ID
   * @param characteristicId 特征值ID
   * @returns {Promise<ArrayBuffer>} 读取的数据
   */
  read(deviceId: string, serviceId: string, characteristicId: string): Promise<ArrayBuffer>;

  /**
   * 销毁适配器
   * @returns {Promise<boolean>} 是否成功销毁
   */
  destroy(): Promise<boolean>;
}

/**
 * 获取当前平台
 * @returns {Platform} 当前平台类型
 */
export function getCurrentPlatform(): Platform {
  const platform = Taro.getEnv();
  switch (platform) {
    case 'WEAPP':
      return Platform.WEAPP;
    case 'WEB':
    case 'ALIPAY':
    case 'TT':
    case 'SWAN':
    case 'JD':
      return Platform.H5;
    case 'RN':
      return Platform.RN;
    case 'HARMONY':
      return Platform.HARMONY;
    default:
      return Platform.H5;
  }
}

/**
 * 获取蓝牙适配器实例
 * @returns {BluetoothAdapter} 蓝牙适配器实例
 */
export function getAdapter(): BluetoothAdapter {
  const platform = getCurrentPlatform();
  
  switch (platform) {
    case Platform.WEAPP:
      return new (require('./weapp').default)();
    case Platform.H5:
      return new (require('./h5').default)();
    case Platform.RN:
      return new (require('./rn').default)();
    case Platform.HARMONY:
      return new (require('./harmony').default)();
    default:
      return new (require('./h5').default)();
  }
}
