import { Component } from 'react'
import Taro from '@tarojs/taro'
import { View, Text, Button } from '@tarojs/components'
import printerService from '../../services/printer'
import './index.scss'

export default class Index extends Component {

  componentWillMount() {}

  componentDidMount() {
    // 初始化打印服务
    printerService.init().then(success => {
      if (!success) {
        Taro.showToast({
          title: '蓝牙初始化失败',
          icon: 'none'
        })
      }
    })
  }

  componentWillUnmount() {}

  componentDidShow() {}

  componentDidHide() {}

  // 处理蓝牙权限（主要针对 H5 和 RN 平台）
  async handlePermission() {
    if (process.env.TARO_ENV === 'h5') {
      try {
        Taro.showModal({
          title: '蓝牙权限',
          content: 'H5环境需要在HTTPS下使用，且仅支持Chrome、Edge等基于Chromium的浏览器',
          showCancel: false
        })
      } catch (error) {
        console.error('H5蓝牙权限处理失败', error)
      }
    } else if (process.env.TARO_ENV === 'rn') {
      try {
        // 在RN环境下请求权限
        await Taro.authorize({
          scope: 'scope.bluetooth'
        })
      } catch (error) {
        console.error('RN蓝牙权限请求失败', error)
        Taro.showToast({
          title: '蓝牙权限获取失败',
          icon: 'none'
        })
      }
    }
  }

  // 打印测试页
  handlePrintTest = async () => {
    await this.handlePermission()
    await printerService.printTestPage()
  }

  // 打印文本
  handlePrintText = async () => {
    await this.handlePermission()
    await printerService.printText('这是一条测试文本消息\n跨平台蓝牙打印示例\n')
  }

  // 打印收据
  handlePrintReceipt = async () => {
    await this.handlePermission()
    await printerService.printReceipt()
  }

  render() {
    return (
      <View className='index'>
        <View className='title'>
          <Text>跨平台蓝牙打印示例</Text>
        </View>
        <View className='description'>
          <Text>支持微信小程序、H5、React Native和鸿蒙等平台</Text>
        </View>
        
        <View className='button-group'>
          <Button 
            type='primary' 
            onClick={this.handlePrintTest}
            className='print-button'
          >
            打印测试页
          </Button>
          
          <Button 
            type='primary' 
            onClick={this.handlePrintText}
            className='print-button'
          >
            打印文本
          </Button>
          
          <Button 
            type='primary' 
            onClick={this.handlePrintReceipt}
            className='print-button'
          >
            打印小票
          </Button>
        </View>
        
        <View className='platform-info'>
          <Text>当前平台: {process.env.TARO_ENV}</Text>
        </View>
      </View>
    )
  }
} 