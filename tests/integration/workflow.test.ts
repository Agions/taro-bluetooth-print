/**
 * 完整工作流程集成测试
 * 测试真实使用场景下的端到端工作流程
 */

import { BluetoothPrinter, createBluetoothPrinter } from '../../src/BluetoothPrinter';
import {
  IBluetoothPrinterConfig,
  IPrintRequest,
  ITemplateInfo,
  IDeviceInfo,
  IConnectionInfo
} from '../../src/types';

describe('完整工作流程集成测试', () => {
  let bluetoothPrinter: BluetoothPrinter;
  let workflowEvents: any[] = [];

  // 真实场景配置
  const PRODUCTION_CONFIG: Partial<IBluetoothPrinterConfig> = {
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
      historySize: 0
    }
  };

  beforeEach(async () => {
    workflowEvents = [];
    bluetoothPrinter = createBluetoothPrinter(PRODUCTION_CONFIG);
    setupWorkflowMonitoring();
  });

  afterEach(async () => {
    if (bluetoothPrinter) {
      try {
        await bluetoothPrinter.dispose();
      } catch (error) {
        // 忽略销毁错误
      }
    }
  });

  function setupWorkflowMonitoring(): void {
    const events = [
      'initialized', 'deviceDiscovered', 'deviceConnected', 'deviceDisconnected',
      'connectionFailed', 'jobQueued', 'jobStarted', 'jobCompleted', 'jobFailed',
      'templateRegistered', 'templateRendered', 'templateError', 'configUpdated'
    ];

    events.forEach(event => {
      bluetoothPrinter.on(event, (...args: any[]) => {
        workflowEvents.push({
          event,
          timestamp: new Date(),
          data: args
        });
      });
    });
  }

  function getWorkflowSummary(): any {
    const summary: any = {
      totalEvents: workflowEvents.length,
      eventCounts: {},
      duration: 0,
      success: true
    };

    workflowEvents.forEach(event => {
      summary.eventCounts[event.event] = (summary.eventCounts[event.event] || 0) + 1;
    });

    if (workflowEvents.length > 0) {
      const startTime = workflowEvents[0].timestamp.getTime();
      const endTime = workflowEvents[workflowEvents.length - 1].timestamp.getTime();
      summary.duration = endTime - startTime;
    }

    return summary;
  }

  describe('零售收银工作流程', () => {
    it('应该能够处理完整的收银流程', async () => {
      // 1. 初始化系统
      await bluetoothPrinter.initialize();
      expect(bluetoothPrinter.getStatus().initialized).toBe(true);

      // 2. 注册收银相关模板
      const receiptTemplate = {
        id: 'retail-receipt',
        name: '零售收据模板',
        type: 'receipt',
        description: '标准零售收据模板',
        content: `
====================
    {{storeName}}
====================
收据号: {{receiptNumber}}
日期: {{date}}
时间: {{time}}

--------------------
商品列表:
{{#items}}
{{name}}
  单价: ¥{{price}} x {{quantity}}
  小计: ¥{{subtotal}}
{{/items}}
--------------------
商品总数: {{totalItems}}
商品金额: ¥{{subtotal}}
税额: ¥{{tax}}
总计: ¥{{total}}

支付方式: {{paymentMethod}}
实收: ¥{{paid}}
找零: ¥{{change}}

--------------------
谢谢惠顾!
欢迎再次光临!
====================
        `.trim(),
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        version: '1.0.0',
        tags: ['retail', 'receipt', 'sales']
      };

      await bluetoothPrinter.registerTemplate(receiptTemplate);

      // 3. 扫描并连接打印机
      const devices = await bluetoothPrinter.scanDevices(8000);
      console.log(`发现 ${devices.length} 个设备`);

      if (devices.length === 0) {
        console.warn('未发现打印设备，跳过连接测试');
      } else {
        const printerDevice = devices.find(d => d.name?.toLowerCase().includes('print')) || devices[0];
        console.log(`连接设备: ${printerDevice.name}`);

        try {
          await bluetoothPrinter.connectDevice(printerDevice.id);
          console.log('设备连接成功');
        } catch (error) {
          console.warn('设备连接失败，继续使用模拟模式:', error);
        }
      }

      // 4. 模拟收银交易数据
      const transactionData = {
        storeName: '测试便利店',
        receiptNumber: `R${Date.now()}`,
        date: new Date().toLocaleDateString(),
        time: new Date().toLocaleTimeString(),
        items: [
          { name: '可口可乐', price: '3.50', quantity: 2, subtotal: '7.00' },
          { name: '薯片', price: '8.00', quantity: 1, subtotal: '8.00' },
          { name: '巧克力', price: '12.00', quantity: 1, subtotal: '12.00' }
        ],
        totalItems: 4,
        subtotal: '27.00',
        tax: '0.00',
        total: '27.00',
        paymentMethod: '现金',
        paid: '30.00',
        change: '3.00'
      };

      // 5. 打印收据
      const printResult = await bluetoothPrinter.printTemplate('retail-receipt', transactionData);
      expect(printResult.success).toBe(true);
      console.log(`收据打印成功，作业ID: ${printResult.jobId}`);

      // 6. 等待打印完成
      await new Promise(resolve => setTimeout(resolve, 3000));

      // 7. 验证工作流程
      const summary = getWorkflowSummary();
      console.log('收银工作流程总结:', summary);

      expect(summary.eventCounts['templateRegistered']).toBeGreaterThan(0);
      expect(summary.eventCounts['templateRendered']).toBeGreaterThan(0);
      expect(summary.eventCounts['jobCompleted']).toBeGreaterThan(0);
      expect(summary.success).toBe(true);

      console.log('零售收银工作流程测试完成');
    });

    it('应该能够处理批量商品打印', async () => {
      await bluetoothPrinter.initialize();

      // 注册商品标签模板
      const labelTemplate = {
        id: 'product-label',
        name: '商品标签模板',
        type: 'label',
        description: '商品价格标签模板',
        content: `
====================
商品名称: {{productName}}
商品编号: {{productCode}}
价格: ¥{{price}}
特价: ¥{{salePrice}}
促销: {{promotion}}
--------------------
{{barcode}}
====================
        `.trim(),
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        version: '1.0.0',
        tags: ['retail', 'label', 'product']
      };

      await bluetoothPrinter.registerTemplate(labelTemplate);

      // 批量商品数据
      const products = [
        {
          productName: '进口牛奶',
          productCode: 'P001',
          price: '15.80',
          salePrice: '12.80',
          promotion: '限时特价',
          barcode: '123456789001'
        },
        {
          productName: '新鲜面包',
          productCode: 'P002',
          price: '8.50',
          salePrice: '8.50',
          promotion: '新鲜到货',
          barcode: '123456789002'
        },
        {
          productName: '进口水果',
          productCode: 'P003',
          price: '25.00',
          salePrice: '18.00',
          promotion: '会员价',
          barcode: '123456789003'
        }
      ];

      // 批量打印商品标签
      const printPromises = products.map(product =>
        bluetoothPrinter.printTemplate('product-label', product)
      );

      const results = await Promise.all(printPromises);
      expect(results.every(r => r.success)).toBe(true);

      // 等待打印完成
      await new Promise(resolve => setTimeout(resolve, 5000));

      const summary = getWorkflowSummary();
      console.log('批量商品打印工作流程总结:', summary);

      expect(summary.eventCounts['templateRendered']).toBe(3);
      expect(summary.eventCounts['jobCompleted']).toBe(3);

      console.log('批量商品打印工作流程测试完成');
    });
  });

  describe('餐饮订单工作流程', () => {
    it('应该能够处理完整的餐饮订单流程', async () => {
      await bluetoothPrinter.initialize();

      // 注册厨房订单模板
      const kitchenOrderTemplate = {
        id: 'kitchen-order',
        name: '厨房订单模板',
        type: 'receipt',
        description: '厨房制作订单模板',
        content: `
================================
          厨房订单
================================
订单号: {{orderNumber}}
时间: {{orderTime}}
桌号: {{tableNumber}}
服务员: {{waiter}}

--------------------------------
订单详情:
{{#items}}
{{quantity}}x {{dishName}}
  备注: {{remarks}}
  制作时间: {{cookTime}}分钟
{{/items}}
--------------------------------
总制作时间: {{totalCookTime}}分钟
特殊要求: {{specialRequirements}}

================================
        `.trim(),
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        version: '1.0.0',
        tags: ['restaurant', 'kitchen', 'order']
      };

      // 注册结账单模板
      const billTemplate = {
        id: 'restaurant-bill',
        name: '餐厅结账单模板',
        type: 'receipt',
        description: '餐厅结账单模板',
        content: `
================================
        {{restaurantName}}
================================
结账单
订单号: {{orderNumber}}
桌号: {{tableNumber}}
时间: {{billTime}}
服务员: {{waiter}}

--------------------------------
消费明细:
{{#items}}
{{dishName}}
  ¥{{price}} x {{quantity}} = ¥{{subtotal}}
{{/items}}
--------------------------------
小计: ¥{{subtotal}}
服务费: ¥{{serviceCharge}}
总计: ¥{{total}}

支付方式: {{paymentMethod}}
谢谢光临!
================================
        `.trim(),
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        version: '1.0.0',
        tags: ['restaurant', 'bill', 'payment']
      };

      // 注册模板
      await bluetoothPrinter.registerTemplate(kitchenOrderTemplate);
      await bluetoothPrinter.registerTemplate(billTemplate);

      // 模拟订单数据
      const orderData = {
        orderNumber: `ORD${Date.now()}`,
        orderTime: new Date().toLocaleTimeString(),
        tableNumber: 'A08',
        waiter: '张三',
        items: [
          {
            quantity: 2,
            dishName: '宫保鸡丁',
            remarks: '微辣',
            cookTime: 15,
            price: '28.00',
            subtotal: '56.00'
          },
          {
            quantity: 1,
            dishName: '麻婆豆腐',
            remarks: '不要香菜',
            cookTime: 12,
            price: '18.00',
            subtotal: '18.00'
          },
          {
            quantity: 1,
            dishName: '米饭',
            remarks: '',
            cookTime: 2,
            price: '2.00',
            subtotal: '2.00'
          }
        ],
        totalCookTime: 15,
        specialRequirements: '客户对花生过敏'
      };

      const billData = {
        restaurantName: '美味餐厅',
        orderNumber: orderData.orderNumber,
        tableNumber: orderData.tableNumber,
        billTime: new Date().toLocaleString(),
        waiter: orderData.waiter,
        items: orderData.items,
        subtotal: '76.00',
        serviceCharge: '7.60',
        total: '83.60',
        paymentMethod: '支付宝'
      };

      // 1. 打印厨房订单
      console.log('打印厨房订单...');
      const kitchenResult = await bluetoothPrinter.printTemplate('kitchen-order', orderData);
      expect(kitchenResult.success).toBe(true);

      // 2. 打印结账单
      console.log('打印结账单...');
      const billResult = await bluetoothPrinter.printTemplate('restaurant-bill', billData);
      expect(billResult.success).toBe(true);

      // 等待打印完成
      await new Promise(resolve => setTimeout(resolve, 4000));

      const summary = getWorkflowSummary();
      console.log('餐饮订单工作流程总结:', summary);

      expect(summary.eventCounts['templateRegistered']).toBe(2);
      expect(summary.eventCounts['templateRendered']).toBe(2);
      expect(summary.eventCounts['jobCompleted']).toBe(2);

      console.log('餐饮订单工作流程测试完成');
    });

    it('应该能够处理外卖订单流程', () => {
      // 测试外卖订单的特殊需求
      console.log('外卖订单流程测试 - 待实现');
    });
  });

  describe('物流快递工作流程', () => {
    it('应该能够处理快递单打印流程', async () => {
      await bluetoothPrinter.initialize();

      // 注册快递单模板
      const shippingLabelTemplate = {
        id: 'shipping-label',
        name: '快递单模板',
        type: 'label',
        description: '快递面单模板',
        content: `
================================
           快递面单
================================
寄件人:
姓名: {{senderName}}
电话: {{senderPhone}}
地址: {{senderAddress}}

收件人:
姓名: {{receiverName}}
电话: {{receiverPhone}}
地址: {{receiverAddress}}

================================
运单号: {{trackingNumber}}
重量: {{weight}}kg
运费: ¥{{shippingFee}}
付款方式: {{paymentMethod}}

================================
{{#qrCode}}
二维码: {{qrCode}}
{{/qrCode}}
        `.trim(),
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        version: '1.0.0',
        tags: ['logistics', 'shipping', 'label']
      };

      await bluetoothPrinter.registerTemplate(shippingLabelTemplate);

      // 模拟快递单数据
      const shippingData = {
        senderName: '发件人张三',
        senderPhone: '13800138000',
        senderAddress: '北京市朝阳区某某街道123号',
        receiverName: '收件人李四',
        receiverPhone: '13900139000',
        receiverAddress: '上海市浦东新区某某路456号',
        trackingNumber: `SF${Date.now()}`,
        weight: '2.5',
        shippingFee: '15.00',
        paymentMethod: '寄付',
        qrCode: 'https://tracking.example.com/SF' + Date.now()
      };

      // 打印快递单
      const result = await bluetoothPrinter.printTemplate('shipping-label', shippingData);
      expect(result.success).toBe(true);

      // 等待打印完成
      await new Promise(resolve => setTimeout(resolve, 3000));

      const summary = getWorkflowSummary();
      console.log('物流快递工作流程总结:', summary);

      expect(summary.eventCounts['templateRendered']).toBeGreaterThan(0);
      expect(summary.eventCounts['jobCompleted']).toBeGreaterThan(0);

      console.log('物流快递工作流程测试完成');
    });
  });

  describe('医疗处方工作流程', () => {
    it('应该能够处理医疗处方打印流程', async () => {
      await bluetoothPrinter.initialize();

      // 注册处方单模板
      const prescriptionTemplate = {
        id: 'medical-prescription',
        name: '医疗处方模板',
        type: 'receipt',
        description: '医生处方单模板',
        content: `
================================
           医疗处方单
================================
医院名称: {{hospitalName}}
科室: {{department}}
医生: {{doctorName}}
患者姓名: {{patientName}}
患者年龄: {{patientAge}}
性别: {{patientGender}}
日期: {{prescriptionDate}}

--------------------------------
Rp. (处方)
{{#medications}}
{{medicationName}}
  规格: {{specification}}
  用量: {{dosage}}
  用法: {{usage}}
  数量: {{quantity}}
  单价: ¥{{unitPrice}}
  小计: ¥{{subtotal}}
{{/medications}}
--------------------------------
诊断: {{diagnosis}}
医嘱: {{doctorNotes}}
总金额: ¥{{totalAmount}}

================================
医生签名: _______________
药房盖章: _______________
        `.trim(),
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        version: '1.0.0',
        tags: ['medical', 'prescription', 'healthcare']
      };

      await bluetoothPrinter.registerTemplate(prescriptionTemplate);

      // 模拟处方数据
      const prescriptionData = {
        hospitalName: '市第一人民医院',
        department: '内科',
        doctorName: '王医生',
        patientName: '测试患者',
        patientAge: '35',
        patientGender: '男',
        prescriptionDate: new Date().toLocaleDateString(),
        medications: [
          {
            medicationName: '阿莫西林胶囊',
            specification: '0.5g×24粒',
            dosage: '0.5g',
            usage: '每日3次，每次1粒，饭后服用',
            quantity: '1盒',
            unitPrice: '25.00',
            subtotal: '25.00'
          },
          {
            medicationName: '布洛芬缓释胶囊',
            specification: '0.3g×20粒',
            dosage: '0.3g',
            usage: '每日2次，每次1粒',
            quantity: '1盒',
            unitPrice: '18.50',
            subtotal: '18.50'
          }
        ],
        diagnosis: '上呼吸道感染',
        doctorNotes: '注意休息，多喝水，避免辛辣食物',
        totalAmount: '43.50'
      };

      // 打印处方单
      const result = await bluetoothPrinter.printTemplate('medical-prescription', prescriptionData);
      expect(result.success).toBe(true);

      // 等待打印完成
      await new Promise(resolve => setTimeout(resolve, 3000));

      const summary = getWorkflowSummary();
      console.log('医疗处方工作流程总结:', summary);

      expect(summary.eventCounts['templateRendered']).toBeGreaterThan(0);
      expect(summary.eventCounts['jobCompleted']).toBeGreaterThan(0);

      console.log('医疗处方工作流程测试完成');
    });
  });

  describe('多模板协作工作流程', () => {
    it('应该能够处理复杂的模板组合工作流程', async () => {
      await bluetoothPrinter.initialize();

      // 注册多个相关模板
      const templates = [
        {
          id: 'order-header',
          name: '订单头部模板',
          type: 'receipt',
          description: '订单头部信息模板',
          content: '订单号: {{orderNumber}}\n日期: {{date}}\n客户: {{customer}}',
          enabled: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          version: '1.0.0',
          tags: ['order', 'header']
        },
        {
          id: 'order-items',
          name: '订单项目模板',
          type: 'receipt',
          description: '订单商品列表模板',
          content: '{{#items}}{{name}} - ¥{{price}} x {{quantity}}\n{{/items}}',
          enabled: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          version: '1.0.0',
          tags: ['order', 'items']
        },
        {
          id: 'order-footer',
          name: '订单尾部模板',
          type: 'receipt',
          description: '订单汇总信息模板',
          content: '总计: ¥{{total}}\n谢谢惠顾!',
          enabled: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          version: '1.0.0',
          tags: ['order', 'footer']
        }
      ];

      // 注册所有模板
      for (const template of templates) {
        await bluetoothPrinter.registerTemplate(template);
      }

      // 复合订单数据
      const orderData = {
        orderNumber: `ORD${Date.now()}`,
        date: new Date().toLocaleDateString(),
        customer: '测试客户',
        items: [
          { name: '商品A', price: '10.00', quantity: 2 },
          { name: '商品B', price: '20.00', quantity: 1 },
          { name: '商品C', price: '15.00', quantity: 3 }
        ],
        total: '75.00'
      };

      // 按顺序打印各个模板部分
      const printPromises = [
        bluetoothPrinter.printText('========== 订单开始 =========='),
        bluetoothPrinter.printTemplate('order-header', orderData),
        bluetoothPrinter.printText('------------------------------'),
        bluetoothPrinter.printTemplate('order-items', orderData),
        bluetoothPrinter.printText('------------------------------'),
        bluetoothPrinter.printTemplate('order-footer', orderData),
        bluetoothPrinter.printText('========== 订单结束 ==========')
      ];

      const results = await Promise.all(printPromises);
      expect(results.every(r => r.success)).toBe(true);

      // 等待所有打印完成
      await new Promise(resolve => setTimeout(resolve, 5000));

      const summary = getWorkflowSummary();
      console.log('多模板协作工作流程总结:', summary);

      expect(summary.eventCounts['templateRegistered']).toBe(3);
      expect(summary.eventCounts['templateRendered']).toBe(3);
      expect(summary.eventCounts['jobCompleted']).toBe(7); // 3个模板 + 4个文本

      console.log('多模板协作工作流程测试完成');
    });
  });

  describe('错误恢复和异常处理工作流程', () => {
    it('应该能够处理各种异常情况并恢复正常工作', async () => {
      await bluetoothPrinter.initialize();

      // 1. 测试无效设备连接错误恢复
      console.log('测试设备连接错误恢复...');
      try {
        await bluetoothPrinter.connectDevice('invalid-device-id');
      } catch (error) {
        console.log('预期的连接错误:', error.message);
      }

      // 验证系统仍然可用
      const result1 = await bluetoothPrinter.printText('错误恢复测试 1');
      expect(result1.success).toBe(true);

      // 2. 测试无效模板错误恢复
      console.log('测试模板错误恢复...');
      try {
        await bluetoothPrinter.printTemplate('invalid-template-id', { data: 'test' });
      } catch (error) {
        console.log('预期的模板错误:', error.message);
      }

      // 验证系统仍然可用
      const result2 = await bluetoothPrinter.printText('错误恢复测试 2');
      expect(result2.success).toBe(true);

      // 3. 测试队列暂停和恢复
      console.log('测试队列暂停和恢复...');
      bluetoothPrinter.pauseQueue();

      const pauseResult = await bluetoothPrinter.printText('暂停队列测试');
      expect(pauseResult.success).toBe(true);

      bluetoothPrinter.resumeQueue();

      // 等待暂停的任务完成
      await new Promise(resolve => setTimeout(resolve, 3000));

      // 4. 验证最终状态
      const status = bluetoothPrinter.getStatus();
      expect(status.initialized).toBe(true);
      expect(status.queue.size).toBe(0);

      const summary = getWorkflowSummary();
      console.log('错误恢复工作流程总结:', summary);

      // 应该有一些错误事件，但最终应该成功
      expect(summary.eventCounts['jobCompleted']).toBeGreaterThan(0);

      console.log('错误恢复工作流程测试完成');
    });
  });

  describe('性能压力工作流程', () => {
    it('应该能够处理高负载的打印任务', async () => {
      await bluetoothPrinter.initialize();

      console.log('开始性能压力测试...');

      // 注册测试模板
      const performanceTemplate = {
        id: 'performance-test',
        name: '性能测试模板',
        type: 'receipt',
        description: '用于性能测试的模板',
        content: '性能测试 #{{index}}\n时间: {{timestamp}}\n数据: {{data}}',
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        version: '1.0.0',
        tags: ['performance', 'test']
      };

      await bluetoothPrinter.registerTemplate(performanceTemplate);

      // 高负载测试参数
      const taskCount = 50;
      const batchSize = 5;
      const startTime = Date.now();

      console.log(`执行 ${taskCount} 个打印任务，批次大小: ${batchSize}`);

      // 分批执行打印任务
      for (let batch = 0; batch < taskCount / batchSize; batch++) {
        const promises = [];

        for (let i = 0; i < batchSize; i++) {
          const taskIndex = batch * batchSize + i + 1;
          const taskData = {
            index: taskIndex,
            timestamp: new Date().toISOString(),
            data: `x`.repeat(100) // 100字符的数据
          };

          promises.push(bluetoothPrinter.printTemplate('performance-test', taskData));
        }

        await Promise.all(promises);
        console.log(`完成批次 ${batch + 1}/${taskCount / batchSize}`);

        // 短暂暂停以避免过载
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // 等待所有任务完成
      console.log('等待所有任务完成...');
      await new Promise(resolve => setTimeout(resolve, 10000));

      const totalTime = Date.now() - startTime;
      const tasksPerSecond = taskCount / (totalTime / 1000);

      const summary = getWorkflowSummary();
      console.log('性能压力测试总结:', {
        totalTasks: taskCount,
        totalTime: `${totalTime}ms`,
        tasksPerSecond: `${tasksPerSecond.toFixed(2)} tasks/s`,
        events: summary
      });

      // 验证性能指标
      expect(tasksPerSecond).toBeGreaterThan(1); // 至少每秒1个任务
      expect(summary.eventCounts['jobCompleted']).toBe(taskCount);

      // 验证系统稳定性
      const status = bluetoothPrinter.getStatus();
      expect(status.initialized).toBe(true);
      expect(status.queue.size).toBe(0);

      console.log('性能压力工作流程测试完成');
    });
  });
});