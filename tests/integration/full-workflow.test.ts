/**
 * 完整工作流集成测试
 */

import { TaroBluetoothPrint } from '../../src/TaroBluetoothPrint';
import { PrinterType, BluetoothEventType } from '../../src/types';
import { waitFor, createMockBluetoothDevice, createMockPrinterConfig } from '../utils/test-utils';

describe('完整工作流集成测试', () => {
  let printer: TaroBluetoothPrint;

  beforeEach(() => {
    printer = new TaroBluetoothPrint();
  });

  afterEach(async () => {
    await printer.destroy();
  });

  describe('完整打印流程', () => {
    it('应该完成完整的蓝牙打印流程', async () => {
      // 1. 初始化
      await expect(printer.initialize()).resolves.toBe(true);

      // 2. 开始设备扫描
      await expect(printer.startBluetoothDiscovery()).resolves.toBe(true);

      // 3. 模拟发现设备
      const mockDevice = createMockBluetoothDevice({
        deviceId: 'test-printer-device',
        name: 'Test Thermal Printer'
      });

      // 触发设备发现事件
      printer.emit(BluetoothEventType.DEVICE_DISCOVERED, mockDevice);

      // 4. 连接设备
      await expect(printer.connect(mockDevice.deviceId)).resolves.toBe(true);

      // 5. 添加打印机配置
      const printerConfig = createMockPrinterConfig({
        name: 'Test Printer',
        type: PrinterType.THERMAL
      });

      await expect(printer.addPrinter(printerConfig)).resolves.toBe(true);
      await expect(printer.setCurrentPrinter(printerConfig.name)).resolves.toBe(true);

      // 6. 创建打印作业
      const printData = {
        text: 'Hello, World!',
        timestamp: new Date().toISOString()
      };

      const job = await printer.createPrintJob(printData);
      expect(job.id).toBeDefined();

      // 7. 执行打印
      await expect(printer.executePrintJob(job.id)).resolves.toBe(true);

      // 8. 验证打印状态
      const status = printer.getPrintJobStatus(job.id);
      expect(status).toBe('completed');

      // 9. 断开连接
      await expect(printer.disconnect()).resolves.toBe(true);
    }, 15000); // 15秒超时

    it('应该处理设备发现失败', async () => {
      await printer.initialize();

      // 模拟蓝牙权限被拒绝
      printer.simulatePermissionDenied();

      await expect(printer.startBluetoothDiscovery()).rejects.toThrow('蓝牙权限被拒绝');
    });

    it('应该处理连接中断', async () => {
      await printer.initialize();

      const mockDevice = createMockBluetoothDevice();
      await printer.connect(mockDevice.deviceId);

      // 模拟连接中断
      printer.simulateConnectionLost();

      // 等待连接状态更新
      await waitFor(() => printer.getConnectionState() === 'disconnected');

      expect(printer.getConnectionState()).toBe('disconnected');
    });
  });

  describe('多设备并发操作', () => {
    it('应该支持多设备并发连接', async () => {
      await printer.initialize();

      const devices = [
        createMockBluetoothDevice({ deviceId: 'device-1', name: 'Printer 1' }),
        createMockBluetoothDevice({ deviceId: 'device-2', name: 'Printer 2' }),
        createMockBluetoothDevice({ deviceId: 'device-3', name: 'Printer 3' })
      ];

      // 并发连接多个设备
      const connectionPromises = devices.map(device =>
        printer.connect(device.deviceId)
      );

      const results = await Promise.allSettled(connectionPromises);

      // 至少应该有一个连接成功
      const successfulConnections = results.filter(result => result.status === 'fulfilled');
      expect(successfulConnections.length).toBeGreaterThan(0);
    });

    it('应该支持并发打印作业', async () => {
      await printer.initialize();

      const mockDevice = createMockBluetoothDevice();
      await printer.connect(mockDevice.deviceId);

      const printerConfig = createMockPrinterConfig();
      await printer.addPrinter(printerConfig);
      await printer.setCurrentPrinter(printerConfig.name);

      // 创建多个并发打印作业
      const jobPromises = Array.from({ length: 10 }, (_, i) =>
        printer.createPrintJob({
          text: `Concurrent Print Job ${i}`,
          timestamp: new Date().toISOString()
        })
      );

      const jobs = await Promise.all(jobPromises);

      // 并发执行打印作业
      const executionPromises = jobs.map(job =>
        printer.executePrintJob(job.id)
      );

      const results = await Promise.allSettled(executionPromises);

      // 检查成功完成的作业数量
      const successfulJobs = results.filter(result => result.status === 'fulfilled');
      expect(successfulJobs.length).toBeGreaterThan(0);
    });
  });

  describe('模板和数据处理', () => {
    beforeEach(async () => {
      await printer.initialize();

      const mockDevice = createMockBluetoothDevice();
      await printer.connect(mockDevice.deviceId);

      const printerConfig = createMockPrinterConfig();
      await printer.addPrinter(printerConfig);
      await printer.setCurrentPrinter(printerConfig.name);
    });

    it('应该支持复杂模板渲染', async () => {
      const template = {
        name: 'receipt',
        content: `
          商店收据
          =====================
          商品: {{items.0.name}}
          数量: {{items.0.quantity}}
          单价: ¥{{items.0.price}}
          小计: ¥{{items.0.subtotal}}

          商品: {{items.1.name}}
          数量: {{items.1.quantity}}
          单价: ¥{{items.1.price}}
          小计: ¥{{items.1.subtotal}}

          总计: ¥{{total}}
          支付方式: {{paymentMethod}}
          时间: {{timestamp}}
          =====================
          谢谢惠顾!
        `,
        defaultData: {
          items: [],
          total: 0,
          paymentMethod: '现金',
          timestamp: new Date().toISOString()
        }
      };

      printer.registerTemplate(template);

      const data = {
        items: [
          { name: '苹果', quantity: 2, price: 5.00, subtotal: 10.00 },
          { name: '香蕉', quantity: 3, price: 3.00, subtotal: 9.00 }
        ],
        total: 19.00,
        paymentMethod: '微信支付',
        timestamp: new Date().toISOString()
      };

      const job = await printer.printWithTemplate('receipt', data);
      expect(job.data).toContain('苹果');
      expect(job.data).toContain('¥19.00');
    });

    it('应该支持图像数据处理', async () => {
      const imageData = new Uint8Array([0x1B, 0x2A, 0x00]); // 示例图像数据

      const job = await printer.createPrintJob({
        type: 'image',
        data: imageData,
        width: 384,
        height: 200
      });

      await expect(printer.executePrintJob(job.id)).resolves.toBe(true);
    });
  });

  describe('错误恢复和重试机制', () => {
    it('应该自动重试失败的连接', async () => {
      await printer.initialize();

      // 模拟连接失败
      printer.simulateConnectionFailure();

      const mockDevice = createMockBluetoothDevice();

      // 启用自动重试
      printer.enableAutoRetry({
        maxAttempts: 3,
        delay: 100
      });

      await expect(printer.connect(mockDevice.deviceId)).resolves.toBe(true);
    });

    it('应该从打印失败中恢复', async () => {
      await printer.initialize();

      const mockDevice = createMockBluetoothDevice();
      await printer.connect(mockDevice.deviceId);

      const printerConfig = createMockPrinterConfig();
      await printer.addPrinter(printerConfig);
      await printer.setCurrentPrinter(printerConfig.name);

      // 模拟打印失败
      printer.simulatePrintFailure();

      const job = await printer.createPrintJob({ text: 'Test Print' });

      // 第一次尝试应该失败
      await expect(printer.executePrintJob(job.id)).rejects.toThrow();

      // 清除失败模拟
      printer.clearSimulation();

      // 重试应该成功
      await expect(printer.retryPrintJob(job.id)).resolves.toBe(true);
    });
  });

  describe('性能和压力测试', () => {
    it('应该处理大量连续打印作业', async () => {
      await printer.initialize();

      const mockDevice = createMockBluetoothDevice();
      await printer.connect(mockDevice.deviceId);

      const printerConfig = createMockPrinterConfig();
      await printer.addPrinter(printerConfig);
      await printer.setCurrentPrinter(printerConfig.name);

      const jobCount = 100;
      const startTime = performance.now();

      // 创建并执行大量作业
      for (let i = 0; i < jobCount; i++) {
        const job = await printer.createPrintJob({
          text: `Performance Test Job ${i}`,
          index: i
        });

        await printer.executePrintJob(job.id);
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;
      const averageTime = totalTime / jobCount;

      // 平均每个作业应该在合理时间内完成
      expect(averageTime).toBeLessThan(100); // 小于100ms
    }, 30000); // 30秒超时

    it('应该在高频操作下保持稳定', async () => {
      await printer.initialize();

      const mockDevice = createMockBluetoothDevice();
      await printer.connect(mockDevice.deviceId);

      const printerConfig = createMockPrinterConfig();
      await printer.addPrinter(printerConfig);
      await printer.setCurrentPrinter(printerConfig.name);

      // 高频创建作业
      const createPromises = Array.from({ length: 50 }, (_, i) =>
        printer.createPrintJob({ text: `High Freq Job ${i}` })
      );

      const jobs = await Promise.all(createPromises);
      expect(jobs).toHaveLength(50);

      // 验证所有作业都有有效ID
      jobs.forEach(job => {
        expect(job.id).toBeDefined();
        expect(typeof job.id).toBe('string');
      });
    });
  });

  describe('内存和资源管理', () => {
    it('应该正确清理资源', async () => {
      await printer.initialize();

      const mockDevice = createMockBluetoothDevice();
      await printer.connect(mockDevice.deviceId);

      const printerConfig = createMockPrinterConfig();
      await printer.addPrinter(printerConfig);
      await printer.setCurrentPrinter(printerConfig.name);

      // 创建一些作业
      const jobs = await Promise.all(
        Array.from({ length: 10 }, (_, i) =>
          printer.createPrintJob({ text: `Cleanup Test ${i}` })
        )
      );

      // 销毁实例
      await printer.destroy();

      // 验证资源被正确清理
      expect(printer.getConnectionState()).toBe('disconnected');
      expect(printer.getPrinters()).toHaveLength(0);
      expect(printer.getJobs()).toHaveLength(0);
    });

    it('应该防止内存泄漏', async () => {
      await printer.initialize();

      const mockDevice = createMockBluetoothDevice();
      await printer.connect(mockDevice.deviceId);

      const printerConfig = createMockPrinterConfig();
      await printer.addPrinter(printerConfig);
      await printer.setCurrentPrinter(printerConfig.name);

      const initialMemory = process.memoryUsage().heapUsed;

      // 创建大量作业和事件监听器
      for (let i = 0; i < 1000; i++) {
        const job = await printer.createPrintJob({ text: `Memory Test ${i}` });
        await printer.executePrintJob(job.id);

        // 添加事件监听器
        const listener = () => {};
        printer.on('jobStatusChanged', listener);
        printer.off('jobStatusChanged', listener);
      }

      // 强制垃圾回收
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // 内存增长应该在合理范围内
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024); // 小于10MB
    });
  });
});