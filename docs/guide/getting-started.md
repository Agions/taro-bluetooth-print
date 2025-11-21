# 快速开始

## 安装

```bash
npm install taro-bluetooth-print
# or
yarn add taro-bluetooth-print
```

## 基础使用

```typescript
import { BluetoothPrinter } from 'taro-bluetooth-print';

// 初始化打印机
const printer = new BluetoothPrinter();

// 连接设备
await printer.connect('device-id');

// 打印文本
printer.text('Hello World')
       .feed(2)
       .cut();

// 发送指令
await printer.print();
```

## 配置适配器

针对弱网环境，可以配置适配器参数：

```typescript
printer.setOptions({
  chunkSize: 20,    // 分片大小
  delay: 20,        // 分片延迟 (ms)
  retries: 3        // 重试次数
});
```
