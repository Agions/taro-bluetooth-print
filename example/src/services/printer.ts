import Taro from '@tarojs/taro'
import TaroBluePrint from 'taro-bluetooth-print'
import { LogLevel } from 'taro-bluetooth-print/dist/utils/logger'

// 打印服务单例
class PrinterService {
  private static instance: PrinterService
  private printer: TaroBluePrint
  private isInitialized: boolean = false

  private constructor() {
    this.printer = new TaroBluePrint()
  }

  // 获取单例
  static getInstance(): PrinterService {
    if (!PrinterService.instance) {
      PrinterService.instance = new PrinterService()
    }
    return PrinterService.instance
  }

  // 初始化打印服务
  async init(): Promise<boolean> {
    if (this.isInitialized) return true

    try {
      // 设置日志级别
      if (process.env.NODE_ENV === 'development') {
        // 注意：logger本身没有setLogLevel，而是在utils中独立导出的
        const { setLogLevel } = require('taro-bluetooth-print/dist/utils/logger')
        setLogLevel(LogLevel.DEBUG)
      }

      // 初始化蓝牙模块
      const result = await this.printer.bluetooth.init()
      this.isInitialized = result
      return result
    } catch (error) {
      console.error('初始化打印服务失败', error)
      return false
    }
  }

  // 扫描并连接打印机
  async scanAndConnect(): Promise<string | null> {
    if (!this.isInitialized) {
      const initResult = await this.init()
      if (!initResult) return null
    }

    try {
      await this.printer.bluetooth.startDiscovery()
      
      Taro.showLoading({ title: '搜索打印机...' })
      
      // 等待2秒钟搜索设备
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      const devices = await this.printer.bluetooth.getDiscoveredDevices()
      await this.printer.bluetooth.stopDiscovery()
      
      Taro.hideLoading()
      
      if (devices.length === 0) {
        Taro.showToast({ title: '未找到打印机', icon: 'none' })
        return null
      }
      
      // 显示设备列表让用户选择
      const list = devices.map(device => ({
        text: device.name || '未知设备',
        value: device.deviceId
      }))
      
      return new Promise((resolve) => {
        Taro.showActionSheet({
          itemList: list.map(item => item.text),
          success: async (res) => {
            const deviceId = list[res.tapIndex].value
            
            Taro.showLoading({ title: '连接中...' })
            const connected = await this.printer.bluetooth.connect(deviceId)
            Taro.hideLoading()
            
            if (connected) {
              Taro.showToast({ title: '连接成功' })
              resolve(deviceId)
            } else {
              Taro.showToast({ title: '连接失败', icon: 'none' })
              resolve(null)
            }
          },
          fail: () => {
            resolve(null)
          }
        })
      })
    } catch (error) {
      console.error('扫描连接出错', error)
      Taro.hideLoading()
      Taro.showToast({ title: '扫描连接失败', icon: 'none' })
      return null
    }
  }

  // 打印测试页
  async printTestPage(): Promise<boolean> {
    const deviceId = await this.scanAndConnect()
    if (!deviceId) return false
    
    try {
      Taro.showLoading({ title: '打印中...' })
      
      const result = await this.printer.printer.printTestPage()
      
      Taro.hideLoading()
      
      if (result) {
        Taro.showToast({ title: '打印成功' })
      } else {
        Taro.showToast({ title: '打印失败', icon: 'none' })
      }
      
      return result
    } catch (error) {
      console.error('打印测试页失败', error)
      Taro.hideLoading()
      Taro.showToast({ title: '打印失败', icon: 'none' })
      return false
    } finally {
      await this.printer.bluetooth.disconnect()
    }
  }

  // 打印文本
  async printText(text: string): Promise<boolean> {
    const deviceId = await this.scanAndConnect()
    if (!deviceId) return false
    
    try {
      Taro.showLoading({ title: '打印中...' })
      
      const result = await this.printer.printer.printText(text, {
        align: 'center',
        bold: true,
        doubleHeight: true
      })
      
      Taro.hideLoading()
      
      if (result) {
        Taro.showToast({ title: '打印成功' })
      } else {
        Taro.showToast({ title: '打印失败', icon: 'none' })
      }
      
      return result
    } catch (error) {
      console.error('打印文本失败', error)
      Taro.hideLoading()
      Taro.showToast({ title: '打印失败', icon: 'none' })
      return false
    } finally {
      await this.printer.bluetooth.disconnect()
    }
  }

  // 打印收据
  async printReceipt(): Promise<boolean> {
    const deviceId = await this.scanAndConnect()
    if (!deviceId) return false
    
    try {
      Taro.showLoading({ title: '打印中...' })
      
      const result = await this.printer.printer.printReceipt({
        title: '购物小票',
        merchant: '示例商店',
        items: [
          { name: '商品1', price: 10.5, quantity: 2 },
          { name: '商品2', price: 5.0, quantity: 1 },
          { name: '商品3', price: 8.0, quantity: 3 }
        ],
        total: 56.0,
        date: new Date().toLocaleString(),
        footer: '感谢您的惠顾，欢迎再次光临！'
      })
      
      Taro.hideLoading()
      
      if (result) {
        Taro.showToast({ title: '打印成功' })
      } else {
        Taro.showToast({ title: '打印失败', icon: 'none' })
      }
      
      return result
    } catch (error) {
      console.error('打印收据失败', error)
      Taro.hideLoading()
      Taro.showToast({ title: '打印失败', icon: 'none' })
      return false
    } finally {
      await this.printer.bluetooth.disconnect()
    }
  }

  // 获取打印实例（高级用法）
  getPrinter(): TaroBluePrint {
    return this.printer
  }

  // 在handlePermission方法中添加鸿蒙平台特殊处理
  async handlePermission() {
    // 现有代码...
    
    else if (process.env.TARO_ENV === 'harmony') {
      try {
        // 鸿蒙环境下请求权限
        await Taro.authorize({
          scope: 'ohos.permission.USE_BLUETOOTH'
        });
        await Taro.authorize({
          scope: 'ohos.permission.LOCATION'
        });
      } catch (error) {
        console.error('鸿蒙蓝牙权限请求失败', error);
        Taro.showToast({
          title: '蓝牙权限获取失败',
          icon: 'none'
        });
      }
    }
  }
}

export default PrinterService.getInstance() 