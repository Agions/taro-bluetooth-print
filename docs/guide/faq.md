# 常见问题

本文档整合了常见问题、连接问题、打印质量问题、平台兼容问题和性能问题的解决方案。

## 基础问题

### 这个库支持哪些打印机？

支持所有使用以下协议的热敏打印机：

- **ESC/POS** — 绝大多数热敏票据打印机（佳博、芯烨、商米、汉印等）
- **TSPL** — TSC 标签打印机
- **ZPL** — Zebra 工业标签打印机
- **CPCL** — HP/霍尼韦尔移动打印机
- **STAR** — STAR TSP 系列票据机

> 如果打印机使用非标准协议，可以通过实现 `IPrinterDriver` 接口添加支持。

### 支持哪些 Taro 版本？

建议使用 **Taro 3.x 及以上**。最低要求：
- Taro ≥ 3.0.0
- 小程序基础库 ≥ 2.9.2（微信）

### 是否支持 WiFi 或 USB 打印机？

不支持。本库专注于**蓝牙**打印，不支持 WiFi 打印机、USB 打印机或云打印。

### 是否支持非 Taro 项目？

可以。在 H5 环境使用 `WebBluetoothAdapter`（无需 Taro）；在其他环境实现 `IPrinterAdapter` 接口即可。

---

## 连接问题

### 无法发现设备

**排查步骤：**

1. 确认打印机已开机并处于蓝牙发现模式（通常是长按电源/配对键）
2. 确认手机蓝牙已开启
3. 确认小程序/应用已授权蓝牙权限
4. 确认设备距离在蓝牙有效范围内（通常 10 米以内）

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

### 连接后立即断开

**可能原因：**

1. 设备距离过远或有障碍物
2. 打印机电量不足
3. 设备被其他手机连接（独占模式）

**解决方案：**

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

### `SERVICE_NOT_FOUND` / `CHARACTERISTIC_NOT_FOUND`

**原因：** 打印机未处于配对模式，或该设备不是标准 BLE 蓝牙打印机。

**解决方案：** 将打印机设置为蓝牙发现模式后重试。参照打印机说明书。

### 连接成功但写入失败

**可能原因：**

1. 打印机与手机距离过远
2. 分片参数 `chunkSize` 过大

**解决方案：**

```typescript
printer.setOptions({
  chunkSize: 20,    // 减小到 20
  delay: 30,        // 增加间隔
  retries: 5,
});
```

---

## 打印质量问题

### 打印中文乱码

**原因：** 大多数国产热敏机默认编码是 GBK，不支持 UTF-8。

**解决方案：**

```typescript
// ✅ 推荐：使用 GBK 编码
printer.text('欢迎光临', 'GBK');

// ❌ 可能乱码
printer.text('欢迎光临', 'UTF-8');
```

::: tip 提示
如果 GBK 仍然乱码，说明打印机未内置中文字库，需要在打印机设置中下载安装中文字库。
:::

### 图片打印变形或显示不正确

**可能原因：**

1. 图片数据格式不对（需要 RGBA，4 字节/像素）
2. 图片宽度过大（建议 ≤ 384 像素 @ 58mm 纸宽）
3. 未使用抖动算法

**解决方案：**

```typescript
// 确保图片数据是 RGBA 格式
const imageData = new Uint8Array(width * height * 4);
// RGBA = [R, G, B, A, R, G, B, A, ...]

// 宽度过大时先缩放
const maxWidth = 384;
if (width > maxWidth) {
  const scale = maxWidth / width;
  // ... 缩放后传入
  printer.image(scaledData, scaledWidth, scaledHeight);
} else {
  printer.image(imageData, width, height);
}
```

### 二维码无法扫描

**解决方案：**

```typescript
// 1. 增大二维码尺寸
printer.qr('url', { size: 8 });  // size 1-16，默认 6

// 2. 使用更高纠错级别
printer.qr('url', { size: 8, errorCorrection: 'H' });  // H = 30% 纠错

// 3. 缩短二维码内容
```

### 打印浓度不均匀

**解决方案：**

```typescript
// 通过 ESC 指令调整浓度（ESC 7 n1 n2 n3）
class ExtendedPrinter extends BluetoothPrinter {
  setDensity(level: number) {
    const cmd = new Uint8Array([0x1B, 0x37, level, 0, 0]);
    this.getDriver().addCommand(cmd);
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

3. iOS 蓝牙队列可能需要延迟：

```typescript
await Taro.sleep(200); // 等待 200ms 后再操作
await printer.connect(deviceId);
```

### H5 Web Bluetooth 浏览器不支持

**检查方式：**

```javascript
if ('bluetooth' in navigator) {
  console.log('浏览器支持 Web Bluetooth');
} else {
  console.error('当前浏览器不支持 Web Bluetooth');
}
```

### React Native 连接失败

React Native 需要安装 BLE 库（如 `react-native-ble-plx`），并在原生侧配置权限：

**iOS — `Info.plist`：**

```xml
<key>NSBluetoothAlwaysUsageDescription</key>
<string>需要蓝牙权限以连接打印机</string>
<key>NSBluetoothPeripheralUsageDescription</key>
<string>需要蓝牙权限以连接打印机</string>
```

**Android — `AndroidManifest.xml`：**

```xml
<uses-permission android:name="android.permission.BLUETOOTH" />
<uses-permission android:name="android.permission.BLUETOOTH_ADMIN" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
```

---

## 性能问题

### 打印速度太慢

**优化方案：**

```typescript
// 1. 调整分片参数
printer.setOptions({
  chunkSize: 200,    // 从默认 20 提升
  delay: 5,          // 从默认 20 降低
  retries: 2,
});

// 2. 避免频繁小数据打印
// ❌ 每次连接开销大
await printer.text('行1').print();
await printer.text('行2').print();

// ✅ 一次性构建
await printer.text('行1').text('行2').print();

// 3. 生产环境关闭调试日志
import { Logger, LogLevel } from 'taro-bluetooth-print';
Logger.setLevel(LogLevel.ERROR);
```

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
// 3. 批量打印时使用 PrintQueue 而不是循环创建新实例
```

---

## 编码问题

### GBK 编码不工作

目前库的 GBK 编码实现会回退到 UTF-8。建议：

1. 使用支持 GBK 的打印机型号（大多数主流热敏机支持）
2. 或使用支持 UTF-8 的打印机
3. 在打印机设置中启用中文模式

### 特殊字符无法打印

某些打印机不支持部分特殊字符（€、®、™ 等）。可以使用替代字符：

```typescript
const safeText = text.replace(/[€®™]/g, (c) => ({
  '€': 'E', '®': '(R)', '™': '(TM)',
})[c] ?? c);

printer.text(safeText, 'GBK');
```

---

## 错误码速查

| 错误码 | 说明 | 解决方案 |
|--------|------|---------|
| `CONNECTION_FAILED` | 连接失败 | 检查设备 ID、蓝牙开关、权限 |
| `WRITE_FAILED` | 数据写入失败 | 减小 chunkSize，增加 retries |
| `SERVICE_NOT_FOUND` | 服务未发现 | 确认设备支持 BLE，将打印机设置为发现模式 |
| `CHARACTERISTIC_NOT_FOUND` | 特征值未发现 | 打印机型号不支持或蓝牙服务异常 |
| `PRINT_JOB_IN_PROGRESS` | 打印任务进行中 | 等待当前任务完成或调用 `cancel()` |
| `DEVICE_DISCONNECTED` | 设备已断开 | 重新连接 |
| `INVALID_BUFFER` | 无效的数据缓冲区 | 检查打印数据是否正确构建 |

---

## 获取帮助

遇到本文档未覆盖的问题：

1. 搜索 [GitHub Issues](https://github.com/agions/taro-bluetooth-print/issues)
2. 提交新的 [Issue](https://github.com/agions/taro-bluetooth-print/issues/new)（请包含完整的错误信息、环境信息和复现步骤）
3. 查看 [API 文档](../api/)

**提交 Issue 时请包含：**
- 完整的错误信息和堆栈
- 复现步骤
- 环境信息（平台、小程序版本、Taro 版本、打印机型号）
- 相关代码片段
