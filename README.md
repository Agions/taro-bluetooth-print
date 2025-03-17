# taro-bluetooth-print

适用于Taro的蓝牙打印工具库，优化了图像处理和用户体验。

## 最新版本

[![npm version](https://img.shields.io/badge/npm-1.0.7-blue.svg)](https://www.npmjs.com/package/taro-bluetooth-print)

最新版本（1.0.7）新增了多项性能优化和用户体验增强功能，包括Web Worker图像处理、内存管理优化、相机组件等。详见[更新日志](./CHANGELOG.md)。

## 特性

- 蓝牙热敏打印机连接和通信
- Web Worker处理图像和OCR任务
- 内存自动释放和资源管理
- 相机拍照和图像预处理
- 离线支持和PWA特性
- 完全支持Taro多端开发

## 安装

```bash
npm install taro-bluetooth-print
```

## 功能亮点

### 性能优化
- Web Worker线程处理图像转换和OCR，不阻塞主线程
- 智能内存管理机制，自动释放资源
- 图像预处理优化，减小处理尺寸和提高识别速度
- 节流处理视频帧分析，避免过度计算
- 缓存识别结果，避免重复处理

### 用户体验增强
- 加载状态反馈和进度指示
- 相机引导UI和识别区域框架
- 友好的错误处理和解决建议
- 自适应相机设置
- 离线使用支持（PWA）

## 使用方法

### 基本使用

```tsx
import { PrinterManager } from 'taro-bluetooth-print';

// 初始化打印管理器
const printerManager = new PrinterManager();

// 搜索蓝牙设备
await printerManager.startDeviceScan();

// 连接设备
await printerManager.connect('XX:XX:XX:XX:XX:XX');

// 打印文本
await printerManager.printText('Hello, 世界!');

// 断开连接
await printerManager.disconnect();
```

### 打印图像

```tsx
import { PrinterManager, OptimizedPrinterImage } from 'taro-bluetooth-print';

// 初始化优化图像处理
await OptimizedPrinterImage.initializeWorker('/workers/image-worker.js');

// 打印图像
const imageUrl = 'https://example.com/image.jpg';
await printerManager.printImage(imageUrl, {
  maxWidth: 384,
  threshold: 128,
  dithering: true,
  align: 'center'
});
```

### 相机组件使用

```tsx
import { Component } from 'react'
import { View, Button } from '@tarojs/components'
import { Camera } from 'taro-bluetooth-print/lib/components/taro-camera'
import { PrinterManager } from 'taro-bluetooth-print'

export default class CameraPage extends Component {
  printerManager = new PrinterManager()
  camera = null
  
  handleCameraReady = (camera) => {
    this.camera = camera
  }
  
  captureAndPrint = async () => {
    if (!this.camera) return
    
    // 捕获图像
    const imageData = await this.camera.captureFrame()
    
    // 转换为base64
    const canvas = document.createElement('canvas')
    canvas.width = imageData.width
    canvas.height = imageData.height
    const ctx = canvas.getContext('2d')
    ctx.putImageData(imageData, 0, 0)
    
    const base64Image = canvas.toDataURL('image/jpeg')
    
    // 打印图像
    await this.printerManager.printImage(base64Image)
  }
  
  render () {
    return (
      <View className='camera-page'>
        <Camera 
          onReady={this.handleCameraReady}
          showGuideBox={true}
        />
        <Button onClick={this.captureAndPrint}>
          拍照并打印
        </Button>
      </View>
    )
  }
}
```

## API文档

### PrinterManager

蓝牙打印机管理器，用于与打印机通信。

**方法**:
- `startDeviceScan()`: 开始扫描蓝牙设备
- `stopDeviceScan()`: 停止扫描蓝牙设备
- `connect(deviceId)`: 连接到特定设备
- `disconnect()`: 断开当前连接
- `printText(text, options)`: 打印文本
- `printImage(imageUrlOrBase64, options)`: 打印图像
- `printBarcode(data, options)`: 打印条形码
- `printQRCode(data, options)`: 打印二维码
- `printReceipt(data)`: 打印收据模板

### Camera

相机组件，用于视频捕获和图像处理。

**属性**:
- `facingMode`: 相机朝向 ('user'|'environment')
- `showGuideBox`: 是否显示辅助框
- `throttleInterval`: 帧处理节流间隔(毫秒)
- `autoAdjustSettings`: 是否自动调整相机参数

**方法**:
- `initialize()`: 初始化相机
- `captureFrame()`: 捕获当前帧
- `addFrameProcessor(id, processor)`: 添加帧处理器
- `switchCamera()`: 切换前后摄像头

### OptimizedPrinterImage

优化的图像处理类，使用Worker处理图像。

**方法**:
- `initializeWorker(workerUrl)`: 初始化Worker
- `processImage(imageUrl, options)`: 处理图像并生成打印命令
- `processBase64Image(base64, options)`: 处理Base64图像

## 平台支持

- H5: ✅ 完全支持
- 微信小程序: ⚠️ 部分支持 (无Web Worker和Service Worker)
- 支付宝小程序: ⚠️ 部分支持
- React Native: ✅ 支持
- 鸿蒙: ⚠️ 实验性支持

## 示例项目

查看 [example](./example) 目录获取完整示例。

```bash
# 克隆仓库
git clone https://github.com/你的用户名/taro-bluetooth-print.git

# 进入示例目录
cd taro-bluetooth-print/example

# 安装依赖
npm install

# 运行
npm run dev:h5
```

## 详细文档

详细实现细节和优化策略请参阅 [OPTIMIZATION.md](./OPTIMIZATION.md)

## 贡献指南

欢迎提交问题和Pull Request！在开始之前，请先阅读我们的[贡献指南](./CONTRIBUTING.md)。

## 许可证

MIT
