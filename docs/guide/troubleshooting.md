# 故障排除指南

本文档提供实用的分步故障排除方法，帮助你快速诊断和解决蓝牙打印问题。

## 快速诊断流程

遇到打印问题时，按以下顺序检查：

```
1. 蓝牙基础 → 2. 连接问题 → 3. 打印问题 → 4. 平台问题
```

---

## 蓝牙基础检查

### 检查蓝牙适配器状态

```typescript
import Taro from '@tarojs/taro';

// 获取蓝牙适配器状态
const { available, discovering, poweroff, unauthorized } = 
  await Taro.getBluetoothAdapterState();

console.log('适配器可用:', available);
console.log('正在扫描:', discovering);
console.log('蓝牙已关闭:', poweroff);
console.log('未授权:', unauthorized);

if (!available) {
  console.error('蓝牙适配器不可用，请检查系统蓝牙开关');
}
```

### 检查系统蓝牙开关

在不同平台确认蓝牙已开启：

| 平台 | 检查方式 |
|------|---------|
| 微信小程序 | 手机设置 → 蓝牙已开启 |
| H5 (Web Bluetooth) | 浏览器设置 → 蓝牙已开启 |
| React Native | 系统设置 → 蓝牙已开启 |

### 验证蓝牙权限

**微信小程序 — `app.json`：**

```json
{
  "permission": {
    "scope.bluetooth": {
      "desc": "用于连接蓝牙打印机"
    }
  }
}
```

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

## 连接问题

### 设备无法被发现

**排查步骤：**

1. 确认打印机已开机并处于蓝牙发现模式
2. 某些打印机需要长按电源键 3-5 秒进入配对模式
3. 确认手机蓝牙已开启
4. 确认应用已获取蓝牙权限
5. 确认设备距离在 10 米以内

**诊断代码：**

```typescript
// 监听设备发现事件
Taro.onBluetoothDeviceFound((res) => {
  res.devices.forEach(device => {
    console.log('设备名称:', device.name);
    console.log('设备ID:', device.deviceId);
    console.log('信号强度:', device.RSSI);
  });
});

// 开始扫描
await Taro.startBluetoothDevicesDiscovery({
  allowDuplicatesKey: false,
  interval: 0,
});

// 5 秒后停止
setTimeout(() => {
  Taro.stopBluetoothDevicesDiscovery();
}, 5000);
```

**常见原因及解决方案：**

| 原因 | 解决方案 |
|------|---------|
| 打印机未进入发现模式 | 长按电源键 3-5 秒，指示灯闪烁表示就绪 |
| 设备已被其他手机连接 | 断开其他手机的连接，或重启打印机 |
| 扫描超时 | 增加扫描时间，使用 `timeout` 参数 |
| 蓝牙服务不支持 | 确认设备支持 BLE 4.0 |

### 连接后立即断开

**可能原因：**

1. 设备距离过远或有障碍物
2. 打印机电量不足
3. 设备被其他手机连接（独占模式）
4. iOS 蓝牙队列问题

**解决方案：**

```typescript
// 添加断开监听
printer.on('disconnected', async (deviceId) => {
  console.log('连接断开，尝试重新连接...');
  
  // 延迟重连（iOS 需要更长延迟）
  await Taro.sleep(500);
  
  try {
    await printer.connect(deviceId);
  } catch (e) {
    console.error('重连失败:', e);
  }
});

// iOS 额外处理：连接前延迟
await Taro.sleep(200);
await printer.connect(deviceId);
```

### `SERVICE_NOT_FOUND` 错误

**原因：** 打印机未处于配对模式，或设备不支持标准 BLE 服务。

**解决方案：**

1. 将打印机设置为蓝牙发现模式
2. 参照打印机说明书确认蓝牙服务 UUID
3. 某些打印机需要先通过蓝牙设置配对，才能使用第三方应用

### `CHARACTERISTIC_NOT_FOUND` 错误

**原因：** 找不到蓝牙特征值，通常是打印机固件问题或不支持的型号。

**解决方案：**

```typescript
// 检查设备服务
const services = await Taro.getBLEDeviceServices({
  deviceId: deviceId,
});

services.services.forEach(service => {
  console.log('服务UUID:', service.uuid);
  
  // 获取特征值
  Taro.getBLEDeviceCharacteristics({
    deviceId: deviceId,
    serviceId: service.uuid,
  }).then(characteristics => {
    characteristics.characteristics.forEach(char => {
      console.log('特征值UUID:', char.uuid);
      console.log('属性:', char.properties);
    });
  });
});
```

### 连接成功但写入失败

**可能原因：**

1. 打印机与手机距离过远
2. 分片参数 `chunkSize` 过大
3. 打印机缓冲区已满

**解决方案：**

```typescript
// 调整分片参数
printer.setOptions({
  chunkSize: 20,    // 减小到 20 字节
  delay: 30,        // 增加间隔到 30ms
  retries: 5,       // 增加重试次数
});

// 检查写入
try {
  await printer.write(data);
} catch (e) {
  console.error('写入失败:', e);
  
  // 尝试分片写入
  const chunkSize = 20;
  for (let i = 0; i < data.length; i += chunkSize) {
    const chunk = data.slice(i, i + chunkSize);
    await printer.write(chunk);
    await Taro.sleep(30);
  }
}
```

---

## 打印问题

### 打印无响应

**排查步骤：**

1. 确认打印机已连接（检查 `printer.isConnected()`）
2. 确认打印数据已构建（检查 `printer.getCommands()`）
3. 确认纸张已正确安装
4. 尝试发送小量测试数据

```typescript
// 诊断打印状态
console.log('连接状态:', await printer.isConnected());
console.log('待打印数据:', printer.getCommands().length, '字节');

// 发送测试数据
await printer.text('TEST', 'UTF-8').print();
```

### 中文乱码

**原因：** 大多数国产热敏机默认编码是 GBK，不支持 UTF-8。

**解决方案：**

```typescript
// ✅ 推荐：使用 GBK 编码
await printer.text('欢迎光临', 'GBK');

// ❌ 可能乱码
await printer.text('欢迎光临', 'UTF-8');
```

::: tip 提示
如果 GBK 仍然乱码，说明打印机未内置中文字库，需要在打印机设置中下载安装中文字库。
:::

**编码检测工具：**

```typescript
import { encodeText } from 'taro-bluetooth-print';

// 检测最佳编码
function detectEncoding(text: string): string {
  try {
    // 尝试 GBK
    const gbk = encodeText(text, 'GBK');
    if (gbk) return 'GBK';
  } catch (e) {}
  
  // 回退到 UTF-8
  return 'UTF-8';
}
```

### 图片打印变形或显示不正确

**可能原因：**

1. 图片数据格式不对（需要 RGBA，4 字节/像素）
2. 图片宽度过大
3. 未使用抖动算法

**解决方案：**

```typescript
// 确保图片数据是 RGBA 格式
const imageData = new Uint8Array(width * height * 4);
// RGBA = [R, G, B, A, R, G, B, A, ...]

// 宽度过大时先缩放
const maxWidth = 384;  // 58mm 纸宽 @ 203 DPI
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

### 二维码无法扫描

**解决方案：**

```typescript
// 1. 增大二维码尺寸
printer.qr('url', { size: 10 });  // size 1-16，默认 6

// 2. 使用更高纠错级别
printer.qr('url', { 
  size: 10, 
  errorCorrection: 'H'  // H = 30% 纠错
});

// 3. 缩短二维码内容（过长内容可使用短链接）
// 4. 确保打印机支持二维码打印（部分老型号不支持）
```

### 条码打印不清晰或无法扫描

**解决方案：**

```typescript
// 1. 增加条码高度
printer.barcode('1234567890', '128', { 
  height: 60  // 建议 ≥ 50
});

// 2. 调整条码宽度
printer.barcode('1234567890', '128', { 
  width: 2  // 宽窄比
});

// 3. 显示条码文本
printer.barcode('1234567890', '128', { 
  height: 60,
  readable: true  // 显示可读文本
});
```

### 打印内容位置偏移

**可能原因：**

1. 打印机初始化不完整
2. 纸张传感器问题
3. 驱动程序不支持

**解决方案：**

```typescript
// 在打印前发送初始化命令
printer.initialize();

// 重置打印机
printer.reset();

// 校准纸张
printer.feed(3).feed(-3);  // 进纸再退纸
```

---

## 平台问题

### 微信小程序 iOS 连接不稳定

**解决方案：**

1. 确保小程序基础库版本 ≥ 2.9.2
2. 在 `app.json` 中添加：

```json
{
  "lazyCodeLoading": "requiredComponents"
}
```

3. iOS 蓝牙操作需要延迟：

```typescript
// 连接前延迟
await Taro.sleep(200);
await printer.connect(deviceId);

// 写入前延迟
await Taro.sleep(100);
await printer.print();
```

### H5 Web Bluetooth 浏览器不支持

**检查浏览器兼容性：**

```javascript
// 检查是否支持 Web Bluetooth
if ('bluetooth' in navigator) {
  console.log('浏览器支持 Web Bluetooth');
} else {
  console.error('当前浏览器不支持 Web Bluetooth');
  console.log('支持的浏览器: Chrome 56+, Edge 79+, Opera 42+');
  console.log('不支持: Safari, Firefox');
}
```

**HTTPS 要求：**

Web Bluetooth 需要 HTTPS 环境或 `localhost`。在开发阶段可以使用：

```bash
# 使用 localhost
http://localhost:3000

# 或使用 ngrok 穿透
ngrok http 3000
```

### React Native 连接失败

**Android 额外配置：**

```xml
<!-- AndroidManifest.xml -->
<uses-permission android:name="android.permission.BLUETOOTH" />
<uses-permission android:name="android.permission.BLUETOOTH_ADMIN" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
```

**检查 BLE 库状态：**

```typescript
import { BleManager } from 'react-native-ble-plx';

// 检查 BLE 管理器状态
const manager = new BleManager();
const state = await manager.state();
console.log('BLE 状态:', state);
```

---

## 性能问题

### 打印速度太慢

**优化方案：**

```typescript
// 1. 调整分片参数（提高吞吐量）
printer.setOptions({
  chunkSize: 200,   // 从默认 20 提升
  delay: 5,         // 从默认 20 降低
  retries: 2,
});

// 2. 避免频繁小数据打印
// ❌ 效率低
await printer.text('行1').print();
await printer.text('行2').print();

// ✅ 效率高（一次性发送）
await printer.text('行1').text('行2').print();

// 3. 关闭调试日志（生产环境）
import { Logger, LogLevel } from 'taro-bluetooth-print';
Logger.setLevel(LogLevel.ERROR);

// 4. 使用批量打印
import { BatchPrintManager } from 'taro-bluetooth-print';
```

### 内存占用过高

**优化方案：**

```typescript
// 1. 及时断开连接
try {
  await printer.connect(deviceId);
  await printer.print();
} finally {
  await printer.disconnect();  // 释放资源
}

// 2. 避免打印超大图片（建议先压缩到 200KB 以内）
// 3. 批量打印时使用 PrintQueue
// 4. 清理旧数据
printer.clear();
```

---

## 错误码速查

| 错误码 | 说明 | 排查方法 |
|--------|------|---------|
| `CONNECTION_FAILED` | 连接失败 | 检查设备 ID、蓝牙开关、权限 |
| `WRITE_FAILED` | 数据写入失败 | 减小 chunkSize，增加 retries |
| `SERVICE_NOT_FOUND` | 服务未发现 | 确认设备支持 BLE，将打印机设置为发现模式 |
| `CHARACTERISTIC_NOT_FOUND` | 特征值未发现 | 打印机型号不支持或蓝牙服务异常 |
| `PRINT_JOB_IN_PROGRESS` | 打印任务进行中 | 等待当前任务完成或调用 `cancel()` |
| `DEVICE_DISCONNECTED` | 设备已断开 | 重新连接，检查设备电量 |
| `INVALID_BUFFER` | 无效的数据缓冲区 | 检查打印数据是否正确构建 |
| `TIMEOUT` | 操作超时 | 增加 timeout 参数，检查设备距离 |
| `ENCODING_NOT_SUPPORTED` | 编码不支持 | 更换编码格式（GBK/UTF-8） |

### 处理错误的最佳实践

```typescript
try {
  await printer.connect(deviceId);
  await printer.print();
} catch (e) {
  const { code, message } = e;
  
  switch (code) {
    case 'CONNECTION_FAILED':
      // 检查蓝牙连接
      console.error('连接失败，尝试重新扫描...');
      break;
    case 'WRITE_FAILED':
      // 调整参数重试
      printer.setOptions({ chunkSize: 20, retries: 5 });
      await printer.print();
      break;
    case 'DEVICE_DISCONNECTED':
      // 重新连接
      await printer.connect(deviceId);
      await printer.print();
      break;
    default:
      console.error('未知错误:', code, message);
  }
} finally {
  await printer.disconnect();
}
```

---

## 调试技巧

### 启用详细日志

```typescript
import { Logger, LogLevel } from 'taro-bluetooth-print';

// 开发环境启用所有日志
Logger.setLevel(LogLevel.DEBUG');

// 监听日志
Logger.on('log', (level, message, context) => {
  console.log(`[${level}]`, message, context);
});
```

### 导出打印数据

```typescript
// 导出原始指令用于调试
const commands = printer.getCommands();
console.log('打印指令:', commands);

// 导出为十六进制字符串
const hex = Array.from(commands)
  .map(b => b.toString(16).padStart(2, '0'))
  .join(' ');
console.log('HEX:', hex);
```

### 常见问题自检清单

打印前确认以下各项：

- [ ] 打印机已开机并处于就绪状态
- [ ] 手机蓝牙已开启
- [ ] 应用已获取蓝牙权限
- [ ] 打印机与手机距离在 10 米以内
- [ ] 纸张已正确安装
- [ ] 打印数据已正确编码（中文用 GBK）
- [ ] 连接状态正常（`printer.isConnected()` 返回 `true`）

---

## 获取帮助

遇到本文档未覆盖的问题：

1. 搜索 [GitHub Issues](https://github.com/agions/taro-bluetooth-print/issues)
2. 提交新的 [Issue](https://github.com/agions/taro-bluetooth-print/issues/new)

**提交 Issue 时请包含：**

- 完整的错误信息和堆栈
- 复现步骤
- 环境信息（平台、小程序版本、Taro 版本、打印机型号）
- 相关代码片段
