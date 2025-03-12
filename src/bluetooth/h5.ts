import { BluetoothAdapter, BluetoothDevice } from './adapter';
import { logger } from '../utils/logger';

// 为 Web Bluetooth API 添加类型定义
declare global {
  interface Navigator {
    bluetooth?: {
      requestDevice(options?: any): Promise<any>;
      getAvailability(): Promise<boolean>;
    };
  }

  // Web Bluetooth API 的类型
  interface BluetoothRemoteGATTServer {
    connected: boolean;
    device: any;
    connect(): Promise<BluetoothRemoteGATTServer>;
    disconnect(): void;
    getPrimaryServices(service?: BluetoothServiceUUID): Promise<BluetoothRemoteGATTService[]>;
  }

  interface BluetoothRemoteGATTService {
    uuid: string;
    device: any;
    isPrimary: boolean;
    getCharacteristics(characteristic?: BluetoothCharacteristicUUID): Promise<BluetoothRemoteGATTCharacteristic[]>;
  }

  interface BluetoothRemoteGATTCharacteristic {
    uuid: string;
    service: BluetoothRemoteGATTService;
    properties: {
      broadcast: boolean;
      read: boolean;
      writeWithoutResponse: boolean;
      write: boolean;
      notify: boolean;
      indicate: boolean;
      authenticatedSignedWrites: boolean;
      reliableWrite: boolean;
      writableAuxiliaries: boolean;
    };
    readValue(): Promise<DataView>;
    writeValue(value: BufferSource): Promise<void>;
    startNotifications(): Promise<BluetoothRemoteGATTCharacteristic>;
    stopNotifications(): Promise<BluetoothRemoteGATTCharacteristic>;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void;
    removeEventListener(type: string, callback: EventListenerOrEventListenerObject, options?: EventListenerOptions | boolean): void;
  }

  type BluetoothServiceUUID = string | number;
  type BluetoothCharacteristicUUID = string | number;
}

export class H5BluetoothAdapter implements BluetoothAdapter {
  private bluetooth: any = null;
  private device: any = null;
  private gattServer: BluetoothRemoteGATTServer | null = null;
  private services: Map<string, BluetoothRemoteGATTService> = new Map();
  private characteristics: Map<string, Map<string, BluetoothRemoteGATTCharacteristic>> = new Map();
  private eventListeners: Map<string, EventListener> = new Map();
  
  async init(): Promise<boolean> {
    try {
      if (!navigator.bluetooth) {
        throw new Error('当前浏览器不支持Web Bluetooth API');
      }
      
      // 检查蓝牙是否可用
      const available = await navigator.bluetooth.getAvailability();
      if (!available) {
        throw new Error('蓝牙不可用');
      }
      
      this.bluetooth = navigator.bluetooth;
      return true;
    } catch (error) {
      logger.error('初始化蓝牙模块失败', error);
      return false;
    }
  }
  
  async getAdapterState(): Promise<any> {
    try {
      if (!this.bluetooth) {
        throw new Error('蓝牙模块未初始化');
      }
      
      const available = await navigator.bluetooth?.getAvailability();
      return { available: available || false };
    } catch (error) {
      logger.error('获取蓝牙适配器状态失败', error);
      throw error;
    }
  }
  
  async startDiscovery(): Promise<boolean> {
    try {
      if (!this.bluetooth) {
        await this.init();
      }
      
      // 打印机通常使用的服务 (这些值可能需要根据具体打印机调整)
      const printerServices = [
        '000018f0-0000-1000-8000-00805f9b34fb', // 常见热敏打印机服务
        '49535343-fe7d-4ae5-8fa9-9fafd205e455', // 常见蓝牙打印机服务
        '00001101-0000-1000-8000-00805f9b34fb', // SPP服务
        '0000180a-0000-1000-8000-00805f9b34fb'  // 设备信息服务
      ];
      
      // Web Bluetooth API使用requestDevice方法触发设备选择
      this.device = await this.bluetooth.requestDevice({
        // 过滤器用于找到打印机设备
        filters: [
          { services: printerServices },
          { namePrefix: 'Printer' },
          { namePrefix: 'printer' },
          { namePrefix: 'POS' },
          { namePrefix: 'pos' },
          { namePrefix: 'BT' }
        ],
        // 添加可选服务以便于访问
        optionalServices: printerServices
      });
      
      if (this.device) {
        return true;
      }
      return false;
    } catch (error) {
      logger.error('开始搜索蓝牙设备失败', error);
      return false;
    }
  }
  
  async stopDiscovery(): Promise<boolean> {
    // Web Bluetooth API没有停止搜索的方法，因为搜索已经在设备选择完成后结束
    return true;
  }
  
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
  
  async connect(deviceId: string): Promise<boolean> {
    try {
      if (!this.device || this.device.id !== deviceId) {
        logger.error('设备未找到或ID不匹配');
        return false;
      }
      
      // 连接到GATT服务器
      this.gattServer = await this.device.gatt.connect();
      
      // 连接后自动发现服务
      if (this.gattServer) {
        await this.getServices(deviceId);
      }
      
      return this.gattServer?.connected || false;
    } catch (error) {
      logger.error('连接蓝牙设备失败', error);
      return false;
    }
  }
  
  async disconnect(deviceId?: string): Promise<boolean> {
    try {
      if (this.gattServer && this.gattServer.connected) {
        this.gattServer.disconnect();
        this.services.clear();
        this.characteristics.clear();
      }
      return true;
    } catch (error) {
      logger.error('断开蓝牙连接失败', error);
      return false;
    }
  }
  
  async getServices(deviceId: string): Promise<any> {
    try {
      if (!this.gattServer) {
        throw new Error('未连接到GATT服务器');
      }
      
      const services = await this.gattServer.getPrimaryServices();
      const result: any = { services: [] };
      
      for (const service of services) {
        this.services.set(service.uuid, service);
        result.services.push({
          uuid: service.uuid,
          isPrimary: service.isPrimary
        });
        
        // 自动获取每个服务的特征值
        await this.getCharacteristics(deviceId, service.uuid);
      }
      
      return result;
    } catch (error) {
      logger.error('获取服务失败', error);
      throw error;
    }
  }
  
  async getCharacteristics(deviceId: string, serviceId: string): Promise<any> {
    try {
      const service = this.services.get(serviceId);
      if (!service) {
        throw new Error(`服务${serviceId}未找到`);
      }
      
      const characteristics = await service.getCharacteristics();
      const result: any = { characteristics: [] };
      
      if (!this.characteristics.has(serviceId)) {
        this.characteristics.set(serviceId, new Map());
      }
      
      const serviceChars = this.characteristics.get(serviceId)!;
      
      for (const char of characteristics) {
        serviceChars.set(char.uuid, char);
        result.characteristics.push({
          uuid: char.uuid,
          properties: {
            read: char.properties.read,
            write: char.properties.write,
            notify: char.properties.notify,
            writeWithoutResponse: char.properties.writeWithoutResponse
          }
        });
      }
      
      return result;
    } catch (error) {
      logger.error('获取特征值失败', error);
      throw error;
    }
  }
  
  async write(deviceId: string, serviceId: string, characteristicId: string, data: ArrayBuffer): Promise<boolean> {
    try {
      if (!this.characteristics.has(serviceId)) {
        await this.getCharacteristics(deviceId, serviceId);
      }
      
      const serviceChars = this.characteristics.get(serviceId);
      if (!serviceChars) {
        throw new Error(`服务${serviceId}的特征值未找到`);
      }
      
      const characteristic = serviceChars.get(characteristicId);
      if (!characteristic) {
        throw new Error(`特征值${characteristicId}未找到`);
      }
      
      await characteristic.writeValue(data);
      return true;
    } catch (error) {
      logger.error('写入数据失败', error);
      return false;
    }
  }
  
  async read(deviceId: string, serviceId: string, characteristicId: string): Promise<ArrayBuffer> {
    try {
      if (!this.characteristics.has(serviceId)) {
        await this.getCharacteristics(deviceId, serviceId);
      }
      
      const serviceChars = this.characteristics.get(serviceId);
      if (!serviceChars) {
        throw new Error(`服务${serviceId}的特征值未找到`);
      }
      
      const characteristic = serviceChars.get(characteristicId);
      if (!characteristic) {
        throw new Error(`特征值${characteristicId}未找到`);
      }
      
      const value = await characteristic.readValue();
      return value.buffer;
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
      if (!this.characteristics.has(serviceId)) {
        await this.getCharacteristics(deviceId, serviceId);
      }
      
      const serviceChars = this.characteristics.get(serviceId);
      if (!serviceChars) {
        throw new Error(`服务${serviceId}的特征值未找到`);
      }
      
      const characteristic = serviceChars.get(characteristicId);
      if (!characteristic) {
        throw new Error(`特征值${characteristicId}未找到`);
      }
      
      if (state) {
        await characteristic.startNotifications();
        
        // 创建并存储事件监听器，以便以后可以移除
        const listenerKey = `${deviceId}_${serviceId}_${characteristicId}`;
        
        // 创建类型安全的事件监听器
        const listener = function(event: Event) {
          // 安全地转换类型
          if (event.target && event.target instanceof EventTarget) {
            // Web Bluetooth API中，值在characteristicvaluechanged事件中
            if ('readValue' in (event.target as any)) {
              try {
                const characteristic = event.target as any;
                characteristic.readValue().then((dataView: DataView) => {
                  logger.debug('特征值变化:', new Uint8Array(dataView.buffer));
                });
              } catch (error) {
                logger.error('读取特征值变化失败', error);
              }
            }
          }
        };
        
        this.eventListeners.set(listenerKey, listener as EventListener);
        
        // 添加通知事件监听器
        characteristic.addEventListener('characteristicvaluechanged', this.eventListeners.get(listenerKey)!);
      } else {
        await characteristic.stopNotifications();
        
        // 获取并移除事件监听器
        const listenerKey = `${deviceId}_${serviceId}_${characteristicId}`;
        const listener = this.eventListeners.get(listenerKey);
        if (listener) {
          characteristic.removeEventListener('characteristicvaluechanged', listener);
          this.eventListeners.delete(listenerKey);
        }
      }
      
      return true;
    } catch (error) {
      logger.error('监听特征值变化失败', error);
      return false;
    }
  }
  
  async destroy(): Promise<boolean> {
    try {
      if (this.gattServer && this.gattServer.connected) {
        this.gattServer.disconnect();
      }
      
      // 清除所有事件监听器
      this.eventListeners.clear();
      
      this.device = null;
      this.gattServer = null;
      this.services.clear();
      this.characteristics.clear();
      
      return true;
    } catch (error) {
      logger.error('销毁蓝牙适配器失败', error);
      return false;
    }
  }
} 