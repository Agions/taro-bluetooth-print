import Taro from '@tarojs/taro';
import { typedArrayToBuffer } from './utils';
import { IBlueToothPrinter, DeviceInfo } from './types';
import { BluetoothService } from './bluetooth-service';

/**
 * 蓝牙打印机类
 * 提供打印机设备的连接和打印功能
 */
export class BluetoothPrinter extends BluetoothService {
  private deviceId: string | number;
  private serviceId: string;
  private characteristicId: string;
  private isWorking: boolean;

  /**
   * 创建打印机实例
   * @param options 配置选项
   */
  constructor(options: IBlueToothPrinter) {
    super();
    this.deviceId = options.deviceId || '';
    this.serviceId = options.serviceId || '';
    this.characteristicId = options.characteristicId || '';
    this.isWorking = false;
  }

  /**
   * 从设备名称自动连接蓝牙打印机
   * @param deviceName 设备名称
   */
  public async connectDeviceByName(deviceName: string): Promise<DeviceInfo> {
    try {
      // 初始化蓝牙适配器
      await this.initBluetoothAdapter();
      
      // 查找设备
      const device = await this.findTargetDeviceName(deviceName);
      
      // 连接设备
      await this.connectDevice(device.deviceId);
      
      return device;
    } catch (error) {
      return Promise.reject(error);
    }
  }

  /**
   * 连接蓝牙打印机设备
   * @param deviceId 设备ID
   */
  public async connectDevice(deviceId: string): Promise<void> {
    try {
      // 连接蓝牙设备
      await this.createBLEConnection(deviceId);
      this.deviceId = deviceId;
      
      // 获取所有服务
      const servicesRes = await this.getBLEDeviceServices(deviceId);
      
      // 检查是否有可用服务
      if (!servicesRes.services || servicesRes.services.length === 0) {
        return Promise.reject('未找到可用服务');
      }
      
      // 遍历服务获取特征值
      for (const service of servicesRes.services) {
        // 使用 uuid 作为 serviceId，因为 BLEService 类型使用 uuid 而非 serviceId
        const serviceId = service.uuid;
        const characteristicsRes = await this.getBLEDeviceCharacteristics(deviceId, serviceId);
        
        if (characteristicsRes.characteristics && characteristicsRes.characteristics.length > 0) {
          // 查找可写入的特征值
          const writableChar = characteristicsRes.characteristics.find(
            (char: { uuid: string; properties: { write?: boolean; writeNoResponse?: boolean } }) => 
              char.properties.write || char.properties.writeNoResponse
          );
          
          if (writableChar) {
            this.serviceId = serviceId;
            this.characteristicId = writableChar.uuid;
            return Promise.resolve();
          }
        }
      }
      
      return Promise.reject('未找到可写入的特征值');
    } catch (error) {
      return Promise.reject(error);
    }
  }

  /**
   * 打印文本
   * @param text 打印文本内容
   */
  public async printText(text: string): Promise<void> {
    try {
      if (!this.deviceId || !this.serviceId || !this.characteristicId) {
        return Promise.reject('设备未连接或参数不完整');
      }
      
      if (this.isWorking) {
        return Promise.reject('有正在进行的打印任务');
      }
      
      this.isWorking = true;
      
      // 将文本转换为ArrayBuffer
      const encoder = new TextEncoder();
      const buffer = encoder.encode(text);
      
      await this.writeData(buffer);
      this.isWorking = false;
      
      return Promise.resolve();
    } catch (error) {
      this.isWorking = false;
      return Promise.reject(error);
    }
  }

  /**
   * 打印ESC/POS指令
   * @param buffer ArrayBuffer数据
   */
  public async printEscCommand(buffer: ArrayBuffer | Uint8Array): Promise<void> {
    try {
      if (!this.deviceId || !this.serviceId || !this.characteristicId) {
        return Promise.reject('设备未连接或参数不完整');
      }
      
      if (this.isWorking) {
        return Promise.reject('有正在进行的打印任务');
      }
      
      this.isWorking = true;
      
      // 如果是TypedArray，转换为ArrayBuffer
      const arrayBuffer = buffer instanceof Uint8Array ? typedArrayToBuffer(buffer) : buffer;
      
      await this.writeData(arrayBuffer);
      this.isWorking = false;
      
      return Promise.resolve();
    } catch (error) {
      this.isWorking = false;
      return Promise.reject(error);
    }
  }

  /**
   * 写入数据到蓝牙设备
   * @param buffer 数据缓冲区
   */
  private async writeData(buffer: ArrayBuffer): Promise<void> {
    try {
      // 分块写入数据，每次写入最多20字节
      const CHUNK_SIZE = 20;
      const data = new Uint8Array(buffer);
      
      for (let i = 0; i < data.length; i += CHUNK_SIZE) {
        const chunk = data.slice(i, i + CHUNK_SIZE);
        await Taro.writeBLECharacteristicValue({
          deviceId: String(this.deviceId),
          serviceId: this.serviceId,
          characteristicId: this.characteristicId,
          value: typedArrayToBuffer(chunk),
        });
        
        // 等待一小段时间，避免数据发送过快
        await new Promise(resolve => setTimeout(resolve, 20));
      }
      
      return Promise.resolve();
    } catch (error) {
      return Promise.reject(error);
    }
  }

  /**
   * 关闭蓝牙连接
   */
  public async close(): Promise<void> {
    try {
      if (this.deviceId) {
        await this.closeBLEConnection(String(this.deviceId));
      }
      await this.closeBluetoothAdapter();
      return Promise.resolve();
    } catch (error) {
      return Promise.reject(error);
    }
  }
}
