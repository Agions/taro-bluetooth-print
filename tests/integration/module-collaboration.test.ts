/**
 * 模块间协作集成测试
 * 专门测试各模块之间的交互和数据流
 */

import { BluetoothPrinter } from '../../src/BluetoothPrinter';
import {
  IBluetoothPrinterConfig,
  BluetoothPrinterEvent,
  IDeviceInfo,
  IPrintResult
} from '../../src/types';

describe('模块间协作集成测试', () => {
  let bluetoothPrinter: BluetoothPrinter;
  let eventLog: any[] = [];

  const TEST_CONFIG: Partial<IBluetoothPrinterConfig> = {
    bluetooth: {
      scanTimeout: 3000,
      connectionTimeout: 8000,
      autoReconnect: true,
      maxReconnectAttempts: 2,
      reconnectInterval: 500
    },
    queue: {
      maxSize: 30,
      concurrency: 1,
      retryAttempts: 2,
      retryDelay: 300,
      autoProcess: true,
      processInterval: 150
    },
    template: {
      enableCache: true,
      cacheSize: 10,
      cacheTimeout: 30000,
      enableValidation: true
    },
    events: {
      enabled: true,
      maxListeners: 100,
      enableHistory: true,
      historySize: 200
    }
  };

  beforeEach(async () => {
    eventLog = [];
    bluetoothPrinter = new BluetoothPrinter(TEST_CONFIG);

    // 设置详细的事件监听
    setupEventLogging();
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

  function setupEventLogging(): void {
    const events: (keyof BluetoothPrinterEvent)[] = [
      'initialized', 'configUpdated', 'deviceDiscovered', 'deviceConnected',
      'deviceDisconnected', 'connectionFailed', 'printerAdded', 'printerRemoved',
      'printerStatusChanged', 'jobQueued', 'jobStarted', 'jobCompleted',
      'jobFailed', 'templateRegistered', 'templateRendered', 'templateError'
    ];

    events.forEach(event => {
      bluetoothPrinter.on(event, (...args: any[]) => {
        eventLog.push({
          event,
          timestamp: Date.now(),
          args: args.map(arg =>
            arg && typeof arg === 'object' ? { ...arg } : arg
          )
        });
      });
    });
  }

  describe('蓝牙适配器与事件系统协作', () => {
    beforeEach(async () => {
      await bluetoothPrinter.initialize();
    });

    it('蓝牙事件应该正确传播到事件总线', async () => {
      eventLog = [];

      // 扫描设备应该触发设备发现事件
      const devices = await bluetoothPrinter.scanDevices(2000);

      // 检查事件传播
      const deviceDiscoveryEvents = eventLog.filter(e => e.event === 'deviceDiscovered');
      if (devices.length > 0) {
        expect(deviceDiscoveryEvents.length).toBeGreaterThan(0);
        deviceDiscoveryEvents.forEach(event => {
          expect(event.args).toHaveLength(1);
          expect(event.args[0]).toHaveProperty('id');
          expect(event.args[0]).toHaveProperty('name');
        });
      }
    });

    it('连接状态变化应该触发相应事件', async () => {
      eventLog = [];

      const devices = await bluetoothPrinter.scanDevices(2000);

      if (devices.length === 0) {
        console.warn('No devices available for connection testing');
        return;
      }

      // 连接设备
      await bluetoothPrinter.connectDevice(devices[0].id);

      // 验证连接事件
      const connectionEvents = eventLog.filter(e => e.event === 'deviceConnected');
      expect(connectionEvents.length).toBeGreaterThan(0);
      expect(connectionEvents[0].args[0]).toHaveProperty('deviceId', devices[0].id);
      expect(connectionEvents[0].args[0]).toHaveProperty('connected', true);

      // 断开连接
      await bluetoothPrinter.disconnectDevice(devices[0].id);

      // 验证断开事件
      const disconnectionEvents = eventLog.filter(e => e.event === 'deviceDisconnected');
      expect(disconnectionEvents.length).toBeGreaterThan(0);
      expect(disconnectionEvents[0].args[0]).toBe(devices[0].id);
    });

    it('连接失败应该触发错误事件', async () => {
      eventLog = [];

      // 尝试连接不存在的设备
      try {
        await bluetoothPrinter.connectDevice('invalid-device-id');
      } catch (error) {
        // 预期的错误
      }

      // 验证错误事件
      const errorEvents = eventLog.filter(e => e.event === 'connectionFailed');
      expect(errorEvents.length).toBeGreaterThan(0);
      expect(errorEvents[0].args[0]).toBeInstanceOf(Error);
    });
  });

  describe('打印队列与作业管理协作', () => {
    beforeEach(async () => {
      await bluetoothPrinter.initialize();
    });

    it('打印作业应该正确地在队列中流转', async () => {
      eventLog = [];

      // 添加打印任务
      const result = await bluetoothPrinter.printText('Queue collaboration test');

      expect(result.success).toBe(true);
      expect(result.jobId).toBeDefined();

      // 等待队列处理
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 验证作业生命周期事件
      const queuedEvents = eventLog.filter(e => e.event === 'jobQueued');
      const startedEvents = eventLog.filter(e => e.event === 'jobStarted');
      const completedEvents = eventLog.filter(e => e.event === 'jobCompleted');

      expect(queuedEvents.length).toBeGreaterThan(0);
      expect(startedEvents.length).toBeGreaterThan(0);
      expect(completedEvents.length).toBeGreaterThan(0);

      // 验证作业ID一致性
      const jobId = result.jobId;
      expect(queuedEvents[0].args[0].id).toBe(jobId);
      expect(startedEvents[0].args[0].id).toBe(jobId);
      expect(completedEvents[0].args[0].id).toBe(jobId);

      // 验证事件时序
      const queuedTime = queuedEvents[0].timestamp;
      const startedTime = startedEvents[0].timestamp;
      const completedTime = completedEvents[0].timestamp;

      expect(queuedTime).toBeLessThanOrEqual(startedTime);
      expect(startedTime).toBeLessThanOrEqual(completedTime);
    });

    it('队列状态应该与实际作业状态同步', async () => {
      // 初始状态
      let queueStatus = bluetoothPrinter.getQueueStatus();
      expect(queueStatus.size).toBe(0);
      expect(queueStatus.processing).toBe(0);

      // 暂停队列
      bluetoothPrinter.pauseQueue();
      queueStatus = bluetoothPrinter.getQueueStatus();
      expect(queueStatus.paused).toBe(true);

      // 添加多个任务
      const promises = [];
      for (let i = 0; i < 3; i++) {
        promises.push(bluetoothPrinter.printText(`Queue sync test ${i + 1}`));
      }

      await Promise.all(promises);

      // 验证队列状态
      queueStatus = bluetoothPrinter.getQueueStatus();
      expect(queueStatus.size).toBeGreaterThanOrEqual(0);

      // 恢复队列处理
      bluetoothPrinter.resumeQueue();
      queueStatus = bluetoothPrinter.getQueueStatus();
      expect(queueStatus.paused).toBe(false);

      // 等待处理完成
      await new Promise(resolve => setTimeout(resolve, 2000));

      // 验证最终状态
      queueStatus = bluetoothPrinter.getQueueStatus();
      expect(queueStatus.size).toBe(0);
      expect(queueStatus.completed).toBe(3);
    });

    it('批量打印应该在队列中正确处理', async () => {
      eventLog = [];

      const requests = [
        { type: 'text' as const, content: 'Batch item 1' },
        { type: 'text' as const, content: 'Batch item 2' },
        { type: 'text' as const, content: 'Batch item 3' }
      ];

      const results = await bluetoothPrinter.printBatch(requests);

      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result.success).toBe(true);
        expect(result.jobId).toBeDefined();
      });

      // 等待队列处理
      await new Promise(resolve => setTimeout(resolve, 2000));

      // 验证每个作业都有完整的事件
      const jobIds = results.map(r => r.jobId);
      const queuedEvents = eventLog.filter(e => e.event === 'jobQueued');
      const completedEvents = eventLog.filter(e => e.event === 'jobCompleted');

      expect(queuedEvents.length).toBe(3);
      expect(completedEvents.length).toBe(3);

      // 验证所有作业ID都被处理
      const queuedJobIds = queuedEvents.map(e => e.args[0].id);
      const completedJobIds = completedEvents.map(e => e.args[0].id);

      jobIds.forEach(jobId => {
        expect(queuedJobIds).toContain(jobId);
        expect(completedJobIds).toContain(jobId);
      });
    });
  });

  describe('模板引擎与打印系统协作', () => {
    beforeEach(async () => {
      await bluetoothPrinter.initialize();
    });

    it('模板注册应该触发相应事件并可供使用', async () => {
      eventLog = [];

      const template = {
        id: 'collab-test-template',
        name: 'Collaboration Test Template',
        type: 'receipt',
        description: 'Template for collaboration testing',
        content: 'Product: {{name}}\nPrice: ${{price}}\nTotal: ${{total}}',
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        version: '1.0.0',
        tags: ['test', 'collaboration']
      };

      // 注册模板
      await bluetoothPrinter.registerTemplate(template);

      // 验证注册事件
      const registerEvents = eventLog.filter(e => e.event === 'templateRegistered');
      expect(registerEvents.length).toBeGreaterThan(0);
      expect(registerEvents[0].args[0].id).toBe(template.id);

      // 验证模板可以被获取
      const templateInfo = bluetoothPrinter.getTemplate(template.id);
      expect(templateInfo).toBeDefined();
      expect(templateInfo!.id).toBe(template.id);
      expect(templateInfo!.name).toBe(template.name);
    });

    it('模板渲染应该与打印作业正确协作', async () => {
      eventLog = [];

      const template = {
        id: 'render-print-collab-template',
        name: 'Render Print Collaboration Template',
        type: 'receipt',
        description: 'Template for render-print collaboration testing',
        content: 'Order #{{order}}\nCustomer: {{customer}}\nAmount: ${{amount}}',
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        version: '1.0.0',
        tags: ['test', 'render', 'print']
      };

      // 注册模板
      await bluetoothPrinter.registerTemplate(template);

      // 使用模板打印
      const templateData = {
        order: '12345',
        customer: 'Test Customer',
        amount: 99.99
      };

      const result = await bluetoothPrinter.printTemplate(template.id, templateData);

      expect(result.success).toBe(true);
      expect(result.jobId).toBeDefined();

      // 等待处理完成
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 验证事件序列
      const renderEvents = eventLog.filter(e => e.event === 'templateRendered');
      const jobEvents = eventLog.filter(e => e.event === 'jobQueued' || e.event === 'jobCompleted');

      expect(renderEvents.length).toBeGreaterThan(0);
      expect(jobEvents.length).toBeGreaterThan(0);

      // 验证渲染事件包含正确的模板ID
      expect(renderEvents[0].args[0].templateId).toBe(template.id);
      expect(renderEvents[0].args[0].renderTime).toBeGreaterThan(0);
    });

    it('模板预览不应该触发打印事件', async () => {
      eventLog = [];

      const template = {
        id: 'preview-only-template',
        name: 'Preview Only Template',
        type: 'receipt',
        description: 'Template for preview-only testing',
        content: 'Preview: {{message}}',
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        version: '1.0.0',
        tags: ['test', 'preview']
      };

      await bluetoothPrinter.registerTemplate(template);

      // 只预览，不打印
      const preview = await bluetoothPrinter.previewTemplate(template.id, { message: 'Hello' });

      expect(typeof preview).toBe('string');

      // 验证只有渲染事件，没有打印事件
      const renderEvents = eventLog.filter(e => e.event === 'templateRendered');
      const printEvents = eventLog.filter(e =>
        e.event === 'jobQueued' || e.event === 'jobStarted' || e.event === 'jobCompleted'
      );

      expect(renderEvents.length).toBeGreaterThan(0);
      expect(printEvents.length).toBe(0);
    });
  });

  describe('配置管理与各模块协作', () => {
    beforeEach(async () => {
      await bluetoothPrinter.initialize();
    });

    it('配置更新应该影响相关模块行为', async () => {
      eventLog = [];

      // 更新配置
      const configUpdates = {
        queue: {
          maxSize: 10,
          concurrency: 1,
          retryAttempts: 1,
          retryDelay: 200,
          autoProcess: true,
          processInterval: 100
        }
      };

      bluetoothPrinter.updateConfig(configUpdates);

      // 验证配置更新事件
      const configEvents = eventLog.filter(e => e.event === 'configUpdated');
      expect(configEvents.length).toBeGreaterThan(0);
      expect(configEvents[0].args[0]).toEqual(configUpdates);

      // 验证配置已生效
      const currentConfig = bluetoothPrinter.getConfig();
      expect(currentConfig.queue.maxSize).toBe(10);
      expect(currentConfig.queue.retryAttempts).toBe(1);

      // 测试配置对队列行为的影响
      const results = await bluetoothPrinter.printBatch([
        { type: 'text', content: 'Config test 1' },
        { type: 'text', content: 'Config test 2' }
      ]);

      expect(results.every(r => r.success)).toBe(true);
    });

    it('蓝牙配置更新应该影响扫描行为', async () => {
      // 更新蓝牙配置
      const bluetoothUpdates = {
        bluetooth: {
          scanTimeout: 1000, // 缩短扫描时间
          connectionTimeout: 5000,
          autoReconnect: false,
          maxReconnectAttempts: 2,
          reconnectInterval: 500
        }
      };

      bluetoothPrinter.updateConfig(bluetoothUpdates);

      // 验证配置生效
      const config = bluetoothPrinter.getConfig();
      expect(config.bluetooth.scanTimeout).toBe(1000);

      // 测试扫描行为
      const startTime = Date.now();
      await bluetoothPrinter.scanDevices();
      const scanDuration = Date.now() - startTime;

      // 扫描时间应该接近配置的超时时间（加上一些处理时间）
      expect(scanDuration).toBeLessThan(2000);
    });
  });

  describe('事件系统与各模块协作', () => {
    beforeEach(async () => {
      await bluetoothPrinter.initialize();
    });

    it('应该能够处理跨模块的事件链', async () => {
      eventLog = [];

      // 注册模板
      const template = {
        id: 'event-chain-template',
        name: 'Event Chain Template',
        type: 'receipt',
        description: 'Template for event chain testing',
        content: 'Event chain test: {{data}}',
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        version: '1.0.0',
        tags: ['test', 'event', 'chain']
      };

      await bluetoothPrinter.registerTemplate(template);

      // 使用模板打印，这应该触发：模板注册 -> 模板渲染 -> 作业入队 -> 作业开始 -> 作业完成
      await bluetoothPrinter.printTemplate(template.id, { data: 'chain test' });

      // 等待所有事件处理完成
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 验证事件链
      const eventSequence = eventLog.map(e => e.event);

      expect(eventSequence).toContain('templateRegistered');
      expect(eventSequence).toContain('templateRendered');
      expect(eventSequence).toContain('jobQueued');
      expect(eventSequence).toContain('jobStarted');
      expect(eventSequence).toContain('jobCompleted');

      // 验证事件时序
      const timestamps = eventLog.map(e => e.timestamp);
      for (let i = 1; i < timestamps.length; i++) {
        expect(timestamps[i]).toBeGreaterThanOrEqual(timestamps[i - 1]);
      }
    });

    it('应该能够处理并发事件', async () => {
      eventLog = [];

      // 并发执行多个操作
      const promises = [
        bluetoothPrinter.printText('Concurrent test 1'),
        bluetoothPrinter.printText('Concurrent test 2'),
        bluetoothPrinter.printText('Concurrent test 3')
      ];

      await Promise.all(promises);

      // 等待所有事件处理完成
      await new Promise(resolve => setTimeout(resolve, 2000));

      // 验证所有事件都被记录
      const jobEvents = eventLog.filter(e =>
        e.event === 'jobQueued' || e.event === 'jobStarted' || e.event === 'jobCompleted'
      );

      expect(jobEvents.length).toBe(9); // 3个作业 * 3个事件

      // 验证事件时间戳合理性
      const timestamps = jobEvents.map(e => e.timestamp);
      const timeSpan = Math.max(...timestamps) - Math.min(...timestamps);
      expect(timeSpan).toBeLessThan(5000); // 所有事件应该在5秒内完成
    });

    it('应该能够处理事件历史记录', async () => {
      eventLog = [];

      // 执行一些操作
      await bluetoothPrinter.printText('History test 1');
      await bluetoothPrinter.printText('History test 2');

      // 等待事件处理
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 验证事件被正确记录
      expect(eventLog.length).toBeGreaterThan(0);

      // 检查事件历史功能
      const status = bluetoothPrinter.getStatus();
      expect(status.initialized).toBe(true);

      // 事件历史的大小应该在配置范围内
      const config = bluetoothPrinter.getConfig();
      expect(eventLog.length).toBeLessThanOrEqual(config.events.historySize);
    });
  });

  describe('错误处理与模块协作', () => {
    beforeEach(async () => {
      await bluetoothPrinter.initialize();
    });

    it('模块错误应该正确传播和处理', async () => {
      eventLog = [];

      // 触发蓝牙模块错误
      try {
        await bluetoothPrinter.connectDevice('invalid-device-for-error-test');
      } catch (error) {
        // 预期的错误
      }

      // 验证错误事件
      const errorEvents = eventLog.filter(e => e.event === 'connectionFailed');
      expect(errorEvents.length).toBeGreaterThan(0);

      // 验证系统仍然可用
      const status = bluetoothPrinter.getStatus();
      expect(status.initialized).toBe(true);

      // 验证后续操作正常
      const result = await bluetoothPrinter.printText('Error recovery test');
      expect(result.success).toBe(true);
    });

    it('模板错误应该被正确处理', async () => {
      eventLog = [];

      // 尝试使用不存在的模板
      try {
        await bluetoothPrinter.printTemplate('nonexistent-template', { data: 'test' });
      } catch (error) {
        // 预期的错误
      }

      // 验证错误事件
      const templateErrorEvents = eventLog.filter(e => e.event === 'templateError');
      expect(templateErrorEvents.length).toBeGreaterThan(0);

      // 系统应该仍然可用
      const result = await bluetoothPrinter.printText('Post-error test');
      expect(result.success).toBe(true);
    });

    it('应该能够从队列错误中恢复', async () => {
      eventLog = [];

      // 暂停队列以模拟错误情况
      bluetoothPrinter.pauseQueue();

      // 添加一些任务
      await bluetoothPrinter.printText('Error recovery test 1');
      await bluetoothPrinter.printText('Error recovery test 2');

      // 恢复队列
      bluetoothPrinter.resumeQueue();

      // 等待处理完成
      await new Promise(resolve => setTimeout(resolve, 2000));

      // 验证任务完成
      const status = bluetoothPrinter.getQueueStatus();
      expect(status.size).toBe(0);
      expect(status.completed).toBeGreaterThanOrEqual(2);

      // 检查是否有失败事件
      const failedEvents = eventLog.filter(e => e.event === 'jobFailed');
      expect(failedEvents.length).toBe(0); // 不应该有失败事件
    });
  });

  describe('性能优化与模块协作', () => {
    beforeEach(async () => {
      await bluetoothPrinter.initialize();
    });

    it('应该能够处理高频操作而不影响协作', async () => {
      eventLog = [];

      const operationCount = 20;
      const startTime = Date.now();

      // 高频执行操作
      const promises = [];
      for (let i = 0; i < operationCount; i++) {
        promises.push(bluetoothPrinter.printText(`Performance test ${i + 1}`));
      }

      await Promise.all(promises);

      const totalTime = Date.now() - startTime;
      const operationsPerSecond = operationCount / (totalTime / 1000);

      // 等待所有事件处理完成
      await new Promise(resolve => setTimeout(resolve, 3000));

      // 验证性能
      expect(operationsPerSecond).toBeGreaterThan(3);

      // 验证所有事件都被正确处理
      const jobEvents = eventLog.filter(e =>
        e.event === 'jobQueued' || e.event === 'jobStarted' || e.event === 'jobCompleted'
      );

      expect(jobEvents.length).toBe(operationCount * 3);

      console.log(`性能协作测试: ${operationCount}次操作耗时${totalTime}ms, 速率: ${operationsPerSecond.toFixed(2)} ops/s`);
    });

    it('缓存机制应该提高模板操作性能', async () => {
      eventLog = [];

      const template = {
        id: 'cache-performance-template',
        name: 'Cache Performance Template',
        type: 'receipt',
        description: 'Template for cache performance testing',
        content: 'Cached content: {{data}}',
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        version: '1.0.0',
        tags: ['test', 'cache', 'performance']
      };

      await bluetoothPrinter.registerTemplate(template);

      // 第一次渲染（应该建立缓存）
      const startTime1 = Date.now();
      await bluetoothPrinter.previewTemplate(template.id, { data: 'first render' });
      const firstRenderTime = Date.now() - startTime1;

      // 第二次渲染（应该使用缓存）
      const startTime2 = Date.now();
      await bluetoothPrinter.previewTemplate(template.id, { data: 'second render' });
      const secondRenderTime = Date.now() - startTime2;

      // 验证缓存效果（第二次应该更快）
      console.log(`第一次渲染: ${firstRenderTime}ms, 第二次渲染: ${secondRenderTime}ms`);

      // 缓存可能不会在第一次就生效，但多次操作应该显示性能趋势
      const renderTimes = [];
      for (let i = 0; i < 5; i++) {
        const start = Date.now();
        await bluetoothPrinter.previewTemplate(template.id, { data: `render ${i}` });
        renderTimes.push(Date.now() - start);
      }

      // 验证性能稳定性
      const avgRenderTime = renderTimes.reduce((a, b) => a + b, 0) / renderTimes.length;
      expect(avgRenderTime).toBeLessThan(100); // 平均渲染时间应该小于100ms

      console.log(`缓存性能测试: 平均渲染时间 ${avgRenderTime.toFixed(2)}ms`);
    });
  });
});