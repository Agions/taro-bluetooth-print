# Taro 蓝牙打印库 API 文档

本文档详细说明了 `taro-bluetooth-print` 库的所有 API，包括初始化、蓝牙管理和打印功能。

## 最近更新

### v1.0.8
- 添加了 `Platform` 类，用于跨平台功能检测
- 添加参数校验逻辑，提高代码健壮性
- 改进了 `BluetoothAdapter` 接口，确保跨平台兼容
- 优化了 `H5BluetoothAdapter` 的设备ID处理
- 添加了适配器方法的空值检查

### v1.0.5
- 添加了CHANGELOG.md文件，记录所有版本更新历史
- 优化了文档结构，提供更详细的修复说明
- 改进了API文档组织方式

### v1.0.4

该版本主要修复了多个TypeScript类型错误和接口不匹配问题，优化了代码结构和性能：

### 关键修复
- 修复了蓝牙适配器接口与实现之间的参数不匹配问题
  - 确保`adapter.write`方法调用时传递正确格式的参数
  - 修正了`BluetoothAdapter`接口中不存在的`getRSSI`方法调用
  - 修复了`BluetoothDevice`接口中不存在的`deviceClass`属性
- 合并了重复的`writeDataInChunks`方法实现，保留了功能更完整的版本
  - 保留了缓冲区池支持和重试机制
  - 优化了分块传输逻辑，提高了稳定性
- 修复了访问只读属性`RECOVERY_DELAY`的问题，使用`currentRecoveryDelay`替代
- 解决了重复定义问题，如`performanceConfig`和`currentRecoveryDelay`
- 修复了`currentQualityCheckInterval`属性不存在的问题，使用`qualityCheckInterval`替代

### 改进
- 优化了内存管理和缓冲区处理逻辑，减少内存占用
- 完善了错误处理和恢复机制，提高异常情况下的稳定性
- 提高了类型安全性，确保代码编译和运行时的一致性
- 改进了方法命名和参数传递的一致性，提高代码可读性和可维护性

### 兼容性
本次更新保持了API接口的完全兼容性，不需要修改现有的调用代码。

## 目录

- [初始化](#初始化)
- [蓝牙模块 (bluetooth)](#蓝牙模块-bluetooth)
  - [初始化蓝牙](#初始化蓝牙)
  - [搜索设备](#搜索设备)
  - [获取设备列表](#获取设备列表)
  - [连接设备](#连接设备)
  - [断开连接](#断开连接)
  - [获取服务](#获取服务)
  - [获取特征值](#获取特征值)
  - [读写数据](#读写数据)
  - [监听器](#蓝牙监听器)
- [打印模块 (printer)](#打印模块-printer)
  - [基本打印功能](#基本打印功能)
  - [文本打印](#文本打印)
  - [图片打印](#图片打印)
  - [条形码打印](#条形码打印)
  - [二维码打印](#二维码打印)
  - [收据打印](#收据打印)
  - [打印模板](#打印模板)
  - [工具方法](#工具方法)
- [类型定义](#类型定义)

## 初始化

### 创建打印实例

创建一个新的打印库实例。

```typescript
constructor(options?: PrinterOptions)
```

#### 参数

`options` - 可选的初始化配置

| 参数 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| debug | boolean | false | 是否开启调试模式 |
| encoding | string | 'GBK' | 字符编码，支持 'GBK'、'UTF-8' 等 |
| characterSet | string | 'CHINA' | 字符集 |
| beep | boolean | false | 打印完成是否蜂鸣提示 |
| paperWidth | number | 58 | 纸张宽度（mm），支持 58/80mm |
| autoCut | boolean | true | 打印完成是否自动切纸 |

#### 示例

```typescript
import TaroBluePrint from 'taro-bluetooth-print';

// 默认配置
const printer = new TaroBluePrint();

// 自定义配置
const printerWithOptions = new TaroBluePrint({
  debug: true,
  encoding: 'UTF-8',
  paperWidth: 80,
  autoCut: false
});
```

## 蓝牙模块 (bluetooth)

蓝牙模块负责设备的扫描、连接和管理。

### 初始化蓝牙

初始化蓝牙适配器。

```typescript
async init(): Promise<boolean>
```

#### 返回值

返回一个 Promise，解析为布尔值，表示初始化是否成功。

#### 示例

```typescript
const initialized = await printer.bluetooth.init();
if (initialized) {
  console.log('蓝牙初始化成功');
} else {
  console.log('蓝牙初始化失败');
}
```

### 搜索设备

开始搜索蓝牙设备。

```typescript
async startDiscovery(options?: DiscoveryOptions): Promise<boolean>
```

#### 参数

`options` - 可选的搜索配置

| 参数 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| timeout | number | 10000 | 搜索超时时间（毫秒） |
| services | string[] | ['1812'] | 要搜索的服务 UUID |
| allowDuplicatesKey | boolean | false | 是否允许重复上报设备 |

#### 返回值

返回一个 Promise，解析为布尔值，表示搜索是否成功启动。

#### 示例

```typescript
// 默认配置
const started = await printer.bluetooth.startDiscovery();

// 自定义配置
const startedCustom = await printer.bluetooth.startDiscovery({
  timeout: 15000,
  services: ['1812', '180F'],
  allowDuplicatesKey: true
});
```

### 停止搜索

停止搜索蓝牙设备。

```typescript
async stopDiscovery(): Promise<boolean>
```

#### 返回值

返回一个 Promise，解析为布尔值，表示停止搜索是否成功。

#### 示例

```typescript
const stopped = await printer.bluetooth.stopDiscovery();
```

### 获取设备列表

获取已发现的蓝牙设备列表。

```typescript
async getDiscoveredDevices(): Promise<BluetoothDevice[]>
```

#### 返回值

返回一个 Promise，解析为已发现的蓝牙设备数组。

#### 示例

```typescript
const devices = await printer.bluetooth.getDiscoveredDevices();
console.log(`发现了 ${devices.length} 个设备`);
```

### 连接设备

连接到指定的蓝牙设备。

```typescript
async connect(deviceId: string): Promise<boolean>
```

#### 参数

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| deviceId | string | 要连接的设备ID |

#### 返回值

返回一个 Promise，解析为布尔值，表示连接是否成功。

#### 示例

```typescript
const connected = await printer.bluetooth.connect('XX:XX:XX:XX:XX:XX');
if (connected) {
  console.log('设备连接成功');
} else {
  console.log('设备连接失败');
}
```

### 断开连接

断开当前蓝牙连接或指定设备的连接。

```typescript
async disconnect(deviceId?: string): Promise<boolean>
```

#### 参数

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| deviceId | string (可选) | 要断开连接的设备ID，如果不提供则断开当前连接 |

#### 返回值

返回一个 Promise，解析为布尔值，表示断开连接是否成功。

#### 示例

```typescript
// 断开当前连接
const disconnected = await printer.bluetooth.disconnect();

// 断开指定设备的连接
const disconnected = await printer.bluetooth.disconnect('XX:XX:XX:XX:XX:XX');
```
```

### 获取连接状态

获取当前蓝牙的连接状态。

```typescript
isConnected(): boolean
```

#### 返回值

返回布尔值，表示当前是否已连接到设备。

#### 示例

```typescript
const isConnected = printer.bluetooth.isConnected();
console.log(`当前连接状态: ${isConnected ? '已连接' : '未连接'}`);
```

### 获取服务

获取蓝牙设备的服务列表。

```typescript
async getServices(deviceId: string): Promise<any>
```

#### 参数

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| deviceId | string | 要获取服务的设备ID |

#### 返回值

返回一个 Promise，解析为服务列表。

#### 示例

```typescript
const services = await printer.bluetooth.getServices('XX:XX:XX:XX:XX:XX');
console.log(`设备有 ${services.length} 个服务`);
```

### 获取特征值

获取蓝牙设备服务的特征值列表。

```typescript
async getCharacteristics(deviceId: string, serviceId: string): Promise<any>
```

#### 参数

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| deviceId | string | 设备ID |
| serviceId | string | 服务ID |

#### 返回值

返回一个 Promise，解析为特征值列表。

#### 示例

```typescript
const characteristics = await printer.bluetooth.getCharacteristics('XX:XX:XX:XX:XX:XX', 'service-uuid');
console.log(`服务有 ${characteristics.length} 个特征值`);
```

### 读写数据

#### 读取数据

从蓝牙设备的特征值读取数据。

```typescript
async read(deviceId: string, serviceId: string, characteristicId: string): Promise<ArrayBuffer>
```

#### 参数

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| deviceId | string | 设备ID |
| serviceId | string | 服务ID |
| characteristicId | string | 特征值ID |

#### 返回值

返回一个 Promise，解析为包含读取数据的 ArrayBuffer。

#### 示例

```typescript
const data = await printer.bluetooth.read('XX:XX:XX:XX:XX:XX', 'service-uuid', 'characteristic-uuid');
console.log(`读取到 ${data.byteLength} 字节数据`);
```

#### 写入数据

向蓝牙设备的特征值写入数据。

```typescript
async write(deviceId: string, serviceId: string, characteristicId: string, data: ArrayBuffer): Promise<boolean>
```

#### 参数

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| deviceId | string | 设备ID |
| serviceId | string | 服务ID |
| characteristicId | string | 特征值ID |
| data | ArrayBuffer | 要写入的数据 |

#### 返回值

返回一个 Promise，解析为布尔值，表示写入是否成功。

#### 示例

```typescript
// 创建数据并发送
const data = new Uint8Array([0x1B, 0x40, 0x1B, 0x61, 0x01]).buffer; // ESC @ ESC a 1
const success = await printer.bluetooth.write('XX:XX:XX:XX:XX:XX', 'service-uuid', 'characteristic-uuid', data);

if (success) {
  console.log('数据发送成功');
} else {
  console.log('数据发送失败');
}
```

#### 直接写入数据（打印机专用）

这是一个简化的写入方法，为打印机设计，会自动检测并使用可写入的服务和特征值。

```typescript
async writeData(data: ArrayBuffer): Promise<boolean>
```

#### 参数

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| data | ArrayBuffer | 要写入的数据 |

#### 返回值

返回一个 Promise，解析为布尔值，表示写入是否成功。

#### 示例

```typescript
// 创建数据并发送
const data = new Uint8Array([0x1B, 0x40, 0x1B, 0x61, 0x01]).buffer; // ESC @ ESC a 1
const success = await printer.bluetooth.writeData(data);

if (success) {
  console.log('数据发送成功');
} else {
  console.log('数据发送失败');
}
```

### 蓝牙监听器

为蓝牙事件添加监听器。

```typescript
onDeviceFound(callback: (device: BluetoothDevice) => void): void
onConnectionStateChange(callback: (connected: boolean) => void): void
```

#### 参数

| 方法 | 回调参数 | 说明 |
| --- | --- | --- |
| onDeviceFound | device: BluetoothDevice | 发现新设备时触发 |
| onConnectionStateChange | connected: boolean | 连接状态变化时触发 |

#### 示例

```typescript
// 监听设备发现
printer.bluetooth.onDeviceFound((device) => {
  console.log(`发现设备: ${device.name || '未知设备'} (${device.deviceId})`);
});

// 监听连接状态变化
printer.bluetooth.onConnectionStateChange((connected) => {
  console.log(`连接状态变化: ${connected ? '已连接' : '已断开'}`);
});
```

## 打印模块 (printer)

打印模块负责所有打印功能，包括文本、图片、条码等。

### 基本打印功能

#### 初始化打印机

初始化打印机，设置默认参数。

```typescript
async init(): Promise<boolean>
```

#### 返回值

返回一个 Promise，解析为布尔值，表示初始化是否成功。

#### 示例

```typescript
await printer.printer.init();
```

#### 切纸

执行切纸操作。

```typescript
async cut(mode: 'full' | 'partial' = 'full'): Promise<boolean>
```

#### 参数

| 参数 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| mode | 'full' \| 'partial' | 'full' | 切纸模式：完全切纸或部分切纸 |

#### 返回值

返回一个 Promise，解析为布尔值，表示操作是否成功。

#### 示例

```typescript
// 完全切纸
await printer.printer.cut();

// 部分切纸
await printer.printer.cut('partial');
```

#### 打印并走纸

打印缓冲区内容并走纸指定行数。

```typescript
async feed(lines: number = 1): Promise<boolean>
```

#### 参数

| 参数 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| lines | number | 1 | 走纸行数 |

#### 返回值

返回一个 Promise，解析为布尔值，表示操作是否成功。

#### 示例

```typescript
// 走纸一行
await printer.printer.feed();

// 走纸三行
await printer.printer.feed(3);
```

#### 打印测试页

打印一个测试页，用于测试打印机是否正常工作。

```typescript
async printTestPage(): Promise<boolean>
```

#### 返回值

返回一个 Promise，解析为布尔值，表示操作是否成功。

#### 示例

```typescript
await printer.printer.printTestPage();
```

#### 发送打印命令

直接发送 ESC/POS 命令到打印机。

```typescript
async sendCommands(commands: number[] | Uint8Array): Promise<boolean>
```

#### 参数

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| commands | number[] \| Uint8Array | ESC/POS 命令数组或 Uint8Array |

#### 返回值

返回一个 Promise，解析为布尔值，表示操作是否成功。

#### 示例

```typescript
// 发送命令初始化打印机
const initCommand = [0x1B, 0x40]; // ESC @
await printer.printer.sendCommands(initCommand);
```

### 文本打印

#### 打印文本

打印文本内容，支持格式设置。

```typescript
async printText(text: string | TextOptions | (string | TextOptions)[], options?: TextOptions): Promise<boolean>
```

#### 参数

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| text | string \| TextOptions \| (string \| TextOptions)[] | 要打印的文本内容或文本选项对象，或它们的数组 |
| options | TextOptions | 文本打印选项 |

TextOptions 选项：

| 选项 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| text | string | | 文本内容（当第一个参数是对象时必需） |
| align | 'left' \| 'center' \| 'right' | 'left' | 文本对齐方式 |
| bold | boolean | false | 是否加粗 |
| doubleHeight | boolean | false | 是否倍高 |
| doubleWidth | boolean | false | 是否倍宽 |
| underline | boolean | false | 是否添加下划线 |
| fontType | 'A' \| 'B' \| 'C' | 'A' | 字体类型 |

#### 返回值

返回一个 Promise，解析为布尔值，表示操作是否成功。

#### 示例

```typescript
// 打印简单文本
await printer.printer.printText('Hello, World!');

// 打印带格式的文本
await printer.printer.printText('居中加粗文本', {
  align: 'center',
  bold: true
});

// 打印多行文本
await printer.printer.printText([
  '第一行',
  { text: '第二行加粗', bold: true },
  { text: '第三行右对齐', align: 'right' }
]);
```

#### 打印分隔线

打印一条分隔线。

```typescript
async printLine(char: string = '-', length?: number): Promise<boolean>
```

#### 参数

| 参数 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| char | string | '-' | 分隔线字符 |
| length | number | null | 分隔线长度，默认为打印纸宽度 |

#### 返回值

返回一个 Promise，解析为布尔值，表示操作是否成功。

#### 示例

```typescript
// 打印默认分隔线
await printer.printer.printLine();

// 打印自定义分隔线
await printer.printer.printLine('=');

// 打印指定长度分隔线
await printer.printer.printLine('-', 20);
```

### 图片打印

#### 打印图片

打印图片，支持网络图片、本地图片和Base64编码图片。

```typescript
async printImage(image: string, options?: ImageOptions): Promise<boolean>
```

#### 参数

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| image | string | 图片路径、URL 或 Base64 编码数据 |
| options | ImageOptions | 图片打印选项 |

ImageOptions 选项：

| 选项 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| maxWidth | number | 384 | 最大宽度（像素） |
| align | 'left' \| 'center' \| 'right' | 'center' | 图片对齐方式 |
| dithering | boolean | false | 是否启用抖动算法（提高黑白图片质量） |

#### 返回值

返回一个 Promise，解析为布尔值，表示操作是否成功。

#### 示例

```typescript
// 打印网络图片
await printer.printer.printImage('https://example.com/logo.png');

// 打印本地图片（小程序）
await printer.printer.printImage('wxfile://temp-file-path');

// 打印带设置的图片
await printer.printer.printImage('https://example.com/logo.png', {
  maxWidth: 300,
  align: 'center',
  dithering: true
});
```

### 条形码打印

#### 打印条形码

打印一维条形码。

```typescript
async printBarcode(data: string, options?: BarcodeOptions): Promise<boolean>
```

#### 参数

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| data | string | 条形码数据 |
| options | BarcodeOptions | 条形码打印选项 |

BarcodeOptions 选项：

| 选项 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| height | number | 80 | 条形码高度 |
| width | number | 2 | 条形码宽度 |
| position | 'none' \| 'above' \| 'below' \| 'both' | 'below' | 文本位置 |
| align | 'left' \| 'center' \| 'right' | 'center' | 对齐方式 |
| type | BarcodeType | 'CODE128' | 条形码类型 |

BarcodeType 支持的类型：
- 'UPC-A'
- 'UPC-E'
- 'EAN13'
- 'EAN8'
- 'CODE39'
- 'ITF'
- 'CODABAR'
- 'CODE93'
- 'CODE128'

#### 返回值

返回一个 Promise，解析为布尔值，表示操作是否成功。

#### 示例

```typescript
// 打印简单条形码
await printer.printer.printBarcode('123456789');

// 打印带设置的条形码
await printer.printer.printBarcode('123456789', {
  height: 100,
  width: 3,
  position: 'below',
  align: 'center',
  type: 'EAN13'
});
```

### 二维码打印

#### 打印二维码

打印二维码。

```typescript
async printQRCode(data: string, options?: QRCodeOptions): Promise<boolean>
```

#### 参数

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| data | string | 二维码数据 |
| options | QRCodeOptions | 二维码打印选项 |

QRCodeOptions 选项：

| 选项 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| size | number | 8 | 二维码尺寸因子 (1-16) |
| errorCorrection | 'L' \| 'M' \| 'Q' \| 'H' | 'M' | 纠错级别: 'L'(7%), 'M'(15%), 'Q'(25%), 'H'(30%) |
| align | 'left' \| 'center' \| 'right' | 'center' | 对齐方式 |

#### 返回值

返回一个 Promise，解析为布尔值，表示操作是否成功。

#### 示例

```typescript
// 打印简单二维码
await printer.printer.printQRCode('https://example.com');

// 打印带设置的二维码
await printer.printer.printQRCode('https://example.com', {
  size: 10,
  errorCorrection: 'H',
  align: 'center'
});
```

### 收据打印

#### 打印收据

打印完整的收据。

```typescript
async printReceipt(options: ReceiptOptions): Promise<boolean>
```

#### 参数

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| options | ReceiptOptions | 收据打印选项 |

ReceiptOptions 选项：

| 选项 | 类型 | 必需 | 说明 |
| --- | --- | --- | --- |
| title | string | 是 | 收据标题 |
| merchant | string | 是 | 商户名称 |
| address | string | 否 | 商户地址 |
| phone | string | 否 | 商户电话 |
| orderNo | string | 否 | 订单号 |
| items | ReceiptItem[] | 是 | 商品列表 |
| subtotal | number | 否 | 小计金额 |
| discount | number | 否 | 折扣金额 |
| tax | number | 否 | 税额 |
| total | number | 是 | 总金额 |
| payment | PaymentInfo | 否 | 支付信息 |
| date | string | 否 | 日期和时间 |
| operator | string | 否 | 操作员信息 |
| footer | string | 否 | 页脚文本 |
| qrcode | string | 否 | 二维码内容 |
| logo | string | 否 | 商户logo图片路径 |

ReceiptItem 类型：

| 属性 | 类型 | 必需 | 说明 |
| --- | --- | --- | --- |
| name | string | 是 | 商品名称 |
| price | number | 是 | 单价 |
| quantity | number | 是 | 数量 |
| discount | number | 否 | 折扣（0-1之间的小数） |

PaymentInfo 类型：

| 属性 | 类型 | 必需 | 说明 |
| --- | --- | --- | --- |
| method | string | 是 | 支付方式 |
| amount | number | 是 | 支付金额 |

#### 返回值

返回一个 Promise，解析为布尔值，表示操作是否成功。

#### 示例

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
  footer: '感谢您的惠顾，欢迎再次光临！'
});

// 打印详细收据
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

### 打印模板

#### 使用内置模板打印

使用预定义的模板打印内容。

```typescript
async printWithTemplate(templateName: string, data: any): Promise<boolean>
```

#### 参数

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| templateName | string | 模板名称 |
| data | any | 模板数据 |

#### 返回值

返回一个 Promise，解析为布尔值，表示操作是否成功。

#### 示例

```typescript
// 使用收据模板
await printer.printer.printWithTemplate('receipt', {
  title: '消费小票',
  merchant: '示例商店',
  items: [
    { name: '商品1', price: 10.5, quantity: 2 },
    { name: '商品2', price: 5.0, quantity: 1 }
  ],
  total: 26.0,
  date: '2023-09-28 15:30:45',
  footer: '感谢您的惠顾，欢迎再次光临！'
});
```

#### 创建自定义模板

创建和使用自定义打印模板。

```typescript
// 从 template 中导入基类
import { Template } from 'taro-bluetooth-print/dist/printer/template';

// 创建自定义模板类
class MyCustomTemplate extends Template {
  constructor(data: any) {
    super(data);
  }

  async build(): Promise<number[]> {
    // 实现模板构建逻辑
    const commands = [];
    
    // 添加标题
    commands.push(...this.textCommand(this.data.title, { 
      align: 'center', 
      bold: true 
    }));
    
    // 添加更多内容...
    
    return commands;
  }
}

// 使用自定义模板
const myTemplate = new MyCustomTemplate({ 
  title: '自定义模板标题',
  // 其他数据...
});

const commands = await myTemplate.build();
await printer.printer.sendCommands(commands);
```

### 工具方法

#### 设置字符集

设置打印机字符集。

```typescript
async setCharacterSet(charSet: string): Promise<boolean>
```

#### 参数

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| charSet | string | 字符集名称，如 'CHINA', 'USA', 'FRANCE' 等 |

#### 返回值

返回一个 Promise，解析为布尔值，表示操作是否成功。

#### 示例

```typescript
await printer.printer.setCharacterSet('CHINA');
```

#### 取消所有打印任务

取消队列中的所有打印任务。

```typescript
async cancel(): Promise<boolean>
```

#### 返回值

返回一个 Promise，解析为布尔值，表示操作是否成功。

#### 示例

```typescript
await printer.printer.cancel();
```

## 类型定义

### BluetoothDevice

蓝牙设备信息。

```typescript
interface BluetoothDevice {
  deviceId: string;       // 设备ID
  name?: string;          // 设备名称
  RSSI?: number;          // 信号强度
  advertisData?: ArrayBuffer; // 广播数据
  manufacturerData?: ArrayBuffer; // 厂商数据
  serviceData?: Array<{
    serviceId: string;
    data: ArrayBuffer;
  }>;
}
```

### TextOptions

文本打印选项。

```typescript
interface TextOptions {
  text?: string;
  align?: 'left' | 'center' | 'right';
  bold?: boolean;
  doubleHeight?: boolean;
  doubleWidth?: boolean;
  underline?: boolean;
  fontType?: 'A' | 'B' | 'C';
}
```

### ImageOptions

图片打印选项。

```typescript
interface ImageOptions {
  maxWidth?: number;
  align?: 'left' | 'center' | 'right';
  dithering?: boolean;
}
```

### BarcodeOptions

条形码打印选项。

```typescript
interface BarcodeOptions {
  height?: number;
  width?: number;
  position?: 'none' | 'above' | 'below' | 'both';
  align?: 'left' | 'center' | 'right';
  type?: BarcodeType;
}

type BarcodeType = 'UPC-A' | 'UPC-E' | 'EAN13' | 'EAN8' | 'CODE39' | 'ITF' | 'CODABAR' | 'CODE93' | 'CODE128';
```

### QRCodeOptions

二维码打印选项。

```typescript
interface QRCodeOptions {
  size?: number;
  errorCorrection?: 'L' | 'M' | 'Q' | 'H';
  align?: 'left' | 'center' | 'right';
}
```

### ReceiptOptions

收据打印选项。

```typescript
interface ReceiptOptions {
  title: string;
  merchant: string;
  address?: string;
  phone?: string;
  orderNo?: string;
  items: ReceiptItem[];
  subtotal?: number;
  discount?: number;
  tax?: number;
  total: number;
  payment?: PaymentInfo;
  date?: string;
  operator?: string;
  footer?: string;
  qrcode?: string;
  logo?: string;
}

interface ReceiptItem {
  name: string;
  price: number;
  quantity: number;
  discount?: number;
}

interface PaymentInfo {
  method: string;
  amount: number;
}
``` 