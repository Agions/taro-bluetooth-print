# Taro 蓝牙打印库

一个基于 Taro.js 的跨平台蓝牙打印库，支持微信小程序、H5、React Native 和鸿蒙等多平台，支持 ESC/POS 指令，可用于连接蓝牙打印机并发送打印数据。

<p align="center">
  <img src="https://img.shields.io/npm/v/taro-bluetooth-print" alt="npm version">
  <img src="https://img.shields.io/npm/l/taro-bluetooth-print" alt="license">
  <img src="https://img.shields.io/npm/dt/taro-bluetooth-print" alt="downloads">
</p>

## 📑 目录

- [特性](#特性)
- [安装](#安装)
- [快速开始](#快速开始)
- [详细使用示例](#详细使用示例)
  - [基本使用](#基本使用)
  - [打印文本](#打印文本)
  - [打印图片](#打印图片)
  - [打印收据](#打印收据)
  - [打印条形码](#打印条形码)
  - [打印二维码](#打印二维码)
  - [使用打印模板](#使用打印模板)
- [配置项](#配置项)
- [平台支持](#平台支持)
- [常见问题](#常见问题)
- [实际应用场景](#实际应用场景)
- [API 文档](#api-文档)
- [贡献指南](#贡献指南)
- [许可证](#许可证)

## 🔄 最近更新

### v1.0.5 (2024-03-14)

#### 文档
- 添加了CHANGELOG.md文件，记录所有版本更新历史
- 优化了文档结构，提供更详细的修复说明
- 改进了API文档，更新了最近版本的修复内容描述

### v1.0.4 (2024-03-13)

#### 修复
- 修复了多个TypeScript类型错误和接口不匹配的问题
  - 修复了`adapter.write`方法的参数调用不匹配问题
  - 修正了`BluetoothAdapter`接口中不存在的`getRSSI`方法调用
  - 修复了`BluetoothDevice`接口中不存在的`deviceClass`属性
  - 修复了只读属性`RECOVERY_DELAY`的访问和修改问题
- 合并了重复的`writeDataInChunks`方法实现，保留了功能更完善的版本
- 解决了重复定义的问题，如`performanceConfig`、`currentRecoveryDelay`等
- 增加了缺失的`reconnectDelay`属性
- 修复了`currentQualityCheckInterval`属性不存在的问题，使用`qualityCheckInterval`代替

#### 改进
- 增强了蓝牙数据传输的稳定性
- 优化了内存使用和缓冲区管理
- 完善了错误处理和恢复机制
- 提高了代码质量和可维护性
- 增强了类型安全性，确保接口和实现之间的一致性

#### 其他
- 更新了API文档，添加了最近修复的内容说明
- 代码结构优化，改进了方法命名和参数传递的一致性

## ✨ 特性

- 🌐 **多平台支持**：微信小程序、H5、React Native、鸿蒙OS
- 🖨️ **完整的 ESC/POS 支持**：兼容大多数热敏打印机
- 🔌 **简洁的 API**：易于使用的接口设计
- 📄 **多样化打印内容**：文本、图片、条形码、二维码、收据等
- 🎨 **文本格式化**：支持对齐、加粗、下划线等多种格式
- 📋 **模板系统**：内置打印模板，方便重用
- 📱 **TypeScript 支持**：完整的类型定义

## 📦 安装

```bash
# 使用 npm
npm install taro-bluetooth-print --save

# 使用 yarn
yarn add taro-bluetooth-print

# 使用 pnpm
pnpm add taro-bluetooth-print
```

## 🚀 快速开始

只需几行代码，即可实现打印功能：

```typescript
import Taro from '@tarojs/taro';
import TaroBluePrint from 'taro-bluetooth-print';

// 初始化打印库
const printer = new TaroBluePrint();

// 连接打印机并打印
async function printDemo() {
  // 初始化蓝牙
  await printer.bluetooth.init();
  
  // 连接到打印机（示例ID，实际使用时需要先扫描获取）
  const connected = await printer.bluetooth.connect('你的打印机ID');
  
  if (connected) {
    // 打印文本
    await printer.printer.printText('Hello, Taro Print!');
    
    // 切纸并结束
    await printer.printer.cut();
    
    // 断开连接
    await printer.bluetooth.disconnect();
  }
}
```

## 📝 详细使用示例

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
// 基本文本打印
await printer.printer.printText('Hello, World!');

// 带格式的文本打印
await printer.printer.printText('居中加粗大字体', {
  align: 'center',   // 对齐方式: 'left' | 'center' | 'right'
  bold: true,        // 是否加粗
  doubleHeight: true, // 是否倍高
  doubleWidth: false, // 是否倍宽
  underline: false,  // 是否添加下划线
  fontType: 'A'      // 字体类型: 'A' | 'B' | 'C'
});

// 打印多行文本
await printer.printer.printText([
  '第一行文本',
  { text: '第二行加粗文本', bold: true },
  { text: '第三行右对齐文本', align: 'right' }
]);
```

### 打印图片

```typescript
// 打印网络图片
await printer.printer.printImage('https://example.com/logo.png', {
  maxWidth: 300,     // 最大宽度（像素）
  dithering: true    // 是否启用抖动算法（提高黑白图片质量）
});

// 打印本地图片（小程序）
const tempFilePath = 'wxfile://temp-file-path';
await printer.printer.printImage(tempFilePath);

// 打印Base64图片
await printer.printer.printImage('data:image/png;base64,...', {
  maxWidth: 300
});
```

### 打印收据

```typescript
// 打印简单收据
await printer.printer.printReceipt({
  title: '消费小票',
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

// 打印带有更多信息的收据
await printer.printer.printReceipt({
  title: '消费小票',
  merchant: '示例商店',
  address: '北京市朝阳区xx路xx号',
  phone: '010-12345678',
  orderNo: 'ORD12345678',
  items: [
    { name: '商品1', price: 10.5, quantity: 2 },
    { name: '商品2', price: 5.0, quantity: 1 },
    { name: '商品3（八折优惠）', price: 20.0, quantity: 1, discount: 0.8 }
  ],
  subtotal: 41.0,
  discount: 4.0,
  tax: 3.7,
  total: 40.7,
  payment: {
    method: '微信支付',
    amount: 40.7
  },
  date: '2023-09-28 15:30:45',
  operator: '收银员: 张三',
  footer: '感谢您的惠顾，欢迎再次光临！\n请保留小票作为退换凭证',
  qrcode: 'https://example.com/receipt/12345',
  logo: 'https://example.com/logo.png'
});
```

### 打印条形码

```typescript
// 打印简单条形码
await printer.printer.printBarcode('123456789');

// 打印带有配置的条形码
await printer.printer.printBarcode('123456789', {
  height: 80,           // 高度，默认为 80
  width: 2,             // 宽度，默认为 2
  position: 'below',    // 文本位置: 'none' | 'above' | 'below' | 'both'
  align: 'center',      // 对齐方式: 'left' | 'center' | 'right'
  type: 'EAN13'         // 条码类型: 'UPC-A' | 'UPC-E' | 'EAN13' | 'EAN8' | 'CODE39' | 'ITF' | 'CODABAR' | 'CODE93' | 'CODE128'
});
```

### 打印二维码

```typescript
// 打印简单二维码
await printer.printer.printQRCode('https://example.com');

// 打印带有配置的二维码
await printer.printer.printQRCode('https://example.com', {
  size: 8,            // 尺寸因子 (1-16)，默认为 8
  errorCorrection: 'M', // 纠错级别: 'L'(7%) | 'M'(15%) | 'Q'(25%) | 'H'(30%)
  align: 'center'     // 对齐方式: 'left' | 'center' | 'right'
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

// 或者直接使用内置模板打印
await printer.printer.printWithTemplate('receipt', {
  title: '消费小票',
  merchant: '示例商店',
  // 其他数据...
});
```

## ⚙️ 配置项

### 初始化配置

```typescript
const printer = new TaroBluePrint({
  debug: true,              // 是否开启调试模式，默认 false
  encoding: 'GBK',          // 编码方式，支持 'GBK'、'UTF-8' 等，默认 'GBK'
  characterSet: 'CHINA',    // 字符集，默认 'CHINA'
  beep: false,              // 打印完成是否蜂鸣提示，默认 false
  paperWidth: 58,           // 纸张宽度（mm），默认 58mm，支持 58/80mm
  autoCut: true             // 打印完成是否自动切纸，默认 true
});
```

### 蓝牙配置

```typescript
// 蓝牙扫描配置
await printer.bluetooth.startDiscovery({
  timeout: 10000,           // 扫描超时时间（毫秒），默认 10000ms
  services: ['1812'],       // 要搜索的服务 UUID，默认打印服务 1812
  allowDuplicatesKey: false // 是否允许重复上报设备，默认 false
});
```

## 📱 平台支持

| 功能 | 微信小程序 | H5 | React Native | 鸿蒙OS |
| --- | :---: | :---: | :---: | :---: |
| 设备扫描 | ✅ | ✅* | ✅ | ✅ |
| 设备连接 | ✅ | ✅* | ✅ | ✅ |
| 文本打印 | ✅ | ✅ | ✅ | ✅ |
| 图片打印 | ✅ | ✅ | ✅ | ✅ |
| 条码打印 | ✅ | ✅ | ✅ | ✅ |
| 二维码打印 | ✅ | ✅ | ✅ | ✅ |

> **注意**：H5 环境需要支持 Web Bluetooth API 的浏览器。目前 Chrome、Edge、Opera 等基于 Chromium 的浏览器支持此功能，且需要在 HTTPS 环境下使用。Safari 不支持 Web Bluetooth API。

### 平台特殊配置

#### 微信小程序

需要在 `app.json` 中添加蓝牙相关权限：

```json
{
  "permission": {
    "scope.bluetooth": {
      "desc": "请求获取蓝牙权限用于连接打印机"
    }
  }
}
```

#### H5

H5 环境下，需要用户主动触发蓝牙操作（如点击按钮），不能自动调用蓝牙 API。

#### React Native

需要安装依赖：

```bash
npm install react-native-ble-plx --save
# 或
yarn add react-native-ble-plx
```

且需要在 Android 和 iOS 项目中进行相关权限配置。

## ❓ 常见问题

### Q: 为什么连接不到打印机？

A: 请检查以下几点：
1. 确保打印机已开启并处于可发现模式
2. 确保蓝牙已启用且权限已授予
3. 检查设备与打印机之间的距离
4. 尝试重启打印机
5. 有些打印机可能需要配对，请先在系统设置中配对

### Q: 为什么图片打印质量不佳？

A: 图片打印质量受多种因素影响：
1. 启用 `dithering: true` 选项可提高黑白图片质量
2. 调整 `maxWidth` 为打印机支持的最佳宽度（一般为 384 像素或更小）
3. 优先使用简单、清晰的图片，避免复杂的渐变和细节

### Q: 打印中文出现乱码怎么办？

A: 中文乱码通常是编码问题：
1. 确保初始化时使用正确的编码，对于中文通常使用 'GBK'：
   ```typescript
   const printer = new TaroBluePrint({ encoding: 'GBK' });
   ```
2. 确保设置了正确的字符集：
   ```typescript
   await printer.printer.setCharacterSet('CHINA');
   ```

### Q: 在H5环境下无法使用怎么办？

A:
1. 确保使用支持 Web Bluetooth API 的浏览器（Chrome、Edge、Opera等）
2. 确保在 HTTPS 环境下运行
3. 蓝牙操作必须由用户交互触发（如点击按钮）
4. 在某些操作系统（如macOS上的某些浏览器）可能存在限制

## 🔍 实际应用场景

### 零售小票打印

适用于商店、超市、餐厅等需要打印购物小票、订单小票的场景。

```typescript
// 打印小票示例
await printer.printer.printReceipt({
  title: '消费小票',
  merchant: '好又多超市',
  address: '北京市海淀区中关村大街1号',
  phone: '010-12345678',
  orderNo: 'ORD20230928001',
  items: [
    { name: '牛奶 250ml', price: 4.5, quantity: 2 },
    { name: '面包', price: 8.0, quantity: 1 },
    { name: '水果', price: 15.8, quantity: 1 }
  ],
  subtotal: 32.8,
  discount: 3.0,
  total: 29.8,
  payment: { method: '微信支付', amount: 29.8 },
  date: new Date().toLocaleString(),
  footer: '感谢您的惠顾，欢迎再次光临！'
});
```

### 物流快递标签

适用于物流公司、电商平台等需要打印快递标签的场景。

```typescript
// 打印快递标签
await printer.printer.printText('顺丰速运', { align: 'center', bold: true, doubleHeight: true });
await printer.printer.printLine();
await printer.printer.printText('收件人: 张三');
await printer.printer.printText('电话: 138****1234');
await printer.printer.printText('地址: 北京市朝阳区xxx路xxx号');
await printer.printer.printLine();
await printer.printer.printBarcode('SF1234567890', { height: 80, position: 'below' });
await printer.printer.printQRCode('SF1234567890');
await printer.printer.cut();
```

### 会员卡及优惠券

适用于商场、酒店、健身房等需要打印会员卡、优惠券的场景。

```typescript
// 打印会员卡
await printer.printer.printText('VIP会员卡', { align: 'center', bold: true, doubleHeight: true });
await printer.printer.printImage('https://example.com/vip-logo.png', { maxWidth: 300 });
await printer.printer.printText('会员姓名: 李四', { align: 'center' });
await printer.printer.printText('会员等级: 金卡会员', { align: 'center' });
await printer.printer.printText('有效期至: 2024-12-31', { align: 'center' });
await printer.printer.printQRCode('https://example.com/member/12345');
await printer.printer.printText('扫码查看会员权益', { align: 'center' });
await printer.printer.cut();
```

## 📚 API 文档

完整的 API 文档请参考：[API文档](docs/API.md)

## 🤝 贡献指南

非常欢迎您为 taro-bluetooth-print 项目贡献代码！以下是贡献的步骤：

1. Fork 本仓库
2. 创建您的特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交您的修改 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 打开一个 Pull Request

### 开发环境设置

```bash
# 克隆仓库
git clone https://github.com/agions/taro-bluetooth-print.git

# 安装依赖
cd taro-bluetooth-print
npm install

# 运行构建
npm run build
```

### 贡献类型

您可以通过多种方式贡献：
- 修复 bug
- 添加新特性
- 改进文档
- 优化性能
- 添加测试用例

## 📄 许可证

本项目采用 MIT 许可证 - 详见 [LICENSE](LICENSE) 文件
