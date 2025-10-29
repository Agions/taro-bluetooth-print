import Taro from "@tarojs/taro"
import { DeviceInfo } from "./types"

/**
 * 蓝牙通用服务类
 * 提供蓝牙设备的发现和连接功能
 */
export class BluetoothService {
  private devicesList: DeviceInfo[]

  constructor() {
    this.devicesList = []
  }

  /**
   * 初始化蓝牙适配器
   */
  public async initBluetoothAdapter(): Promise<any> {
    try {
      Taro.showLoading({ title: "正在初始化蓝牙适配器" })
      await this.closeBluetoothAdapter()
      const res = await Taro.openBluetoothAdapter()
      if ("errno" in res && res.errno === 10001) {
        return Promise.reject("当前蓝牙适配器不可用")
      }
      Taro.hideLoading()
      return res
    } catch (error) {
      Taro.hideLoading()
      const res = error as { errMsg?: string }
      if (res.errMsg !== "OK" && res.errMsg !== "openBluetoothAdapter:ok") {
        return Promise.reject({
          msg: res.errMsg,
          errMsg: "initBluetoothAdapter error",
        })
      }
      return Promise.reject(error)
    }
  }

  /**
   * 获取蓝牙适配器状态
   */
  public async getBluetoothAdapterState(): Promise<any> {
    return Taro.getBluetoothAdapterState()
  }

  /**
   * 打开蓝牙适配器
   */
  public async openBluetoothAdapter(): Promise<any> {
    try {
      const res = await Taro.openBluetoothAdapter()
      return res
    } catch (error) {
      const errRes = error as { errMsg?: string }
      return Promise.reject(errRes)
    }
  }

  /**
   * 关闭蓝牙适配器
   */
  public async closeBluetoothAdapter(): Promise<void> {
    try {
      await Taro.closeBluetoothAdapter()
      return Promise.resolve()
    } catch (error) {
      return Promise.reject(error)
    }
  }

  /**
   * 开始搜索蓝牙设备
   */
  public async startBluetoothDevicesDiscovery(): Promise<void> {
    try {
      const state = await this.getBluetoothAdapterState()
      // 先判断当前蓝牙适配器的状态
      if (!state.available) {
        await this.openBluetoothAdapter()
      }
      // 开始搜寻附近的蓝牙外围设备
      await Taro.startBluetoothDevicesDiscovery({
        allowDuplicatesKey: false,
      })
      return Promise.resolve()
    } catch (error) {
      return Promise.reject(error)
    }
  }

  /**
   * 停止蓝牙设备搜索
   */
  public async stopBluetoothDevicesDiscovery(): Promise<void> {
    try {
      await Taro.stopBluetoothDevicesDiscovery()
      return Promise.resolve()
    } catch (error) {
      return Promise.reject(error)
    }
  }

  /**
   * 获取蓝牙设备列表
   */
  public async getBluetoothDevices(): Promise<DeviceInfo[]> {
    try {
      const res = await Taro.getBluetoothDevices()
      // 正确转换Taro设备类型到我们的DeviceInfo类型
      this.devicesList = res.devices.map(device => ({
        id: device.deviceId, // IDeviceInfo需要id属性
        deviceId: device.deviceId,
        name: device.name || '',
        address: device.deviceId, // 使用deviceId作为地址
        rssi: device.RSSI || 0,
        available: true,
        services: device.advertisServiceUUIDs || [],
        connected: false,
        localName: device.localName,
        advertisementData: device.advertisData
      } as DeviceInfo))
      return this.devicesList
    } catch (error) {
      return Promise.reject(error)
    }
  }

  /**
   * 查找指定名称的蓝牙设备
   * @param targetDeviceName 目标设备名称
   */
  public async findTargetDeviceName(
    targetDeviceName: string
  ): Promise<DeviceInfo> {
    try {
      Taro.showLoading({ title: "正在配对设备" })

      if (!targetDeviceName) {
        Taro.hideLoading()
        return Promise.reject("请指定搜索的设备名称")
      }

      // 开始搜索蓝牙设备
      await this.startBluetoothDevicesDiscovery()

      // 获取所有蓝牙设备
      let retry = 0
      let targetDevice: DeviceInfo | undefined

      // 最多尝试10次，每次间隔1秒
      while (retry < 10) {
        const devices = await this.getBluetoothDevices()
        targetDevice = devices.find(
          (device) => device.name && device.name.includes(targetDeviceName)
        )

        if (targetDevice) {
          break
        }

        retry++
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }

      // 停止搜索
      await this.stopBluetoothDevicesDiscovery()
      Taro.hideLoading()

      if (!targetDevice) {
        return Promise.reject(`未找到名称包含 "${targetDeviceName}" 的蓝牙设备`)
      }

      return targetDevice
    } catch (error) {
      Taro.hideLoading()
      await this.stopBluetoothDevicesDiscovery()
      return Promise.reject(error)
    }
  }

  /**
   * 连接蓝牙设备
   * @param deviceId 设备ID
   */
  public async createBLEConnection(deviceId: string): Promise<void> {
    try {
      Taro.showLoading({ title: "正在连接设备" })
      await Taro.createBLEConnection({ deviceId })
      Taro.hideLoading()
      return Promise.resolve()
    } catch (error) {
      Taro.hideLoading()
      return Promise.reject(error)
    }
  }

  /**
   * 断开蓝牙设备连接
   * @param deviceId 设备ID
   */
  public async closeBLEConnection(deviceId: string): Promise<void> {
    try {
      await Taro.closeBLEConnection({ deviceId })
      return Promise.resolve()
    } catch (error) {
      return Promise.reject(error)
    }
  }

  /**
   * 获取蓝牙设备所有服务
   * @param deviceId 设备ID
   */
  public async getBLEDeviceServices(
    deviceId: string
  ): Promise<any> {
    try {
      const res = await Taro.getBLEDeviceServices({ deviceId })
      return res
    } catch (error) {
      return Promise.reject(error)
    }
  }

  /**
   * 获取蓝牙设备服务的特征值
   * @param deviceId 设备ID
   * @param serviceId 服务ID
   */
  public async getBLEDeviceCharacteristics(
    deviceId: string,
    serviceId: string
  ): Promise<any> {
    try {
      const res = await Taro.getBLEDeviceCharacteristics({
        deviceId,
        serviceId,
      })
      return res
    } catch (error) {
      return Promise.reject(error)
    }
  }
}
