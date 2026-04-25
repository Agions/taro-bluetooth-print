# 快速开始

欢迎使用 `taro-bluetooth-print` —— 一款轻量级、高性能的跨平台蓝牙打印库。

## 简介

`taro-bluetooth-print` 是专为 Taro 框架设计的蓝牙热敏打印解决方案，帮助你在小程序、H5 和 React Native 中快速实现蓝牙打印功能。

### 为什么选择 taro-bluetooth-print？

- **零运行时依赖** —— 库本身不携带任何第三方运行时依赖，包体积极小，不会拖累你的应用加载速度
- **跨平台统一** —— 一套代码支持 7 个平台：微信、支付宝、百度、字节跳动、QQ 小程序，H5 Web Bluetooth，以及 React Native
- **链式 API** —— 直观的链式调用设计，像搭积木一样构建打印内容：`printer.text(...).feed().qr(...).cut().print()`
- **多协议驱动** —— 内置 ESC/POS（热敏票据）、TSPL（标签）、ZPL（工业标签）、CPCL（移动票据）、STAR 等主流打印协议驱动
- **TypeScript 优先** —— 完整的类型定义，编辑器自动补全体验优秀
- **生产就绪** —— 完善的错误处理、连接重试、打印队列、设备管理等功能

### 适用场景

| 场景 | 说明 |
|------|------|
| 🧾 票据打印 | 超市购物小票、餐饮订单、停车小票 |
| 🏷 标签打印 | 物流面单、商品价签、仓储标签 |
| 📱 移动收银 | 门店收银、外设扫码枪联动打印 |
| 🚚 配送打单 | 外卖配送单、快递网点打单 |

---

## 环境要求

| 依赖 | 版本要求 | 说明 |
|------|---------|------|
| Node.js | ≥ 18.0.0 | 构建工具链要求 |
| @tarojs/taro | ≥ 3.6.22 | 小程序平台**必须**，H5 / RN 平台可选 |
| TypeScript | ≥ 5.0.0 | 推荐，非强制 |

::: tip 关于 peer 依赖
`@tarojs/taro` 被声明为 **可选的** peer 依赖（`peerDependenciesMeta.optional: true`）。在 H5 环境中使用 Web Bluetooth 或在 React Native 环境中使用时，无需安装 `@tarojs/taro`。仅在小程序平台下它是必须的。
:::

---

## 安装

::: code-group

```bash [npm]
npm install taro-bluetooth-print
```

```bash [pnpm]
pnpm add taro-bluetooth-print
```

```bash [yarn]
yarn add taro-bluetooth-print
```

:::

安装完成后，即可在项目中导入核心模块：

```typescript
// 核心打印类与设备管理
import { BluetoothPrinter, DeviceManager } from 'taro-bluetooth-print';

// 工厂函数（快速创建实例）
import { createBluetoothPrinter, createWebBluetoothPrinter } from 'taro-bluetooth-print';

// 适配器（按需导入）
import { TaroAdapter, WebBluetoothAdapter, ReactNativeAdapter } from 'taro-bluetooth-print';

// 驱动（按需导入）
import { EscPos, TsplDriver, ZplDriver } from 'taro-bluetooth-print';
```

::: warning 小程序项目注意
如果你在小程序项目中使用，请确保已安装 `@tarojs/taro` 依赖：

```bash
npm install @tarojs/taro
```

Taro 脚手架创建的项目通常已包含此依赖，无需重复安装。
:::

---

## 第一次打印

下面我们通过一个完整的微信小程序示例，演示从「扫描设备」到「打印小票」的全流程。

### 第一步：配置权限

在使用蓝牙功能之前，需要在小程序配置文件中声明蓝牙权限。

**微信小程序** —— 在 `app.json` 或 `src/app.config.ts` 中添加：

```json
{
  "permission": {
    "scope.bluetooth": {
      "desc": "用于连接蓝牙打印机完成订单打印"
    }
  }
}
```

::: details 其他小程序平台权限配置

**支付宝小程序** —— `app.json`：

```json
{
  "permissions": {
    "bluetooth": {
      "desc": "用于连接蓝牙打印机"
    }
  }
}
```

**百度小程序** —— `app.json`：

```json
{
  "requiredPrivateInfos": ["chooseBluetoothDevice"]
}
```

**字节跳动小程序** —— `app.json`：

```json
{
  "permission": {
    "scope.bluetooth": {
      "desc": "用于连接蓝牙打印机"
    }
  }
}
```

:::

### 第二步：扫描与连接设备

使用 `DeviceManager` 扫描附近的蓝牙打印机，并建立连接：

```typescript
import { DeviceManager, BluetoothPrinter } from 'taro-bluetooth-print';

// 创建设备管理器实例
const deviceManager = new DeviceManager();

// 监听设备发现事件
deviceManager.on('device-found', (device) => {
  console.log('发现设备:', device.name, device.deviceId);
  // 可将 device 加入页面列表供用户选择
});

// 开始扫描，持续 10 秒
await deviceManager.startScan({ timeout: 10000 });

// 用户选择设备后，停止扫描
deviceManager.stopScan();
```

::: tip 如何识别打印机？
大多数蓝牙热敏打印机的设备名称包含关键词如 `Printer`、`打印`、`POS`、`58MM`、`80MM` 等。你可以根据名称前缀过滤扫描结果，只展示打印机设备给用户。
:::

### 第三步：打印内容

连接成功后，使用链式 API 构建并打印内容：

```typescript
// 创建打印机实例并连接到选定设备
const printer = new BluetoothPrinter();
await printer.connect(selectedDeviceId);  // [!code highlight]

// 构建打印内容 —— 链式调用
await printer
  // —— 标题区域 ——
  .align('center')                          // 居中对齐
  .setSize(2, 2)                            // 字体放大 2 倍
  .setBold(true)                            // 加粗
  .text('购物小票', 'GBK')                   // 使用 GBK 编码（推荐）
  .resetStyle()                             // 重置样式

  .feed()                                   // 空一行

  // —— 订单信息 ——
  .align('left')                            // 左对齐
  .text('订单号: 20260425001', 'GBK')
  .text('时间:   2026-04-25 20:00', 'GBK')
  .text('----------------------------', 'GBK')

  // —— 商品明细 ——
  .text('商品名称       数量    金额', 'GBK')
  .text('----------------------------', 'GBK')
  .text('农夫山泉        x2    ¥6.00', 'GBK')
  .text('方便面          x1    ¥5.50', 'GBK')
  .text('火腿肠          x3    ¥9.00', 'GBK')
  .text('----------------------------', 'GBK')

  // —— 合计 ——
  .setBold(true)
  .text('合计:                ¥20.50', 'GBK')
  .setBold(false)

  .feed()                                   // 空一行

  // —— 二维码 ——
  .align('center')
  .qr('https://shop.example.com/order/20260425001', {
    size: 6,                                // 二维码大小（模块数）
    errorCorrection: 'M',                   // 纠错等级: L / M / Q / H
  })

  .feed(3)                                  // 走纸 3 行（确保切纸位置正确）
  .cut()                                    // 切纸

  // 执行打印
  .print();                                 // [!code highlight]

// 打印完成后断开连接
await printer.disconnect();
```

::: warning 关于中文编码
大多数国产热敏打印机的默认字符编码为 **GBK**，而非 UTF-8。打印中文内容时请始终指定 `'GBK'` 编码，否则可能出现乱码或空白：

```typescript
// ✅ 正确
printer.text('欢迎光临', 'GBK');

// ❌ 大多数国产机型会出现乱码
printer.text('欢迎光临', 'UTF-8');
```

如果你的打印机是进口品牌（如 STAR、Zebra），可查阅其手册确认支持的编码格式。
:::

### 完整页面示例

将以上步骤组合到一个完整的 Taro 页面中：

```typescript
import Taro from '@tarojs/taro';
import { BluetoothPrinter, DeviceManager } from 'taro-bluetooth-print';

export default class PrintPage {
  state = {
    devices: [],       // 扫描到的设备列表
    connecting: false, // 连接中状态
    printing: false,   // 打印中状态
  };

  // 扫描蓝牙设备
  onScanDevices = async () => {
    const deviceManager = new DeviceManager();

    deviceManager.on('device-found', () => {
      this.setState({
        devices: deviceManager.getDiscoveredDevices(),
      });
    });

    await deviceManager.startScan({ timeout: 10000 });
    deviceManager.stopScan();
  };

  // 选择设备并打印
  onPrint = async (deviceId: string) => {
    this.setState({ printing: true });
    const printer = new BluetoothPrinter();

    try {
      // 连接设备
      await printer.connect(deviceId);

      // 打印小票
      await printer
        .align('center')
        .setSize(2, 2)
        .setBold(true)
        .text('购物小票', 'GBK')
        .resetStyle()
        .feed()
        .align('left')
        .text('订单号: 20260425001', 'GBK')
        .text('时间:   2026-04-25 20:00', 'GBK')
        .text('----------------------------', 'GBK')
        .text('农夫山泉        x2    ¥6.00', 'GBK')
        .text('方便面          x1    ¥5.50', 'GBK')
        .text('----------------------------', 'GBK')
        .setBold(true)
        .text('合计:                ¥20.50', 'GBK')
        .setBold(false)
        .feed()
        .align('center')
        .qr('https://shop.example.com/order/20260425001', { size: 6 })
        .feed(3)
        .cut()
        .print();

      Taro.showToast({ title: '打印成功', icon: 'success' });
    } catch (error) {
      console.error('打印失败:', error);
      Taro.showToast({ title: '打印失败', icon: 'error' });
    } finally {
      await printer.disconnect();
      this.setState({ printing: false });
    }
  };
}
```

---

## 使用工厂函数快速创建

除了手动 `new BluetoothPrinter()` 外，库还提供了便捷的工厂函数，可以一步完成适配器创建与打印机实例化：

### createBluetoothPrinter —— 小程序平台

```typescript
import { createBluetoothPrinter } from 'taro-bluetooth-print';

// 自动检测当前小程序平台并创建对应适配器
const printer = createBluetoothPrinter();

await printer.connect(deviceId);
await printer.text('Hello World', 'GBK').feed().cut().print();
await printer.disconnect();
```

### createWebBluetoothPrinter —— H5 平台

```typescript
import { createWebBluetoothPrinter } from 'taro-bluetooth-print';

// 弹出浏览器设备选择器，用户选择后自动连接
const printer = await createWebBluetoothPrinter({
  filters: [{ namePrefix: 'Printer' }],   // 过滤设备名称
});

await printer.text('Hello from Web!', 'UTF-8').feed().cut().print();
await printer.disconnect();
```

::: tip 提示
工厂函数会自动处理适配器实例化和平台检测，是推荐的使用方式。如果需要更细粒度的控制（如自定义适配器参数），可以继续使用 `new BluetoothPrinter(adapter)` 手动创建。
:::

---

## 平台专项说明

不同平台在使用蓝牙打印时，有各自的环境要求和注意事项。

### 微信小程序

| 项目 | 说明 |
|------|------|
| 基础库版本 | ≥ 2.9.2 |
| 权限声明 | `app.json` 中配置 `scope.bluetooth` |
| 真机调试 | 需要在手机上开启蓝牙权限 |
| 开发者工具 | 工具中蓝牙 API 为模拟，**必须真机调试** |

::: warning 微信开发者工具限制
微信开发者工具不支持真实的蓝牙 API，`openBluetoothAdapter` 等接口在模拟器中可能返回成功但无法发现真实设备。所有蓝牙功能**必须在真机上测试**。
:::

### 支付宝小程序

```json
// app.json 中声明蓝牙权限
{
  "permissions": {
    "bluetooth": { "desc": "用于连接蓝牙打印机" }
  }
}
```

支付宝小程序的蓝牙 API 命名与微信略有差异，但通过 `taro-bluetooth-print` 的适配层已完全抹平，使用方式完全一致。

### 百度 / 字节跳动 / QQ 小程序

这三个平台的蓝牙 API 与微信小程序高度相似，直接使用 `TaroAdapter` 即可：

```typescript
import { createBluetoothPrinter } from 'taro-bluetooth-print';

const printer = createBluetoothPrinter();
```

::: warning QQ 小程序
QQ 小程序对蓝牙 BLE 的支持取决于其基础库版本，部分低端机型可能存在兼容性问题。建议在目标机型上充分测试。
:::

### H5 Web Bluetooth

```typescript
import { createWebBluetoothPrinter } from 'taro-bluetooth-print';

// 弹出浏览器原生设备选择对话框
const printer = await createWebBluetoothPrinter();
```

| 要求 | 详情 |
|------|------|
| 浏览器 | Chrome 56+、Edge 79+、Opera 43+ |
| 协议 | **必须 HTTPS** 或 `localhost` |
| 交互 | 必须由用户手势（如点击按钮）触发 `requestDevice` |
| 不支持 | Safari、Firefox、所有 iOS 浏览器（受 Apple 限制） |

::: danger H5 安全限制
Web Bluetooth API 要求页面必须通过 **HTTPS** 协议访问（`localhost` 除外）。如果在 HTTP 环境下调用，浏览器会直接拒绝。此外，`requestDevice()` 必须在用户交互事件（如 `click`）的回调中调用，不能自动触发。
:::

本地开发时可以使用 `localhost` 访问，Vite / VitePress 默认开发服务器即满足要求。

### React Native

React Native 平台需要额外安装 BLE 通信库：

```bash
npm install react-native-ble-plx
```

```typescript
import { BluetoothPrinter, ReactNativeAdapter } from 'taro-bluetooth-print';

const adapter = new ReactNativeAdapter();
const printer = new BluetoothPrinter(adapter);

await printer.connect(deviceId);
await printer.text('Hello RN!', 'GBK').feed().cut().print();
await printer.disconnect();
```

::: tip 提示
React Native 适配器需要配合 `react-native-ble-plx` 使用。请参考 [平台适配器](./adapters.md) 文档了解详细配置。
:::

---

## 常见初始问题

在初次使用时，你可能会遇到以下问题，这里给出快速排查方向。

### 连接失败（CONNECTION_FAILED）

**常见原因：**

- 📱 手机蓝牙未开启，或蓝牙适配器初始化失败
- 📡 设备 ID 不正确，或设备已超出蓝牙通信范围（通常 10 米以内）
- 🔒 小程序未获得蓝牙权限授权

**排查方式：**

```typescript
// 检查蓝牙是否可用
const deviceManager = new DeviceManager();
try {
  await deviceManager.startScan({ timeout: 5000 });
  console.log('蓝牙适配器正常');
  deviceManager.stopScan();
} catch (err) {
  console.error('蓝牙初始化失败，请检查:', err);
}
```

### 打印乱码

**原因：** 大多数国产热敏打印机默认编码为 GBK。

```typescript
// ✅ 始终为中文内容指定 GBK 编码
printer.text('中文内容', 'GBK');
```

### 数据写入失败（WRITE_FAILED）

**原因：** 蓝牙信号不稳定或分片参数不匹配打印机缓冲区。

```typescript
// 调整传输参数以提升稳定性
printer.setOptions({
  chunkSize: 20,   // 减小单次写入字节数（默认 20）
  delay: 30,       // 增加分片间隔（毫秒）
  retries: 5,      // 增加重试次数
});
```

::: info 更多问题？
完整的故障排除指南请参阅 [故障排除](./troubleshooting.md) 页面。
:::

---

## 下一步

恭喜你完成了第一次蓝牙打印！🎉 接下来可以深入了解以下内容：

| 方向 | 文档 | 说明 |
|------|------|------|
| 🎨 功能特性 | [功能特性](./features.md) | 文本格式化、条码、二维码、图片打印等完整功能列表 |
| 🔧 驱动支持 | [驱动支持](./drivers.md) | ESC/POS、TSPL、ZPL、CPCL 等协议驱动详解 |
| 📡 平台适配器 | [平台适配器](./adapters.md) | 各平台适配器的配置与使用方法 |
| 🏗 核心概念 | [核心概念](./core-concepts.md) | 适配器模式、驱动架构、链式 API 设计理念 |
| 🔍 设备发现 | [设备发现](./discovery.md) | 扫描、过滤、连接蓝牙设备的完整指南 |
| 🚀 高级用法 | [高级用法](./advanced.md) | 打印队列、多打印机管理、模板引擎等 |
| ❓ 常见问题 | [FAQ](./faq.md) | 高频问题与解答 |
| 🛠 故障排除 | [故障排除](./troubleshooting.md) | 错误码参考与排查指南 |
| 📖 API 参考 | [API 文档](/api/bluetooth-printer) | 完整的 TypeScript API 参考 |
