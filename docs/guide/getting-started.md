# 快速开始指南

本指南将帮助您快速上手 Taro Bluetooth Print v2.0 库，了解现代化的架构设计和使用方法。

## 🆕 v2.0 新特性

- **🏗️ 全新架构**: 基于依赖注入和事件驱动的现代化架构
- **🔧 类型安全**: 完整的 TypeScript 支持，类型覆盖率 100%
- **📊 事件系统**: 基于发布订阅模式的异步事件处理
- **🎯 模块化**: 完全模块化的设计，支持按需加载
- **🧪 测试友好**: 内置 Mock 工具和测试辅助功能

## 环境要求

- **Node.js**: 16.0 或更高版本
- **Taro**: 3.6.0 或更高版本
- **TypeScript**: 4.5 或更高版本（推荐）
- **设备**: 支持蓝牙的设备（微信小程序、H5、React Native）

## 安装

```bash
# 使用 npm
npm install taro-bluetooth-print

# 使用 yarn
yarn add taro-bluetooth-print

# 使用 pnpm
pnpm add taro-bluetooth-print
```

## 基础用法

### 1. 导入和创建实例

```typescript
import { createBluetoothPrinter } from 'taro-bluetooth-print';

// 使用工厂函数创建实例
const printer = createBluetoothPrinter({
  // 蓝牙配置
  bluetooth: {
    scanTimeout: 10000, // 扫描超时 10 秒
    connectionTimeout: 8000, // 连接超时 8 秒
    autoReconnect: true, // 启用自动重连
    maxReconnectAttempts: 3 // 最大重连 3 次
  },

  // 打印机配置
  printer: {
    paperWidth: 58, // 58mm 纸张宽度
    density: 8, // 打印密度
    autoCut: true, // 自动切纸
    charset: 'PC437' // 字符集
  },

  // 队列配置
  queue: {
    maxSize: 100, // 队列最大 100 个任务
    concurrency: 1, // 并发数 1
    autoProcess: true // 自动处理队列
  },

  // 日志配置
  logging: {
    level: 'info', // 日志级别
    enableConsole: true // 启用控制台输出
  }
});
```

### 2. 初始化

```typescript
try {
  // 必须先进行初始化
  await printer.initialize();
  console.log('✅ 打印机初始化成功');
} catch (error) {
  console.error('❌ 初始化失败:', error);
}
```

### 3. 扫描和连接设备

```typescript
// 监听设备发现事件
printer.on('bluetooth:device-found', device => {
  console.log('📱 发现设备:', device.name || '未知设备', device.deviceId);
});

// 开始扫描设备
const devices = await printer.scanDevices();
console.log(`🔍 发现 ${devices.length} 个设备`);

if (devices.length === 0) {
  console.log('⚠️ 未发现可用设备');
  return;
}

// 连接到第一个设备
const device = devices[0];
const connected = await printer.connect(device.deviceId);

if (connected) {
  console.log('✅ 设备连接成功:', device.name);
} else {
  console.log('❌ 设备连接失败');
  return;
}
```

### 4. 监听连接状态

```typescript
// 监听连接状态变化
printer.on('bluetooth:connected', ({ deviceId }) => {
  console.log('🔗 设备已连接:', deviceId);
});

printer.on('bluetooth:disconnected', ({ deviceId }) => {
  console.log('🔌 设备已断开:', deviceId);
});

printer.on('bluetooth:error', error => {
  console.error('🚨 蓝牙错误:', error.message);
});
```

### 5. 打印内容

```typescript
// 监听打印任务状态
printer.on('printer:job-started', ({ jobId }) => {
  console.log('🖨️ 打印任务开始:', jobId);
});

printer.on('printer:job-completed', ({ jobId }) => {
  console.log('✅ 打印任务完成:', jobId);
});

printer.on('printer:job-failed', ({ jobId, error }) => {
  console.error('❌ 打印任务失败:', jobId, error.message);
});

// 打印文本
await printer.printText('Hello, Taro Bluetooth Print v2.0!', {
  align: 'center',
  bold: true
});

// 打印多行文本
await printer.printText([
  '产品名称: 蓝牙打印机测试',
  '价格: ¥299.00',
  '数量: 1',
  { text: '合计: ¥299.00', bold: true, align: 'right' }
]);

// 打印分隔线
await printer.printText('='.repeat(32), { align: 'center' });

// 打印二维码
await printer.printQRCode('https://github.com/Agions/taro-bluetooth-print', {
  size: 8,
  align: 'center'
});

// 打印条形码
await printer.printBarcode('1234567890128', {
  type: 'EAN13',
  height: 60,
  align: 'center',
  position: 'below'
});
```

### 6. 使用模板打印

```typescript
// 注册收据模板
await printer.registerTemplate({
  id: 'simple-receipt',
  name: '简单收据',
  type: 'receipt',
  description: '用于测试的简单收据模板',
  content: `
    {{#header}}
    {{title}}
    {{/header}}

    {{#merchant}}
    商户: {{name}}
    {{#address}}地址: {{address}}{{/address}}
    {{/merchant}}

    ------------------------
    {{#items}}
    {{name}}
    {{quantity}} × {{price}} = {{total}}
    {{/items}}
    ------------------------

    {{#footer}}
    总计: {{total}}
    日期: {{date}}
    {{footer}}
  `,
  enabled: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  version: '1.0.0',
  tags: ['receipt', 'simple']
});

// 使用模板打印
const receiptData = {
  header: {
    title: '购物小票'
  },
  merchant: {
    name: '示例商店',
    address: '北京市朝阳区示例路123号'
  },
  items: [
    { name: '商品A', quantity: 2, price: 29.9, total: 59.8 },
    { name: '商品B', quantity: 1, price: 15.0, total: 15.0 }
  ],
  footer: {
    total: '¥74.80',
    date: new Date().toLocaleDateString()
  }
};

await printer.printTemplate('simple-receipt', receiptData);
```

### 7. 批量打印

```typescript
// 创建批量打印请求
const batchRequests = [
  {
    type: 'text',
    content: '=== 批量打印测试 ===',
    options: { align: 'center', bold: true }
  },
  {
    type: 'text',
    content: '这是第一个打印任务'
  },
  {
    type: 'qrcode',
    content: 'https://example.com/batch-test',
    options: { size: 6, align: 'center' }
  },
  {
    type: 'text',
    content: '这是最后一个打印任务'
  }
];

// 执行批量打印
const jobIds = await printer.printBatch(batchRequests);
console.log('📋 批量打印任务已提交:', jobIds);

// 检查队列状态
const queueStatus = printer.getQueueStatus();
console.log('📊 队列状态:', queueStatus);
```

### 8. 断开连接

```typescript
// 断开连接
const disconnected = await printer.disconnect();

if (disconnected) {
  console.log('✅ 设备已断开连接');
} else {
  console.log('⚠️ 断开连接失败');
}
```

### 9. 资源清理

```typescript
// 在应用退出时清理资源
await printer.dispose();
console.log('🧹 资源清理完成');
```

## 完整示例

### React 组件示例

```typescript
import React, { useState, useEffect } from 'react';
import { View, Button, Text } from '@tarojs/components';
import { createBluetoothPrinter } from 'taro-bluetooth-print';

const BluetoothPrinterExample: React.FC = () => {
  const [printer] = useState(() => createBluetoothPrinter());
  const [devices, setDevices] = useState([]);
  const [connected, setConnected] = useState(false);
  const [status, setStatus] = useState('未连接');

  useEffect(() => {
    // 初始化打印机
    printer
      .initialize()
      .then(() => {
        setStatus('已初始化');
      })
      .catch(error => {
        console.error('初始化失败:', error);
        setStatus('初始化失败');
      });

    // 监听事件
    printer.on('bluetooth:device-found', device => {
      setDevices(prev => [...prev, device]);
    });

    printer.on('bluetooth:connected', () => {
      setConnected(true);
      setStatus('已连接');
    });

    printer.on('bluetooth:disconnected', () => {
      setConnected(false);
      setStatus('未连接');
    });

    return () => {
      printer.dispose();
    };
  }, []);

  const handleScan = async () => {
    try {
      setDevices([]);
      setStatus('扫描中...');
      await printer.scanDevices();
      setStatus('扫描完成');
    } catch (error) {
      console.error('扫描失败:', error);
      setStatus('扫描失败');
    }
  };

  const handleConnect = async (deviceId: string) => {
    try {
      setStatus('连接中...');
      const success = await printer.connect(deviceId);
      if (!success) {
        setStatus('连接失败');
      }
    } catch (error) {
      console.error('连接失败:', error);
      setStatus('连接失败');
    }
  };

  const handlePrint = async () => {
    if (!connected) {
      setStatus('请先连接设备');
      return;
    }

    try {
      setStatus('打印中...');
      await printer.printText('Hello from React Component!', {
        align: 'center',
        bold: true
      });
      setStatus('打印完成');
    } catch (error) {
      console.error('打印失败:', error);
      setStatus('打印失败');
    }
  };

  const handleDisconnect = async () => {
    try {
      await printer.disconnect();
    } catch (error) {
      console.error('断开连接失败:', error);
    }
  };

  return (
    <View className="container">
      <Text>状态: {status}</Text>

      <Button onClick={handleScan} disabled={status === '扫描中...'}>
        扫描设备
      </Button>

      {devices.length > 0 && (
        <View>
          <Text>发现设备:</Text>
          {devices.map(device => (
            <View key={device.deviceId}>
              <Text>
                {device.name || '未知设备'} ({device.deviceId})
              </Text>
              <Button onClick={() => handleConnect(device.deviceId)} disabled={connected}>
                连接
              </Button>
            </View>
          ))}
        </View>
      )}

      {connected && (
        <View>
          <Button onClick={handlePrint}>打印测试</Button>
          <Button onClick={handleDisconnect}>断开连接</Button>
        </View>
      )}
    </View>
  );
};

export default BluetoothPrinterExample;
```

## 配置选项详解

### 蓝牙配置

```typescript
bluetooth: {
  scanTimeout: number; // 扫描超时时间(ms)
  connectionTimeout: number; // 连接超时时间(ms)
  autoReconnect: boolean; // 自动重连
  maxReconnectAttempts: number; // 最大重连次数
  reconnectInterval: number; // 重连间隔(ms)
}
```

### 打印机配置

```typescript
printer: {
  density: number; // 打印密度 (0-8)
  speed: number; // 打印速度 (0-4)
  paperWidth: number; // 纸张宽度 (mm)
  autoCut: boolean; // 自动切纸
  charset: string; // 字符集
  align: 'left' | 'center' | 'right'; // 默认对齐方式
}
```

### 队列配置

```typescript
queue: {
  maxSize: number; // 队列最大大小
  concurrency: number; // 并发处理数
  retryAttempts: number; // 重试次数
  retryDelay: number; // 重试延迟(ms)
  autoProcess: boolean; // 自动处理
  processInterval: number; // 处理间隔(ms)
}
```

## 错误处理

### 错误类型

```typescript
import { BluetoothError, PrintError, ConfigError } from 'taro-bluetooth-print';

try {
  await printer.connect(deviceId);
} catch (error) {
  if (error instanceof BluetoothError) {
    console.error('蓝牙连接错误:', error.message);
    // 处理蓝牙特定的错误
  } else if (error instanceof PrintError) {
    console.error('打印错误:', error.message);
    // 处理打印相关的错误
  } else if (error instanceof ConfigError) {
    console.error('配置错误:', error.message);
    // 处理配置相关的错误
  } else {
    console.error('未知错误:', error);
  }
}
```

### 错误恢复

```typescript
// 监听错误事件并进行恢复
printer.on('bluetooth:error', async error => {
  console.error('蓝牙错误:', error);

  // 尝试重新扫描
  try {
    await printer.scanDevices();
  } catch (scanError) {
    console.error('重新扫描失败:', scanError);
  }
});
```

## 性能优化

### 事件监听器管理

```typescript
// 添加监听器
const deviceFoundHandler = device => {
  console.log('发现设备:', device);
};

printer.on('bluetooth:device-found', deviceFoundHandler);

// 及时移除监听器以避免内存泄漏
printer.off('bluetooth:device-found', deviceFoundHandler);
```

### 队列管理

```typescript
// 检查队列状态，避免队列过载
const queueStatus = printer.getQueueStatus();

if (queueStatus.pending > 50) {
  console.warn('队列任务过多，考虑延迟提交新任务');
}

// 暂停队列处理
// printer.pauseQueue();

// 恢复队列处理
// printer.resumeQueue();
```

## 下一步

- 📱 [蓝牙连接详解](./bluetooth-connection.md) - 深入了解蓝牙连接机制
- 🖨️ [打印机配置](./printer-configuration.md) - 配置不同类型的打印机
- 🖼️ [图片打印](./image-printing.md) - 学习如何打印图片和二维码
- ⚡ [性能优化](./performance.md) - 优化应用性能和用户体验
- 🛠️ [错误处理](./error-handling.md) - 处理常见的错误情况

## 常见问题

<details>
<summary>初始化失败怎么办？</summary>

1. 检查是否在支持的环境中运行
2. 确认设备支持蓝牙功能
3. 检查应用权限是否正确配置
4. 查看控制台错误信息

```typescript
// 检查环境支持
const isSupported = printer.isSupported();
if (!isSupported) {
  console.error('当前环境不支持蓝牙功能');
}
```

</details>

<details>
<summary>设备连接不稳定怎么办？</summary>

1. 启用自动重连功能
2. 调整连接超时时间
3. 监听连接状态变化
4. 实现重连逻辑

```typescript
const printer = createBluetoothPrinter({
  bluetooth: {
    autoReconnect: true,
    maxReconnectAttempts: 5,
    reconnectInterval: 2000
  }
});
```

</details>

<details>
<summary>打印队列堵塞怎么办？</summary>

1. 监控队列状态
2. 调整并发数量
3. 实现队列优先级管理
4. 考虑任务取消机制

```typescript
// 检查队列状态
const status = printer.getQueueStatus();
console.log('队列状态:', status);

// 清空队列（谨慎使用）
if (status.pending > 100) {
  await printer.clearQueue();
}
```

</details>

## 获取帮助

如果遇到问题，可以通过以下方式获取帮助：

- 📚 查看 [完整 API 文档](../api/README.md)
- 🔍 浏览 [示例代码](../examples/)
- 🐛 提交 [GitHub Issue](https://github.com/Agions/taro-bluetooth-print/issues)
- 💬 参与 [社区讨论](https://github.com/Agions/taro-bluetooth-print/discussions)

---

_本指南随项目更新，最后更新时间: 2024 年 10 月_
