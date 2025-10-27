# Taro 蓝牙打印库 v2.0

[![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)](https://github.com/example/taro-bluetooth-printer)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-4.9+-blue.svg)](https://www.typescriptlang.org/)

## 📋 简介

Taro 蓝牙打印库是一个功能强大、类型安全的跨平台蓝牙打印解决方案，支持多种打印机类型和模板系统。v2.0 版本采用全新的架构设计，基于 SOLID 原则和领域驱动设计，提供更好的可扩展性和维护性。

### ✨ 主要特性

- 🏗️ **全新架构**: 基于三层架构（应用层、领域层、基础设施层）
- 🔧 **依赖注入**: 内置 IoC 容器，支持灵活的组件配置
- 📡 **事件驱动**: 完整的事件系统，支持异步处理和中间件
- 📝 **模板系统**: 支持文本、收据、标签等多种模板类型
- 🚀 **队列管理**: 智能打印队列，支持优先级、重试和批量处理
- 📊 **配置管理**: 灵活的配置系统，支持环境变量和动态更新
- 📝 **类型安全**: 完整的 TypeScript 类型定义
- 🧪 **易于测试**: 高度模块化，便于单元测试和集成测试

## 🚀 快速开始

### 安装

```bash
npm install taro-bluetooth-printer
# 或
yarn add taro-bluetooth-printer
# 或
pnpm add taro-bluetooth-printer
```

### 基础使用

```typescript
import { BluetoothPrinter, createDefaultConfig } from 'taro-bluetooth-printer';

// 创建配置
const config = createDefaultConfig();

// 创建打印实例
const printer = new BluetoothPrinter(config);

// 初始化
await printer.initialize();

// 扫描设备
const devices = await printer.scanDevices(10000);

// 连接设备
const connection = await printer.connectDevice(devices[0].id);

// 打印文本
await printer.printText('Hello, World!');

// 打印二维码
await printer.printQRCode('https://example.com');

// 断开连接
await printer.disconnectDevice(devices[0].id);
```

## 📖 详细文档

### 核心概念

#### 1. 架构设计

库采用三层架构设计：

```
┌─────────────────────────────────────┐
│           应用层 (Application)        │
├─────────────────────────────────────┤
│           领域层 (Domain)            │
│  ┌─────────────┬─────────────────────┐ │
│  │ 蓝牙适配器   │ 打印机管理器        │ │
│  │ 模板引擎     │ 打印队列            │ │
│  └─────────────┴─────────────────────┘ │
├─────────────────────────────────────┤
│        基础设施层 (Infrastructure)    │
│  ┌─────────────┬─────────────────────┐ │
│  │ 依赖注入容器 │ 事件总线            │ │
│  │ 配置管理     │ 日志系统            │ │
│  └─────────────┴─────────────────────┘ │
└─────────────────────────────────────┘
```

#### 2. 主要组件

- **BluetoothAdapter**: 蓝牙设备管理，支持扫描、连接、断开
- **PrinterManager**: 打印机管理，支持多种打印机驱动
- **TemplateEngine**: 模板引擎，支持多种模板类型和渲染器
- **PrintQueue**: 打印队列，支持优先级、重试和批量处理
- **EventBus**: 事件总线，支持发布/订阅模式
- **ConfigManager**: 配置管理，支持动态配置和环境变量

### 配置系统

#### 默认配置

```typescript
import { createDefaultConfig, createDevelopmentConfig, createProductionConfig } from 'taro-bluetooth-printer';

// 使用默认配置
const config = createDefaultConfig();

// 开发环境配置
const devConfig = createDevelopmentConfig();

// 生产环境配置
const prodConfig = createProductionConfig();
```

#### 自定义配置

```typescript
const config = {
  bluetooth: {
    scanTimeout: 10000,
    connectionTimeout: 15000,
    autoReconnect: true,
    maxReconnectAttempts: 3,
    reconnectInterval: 2000
  },
  printer: {
    density: 8,
    speed: 4,
    paperWidth: 58,
    autoCut: false,
    charset: 'PC437',
    align: 'left'
  },
  queue: {
    maxSize: 100,
    concurrency: 1,
    retryAttempts: 3,
    retryDelay: 1000,
    autoProcess: true,
    processInterval: 500
  },
  template: {
    enableCache: true,
    cacheSize: 50,
    cacheTimeout: 300000,
    enableValidation: true
  },
  logging: {
    level: 'info',
    enableConsole: true,
    enableFile: false,
    maxFileSize: 10485760,
    maxFiles: 5
  },
  events: {
    enabled: true,
    maxListeners: 100,
    enableHistory: false,
    historySize: 1000
  }
};

const printer = new BluetoothPrinter(config);
```

### 模板系统

#### 注册模板

```typescript
// 文本模板
const textTemplate = {
  id: 'simple-text',
  name: '简单文本',
  type: 'text' as const,
  content: 'Hello, {{name}}!',
  variables: [
    { name: 'name', type: 'string', required: true }
  ],
  createdAt: new Date(),
  updatedAt: new Date(),
  version: '1.0.0',
  tags: ['text', 'simple'],
  metadata: {},
  enabled: true
};

await printer.registerTemplate(textTemplate);

// 使用模板
await printer.printTemplate('simple-text', { name: 'World' });
```

#### 收据模板

```typescript
const receiptTemplate = {
  id: 'standard-receipt',
  name: '标准收据',
  type: 'receipt' as const,
  content: {
    merchant: {
      name: '{{merchant.name}}',
      address: '{{merchant.address}}',
      phone: '{{merchant.phone}}'
    },
    order: {
      id: '{{order.id}}',
      items: [
        // 商品列表会自动生成
      ],
      subtotal: '{{order.subtotal}}',
      tax: '{{order.tax}}',
      total: '{{order.total}}'
    }
  },
  variables: [
    { name: 'merchant.name', type: 'string', required: true },
    { name: 'merchant.address', type: 'string', required: false },
    { name: 'merchant.phone', type: 'string', required: false },
    { name: 'order.id', type: 'string', required: true },
    { name: 'order.items', type: 'array', required: true },
    { name: 'order.subtotal', type: 'number', required: true },
    { name: 'order.tax', type: 'number', required: true },
    { name: 'order.total', type: 'number', required: true }
  ],
  createdAt: new Date(),
  updatedAt: new Date(),
  version: '1.0.0',
  tags: ['receipt', 'standard'],
  metadata: {},
  enabled: true
};

await printer.registerTemplate(receiptTemplate);

// 使用收据模板
const receiptData = {
  merchant: {
    name: '示例商店',
    address: '北京市朝阳区示例街道123号',
    phone: '010-12345678'
  },
  order: {
    id: 'ORD-2023-001',
    items: [
      { name: '商品A', quantity: 2, price: 10.00, total: 20.00 },
      { name: '商品B', quantity: 1, price: 15.50, total: 15.50 }
    ],
    subtotal: 35.50,
    tax: 3.55,
    total: 39.05
  }
};

await printer.printTemplate('standard-receipt', receiptData);
```

### 事件系统

```typescript
// 监听事件
printer.on('deviceDiscovered', (device) => {
  console.log('发现设备:', device.name);
});

printer.on('deviceConnected', (connection) => {
  console.log('设备已连接:', connection.deviceId);
});

printer.on('jobCompleted', (job) => {
  console.log('打印作业完成:', job.id);
});

printer.on('jobFailed', (job, error) => {
  console.error('打印作业失败:', error.message);
});

// 批量打印
const printRequests = [
  { type: 'text', content: '第一页' },
  { type: 'text', content: '第二页' },
  { type: 'qrcode', content: 'QR-CODE-CONTENT' }
];

const results = await printer.printBatch(printRequests);
```

### 队列管理

```typescript
// 获取队列状态
const status = printer.getQueueStatus();
console.log('队列状态:', status);

// 队列操作
printer.pauseQueue();    // 暂停队列
printer.resumeQueue();   // 恢复队列
printer.clearQueue();    // 清空队列

// 获取库的完整状态
const libStatus = printer.getStatus();
console.log('库状态:', libStatus);
```

## 🔧 高级用法

### 依赖注入

```typescript
import { Container, ServiceLifecycle } from 'taro-bluetooth-printer';

// 创建自定义容器
const container = new Container();

// 注册自定义服务
container.register('MyCustomService', () => new MyCustomService(), ServiceLifecycle.SINGLETON);

// 创建带自定义容器的打印实例
const printer = new BluetoothPrinter(config, {
  // 自定义选项
});
```

### 扩展模板渲染器

```typescript
import { TemplateEngine, ITemplateRenderer } from 'taro-bluetooth-printer';

class CustomTemplateRenderer implements ITemplateRenderer {
  public readonly name = 'CustomTemplateRenderer';
  public readonly supportedTypes = ['custom'];

  async render(template, data, context) {
    // 自定义渲染逻辑
    return new ArrayBuffer(0);
  }

  async validate(template) {
    return { valid: true, errors: [], warnings: [] };
  }

  getInfo() {
    return {
      name: this.name,
      supportedTypes: this.supportedTypes,
      features: ['custom-rendering']
    };
  }
}

// 注册自定义渲染器
const templateEngine = new TemplateEngine();
templateEngine.registerRenderer('custom', new CustomTemplateRenderer());
```

### 配置管理

```typescript
import { BluetoothPrinterConfigManager } from 'taro-bluetooth-printer';

const configManager = new BluetoothPrinterConfigManager();

// 更新配置
configManager.updateBluetoothConfig({
  scanTimeout: 15000,
  autoReconnect: false
});

configManager.updatePrinterConfig({
  density: 12,
  speed: 6
});

// 从环境变量加载
configManager.loadFromEnv();

// 保存到文件
await configManager.saveToFile('./config.json');

// 从文件加载
await configManager.loadFromFile('./config.json');

// 验证配置
const validation = configManager.validateConfig();
if (!validation.valid) {
  console.error('配置验证失败:', validation.errors);
}
```

## 🧪 测试

### 单元测试示例

```typescript
import { BluetoothPrinter } from 'taro-bluetooth-printer';

describe('BluetoothPrinter', () => {
  let printer: BluetoothPrinter;

  beforeEach(() => {
    printer = new BluetoothPrinter(createDevelopmentConfig());
  });

  afterEach(async () => {
    await printer.dispose();
  });

  it('should initialize successfully', async () => {
    await expect(printer.initialize()).resolves.not.toThrow();
  });

  it('should scan for devices', async () => {
    await printer.initialize();
    const devices = await printer.scanDevices(5000);
    expect(Array.isArray(devices)).toBe(true);
  });
});
```

## 📚 API 参考

### 主要类

- **BluetoothPrinter**: 主类，提供完整的蓝牙打印功能
- **BluetoothAdapter**: 蓝牙适配器，管理设备连接
- **PrinterManager**: 打印机管理器，处理打印任务
- **TemplateEngine**: 模板引擎，支持多种模板类型
- **PrintQueue**: 打印队列，管理打印作业

### 工具函数

- **createBluetoothPrinter**: 创建打印实例的工厂函数
- **createDefaultConfig**: 创建默认配置
- **createDevelopmentConfig**: 创建开发环境配置
- **createProductionConfig**: 创建生产环境配置

### 类型定义

完整的 TypeScript 类型定义，包括：
- 配置接口
- 事件类型
- 错误类型
- 模板类型
- 设备类型

## 🔄 迁移指南

### 从 v1.x 迁移到 v2.0

v2.0 是完全重写的版本，提供了更好的架构和类型安全。主要变化：

1. **新的初始化方式**:
   ```typescript
   // v1.x
   const printer = new TaroBluePrint(config);

   // v2.0
   const printer = new BluetoothPrinter(config);
   await printer.initialize();
   ```

2. **事件系统变更**:
   ```typescript
   // v1.x
   printer.on('deviceFound', callback);

   // v2.0
   printer.on('deviceDiscovered', callback);
   ```

3. **模板系统重构**:
   ```typescript
   // v1.x (字符串模板)
   const template = 'Hello {{name}}!';

   // v2.0 (结构化模板)
   const template = {
     id: 'my-template',
     name: 'My Template',
     type: 'text',
     content: 'Hello {{name}}!',
     // ... 更多属性
   };
   ```

## 🤝 贡献

欢迎贡献代码！请查看 [CONTRIBUTING.md](CONTRIBUTING.md) 了解详细信息。

### 开发环境设置

```bash
# 克隆仓库
git clone https://github.com/example/taro-bluetooth-printer.git
cd taro-bluetooth-printer

# 安装依赖
npm install

# 运行测试
npm test

# 构建项目
npm run build

# 运行示例
npm run example
```

## 📄 许可证

MIT License - 查看 [LICENSE](LICENSE) 文件了解详细信息。

## 🆘 支持

- 📧 邮箱: support@example.com
- 🐛 问题反馈: [GitHub Issues](https://github.com/example/taro-bluetooth-printer/issues)
- 📖 文档: [在线文档](https://example.com/docs)

## 🗺️ 路线图

- [ ] 支持更多打印机型号
- [ ] 添加云模板管理
- [ ] 支持网络打印
- [ ] 移动端优化
- [ ] 调试工具和可视化界面

---

**Taro 蓝牙打印库 v2.0** - 让蓝牙打印变得简单而强大！ 🚀