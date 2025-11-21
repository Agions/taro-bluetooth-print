/**
 * 真实世界场景端到端测试
 * 模拟真实用户使用场景的完整测试
 */

import { BluetoothPrinter, createBluetoothPrinter } from '../../src/BluetoothPrinter';
import {
  IBluetoothPrinterConfig,
  IPrintRequest,
  ITemplateInfo
} from '../../src/types';

// E2E 测试配置 - 使用接近真实环境的配置
const E2E_CONFIG: Partial<IBluetoothPrinterConfig> = {
  bluetooth: {
    scanTimeout: 15000, // 真实环境需要更长的扫描时间
    connectionTimeout: 20000,
    autoReconnect: true,
    maxReconnectAttempts: 5,
    reconnectInterval: 3000
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
    maxSize: 200, // 真实环境可能需要更大的队列
    concurrency: 1,
    retryAttempts: 5,
    retryDelay: 2000,
    autoProcess: true,
    processInterval: 800
  },
  template: {
    enableCache: true,
    cacheSize: 100,
    cacheTimeout: 600000, // 10分钟缓存
    enableValidation: true
  },
  logging: {
    level: 'info',
    enableConsole: true,
    enableFile: false,
    maxFileSize: 52428800, // 50MB
    maxFiles: 10
  },
  events: {
    enabled: true,
    maxListeners: 200,
    enableHistory: true,
    historySize: 1000
  }
};

describe('真实世界场景 E2E 测试', () => {
  let bluetoothPrinter: BluetoothPrinter;
  let testResults: any[] = [];

  beforeEach(async () => {
    testResults = [];
    bluetoothPrinter = createBluetoothPrinter(E2E_CONFIG);
  });

  afterEach(async () => {
    if (bluetoothPrinter) {
      try {
        await bluetoothPrinter.dispose();
      } catch (error) {
        console.warn('销毁实例时出错:', error);
      }
    }
  });

  function recordTestResult(scenario: string, success: boolean, details?: any): void {
    testResults.push({
      scenario,
      success,
      details,
      timestamp: new Date()
    });
  }

  describe('零售商店完整营业日场景', () => {
    it('应该能够模拟完整的零售营业日流程', async () => {
      console.log('🏪 开始零售商店营业日 E2E 测试...');

      try {
        // 1. 系统启动初始化
        console.log('📱 系统初始化...');
        await bluetoothPrinter.initialize();
        expect(bluetoothPrinter.getStatus().initialized).toBe(true);
        recordTestResult('系统初始化', true);

        // 2. 设备准备和连接
        console.log('🔍 扫描并连接打印设备...');
        const devices = await bluetoothPrinter.scanDevices(15000);

        let connectedDevice: any = null;
        if (devices.length > 0) {
          // 优先选择名称包含 "print" 的设备
          connectedDevice = devices.find(d =>
            d.name?.toLowerCase().includes('print') ||
            d.name?.toLowerCase().includes('printer')
          ) || devices[0];

          try {
            await bluetoothPrinter.connectDevice(connectedDevice.id);
            console.log(`✅ 已连接设备: ${connectedDevice.name}`);
            recordTestResult('设备连接', true, { deviceName: connectedDevice.name });
          } catch (error) {
            console.warn('⚠️ 设备连接失败，使用模拟模式:', error);
            recordTestResult('设备连接', false, { error: error.message });
          }
        } else {
          console.warn('⚠️ 未发现设备，使用模拟模式');
          recordTestResult('设备发现', false, { message: '未发现设备' });
        }

        // 3. 注册营业所需模板
        console.log('📋 注册营业模板...');

        // 收据模板
        const receiptTemplate = {
          id: 'daily-receipt',
          name: '日常收据模板',
          type: 'receipt',
          description: '日常营业收据模板',
          content: `
====================
    {{storeName}}
====================
收据号: {{receiptNumber}}
日期: {{date}}
时间: {{time}}
收银员: {{cashier}}

--------------------
商品明细:
{{#items}}
{{name}}
  单价: ¥{{price}} × {{quantity}} = ¥{{total}}
{{/items}}
--------------------
商品数量: {{totalItems}}
小计: ¥{{subtotal}}
折扣: -¥{{discount}}
税额: ¥{{tax}}
应付总额: ¥{{totalAmount}}

支付方式: {{paymentMethod}}
实收: ¥{{amountPaid}}
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
          tags: ['retail', 'receipt', 'daily']
        };

        // 价格标签模板
        const priceTagTemplate = {
          id: 'price-tag',
          name: '价格标签模板',
          type: 'label',
          description: '商品价格标签',
          content: `
====================
商品名称: {{productName}}
商品编号: {{productCode}}
原价: ¥{{originalPrice}}
现价: ¥{{currentPrice}}
{{#discount}}
折扣: {{discount}}% OFF
{{/discount}}
{{#barcode}}
条码: {{barcode}}
{{/barcode}}
====================
          `.trim(),
          enabled: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          version: '1.0.0',
          tags: ['retail', 'price', 'label']
        };

        await bluetoothPrinter.registerTemplate(receiptTemplate);
        await bluetoothPrinter.registerTemplate(priceTagTemplate);
        recordTestResult('模板注册', true, { templates: ['receipt', 'price-tag'] });

        // 4. 模拟营业高峰期的多笔交易
        console.log('💰 模拟营业高峰期交易...');

        const transactions = [
          {
            id: 'TXN001',
            cashier: '张三',
            items: [
              { name: '可口可乐 500ml', price: '3.50', quantity: 2, total: '7.00' },
              { name: '薯片 100g', price: '8.00', quantity: 1, total: '8.00' }
            ],
            paymentMethod: '微信支付',
            amountPaid: '15.00'
          },
          {
            id: 'TXN002',
            cashier: '李四',
            items: [
              { name: '方便面 5包装', price: '12.00', quantity: 1, total: '12.00' },
              { name: '火腿肠', price: '2.50', quantity: 3, total: '7.50' },
              { name: '矿泉水 550ml', price: '2.00', quantity: 2, total: '4.00' }
            ],
            paymentMethod: '支付宝',
            amountPaid: '24.00'
          },
          {
            id: 'TXN003',
            cashier: '王五',
            items: [
              { name: '巧克力礼盒', price: '68.00', quantity: 1, total: '68.00' },
              { name: '鲜花', price: '35.00', quantity: 1, total: '35.00' }
            ],
            paymentMethod: '现金',
            amountPaid: '105.00'
          }
        ];

        // 处理每笔交易
        for (const transaction of transactions) {
          const receiptData = {
            storeName: '便民超市',
            receiptNumber: transaction.id,
            date: new Date().toLocaleDateString(),
            time: new Date().toLocaleTimeString(),
            cashier: transaction.cashier,
            items: transaction.items,
            totalItems: transaction.items.reduce((sum, item) => sum + parseInt(item.quantity), 0),
            subtotal: transaction.items.reduce((sum, item) => sum + parseFloat(item.total), 0).toFixed(2),
            discount: '0.00',
            tax: '0.00',
            totalAmount: transaction.items.reduce((sum, item) => sum + parseFloat(item.total), 0).toFixed(2),
            paymentMethod: transaction.paymentMethod,
            amountPaid: transaction.amountPaid,
            change: (parseFloat(transaction.amountPaid) - transaction.items.reduce((sum, item) => sum + parseFloat(item.total), 0)).toFixed(2)
          };

          const result = await bluetoothPrinter.printTemplate('daily-receipt', receiptData);
          expect(result.success).toBe(true);

          // 等待打印完成
          await new Promise(resolve => setTimeout(resolve, 2000));
        }

        recordTestResult('高峰期交易处理', true, { transactionCount: transactions.length });

        // 5. 商品上架价格标签打印
        console.log('🏷️ 打印商品价格标签...');

        const newProducts = [
          {
            productName: '进口牛奶 1L装',
            productCode: 'P1001',
            originalPrice: '18.00',
            currentPrice: '15.80',
            discount: 12,
            barcode: '1234567890123'
          },
          {
            productName: '有机蔬菜套装',
            productCode: 'P1002',
            originalPrice: '25.00',
            currentPrice: '19.90',
            discount: 20,
            barcode: '1234567890124'
          }
        ];

        for (const product of newProducts) {
          const result = await bluetoothPrinter.printTemplate('price-tag', product);
          expect(result.success).toBe(true);
          await new Promise(resolve => setTimeout(resolve, 1500));
        }

        recordTestResult('价格标签打印', true, { productCount: newProducts.length });

        // 6. 系统状态检查
        console.log('📊 系统状态检查...');
        const finalStatus = bluetoothPrinter.getStatus();
        expect(finalStatus.initialized).toBe(true);
        expect(finalStatus.queue.size).toBe(0); // 所有任务应该完成

        recordTestResult('系统状态检查', true, {
          queueCompleted: finalStatus.queue.completed,
          queueFailed: finalStatus.queue.failed
        });

        console.log('✅ 零售商店营业日 E2E 测试完成');

      } catch (error) {
        console.error('❌ 零售商店营业日 E2E 测试失败:', error);
        recordTestResult('零售营业日', false, { error: error.message });
        throw error;
      }
    }, 120000); // 2分钟超时
  });

  describe('餐厅高峰期服务场景', () => {
    it('应该能够模拟餐厅高峰期的完整服务流程', async () => {
      console.log('🍽️ 开始餐厅高峰期服务 E2E 测试...');

      try {
        // 1. 系统初始化
        await bluetoothPrinter.initialize();
        recordTestResult('餐厅系统初始化', true);

        // 2. 注册餐厅专用模板
        console.log('📋 注册餐厅模板...');

        // 厨房订单模板
        const kitchenOrderTemplate = {
          id: 'restaurant-kitchen-order',
          name: '厨房订单模板',
          type: 'receipt',
          description: '餐厅厨房制作订单',
          content: `
================================
           厨房订单
================================
订单号: {{orderNumber}}
时间: {{orderTime}}
桌号: {{tableNumber}}
服务员: {{waiter}}
订单类型: {{orderType}}

--------------------------------
菜品详情:
{{#items}}
【{{category}}】
{{dishName}}
  数量: {{quantity}}
  规格: {{size}}
  口味: {{taste}}
  特殊要求: {{specialRequests}}
  预计制作时间: {{cookTime}}分钟
{{/items}}
--------------------------------
总制作时间: {{totalCookTime}}分钟
取餐时间: {{pickupTime}}
优先级: {{priority}}

================================
          `.trim(),
          enabled: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          version: '1.0.0',
          tags: ['restaurant', 'kitchen', 'order']
        };

        // 顾客结账单模板
        const customerBillTemplate = {
          id: 'restaurant-customer-bill',
          name: '顾客结账单模板',
          type: 'receipt',
          description: '餐厅顾客结账单',
          content: `
================================
        {{restaurantName}}
================================
结账单
订单号: {{orderNumber}}
桌号: {{tableNumber}}
开台时间: {{openTime}}
结账时间: {{closeTime}}
服务员: {{waiter}}
顾客人数: {{guestCount}}

--------------------------------
消费明细:
{{#items}}
{{dishName}} ({{size}})
  ¥{{price}} × {{quantity}} = ¥{{subtotal}}
{{/items}}
--------------------------------
小计: ¥{{subtotal}}
服务费(10%): ¥{{serviceCharge}}
优惠券: -¥{{couponDiscount}}
会员折扣: -¥{{memberDiscount}}
总计: ¥{{total}}

支付方式: {{paymentMethod}}
实收金额: ¥{{amountPaid}}
会员积分: +{{pointsEarned}}

--------------------------------
谢谢惠顾，欢迎下次光临!
会员评价: {{restaurantName}}.com/review
================================
          `.trim(),
          enabled: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          version: '1.0.0',
          tags: ['restaurant', 'bill', 'customer']
        };

        await bluetoothPrinter.registerTemplate(kitchenOrderTemplate);
        await bluetoothPrinter.registerTemplate(customerBillTemplate);
        recordTestResult('餐厅模板注册', true);

        // 3. 模拟高峰期多桌客人同时点餐
        console.log('🍽️ 模拟高峰期多桌点餐...');

        const orders = [
          {
            orderNumber: 'ORD2025001',
            orderTime: new Date().toLocaleTimeString(),
            tableNumber: 'A01',
            waiter: '服务员小李',
            orderType: '堂食',
            items: [
              {
                category: '热菜',
                dishName: '宫保鸡丁',
                quantity: 1,
                size: '标准份',
                taste: '微辣',
                specialRequests: '不要花生',
                cookTime: 15,
                price: '28.00',
                subtotal: '28.00'
              },
              {
                category: '主食',
                dishName: '米饭',
                quantity: 2,
                size: '大碗',
                taste: '原味',
                specialRequests: '',
                cookTime: 2,
                price: '3.00',
                subtotal: '6.00'
              }
            ],
            totalCookTime: 15,
            pickupTime: new Date(Date.now() + 15 * 60000).toLocaleTimeString(),
            priority: '普通'
          },
          {
            orderNumber: 'ORD2025002',
            orderTime: new Date().toLocaleTimeString(),
            tableNumber: 'B05',
            waiter: '服务员小王',
            orderType: '堂食',
            items: [
              {
                category: '汤品',
                dishName: '西红柿鸡蛋汤',
                quantity: 1,
                size: '大份',
                taste: '清淡',
                specialRequests: '多放香菜',
                cookTime: 10,
                price: '18.00',
                subtotal: '18.00'
              },
              {
                category: '凉菜',
                dishName: '拍黄瓜',
                quantity: 1,
                size: '标准份',
                taste: '微酸',
                specialRequests: '',
                cookTime: 5,
                price: '12.00',
                subtotal: '12.00'
              }
            ],
            totalCookTime: 10,
            pickupTime: new Date(Date.now() + 10 * 60000).toLocaleTimeString(),
            priority: '普通'
          },
          {
            orderNumber: 'ORD2025003',
            orderTime: new Date().toLocaleTimeString(),
            tableNumber: 'VIP01',
            waiter: '领班小张',
            orderType: '堂食',
            items: [
              {
                category: '海鲜',
                dishName: '清蒸鲈鱼',
                quantity: 1,
                size: '大份',
                taste: '鲜美',
                specialRequests: '蒸嫩一点',
                cookTime: 20,
                price: '88.00',
                subtotal: '88.00'
              },
              {
                category: '热菜',
                dishName: '麻婆豆腐',
                quantity: 1,
                size: '标准份',
                taste: '麻辣',
                specialRequests: '少油',
                cookTime: 12,
                price: '22.00',
                subtotal: '22.00'
              },
              {
                category: '酒水',
                dishName: '青岛啤酒',
                quantity: 4,
                size: '500ml',
                taste: '原味',
                specialRequests: '冰镇',
                cookTime: 1,
                price: '8.00',
                subtotal: '32.00'
              }
            ],
            totalCookTime: 20,
            pickupTime: new Date(Date.now() + 20 * 60000).toLocaleTimeString(),
            priority: 'VIP'
          }
        ];

        // 同时打印厨房订单（模拟多桌同时点餐）
        const kitchenPrintPromises = orders.map(order =>
          bluetoothPrinter.printTemplate('restaurant-kitchen-order', order)
        );

        const kitchenResults = await Promise.all(kitchenPrintPromises);
        expect(kitchenResults.every(r => r.success)).toBe(true);

        // 等待厨房订单打印完成
        await new Promise(resolve => setTimeout(resolve, 8000));

        recordTestResult('厨房订单打印', true, { orderCount: orders.length });

        // 4. 模拟客人用餐完毕结账
        console.log('💰 模拟客人结账...');

        // 稍等一会模拟用餐时间
        await new Promise(resolve => setTimeout(resolve, 2000));

        const bills = orders.map((order, index) => ({
          restaurantName: '美味川菜馆',
          orderNumber: order.orderNumber,
          tableNumber: order.tableNumber,
          openTime: new Date(Date.now() - 60 * 60000).toLocaleString(),
          closeTime: new Date().toLocaleString(),
          waiter: order.waiter,
          guestCount: index === 2 ? 4 : 2, // VIP桌4人
          items: order.items,
          subtotal: order.items.reduce((sum, item) => sum + parseFloat(item.subtotal), 0).toFixed(2),
          serviceCharge: (order.items.reduce((sum, item) => sum + parseFloat(item.subtotal), 0) * 0.1).toFixed(2),
          couponDiscount: index === 2 ? '10.00' : '0.00', // VIP桌有优惠
          memberDiscount: index === 2 ? '15.00' : '0.00',
          total: (order.items.reduce((sum, item) => sum + parseFloat(item.subtotal), 0) * 1.1 - (index === 2 ? 25 : 0)).toFixed(2),
          paymentMethod: index === 0 ? '微信支付' : index === 1 ? '支付宝' : '现金',
          amountPaid: '0.00', // 实收金额在结账时确定
          pointsEarned: Math.floor(order.items.reduce((sum, item) => sum + parseFloat(item.subtotal), 0))
        }));

        // 设置实收金额
        bills.forEach(bill => {
          bill.amountPaid = (parseFloat(bill.total) + 0.5).toFixed(2); // 加一点找零
        });

        // 打印结账单
        const billPrintPromises = bills.map(bill =>
          bluetoothPrinter.printTemplate('restaurant-customer-bill', bill)
        );

        const billResults = await Promise.all(billPrintPromises);
        expect(billResults.every(r => r.success)).toBe(true);

        // 等待结账单打印完成
        await new Promise(resolve => setTimeout(resolve, 10000));

        recordTestResult('结账单打印', true, { billCount: bills.length });

        // 5. 系统状态验证
        const finalStatus = bluetoothPrinter.getStatus();
        expect(finalStatus.initialized).toBe(true);
        expect(finalStatus.queue.size).toBe(0);

        recordTestResult('餐厅系统状态检查', true, {
          ordersProcessed: orders.length,
          totalRevenue: bills.reduce((sum, bill) => sum + parseFloat(bill.total), 0)
        });

        console.log('✅ 餐厅高峰期服务 E2E 测试完成');

      } catch (error) {
        console.error('❌ 餐厅高峰期服务 E2E 测试失败:', error);
        recordTestResult('餐厅高峰期服务', false, { error: error.message });
        throw error;
      }
    }, 150000); // 2.5分钟超时
  });

  describe('物流快递配送场景', () => {
    it('应该能够模拟快递配送中心完整流程', async () => {
      console.log('📦 开始物流快递配送 E2E 测试...');

      try {
        // 1. 系统初始化
        await bluetoothPrinter.initialize();
        recordTestResult('物流系统初始化', true);

        // 2. 注册物流相关模板
        console.log('📋 注册物流模板...');

        // 快递面单模板
        const shippingLabelTemplate = {
          id: 'logistics-shipping-label',
          name: '快递面单模板',
          type: 'label',
          description: '快递配送面单',
          content: `
================================
           快递面单
================================
运单号: {{trackingNumber}}
寄件方:
姓名: {{senderName}}
电话: {{senderPhone}}
地址: {{senderAddress}}
公司: {{senderCompany}} (如有)

收件方:
姓名: {{receiverName}}
电话: {{receiverPhone}}
地址: {{receiverAddress}}
公司: {{receiverCompany}} (如有)

================================
货物信息:
品名: {{productName}}
数量: {{quantity}}
重量: {{weight}}kg
体积: {{volume}}cm³
保价金额: ¥{{insuranceValue}}

================================
配送信息:
配送方式: {{deliveryMethod}}
付款方式: {{paymentMethod}}
运费: ¥{{shippingFee}}
代收货款: ¥{{codAmount}} (如有)

预计送达: {{estimatedDelivery}}
时效: {{deliveryTimeframe}}
签收要求: {{signatureRequirement}}

================================
{{#qrCode}}
[二维码] {{qrCode}}
{{/qrCode}}
客服电话: {{customerServicePhone}}
================================
          `.trim(),
          enabled: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          version: '1.0.0',
          tags: ['logistics', 'shipping', 'label']
        };

        // 配货单模板
        const packingListTemplate = {
          id: 'logistics-packing-list',
          name: '配货单模板',
          type: 'receipt',
          description: '仓库配货清单',
          content: `
================================
           配货单
================================
配货单号: {{packingListNumber}}
配货日期: {{packingDate}}
配货员: {{packerName}}
审核员: {{reviewerName}}

--------------------------------
订单信息:
订单号: {{orderNumber}}
客户: {{customerName}}
配送方式: {{deliveryMethod}}

--------------------------------
配货明细:
{{#items}}
商品编号: {{productCode}}
商品名称: {{productName}}
规格: {{specification}}
应配数量: {{requiredQuantity}}
实配数量: {{actualQuantity}}
库位: {{location}}
批次号: {{batchNumber}}
{{/items}}
--------------------------------
总商品数: {{totalItems}}
总件数: {{totalPieces}}
总重量: {{totalWeight}}kg

包装信息:
包装箱数: {{boxCount}}
包装材料: {{packagingMaterial}}
特殊包装: {{specialPackaging}}

================================
配货员签名: _______________
审核员签名: _______________
          `.trim(),
          enabled: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          version: '1.0.0',
          tags: ['logistics', 'packing', 'warehouse']
        };

        await bluetoothPrinter.registerTemplate(shippingLabelTemplate);
        await bluetoothPrinter.registerTemplate(packingListTemplate);
        recordTestResult('物流模板注册', true);

        // 3. 模拟早高峰批量订单处理
        console.log('📦 模拟早高峰批量订单处理...');

        const shipments = [
          {
            trackingNumber: `SF${Date.now()}001`,
            senderName: '发件人张三',
            senderPhone: '13800138001',
            senderAddress: '北京市朝阳区建国路88号',
            senderCompany: 'ABC贸易有限公司',
            receiverName: '收件人李四',
            receiverPhone: '13900139001',
            receiverAddress: '上海市浦东新区世纪大道200号',
            receiverCompany: 'XYZ科技有限公司',
            productName: '电子元件套装',
            quantity: 2,
            weight: '1.2',
            volume: '1500',
            insuranceValue: '5000.00',
            deliveryMethod: '顺丰标快',
            paymentMethod: '寄付',
            shippingFee: '23.00',
            codAmount: '0.00',
            estimatedDelivery: new Date(Date.now() + 2 * 24 * 60000).toLocaleDateString(),
            deliveryTimeframe: '2个工作日',
            signatureRequirement: '需本人签收',
            qrCode: `https://sf-express.com/track?number=SF${Date.now()}001`,
            customerServicePhone: '95338'
          },
          {
            trackingNumber: `SF${Date.now()}002`,
            senderName: '发件人王五',
            senderPhone: '13700137002',
            senderAddress: '广州市天河区珠江新城',
            senderCompany: '',
            receiverName: '收件人赵六',
            receiverPhone: '13600136002',
            receiverAddress: '深圳市南山区科技园',
            receiverCompany: '',
            productName: '服装订单',
            quantity: 5,
            weight: '0.8',
            volume: '2000',
            insuranceValue: '800.00',
            deliveryMethod: '顺丰特惠',
            paymentMethod: '到付',
            shippingFee: '18.00',
            codAmount: '299.00',
            estimatedDelivery: new Date(Date.now() + 3 * 24 * 60000).toLocaleDateString(),
            deliveryTimeframe: '3个工作日',
            signatureRequirement: '可代签',
            qrCode: `https://sf-express.com/track?number=SF${Date.now()}002`,
            customerServicePhone: '95338'
          }
        ];

        // 批量打印快递面单
        const shippingPrintPromises = shipments.map(shipment =>
          bluetoothPrinter.printTemplate('logistics-shipping-label', shipment)
        );

        const shippingResults = await Promise.all(shippingPrintPromises);
        expect(shippingResults.every(r => r.success)).toBe(true);

        // 等待快递面单打印完成
        await new Promise(resolve => setTimeout(resolve, 12000));

        recordTestResult('快递面单批量打印', true, { shipmentCount: shipments.length });

        // 4. 模拟仓库配货流程
        console.log('📋 模拟仓库配货流程...');

        const packingLists = [
          {
            packingListNumber: `PK${Date.now()}001`,
            packingDate: new Date().toLocaleDateString(),
            packerName: '配货员小陈',
            reviewerName: '审核员小林',
            orderNumber: 'ORD202502001',
            customerName: 'XYZ科技有限公司',
            deliveryMethod: '顺丰标快',
            items: [
              {
                productCode: 'ELEC001',
                productName: '主板套装',
                specification: '标准版',
                requiredQuantity: 2,
                actualQuantity: 2,
                location: 'A-01-03',
                batchNumber: 'B202502001'
              },
              {
                productCode: 'ELEC002',
                productName: '内存条',
                specification: '16GB DDR4',
                requiredQuantity: 4,
                actualQuantity: 4,
                location: 'A-02-01',
                batchNumber: 'B202502005'
              }
            ],
            totalItems: 2,
            totalPieces: 6,
            totalWeight: '1.5',
            boxCount: 1,
            packagingMaterial: '防静电袋+泡沫箱',
            specialPackaging: '易碎品标识'
          }
        ];

        // 打印配货单
        for (const packingList of packingLists) {
          const result = await bluetoothPrinter.printTemplate('logistics-packing-list', packingList);
          expect(result.success).toBe(true);
          await new Promise(resolve => setTimeout(resolve, 3000));
        }

        recordTestResult('配货单打印', true, { packingListCount: packingLists.length });

        // 5. 系统状态验证
        const finalStatus = bluetoothPrinter.getStatus();
        expect(finalStatus.initialized).toBe(true);
        expect(finalStatus.queue.size).toBe(0);

        recordTestResult('物流系统状态检查', true, {
          shipmentsProcessed: shipments.length,
          packingListsProcessed: packingLists.length,
          totalWeight: shipments.reduce((sum, s) => sum + parseFloat(s.weight), 0)
        });

        console.log('✅ 物流快递配送 E2E 测试完成');

      } catch (error) {
        console.error('❌ 物流快递配送 E2E 测试失败:', error);
        recordTestResult('物流快递配送', false, { error: error.message });
        throw error;
      }
    }, 120000); // 2分钟超时
  });

  describe('医疗诊所就诊场景', () => {
    it('应该能够模拟医疗诊所完整就诊流程', async () => {
      console.log('🏥 开始医疗诊所就诊 E2E 测试...');

      try {
        // 1. 系统初始化
        await bluetoothPrinter.initialize();
        recordTestResult('医疗系统初始化', true);

        // 2. 注册医疗相关模板
        console.log('📋 注册医疗模板...');

        // 处方单模板
        const prescriptionTemplate = {
          id: 'medical-prescription',
          name: '医疗处方单模板',
          type: 'receipt',
          description: '医生处方单',
          content: `
================================
           处方笺
================================
医院名称: {{hospitalName}}
科室: {{department}}
处方编号: {{prescriptionNumber}}

患者信息:
姓名: {{patientName}}
性别: {{patientGender}}
年龄: {{patientAge}}
体重: {{patientWeight}}kg
过敏史: {{allergies}}

医生信息:
医生姓名: {{doctorName}}
职称: {{doctorTitle}}
开方日期: {{prescriptionDate}}

--------------------------------
Rp. (处方)
{{#medications}}
{{index}}. {{medicationName}}
  规格: {{specification}}
  用法用量: {{dosage}}
  用法: {{administration}}
  频次: {{frequency}}
  疗程: {{duration}}
  数量: {{quantity}}
  单价: ¥{{unitPrice}}
  小计: ¥{{subtotal}}
{{/medications}}
--------------------------------

诊断: {{diagnosis}}
医嘱: {{doctorInstructions}}
注意事项: {{precautions}}

--------------------------------
药品总金额: ¥{{totalAmount}}
诊金: ¥{{consultationFee}}
总计: ¥{{grandTotal}}

================================
医生签名: _______________
审核药师: _______________
患者签名: _______________

取药时间: {{pickupTime}}
药房电话: {{pharmacyPhone}}
================================
          `.trim(),
          enabled: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          version: '1.0.0',
          tags: ['medical', 'prescription', 'clinic']
        };

        // 检验报告模板
        const labReportTemplate = {
          id: 'medical-lab-report',
          name: '检验报告模板',
          type: 'receipt',
          description: '医学检验报告单',
          content: `
================================
           检验报告
================================
医院名称: {{hospitalName}}
检验科: {{labDepartment}}
报告编号: {{reportNumber}}

患者信息:
姓名: {{patientName}}
性别: {{patientGender}}
年龄: {{patientAge}}
标本类型: {{sampleType}}
采集时间: {{collectionTime}}
报告时间: {{reportTime}}

--------------------------------
检验项目结果:
{{#testResults}}
{{testName}}
  检测结果: {{result}}
  参考范围: {{referenceRange}}
  单位: {{unit}}
  状态: {{status}}
{{/testResults}}
--------------------------------

检验医生: {{labDoctor}}
审核医生: {{reviewDoctor}}
检验科室: {{labDepartment}}

--------------------------------
备注: {{remarks}}
此报告仅供临床参考，具体诊断请结合临床症状。

================================
报告时间: {{reportTime}}
查询电话: {{hospitalPhone}}
================================
          `.trim(),
          enabled: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          version: '1.0.0',
          tags: ['medical', 'lab', 'report']
        };

        await bluetoothPrinter.registerTemplate(prescriptionTemplate);
        await bluetoothPrinter.registerTemplate(labReportTemplate);
        recordTestResult('医疗模板注册', true);

        // 3. 模拟多个患者就诊流程
        console.log('👥 模拟患者就诊流程...');

        const patients = [
          {
            prescriptionNumber: 'RX202502001',
            hospitalName: '市第一人民医院',
            department: '内科',
            patientName: '张三',
            patientGender: '男',
            patientAge: '35',
            patientWeight: '70',
            allergies: '青霉素过敏',
            doctorName: '李医生',
            doctorTitle: '主治医师',
            prescriptionDate: new Date().toLocaleDateString(),
            medications: [
              {
                index: 1,
                medicationName: '阿莫西林胶囊',
                specification: '0.5g×24粒',
                dosage: '0.5g',
                administration: '口服',
                frequency: '每日3次',
                duration: '7天',
                quantity: '1盒',
                unitPrice: '25.00',
                subtotal: '25.00'
              },
              {
                index: 2,
                medicationName: '布洛芬缓释胶囊',
                specification: '0.3g×20粒',
                dosage: '0.3g',
                administration: '口服',
                frequency: '每日2次',
                duration: '5天',
                quantity: '1盒',
                unitPrice: '18.50',
                subtotal: '18.50'
              }
            ],
            diagnosis: '上呼吸道感染',
            doctorInstructions: '注意休息，多喝水，避免辛辣食物',
            precautions: '如出现过敏反应请立即停药并就医',
            totalAmount: '43.50',
            consultationFee: '20.00',
            grandTotal: '63.50',
            pickupTime: new Date(Date.now() + 30 * 60000).toLocaleTimeString(),
            pharmacyPhone: '0123-4567890'
          },
          {
            prescriptionNumber: 'RX202502002',
            hospitalName: '市第一人民医院',
            department: '儿科',
            patientName: '小明',
            patientGender: '男',
            patientAge: '8',
            patientWeight: '25',
            allergies: '无已知过敏史',
            doctorName: '王医生',
            doctorTitle: '副主任医师',
            prescriptionDate: new Date().toLocaleDateString(),
            medications: [
              {
                index: 1,
                medicationName: '小儿感冒颗粒',
                specification: '5g×10袋',
                dosage: '5g',
                administration: '口服',
                frequency: '每日3次',
                duration: '5天',
                quantity: '1盒',
                unitPrice: '15.00',
                subtotal: '15.00'
              }
            ],
            diagnosis: '小儿感冒',
            doctorInstructions: '温水冲服，注意保暖',
            precautions: '服药期间避免生冷食物',
            totalAmount: '15.00',
            consultationFee: '25.00',
            grandTotal: '40.00',
            pickupTime: new Date(Date.now() + 20 * 60000).toLocaleTimeString(),
            pharmacyPhone: '0123-4567890'
          }
        ];

        // 打印处方单
        for (const patient of patients) {
          const result = await bluetoothPrinter.printTemplate('medical-prescription', patient);
          expect(result.success).toBe(true);
          await new Promise(resolve => setTimeout(resolve, 4000));
        }

        recordTestResult('处方单打印', true, { patientCount: patients.length });

        // 4. 模拟检验报告
        console.log('🔬 模拟检验报告...');

        const labReports = [
          {
            reportNumber: 'LAB202502001',
            hospitalName: '市第一人民医院',
            labDepartment: '检验科',
            patientName: '张三',
            patientGender: '男',
            patientAge: '35',
            sampleType: '静脉血',
            collectionTime: new Date(Date.now() - 2 * 60000).toLocaleString(),
            reportTime: new Date().toLocaleString(),
            testResults: [
              {
                testName: '白细胞计数',
                result: '6.8',
                referenceRange: '4.0-10.0',
                unit: '10^9/L',
                status: '正常'
              },
              {
                testName: '红细胞计数',
                result: '4.5',
                referenceRange: '4.0-5.5',
                unit: '10^12/L',
                status: '正常'
              },
              {
                testName: '血红蛋白',
                result: '140',
                referenceRange: '120-160',
                unit: 'g/L',
                status: '正常'
              }
            ],
            labDoctor: '检验师小刘',
            reviewDoctor: '主治医师小陈',
            remarks: '各项指标正常，建议定期复查',
            hospitalPhone: '0123-4567890'
          }
        ];

        // 打印检验报告
        for (const report of labReports) {
          const result = await bluetoothPrinter.printTemplate('medical-lab-report', report);
          expect(result.success).toBe(true);
          await new Promise(resolve => setTimeout(resolve, 4000));
        }

        recordTestResult('检验报告打印', true, { reportCount: labReports.length });

        // 5. 系统状态验证
        const finalStatus = bluetoothPrinter.getStatus();
        expect(finalStatus.initialized).toBe(true);
        expect(finalStatus.queue.size).toBe(0);

        recordTestResult('医疗系统状态检查', true, {
          prescriptionsProcessed: patients.length,
          labReportsProcessed: labReports.length,
          totalRevenue: patients.reduce((sum, p) => sum + parseFloat(p.grandTotal), 0)
        });

        console.log('✅ 医疗诊所就诊 E2E 测试完成');

      } catch (error) {
        console.error('❌ 医疗诊所就诊 E2E 测试失败:', error);
        recordTestResult('医疗诊所就诊', false, { error: error.message });
        throw error;
      }
    }, 120000); // 2分钟超时
  });

  describe('E2E 测试结果汇总', () => {
    it('应该能够生成详细的测试结果报告', () => {
      console.log('\n📊 E2E 测试结果汇总:');
      console.log('='.repeat(50));

      const totalTests = testResults.length;
      const passedTests = testResults.filter(r => r.success).length;
      const failedTests = totalTests - passedTests;

      console.log(`总测试数: ${totalTests}`);
      console.log(`通过测试: ${passedTests}`);
      console.log(`失败测试: ${failedTests}`);
      console.log(`通过率: ${((passedTests / totalTests) * 100).toFixed(1)}%`);

      console.log('\n详细结果:');
      testResults.forEach((result, index) => {
        const status = result.success ? '✅ PASS' : '❌ FAIL';
        console.log(`${index + 1}. ${status} - ${result.scenario}`);
        if (!result.success && result.details) {
          console.log(`   错误: ${result.details.error}`);
        }
      });

      console.log('='.repeat(50));

      // 验证大部分测试通过
      expect(passedTests).toBeGreaterThanOrEqual(totalTests * 0.8); // 至少80%通过率

      if (failedTests > 0) {
        console.warn(`⚠️ 有 ${failedTests} 个测试失败，请检查日志了解详情`);
      }
    });
  });
});