# 示例代码集合

本目录包含了 Taro Bluetooth Print v2.0 的完整示例代码，涵盖了各种使用场景和最佳实践。

## 📁 目录结构

```
examples/
├── README.md                   # 本文件
├── basic/                      # 基础使用示例
│   ├── quick-start.ts          # 快速开始
│   ├── text-printing.ts        # 文本打印
│   ├── image-printing.ts       # 图片打印
│   └── qr-barcode.ts           # 二维码和条形码
├── advanced/                  # 高级示例
│   ├── batch-printing.ts      # 批量打印
│   ├── template-system.ts     # 模板系统
│   ├── event-handling.ts      # 事件处理
│   └── error-recovery.ts      # 错误恢复
├── integration/               # 集成示例
│   ├── react-hooks.ts         # React Hooks
│   ├── vue-composition.ts     # Vue Composition API
│   └── typescript-decorators.ts # TypeScript 装饰器
├── real-world/               # 实际应用场景
│   ├── restaurant-pos.ts      # 餐厅POS系统
│   ├── logistics-label.ts     # 物流标签打印
│   └── retail-receipt.ts      # 零售收据
└── testing/                  # 测试相关
    ├── unit-tests.ts          # 单元测试示例
    ├── integration-tests.ts   # 集成测试示例
    └── e2e-tests.ts           # 端到端测试示例
```

## 🚀 快速开始

### 运行示例

```bash
# 克隆项目
git clone https://github.com/Agions/taro-bluetooth-print.git
cd taro-bluetooth-print

# 安装依赖
npm install

# 进入示例目录
cd examples

# 运行基础示例
npm run example:basic

# 运行高级示例
npm run example:advanced

# 运行集成示例
npm run example:integration
```

## 📱 基础示例

### 1. 快速开始示例

**文件**: `basic/quick-start.ts`

```typescript
import { createBluetoothPrinter } from 'taro-bluetooth-print';

/**
 * 快速开始示例
 * 展示最基本的打印功能
 */
export class QuickStartExample {
  private printer = createBluetoothPrinter();

  async run() {
    try {
      console.log('🚀 开始快速开始示例...');

      // 1. 初始化
      await this.printer.initialize();
      console.log('✅ 初始化完成');

      // 2. 扫描设备
      const devices = await this.printer.scanDevices();
      console.log(`🔍 发现 ${devices.length} 个设备`);

      if (devices.length === 0) {
        console.log('⚠️ 未发现设备，示例结束');
        return;
      }

      // 3. 连接设备
      const device = devices[0];
      console.log(`📱 连接到设备: ${device.name || '未知设备'}`);

      const connected = await this.printer.connect(device.deviceId);
      if (!connected) {
        throw new Error('设备连接失败');
      }

      // 4. 打印测试内容
      await this.printTestContent();

      // 5. 断开连接
      await this.printer.disconnect();
      console.log('✅ 示例执行完成');
    } catch (error) {
      console.error('❌ 示例执行失败:', error);
    } finally {
      // 清理资源
      await this.printer.dispose();
    }
  }

  private async printTestContent() {
    // 打印标题
    await this.printer.printText('=== Taro Bluetooth Print ===', {
      align: 'center',
      bold: true
    });

    // 打印文本
    await this.printer.printText('Hello, World!');
    await this.printer.printText('这是一个简单的打印示例');

    // 打印分隔线
    await this.printer.printText('-'.repeat(20));

    // 打印二维码
    await this.printer.printQRCode('https://github.com/Agions/taro-bluetooth-print', {
      size: 8,
      align: 'center'
    });

    // 走纸
    await this.printer.feed(3);
  }
}

// 运行示例
if (require.main === module) {
  const example = new QuickStartExample();
  example.run();
}
```

### 2. 文本打印示例

**文件**: `basic/text-printing.ts`

```typescript
import { createBluetoothPrinter } from 'taro-bluetooth-print';

/**
 * 文本打印示例
 * 展示各种文本格式和样式
 */
export class TextPrintingExample {
  private printer = createBluetoothPrinter({
    printer: {
      paperWidth: 58,
      charset: 'PC437'
    }
  });

  async run() {
    await this.printer.initialize();

    const devices = await this.printer.scanDevices();
    if (devices.length > 0) {
      await this.printer.connect(devices[0].deviceId);

      // 演示文本打印功能
      await this.demonstrateTextPrinting();

      await this.printer.disconnect();
    }

    await this.printer.dispose();
  }

  private async demonstrateTextPrinting() {
    console.log('📝 演示文本打印功能...');

    // 1. 基本文本
    await this.printer.printText('基础文本打印');

    // 2. 居中对齐
    await this.printer.printText('居中对齐文本', {
      align: 'center'
    });

    // 3. 右对齐
    await this.printer.printText('右对齐文本', {
      align: 'right'
    });

    // 4. 加粗文本
    await this.printer.printText('加粗文本', {
      bold: true
    });

    // 5. 双倍高度
    await this.printer.printText('双倍高度文本', {
      doubleHeight: true
    });

    // 6. 双倍宽度
    await this.printer.printText('双倍宽度文本', {
      doubleWidth: true
    });

    // 7. 下划线
    await this.printer.printText('下划线文本', {
      underline: true
    });

    // 8. 组合样式
    await this.printer.printText('组合样式文本', {
      align: 'center',
      bold: true,
      doubleHeight: true,
      doubleWidth: true,
      underline: true
    });

    // 9. 多行文本
    await this.printer.printText(['多行文本第一行', '多行文本第二行', '多行文本第三行']);

    // 10. 混合样式多行
    await this.printer.printText([
      { text: '标题:', bold: true },
      '这是标题内容',
      { text: '价格:', bold: true, align: 'right' },
      { text: '¥299.00', align: 'right' }
    ]);

    console.log('✅ 文本打印演示完成');
  }
}
```

### 3. 图片打印示例

**文件**: `basic/image-printing.ts`

```typescript
import { createBluetoothPrinter } from 'taro-bluetooth-print';

/**
 * 图片打印示例
 * 展示如何打印本地图片、网络图片和二维码
 */
export class ImagePrintingExample {
  private printer = createBluetoothPrinter({
    printer: {
      paperWidth: 58,
      density: 8
    }
  });

  async run() {
    await this.printer.initialize();

    const devices = await this.printer.scanDevices();
    if (devices.length > 0) {
      await this.printer.connect(devices[0].deviceId);

      await this.demonstrateImagePrinting();

      await this.printer.disconnect();
    }

    await this.printer.dispose();
  }

  private async demonstrateImagePrinting() {
    console.log('🖼️ 演示图片打印功能...');

    // 1. 打印本地图片（小程序）
    const localImagePath = '/images/logo.png';
    await this.printer.printImage(localImagePath, {
      maxWidth: 200,
      align: 'center',
      dithering: true
    });

    // 2. 打印网络图片
    const networkImageUrl = 'https://example.com/logo.png';
    await this.printer.printImage(networkImageUrl, {
      maxWidth: 180,
      align: 'center',
      dithering: false
    });

    // 3. 打印Base64图片
    const base64Image = 'data:image/png;base64,iVBORw0KGgoAAAANS...';
    await this.printer.printImage(base64Image, {
      maxWidth: 160,
      align: 'center'
    });

    // 4. 图片与文本混合
    await this.printer.printText('产品图片:', { bold: true });
    await this.printer.printImage('/images/product.png', {
      maxWidth: 150,
      align: 'center'
    });

    console.log('✅ 图片打印演示完成');
  }
}
```

### 4. 二维码和条形码示例

**文件**: `basic/qr-barcode.ts`

```typescript
import { createBluetoothPrinter } from 'taro-bluetooth-print';

/**
 * 二维码和条形码示例
 * 展示各种条码格式的打印
 */
export class QRBarcodeExample {
  private printer = createBluetoothPrinter();

  async run() {
    await this.printer.initialize();

    const devices = await this.printer.scanDevices();
    if (devices.length > 0) {
      await this.printer.connect(devices[0].deviceId);

      await this.demonstrateQRCodes();
      await this.demonstrateBarcodes();

      await this.printer.disconnect();
    }

    await this.printer.dispose();
  }

  private async demonstrateQRCodes() {
    console.log('📱 演示二维码打印...');

    // 1. 简单文本二维码
    await this.printer.printQRCode('https://github.com/Agions/taro-bluetooth-print');

    // 2. 带选项的二维码
    await this.printer.printQRCode('https://github.com/Agions/taro-bluetooth-print', {
      size: 8,
      errorCorrection: 'H',
      align: 'center'
    });

    // 3. 小尺寸二维码
    await this.printer.printQRCode('small', { size: 4 });

    // 4. 大尺寸二维码
    await this.printer.printQRCode('large', { size: 12 });

    // 5. 不同纠错级别
    const errorCorrectionLevels = ['L', 'M', 'Q', 'H'] as const;
    for (const level of errorCorrectionLevels) {
      await this.printer.printText(`${level} 纠别:`, { bold: true });
      await this.printer.printQRCode(`https://example.com/error-${level}`, {
        errorCorrection: level,
        size: 8
      });
    }

    console.log('✅ 二维码演示完成');
  }

  private async demonstrateBarcodes() {
    console.log('📊 演示条形码打印...');

    // 1. CODE128
    await this.printer.printBarcode('1234567890', {
      type: 'CODE128',
      height: 60,
      align: 'center',
      position: 'below'
    });

    // 2. EAN13
    await this.printer.printBarcode('1234567890128', {
      type: 'EAN13',
      height: 60,
      align: 'center',
      position: 'below'
    });

    // 3. CODE39
    await this.printer.printBarcode('ABC123', {
      type: 'CODE39',
      height: 60,
      align: 'center',
      position: 'below'
    });

    // 4. ITF
    await this.printer.printBarcode('12345678', {
      type: 'ITF',
      height: 60,
      align: 'center',
      position: 'below'
    });

    // 5. 不同宽度的条形码
    const widths = [1, 2, 3, 4];
    for (const width of widths) {
      await this.printer.printText(`宽度 ${width}:`, { bold: true });
      await this.printer.printBarcode('1234567890', {
        type: 'CODE128',
        width,
        height: 60,
        align: 'center',
        position: 'below'
      });
    }

    console.log('✅ 条形码演示完成');
  }
}
```

## 🔧 高级示例

### 1. 批量打印示例

**文件**: `advanced/batch-printing.ts`

```typescript
import { createBluetoothPrinter } from 'taro-bluetooth-print';

/**
 * 批量打印示例
 * 展示如何高效处理大量打印任务
 */
export class BatchPrintingExample {
  private printer = createBluetoothPrinter({
    queue: {
      maxSize: 1000,
      concurrency: 2,
      autoProcess: true
    }
  });

  async run() {
    await this.printer.initialize();

    const devices = await this.printer.scanDevices();
    if (devices.length > 0) {
      await this.printer.connect(devices[0].deviceId);

      await this.demonstrateBatchPrinting();

      await this.printer.disconnect();
    }

    await this.printer.dispose();
  }

  private async demonstrateBatchPrinting() {
    console.log('📋 演示批量打印...');

    // 1. 创建大量打印请求
    const requests = this.createBatchRequests(100);

    // 2. 监听打印进度
    this.setupProgressMonitoring();

    // 3. 执行批量打印
    const startTime = Date.now();
    const jobIds = await this.printer.printBatch(requests);
    const endTime = Date.now();

    console.log(`✅ 批量打印完成，耗时: ${endTime - startTime}ms`);
    console.log(`📊 提交任务数: ${jobIds.length}`);

    // 4. 等待所有任务完成
    await this.waitForCompletion(jobIds);
  }

  private createBatchRequests(count: number) {
    const requests = [];

    for (let i = 0; i < count; i++) {
      requests.push({
        type: 'text',
        content: `批量打印任务 ${i + 1}/${count}`,
        options: {
          bold: i % 10 === 0,
          align: i % 3 === 0 ? 'center' : 'left'
        },
        priority: this.getPriority(i, count)
      });
    }

    return requests;
  }

  private getPriority(index: number, total: number): 'low' | 'normal' | 'high' | 'urgent' {
    if (index === 0 || index === total - 1) return 'urgent';
    if (index < total * 0.1) return 'high';
    if (index < total * 0.5) return 'normal';
    return 'low';
  }

  private setupProgressMonitoring() {
    let completed = 0;
    const total = 100;

    this.printer.on('printer:job-completed', () => {
      completed++;
      const progress = Math.round((completed / total) * 100);
      console.log(`📊 打印进度: ${progress}%`);
    });
  }

  private async waitForCompletion(jobIds: string[]) {
    let allCompleted = false;

    const checkCompletion = () => {
      const status = this.printer.getQueueStatus();
      allCompleted = status.pending === 0 && status.processing === 0;
    };

    while (!allCompleted) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      checkCompletion();
    }

    console.log('✅ 所有批量任务已完成');
  }
}
```

### 2. 模板系统示例

**文件**: `advanced/template-system.ts`

```typescript
import { createBluetoothPrinter } from 'taro-bluetooth-print';

/**
 * 模板系统示例
 * 展示如何创建和使用自定义打印模板
 */
export class TemplateSystemExample {
  private printer = createBluetoothPrinter({
    template: {
      enableCache: true,
      cacheSize: 50
    }
  });

  async run() {
    await this.printer.initialize();

    const devices = await this.printer.scanDevices();
    if (devices.length > 0) {
      await this.printer.connect(devices[0].deviceId);

      await this.demonstrateTemplates();

      await this.printer.disconnect();
    }

    await this.printer.dispose();
  }

  private async demonstrateTemplates() {
    console.log('📄 演示模板系统...');

    // 1. 注册收据模板
    await this.registerReceiptTemplate();

    // 2. 注册标签模板
    await this.registerLabelTemplate();

    // 3. 注册发票模板
    await this.registerInvoiceTemplate();

    // 4. 使用模板打印
    await this.useTemplates();
  }

  private async registerReceiptTemplate() {
    const receiptTemplate = {
      id: 'standard-receipt',
      name: '标准收据',
      type: 'receipt',
      description: '标准购物收据模板',
      content: `
{{#header}}
{{#if logo}}
{{#logo}}
{{/logo}}
{{/if}}
{{title}}
{{/header}}

{{#merchant}}
商户: {{name}}
{{#address}}
地址: {{address}}
{{/address}}
{{#phone}}
电话: {{phone}}
{{/phone}}
{{/merchant}}

------------------------
{{#items}}
{{name}}
{{quantity}} × {{price}} = {{total}}
{{#discount}}
折扣: {{discount}}
{{/discount}}
{{/items}}
------------------------

{{#summary}}
{{#if subtotal}}
小计: {{subtotal}}
{{/if}}
{{#discount}}
折扣: {{discount}}
{{/discount}}
{{#tax}}
税费: {{tax}}
{{/tax}}
总计: {{total}}
{{/summary}}

{{#footer}}
{{#date}}
日期: {{date}}
{{/date}}
{{#operator}}
操作员: {{operator}}
{{/operator}}
{{#notes}}
备注: {{notes}}
{{/notes}}
{{/footer}}
      `,
      enabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      version: '1.0.0',
      tags: ['receipt', 'standard']
    };

    await this.printer.registerTemplate(receiptTemplate);
  }

  private async registerLabelTemplate() {
    const labelTemplate = {
      id: 'product-label',
      name: '产品标签',
      type: 'label',
      description: '产品信息标签',
      content: `
{{#product}}
{{#if barcode}}
{{#barcode}}
{{/barcode}}
{{/if}}
{{#name}}
产品名称: {{name}}
{{/name}}
{{#price}}
价格: {{price}}
{{/price}}
{{#weight}}
重量: {{weight}}
{{/weight}}
{{#expiry}}
保质期: {{expiry}}
{{/expiry}}
{{#date}}
生产日期: {{date}}
{{/date}}
{{/product}}
      `,
      enabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      version: '1.0.0',
      tags: ['label', 'product']
    };

    await this.printer.registerTemplate(labelTemplate);
  }

  private async useTemplates() {
    // 1. 打印收据
    const receiptData = {
      header: {
        title: '购物小票',
        logo: '/images/shop-logo.png'
      },
      merchant: {
        name: '示例商店',
        address: '北京市朝阳区示例路123号',
        phone: '010-12345678'
      },
      items: [
        {
          name: '苹果',
          quantity: 2,
          price: 8.5,
          total: 17.0
        },
        {
          name: '香蕉',
          quantity: 3,
          price: 3.2,
          total: 9.6,
          discount: 0.6
        }
      ],
      summary: {
        subtotal: 26.6,
        discount: 0.6,
        tax: 1.33,
        total: 27.33
      },
      footer: {
        date: new Date().toLocaleDateString(),
        operator: '收银员001',
        notes: '感谢惠顾，欢迎再次光临！'
      }
    };

    await this.printer.printTemplate('standard-receipt', receiptData);

    // 2. 打印标签
    const labelData = {
      product: {
        barcode: '1234567890123',
        name: '新鲜苹果',
        price: '¥8.50/kg',
        weight: '500g',
        expiry: '2024-02-01',
        date: '2024-01-15'
      }
    };

    await this.printer.printTemplate('product-label', labelData);
  }
}
```

### 3. 事件处理示例

**文件**: `advanced/event-handling.ts`

```typescript
import { createBluetoothPrinter } from 'taro-bluetooth-print';

/**
 * 事件处理示例
 * 展示如何监听和处理各种事件
 */
export class EventHandlingExample {
  private printer = createBluetoothPrinter({
    events: {
      enabled: true,
      maxListeners: 20,
      enableHistory: true,
      historySize: 100
    }
  });

  private eventLog: Array<{ timestamp: Date; event: string; data: any }> = [];

  async run() {
    console.log('📡 演示事件处理...');

    // 设置事件监听器
    this.setupEventListeners();

    // 模拟操作流程
    await this.simulateWorkflow();

    // 显示事件历史
    this.showEventHistory();

    await this.printer.dispose();
  }

  private setupEventListeners() {
    // 1. 蓝牙事件
    this.printer.on('bluetooth:device-found', device => {
      this.logEvent('device-found', device);
    });

    this.printer.on('bluetooth:connected', data => {
      this.logEvent('connected', data);
    });

    this.printer.on('bluetooth:disconnected', data => {
      this.logEvent('disconnected', data);
    });

    this.printer.on('bluetooth:error', error => {
      this.logEvent('error', error);
      this.handleBluetoothError(error);
    });

    // 2. 打印机事件
    this.printer.on('printer:job-started', data => {
      this.logEvent('job-started', data);
    });

    this.printer.on('printer:job-completed', data => {
      this.logEvent('job-completed', data);
    });

    this.printer.on('printer:job-failed', data => {
      this.logEvent('job-failed', data);
      this.handlePrintError(data);
    });

    // 3. 队列事件
    this.printer.on('queue:status-change', data => {
      this.logEvent('queue-status-change', data);
    });
  }

  private logEvent(event: string, data: any) {
    this.eventLog.push({
      timestamp: new Date(),
      event,
      data
    });
  }

  private handleBluetoothError(error: any) {
    console.error('🚨 蓝牙错误处理:', error.message);

    // 实现自动重连逻辑
    this.scheduleReconnect();
  }

  private handlePrintError(data: { jobId: string; error: Error }) {
    console.error('🖨️ 打印错误处理:', data.error.message);

    // 实现重试逻辑
    this.scheduleRetry(data.jobId);
  }

  private async simulateWorkflow() {
    console.log('🔄 模拟操作流程...');

    try {
      // 模拟扫描设备
      this.simulateEvent('bluetooth:device-found', {
        deviceId: 'mock-device-001',
        name: 'Mock Printer'
      });

      // 模拟连接
      await new Promise(resolve => setTimeout(resolve, 1000));
      this.simulateEvent('bluetooth:connected', {
        deviceId: 'mock-device-001'
      });

      // 模拟打印任务
      this.simulateEvent('printer:job-started', {
        jobId: 'mock-job-001'
      });

      await new Promise(resolve => setTimeout(resolve, 2000));
      this.simulateEvent('printer:job-completed', {
        jobId: 'mock-job-001'
      });

      // 模拟断开连接
      this.simulateEvent('bluetooth:disconnected', {
        deviceId: 'mock-device-001'
      });
    } catch (error) {
      this.simulateEvent('bluetooth:error', error);
    }
  }

  private simulateEvent(event: string, data: any) {
    // 这里只是模拟事件触发
    console.log(`📡 模拟事件: ${event}`, data);
  }

  private scheduleReconnect() {
    setTimeout(() => {
      console.log('🔄 尝试重新连接...');
      // 实际的重新连接逻辑
    }, 5000);
  }

  private scheduleRetry(jobId: string) {
    setTimeout(() => {
      console.log('🔄 尝试重新打印:', jobId);
      // 实际的重试逻辑
    }, 3000);
  }

  private showEventHistory() {
    console.log('\n📊 事件历史记录:');
    this.eventLog.forEach((entry, index) => {
      const time = entry.timestamp.toLocaleTimeString();
      console.log(`${index + 1}. [${time}] ${entry.event}:`, entry.data);
    });
  }
}
```

### 4. 错误恢复示例

**文件**: `advanced/error-recovery.ts`

```typescript
import { createBluetoothPrinter } from 'taro-bluetooth-print';

/**
 * 错误恢复示例
 * 展示如何优雅地处理各种错误情况
 */
export class ErrorRecoveryExample {
  private printer = createBluetoothPrinter({
    bluetooth: {
      autoReconnect: true,
      maxReconnectAttempts: 5,
      reconnectInterval: 2000
    },
    queue: {
      retryAttempts: 3,
      retryDelay: 1000
    }
  });

  private errorCounts: Map<string, number> = new Map();

  async run() {
    console.log('🛡️ 演示错误恢复机制...');

    this.setupErrorHandling();

    try {
      await this.executeWithErrorRecovery();
    } finally {
      await this.printer.dispose();
      this.showErrorStatistics();
    }
  }

  private setupErrorHandling() {
    // 错误事件监听
    this.printer.on('bluetooth:error', error => {
      this.handleBluetoothError(error);
    });

    this.printer.on('printer:job-failed', data => {
      this.handlePrintError(data);
    });

    // 未捕获的异常
    process.on('uncaughtException', error => {
      console.error('💥 未捕获异常:', error);
      this.handleCriticalError(error);
    });

    // 未处理的Promise拒绝
    process.on('unhandledRejection', reason => {
      console.error('⚠️ 未处理的Promise拒绝:', reason);
      this.handleCriticalError(reason);
    });
  }

  private async executeWithErrorRecovery() {
    const maxRetries = 3;
    let attempt = 0;

    while (attempt < maxRetries) {
      try {
        await this.attemptOperation();
        console.log('✅ 操作成功完成');
        return;
      } catch (error) {
        attempt++;
        console.error(`❌ 操作失败 (尝试 ${attempt}/${maxRetries}):`, error.message);

        if (attempt < maxRetries) {
          console.log('🔄 等待重试...');
          await this.delay(2000 * attempt);
        } else {
          console.error('💥 达到最大重试次数，操作失败');
          throw error;
        }
      }
    }
  }

  private async attemptOperation() {
    // 1. 初始化
    await this.printer.initialize();

    // 2. 扫描设备
    const devices = await this.printer.scanDevices();
    if (devices.length === 0) {
      throw new Error('未发现可用设备');
    }

    // 3. 连接设备
    const connected = await this.printer.connect(devices[0].deviceId);
    if (!connected) {
      throw new Error('设备连接失败');
    }

    // 4. 执行打印
    await this.printer.printText('错误恢复测试');

    // 5. 断开连接
    await this.printer.disconnect();
  }

  private handleBluetoothError(error: any) {
    this.incrementErrorCount('bluetooth');

    if (this.shouldRetry('bluetooth')) {
      console.log('🔄 将尝试自动重连');
      // 自动重连由配置控制
    } else {
      console.log('⚠️ 蓝牙错误严重，停止重试');
    }
  }

  private handlePrintError(data: { jobId: string; error: Error }) {
    this.incrementErrorCount('print');

    if (this.shouldRetry('print')) {
      console.log('🔄 将尝试重新打印');
      // 重新打印由重试机制控制
    } else {
      console.log('⚠️ 打印错误严重，停止重试');
    }
  }

  private handleCriticalError(error: any) {
    console.error('💥 关键错误:', error);

    // 记录到日志文件
    this.logToErrorFile(error);

    // 发送通知（如果配置了）
    this.sendErrorNotification(error);

    // 执行清理操作
    this.emergencyCleanup();
  }

  private incrementErrorCount(type: string) {
    const count = this.errorCounts.get(type) || 0;
    this.errorCounts.set(type, count + 1);
  }

  private shouldRetry(type: string): boolean {
    const count = this.errorCounts.get(type) || 0;
    const maxRetries = type === 'bluetooth' ? 5 : 3;
    return count < maxRetries;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private logToErrorFile(error: any) {
    const errorLog = {
      timestamp: new Date().toISOString(),
      message: error.message,
      stack: error.stack,
      type: error.constructor.name
    };

    // 这里应该写入到日志文件
    console.log('📝 记录错误日志:', errorLog);
  }

  private sendErrorNotification(error: any) {
    // 这里应该发送错误通知
    console.log('📧 发送错误通知:', error.message);
  }

  private emergencyCleanup() {
    console.log('🧹 执行紧急清理...');

    // 断开连接
    this.printer.disconnect().catch(() => {
      // 忽略清理错误
    });

    // 清空队列
    this.printer.clearQueue().catch(() => {
      // 忽略清理错误
    });
  }

  private showErrorStatistics() {
    console.log('\n📊 错误统计:');
    this.errorCounts.forEach((count, type) => {
      console.log(`${type}: ${count} 次错误`);
    });
  }
}
```

## 🔗 集成示例

### 1. React Hooks 示例

**文件**: `integration/react-hooks.ts`

```typescript
import { useState, useEffect, useCallback } from 'react';
import { createBluetoothPrinter } from 'taro-bluetooth-print';

/**
 * React Hooks 集成示例
 * 展示如何在React组件中使用蓝牙打印功能
 */
export const useBluetoothPrinter = () => {
  const [printer] = useState(() => createBluetoothPrinter());
  const [isInitialized, setIsInitialized] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [devices, setDevices] = useState([]);
  const [status, setStatus] = useState('未初始化');
  const [error, setError] = useState(null);

  // 初始化
  useEffect(() => {
    const initialize = async () => {
      try {
        setStatus('初始化中...');
        await printer.initialize();
        setIsInitialized(true);
        setStatus('已初始化');
      } catch (err) {
        setError(err.message);
        setStatus('初始化失败');
      }
    };

    initialize();

    return () => {
      printer.dispose();
    };
  }, []);

  // 扫描设备
  const scanDevices = useCallback(async () => {
    if (!isInitialized) {
      throw new Error('打印机未初始化');
    }

    try {
      setStatus('扫描中...');
      setIsConnecting(true);
      setDevices([]);

      const foundDevices = await printer.scanDevices();
      setDevices(foundDevices);
      setStatus(`发现 ${foundDevices.length} 个设备`);
    } catch (err) {
      setError(err.message);
      setStatus('扫描失败');
    } finally {
      setIsConnecting(false);
    }
  }, [isInitialized]);

  // 连接设备
  const connect = useCallback(
    async (deviceId: string) => {
      if (!isInitialized) {
        throw new Error('打印机未初始化');
      }

      try {
        setStatus('连接中...');
        const connected = await printer.connect(deviceId);
        setIsConnected(connected);
        setStatus(connected ? '已连接' : '连接失败');
        return connected;
      } catch (err) {
        setError(err.message);
        setStatus('连接失败');
        return false;
      }
    },
    [isInitialized]
  );

  // 断开连接
  const disconnect = useCallback(async () => {
    if (!isInitialized) {
      return;
    }

    try {
      await printer.disconnect();
      setIsConnected(false);
      setStatus('已断开');
    } catch (err) {
      setError(err.message);
      setStatus('断开失败');
    }
  }, [isInitialized]);

  // 打印文本
  const printText = useCallback(
    async (text: string, options?) => {
      if (!isInitialized || !isConnected) {
        throw new Error('打印机未连接');
      }

      try {
        setStatus('打印中...');
        await printer.printText(text, options);
        setStatus('打印完成');
      } catch (err) {
        setError(err.message);
        setStatus('打印失败');
      }
    },
    [isInitialized, isConnected]
  );

  // 打印图片
  const printImage = useCallback(
    async (image: string, options?) => {
      if (!isInitialized || !isConnected) {
        throw new Error('打印机未连接');
      }

      try {
        setStatus('打印图片中...');
        await printer.printImage(image, options);
        setStatus('图片打印完成');
      } catch (err) {
        setError(err.message);
        setStatus('图片打印失败');
      }
    },
    [isInitialized, isConnected]
  );

  // 清理错误状态
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    // 状态
    isInitialized,
    isConnecting,
    isConnected,
    devices,
    status,
    error,

    // 方法
    scanDevices,
    connect,
    disconnect,
    printText,
    printImage,
    clearError,

    // 打印器实例（供高级使用）
    printer
  };
};

// 使用示例
const MyComponent = () => {
  const {
    printer,
    isInitialized,
    isConnected,
    devices,
    scanDevices,
    connect,
    disconnect,
    printText,
    printImage,
    status,
    error
  } = useBluetoothPrinter();

  useEffect(() => {
    // 监听状态变化
    if (error) {
      console.error('蓝牙打印错误:', error);
    }
  }, [error]);

  const handlePrintClick = async () => {
    if (isConnected) {
      await printText('Hello from React Hooks!', {
        align: 'center',
        bold: true
      });
    }
  };

  return (
    <div>
      <p>状态: {status}</p>
      {error && <p style={{ color: 'red' }}>错误: {error}</p>}

      <button onClick={scanDevices} disabled={isConnecting}>
        扫描设备
      </button>

      {devices.map(device => (
        <button
          key={device.deviceId}
          onClick={() => connect(device.deviceId)}
          disabled={isConnected || isConnecting}
        >
          {device.name || '未知设备'}
        </button>
      ))}

      {isConnected && <button onClick={handlePrintClick}>打印测试</button>}

      {isConnected && <button onClick={disconnect}>断开连接</button>}
    </div>
  );
};

export default MyComponent;
```

## 🎯 实际应用场景

### 1. 餐厅 POS 系统示例

**文件**: `real-world/restaurant-pos.ts`

```typescript
import { createBluetoothPrinter } from 'taro-bluetooth-print';

/**
 * 餐厅POS系统示例
 * 展示如何在实际餐厅收银系统中使用
 */
export class RestaurantPOS {
  private printer = createBluetoothPrinter({
    printer: {
      paperWidth: 58,
      autoCut: true,
      charset: 'PC437'
    },
    queue: {
      maxSize: 50,
      concurrency: 1
    }
  });

  private currentOrder: any = null;

  async printOrder(orderData: any) {
    await this.printer.initialize();

    const devices = await this.printer.scanDevices();
    if (devices.length > 0) {
      await this.printer.connect(devices[0].deviceId);

      await this.printOrderReceipt(orderData);

      await this.printer.disconnect();
    }

    await this.printer.dispose();
  }

  private async printOrderReceipt(order: any) {
    const receiptData = {
      header: {
        title: order.restaurantName || '餐厅名称',
        orderNo: order.orderNo,
        tableNo: order.tableNo,
        orderTime: order.createdAt
      },
      merchant: {
        name: order.restaurantName,
        address: order.address,
        phone: order.phone
      },
      items: order.items.map((item: any) => ({
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        total: item.total,
        discount: item.discount,
        notes: item.notes
      })),
      summary: {
        subtotal: order.subtotal,
        discount: order.discount,
        tax: order.tax,
        total: order.total,
        payment: order.payment
      },
      footer: {
        operator: order.operator,
        notes: '谢谢光临，欢迎再次惠顾！'
      }
    };

    await this.printer.printTemplate('pos-receipt', receiptData);
  }
}
```

## 🧪 测试示例

### 1. 单元测试示例

**文件**: `testing/unit-tests.ts`

```typescript
import { createBluetoothPrinter } from 'taro-bluetooth-print';
import { MockBluetoothAdapter } from '../tests/mocks/bluetooth-adapter';

describe('BluetoothPrinter', () => {
  let printer: any;
  let mockAdapter: any;

  beforeEach(() => {
    mockAdapter = new MockBluetoothAdapter();
    printer = createBluetoothPrinter({
      bluetooth: {
        adapter: mockAdapter
      }
    });
  });

  afterEach(async () => {
    await printer.dispose();
  });

  describe('初始化', () => {
    it('应该能够成功初始化', async () => {
      await expect(printer.initialize()).resolves.toBe(true);
    });

    it('初始化后应该可以扫描设备', async () => {
      await printer.initialize();
      const devices = await printer.scanDevices();
      expect(Array.isArray(devices)).toBe(true);
    });
  });

  describe('打印功能', () => {
    beforeEach(async () => {
      await printer.initialize();
      mockAdapter.addMockDevice('mock-device');
      await printer.connect('mock-device');
    });

    it('应该能够打印文本', async () => {
      await expect(printer.printText('Test')).resolves.toBeDefined();
    });

    it('应该能够打印二维码', async () => {
      await expect(printer.printQRCode('https://example.com')).resolves.toBeDefined();
    });

    it('应该能够打印条形码', async () => {
      await expect(printer.printBarcode('123456789')).resolves.toBeDefined();
    });
  });

  describe('错误处理', () => {
    it('应该处理连接错误', async () => {
      await printer.initialize();
      mockAdapter.setShouldFailConnection(true);

      await expect(printer.connect('invalid-device')).rejects.toThrow();
    });

    it('应该处理打印错误', async () => {
      await printer.initialize();
      mockAdapter.addMockDevice('mock-device');
      await printer.connect('mock-device');
      mockAdapter.setShouldFailWrite(true);

      await expect(printer.printText('Test')).rejects.toThrow();
    });
  });
});
```

## 📝 运行示例

```bash
# 运行基础示例
npm run example:basic

# 运行高级示例
npm run example:advanced

# 运行集成示例
npm run example:integration

# 运行所有示例
npm run example:all

# 运行测试示例
npm run example:testing
```

## 📚 更多示例

每个示例文件都包含详细的注释和说明，可以直接运行学习。建议按照以下顺序学习：

1. **基础示例** - 了解基本功能
2. **高级示例** - 掌握高级特性
3. **集成示例** - 学习框架集成
4. **实际应用** - 查看真实场景
5. **测试示例** - 确保代码质量

## 🤝 贡献

欢迎提交更多示例代码！请遵循以下规范：

- 每个示例都应该有详细的注释
- 包含完整的错误处理
- 使用 TypeScript 类型定义
- 提供使用场景说明

---

_示例代码随项目更新，最后更新时间: 2025 年 1 月_
