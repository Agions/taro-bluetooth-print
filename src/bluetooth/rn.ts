import { BluetoothAdapter, BluetoothDevice } from './adapter';
import { logger } from '../utils/logger';

// 添加Node.js相关类型定义
declare function require(id: string): any;

// 添加 Node.js 相关类型定义
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: 'development' | 'production' | 'test';
      TARO_ENV?: 'weapp' | 'h5' | 'rn' | 'harmony';
      // 索引签名只需要一个
    }
    
    interface Process {
      env: ProcessEnv;
    }
  }
  
  var process: NodeJS.Process;
  
  // Web Worker环境
  function importScripts(...urls: string[]): void;
}


// 替代声明模块，直接定义接口类型
let BleManager: any = null;

/**
 * 异步函数用于加载BleManager
 * 使用动态导入或require，处理不同环境
 */
async function loadBleManager(): Promise<any> {
  if (BleManager) {
    return BleManager;
  }
  
  try {
    // 使用全局变量检测环境
    if (typeof window !== 'undefined' && 'ReactNativeWebView' in window) {
      // React Native 环境
      try {
        // 尝试使用require (常见于RN环境)
        BleManager = require('react-native-ble-plx').BleManager;
        logger.info('使用require加载react-native-ble-plx成功');
        return BleManager;
      } catch (e2) {
        logger.error('使用require加载react-native-ble-plx失败', e2);
      }
    } else if (typeof importScripts === 'function') {
      // Web Worker 环境
      // 这种情况下通常无法直接使用蓝牙API
      logger.warn('Web Worker环境下可能无法使用蓝牙API');
    } else if (typeof process !== 'undefined' && process.versions && process.versions.node) {
      // Node.js 环境
      try {
        BleManager = require('react-native-ble-plx').BleManager;
        logger.info('Node.js环境下加载react-native-ble-plx成功');
        return BleManager;
      } catch (e) {
        logger.error('Node.js环境下加载react-native-ble-plx失败', e);
      }
    } else if (typeof navigator !== 'undefined' && navigator.product === 'ReactNative') {
      // 另一种检测RN环境的方法
      try {
        BleManager = require('react-native-ble-plx').BleManager;
        logger.info('ReactNative环境下加载react-native-ble-plx成功');
        return BleManager;
      } catch (e) {
        logger.error('ReactNative环境下加载react-native-ble-plx失败', e);
      }
    }
    
    // 如果上述方法都失败，提供一个错误信息
    logger.error('无法加载BleManager，请确保已安装react-native-ble-plx');
    return null;
  } catch (error) {
    logger.error('加载BleManager出错', error);
    return null;
  }
}

// 尝试初始化加载BleManager
loadBleManager().catch(e => {
  logger.error('初始化加载BleManager失败', e);
});

export class RNBluetoothAdapter implements BluetoothAdapter {
  private manager: any = null;
  private connectedDevice: any = null;
  private discoveredDevices: Map<string, any> = new Map();
  private transactionIds: Set<string> = new Set();
  private eventListeners: Map<string, Function> = new Map();

  /**
   * 监听蓝牙状态变化
   * @param callback 回调函数
   */
  onBluetoothAdapterStateChange(callback: (state: { available: boolean, discovering: boolean }) => void): void {
    const listener = () => {
      if (this.manager) {
        this.manager.state().then((state: string) => {
          callback({
            available: state === 'PoweredOn',
            discovering: false // RN 暂不支持发现状态检测
          });
        });
      }
    };
    this.eventListeners.set('adapterStateChange', listener);
  }

  /**
   * 监听设备发现
   * @param callback 回调函数
   */
  onBluetoothDeviceFound(callback: (device: BluetoothDevice) => void): void {
    const listener = (error: any, device: any) => {
      if (!error && device) {
        callback({
          deviceId: device.id,
          name: device.name || device.localName || '未知设备',
          deviceName: device.name || device.localName,
          RSSI: device.rssi,
          localName: device.localName
        });
      }
    };
    this.eventListeners.set('deviceFound', listener);
  }

  /**
   * 监听连接状态变化
   * @param callback 回调函数
   */
  onBluetoothDeviceConnectionChange(callback: (deviceId: string, connected: boolean) => void): void {
    const listener = (deviceId: string, connected: boolean) => {
      callback(deviceId, connected);
    };
    this.eventListeners.set('connectionChange', listener);
  }

  async initialize(): Promise<boolean> {
    try {
      // 尝试加载BleManager
      const BleManagerClass = await loadBleManager();
      
      if (!BleManagerClass) {
        throw new Error('未找到BleManager，请安装react-native-ble-plx');
      }
      
      this.manager = new BleManagerClass();
      
      // 检查蓝牙状态
      const state = await this.manager.state();
      
      if (state !== 'PoweredOn') {
        throw new Error(`蓝牙不可用，当前状态: ${state}`);
      }
      
      return true;
    } catch (error) {
      logger.error('初始化蓝牙模块失败', error);
      return false;
    }
  }
  
  async getAdapterState(): Promise<any> {
    try {
      if (!this.manager) {
        await this.initialize();
      }
      
      const state = await this.manager.state();
      return { 
        available: state === 'PoweredOn',
        state
      };
    } catch (error) {
      logger.error('获取蓝牙适配器状态失败', error);
      throw error;
    }
  }
  
  async startDiscovery(): Promise<boolean> {
    try {
      if (!this.manager) {
        await this.initialize();
      }
      
      this.discoveredDevices.clear();
      
      // 开始搜索设备
      const serviceUUIDs = [
        '49535343-FE7D-4AE5-8FA9-9FAFD205E455', // 常见打印机服务UUID
        '00001101-0000-1000-8000-00805F9B34FB', // SPP服务
        '0000180A-0000-1000-8000-00805F9B34FB'  // 设备信息服务
      ];
      
      this.manager.startDeviceScan(serviceUUIDs, { allowDuplicates: false }, (error: any, device: any) => {
        if (error) {
          logger.error('扫描设备出错', error);
          return;
        }
        
        if (device) {
          this.discoveredDevices.set(device.id, device);
        }
      });
      
      return true;
    } catch (error) {
      logger.error('开始搜索蓝牙设备失败', error);
      return false;
    }
  }
  
  async stopDiscovery(): Promise<boolean> {
    try {
      if (this.manager) {
        this.manager.stopDeviceScan();
      }
      return true;
    } catch (error) {
      logger.error('停止搜索蓝牙设备失败', error);
      return false;
    }
  }
  
  async getDiscoveredDevices(): Promise<BluetoothDevice[]> {
    const devices: BluetoothDevice[] = [];
    
    this.discoveredDevices.forEach(device => {
      devices.push({
        deviceId: device.id,
        name: device.name || device.localName || '未知设备',
        RSSI: device.rssi,
        deviceName: device.name,
        localName: device.localName
      });
    });
    
    return devices;
  }
  
  async connect(deviceId: string): Promise<boolean> {
    try {
      if (!this.manager) {
        await this.initialize();
      }
      
      await this.stopDiscovery();
      
      const device = this.discoveredDevices.get(deviceId);
      if (!device) {
        // 如果设备不在已发现列表中，尝试直接连接
        this.connectedDevice = await this.manager.connectToDevice(deviceId, {
          autoConnect: true,
          timeout: 10000 // 10秒超时
        });
      } else {
        this.connectedDevice = await device.connect({
          autoConnect: true,
          timeout: 10000
        });
      }
      
      // 发现服务和特征
      await this.manager.discoverAllServicesAndCharacteristicsForDevice(deviceId);
      
      return true;
    } catch (error) {
      logger.error('连接蓝牙设备失败', error);
      return false;
    }
  }
  
  async disconnect(deviceId?: string): Promise<boolean> {
    try {
      if (this.connectedDevice) {
        const targetId = deviceId || this.connectedDevice.id;
        
        if (this.connectedDevice.id === targetId) {
          await this.manager.cancelDeviceConnection(targetId);
          this.connectedDevice = null;
          
          // 取消所有事务
          this.transactionIds.forEach(id => {
            this.manager.cancelTransaction(id);
          });
          this.transactionIds.clear();
          
          return true;
        }
      }
      return false;
    } catch (error) {
      logger.error('断开蓝牙连接失败', error);
      return false;
    }
  }
  
  async getServices(deviceId: string): Promise<any> {
    try {
      if (!this.connectedDevice || this.connectedDevice.id !== deviceId) {
        throw new Error('设备未连接');
      }
      
      const services = await this.manager.servicesForDevice(deviceId);
      return { services: services.map((svc: any) => ({ uuid: svc.uuid, isPrimary: true })) };
    } catch (error) {
      logger.error('获取服务失败', error);
      throw error;
    }
  }
  
  async getCharacteristics(deviceId: string, serviceId: string): Promise<any> {
    try {
      if (!this.connectedDevice || this.connectedDevice.id !== deviceId) {
        throw new Error('设备未连接');
      }
      
      const characteristics = await this.manager.characteristicsForDevice(deviceId, serviceId);
      
      return {
        characteristics: characteristics.map((char: any) => ({
          uuid: char.uuid,
          properties: {
            read: char.isReadable,
            write: char.isWritableWithResponse,
            notify: char.isNotifiable,
            writeWithoutResponse: char.isWritableWithoutResponse
          }
        }))
      };
    } catch (error) {
      logger.error('获取特征值失败', error);
      throw error;
    }
  }
  
  async write(deviceId: string, serviceId: string, characteristicId: string, data: ArrayBuffer): Promise<boolean> {
    try {
      if (!this.connectedDevice || this.connectedDevice.id !== deviceId) {
        throw new Error('设备未连接');
      }
      
      // 将ArrayBuffer转为base64
      const base64Data = this._arrayBufferToBase64(data);
      
      // 尝试使用响应写入
      await this.manager.writeCharacteristicWithResponseForDevice(
        deviceId,
        serviceId,
        characteristicId,
        base64Data
      );
      
      return true;
    } catch (error) {
      logger.error('写入数据失败，尝试无响应写入', error);
      
      try {
        // 如果响应写入失败，尝试无响应写入
        const base64Data = this._arrayBufferToBase64(data);
        await this.manager.writeCharacteristicWithoutResponseForDevice(
          deviceId,
          serviceId,
          characteristicId,
          base64Data
        );
        return true;
      } catch (error2) {
        logger.error('无响应写入也失败', error2);
        return false;
      }
    }
  }
  
  async read(deviceId: string, serviceId: string, characteristicId: string): Promise<ArrayBuffer> {
    try {
      if (!this.connectedDevice || this.connectedDevice.id !== deviceId) {
        throw new Error('设备未连接');
      }
      
      const characteristic = await this.manager.readCharacteristicForDevice(
        deviceId,
        serviceId,
        characteristicId
      );
      
      // 将base64转为ArrayBuffer
      return this._base64ToArrayBuffer(characteristic.value);
    } catch (error) {
      logger.error('读取数据失败', error);
      throw error;
    }
  }
  
  async notifyCharacteristicValueChange(
    deviceId: string, 
    serviceId: string, 
    characteristicId: string, 
    state: boolean
  ): Promise<boolean> {
    try {
      if (!this.connectedDevice || this.connectedDevice.id !== deviceId) {
        throw new Error('设备未连接');
      }
      
      if (state) {
        const transactionId = `monitor_${serviceId}_${characteristicId}`;
        
        this.manager.monitorCharacteristicForDevice(
          deviceId,
          serviceId,
          characteristicId,
          (error: any, characteristic: any) => {
            if (error) {
              logger.error('监听特征值错误', error);
              return;
            }
            
            if (characteristic) {
              // 处理特征值变化
              logger.debug('特征值变化:', characteristic.value);
            }
          },
          transactionId
        );
        
        // 保存事务ID以便后续清理
        this.transactionIds.add(transactionId);
      } else {
        // 停止监听
        const transactionId = `monitor_${serviceId}_${characteristicId}`;
        this.manager.cancelTransaction(transactionId);
        this.transactionIds.delete(transactionId);
      }
      
      return true;
    } catch (error) {
      logger.error('监听特征值变化失败', error);
      return false;
    }
  }
  
  async destroy(): Promise<boolean> {
    try {
      // 取消所有事务
      this.transactionIds.forEach(id => {
        this.manager.cancelTransaction(id);
      });
      this.transactionIds.clear();
      
      if (this.connectedDevice) {
        await this.disconnect(this.connectedDevice.id);
      }
      
      if (this.manager) {
        this.manager.destroy();
      }
      
      this.discoveredDevices.clear();
      this.manager = null;
      
      return true;
    } catch (error) {
      logger.error('销毁蓝牙适配器失败', error);
      return false;
    }
  }
  
  // 辅助方法: ArrayBuffer转Base64
  private _arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    
    return btoa(binary);
  }
  
  // 辅助方法: Base64转ArrayBuffer
  private _base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    return bytes.buffer;
  }
} 