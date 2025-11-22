# 故障排除

本页面列出了使用 Taro Bluetooth Print 时常见的问题和解决方案。

## 连接问题

### 无法连接到打印机

**症状**: 调用 `connect()` 时抛出错误或超时

**可能原因与解决方案**:

1. **设备ID错误**
   ```typescript
   // ❌ 错误：使用了错误的设备ID
   await printer.connect('wrong-id');
   
   // ✅ 正确：先扫描设备获取正确ID
   Taro.openBluetoothAdapter({
     success: () => {
       Taro.startBluetoothDevicesDiscovery({
         success: () => {
           Taro.onBluetoothDeviceFound((res) => {
             const devices = res.devices;
             // 选择正确的设备
             const targetDevice = devices.find(d => d.name.includes('Printer'));
             if (targetDevice) {
               printer.connect(targetDevice.deviceId);
             }
           });
         }
       });
     }
   });
   ```

2. **蓝牙未初始化**
   - 确保先调用 `Taro.openBluetoothAdapter()`
   - 检查手机蓝牙是否已开启

3. **权限不足**
   - 检查小程序是否有蓝牙权限
   - 在 `app.json` 中添加权限声明：
     ```json
     {
       "permission": {
         "scope.bluetooth": {
           "desc": "需要蓝牙权限以连接打印机"
         }
       }
     }
     ```

### 连接后立即断开

**症状**: 连接成功但很快断开

**解决方案**:

1. **检查设备距离** - 确保设备在蓝牙有效范围内（通常10米以内）

2. **检查打印机电量** - 低电量可能导致连接不稳定

3. **添加连接状态监听**:
   ```typescript
   printer.on('state-change', (state) => {
     console.log('连接状态:', state);
     if (state === PrinterState.DISCONNECTED) {
       // 尝试重连
       setTimeout(() => printer.connect(deviceId), 1000);
     }
   });
   ```

## 打印问题

### 打印内容乱码

**症状**: 打印出的文字显示为乱码或方块

**原因**: 编码不匹配

**解决方案**:

```typescript
// ❌ 错误：使用了不支持的编码
printer.text('中文内容', 'UTF-8');

// ✅ 正确：使用 GBK 编码（大多数热敏打印机支持）
printer.text('中文内容', 'GBK');

// 或者使用默认编码（GBK）
printer.text('中文内容');
```

> **注意**: 目前库的 GBK 编码实现会回退到 UTF-8。如果打印机不支持 UTF-8，建议使用支持 GBK 的打印机或等待库的 GBK 编码完整实现。

### 图片打印失败或变形

**症状**: 图片无法打印或打印出来变形

**解决方案**:

1. **检查图片数据格式**
   ```typescript
   // 确保数据是 RGBA 格式
   // 每个像素4个字节：R, G, B, A
   const imageData = new Uint8Array(width * height * 4);
   ```

2. **检查图片尺寸**
   ```typescript
   // 建议宽度不超过打印机纸张宽度
   // 58mm 打印机通常是 384 像素
   const maxWidth = 384;
   if (width > maxWidth) {
     // 需要缩放图片
     const scale = maxWidth / width;
     const newWidth = maxWidth;
     const newHeight = Math. floor(height * scale);
     // ... 缩放逻辑
   }
   ```

3. **使用正确的图片获取方式**:
   ```typescript
   Taro.canvasGetImageData({
     canvasId: 'myCanvas',
     x: 0,
     y: 0,
     width: imageWidth,
     height: imageHeight,
     success: (res) => {
       // res.data 是 RGBA 数据
       const imageData = new Uint8Array(res.data);
       printer.image(imageData, res.width, res.height);
     }
   });
   ```

### 二维码无法扫描

**症状**: 打印的二维码扫描失败

**解决方案**:

1. **增大二维码尺寸**:
   ```typescript
   // ❌ 太小
   printer.qr('https://example.com', { size: 3 });
   
   // ✅ 合适的大小
   printer.qr('https://example.com', { size: 6 });
   
   // ✅ 更大（适合复杂内容）
   printer.qr('https://example.com/very/long/url', { size: 8 });
   ```

2. **使用更高的纠错级别**:
   ```typescript
   // L: 7% 纠错
   // M: 15% 纠错（默认）
   // Q: 25% 纠错
   // H: 30% 纠错
   printer.qr('content', { 
     size: 8, 
     errorCorrection: 'H'  // 最高纠错
   });
   ```

3. **减少二维码内容** - 内容越少，二维码越简单，越容易扫描

### 打印速度慢

**症状**: 打印任务执行很慢

**原因与解决方案**:

1. **分片太小**:
   ```typescript
   // ❌ 分片太小，传输次数多
   printer.setOptions({ chunkSize: 10, delay: 50 });
   
   // ✅ 合理的分片大小
   printer.setOptions({ chunkSize: 100, delay: 10 });
   ```

2. **延迟太大**:
   ```typescript
   // ❌ 延迟过大
   printer.setOptions({ delay: 100 });
   
   // ✅ 最小延迟（网络好的情况）
   printer.setOptions({ delay: 5 });
   ```

3. **启用调试日志影响性能**:
   ```typescript
   // 生产环境关闭调试日志
   import { Logger, LogLevel } from 'taro-bluetooth-print';
   Logger.setLevel(LogLevel.WARN); // 或 ERROR
   ```

## 网络问题

### 弱网环境下打印失败

**症状**: 网络不稳定时打印经常失败

**解决方案**:

```typescript
// 配置重试机制
printer.setOptions({
  chunkSize: 20,    // 较小的分片，降低单次失败影响
  delay: 50,        // 增加延迟，避免拥塞
  retries: 5,       // 增加重试次数
});

// 监听错误并重试
let retryCount = 0;
const maxRetries = 3;

printer.on('error', async (error) => {
  if (error.code === ErrorCode.WRITE_FAILED && retryCount < maxRetries) {
    retryCount++;
    console.log(`重试第 ${retryCount}次...`);
    try {
      await printer.resume();
    } catch (e) {
      console.error('重试失败:', e);
    }
  }
});
```

## 调试技巧

### 启用详细日志

```typescript
import { Logger, LogLevel } from 'taro-bluetooth-print';

// 开发环境启用 DEBUG 级别
if (process.env.NODE_ENV === 'development') {
  Logger.setLevel(LogLevel.DEBUG);
}

// 生产环境只记录错误
if (process.env.NODE_ENV === 'production') {
  Logger.setLevel(LogLevel.ERROR);
}
```

### 监听所有事件

```typescript
// 连接状态
printer.on('state-change', (state) => {
  console.log('[状态]', state);
});

// 打印进度
printer.on('progress', ({ sent, total }) => {
  const percent = ((sent / total) * 100).toFixed(1);
  console.log(`[进度] ${percent}% (${sent}/${total})`);
});

// 错误
printer.on('error', (error) => {
  console.error('[错误]', error.code, error.message);
  if (error.originalError) {
    console.error('[原始错误]', error.originalError);
  }
});

// 连接/断开
printer.on('connected', (deviceId) => {
  console.log('[已连接]', deviceId);
});

printer.on('disconnected', (deviceId) => {
  console.log('[已断开]', deviceId);
});

// 完成
printer.on('print-complete', () => {
  console.log('[完成] 打印任务已完成');
});
```

### 检查剩余字节

```typescript
// 打印前
console.log('待打印字节数:', printer.remaining());

// 打印中
printer.on('progress', ({ sent, total }) => {
  console.log('剩余字节数:', printer.remaining());
});
```

## 平台特定问题

### 微信小程序

**问题**: iOS 设备上蓝牙连接不稳定

**解决方案**:
- 确保小程序基础库版本 >= 2.9.2
- 在 `app.json` 中添加 `"lazyCodeLoading": "requiredComponents"`
- 使用 `wx.createBLEPeripheralServer` 时注意iOS限制

### H5 (Web Bluetooth)

**问题**: 浏览器提示不支持

**要求**:
- 必须使用 HTTPS
- Chrome 56+ / Edge 79+ / Opera 43+
- Safari 目前不支持 Web Bluetooth

**检查支持**:
```javascript
if ('bluetooth' in navigator) {
  console.log('浏览器支持 Web Bluetooth');
} else {
  console.log('浏览器不支持 Web Bluetooth');
}
```

## 常见错误码

| 错误码 | 说明 | 解决方案 |
|--------|------|---------|
| `CONNECTION_FAILED` | 连接失败 | 检查设备ID、蓝牙状态、权限 |
| `WRITE_FAILED` | 写入失败 | 增加重试次数，减小分片 |
| `SERVICE_NOT_FOUND` | 服务未发现 | 先调用 connect()，检查打印机型号 |
| `CHARACTERISTIC_NOT_FOUND` | 特征值未发现 | 打印机不支持或型号不兼容 |
| `PRINT_JOB_IN_PROGRESS` | 打印任务进行中 | 等待当前任务完成或取消 |
| `DEVICE_DISCONNECTED` | 设备已断开 | 重新连接设备 |

## 获取帮助

如果以上方案都无法解决您的问题：

1. 查看 [常见问题 (FAQ)](./faq.md)
2. 搜索 [GitHub Issues](https://github.com/agions/taro-bluetooth-print/issues)
3. 提交新的 [Issue](https://github.com/agions/taro-bluetooth-print/issues/new)
4. 查看 [API 文档](../api)

提交 Issue 时请包含：
- 完整的错误信息
- 复现步骤
- 环境信息（Taro版本、平台、打印机型号等）
- 相关代码片段
