/**
 * 蓝牙设备实现
 */

import {
  IBluetoothDevice,
  IBluetoothCharacteristic,
  BluetoothDeviceType,
  BluetoothDeviceState
} from './types';

/**
 * 蓝牙设备实现
 */
export class BluetoothDevice implements IBluetoothDevice {
  /** 设备ID */
  public readonly id: string;

  /** 设备名称 */
  public name: string;

  /** 设备地址 */
  public address: string;

  /** 设备类型 */
  public readonly type: BluetoothDeviceType;

  /** 设备状态 */
  public state: BluetoothDeviceState;

  /** 信号强度 */
  public rssi: number;

  /** 广播数据 */
  public advertisementData: ArrayBuffer;

  /** 服务列表 */
  public services: string[];

  /** 最后连接时间 */
  public lastConnected?: Date;

  /** 最后断开时间 */
  public lastDisconnected?: Date;

  /** 是否可连接 */
  public connectable: boolean;

  /** 设备制造商数据 */
  public manufacturerData?: ArrayBuffer;

  /** 服务数据 */
  public serviceData: Map<string, ArrayBuffer>;

  /** 特征值缓存 */
  private characteristics: Map<string, IBluetoothCharacteristic> = new Map();

  /** 订阅的特征值 */
  private subscribedCharacteristics: Set<string> = new Set();

  /** 自定义属性 */
  public metadata: Record<string, any>;

  constructor(
    id: string,
    name: string,
    address: string,
    type: BluetoothDeviceType = BluetoothDeviceType.UNKNOWN
  ) {
    this.id = id;
    this.name = name;
    this.address = address;
    this.type = type;
    this.state = BluetoothDeviceState.DISCONNECTED;
    this.rssi = -100; // 默认信号强度
    this.advertisementData = new ArrayBuffer(0);
    this.services = [];
    this.connectable = true;
    this.serviceData = new Map();
    this.metadata = {};
  }

  /**
   * 检查设备是否已连接
   */
  public isConnected(): boolean {
    return this.state === BluetoothDeviceState.CONNECTED;
  }

  /**
   * 检查设备是否可连接
   */
  public isConnectable(): boolean {
    return this.connectable && this.state !== BluetoothDeviceState.CONNECTED;
  }

  /**
   * 检查设备是否支持指定服务
   */
  public hasService(serviceId: string): boolean {
    return this.services.includes(serviceId);
  }

  /**
   * 获取设备特征值
   */
  public getCharacteristic(
    serviceId: string,
    characteristicId: string
  ): IBluetoothCharacteristic | undefined {
    const key = `${serviceId}:${characteristicId}`;
    return this.characteristics.get(key);
  }

  /**
   * 设置设备特征值
   */
  public setCharacteristic(
    serviceId: string,
    characteristicId: string,
    characteristic: IBluetoothCharacteristic
  ): void {
    const key = `${serviceId}:${characteristicId}`;
    this.characteristics.set(key, characteristic);
  }

  /**
   * 获取所有特征值
   */
  public getAllCharacteristics(): IBluetoothCharacteristic[] {
    return Array.from(this.characteristics.values());
  }

  /**
   * 检查特征值是否已订阅
   */
  public isCharacteristicSubscribed(
    serviceId: string,
    characteristicId: string
  ): boolean {
    const key = `${serviceId}:${characteristicId}`;
    return this.subscribedCharacteristics.has(key);
  }

  /**
   * 订阅特征值
   */
  public subscribeCharacteristic(serviceId: string, characteristicId: string): void {
    const key = `${serviceId}:${characteristicId}`;
    this.subscribedCharacteristics.add(key);
  }

  /**
   * 取消订阅特征值
   */
  public unsubscribeCharacteristic(serviceId: string, characteristicId: string): void {
    const key = `${serviceId}:${characteristicId}`;
    this.subscribedCharacteristics.delete(key);
  }

  /**
   * 获取已订阅的特征值列表
   */
  public getSubscribedCharacteristics(): Array<{
    serviceId: string;
    characteristicId: string;
  }> {
    const result: Array<{ serviceId: string; characteristicId: string }> = [];

    for (const key of this.subscribedCharacteristics) {
      const [serviceId, characteristicId] = key.split(':');
      result.push({ serviceId, characteristicId });
    }

    return result;
  }

  /**
   * 更新广播数据
   */
  public updateAdvertisementData(advertisementData: ArrayBuffer): void {
    this.advertisementData = advertisementData;
    this.parseAdvertisementData();
  }

  /**
   * 更新信号强度
   */
  public updateRSSI(rssi: number): void {
    this.rssi = rssi;
  }

  /**
   * 更新连接状态
   */
  public updateState(state: BluetoothDeviceState): void {
    const previousState = this.state;
    this.state = state;

    if (state === BluetoothDeviceState.CONNECTED) {
      this.lastConnected = new Date();
    } else if (previousState === BluetoothDeviceState.CONNECTED) {
      this.lastDisconnected = new Date();
    }
  }

  /**
   * 添加服务
   */
  public addService(serviceId: string): void {
    if (!this.services.includes(serviceId)) {
      this.services.push(serviceId);
    }
  }

  /**
   * 移除服务
   */
  public removeService(serviceId: string): void {
    const index = this.services.indexOf(serviceId);
    if (index !== -1) {
      this.services.splice(index, 1);
    }
  }

  /**
   * 设置服务数据
   */
  public setServiceData(serviceId: string, data: ArrayBuffer): void {
    this.serviceData.set(serviceId, data);
  }

  /**
   * 获取服务数据
   */
  public getServiceData(serviceId: string): ArrayBuffer | undefined {
    return this.serviceData.get(serviceId);
  }

  /**
   * 设置制造商数据
   */
  public setManufacturerData(data: ArrayBuffer): void {
    this.manufacturerData = data;
  }

  /**
   * 获取设备信息摘要
   */
  public getSummary(): {
    id: string;
    name: string;
    address: string;
    type: BluetoothDeviceType;
    state: BluetoothDeviceState;
    rssi: number;
    connectable: boolean;
    servicesCount: number;
    subscribedCharacteristicsCount: number;
    lastConnected?: Date;
    lastDisconnected?: Date;
  } {
    return {
      id: this.id,
      name: this.name,
      address: this.address,
      type: this.type,
      state: this.state,
      rssi: this.rssi,
      connectable: this.connectable,
      servicesCount: this.services.length,
      subscribedCharacteristicsCount: this.subscribedCharacteristics.size,
      lastConnected: this.lastConnected,
      lastDisconnected: this.lastDisconnected
    };
  }

  /**
   * 克隆设备信息
   */
  public clone(): BluetoothDevice {
    const cloned = new BluetoothDevice(this.id, this.name, this.address, this.type);

    // 复制基本属性
    cloned.state = this.state;
    cloned.rssi = this.rssi;
    cloned.advertisementData = this.advertisementData.slice(0);
    cloned.services = [...this.services];
    cloned.connectable = this.connectable;
    cloned.lastConnected = this.lastConnected;
    cloned.lastDisconnected = this.lastDisconnected;

    // 复制制造商数据
    if (this.manufacturerData) {
      cloned.manufacturerData = this.manufacturerData.slice(0);
    }

    // 复制服务数据
    for (const [serviceId, data] of this.serviceData) {
      cloned.serviceData.set(serviceId, data.slice(0));
    }

    // 复制特征值
    for (const [key, characteristic] of this.characteristics) {
      cloned.characteristics.set(key, { ...characteristic });
    }

    // 复制订阅的特征值
    cloned.subscribedCharacteristics = new Set(this.subscribedCharacteristics);

    // 复制元数据
    cloned.metadata = { ...this.metadata };

    return cloned;
  }

  /**
   * 重置设备状态
   */
  public reset(): void {
    this.state = BluetoothDeviceState.DISCONNECTED;
    this.services = [];
    this.characteristics.clear();
    this.subscribedCharacteristics.clear();
    this.lastConnected = undefined;
    this.lastDisconnected = undefined;
    this.serviceData.clear();
    this.manufacturerData = undefined;
    this.metadata = {};
  }

  /**
   * 序列化为JSON
   */
  public toJSON(): {
    id: string;
    name: string;
    address: string;
    type: BluetoothDeviceType;
    state: BluetoothDeviceState;
    rssi: number;
    connectable: boolean;
    services: string[];
    lastConnected?: string;
    lastDisconnected?: string;
    metadata: Record<string, any>;
  } {
    return {
      id: this.id,
      name: this.name,
      address: this.address,
      type: this.type,
      state: this.state,
      rssi: this.rssi,
      connectable: this.connectable,
      services: this.services,
      lastConnected: this.lastConnected?.toISOString(),
      lastDisconnected: this.lastDisconnected?.toISOString(),
      metadata: this.metadata
    };
  }

  /**
   * 从JSON创建设备实例
   */
  public static fromJSON(json: any): BluetoothDevice {
    const device = new BluetoothDevice(
      json.id,
      json.name,
      json.address,
      json.type
    );

    device.state = json.state;
    device.rssi = json.rssi;
    device.connectable = json.connectable;
    device.services = json.services || [];
    device.metadata = json.metadata || {};

    if (json.lastConnected) {
      device.lastConnected = new Date(json.lastConnected);
    }

    if (json.lastDisconnected) {
      device.lastDisconnected = new Date(json.lastDisconnected);
    }

    return device;
  }

  // 私有方法

  /**
   * 解析广播数据
   */
  private parseAdvertisementData(): void {
    if (this.advertisementData.byteLength === 0) {
      return;
    }

    try {
      const data = new Uint8Array(this.advertisementData);
      let offset = 0;

      while (offset < data.length) {
        const length = data[offset++];
        if (length === 0 || offset + length > data.length) {
          break;
        }

        const type = data[offset++];
        const payload = data.slice(offset, offset + length - 1);
        offset += length - 1;

        this.parseAdvertisementField(type, payload);
      }
    } catch (error) {
      console.warn('Failed to parse advertisement data:', error);
    }
  }

  /**
   * 解析广播字段
   */
  private parseAdvertisementField(type: number, payload: Uint8Array): void {
    switch (type) {
      case 0x02: // Incomplete List of 16-bit Service Class UUIDs
      case 0x03: // Complete List of 16-bit Service Class UUIDs
        this.parseServiceUUIDs(payload, 2);
        break;
      case 0x04: // Incomplete List of 32-bit Service Class UUIDs
      case 0x05: // Complete List of 32-bit Service Class UUIDs
        this.parseServiceUUIDs(payload, 4);
        break;
      case 0x06: // Incomplete List of 128-bit Service Class UUIDs
      case 0x07: // Complete List of 128-bit Service Class UUIDs
        this.parseServiceUUIDs(payload, 16);
        break;
      case 0x08: // Shortened Local Name
      case 0x09: // Complete Local Name
        this.name = new TextDecoder().decode(payload);
        break;
      case 0x0A: // Tx Power Level
        if (payload.length === 1) {
          this.metadata.txPowerLevel = payload[0];
        }
        break;
      case 0x16: // Service Data - 16-bit UUID
        if (payload.length >= 2) {
          const serviceId = this.bytesToUUID(payload.slice(0, 2));
          const data = payload.slice(2).buffer;
          this.setServiceData(serviceId, data);
        }
        break;
      case 0xFF: // Manufacturer Specific Data
        if (payload.length >= 2) {
          this.setManufacturerData(payload.buffer);
          this.metadata.manufacturerId = (payload[1] << 8) | payload[0];
        }
        break;
    }
  }

  /**
   * 解析服务UUID
   */
  private parseServiceUUIDs(payload: Uint8Array, uuidLength: number): void {
    for (let i = 0; i < payload.length; i += uuidLength) {
      const uuidBytes = payload.slice(i, i + uuidLength);
      const uuid = this.bytesToUUID(uuidBytes);
      this.addService(uuid);
    }
  }

  /**
   * 字节数组转UUID字符串
   */
  private bytesToUUID(bytes: Uint8Array): string {
    if (bytes.length === 2) {
      const value = (bytes[1] << 8) | bytes[0];
      return value.toString(16).padStart(4, '0');
    } else if (bytes.length === 4) {
      const value = (bytes[3] << 24) | (bytes[2] << 16) | (bytes[1] << 8) | bytes[0];
      return value.toString(16).padStart(8, '0');
    } else if (bytes.length === 16) {
      const hex = Array.from(bytes)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
      return `${hex.substr(0, 8)}-${hex.substr(8, 4)}-${hex.substr(12, 4)}-${hex.substr(16, 4)}-${hex.substr(20, 12)}`;
    }
    return '';
  }
}