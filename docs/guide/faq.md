# 常见问题（FAQ）

本文档整合了使用 `taro-bluetooth-print` 过程中遇到的常见问题与解决方案，涵盖连接、打印质量、平台兼容、性能和编码等方面。

::: tip 没有找到你的问题？
1. 搜索 [GitHub Issues](https://github.com/agions/taro-bluetooth-print/issues)
2. 提交新的 [Issue](https://github.com/agions/taro-bluetooth-print/issues/new)
3. 查阅 [API 文档](/api/) 或 [核心概念](./core-concepts.md)
:::

---

## 基础问题

### 支持哪些打印机？

`taro-bluetooth-print` 支持 8 种打印机驱动协议，覆盖市面上绝大多数蓝牙打印机：

| 驱动 | 协议 | 适用打印机 |
|------|------|-----------|
| `EscPos` | ESC/POS | 热敏票据打印机（佳博、芯烨、商米、汉印等） |
| `TsplDriver` | TSPL | TSC 条码标签打印机 |
| `ZplDriver` | ZPL | Zebra 工业标签打印机 |
| `CpclDriver` | CPCL | HP/霍尼韦尔移动打印机 |
| `StarPrinter` | Star Line Mode | STAR TSP 系列票据机 |
| `GPrinterDriver` | 佳博协议 | 佳博 GP 系列 |
| `XprinterDriver` | 芯烨协议 | 芯烨系列 |
| `SprtDriver` | 斯普瑞特协议 | SPRT 系列 |

::: info 不在列表中？
如果你的打印机使用非标准协议，可以通过实现 `IPrinterDriver` 接口添加支持。详见 [驱动架构](./core-concepts.md#驱动架构-driver-architecture)。
:::

### 支持哪些 Taro 版本？

| 要求 | 最低版本 |
|------|---------|
| Taro | ≥ 3.0.0 |
| 微信小程序基础库 | ≥ 2.9.2 |

建议使用 **Taro 3.x 及以上** 版本以获得最佳体验。

### 是否支持 WiFi 或 USB 打印机？

**不支持。** 本库专注于**蓝牙（BLE）** 打印，不支持 WiFi 打印机、USB 打印机或云打印服务。

### 是否支持非 Taro 项目？

**可以。**

- H5 环境：直接使用 `WebBluetoothAdapter`，无需 Taro
- React Native：使用 `ReactNativeAdapter`
- 其他环境：实现 `IPrinterAdapter` 接口即可

---

## 连接问题

### 无法发现设备

**排查步骤：**

1. ✅ 确认打印机已开机并处于蓝牙发现模式（通常长按电源/配对键 3-5 秒）
2. ✅ 确认手机蓝牙已开启
3. ✅ 确认小程序/应用已授权蓝牙权限
4. ✅ 确认设备距离在蓝牙有效范围内（通常 10 米以内，无障碍物）

```typescript
// 检查蓝牙适配器状态
const { available, discovering } = await Taro.getBluetoothAdapterState();
if (!available) {
  console.error('蓝牙适配器不可用');
}
if (discovering) {
  console.log('正在扫描中...');
}
```

::: warning iOS 定位权限
iOS 上扫描 BLE 设备需要开启**定位权限**，否则可能无法发现任何设备。
:::

---

### 连接后立即断开

**可能原因及解决方案：**

| 原因 | 解决方案 |
|------|---------|
| 设备距离过远 | 靠近打印机至 3 米以内 |
| 打印机电量不足 | 给打印机充电 |
| 被其他设备连接（独占模式） | 先断开其他设备的连接 |
| iOS 蓝牙队列繁忙 | 添加延迟后重试 |

```typescript
printer.on('disconnected', (deviceId) => {
  console.log('连接断开，尝试重新连接...');
  setTimeout(async () => {
    try {
      await printer.connect(deviceId);
    } catch (e) {
      console.error('重连失败:', e);
    }
  }, 1000);
});
```

---

### `SERVICE_NOT_FOUND` / `CHARACTERISTIC_NOT_FOUND`

**原因：** 打印机未处于配对模式，或该设备不是标准 BLE 蓝牙打印机。

**解决方案：**

1. 将打印机设置为蓝牙发现模式后重试
2. 参照打印机说明书确认是否支持 BLE
3. 部分老旧打印机使用经典蓝牙（SPP），不支持 BLE

::: danger 重要
BLE（低功耗蓝牙）和经典蓝牙（SPP）是不同的协议。本库仅支持 **BLE**。如果你的打印机只支持 SPP，需要使用经典蓝牙库。
:::

---

### 连接成功但写入失败

**可能原因：** 打印机与手机距离过远，或分片参数 `chunkSize` 过大。

**解决方案：**

```typescript
printer.setOptions({
  chunkSize: 20,    // 减小分片大小
  delay: 30,        // 增加写入间隔
  retries: 5,       // 增加重试次数
});
```

| 参数 | 默认值 | 建议值（不稳定时） |
|------|--------|------------------|
| `chunkSize` | 20 | 10-20 |
| `delay` | 20 | 30-50 |
| `retries` | 3 | 5-10 |

---

## 打印质量问题

### 打印中文乱码

**原因：** 大多数国产热敏机默认编码为 **GBK**，不支持 UTF-8。

**解决方案：**

```typescript
// ✅ 推荐：使用 GBK 编码
printer.text('欢迎光临', 'GBK');

// ❌ 可能乱码
printer.text('欢迎光临', 'UTF-8');

// ✅ 默认就是 GBK，可省略
printer.text('欢迎光临');
```

::: tip 进一步排查
如果 GBK 仍然乱码，说明打印机**未内置中文字库**。需要在打印机设置中下载安装中文字库，或使用支持中文的打印机型号。
:::

---

### 图片打印变形或显示不正确

**可能原因及解决方案：**

| 原因 | 解决方案 |
|------|---------|
| 图片数据格式不对 | 确保是 RGBA 格式（4 字节/像素） |
| 图片宽度过大 | 缩放至纸宽对应像素（58mm → 384px, 80mm → 576px） |
| 抖动效果不佳 | 库内置 Floyd-Steinberg 抖动，一般无需调整 |

```typescript
// 确保图片数据是 RGBA 格式
const imageData = new Uint8Array(width * height * 4);

// 宽度过大时先缩放
const maxWidth = 384; // 58mm 纸宽
if (width > maxWidth) {
  const scale = maxWidth / width;
  const scaledWidth = Math.floor(width * scale);
  const scaledHeight = Math.floor(height * scale);
  // ... 缩放后传入
  printer.image(scaledData, scaledWidth, scaledHeight);
} else {
  printer.image(imageData, width, height);
}
```

---

### 二维码无法扫描

**解决方案：**

```typescript
// 1. 增大二维码尺寸
printer.qr('url', { size: 8 });  // size 1-16，默认 6

// 2. 使用更高纠错级别
printer.qr('url', { size: 8, errorCorrection: 'H' });  // H = 30% 纠错

// 3. 缩短二维码内容
printer.qr('https://s.example/abc');  // 使用短链接
```

| 纠错级别 | 纠错能力 | 建议场景 |
|---------|---------|---------|
| `L` | 7% | 空间受限 |
| `M` | 15% | 默认，通用 |
| `Q` | 25% | 内容较长 |
| `H` | 30% | **推荐用于小尺寸二维码** |

---

### 打印浓度不均匀

通过 ESC 指令调整浓度（需确认打印机支持）：

```typescript
class ExtendedPrinter extends BluetoothPrinter {
  setDensity(level: number) {
    // level 通常为 0-15
    const cmd = new Uint8Array([0x1B, 0x37, level, 0, 0]);
    this.getCommandBuilder().addCommand(cmd);
    return this;
  }
}
```

---

## 平台兼容问题

### 微信小程序 iOS 连接不稳定

**解决方案：**

1. 确保小程序基础库版本 ≥ 2.9.2
2. 在 `app.json` 中添加：
   ```json
   {
     "lazyCodeLoading": "requiredComponents"
   }
   ```
3. iOS 蓝牙队列可能需要延迟操作：
   ```typescript
   await Taro.sleep(200);
   await printer.connect(deviceId);
   ```

---

### H5 Web Bluetooth 浏览器不支持

**检测方式：**

```typescript
if ('bluetooth' in navigator) {
  console.log('浏览器支持 Web Bluetooth');
} else {
  console.error('当前浏览器不支持 Web Bluetooth');
  // 引导用户使用 Chrome 或 Edge
}
```

::: danger 浏览器限制
- **必须 HTTPS 环境**（或 localhost）
- Safari 和 Firefox 暂不支持
- iOS 所有浏览器（包括 Chrome）均不支持
:::

---

### React Native 连接失败

确保已完成以下配置：

**1. 安装 BLE 库：**

```bash
npm install react-native-ble-plx
```

**2. iOS — `Info.plist`：**

```xml
<key>NSBluetoothAlwaysUsageDescription</key>
<string>需要蓝牙权限以连接打印机</string>
<key>NSBluetoothPeripheralUsageDescription</key>
<string>需要蓝牙权限以连接打印机</string>
```

**3. Android — `AndroidManifest.xml`：**

```xml
<!-- Android 11 及以下 -->
<uses-permission android:name="android.permission.BLUETOOTH" />
<uses-permission android:name="android.permission.BLUETOOTH_ADMIN" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />

<!-- Android 12+ -->
<uses-permission android:name="android.permission.BLUETOOTH_SCAN" />
<uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />
```

---

### 支付宝小程序特殊注意事项

- 支付宝小程序需要额外声明**定位权限**才能扫描 BLE 设备
- 使用 `AlipayAdapter` 或 `TaroAdapter`（推荐）
- `app.json` 配置中权限字段为 `Bluetooth`

---

## 性能问题

### 打印速度太慢

**优化方案：**

```typescript
// 1. 调整分片参数（最有效）
printer.setOptions({
  chunkSize: 200,    // 增大分片（默认 20）
  delay: 5,          // 减小延迟（默认 20ms）
  retries: 2,        // 减小重试（默认 3）
});

// 2. 避免频繁小数据打印
// ❌ 每次都重新连接和发送
await printer.text('行1').print();
await printer.text('行2').print();

// ✅ 一次性构建完整内容
await printer.text('行1').text('行2').print();

// 3. 生产环境关闭调试日志
import { Logger, LogLevel } from 'taro-bluetooth-print';
Logger.setLevel(LogLevel.ERROR);
```

| 参数 | 默认值 | 优化值（追求速度） |
|------|--------|------------------|
| `chunkSize` | 20 | 100-200 |
| `delay` | 20 | 5-10 |
| `retries` | 3 | 1-2 |

::: warning 调优警告
`chunkSize` 过大可能导致写入失败，请根据打印机型号逐步调整。
:::

---

### 内存占用过高

```typescript
// 1. 及时断开连接
try {
  await printer.connect(deviceId);
  await printer.print();
} finally {
  await printer.disconnect();
}

// 2. 避免打印超大图片（建议先压缩到 200KB 以内）
// 3. 使用完毕后销毁实例
printer.destroy();

// 4. 批量打印使用 PrintQueue，而不是循环创建新实例
```

---

## 编码问题

### GBK 编码不工作

**排查步骤：**

1. 确认打印机支持 GBK 编码（大多数国产热敏机支持）
2. 确认打印机已安装中文字库
3. 尝试在打印机设置中启用中文模式

```typescript
// 确保使用 GBK 编码
printer.text('中文内容', 'GBK');
```

---

### 特殊字符无法打印

某些打印机不支持部分特殊字符（`€`、`®`、`™` 等）。可以使用替代字符：

```typescript
const safeText = text.replace(/[€®™©°]/g, (c) => ({
  '€': 'E',
  '®': '(R)',
  '™': '(TM)',
  '©': '(C)',
  '°': 'deg',
})[c] ?? c);

printer.text(safeText, 'GBK');
```

---

## 错误码速查

| 错误码 | 说明 | 解决方案 |
|--------|------|---------|
| `CONNECTION_FAILED` | 连接失败 | 检查设备 ID、蓝牙开关、权限授权 |
| `WRITE_FAILED` | 数据写入失败 | 减小 `chunkSize`，增加 `retries` |
| `SERVICE_NOT_FOUND` | 服务未发现 | 确认设备支持 BLE，将打印机设置为发现模式 |
| `CHARACTERISTIC_NOT_FOUND` | 特征值未发现 | 打印机型号不兼容或蓝牙服务异常 |
| `PRINT_JOB_IN_PROGRESS` | 打印任务进行中 | 等待当前任务完成或调用 `cancel()` |
| `PRINT_JOB_FAILED` | 打印任务失败 | 检查连接状态和打印数据 |
| `DEVICE_DISCONNECTED` | 设备已断开 | 重新连接 |
| `INVALID_BUFFER` | 无效数据缓冲区 | 检查打印数据是否正确构建 |

---

## 获取帮助

遇到本文档未覆盖的问题，可以通过以下方式获取帮助：

1. **搜索 Issues**：[GitHub Issues](https://github.com/agions/taro-bluetooth-print/issues)
2. **提交新 Issue**：[New Issue](https://github.com/agions/taro-bluetooth-print/issues/new)
3. **查阅文档**：[API 文档](/api/) | [核心概念](./core-concepts.md)

::: tip 提交 Issue 时请包含以下信息
- 完整的错误信息和堆栈（stack trace）
- 复现步骤
- 环境信息（平台、小程序版本、Taro 版本、打印机型号）
- 相关代码片段
:::
