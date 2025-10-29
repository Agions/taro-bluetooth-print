/**
 * 蓝牙适配器核心实现
 */

import {
  IBluetoothAdapter,
  IBluetoothDevice,
  IBluetoothScanOptions,
  IBluetoothCharacteristic,
  BluetoothState,
  IBluetoothPlatformAdapter
} from './types';
import { EventEmitter } from 'events';

/**
 * 蓝牙适配器核心实现
 */
export class BluetoothAdapter extends EventEmitter implements IBluetoothAdapter {
  /** 适配器名称 */
  public readonly name: string;

  /** 蓝牙状态 */
  private state: BluetoothState = 'unavailable';

  /** 已发现的设备 */
  private devices: Map<string, IBluetoothDevice> = new Map();

  /** 已连接的设备 */
  private connectedDevices: Map<string, IBluetoothDevice> = new Map();

  /** 是否正在扫描 */
  private isScanning: boolean = false;

  /** 平台适配器 */
  private platformAdapter: IBluetoothPlatformAdapter;

  constructor(
    name: string,
    platformAdapter: IBluetoothPlatformAdapter
  ) {
    super();
    this.name = name;
    this.platformAdapter = platformAdapter;
  }

  /**
   * 获取蓝牙状态
   */
  public getState(): BluetoothState {
    return this.state;
  }

  /**
   * 检查蓝牙是否可用
   */
  public isAvailable(): boolean {
    return this.state === 'available';
  }

  /**
   * 获取已发现的设备
   */
  public getDiscoveredDevices(): IBluetoothDevice[] {
    return Array.from(this.devices.values());
  }

  /**
   * 获取已连接的设备
   */
  public getConnectedDevices(): IBluetoothDevice[] {
    return Array.from(this.connectedDevices.values());
  }

  /**
   * 扫描蓝牙设备
   */
  public async startScan(options?: IBluetoothScanOptions): Promise<void> {
    if (this.isScanning) {
      throw new Error('Scan already in progress');
    }

    if (!this.isAvailable()) {
      throw new Error('Bluetooth is not available');
    }

    try {
      this.isScanning = true;
      this.emit('scanStart');

      // 清空之前的设备列表
      this.devices.clear();

      // 调用平台适配器开始扫描
      // 注意：这里需要适配器接口支持
      this.emit('scanStarted');
    } catch (error) {
      this.isScanning = false;
      this.handleError('startScan', error);
      throw error;
    }
  }

  /**
   * 停止扫描
   */
  public async stopScan(): Promise<void> {
    if (!this.isScanning) {
      return;
    }

    try {
      this.isScanning = false;

      // 简化实现，移除平台适配器调用
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
    options?: any
  ): Promise<boolean> {
    const device = this.devices.get(deviceId);
    if (!device) {
      throw new Error(`Device ${deviceId} not found`);
    }

    if (this.connectedDevices.has(deviceId)) {
      return true; // 已经连接
    }

    try {
      this.emit('connectionStart', { deviceId });

      // 简化实现，更新连接状态
      device.connected = true;
      this.connectedDevices.set(deviceId, device);

      this.emit('deviceConnected', device);
      this.emit('connectionComplete', { deviceId, device });
      return true;
    } catch (error) {
      this.handleError('connect', error, { deviceId });
      this.emit('connectionFailed', { deviceId, error });
      throw error;
    }
  }

  /**
   * 断开设备连接
   */
  public async disconnect(deviceId: string): Promise<boolean> {
    const device = this.connectedDevices.get(deviceId);
    if (!device) {
      return false; // 未连接
    }

    try {
      this.emit('disconnectionStart', { deviceId });

      // 简化实现，更新连接状态
      device.connected = false;
      this.connectedDevices.delete(deviceId);

      this.emit('deviceDisconnected', device);
      this.emit('disconnectionComplete', { deviceId, device });
      return true;
    } catch (error) {
      this.handleError('disconnect', error, { deviceId });
      return false;
    }
  }

  /**
   * 断开所有设备连接
   */
  public async disconnectAll(): Promise<void> {
    const deviceIds = Array.from(this.connectedDevices.keys());

    await Promise.all(
      deviceIds.map(deviceId => this.disconnect(deviceId))
    );
  }

  /**
   * 发现服务
   */
  public async discoverServices(deviceId: string): Promise<string[]> {
    const device = this.connectedDevices.get(deviceId);
    if (!device) {
      throw new Error(`Device ${deviceId} is not connected`);
    }

    try {
      const services = await this.platformAdapter.discoverServices(deviceId);
      device.services = services;
      this.emit('servicesDiscovered', { deviceId, services });
      return services;
    } catch (error) {
      this.handleError('discoverServices', error, { deviceId });
      throw error;
    }
  }

  /**
   * 发现特征
   */
  public async discoverCharacteristics(
    deviceId: string,
    serviceId: string
  ): Promise<IBluetoothCharacteristic[]> {
    const device = this.connectedDevices.get(deviceId);
    if (!device) {
      throw new Error(`Device ${deviceId} is not connected`);
    }

    try {
      const characteristics = await this.platformAdapter.discoverCharacteristics(
        deviceId,
        serviceId
      );

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
    const device = this.connectedDevices.get(deviceId);
    if (!device) {
      throw new Error(`Device ${deviceId} is not connected`);
    }

    try {
      const value = await this.platformAdapter.readCharacteristic(
        deviceId,
        serviceId,
        characteristicId
      );

      this.emit('characteristicRead', {
        deviceId,
        serviceId,
        characteristicId,
        value
      });

      return value;
    } catch (error) {
      this.handleError('readCharacteristic', error, {
        deviceId,
        serviceId,
        characteristicId
      });
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
    const device = this.connectedDevices.get(deviceId);
    if (!device) {
      throw new Error(`Device ${deviceId} is not connected`);
    }

    try {
      await this.platformAdapter.writeCharacteristic(
        deviceId,
        serviceId,
        characteristicId,
        value
      );

      this.emit('characteristicWritten', {
        deviceId,
        serviceId,
        characteristicId,
        value
      });
    } catch (error) {
      this.handleError('writeCharacteristic', error, {
        deviceId,
        serviceId,
        characteristicId
      });
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
    const device = this.connectedDevices.get(deviceId);
    if (!device) {
      throw new Error(`Device ${deviceId} is not connected`);
    }

    try {
      await this.platformAdapter.subscribeCharacteristic(
        deviceId,
        serviceId,
        characteristicId
      );

      this.emit('characteristicSubscribed', {
        deviceId,
        serviceId,
        characteristicId
      });
    } catch (error) {
      this.handleError('subscribeCharacteristic', error, {
        deviceId,
        serviceId,
        characteristicId
      });
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
    const device = this.connectedDevices.get(deviceId);
    if (!device) {
      throw new Error(`Device ${deviceId} is not connected`);
    }

    try {
      await this.platformAdapter.unsubscribeCharacteristic(
        deviceId,
        serviceId,
        characteristicId
      );

      this.emit('characteristicUnsubscribed', {
        deviceId,
        serviceId,
        characteristicId
      });
    } catch (error) {
      this.handleError('unsubscribeCharacteristic', error, {
        deviceId,
        serviceId,
        characteristicId
      });
      throw error;
    }
  }

  /**
   * 获取设备信号强度
   */
  public async getRSSI(deviceId: string): Promise<number> {
    const device = this.devices.get(deviceId);
    if (!device) {
      throw new Error(`Device ${deviceId} not found`);
    }

    try {
      const rssi = await this.platformAdapter.getRSSI(deviceId);
      device.rssi = rssi;
      return rssi;
    } catch (error) {
      this.handleError('getRSSI', error, { deviceId });
      throw error;
    }
  }

  /**
   * 获取适配器配置
   */
  public getConfig(): IBluetoothAdapterConfig {
    return { ...this.config };
  }

  /**
   * 更新适配器配置
   */
  public updateConfig(config: Partial<IBluetoothAdapterConfig>): void {
    this.config = this.mergeConfig(config);
    this.emit('configUpdated', this.config);
  }

  /**
   * 重置适配器
   */
  public async reset(): Promise<void> {
    try {
      // 断开所有设备
      await this.disconnectAll();

      // 停止扫描
      if (this.isScanning) {
        await this.stopScan();
      }

      // 清空设备列表
      this.devices.clear();

      // 重置平台适配器
      await this.platformAdapter.reset();

      // 重新初始化
      await this.initialize();

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
      // 断开所有设备
      await this.disconnectAll();

      // 停止扫描
      if (this.isScanning) {
        await this.stopScan();
      }

      // 销毁平台适配器
      await this.platformAdapter.dispose();

      // 清理资源
      this.devices.clear();
      this.connectedDevices.clear();
      this.commandQueue = [];

      // 移除所有监听器
      this.removeAllListeners();

      this.emit('disposed');
    } catch (error) {
      this.handleError('dispose', error);
      throw error;
    }
  }

  // 私有方法

  /**
   * 合并配置
   */
  private mergeConfig(config?: Partial<IBluetoothAdapterConfig>): IBluetoothAdapterConfig {
    return {
      scanTimeout: 30000,
      connectionTimeout: 10000,
      maxConnectionAttempts: 3,
      autoReconnect: true,
      enableLogging: true,
      logLevel: 'info',
      services: [],
      ...config
    };
  }

  /**
   * 设置平台事件监听
   */
  private setupPlatformEventListeners(): void {
    // 设备发现事件
    this.platformAdapter.on('deviceDiscovered', (device: IBluetoothDevice) => {
      this.devices.set(device.id, device);
      this.emit('deviceDiscovered', device);
    });

    // 设备连接状态变化事件
    this.platformAdapter.on('deviceStateChanged', (event: {
      deviceId: string;
      state: BluetoothDeviceState;
    }) => {
      const device = this.devices.get(event.deviceId);
      if (device) {
        device.state = event.state;

        if (event.state === BluetoothDeviceState.CONNECTED) {
          this.connectedDevices.set(event.deviceId, device);
        } else if (event.state === BluetoothDeviceState.DISCONNECTED) {
          this.connectedDevices.delete(event.deviceId);
        }

        this.emit('deviceStateChanged', event);
      }
    });

    // 特征值通知事件
    this.platformAdapter.on('characteristicValueChanged', (event: {
      deviceId: string;
      serviceId: string;
      characteristicId: string;
      value: ArrayBuffer;
    }) => {
      this.emit('characteristicValueChanged', event);
    });

    // 蓝牙状态变化事件
    this.platformAdapter.on('stateChanged', (state: BluetoothState) => {
      this.state = state;
      this.emit('stateChanged', state);
    });

    // 错误事件
    this.platformAdapter.on('error', (error: Error) => {
      this.handleError('platform', error);
    });
  }

  /**
   * 更新蓝牙状态
   */
  private async updateBluetoothState(): Promise<void> {
    try {
      this.state = await this.platformAdapter.getState();
      this.emit('stateChanged', this.state);
    } catch (error) {
      this.state = BluetoothState.UNAVAILABLE;
      this.handleError('updateBluetoothState', error);
    }
  }

  /**
   * 处理错误
   */
  private handleError(operation: string, error: any, context?: any): void {
    if (this.config.enableLogging) {
      console.error(`BluetoothAdapter [${this.name}] ${operation} error:`, error, context);
    }

    this.emit('error', {
      operation,
      error,
      context,
      timestamp: new Date()
    });
  }

  /**
   * 执行命令
   */
  private async executeCommand(command: IBluetoothCommand): Promise<any> {
    const { type, deviceId, data, options } = command;

    switch (type) {
      case BluetoothCommandType.CONNECT:
        return await this.connect(deviceId!, options as IBluetoothConnectionOptions);

      case BluetoothCommandType.DISCONNECT:
        return await this.disconnect(deviceId!);

      case BluetoothCommandType.READ_CHARACTERISTIC:
        return await this.readCharacteristic(
          deviceId!,
          data!.serviceId,
          data!.characteristicId
        );

      case BluetoothCommandType.WRITE_CHARACTERISTIC:
        return await this.writeCharacteristic(
          deviceId!,
          data!.serviceId,
          data!.characteristicId,
          data!.value
        );

      case BluetoothCommandType.SUBSCRIBE_CHARACTERISTIC:
        return await this.subscribeCharacteristic(
          deviceId!,
          data!.serviceId,
          data!.characteristicId
        );

      case BluetoothCommandType.UNSUBSCRIBE_CHARACTERISTIC:
        return await this.unsubscribeCharacteristic(
          deviceId!,
          data!.serviceId,
          data!.characteristicId
        );

      case BluetoothCommandType.DISCOVER_SERVICES:
        return await this.discoverServices(deviceId!);

      case BluetoothCommandType.DISCOVER_CHARACTERISTICS:
        return await this.discoverCharacteristics(deviceId!, data!.serviceId);

      default:
        throw new Error(`Unknown command type: ${type}`);
    }
  }
}