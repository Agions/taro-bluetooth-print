# taro-bluetooth-print

适用于Taro的蓝牙打印工具库，优化了图像处理和用户体验。

## 最新版本

[![npm version](https://img.shields.io/badge/npm-1.0.9-blue.svg)](https://www.npmjs.com/package/taro-bluetooth-print)

最新版本（1.0.9）进行了重大更新，包括构建系统重构（Vite + webpack）、文档系统升级（VitePress + PWA）、跨平台兼容性优化和性能提升。详见[更新日志](./CHANGELOG.md)。

## 特性

- 蓝牙热敏打印机连接和通信
- Web Worker处理图像和OCR任务
- 内存自动释放和资源管理
- 相机拍照和图像预处理
- 离线支持和PWA特性
- 完全支持Taro多端开发

## 安装

```bash
npm install taro-bluetooth-print
```

## 使用示例

```typescript
import { BluetoothPrinter } from 'taro-bluetooth-print';

// 创建打印机实例
const printer = new BluetoothPrinter();

// 连接打印机
try {
  const device = await printer.connectDeviceByName('打印机名称');
  
  // 打印文本
  await printer.printText('Hello World');
  
  // 打印 ESC/POS 指令
  const escCommand = new Uint8Array([0x1B, 0x40]); // ESC @ 初始化打印机
  await printer.printEscCommand(escCommand);
} catch (error) {
  console.error('打印错误:', error);
}

// 关闭连接
await printer.close();
```

## API 文档

详细 API 文档请参阅：[API 文档](./docs/API.md)

### 基本用法

```typescript
import { BluetoothPrinter } from 'taro-bluetooth-print';

// 创建打印机实例
const printer = new BluetoothPrinter();

// 连接打印机
try {
  const device = await printer.connectDeviceByName('打印机名称');
  
  // 打印文本
  await printer.printText('Hello World');
  
  // 打印 ESC/POS 指令
  const escCommand = new Uint8Array([0x1B, 0x40]); // ESC @ 初始化打印机
  await printer.printEscCommand(escCommand);
} catch (error) {
  console.error('打印错误:', error);
}

// 关闭连接
await printer.close();
```

## 开发指南

### 本地开发

1. 克隆仓库
```bash
git clone https://github.com/Agions/taro-bluetooth-print.git
cd taro-bluetooth-print
```

2. 安装依赖
```bash
npm install
```

3. 开发模式
```bash
npm run start
```

4. 构建
```bash
npm run build
```

### 测试

```bash
npm test
```

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！
