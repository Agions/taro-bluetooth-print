/**
 * 基础使用示例
 * 展示如何使用重构后的蓝牙打印库
 */

import { BluetoothPrinter, createDefaultConfig } from '../src';

/**
 * 基础示例：初始化和简单打印
 */
async function basicExample() {
  console.log('=== 基础使用示例 ===');

  // 创建配置
  const config = createDefaultConfig();

  // 创建打印实例
  const printer = new BluetoothPrinter(config);

  try {
    // 初始化库
    await printer.initialize();
    console.log('✓ 库初始化成功');

    // 扫描设备
    console.log('正在扫描蓝牙设备...');
    const devices = await printer.scanDevices(10000);
    console.log(`发现 ${devices.length} 个设备:`);
    devices.forEach(device => {
      console.log(`- ${device.name} (${device.id})`);
    });

    if (devices.length === 0) {
      console.log('未发现设备，示例结束');
      return;
    }

    // 连接第一个设备
    const device = devices[0];
    console.log(`正在连接设备: ${device.name}`);
    const connection = await printer.connectDevice(device.id);
    console.log(`✓ 设备连接成功: ${connection.deviceId}`);

    // 打印文本
    console.log('正在打印文本...');
    const textResult = await printer.printText('Hello, World!\n欢迎使用蓝牙打印库');
    if (textResult.success) {
      console.log('✓ 文本打印成功');
    } else {
      console.error('✗ 文本打印失败:', textResult.error);
    }

    // 打印二维码
    console.log('正在打印二维码...');
    const qrResult = await printer.printQRCode('https://github.com/example/taro-bluetooth-printer');
    if (qrResult.success) {
      console.log('✓ 二维码打印成功');
    } else {
      console.error('✗ 二维码打印失败:', qrResult.error);
    }

    // 断开连接
    await printer.disconnectDevice(device.id);
    console.log('✓ 设备已断开连接');

  } catch (error) {
    console.error('示例执行失败:', error);
  } finally {
    // 销毁实例
    await printer.dispose();
    console.log('✓ 库已销毁');
  }
}

/**
 * 高级示例：使用模板打印
 */
async function templateExample() {
  console.log('\n=== 模板打印示例 ===');

  const printer = new BluetoothPrinter();

  try {
    await printer.initialize();

    // 注册收据模板
    const receiptTemplate = {
      id: 'standard-receipt',
      name: '标准收据',
      type: 'receipt' as const,
      content: `
**{{merchant.name}}**
{{merchant.address}}

订单号：{{order.id}}
-------------------------------
{% for item in order.items %}
{{item.name}} x{{item.quantity}}  ¥{{item.total}}
{% endfor %}
-------------------------------
小计：¥{{order.subtotal}}
税费：¥{{order.tax}}
总计：¥{{order.total}}

谢谢惠顾！
      `,
      variables: [
        { name: 'merchant.name', type: 'string', required: true },
        { name: 'merchant.address', type: 'string', required: false },
        { name: 'order.id', type: 'string', required: true },
        { name: 'order.items', type: 'array', required: true },
        { name: 'order.subtotal', type: 'number', required: true },
        { name: 'order.tax', type: 'number', required: true },
        { name: 'order.total', type: 'number', required: true }
      ],
      description: '标准收据模板',
      createdAt: new Date(),
      updatedAt: new Date(),
      version: '1.0.0',
      tags: ['receipt', 'standard'],
      metadata: {},
      enabled: true
    };

    await printer.registerTemplate(receiptTemplate);
    console.log('✓ 收据模板注册成功');

    // 准备数据
    const receiptData = {
      merchant: {
        name: '示例商店',
        address: '北京市朝阳区示例街道123号'
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

    // 预览模板
    const preview = await printer.previewTemplate('standard-receipt', receiptData);
    console.log('模板预览:');
    console.log(preview);

    // 这里需要连接设备才能实际打印
    console.log('模板准备就绪，可以连接设备进行打印');

  } catch (error) {
    console.error('模板示例执行失败:', error);
  } finally {
    await printer.dispose();
  }
}

/**
 * 事件监听示例
 */
async function eventExample() {
  console.log('\n=== 事件监听示例 ===');

  const printer = new BluetoothPrinter();

  // 设置事件监听器
  printer.on('initialized', () => {
    console.log('📱 库已初始化');
  });

  printer.on('deviceDiscovered', (device) => {
    console.log(`🔍 发现设备: ${device.name} (${device.id})`);
  });

  printer.on('deviceConnected', (connection) => {
    console.log(`🔗 设备已连接: ${connection.deviceId}`);
  });

  printer.on('deviceDisconnected', (deviceId) => {
    console.log(`❌ 设备已断开: ${deviceId}`);
  });

  printer.on('jobCompleted', (job) => {
    console.log(`✅ 打印作业完成: ${job.id}`);
  });

  printer.on('jobFailed', (job, error) => {
    console.error(`❌ 打印作业失败: ${job.id}, 错误: ${error.message}`);
  });

  try {
    await printer.initialize();

    // 扫描设备（这会触发deviceDiscovered事件）
    console.log('正在扫描设备（事件监听中）...');
    await printer.scanDevices(5000);

  } catch (error) {
    console.error('事件示例执行失败:', error);
  } finally {
    await printer.dispose();
  }
}

/**
 * 批量打印示例
 */
async function batchPrintExample() {
  console.log('\n=== 批量打印示例 ===');

  const printer = new BluetoothPrinter();

  try {
    await printer.initialize();

    // 准备批量打印请求
    const printRequests = [
      {
        type: 'text' as const,
        content: '=== 批量打印测试 ===\n',
        options: { bold: true, align: 'center' }
      },
      {
        type: 'text' as const,
        content: '第一个文档\n',
        options: { align: 'left' }
      },
      {
        type: 'qrcode' as const,
        content: 'BATCH-PRINT-001',
        options: { size: 128, align: 'center' }
      },
      {
        type: 'text' as const,
        content: '\n第二个文档\n',
        options: { align: 'left' }
      },
      {
        type: 'barcode' as const,
        content: '1234567890',
        options: { type: 'CODE128', align: 'center' }
      }
    ];

    console.log('准备批量打印，共', printRequests.length, '个作业');

    // 获取队列状态
    const statusBefore = printer.getQueueStatus();
    console.log('队列状态（打印前）:', statusBefore);

    // 提交批量打印（需要连接设备才能实际执行）
    console.log('批量打印请求已准备，需要连接设备才能实际执行');

  } catch (error) {
    console.error('批量打印示例执行失败:', error);
  } finally {
    await printer.dispose();
  }
}

/**
 * 配置管理示例
 */
function configExample() {
  console.log('\n=== 配置管理示例 ===');

  const printer = new BluetoothPrinter();

  // 获取当前配置
  const config = printer.getConfig();
  console.log('当前配置:');
  console.log('蓝牙扫描超时:', config.bluetooth.scanTimeout + 'ms');
  console.log('打印速度:', config.printer.speed);
  console.log('队列最大大小:', config.queue.maxSize);
  console.log('日志级别:', config.logging.level);

  // 更新配置
  printer.updateConfig({
    bluetooth: {
      scanTimeout: 15000,
      connectionTimeout: 20000
    },
    logging: {
      level: 'debug'
    }
  });

  console.log('✓ 配置已更新');

  // 获取库状态
  const status = printer.getStatus();
  console.log('库状态:');
  console.log('已初始化:', status.initialized);
  console.log('蓝牙启用:', status.bluetooth.enabled);
  console.log('打印机总数:', status.printers.total);
  console.log('模板总数:', status.templates.total);
}

// 运行所有示例
async function runAllExamples() {
  console.log('🚀 开始运行蓝牙打印库示例\n');

  try {
    await basicExample();
    await templateExample();
    await eventExample();
    await batchPrintExample();
    configExample();
  } catch (error) {
    console.error('示例运行失败:', error);
  }

  console.log('\n✅ 所有示例运行完成');
}

// 如果直接运行此文件，则执行示例
if (require.main === module) {
  runAllExamples().catch(console.error);
}

export {
  basicExample,
  templateExample,
  eventExample,
  batchPrintExample,
  configExample,
  runAllExamples
};