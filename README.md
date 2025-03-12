# Taro 蓝牙打印库

一个基于 Taro.js 的跨平台蓝牙打印库，支持微信小程序、H5、React Native 和鸿蒙等多平台，支持 ESC/POS 指令，可用于连接蓝牙打印机并发送打印数据。

## 特性

- 支持多平台：微信小程序、H5、React Native、鸿蒙OS
- 支持 ESC/POS 打印指令
- 提供简洁易用的 API
- 支持打印文本、图片、条形码、二维码、收据等
- 支持文本格式化（对齐、加粗、下划线等）
- 支持打印模板系统，便于重用
- TypeScript 支持

## 安装

```bash
npm install taro-bluetooth-print --save
# 或
yarn add taro-bluetooth-print
```

## 使用示例

### 基本使用

```typescript
import Taro from '@tarojs/taro';
import TaroBluePrint from 'taro-bluetooth-print';

// 初始化打印库
const printer = new TaroBluePrint();

// 扫描并连接打印机
async function scanAndConnect() {
  await printer.bluetooth.init();
  await printer.bluetooth.startDiscovery();
  
  Taro.showLoading({ title: '搜索打印机...' });
  
  // 等待2秒钟搜索设备
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  const devices = await printer.bluetooth.getDiscoveredDevices();
  await printer.bluetooth.stopDiscovery();
  
  Taro.hideLoading();
  
  if (devices.length === 0) {
    Taro.showToast({ title: '未找到打印机', icon: 'none' });
    return;
  }
  
  // 显示设备列表让用户选择
  const list = devices.map(device => ({
    text: device.name || '未知设备',
    value: device.deviceId
  }));
  
  Taro.showActionSheet({
    itemList: list.map(item => item.text),
    success: async (res) => {
      const deviceId = list[res.tapIndex].value;
      
      Taro.showLoading({ title: '连接中...' });
      const connected = await printer.bluetooth.connect(deviceId);
      Taro.hideLoading();
      
      if (connected) {
        Taro.showToast({ title: '连接成功' });
        
        // 打印测试页
        const printResult = await printer.printer.printTestPage();
        
        if (printResult) {
          Taro.showToast({ title: '打印成功' });
        } else {
          Taro.showToast({ title: '打印失败', icon: 'none' });
        }
        
        // 断开连接
        await printer.bluetooth.disconnect();
      } else {
        Taro.showToast({ title: '连接失败', icon: 'none' });
      }
    }
  });
}

// 调用扫描并连接
scanAndConnect();
```

### 打印文本

```typescript
await printer.printer.printText('Hello, World!', {
  align: 'center',
  bold: true,
  doubleHeight: true
});
```

### 打印图片

```typescript
await printer.printer.printImage('https://example.com/logo.png', {
  maxWidth: 300,
  dithering: true
});

// 或打印Base64图片
await printer.printer.printImage('data:image/png;base64,...', {
  maxWidth: 300
});
```

### 打印收据

```typescript
await printer.printer.printReceipt({
  title: '收据',
  merchant: '示例商店',
  items: [
    { name: '商品1', price: 10.5, quantity: 2 },
    { name: '商品2', price: 5.0, quantity: 1 }
  ],
  total: 26.0,
  date: '2023-09-28 15:30:45',
  footer: '感谢您的惠顾，欢迎再次光临！',
  logo: 'https://example.com/logo.png' // 可选
});
```

### 打印条形码

```typescript
await printer.printer.printBarcode('123456789', {
  height: 80,
  align: 'center'
});
```

### 打印二维码

```typescript
await printer.printer.printQRCode('https://example.com', {
  size: 8,
  align: 'center'
});
```

### 使用打印模板

```typescript
import { ReceiptTemplate } from 'taro-bluetooth-print/dist/printer/template';

// 创建收据模板
const receiptTemplate = new ReceiptTemplate({
  title: '收据',
  merchant: '示例商店',
  items: [
    { name: '商品1', price: 10.5, quantity: 2 },
    { name: '商品2', price: 5.0, quantity: 1 }
  ],
  total: 26.0,
  date: '2023-09-28 15:30:45',
  footer: '感谢您的惠顾，欢迎再次光临！'
});

// 构建模板命令
const commands = await receiptTemplate.build();

// 发送打印命令
await printer.printer.sendCommands(commands);
```

## API 文档

请查看完整的API文档以了解更多详情：[API文档](https://github.com/yourusername/taro-bluetooth-print/blob/main/docs/API.md)

## 平台支持

| 功能 | 微信小程序 | H5 | React Native | 鸿蒙OS |
| --- | --- | --- | --- | --- |
| 设备扫描 | ✓ | ✓* | ✓ | ✓ |
| 设备连接 | ✓ | ✓* | ✓ | ✓ |
| 文本打印 | ✓ | ✓ | ✓ | ✓ |
| 图片打印 | ✓ | ✓ | ✓ | ✓ |
| 条码打印 | ✓ | ✓ | ✓ | ✓ |
| 二维码打印 | ✓ | ✓ | ✓ | ✓ |

*注意：H5 环境需要支持 Web Bluetooth API 的浏览器。目前 Chrome、Edge、Opera 等基于 Chromium 的浏览器支持此功能，且需要在 HTTPS 环境下使用。

## 许可证

MIT

## 贡献

欢迎提交 Issue 和 PR！
