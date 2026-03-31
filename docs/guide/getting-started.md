# 快速开始

本文档帮助你快速上手 `taro-bluetooth-print`，完成从安装到首次打印的全流程。

## 环境要求

| 依赖 | 版本要求 |
|------|---------|
| Node.js | ≥ 18.0.0 |
| Taro | ≥ 3.6.0（小程序平台必选） |
| TypeScript | ≥ 5.0.0 |
| 小程序基础库 | ≥ 2.9.2（微信） |

::: tip 提示
`@tarojs/taro` 在小程序环境中为**必须**依赖；在 H5 环境（Web Bluetooth）则为**可选**依赖。
:::

## 安装

```bash
# npm
npm install taro-bluetooth-print

# yarn
yarn add taro-bluetooth-print

# pnpm
pnpm add taro-bluetooth-print
```

安装完成后，导入核心类即可开始使用：

```typescript
import { BluetoothPrinter, DeviceManager } from 'taro-bluetooth-print';
```

## 平台与适配器选择

根据你的开发平台，选择对应的适配器：

| 开发平台 | 推荐适配器 | 说明 |
|---------|-----------|------|
| 微信小程序 | `TaroAdapter` | 完整支持所有蓝牙 API |
| 支付宝小程序 | `AlipayAdapter` | 完整支持 |
| 百度小程序 | `BaiduAdapter` | 完整支持 |
| 字节跳动小程序 | `ByteDanceAdapter` | 完整支持 |
| QQ 小程序 | `QQAdapter` | 完整支持 |
| H5 浏览器 | `WebBluetoothAdapter` | 需要 Chrome/Edge 56+，Safari 不支持 |
| React Native | `ReactNativeAdapter` | 使用 React Native BLE 库 |
| 鸿蒙 | `TaroAdapter` | 通过 Taro 适配层支持 |

::: tip 提示
在 Taro 框架下开发时，所有小程序平台（微信/支付宝等）统一使用 `TaroAdapter`，框架会自动路由到对应平台的蓝牙 API。
:::

### 快速平台检测

```typescript
import { detectPlatform } from 'taro-bluetooth-print';

const platform = detectPlatform();
// => 'wechat' | 'alipay' | 'baidu' | 'bytedance' | 'web' | 'react-native' | 'harmony' | 'unknown'
```

## 完整示例：微信小程序

### Step 1 — 配置权限

在 `app.json` 中添加蓝牙权限声明：

```json
{
  "permission": {
    "scope.bluetooth": {
      "desc": "用于连接蓝牙打印机"
    }
  }
}
```

### Step 2 — 初始化并扫描设备

```typescript
import { BluetoothPrinter, DeviceManager } from 'taro-bluetooth-print';

Page({
  data: {
    devices: [],
    connected: false,
    selectedDevice: null,
  },

  // 开始扫描
  async startScan() {
    const deviceManager = new DeviceManager();

    deviceManager.on('device-found', (device) => {
      this.setData({
        devices: deviceManager.getDiscoveredDevices(),
      });
    });

    await deviceManager.startScan({ timeout: 10000 });
  },

  // 选择并连接
  async selectDevice(e) {
    const deviceId = e.currentTarget.dataset.deviceId;
    const printer = new BluetoothPrinter();

    try {
      await printer.connect(deviceId);
      this.setData({ connected: true, selectedDevice: deviceId });

      // 监听进度
      printer.on('progress', ({ sent, total }) => {
        console.log(`打印进度: ${(sent / total * 100).toFixed(1)}%`);
      });
    } catch (err) {
      console.error('连接失败:', err);
    }
  },
});
```

### Step 3 — 打印内容

```typescript
async doPrint() {
  const printer = new BluetoothPrinter();

  await printer.connect(this.data.selectedDevice);

  await printer
    .text('=== 购物小票 ===', 'GBK')
    .feed()
    .align('center')
    .text('2024-01-15 14:30', 'GBK')
    .align('left')
    .feed()
    .text('------------------------', 'GBK')
    .text('商品名称        数量   金额', 'GBK')
    .text('------------------------', 'GBK')
    .text('农夫山泉         x2    ¥6.00', 'GBK')
    .text('方便面           x1    ¥5.50', 'GBK')
    .text('------------------------', 'GBK')
    .setBold(true)
    .text('合计：              ¥11.50', 'GBK')
    .setBold(false)
    .feed(2)
    .qr('https://shop.example.com', { size: 6, errorCorrection: 'M' })
    .feed(3)
    .cut()
    .print();

  await printer.disconnect();
}
```

## H5 Web Bluetooth 示例

```typescript
import { BluetoothPrinter, WebBluetoothAdapter } from 'taro-bluetooth-print';

async function printFromWeb() {
  // 1. 请求设备
  const adapter = new WebBluetoothAdapter();
  await adapter.requestDevice({
    filters: [{ name: '热敏打印机' }],
    optionalServices: ['00001800-0000-1000-8000-00805f9b34fb'],
  });

  // 2. 创建打印机实例
  const printer = new BluetoothPrinter(adapter);

  // 3. 连接并打印
  const devices = adapter.getDiscoveredDevices();
  await printer.connect(devices[0].deviceId);

  await printer
    .text('Hello from Web Bluetooth!', 'UTF-8')
    .feed()
    .qr('https://example.com')
    .feed(2)
    .cut()
    .print();

  await printer.disconnect();
}
```

::: warning 注意
H5 Web Bluetooth 需要** HTTPS** 环境或 `localhost`。Safari 和 Firefox 目前不支持 Web Bluetooth API。
:::

## 标签打印示例（TSPL）

```typescript
import { BluetoothPrinter, TsplDriver } from 'taro-bluetooth-print';

async function printLabel() {
  // 使用 TSPL 驱动
  const driver = new TsplDriver();
  const printer = new BluetoothPrinter(undefined, driver);

  // 构建标签内容
  driver
    .size(60, 40)              // 标签尺寸: 60mm × 40mm
    .gap(3)                    // 标签间隙: 3mm
    .clear()                   // 清空缓冲区
    .direction(0)              // 打印方向
    .density(10)               // 打印浓度 (0-15)
    .text('商品名称', { x: 20, y: 20, font: 3 })
    .text('¥99.00', { x: 20, y: 60, font: 4, xMultiplier: 2, yMultiplier: 2 })
    .barcode('6901234567890', {
      x: 20,
      y: 100,
      type: 'EAN13',
      height: 50,
    })
    .qrcode('https://shop.example.com/item/123', {
      x: 250,
      y: 20,
      cellWidth: 4,
    })
    .print(1);                 // 打印 1 份

  await printer.connect(deviceId);
  await printer.print();
}
```

## 常见初始错误说明

### 1. `CONNECTION_FAILED` — 连接失败

**可能原因：**

- 设备 ID 不正确或设备已超出蓝牙范围
- 手机蓝牙未开启
- 小程序未获得蓝牙权限

**排查步骤：**

```typescript
// 1. 确保蓝牙适配器初始化成功
const adapter = await Taro.openBluetoothAdapter();

// 2. 检查蓝牙状态
const { available } = await Taro.getBluetoothAdapterState();
if (!available) {
  console.error('蓝牙适配器不可用，请检查系统蓝牙开关');
}

// 3. 确认设备 ID 正确（在 onBluetoothDeviceFound 回调中获取）
Taro.onBluetoothDeviceFound((res) => {
  res.devices.forEach(device => {
    console.log('设备名称:', device.name);
    console.log('设备ID:', device.deviceId);  // 使用此 ID 连接
  });
});
```

### 2. `SERVICE_NOT_FOUND` — 服务未发现

**可能原因：**

- 打印机未处于配对/发现模式
- 该设备不是蓝牙打印机

**解决方案：** 参照打印机说明书，将打印机设置为蓝牙发现模式（通常是长按电源键或配对键）。

### 3. `WRITE_FAILED` — 数据写入失败

**可能原因：**

- 打印机与手机距离过远
- 分片参数不当（`chunkSize` 过大）

**解决方案：**

```typescript
printer.setOptions({
  chunkSize: 20,    // 减小分片大小
  delay: 30,        // 增加分片间隔
  retries: 5,       // 增加重试次数
});
```

### 4. 打印中文乱码

**原因：** 大多数国产热敏打印机默认编码为 GBK，不支持 UTF-8。

**解决方案：**

```typescript
// ✅ 正确：使用 GBK 编码
printer.text('欢迎光临', 'GBK');

// ❌ 错误：使用 UTF-8（大多数国产机型会乱码）
printer.text('欢迎光临', 'UTF-8');
```

### 5. `scope.bluetooth` 权限被拒绝

在微信开发者工具中，需要在「详情 → 本地设置」勾选「不校验合法域名」；在真机上需要用户主动授权。

## 下一步

- 深入了解所有 [功能特性](./features.md)
- 查看完整的 [API 参考](/api/)
- 了解 [驱动支持](./drivers.md) 详情
- 阅读 [常见问题](./faq.md)
