/**
 * BluetoothPrinter 集成测试
 * 测试各模块间的协作和完整的工作流程
 */

import { BluetoothPrinter, createBluetoothPrinter } from '../../src/BluetoothPrinter';
import {
  IBluetoothPrinterConfig,
  IDeviceInfo,
  IConnectionInfo,
  IPrintRequest,
  IPrintResult,
  ITemplateInfo,
  BluetoothPrinterEvent
} from '../../src/types';

// 集成测试配置
const INTEGRATION_TEST_CONFIG: Partial<IBluetoothPrinterConfig> = {
  bluetooth: {
    scanTimeout: 5000,
    connectionTimeout: 10000,
    autoReconnect: false,
    maxReconnectAttempts: 3,
    reconnectInterval: 1000
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
    maxSize: 50,
    concurrency: 1,
    retryAttempts: 2,
    retryDelay: 500,
    autoProcess: true,
    processInterval: 200
  },
  template: {
    enableCache: true,
    cacheSize: 20,
    cacheTimeout: 60000,
    enableValidation: true
  },
  logging: {
    level: 'debug',
    enableConsole: true,
    enableFile: false,
    maxFileSize: 1024 * 1024,
    maxFiles: 3
  },
  events: {
    enabled: true,
    maxListeners: 50,
    enableHistory: true,
    historySize: 100
  }
};

describe('BluetoothPrinter 集成测试', () => {
  let bluetoothPrinter: BluetoothPrinter;
  let capturedEvents: any[] = [];

  beforeEach(async () => {
    capturedEvents = [];
    bluetoothPrinter = createBluetoothPrinter(INTEGRATION_TEST_CONFIG);

    // 设置事件监听器来捕获所有事件
    const eventTypes: (keyof BluetoothPrinterEvent)[] = [
      'initialized',
      'configUpdated',
      'deviceDiscovered',
      'deviceConnected',
      'deviceDisconnected',
      'connectionFailed',
      'printerAdded',
      'printerRemoved',
      'printerStatusChanged',
      'jobQueued',
      'jobStarted',
      'jobCompleted',
      'jobFailed',
      'templateRegistered',
      'templateRendered',
      'templateError'
    ];

    eventTypes.forEach(eventType => {
      bluetoothPrinter.on(eventType, (...args: any[]) => {
        capturedEvents.push({
          type: eventType,
          timestamp: new Date(),
          args
        });
      });
    });
  });

  afterEach(async () => {
    if (bluetoothPrinter) {
      try {
        await bluetoothPrinter.dispose();
      } catch (error) {
        // 忽略销毁时的错误
      }
    }
  });

  describe('完整初始化流程', () => {
    it('应该能够完成完整的初始化流程', async () => {
      // 初始化前状态
      let status = bluetoothPrinter.getStatus();
      expect(status.initialized).toBe(false);

      // 执行初始化
      await bluetoothPrinter.initialize();

      // 验证初始化后状态
      status = bluetoothPrinter.getStatus();
      expect(status.initialized).toBe(true);

      // 验证事件触发
      const initEvents = capturedEvents.filter(e => e.type === 'initialized');
      expect(initEvents).toHaveLength(1);

      // 验证各模块状态
      expect(status.bluetooth.enabled).toBeDefined();
      expect(status.printers.total).toBeDefined();
      expect(status.queue.size).toBeDefined();
      expect(status.templates.total).toBeDefined();
    });

    it('初始化应该配置所有必要的组件', async () => {
      await bluetoothPrinter.initialize();

      const status = bluetoothPrinter.getStatus();

      // 验证配置生效
      const config = bluetoothPrinter.getConfig();
      expect(config.bluetooth.scanTimeout).toBe(5000);
      expect(config.queue.maxSize).toBe(50);
      expect(config.template.enableCache).toBe(true);
      expect(config.logging.level).toBe('debug');
      expect(config.events.enableHistory).toBe(true);
    });

    it('应该能够处理初始化过程中的错误', async () => {
      // 创建一个会导致错误的配置
      const invalidConfig = {
        ...INTEGRATION_TEST_CONFIG,
        bluetooth: {
          scanTimeout: -1000, // 无效值
          connectionTimeout: -1000,
          autoReconnect: false,
          maxReconnectAttempts: -1,
          reconnectInterval: -1000
        }
      };

      const errorPrinter = createBluetoothPrinter(invalidConfig);

      // 初始化应该仍然成功（错误处理在运行时进行）
      await expect(errorPrinter.initialize()).resolves.toBeUndefined();

      await errorPrinter.dispose();
    });
  });

  describe('设备管理集成流程', () => {
    beforeEach(async () => {
      await bluetoothPrinter.initialize();
    });

    it('应该能够完成设备扫描到连接的完整流程', async () => {
      // 清空事件记录
      capturedEvents = [];

      // 扫描设备
      const devices = await bluetoothPrinter.scanDevices(3000);
      expect(Array.isArray(devices)).toBe(true);

      // 如果没有设备，跳过连接测试
      if (devices.length === 0) {
        console.warn('No devices found for integration testing');
        return;
      }

      // 验证设备发现事件
      const discoveryEvents = capturedEvents.filter(e => e.type === 'deviceDiscovered');
      expect(discoveryEvents.length).toBeGreaterThanOrEqual(0);

      // 连接第一个可用设备
      const device = devices[0];
      const connection = await bluetoothPrinter.connectDevice(device.id);

      expect(connection).toBeDefined();
      expect(connection.deviceId).toBe(device.id);
      expect(connection.connected).toBe(true);

      // 验证连接事件
      const connectionEvents = capturedEvents.filter(e => e.type === 'deviceConnected');
      expect(connectionEvents.length).toBeGreaterThan(0);
      expect(connectionEvents[0].args[0].deviceId).toBe(device.id);

      // 验证已连接设备列表
      const connectedDevices = bluetoothPrinter.getConnectedDevices();
      expect(connectedDevices.length).toBeGreaterThan(0);
      expect(connectedDevices.some(d => d.deviceId === device.id)).toBe(true);

      // 断开连接
      await bluetoothPrinter.disconnectDevice(device.id);

      // 验证断开事件
      const disconnectionEvents = capturedEvents.filter(e => e.type === 'deviceDisconnected');
      expect(disconnectionEvents.length).toBeGreaterThan(0);
      expect(disconnectionEvents[0].args[0]).toBe(device.id);

      // 验证设备已从连接列表中移除
      const finalConnectedDevices = bluetoothPrinter.getConnectedDevices();
      expect(finalConnectedDevices.some(d => d.deviceId === device.id)).toBe(false);
    });

    it('应该能够处理设备连接失败的情况', async () => {
      // 尝试连接不存在的设备
      await expect(bluetoothPrinter.connectDevice('nonexistent-device-id'))
        .rejects.toThrow();

      // 验证错误事件
      const errorEvents = capturedEvents.filter(e => e.type === 'connectionFailed');
      expect(errorEvents.length).toBeGreaterThan(0);
    });

    it('应该能够管理多个设备连接', async () => {
      const devices = await bluetoothPrinter.scanDevices(3000);

      if (devices.length < 2) {
        console.warn('Not enough devices for multi-connection testing');
        return;
      }

      // 连接多个设备
      const connections: IConnectionInfo[] = [];
      for (let i = 0; i < Math.min(2, devices.length); i++) {
        try {
          const connection = await bluetoothPrinter.connectDevice(devices[i].id);
          connections.push(connection);
        } catch (error) {
          console.warn(`Failed to connect to device ${devices[i].id}:`, error);
        }
      }

      // 验证多个连接
      const connectedDevices = bluetoothPrinter.getConnectedDevices();
      expect(connectedDevices.length).toBeGreaterThanOrEqual(connections.length);

      // 断开所有连接
      for (const connection of connections) {
        await bluetoothPrinter.disconnectDevice(connection.deviceId);
      }

      expect(bluetoothPrinter.getConnectedDevices().length).toBe(0);
    });
  });

  describe('打印功能集成流程', () => {
    beforeEach(async () => {
      await bluetoothPrinter.initialize();
    });

    it('应该能够完成文本打印的完整流程', async () => {
      const testText = 'Hello, Integration Test!';

      // 执行打印
      const result = await bluetoothPrinter.printText(testText);

      expect(result.success).toBe(true);
      expect(result.jobId).toBeDefined();
      expect(result.printTime).toBeGreaterThan(0);

      // 验证队列事件
      const queuedEvents = capturedEvents.filter(e => e.type === 'jobQueued');
      const startedEvents = capturedEvents.filter(e => e.type === 'jobStarted');
      const completedEvents = capturedEvents.filter(e => e.type === 'jobCompleted');

      expect(queuedEvents.length).toBeGreaterThan(0);
      expect(startedEvents.length).toBeGreaterThan(0);
      expect(completedEvents.length).toBeGreaterThan(0);

      // 验证作业ID一致性
      expect(queuedEvents[0].args[0].id).toBe(result.jobId);
      expect(startedEvents[0].args[0].id).toBe(result.jobId);
      expect(completedEvents[0].args[0].id).toBe(result.jobId);
    });

    it('应该能够完成模板打印的完整流程', async () => {
      // 注册测试模板
      const template = {
        id: 'integration-test-template',
        name: 'Integration Test Template',
        type: 'receipt',
        description: 'Template for integration testing',
        content: 'Hello {{name}}!\nAmount: ${{amount}}\nDate: {{date}}',
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        version: '1.0.0',
        tags: ['test', 'integration']
      };

      await bluetoothPrinter.registerTemplate(template);

      // 验证模板注册事件
      const templateEvents = capturedEvents.filter(e => e.type === 'templateRegistered');
      expect(templateEvents.length).toBeGreaterThan(0);
      expect(templateEvents[0].args[0].id).toBe(template.id);

      // 执行模板打印
      const templateData = {
        name: 'Integration Test',
        amount: 99.99,
        date: new Date().toLocaleDateString()
      };

      const result = await bluetoothPrinter.printTemplate(template.id, templateData);

      expect(result.success).toBe(true);
      expect(result.jobId).toBeDefined();

      // 验证模板渲染事件
      const renderEvents = capturedEvents.filter(e => e.type === 'templateRendered');
      expect(renderEvents.length).toBeGreaterThan(0);
      expect(renderEvents[0].args[0].templateId).toBe(template.id);
    });

    it('应该能够完成批量打印的完整流程', async () => {
      const requests: IPrintRequest[] = [
        { type: 'text', content: 'First line' },
        { type: 'text', content: 'Second line' },
        { type: 'text', content: 'Third line' }
      ];

      const results = await bluetoothPrinter.printBatch(requests);

      expect(results).toHaveLength(3);
      results.forEach((result, index) => {
        expect(result.success).toBe(true);
        expect(result.jobId).toBeDefined();
      });

      // 验证队列事件
      const queuedEvents = capturedEvents.filter(e => e.type === 'jobQueued');
      const completedEvents = capturedEvents.filter(e => e.type === 'jobCompleted');

      expect(queuedEvents.length).toBe(3);
      expect(completedEvents.length).toBe(3);

      // 验证作业ID唯一性
      const jobIds = results.map(r => r.jobId);
      const uniqueJobIds = [...new Set(jobIds)];
      expect(uniqueJobIds).toHaveLength(3);
    });

    it('应该能够处理图片打印', async () => {
      // 创建简单的测试图片数据
      const imageData = new ArrayBuffer(1024);
      const view = new Uint8Array(imageData);
      for (let i = 0; i < view.length; i++) {
        view[i] = Math.floor(Math.random() * 256);
      }

      const result = await bluetoothPrinter.printImage(imageData);

      expect(result.success).toBe(true);
      expect(result.jobId).toBeDefined();
    });

    it('应该能够处理条形码和二维码打印', async () => {
      const barcodeResult = await bluetoothPrinter.printBarcode('123456789', 'CODE128');
      expect(barcodeResult.success).toBe(true);
      expect(barcodeResult.jobId).toBeDefined();

      const qrcodeResult = await bluetoothPrinter.printQRCode('https://example.com');
      expect(qrcodeResult.success).toBe(true);
      expect(qrcodeResult.jobId).toBeDefined();
    });
  });

  describe('队列管理集成流程', () => {
    beforeEach(async () => {
      await bluetoothPrinter.initialize();
    });

    it('应该能够管理打印队列的状态', async () => {
      // 初始状态
      let status = bluetoothPrinter.getQueueStatus();
      expect(status.size).toBe(0);
      expect(status.processing).toBe(0);
      expect(status.completed).toBe(0);
      expect(status.failed).toBe(0);
      expect(status.paused).toBe(false);

      // 添加打印任务
      const results = [];
      for (let i = 0; i < 5; i++) {
        const result = await bluetoothPrinter.printText(`Test line ${i + 1}`);
        results.push(result);
      }

      // 等待队列处理完成
      await new Promise(resolve => setTimeout(resolve, 2000));

      // 验证最终状态
      status = bluetoothPrinter.getQueueStatus();
      expect(status.size).toBe(0); // 所有任务应该完成
      expect(status.completed).toBe(5);

      // 验证所有任务成功
      results.forEach(result => {
        expect(result.success).toBe(true);
      });
    });

    it('应该能够暂停和恢复队列处理', async () => {
      // 暂停队列
      bluetoothPrinter.pauseQueue();
      let status = bluetoothPrinter.getQueueStatus();
      expect(status.paused).toBe(true);

      // 添加打印任务（应该暂停处理）
      const startTime = Date.now();
      const result = await bluetoothPrinter.printText('Paused queue test');
      const duration = Date.now() - startTime;

      // 验证任务在队列中（处理时间应该很短）
      expect(duration).toBeLessThan(500);

      // 恢复队列
      bluetoothPrinter.resumeQueue();
      status = bluetoothPrinter.getQueueStatus();
      expect(status.paused).toBe(false);

      // 等待任务完成
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 验证任务完成
      status = bluetoothPrinter.getQueueStatus();
      expect(status.size).toBe(0);
    });

    it('应该能够清空队列', async () => {
      // 暂停队列以便添加任务
      bluetoothPrinter.pauseQueue();

      // 添加多个任务
      const promises = [];
      for (let i = 0; i < 3; i++) {
        promises.push(bluetoothPrinter.printText(`Queue test ${i + 1}`));
      }

      await Promise.all(promises);

      // 验证队列中有任务
      let status = bluetoothPrinter.getQueueStatus();
      expect(status.size).toBeGreaterThan(0);

      // 清空队列
      bluetoothPrinter.clearQueue();

      // 验证队列已清空
      status = bluetoothPrinter.getQueueStatus();
      expect(status.size).toBe(0);

      // 恢复队列
      bluetoothPrinter.resumeQueue();
    });
  });

  describe('模板系统集成流程', () => {
    beforeEach(async () => {
      await bluetoothPrinter.initialize();
    });

    it('应该能够完成模板的完整生命周期', async () => {
      const template = {
        id: 'lifecycle-test-template',
        name: 'Lifecycle Test Template',
        type: 'receipt',
        description: 'Template for lifecycle testing',
        content: 'Name: {{name}}\nPrice: ${{price}}\nQty: {{quantity}}',
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        version: '1.0.0',
        tags: ['test', 'lifecycle']
      };

      // 1. 注册模板
      await bluetoothPrinter.registerTemplate(template);

      // 验证注册事件
      let registerEvents = capturedEvents.filter(e => e.type === 'templateRegistered');
      expect(registerEvents.length).toBeGreaterThan(0);

      // 2. 获取模板信息
      const templateInfo = bluetoothPrinter.getTemplate(template.id);
      expect(templateInfo).toBeDefined();
      expect(templateInfo!.id).toBe(template.id);
      expect(templateInfo!.name).toBe(template.name);

      // 3. 预览模板
      const previewData = {
        name: 'Test Product',
        price: 19.99,
        quantity: 2
      };

      const preview = await bluetoothPrinter.previewTemplate(template.id, previewData);
      expect(typeof preview).toBe('string');
      expect(preview).toContain('Test Product');

      // 4. 使用模板打印
      const printResult = await bluetoothPrinter.printTemplate(template.id, previewData);
      expect(printResult.success).toBe(true);

      // 验证渲染事件
      const renderEvents = capturedEvents.filter(e => e.type === 'templateRendered');
      expect(renderEvents.length).toBeGreaterThan(0);
      expect(renderEvents[0].args[0].templateId).toBe(template.id);

      // 5. 获取所有模板列表
      const allTemplates = bluetoothPrinter.getTemplates();
      expect(allTemplates.length).toBeGreaterThan(0);
      expect(allTemplates.some(t => t.id === template.id)).toBe(true);
    });

    it('应该能够处理多个模板', async () => {
      const templates = [
        {
          id: 'multi-test-1',
          name: 'Multi Test Template 1',
          type: 'receipt',
          description: 'First multi-test template',
          content: 'Template 1: {{data}}',
          enabled: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          version: '1.0.0',
          tags: ['test', 'multi']
        },
        {
          id: 'multi-test-2',
          name: 'Multi Test Template 2',
          type: 'label',
          description: 'Second multi-test template',
          content: 'Label: {{data}}',
          enabled: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          version: '1.0.0',
          tags: ['test', 'multi']
        }
      ];

      // 注册多个模板
      for (const template of templates) {
        await bluetoothPrinter.registerTemplate(template);
      }

      // 验证所有模板都已注册
      const allTemplates = bluetoothPrinter.getTemplates();
      expect(allTemplates.length).toBeGreaterThanOrEqual(2);

      // 使用不同模板打印
      for (const template of templates) {
        const result = await bluetoothPrinter.printTemplate(template.id, { data: `Test ${template.id}` });
        expect(result.success).toBe(true);
      }

      // 验证渲染事件
      const renderEvents = capturedEvents.filter(e => e.type === 'templateRendered');
      expect(renderEvents.length).toBeGreaterThanOrEqual(2);
    });

    it('应该能够处理模板错误', async () => {
      // 尝试预览不存在的模板
      await expect(bluetoothPrinter.previewTemplate('nonexistent-template', {}))
        .rejects.toThrow();

      // 验证错误事件
      const errorEvents = capturedEvents.filter(e => e.type === 'templateError');
      expect(errorEvents.length).toBeGreaterThan(0);
    });
  });

  describe('配置管理集成流程', () => {
    beforeEach(async () => {
      await bluetoothPrinter.initialize();
    });

    it('应该能够动态更新配置', async () => {
      // 获取初始配置
      const initialConfig = bluetoothPrinter.getConfig();
      expect(initialConfig.bluetooth.scanTimeout).toBe(5000);

      // 更新配置
      const updates = {
        bluetooth: {
          scanTimeout: 8000,
          connectionTimeout: 15000,
          autoReconnect: true,
          maxReconnectAttempts: 5,
          reconnectInterval: 3000
        }
      };

      bluetoothPrinter.updateConfig(updates);

      // 验证配置更新事件
      const configEvents = capturedEvents.filter(e => e.type === 'configUpdated');
      expect(configEvents.length).toBeGreaterThan(0);
      expect(configEvents[0].args[0]).toEqual(updates);

      // 验证配置已更新
      const updatedConfig = bluetoothPrinter.getConfig();
      expect(updatedConfig.bluetooth.scanTimeout).toBe(8000);
      expect(updatedConfig.bluetooth.autoReconnect).toBe(true);
    });

    it('配置更新应该影响后续操作', async () => {
      // 更新队列配置
      const queueUpdates = {
        queue: {
          maxSize: 20,
          concurrency: 2,
          retryAttempts: 1,
          retryDelay: 200,
          autoProcess: true,
          processInterval: 100
        }
      };

      bluetoothPrinter.updateConfig(queueUpdates);

      // 验证新配置生效
      const config = bluetoothPrinter.getConfig();
      expect(config.queue.maxSize).toBe(20);
      expect(config.queue.concurrency).toBe(2);
      expect(config.queue.retryAttempts).toBe(1);
    });
  });

  describe('事件系统集成流程', () => {
    beforeEach(async () => {
      await bluetoothPrinter.initialize();
    });

    it('应该能够捕获和处理所有类型的事件', async () => {
      // 清空事件记录
      capturedEvents = [];

      // 执行一系列操作来触发各种事件
      await bluetoothPrinter.scanDevices(2000);
      await bluetoothPrinter.printText('Event test');

      const template = {
        id: 'event-test-template',
        name: 'Event Test Template',
        type: 'receipt',
        description: 'Template for event testing',
        content: 'Event test: {{data}}',
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        version: '1.0.0',
        tags: ['test', 'event']
      };
      await bluetoothPrinter.registerTemplate(template);
      await bluetoothPrinter.printTemplate(template.id, { data: 'test' });

      // 等待事件处理完成
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 验证事件类型
      const eventTypes = capturedEvents.map(e => e.type);
      expect(eventTypes).toContain('jobQueued');
      expect(eventTypes).toContain('jobStarted');
      expect(eventTypes).toContain('jobCompleted');
      expect(eventTypes).toContain('templateRegistered');
      expect(eventTypes).toContain('templateRendered');

      // 验证事件时间戳
      capturedEvents.forEach(event => {
        expect(event.timestamp).toBeInstanceOf(Date);
      });
    });

    it('应该能够处理高频事件', async () => {
      // 清空事件记录
      capturedEvents = [];

      // 执行大量操作来触发高频事件
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(bluetoothPrinter.printText(`High frequency test ${i}`));
      }

      await Promise.all(promises);

      // 等待事件处理完成
      await new Promise(resolve => setTimeout(resolve, 2000));

      // 验证事件数量
      const jobEvents = capturedEvents.filter(e =>
        e.type === 'jobQueued' || e.type === 'jobStarted' || e.type === 'jobCompleted'
      );
      expect(jobEvents.length).toBeGreaterThanOrEqual(30); // 每个任务3个事件
    });
  });

  describe('完整工作流程集成测试', () => {
    it('应该能够完成从初始化到打印的完整工作流程', async () => {
      // 1. 初始化
      await bluetoothPrinter.initialize();
      let status = bluetoothPrinter.getStatus();
      expect(status.initialized).toBe(true);

      // 2. 扫描设备
      const devices = await bluetoothPrinter.scanDevices(3000);
      expect(Array.isArray(devices)).toBe(true);

      // 3. 注册模板
      const template = {
        id: 'workflow-test-template',
        name: 'Workflow Test Template',
        type: 'receipt',
        description: 'Template for workflow testing',
        content: '=== RECEIPT ===\nItem: {{item}}\nPrice: ${{price}}\nTime: {{time}}\n==============',
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        version: '1.0.0',
        tags: ['test', 'workflow']
      };
      await bluetoothPrinter.registerTemplate(template);

      // 4. 预览模板
      const previewData = {
        item: 'Test Product',
        price: 29.99,
        time: new Date().toLocaleTimeString()
      };
      const preview = await bluetoothPrinter.previewTemplate(template.id, previewData);
      expect(typeof preview).toBe('string');

      // 5. 打印文本
      const textResult = await bluetoothPrinter.printText('Simple text print');
      expect(textResult.success).toBe(true);

      // 6. 打印模板
      const templateResult = await bluetoothPrinter.printTemplate(template.id, previewData);
      expect(templateResult.success).toBe(true);

      // 7. 批量打印
      const batchRequests: IPrintRequest[] = [
        { type: 'text', content: 'Batch item 1' },
        { type: 'text', content: 'Batch item 2' },
        { type: 'qrcode', content: 'https://example.com/batch' }
      ];
      const batchResults = await bluetoothPrinter.printBatch(batchRequests);
      expect(batchResults.every(r => r.success)).toBe(true);

      // 8. 等待所有任务完成
      await new Promise(resolve => setTimeout(resolve, 3000));

      // 9. 验证最终状态
      status = bluetoothPrinter.getStatus();
      expect(status.initialized).toBe(true);
      expect(status.queue.size).toBe(0);
      expect(status.queue.completed).toBeGreaterThan(0);

      // 10. 验证事件历史
      const eventTypes = capturedEvents.map(e => e.type);
      expect(eventTypes).toContain('initialized');
      expect(eventTypes).toContain('templateRegistered');
      expect(eventTypes).toContain('templateRendered');
      expect(eventTypes).toContain('jobQueued');
      expect(eventTypes).toContain('jobStarted');
      expect(eventTypes).toContain('jobCompleted');

      console.log('完整工作流程测试成功，共处理事件:', capturedEvents.length);
    });

    it('应该能够处理错误恢复流程', async () => {
      await bluetoothPrinter.initialize();

      // 1. 触发设备连接错误
      try {
        await bluetoothPrinter.connectDevice('invalid-device-id');
      } catch (error) {
        // 预期的错误
      }

      // 2. 验证错误事件
      const errorEvents = capturedEvents.filter(e => e.type === 'connectionFailed');
      expect(errorEvents.length).toBeGreaterThan(0);

      // 3. 验证系统仍然可用
      const status = bluetoothPrinter.getStatus();
      expect(status.initialized).toBe(true);

      // 4. 验证后续操作正常
      const result = await bluetoothPrinter.printText('Recovery test');
      expect(result.success).toBe(true);

      console.log('错误恢复流程测试成功');
    });
  });

  describe('性能和稳定性集成测试', () => {
    it('应该能够处理长时间运行的会话', async () => {
      await bluetoothPrinter.initialize();

      const startTime = Date.now();
      const operationCount = 50;

      // 执行大量操作
      for (let i = 0; i < operationCount; i++) {
        await bluetoothPrinter.printText(`Stability test ${i + 1}`);

        // 每10次操作检查一次状态
        if (i % 10 === 0) {
          const status = bluetoothPrinter.getStatus();
          expect(status.initialized).toBe(true);
        }
      }

      const duration = Date.now() - startTime;
      const operationsPerSecond = operationCount / (duration / 1000);

      console.log(`稳定性测试完成: ${operationCount}次操作耗时${duration}ms, 速率: ${operationsPerSecond.toFixed(2)} ops/s`);

      // 验证性能要求
      expect(operationsPerSecond).toBeGreaterThan(5); // 至少每秒5次操作
    });

    it('应该能够处理内存压力', async () => {
      await bluetoothPrinter.initialize();

      // 创建大量数据来测试内存处理
      const largeText = 'x'.repeat(10000);
      const largeImageData = new ArrayBuffer(50000);

      // 执行多次大数据操作
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(bluetoothPrinter.printText(`${largeText} - Part ${i}`));
        promises.push(bluetoothPrinter.printImage(largeImageData));
      }

      const results = await Promise.all(promises);
      expect(results.every(r => r.success)).toBe(true);

      // 验证系统仍然稳定
      const status = bluetoothPrinter.getStatus();
      expect(status.initialized).toBe(true);

      console.log('内存压力测试完成');
    });
  });
});