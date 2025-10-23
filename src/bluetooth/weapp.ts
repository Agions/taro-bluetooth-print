import Taro from '@tarojs/taro';
import { BluetoothAdapter, BluetoothDevice } from './adapter';
import { logger } from '../utils/logger';

export class WeappBluetoothAdapter implements BluetoothAdapter {
  /**
   * 监听蓝牙状态变化
   * @param callback 回调函数
   */
  onBluetoothAdapterStateChange(callback: (state: { available: boolean, discovering: boolean }) => void): void {
    Taro.onBluetoothAdapterStateChange((res) => {
      callback({
        available: res.available,
        discovering: res.discovering
      });
    });
  }

  /**
   * 监听设备发现
   * @param callback 回调函数
   */
  onBluetoothDeviceFound(callback: (device: BluetoothDevice) => void): void {
    Taro.onBluetoothDeviceFound((res) => {
      const devices = res.devices || [];
      devices.forEach(device => {
        if (device) {
          callback({
            deviceId: device.deviceId,
            name: device.name || device.localName || '未知设备',
            deviceName: device.name || device.localName,
            RSSI: device.RSSI,
            localName: device.localName
          });
        }
      });
    });
  }

  /**
   * 监听连接状态变化
   * @param callback 回调函数
   */
  onBluetoothDeviceConnectionChange(callback: (deviceId: string, connected: boolean) => void): void {
    Taro.onBLEConnectionStateChange((res) => {
      callback(res.deviceId, res.connected);
    });
  }

  async initialize(): Promise<boolean> {
    try {
      await Taro.openBluetoothAdapter();
      return true;
    } catch (error) {
      logger.error('初始化蓝牙模块失败', error);
      return false;
    }
  }

  async getAdapterState(): Promise<any> {
    try {
      return await Taro.getBluetoothAdapterState();
    } catch (error) {
      logger.error('获取蓝牙适配器状态失败', error);
      throw error;
    }
  }

  async startDiscovery(): Promise<boolean> {
    try {
      await Taro.startBluetoothDevicesDiscovery({
        allowDuplicatesKey: false,
      });
      return true;
    } catch (error) {
      logger.error('开始搜索蓝牙设备失败', error);
      return false;
    }
  }

  async stopDiscovery(): Promise<boolean> {
    try {
      await Taro.stopBluetoothDevicesDiscovery();
      return true;
    } catch (error) {
      logger.error('停止搜索蓝牙设备失败', error);
      return false;
    }
  }

  async getDiscoveredDevices(): Promise<BluetoothDevice[]> {
    try {
      const res = await Taro.getBluetoothDevices();
      return (res.devices || []).map(device => ({
        deviceId: device.deviceId,
        name: device.name || device.localName || '未知设备',
        deviceName: device.name || device.localName,
        RSSI: device.RSSI,
        localName: device.localName
      }));
    } catch (error) {
      logger.error('获取已发现的蓝牙设备失败', error);
      return [];
    }
  }

  async connect(deviceId: string): Promise<boolean> {
    try {
      await Taro.createBLEConnection({
        deviceId
      });
      return true;
    } catch (error) {
      logger.error('连接蓝牙设备失败', error);
      return false;
    }
  }

  async disconnect(deviceId: string): Promise<boolean> {
    try {
      await Taro.closeBLEConnection({
        deviceId
      });
      return true;
    } catch (error) {
      logger.error('断开连接失败', error);
      return false;
    }
  }

  async getServices(deviceId: string): Promise<any> {
    try {
      return await Taro.getBLEDeviceServices({
        deviceId
      });
    } catch (error) {
      logger.error('获取服务失败', error);
      throw error;
    }
  }

  async getCharacteristics(deviceId: string, serviceId: string): Promise<any> {
    try {
      return await Taro.getBLEDeviceCharacteristics({
        deviceId,
        serviceId
      });
    } catch (error) {
      logger.error('获取特征值失败', error);
      throw error;
    }
  }

  async write(deviceId: string, serviceId: string, characteristicId: string, data: ArrayBuffer): Promise<boolean> {
    try {
      await Taro.writeBLECharacteristicValue({
        deviceId,
        serviceId,
        characteristicId,
        value: data
      });
      return true;
    } catch (error) {
      logger.error('写入数据失败', error);
      return false;
    }
  }

  async read(deviceId: string, serviceId: string, characteristicId: string): Promise<ArrayBuffer> {
    try {
      await Taro.readBLECharacteristicValue({
        deviceId,
        serviceId,
        characteristicId
      });

      // 微信小程序需要使用特定的 API 获取特征值
      return await new Promise<ArrayBuffer>((resolve) => {
        Taro.onBLECharacteristicValueChange((result) => {
          if (result.characteristicId === characteristicId) {
            resolve(result.value);
          }
        });
      });
    } catch (error) {
      logger.error('读取数据失败', error);
      throw error;
    }
  }

  async notifyCharacteristicValueChange(deviceId: string, serviceId: string, characteristicId: string, state: boolean): Promise<boolean> {
    try {
      await Taro.notifyBLECharacteristicValueChange({
        deviceId,
        serviceId,
        characteristicId,
        state
      });
      return true;
    } catch (error) {
      logger.error('监听特征值变化失败', error);
      return false;
    }
  }

  async destroy(): Promise<boolean> {
    try {
      await Taro.closeBluetoothAdapter();
      return true;
    } catch (error) {
      logger.error('销毁蓝牙适配器失败', error);
      return false;
    }
  }
}