# React Native 示例

基于 React Native 的完整打印页面示例，支持 iOS + Android。

## 文件结构

```
react-native/
└── PrinterScreen.tsx   # 完整打印屏幕组件
```

## 前置条件

- Node.js >= 18
- React Native 0.72+
- iOS: Xcode 15+ / CocoaPods
- Android: SDK 21+ / Gradle 8+

## 快速开始

### 1. 安装依赖

```bash
# 安装核心库
pnpm add taro-bluetooth-print

# iOS 安装原生依赖
cd ios && pod install && cd ..
```

### 2. 配置原生权限

**iOS** — `ios/YourProject/Info.plist`:

```xml
<key>NSBluetoothAlwaysUsageDescription</key>
<string>需要使用蓝牙连接打印机</string>
<key>NSBluetoothPeripheralUsageDescription</key>
<string>需要使用蓝牙连接打印机</string>
```

**Android** — `android/app/src/main/AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.BLUETOOTH" />
<uses-permission android:name="android.permission.BLUETOOTH_ADMIN" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.BLUETOOTH_SCAN" />
<uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />
```

### 3. 链接原生模块

React Native 0.60+ 支持自动链接，无需手动配置。如遇到链接问题：

```bash
# iOS
npx pod-install

# Android
cd android && ./gradlew clean && cd ..
```

### 4. 使用组件

```typescript
import { PrinterScreen } from './PrinterScreen';

export default function App() {
  return <PrinterScreen />;
}
```

## 功能特性

| 功能 | 说明 |
|:---|:---|
| 蓝牙扫描 | 扫描附近 BLE 打印机设备 |
| 自动连接 | 记住上次设备 ID，下次自动重连 |
| 小票打印 | 完整收据示例（商品 / 合计 / 二维码） |
| 标签打印 | TSPL / ZPL 标签示例 |
| 打印队列 | 多任务排队 + 进度条 |
| 断点续传 | 大文件分片 + 断点续打 |
| 事件系统 | progress / error / state-change 全事件 |

## 核心代码说明

### 初始化

```typescript
import {
  BluetoothPrinter,
  ReactNativeAdapter,
  DeviceManager,
  PrintQueue,
} from 'taro-bluetooth-print';

const adapter = new ReactNativeAdapter({
  ios: { showAlert: true },
  android: { requireLocationPermission: true },
});

const printer = new BluetoothPrinter({ adapter });
```

### 扫描设备

```typescript
const devices = await adapter.scanDevices({
  services: ['000018f0-0000-1000-8000-00805f9b34fb'],
  allowDuplicates: false,
});
```

### 打印小票

```typescript
await printer
  .text('=== 欢迎光临 ===', { align: 'center', bold: true, fontSize: 24 })
  .feed()
  .text('商品A     x1    ¥10.00')
  .text('商品B     x2    ¥20.00')
  .feed()
  .text('------------------------')
  .text('合计：            ¥30.00', { bold: true })
  .feed(2)
  .qr('https://example.com', { size: 6 })
  .feed(2)
  .cut()
  .print();
```

### 监听事件

```typescript
printer.on('progress', ({ sent, total }) => {
  const percent = ((sent / total) * 100).toFixed(1);
  updateProgressBar(percent);
});

printer.on('print-complete', () => {
  showToast('打印完成');
});

printer.on('error', (err) => {
  console.error('打印错误:', err.code, err.message);
});
```

## 平台差异

| 功能 | iOS | Android |
|:---|:---|:---|
| 蓝牙扫描 | ✅ | ✅ |
| BLE 连接 | ✅ | ✅ |
| 打印收据 | ✅ | ✅ |
| 打印标签 | ✅ | ✅ |
| 断点续传 | ✅ | ✅ |
| 打印队列 | ✅ | ✅ |

## 常见问题

**Q: iOS 扫描不到设备？**  
A: 确认 `Info.plist` 中已添加蓝牙权限描述，且设备蓝牙已开启。

**Q: Android 连接成功但打印失败？**  
A: 检查是否已申请 `BLUETOOTH_CONNECT` 权限（Android 12+），并确认打印机 UUID 匹配。

**Q: 打印乱码？**  
A: 检查打印机编码设置，ESC/POS 打印机通常使用 GBK 编码。

**Q: 如何调试？**  
A: 使用 `react-native log-ios` 或 `react-native log-android` 查看原生层日志。

## 相关链接

- [完整文档](https://agions.github.io/taro-bluetooth-print/)
- [React Native 蓝牙指南](https://reactnative.dev/docs/bluetooth)
- [返回 examples 目录](../)
