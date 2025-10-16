import { BluetoothAdapter, BluetoothDevice } from './adapter';
import { logger } from '../utils/logger';

// 为鸿蒙OS的API添加类型定义
declare global {
  interface HarmonyContext {
    bluetooth?: {
      createBLECentralManager(): HarmonyBLECentralManager;
    };
  }

  // 鸿蒙OS的蓝牙中央管理器类型
  interface HarmonyBLECentralManager {
    isAvailable(): Promise<boolean>;
    on(eventName: string, callback: (device: any) => void): void;
    off(eventName: string): void;
    startScan(options?: any): Promise<void>;
    stopScan(): Promise<void>;
    connect(deviceId: string, options?: any): Promise<void>;
    disconnect(deviceId: string): Promise<void>;
    getServices(deviceId: string): Promise<any[]>;
    getCharacteristics(deviceId: string, serviceId: string): Promise<any[]>;
    write(options: {
      deviceId: string;
      serviceId: string;
      characteristicId: string;
      value: ArrayBuffer;
      writeType: 'response' | 'noResponse';
    }): Promise<void>;
    read(options: {
      deviceId: string;
      serviceId: string;
      characteristicId: string;
    }): Promise<{ value: ArrayBuffer }>;
    notify(options: {
      deviceId: string;
      serviceId: string;
      characteristicId: string;
      state: boolean;
    }): Promise<void>;
  }
  
  // 定义全局harmony变量
  var harmony: HarmonyContext | undefined;
  interface Window {
    harmony?: HarmonyContext;
  }

  // 使用类型断言来避免冲突
  // var global: any;
  
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: 'development' | 'production' | 'test';
      TARO_ENV?: 'weapp' | 'h5' | 'rn' | 'harmony';
    }
    
    interface Process {
      env: ProcessEnv;
    }
  }
  
  var process: NodeJS.Process;
}

// 鸿蒙OS蓝牙适配器
export class HarmonyBluetoothAdapter implements BluetoothAdapter {
  private deviceList: Map<string, any> = new Map();
  private connectedDevice: any = null;
  private bleManager: any = null;
  private eventListeners: Map<string, Function> = new Map();
  
  /**
   * 获取鸿蒙运行时环境
   */
  private getHarmonyRuntime(): any {
    // 检查全局harmony对象
    if (typeof harmony !== 'undefined' && harmony?.bluetooth) {
      return harmony;
    }
    
    // 检查window对象上的harmony
    if (typeof window !== 'undefined' && window.harmony?.bluetooth) {
      return window.harmony;
    }
    
    // 检查全局对象中是否有鸿蒙特有的API
    const globalObj = typeof globalThis !== 'undefined' ? globalThis :
                      typeof window !== 'undefined' ? window :
                      typeof self !== 'undefined' ? self :
                      {};
                      
    if ('harmony' in globalObj) {
      return (globalObj as any).harmony;
    }
    
    return null;
  }

  /**
   * 监听蓝牙状态变化
   * @param callback 回调函数
   */
  onBluetoothAdapterStateChange(callback: (state: { available: boolean, discovering: boolean }) => void): void {
    const listener = () => {
      const state = {
        available: !!this.bleManager,
        discovering: false // 鸿蒙平台暂不支持发现状态检测
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
    const listener = (device: any) => {
      callback({
        deviceId: device.deviceId,
        name: device.name || device.localName || '未知设备',
        deviceName: device.name || device.localName,
        RSSI: device.RSSI,
        localName: device.localName
      });
    };
    this.eventListeners.set('deviceFound', listener);
    if (this.bleManager) {
      this.bleManager.on('BLEDeviceFind', listener);
    }
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
    if (this.bleManager) {
      this.bleManager.on('BLEConnectionChange', listener);
    }
  }

  async initialize(): Promise<boolean> {
    try {
      // 获取鸿蒙运行时
      const harmonyRuntime = this.getHarmonyRuntime();
      
      if (!harmonyRuntime || !harmonyRuntime.bluetooth) {
        // 检查是否为模拟环境，如果是则创建一个模拟的BLE管理器
        if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
          logger.warn('鸿蒙蓝牙API不可用，使用模拟实现');
          this.bleManager = this.createMockBLEManager();
          return true;
        }
        
        throw new Error('不支持的平台或API');
      }
      
      this.bleManager = harmonyRuntime.bluetooth.createBLECentralManager();
      
      // 检查蓝牙是否可用
      const isAvailable = await this.bleManager.isAvailable();
      if (!isAvailable) {
        throw new Error('蓝牙不可用');
      }
      
      return true;
    } catch (error) {
      logger.error('初始化蓝牙模块失败', error);
      return false;
    }
  }
  
  /**
   * 创建模拟的BLE管理器（开发测试用）
   */
  private createMockBLEManager(): any {
    return {
      isAvailable: async () => true,
      on: (eventName: string, callback: any) => {
        logger.debug(`[模拟] 添加事件监听器: ${eventName}`);
      },
      off: (eventName: string) => {
        logger.debug(`[模拟] 移除事件监听器: ${eventName}`);
      },
      startScan: async (options?: any) => {
        logger.debug('[模拟] 开始扫描设备');
        // 模拟发现设备
        setTimeout(() => {
          const mockDevice = {
            deviceId: 'mock-device-01',
            name: '模拟打印机设备',
            RSSI: -65,
            localName: 'MockPrinter'
          };
          this.deviceList.set(mockDevice.deviceId, mockDevice);
        }, 1000);
      },
      stopScan: async () => {
        logger.debug('[模拟] 停止扫描设备');
      },
      connect: async (deviceId: string) => {
        logger.debug(`[模拟] 连接设备: ${deviceId}`);
        const device = this.deviceList.get(deviceId);
        if (device) {
          this.connectedDevice = device;
        }
      },
      disconnect: async (deviceId: string) => {
        logger.debug(`[模拟] 断开设备连接: ${deviceId}`);
        if (this.connectedDevice && this.connectedDevice.deviceId === deviceId) {
          this.connectedDevice = null;
        }
      },
      getServices: async (deviceId: string) => {
        logger.debug(`[模拟] 获取服务: ${deviceId}`);
        return [
          { uuid: '49535343-FE7D-4AE5-8FA9-9FAFD205E455', isPrimary: true },
          { uuid: '00001101-0000-1000-8000-00805F9B34FB', isPrimary: true }
        ];
      },
      getCharacteristics: async (deviceId: string, serviceId: string) => {
        logger.debug(`[模拟] 获取特征值: ${serviceId}`);
        return [
          { 
            uuid: '49535343-8841-43F4-A8D4-ECBE34729BB3',
            properties: {
              read: true,
              write: true,
              notify: true,
              writeWithoutResponse: true
            }
          }
        ];
      },
      write: async (options: any) => {
        logger.debug(`[模拟] 写入数据: ${options.characteristicId}`);
      },
      read: async (options: any) => {
        logger.debug(`[模拟] 读取数据: ${options.characteristicId}`);
        return { value: new ArrayBuffer(0) };
      },
      notify: async (options: any) => {
        logger.debug(`[模拟] ${options.state ? '开启' : '关闭'}通知: ${options.characteristicId}`);
      }
    };
  }
  
  async getAdapterState(): Promise<any> {
    try {
      if (!this.bleManager) {
        await this.initialize();
      }
      
      // 鸿蒙OS获取蓝牙状态
      const isAvailable = await this.bleManager.isAvailable();
      return { available: isAvailable };
    } catch (error) {
      logger.error('获取蓝牙适配器状态失败', error);
      throw error;
    }
  }
  
  async startDiscovery(): Promise<boolean> {
    try {
      if (!this.bleManager) {
        await this.initialize();
      }
      
      // 清空设备列表
      this.deviceList.clear();
      
      // 监听设备发现回调
      this.bleManager.on('BLEDeviceFind', (device: any) => {
        this.deviceList.set(device.deviceId, device);
      });
      
      // 开始扫描
      await this.bleManager.startScan();
      return true;
    } catch (error) {
      logger.error('开始搜索蓝牙设备失败', error);
      return false;
    }
  }
  
  async stopDiscovery(): Promise<boolean> {
    try {
      if (this.bleManager) {
        await this.bleManager.stopScan();
        return true;
      }
      return false;
    } catch (error) {
      logger.error('停止搜索蓝牙设备失败', error);
      return false;
    }
  }
  
  async getDiscoveredDevices(): Promise<BluetoothDevice[]> {
    const devices: BluetoothDevice[] = [];
    
    this.deviceList.forEach(device => {
      devices.push({
        deviceId: device.deviceId,
        name: device.name || device.localName || '未知设备',
        RSSI: device.RSSI,
        deviceName: device.name,
        localName: device.localName
      });
    });
    
    return devices;
  }
  
  async connect(deviceId: string): Promise<boolean> {
    try {
      if (!this.bleManager) {
        await this.initialize();
      }
      
      const device = this.deviceList.get(deviceId);
      if (!device) {
        throw new Error(`未找到设备: ${deviceId}`);
      }
      
      // 连接设备
      await this.bleManager.connect(deviceId);
      this.connectedDevice = device;
      return true;
    } catch (error) {
      logger.error('连接蓝牙设备失败', error);
      return false;
    }
  }
  
  async disconnect(deviceId?: string): Promise<boolean> {
    try {
      if (!this.bleManager || !this.connectedDevice) {
        return true;
      }
      
      const targetId = deviceId || this.connectedDevice.deviceId;
      
      await this.bleManager.disconnect(targetId);
      if (this.connectedDevice.deviceId === targetId) {
        this.connectedDevice = null;
      }
      
      return true;
    } catch (error) {
      logger.error('断开蓝牙连接失败', error);
      return false;
    }
  }
  
  async getServices(deviceId: string): Promise<any> {
    try {
      if (!this.bleManager || !this.connectedDevice || this.connectedDevice.deviceId !== deviceId) {
        throw new Error('设备未连接');
      }
      
      const services = await this.bleManager.getServices(deviceId);
      return { services };
    } catch (error) {
      logger.error('获取服务失败', error);
      throw error;
    }
  }
  
  async getCharacteristics(deviceId: string, serviceId: string): Promise<any> {
    try {
      if (!this.bleManager || !this.connectedDevice || this.connectedDevice.deviceId !== deviceId) {
        throw new Error('设备未连接');
      }
      
      const characteristics = await this.bleManager.getCharacteristics(deviceId, serviceId);
      return { characteristics };
    } catch (error) {
      logger.error('获取特征值失败', error);
      throw error;
    }
  }
  
  async write(deviceId: string, serviceId: string, characteristicId: string, data: ArrayBuffer): Promise<boolean> {
    try {
      if (!this.bleManager || !this.connectedDevice || this.connectedDevice.deviceId !== deviceId) {
        throw new Error('设备未连接');
      }
      
      await this.bleManager.write({
        deviceId,
        serviceId,
        characteristicId,
        value: data,
        writeType: 'response'
      });
      
      return true;
    } catch (error) {
      logger.error('写入数据失败', error);
      return false;
    }
  }
  
  async read(deviceId: string, serviceId: string, characteristicId: string): Promise<ArrayBuffer> {
    try {
      if (!this.bleManager || !this.connectedDevice || this.connectedDevice.deviceId !== deviceId) {
        throw new Error('设备未连接');
      }
      
      const result = await this.bleManager.read({
        deviceId,
        serviceId,
        characteristicId
      });
      
      return result.value;
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
      if (!this.bleManager || !this.connectedDevice || this.connectedDevice.deviceId !== deviceId) {
        throw new Error('设备未连接');
      }
      
      if (state) {
        await this.bleManager.notify({
          deviceId,
          serviceId,
          characteristicId,
          state: true
        });
      } else {
        await this.bleManager.notify({
          deviceId,
          serviceId,
          characteristicId,
          state: false
        });
      }
      
      return true;
    } catch (error) {
      logger.error('监听特征值变化失败', error);
      return false;
    }
  }
  
  async destroy(): Promise<boolean> {
    try {
      if (this.connectedDevice) {
        await this.disconnect(this.connectedDevice.deviceId);
      }
      
      if (this.bleManager) {
        this.bleManager.off('BLEDeviceFind');
        this.bleManager = null;
      }
      
      this.deviceList.clear();
      return true;
    } catch (error) {
      logger.error('销毁蓝牙适配器失败', error);
      return false;
    }
  }
} 