/**
 * 蓝牙平台适配器抽象基类
 */

import { EventEmitter } from 'events';
import {
  IBluetoothPlatformAdapter,
  IBluetoothDevice,
  IBluetoothScanOptions,
  IBluetoothConnectionOptions,
  IBluetoothCharacteristic,
  BluetoothState,
  BluetoothDeviceState
} from './types';

/**
 * 蓝牙平台适配器抽象基类
 */
export abstract class BluetoothPlatformAdapter extends EventEmitter implements IBluetoothPlatformAdapter {
  /** 适配器名称 */
  public readonly name: string;

  /** 适配器版本 */
  public readonly version: string;

  /** 当前状态 */
  protected state: BluetoothState = BluetoothState.UNAVAILABLE;

  /** 是否已初始化 */
  protected initialized: boolean = false;

  /** 是否正在扫描 */
  protected isScanning: boolean = false;

  /** 已连接的设备ID集合 */
  protected connectedDevices: Set<string> = new Set();

  constructor(name: string, version: string = '1.0.0') {
    super();
    this.name = name;
    this.version = version;
  }

  /**
   * 初始化适配器
   */
  public async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      await this.doInitialize();
      this.initialized = true;
      this.emit('initialized');
    } catch (error) {
      this.handleError('initialize', error);
      throw error;
    }
  }

  /**
   * 获取蓝牙状态
   */
  public async getState(): Promise<BluetoothState> {
    if (!this.initialized) {
      return BluetoothState.UNAUTHORIZED;
    }

    try {
      this.state = await this.doGetState();
      return this.state;
    } catch (error) {
      this.handleError('getState', error);
      return BluetoothState.UNAVAILABLE;
    }
  }

  /**
   * 开始扫描设备
   */
  public async startScan(options?: IBluetoothScanOptions): Promise<void> {
    if (!this.initialized) {
      throw new Error('Adapter not initialized');
    }

    if (this.isScanning) {
      throw new Error('Scan already in progress');
    }

    if (this.state !== BluetoothState.POWERED_ON) {
      throw new Error('Bluetooth not powered on');
    }

    try {
      await this.doStartScan(options);
      this.isScanning = true;
      this.emit('scanStarted');
    } catch (error) {
      this.handleError('startScan', error);
      throw error;
    }
  }

  /**
   * 停止扫描设备
   */
  public async stopScan(): Promise<void> {
    if (!this.isScanning) {
      return;
    }

    try {
      await this.doStopScan();
      this.isScanning = false;
      this.emit('scanStopped');
    } catch (error) {
      this.handleError('stopScan', error);
      throw error;
    }
  }

  /**
   * 连接设备
   */
  public async connect(
    deviceId: string,
    options?: IBluetoothConnectionOptions
  ): Promise<void> {
    if (!this.initialized) {
      throw new Error('Adapter not initialized');
    }

    if (this.connectedDevices.has(deviceId)) {
      return; // 已连接
    }

    try {
      await this.doConnect(deviceId, options);
      this.connectedDevices.add(deviceId);
      this.emit('deviceConnected', deviceId);
      this.emit('deviceStateChanged', { deviceId, state: BluetoothDeviceState.CONNECTED });
    } catch (error) {
      this.handleError('connect', error, { deviceId });
      throw error;
    }
  }

  /**
   * 断开设备连接
   */
  public async disconnect(deviceId: string): Promise<void> {
    if (!this.connectedDevices.has(deviceId)) {
      return; // 未连接
    }

    try {
      await this.doDisconnect(deviceId);
      this.connectedDevices.delete(deviceId);
      this.emit('deviceDisconnected', deviceId);
      this.emit('deviceStateChanged', { deviceId, state: BluetoothDeviceState.DISCONNECTED });
    } catch (error) {
      this.handleError('disconnect', error, { deviceId });
      throw error;
    }
  }

  /**
   * 发现服务
   */
  public async discoverServices(deviceId: string): Promise<string[]> {
    this.ensureDeviceConnected(deviceId);

    try {
      const services = await this.doDiscoverServices(deviceId);
      this.emit('servicesDiscovered', { deviceId, services });
      return services;
    } catch (error) {
      this.handleError('discoverServices', error, { deviceId });
      throw error;
    }
  }

  /**
   * 发现特征值
   */
  public async discoverCharacteristics(
    deviceId: string,
    serviceId: string
  ): Promise<IBluetoothCharacteristic[]> {
    this.ensureDeviceConnected(deviceId);

    try {
      const characteristics = await this.doDiscoverCharacteristics(deviceId, serviceId);
      this.emit('characteristicsDiscovered', { deviceId, serviceId, characteristics });
      return characteristics;
    } catch (error) {
      this.handleError('discoverCharacteristics', error, { deviceId, serviceId });
      throw error;
    }
  }

  /**
   * 读取特征值
   */
  public async readCharacteristic(
    deviceId: string,
    serviceId: string,
    characteristicId: string
  ): Promise<ArrayBuffer> {
    this.ensureDeviceConnected(deviceId);

    try {
      const value = await this.doReadCharacteristic(deviceId, serviceId, characteristicId);
      this.emit('characteristicRead', { deviceId, serviceId, characteristicId, value });
      return value;
    } catch (error) {
      this.handleError('readCharacteristic', error, { deviceId, serviceId, characteristicId });
      throw error;
    }
  }

  /**
   * 写入特征值
   */
  public async writeCharacteristic(
    deviceId: string,
    serviceId: string,
    characteristicId: string,
    value: ArrayBuffer
  ): Promise<void> {
    this.ensureDeviceConnected(deviceId);

    try {
      await this.doWriteCharacteristic(deviceId, serviceId, characteristicId, value);
      this.emit('characteristicWritten', { deviceId, serviceId, characteristicId, value });
    } catch (error) {
      this.handleError('writeCharacteristic', error, { deviceId, serviceId, characteristicId });
      throw error;
    }
  }

  /**
   * 订阅特征值通知
   */
  public async subscribeCharacteristic(
    deviceId: string,
    serviceId: string,
    characteristicId: string
  ): Promise<void> {
    this.ensureDeviceConnected(deviceId);

    try {
      await this.doSubscribeCharacteristic(deviceId, serviceId, characteristicId);
      this.emit('characteristicSubscribed', { deviceId, serviceId, characteristicId });
    } catch (error) {
      this.handleError('subscribeCharacteristic', error, { deviceId, serviceId, characteristicId });
      throw error;
    }
  }

  /**
   * 取消订阅特征值通知
   */
  public async unsubscribeCharacteristic(
    deviceId: string,
    serviceId: string,
    characteristicId: string
  ): Promise<void> {
    this.ensureDeviceConnected(deviceId);

    try {
      await this.doUnsubscribeCharacteristic(deviceId, serviceId, characteristicId);
      this.emit('characteristicUnsubscribed', { deviceId, serviceId, characteristicId });
    } catch (error) {
      this.handleError('unsubscribeCharacteristic', error, { deviceId, serviceId, characteristicId });
      throw error;
    }
  }

  /**
   * 获取设备信号强度
   */
  public async getRSSI(deviceId: string): Promise<number> {
    try {
      const rssi = await this.doGetRSSI(deviceId);
      this.emit('rssiUpdated', { deviceId, rssi });
      return rssi;
    } catch (error) {
      this.handleError('getRSSI', error, { deviceId });
      throw error;
    }
  }

  /**
   * 重置适配器
   */
  public async reset(): Promise<void> {
    try {
      // 断开所有设备
      const deviceIds = Array.from(this.connectedDevices);
      await Promise.all(
        deviceIds.map(deviceId => this.disconnect(deviceId))
      );

      // 停止扫描
      if (this.isScanning) {
        await this.stopScan();
      }

      // 执行平台特定重置
      await this.doReset();

      this.emit('reset');
    } catch (error) {
      this.handleError('reset', error);
      throw error;
    }
  }

  /**
   * 销毁适配器
   */
  public async dispose(): Promise<void> {
    try {
      // 重置
      await this.reset();

      // 执行平台特定销毁
      await this.doDispose();

      this.initialized = false;
      this.removeAllListeners();
      this.emit('disposed');
    } catch (error) {
      this.handleError('dispose', error);
      throw error;
    }
  }

  /**
   * 检查适配器是否支持指定功能
   */
  public abstract isSupported(feature: string): boolean;

  /**
   * 获取适配器信息
   */
  public getInfo(): {
    name: string;
    version: string;
    state: BluetoothState;
    initialized: boolean;
    isScanning: boolean;
    connectedDevicesCount: number;
  } {
    return {
      name: this.name,
      version: this.version,
      state: this.state,
      initialized: this.initialized,
      isScanning: this.isScanning,
      connectedDevicesCount: this.connectedDevices.size
    };
  }

  // 抽象方法 - 子类必须实现

  protected abstract doInitialize(): Promise<void>;
  protected abstract doGetState(): Promise<BluetoothState>;
  protected abstract doStartScan(options?: IBluetoothScanOptions): Promise<void>;
  protected abstract doStopScan(): Promise<void>;
  protected abstract doConnect(deviceId: string, options?: IBluetoothConnectionOptions): Promise<void>;
  protected abstract doDisconnect(deviceId: string): Promise<void>;
  protected abstract doDiscoverServices(deviceId: string): Promise<string[]>;
  protected abstract doDiscoverCharacteristics(deviceId: string, serviceId: string): Promise<IBluetoothCharacteristic[]>;
  protected abstract doReadCharacteristic(deviceId: string, serviceId: string, characteristicId: string): Promise<ArrayBuffer>;
  protected abstract doWriteCharacteristic(deviceId: string, serviceId: string, characteristicId: string, value: ArrayBuffer): Promise<void>;
  protected abstract doSubscribeCharacteristic(deviceId: string, serviceId: string, characteristicId: string): Promise<void>;
  protected abstract doUnsubscribeCharacteristic(deviceId: string, serviceId: string, characteristicId: string): Promise<void>;
  protected abstract doGetRSSI(deviceId: string): Promise<number>;
  protected abstract doReset(): Promise<void>;
  protected abstract doDispose(): Promise<void>;

  // 受保护的辅助方法

  /**
   * 确保设备已连接
   */
  protected ensureDeviceConnected(deviceId: string): void {
    if (!this.connectedDevices.has(deviceId)) {
      throw new Error(`Device ${deviceId} is not connected`);
    }
  }

  /**
   * 处理设备发现
   */
  protected handleDeviceDiscovered(device: IBluetoothDevice): void {
    this.emit('deviceDiscovered', device);
  }

  /**
   * 处理特征值变化
   */
  protected handleCharacteristicValueChanged(
    deviceId: string,
    serviceId: string,
    characteristicId: string,
    value: ArrayBuffer
  ): void {
    this.emit('characteristicValueChanged', {
      deviceId,
      serviceId,
      characteristicId,
      value
    });
  }

  /**
   * 处理设备连接状态变化
   */
  protected handleDeviceStateChanged(
    deviceId: string,
    state: BluetoothDeviceState
  ): void {
    if (state === BluetoothDeviceState.CONNECTED) {
      this.connectedDevices.add(deviceId);
    } else {
      this.connectedDevices.delete(deviceId);
    }

    this.emit('deviceStateChanged', { deviceId, state });
  }

  /**
   * 处理蓝牙状态变化
   */
  protected handleStateChanged(state: BluetoothState): void {
    this.state = state;
    this.emit('stateChanged', state);
  }

  /**
   * 处理错误
   */
  protected handleError(operation: string, error: any, context?: any): void {
    console.error(`BluetoothPlatformAdapter [${this.name}] ${operation} error:`, error, context);
    this.emit('error', { operation, error, context, timestamp: new Date() });
  }

  /**
   * 将字节数组转换为十六进制字符串
   */
  protected bytesToHex(bytes: ArrayBuffer): string {
    const array = new Uint8Array(bytes);
    return Array.from(array)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  /**
   * 将十六进制字符串转换为字节数组
   */
  protected hexToBytes(hex: string): ArrayBuffer {
    const length = hex.length / 2;
    const array = new Uint8Array(length);
    for (let i = 0; i < length; i++) {
      array[i] = parseInt(hex.substr(i * 2, 2), 16);
    }
    return array.buffer;
  }

  /**
   * 将字符串转换为字节数组
   */
  protected stringToBytes(str: string): ArrayBuffer {
    return new TextEncoder().encode(str).buffer;
  }

  /**
   * 将字节数组转换为字符串
   */
  protected bytesToString(bytes: ArrayBuffer): string {
    return new TextDecoder().decode(bytes);
  }

  /**
   * 生成UUID
   */
  protected generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  /**
   * 检查权限
   */
  protected async checkPermissions(): Promise<boolean> {
    // 默认实现，子类可以重写
    return true;
  }

  /**
   * 请求权限
   */
  protected async requestPermissions(): Promise<boolean> {
    // 默认实现，子类可以重写
    return true;
  }

  /**
   * 检查功能支持
   */
  protected checkFeatureSupport(feature: string): boolean {
    // 默认实现，子类可以重写
    return true;
  }
}