import Taro from '@tarojs/taro';

export enum Platform {
  WEAPP = 'weapp',
  H5 = 'h5',
  RN = 'rn',
  HARMONY = 'harmony'
}

export interface BluetoothDevice {
  deviceId: string;
  name: string;
  RSSI?: number;
  advertisData?: ArrayBuffer;
  deviceName?: string; // 用于兼容不同平台
  localName?: string;
}

export interface BluetoothAdapter {
  // 初始化蓝牙模块
  init(): Promise<boolean>;
  
  // 获取蓝牙适配器状态
  getAdapterState(): Promise<any>;
  
  // 开始搜索蓝牙设备
  startDiscovery(): Promise<boolean>;
  
  // 停止搜索蓝牙设备
  stopDiscovery(): Promise<boolean>;
  
  // 获取已发现的蓝牙设备
  getDiscoveredDevices(): Promise<BluetoothDevice[]>;
  
  // 连接蓝牙设备
  connect(deviceId: string): Promise<boolean>;
  
  // 断开连接
  disconnect(deviceId?: string): Promise<boolean>;
  
  // 获取服务
  getServices(deviceId: string): Promise<any>;
  
  // 获取特征值
  getCharacteristics(deviceId: string, serviceId: string): Promise<any>;
  
  // 写入数据
  write(deviceId: string, serviceId: string, characteristicId: string, data: ArrayBuffer): Promise<boolean>;
  
  // 读取数据
  read(deviceId: string, serviceId: string, characteristicId: string): Promise<ArrayBuffer>;
  
  // 监听特征值变化
  notifyCharacteristicValueChange(deviceId: string, serviceId: string, characteristicId: string, state: boolean): Promise<boolean>;
  
  // 销毁蓝牙适配器
  destroy(): Promise<boolean>;
}

export function getCurrentPlatform(): Platform {
  if (process.env.TARO_ENV === 'weapp') {
    return Platform.WEAPP;
  } else if (process.env.TARO_ENV === 'h5') {
    return Platform.H5;
  } else if (process.env.TARO_ENV === 'rn') {
    return Platform.RN;
  } else if (process.env.TARO_ENV === 'harmony') {
    return Platform.HARMONY;
  }
  throw new Error('不支持的平台');
}

export function getAdapter(): BluetoothAdapter {
  const platform = getCurrentPlatform();
  
  switch (platform) {
    case Platform.WEAPP:
      const { WeappBluetoothAdapter } = require('./weapp');
      return new WeappBluetoothAdapter();
    case Platform.H5:
      const { H5BluetoothAdapter } = require('./h5');
      return new H5BluetoothAdapter();
    case Platform.RN:
      const { RNBluetoothAdapter } = require('./rn');
      return new RNBluetoothAdapter();
    case Platform.HARMONY:
      const { HarmonyBluetoothAdapter } = require('./harmony');
      return new HarmonyBluetoothAdapter();
    default:
      throw new Error('不支持的平台');
  }
}