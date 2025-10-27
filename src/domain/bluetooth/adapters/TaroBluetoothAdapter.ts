/**
 * Taro蓝牙适配器实现
 */

import { BluetoothPlatformAdapter } from '../BluetoothPlatformAdapter';
import {
  IBluetoothDevice,
  IBluetoothScanOptions,
  IBluetoothConnectionOptions,
  IBluetoothCharacteristic,
  BluetoothState,
  BluetoothDeviceState,
  BluetoothDeviceType
} from '../types';

/**
 * Taro蓝牙适配器实现
 */
export class TaroBluetoothAdapter extends BluetoothPlatformAdapter {
  /** Taro蓝牙API */
  private taroBluetooth: any;

  /** 扫描定时器 */
  private scanTimer?: NodeJS.Timeout;

  /** 连接超时定时器 */
  private connectionTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    super('TaroBluetoothAdapter', '1.0.0');

    // 动态导入Taro蓝牙API
    try {
      this.taroBluetooth = require('@tarojs/taro').bluetooth;
    } catch (error) {
      console.warn('Taro Bluetooth API not available:', error);
    }
  }

  /**
   * 检查功能支持
   */
  public isSupported(feature: string): boolean {
    if (!this.taroBluetooth) {
      return false;
    }

    switch (feature) {
      case 'bluetooth':
        return typeof this.taroBluetooth.openBluetoothAdapter === 'function';
      case 'scan':
        return typeof this.taroBluetooth.startBluetoothDevicesDiscovery === 'function';
      case 'connect':
        return typeof this.taroBluetooth.createBLEConnection === 'function';
      case 'services':
        return typeof this.taroBluetooth.getBLEDeviceServices === 'function';
      case 'characteristics':
        return typeof this.taroBluetooth.getBLEDeviceCharacteristics === 'function';
      case 'read':
        return typeof this.taroBluetooth.readBLECharacteristicValue === 'function';
      case 'write':
        return typeof this.taroBluetooth.writeBLECharacteristicValue === 'function';
      case 'notify':
        return typeof this.taroBluetooth.notifyBLECharacteristicValueChange === 'function';
      default:
        return false;
    }
  }

  // 保护方法实现

  protected async doInitialize(): Promise<void> {
    if (!this.taroBluetooth) {
      throw new Error('Taro Bluetooth API not available');
    }

    try {
      // 打开蓝牙适配器
      await this.promisify(this.taroBluetooth.openBluetoothAdapter)();

      // 监听蓝牙适配器状态变化
      this.taroBluetooth.onBluetoothAdapterStateChange((res: any) => {
        this.handleTaroStateChange(res);
      });

      // 监听蓝牙设备发现
      this.taroBluetooth.onBluetoothDeviceFound((res: any) => {
        this.handleDeviceFound(res);
      });

      // 监听连接状态变化
      this.taroBluetooth.onBLEConnectionStateChange((res: any) => {
        this.handleConnectionStateChange(res);
      });

      // 监听特征值变化
      this.taroBluetooth.onBLECharacteristicValueChange((res: any) => {
        this.handleCharacteristicValueChange(res);
      });

    } catch (error) {
      throw new Error(`Failed to initialize Taro Bluetooth: ${error.message}`);
    }
  }

  protected async doGetState(): Promise<BluetoothState> {
    try {
      const result = await this.promisify(this.taroBluetooth.getBluetoothAdapterState)();

      if (!result.available) {
        return BluetoothState.UNAVAILABLE;
      }

      if (!result.discovering && result.discovering !== undefined) {
        return BluetoothState.POWERED_OFF;
      }

      return BluetoothState.POWERED_ON;
    } catch (error) {
      return BluetoothState.UNAUTHORIZED;
    }
  }

  protected async doStartScan(options?: IBluetoothScanOptions): Promise<void> {
    const scanOptions = {
      allowDuplicatesKey: options?.allowDuplicates || false,
      interval: options?.interval || undefined,
      services: options?.services || []
    };

    await this.promisify(this.taroBluetooth.startBluetoothDevicesDiscovery)(scanOptions);

    // 设置扫描超时
    if (options?.timeout) {
      this.scanTimer = setTimeout(() => {
        this.stopScan();
      }, options.timeout);
    }
  }

  protected async doStopScan(): Promise<void> {
    if (this.scanTimer) {
      clearTimeout(this.scanTimer);
      this.scanTimer = undefined;
    }

    await this.promisify(this.taroBluetooth.stopBluetoothDevicesDiscovery)();
  }

  protected async doConnect(
    deviceId: string,
    options?: IBluetoothConnectionOptions
  ): Promise<void> {
    const timeout = options?.timeout || 10000;

    // 设置连接超时
    const timer = setTimeout(() => {
      this.disconnect(deviceId).catch(console.error);
    }, timeout);

    this.connectionTimers.set(deviceId, timer);

    try {
      await this.promisify(this.taroBluetooth.createBLEConnection)({
        deviceId,
        timeout
      });
    } finally {
      const timer = this.connectionTimers.get(deviceId);
      if (timer) {
        clearTimeout(timer);
        this.connectionTimers.delete(deviceId);
      }
    }
  }

  protected async doDisconnect(deviceId: string): Promise<void> {
    // 清除连接超时定时器
    const timer = this.connectionTimers.get(deviceId);
    if (timer) {
      clearTimeout(timer);
      this.connectionTimers.delete(deviceId);
    }

    await this.promisify(this.taroBluetooth.closeBLEConnection)({ deviceId });
  }

  protected async doDiscoverServices(deviceId: string): Promise<string[]> {
    const result = await this.promisify(this.taroBluetooth.getBLEDeviceServices)({ deviceId });
    return result.services.map((service: any) => service.uuid);
  }

  protected async doDiscoverCharacteristics(
    deviceId: string,
    serviceId: string
  ): Promise<IBluetoothCharacteristic[]> {
    const result = await this.promisify(this.taroBluetooth.getBLEDeviceCharacteristics)({
      deviceId,
      serviceId
    });

    return result.characteristics.map((char: any) => ({
      id: char.uuid,
      uuid: char.uuid,
      properties: this.parseCharacteristicProperties(char),
      value: char.value || new ArrayBuffer(0)
    }));
  }

  protected async doReadCharacteristic(
    deviceId: string,
    serviceId: string,
    characteristicId: string
  ): Promise<ArrayBuffer> {
    await this.promisify(this.taroBluetooth.readBLECharacteristicValue)({
      deviceId,
      serviceId,
      characteristicId
    });

    // Taro需要等待数据回调
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Read characteristic timeout'));
      }, 5000);

      const handleValueChange = (res: any) => {
        if (res.deviceId === deviceId &&
            res.serviceId === serviceId &&
            res.characteristicId === characteristicId) {
          clearTimeout(timeout);
          this.taroBluetooth.offBLECharacteristicValueChange(handleValueChange);
          resolve(res.value);
        }
      };

      this.taroBluetooth.onBLECharacteristicValueChange(handleValueChange);
    });
  }

  protected async doWriteCharacteristic(
    deviceId: string,
    serviceId: string,
    characteristicId: string,
    value: ArrayBuffer
  ): Promise<void> {
    await this.promisify(this.taroBluetooth.writeBLECharacteristicValue)({
      deviceId,
      serviceId,
      characteristicId,
      value
    });
  }

  protected async doSubscribeCharacteristic(
    deviceId: string,
    serviceId: string,
    characteristicId: string
  ): Promise<void> {
    await this.promisify(this.taroBluetooth.notifyBLECharacteristicValueChange)({
      deviceId,
      serviceId,
      characteristicId,
      state: true
    });
  }

  protected async doUnsubscribeCharacteristic(
    deviceId: string,
    serviceId: string,
    characteristicId: string
  ): Promise<void> {
    await this.promisify(this.taroBluetooth.notifyBLECharacteristicValueChange)({
      deviceId,
      serviceId,
      characteristicId,
      state: false
    });
  }

  protected async doGetRSSI(deviceId: string): Promise<number> {
    const result = await this.promisify(this.taroBluetooth.getBLEDeviceRSSI)({ deviceId });
    return result.RSSI;
  }

  protected async doReset(): Promise<void> {
    try {
      // 关闭蓝牙适配器
      await this.promisify(this.taroBluetooth.closeBluetoothAdapter)();

      // 重新打开
      await this.doInitialize();
    } catch (error) {
      console.warn('Failed to reset Taro Bluetooth adapter:', error);
    }
  }

  protected async doDispose(): Promise<void> {
    try {
      // 停止扫描
      if (this.isScanning) {
        await this.doStopScan();
      }

      // 关闭蓝牙适配器
      await this.promisify(this.taroBluetooth.closeBluetoothAdapter)();
    } catch (error) {
      console.warn('Failed to dispose Taro Bluetooth adapter:', error);
    }
  }

  // 私有方法

  /**
   * 处理Taro蓝牙状态变化
   */
  private handleTaroStateChange(res: any): void {
    let state: BluetoothState;

    if (!res.available) {
      state = BluetoothState.UNAVAILABLE;
    } else if (!res.discovering && res.discovering !== undefined) {
      state = BluetoothState.POWERED_OFF;
    } else {
      state = BluetoothState.POWERED_ON;
    }

    this.handleStateChanged(state);
  }

  /**
   * 处理设备发现
   */
  private handleDeviceFound(res: any): void {
    const { devices } = res;

    for (const device of devices) {
      const bluetoothDevice: IBluetoothDevice = {
        id: device.deviceId,
        name: device.name || 'Unknown Device',
        address: device.deviceId,
        type: this.mapDeviceType(device.advertisData),
        state: BluetoothDeviceState.DISCONNECTED,
        rssi: device.RSSI || -100,
        advertisementData: device.advertisData || new ArrayBuffer(0),
        services: [],
        connectable: true,
        serviceData: new Map(),
        metadata: {}
      };

      this.handleDeviceDiscovered(bluetoothDevice);
    }
  }

  /**
   * 处理连接状态变化
   */
  private handleConnectionStateChange(res: any): void {
    const { deviceId, connected } = res;
    const state = connected ? BluetoothDeviceState.CONNECTED : BluetoothDeviceState.DISCONNECTED;

    this.handleDeviceStateChanged(deviceId, state);
  }

  /**
   * 处理特征值变化
   */
  private handleCharacteristicValueChange(res: any): void {
    const { deviceId, serviceId, characteristicId, value } = res;

    this.handleCharacteristicValueChanged(deviceId, serviceId, characteristicId, value);
  }

  /**
   * 解析特征值属性
   */
  private parseCharacteristicProperties(characteristic: any): {
    read: boolean;
    write: boolean;
    notify: boolean;
    indicate: boolean;
  } {
    const properties = characteristic.properties || [];

    return {
      read: properties.includes('read'),
      write: properties.includes('write'),
      notify: properties.includes('notify'),
      indicate: properties.includes('indicate')
    };
  }

  /**
   * 映射设备类型
   */
  private mapDeviceType(advertisData?: any): BluetoothDeviceType {
    if (!advertisData) {
      return BluetoothDeviceType.UNKNOWN;
    }

    // 根据广播数据判断设备类型
    const localName = advertisData.localName;
    if (localName) {
      const name = localName.toLowerCase();
      if (name.includes('printer')) {
        return BluetoothDeviceType.PRINTER;
      }
      if (name.includes('keyboard') || name.includes('mouse')) {
        return BluetoothDeviceType.HID;
      }
      if (name.includes('headphone') || name.includes('speaker')) {
        return BluetoothDeviceType.AUDIO;
      }
    }

    // 根据服务UUID判断设备类型
    const services = advertisData.serviceUuids || [];
    for (const service of services) {
      if (service.includes('1800') || service.includes('1801')) {
        return BluetoothDeviceType.UNKNOWN; // Generic Access/Attribute
      }
      if (service.includes('180F')) {
        return BluetoothDeviceType.BATTERY; // Battery Service
      }
      if (service.includes('1812') || service.includes('1813')) {
        return BluetoothDeviceType.HID; // HID Service
      }
      if (service.includes('1819')) {
        return BluetoothDeviceType.LOCATION; // Location and Navigation
      }
    }

    return BluetoothDeviceType.UNKNOWN;
  }

  /**
   * 将回调式API转换为Promise
   */
  private promisify(api: Function): (...args: any[]) => Promise<any> {
    return (...args: any[]): Promise<any> => {
      return new Promise((resolve, reject) => {
        const callback = (res: any) => {
          if (res.errMsg && !res.errMsg.includes('ok')) {
            reject(new Error(res.errMsg));
          } else {
            resolve(res);
          }
        };

        api({ ...args[0], success: callback, fail: callback });
      });
    };
  }
}