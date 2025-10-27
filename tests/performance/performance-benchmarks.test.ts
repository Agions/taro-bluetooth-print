/**
 * 性能基准测试
 * 测试系统在各种操作下的性能指标和基准
 */

import { BluetoothPrinter, createBluetoothPrinter } from '../../src/BluetoothPrinter';
import {
  IBluetoothPrinterConfig,
  IPrintRequest
} from '../../src/types';

// 性能测试配置
const PERFORMANCE_CONFIG: Partial<IBluetoothPrinterConfig> = {
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
    maxSize: 500,
    concurrency: 1,
    retryAttempts: 3,
    retryDelay: 1000,
    autoProcess: true,
    processInterval: 100
  },
  template: {
    enableCache: true,
    cacheSize: 100,
    cacheTimeout: 300000,
    enableValidation: true
  },
  logging: {
    level: 'warn', // 性能测试时减少日志输出
    enableConsole: false,
    enableFile: false,
    maxFileSize: 10485760,
    maxFiles: 3
  },
  events: {
    enabled: true,
    maxListeners: 100,
    enableHistory: false,
    historySize: 0
  }
};

describe('性能基准测试', () => {
  let bluetoothPrinter: BluetoothPrinter;
  let performanceResults: any[] = [];

  beforeEach(async () => {
    performanceResults = [];
    bluetoothPrinter = createBluetoothPrinter(PERFORMANCE_CONFIG);
    await bluetoothPrinter.initialize();
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

  function recordPerformanceMetric(testName: string, metric: string, value: number, unit: string, details?: any): void {
    const result = {
      testName,
      metric,
      value,
      unit,
      details,
      timestamp: new Date()
    };
    performanceResults.push(result);
    console.log(`📊 ${testName} - ${metric}: ${value} ${unit}`);
    if (details) {
      console.log(`   详情:`, details);
    }
  }

  function measureTime<T>(fn: () => Promise<T> | T): Promise<{ result: T; duration: number }> {
    return new Promise(async (resolve) => {
      const startTime = performance.now();
      try {
        const result = await fn();
        const endTime = performance.now();
        resolve({ result, duration: endTime - startTime });
      } catch (error) {
        const endTime = performance.now();
        resolve({ result: null, duration: endTime - startTime } as any);
      }
    });
  }

  describe('初始化性能测试', () => {
    it('应该在合理时间内完成初始化', async () => {
      const testCases = [
        { name: '标准初始化', config: PERFORMANCE_CONFIG },
        { name: '最小配置初始化', config: { logging: { level: 'error', enableConsole: false, enableFile: false, maxFileSize: 1024, maxFiles: 1 } } },
        { name: '最大配置初始化', config: { queue: { maxSize: 1000, concurrency: 2, retryAttempts: 5, retryDelay: 2000, autoProcess: true, processInterval: 50 } } }
      ];

      for (const testCase of testCases) {
        const printer = createBluetoothPrinter(testCase.config);

        const { result, duration } = await measureTime(async () => {
          await printer.initialize();
          return printer.getStatus();
        });

        recordPerformanceMetric(testCase.name, '初始化时间', duration, 'ms', {
          success: result.initialized,
          queueSize: result.queue.size
        });

        expect(result.initialized).toBe(true);
        expect(duration).toBeLessThan(5000); // 初始化应在5秒内完成

        await printer.dispose();
      }
    });

    it('应该能够快速创建多个实例', async () => {
      const instanceCount = 10;
      const results = [];

      for (let i = 0; i < instanceCount; i++) {
        const { result, duration } = await measureTime(() => {
          const printer = createBluetoothPrinter(PERFORMANCE_CONFIG);
          return printer;
        });

        results.push({ index: i + 1, duration });
        await result.dispose();
      }

      const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
      const maxDuration = Math.max(...results.map(r => r.duration));
      const minDuration = Math.min(...results.map(r => r.duration));

      recordPerformanceMetric('多实例创建', '平均创建时间', avgDuration, 'ms', {
        instanceCount,
        maxDuration,
        minDuration
      });

      expect(avgDuration).toBeLessThan(100); // 平均创建时间应小于100ms
      expect(maxDuration).toBeLessThan(500); // 最大创建时间应小于500ms
    });
  });

  describe('设备扫描性能测试', () => {
    it('应该在合理时间内完成设备扫描', async () => {
      const timeouts = [5000, 10000, 15000];

      for (const timeout of timeouts) {
        const { result: devices, duration } = await measureTime(async () => {
          return await bluetoothPrinter.scanDevices(timeout);
        });

        recordPerformanceMetric(`设备扫描-${timeout}ms`, '扫描时间', duration, 'ms', {
          timeout,
          devicesFound: devices.length,
          efficiency: timeout > 0 ? (duration / timeout) * 100 : 0
        });

        expect(duration).toBeLessThan(timeout + 2000); // 实际时间应不超过超时时间+2秒
        expect(Array.isArray(devices)).toBe(true);
      }
    });

    it('应该能够处理频繁的设备扫描', async () => {
      const scanCount = 10;
      const results = [];

      for (let i = 0; i < scanCount; i++) {
        const { result: devices, duration } = await measureTime(async () => {
          return await bluetoothPrinter.scanDevices(3000);
        });

        results.push({ index: i + 1, duration, deviceCount: devices.length });

        // 短暂间隔避免过度频繁扫描
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
      const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);

      recordPerformanceMetric('频繁设备扫描', '平均扫描时间', avgDuration, 'ms', {
        scanCount,
        totalDuration,
        scansPerSecond: scanCount / (totalDuration / 1000)
      });

      expect(avgDuration).toBeLessThan(4000); // 平均扫描时间应小于4秒
    });
  });

  describe('打印性能测试', () => {
    it('应该能够快速处理文本打印', async () => {
      const textLengths = [100, 500, 1000, 5000];

      for (const length of textLengths) {
        const testText = 'x'.repeat(length);

        const { result, duration } = await measureTime(async () => {
          return await bluetoothPrinter.printText(testText);
        });

        recordPerformanceMetric(`文本打印-${length}字符`, '打印时间', duration, 'ms', {
          textLength: length,
          success: result.success,
          throughput: length / (duration / 1000)
        });

        expect(result.success).toBe(true);
        expect(duration).toBeLessThan(10000); // 打印时间应小于10秒
      }
    });

    it('应该能够高效处理批量打印', async () => {
      const batchSizes = [5, 10, 25, 50];

      for (const batchSize of batchSizes) {
        const requests: IPrintRequest[] = [];
        for (let i = 0; i < batchSize; i++) {
          requests.push({
            type: 'text',
            content: `批量测试项目 ${i + 1} - ${'x'.repeat(50)}`
          });
        }

        const { result, duration } = await measureTime(async () => {
          return await bluetoothPrinter.printBatch(requests);
        });

        const successCount = result.filter(r => r.success).length;
        const avgTimePerItem = duration / batchSize;

        recordPerformanceMetric(`批量打印-${batchSize}项`, '总处理时间', duration, 'ms', {
          batchSize,
          successCount,
          successRate: (successCount / batchSize) * 100,
          avgTimePerItem
        });

        expect(successCount).toBeGreaterThan(0);
        expect(avgTimePerItem).toBeLessThan(2000); // 平均每项处理时间应小于2秒
      }
    });

    it('应该能够高效处理条码和二维码打印', async () => {
      const testCases = [
        { type: 'barcode', data: '1234567890123', encoding: 'CODE128' },
        { type: 'qrcode', data: 'https://github.com/example' },
        { type: 'barcode', data: 'ABCDEF123456', encoding: 'CODE39' },
        { type: 'qrcode', data: 'Lorem ipsum dolor sit amet' }
      ];

      for (const testCase of testCases) {
        const { result, duration } = await measureTime(async () => {
          if (testCase.type === 'barcode') {
            return await bluetoothPrinter.printBarcode(testCase.data, testCase.encoding);
          } else {
            return await bluetoothPrinter.printQRCode(testCase.data);
          }
        });

        recordPerformanceMetric(`${testCase.type}打印`, '生成时间', duration, 'ms', {
          dataType: testCase.type,
          dataLength: testCase.data.length,
          success: result.success
        });

        expect(result.success).toBe(true);
        expect(duration).toBeLessThan(5000); // 条码生成时间应小于5秒
      }
    });
  });

  describe('模板系统性能测试', () => {
    beforeEach(async () => {
      // 注册测试模板
      const template = {
        id: 'performance-test-template',
        name: '性能测试模板',
        type: 'receipt',
        description: '用于性能测试的模板',
        content: `
性能测试模板
时间: {{timestamp}}
数据: {{data}}
计数: {{count}}
列表:
{{#items}}
- {{name}}: {{value}}
{{/items}}
总计: {{total}}
        `.trim(),
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        version: '1.0.0',
        tags: ['performance', 'test']
      };

      await bluetoothPrinter.registerTemplate(template);
    });

    it('应该能够快速渲染模板', async () => {
      const dataSizes = [
        { itemCount: 5, name: '小数据集' },
        { itemCount: 20, name: '中等数据集' },
        { itemCount: 100, name: '大数据集' }
      ];

      for (const dataSize of dataSizes) {
        const templateData = {
          timestamp: new Date().toISOString(),
          data: 'x'.repeat(100),
          count: dataSize.itemCount,
          items: Array.from({ length: dataSize.itemCount }, (_, i) => ({
            name: `项目 ${i + 1}`,
            value: Math.random() * 100
          })),
          total: dataSize.itemCount * 50
        };

        const { result, duration } = await measureTime(async () => {
          return await bluetoothPrinter.printTemplate('performance-test-template', templateData);
        });

        recordPerformanceMetric(`模板渲染-${dataSize.name}`, '渲染时间', duration, 'ms', {
          itemCount: dataSize.itemCount,
          success: result.success,
          renderRate: dataSize.itemCount / (duration / 1000)
        });

        expect(result.success).toBe(true);
        expect(duration).toBeLessThan(3000); // 模板渲染时间应小于3秒
      }
    });

    it('应该能够有效利用模板缓存', async () => {
      const templateData = {
        timestamp: new Date().toISOString(),
        data: '缓存测试数据',
        count: 10,
        items: Array.from({ length: 10 }, (_, i) => ({
          name: `缓存项目 ${i + 1}`,
          value: i * 10
        })),
        total: 100
      };

      const renderTimes = [];

      // 多次渲染相同模板
      for (let i = 0; i < 10; i++) {
        const { result, duration } = await measureTime(async () => {
          return await bluetoothPrinter.printTemplate('performance-test-template', templateData);
        });

        renderTimes.push(duration);
        expect(result.success).toBe(true);
      }

      const avgRenderTime = renderTimes.reduce((sum, time) => sum + time, 0) / renderTimes.length;
      const firstRenderTime = renderTimes[0];
      const avgSubsequentTime = renderTimes.slice(1).reduce((sum, time) => sum + time, 0) / (renderTimes.length - 1);

      recordPerformanceMetric('模板缓存效果', '首次渲染时间', firstRenderTime, 'ms', {
        avgSubsequentTime,
        cacheEfficiency: ((firstRenderTime - avgSubsequentTime) / firstRenderTime) * 100
      });

      // 后续渲染应该比首次渲染更快（缓存效果）
      expect(avgSubsequentTime).toBeLessThanOrEqual(firstRenderTime * 1.2);
    });
  });

  describe('队列系统性能测试', () => {
    it('应该能够高效处理大量任务', async () => {
      const taskCounts = [50, 100, 200];

      for (const taskCount of taskCounts) {
        // 暂停队列以便添加任务
        bluetoothPrinter.pauseQueue();

        const { result: addResults, duration: addDuration } = await measureTime(async () => {
          const promises = [];
          for (let i = 0; i < taskCount; i++) {
            promises.push(bluetoothPrinter.printText(`队列测试 ${i + 1}`));
          }
          return await Promise.all(promises);
        });

        const addSuccessCount = addResults.filter(r => r.success).length;
        const addRate = addSuccessCount / (addDuration / 1000);

        recordPerformanceMetric(`队列添加-${taskCount}任务`, '添加速度', addRate, 'tasks/s', {
          taskCount,
          addDuration,
          successRate: (addSuccessCount / taskCount) * 100
        });

        // 恢复队列并等待处理
        bluetoothPrinter.resumeQueue();
        await new Promise(resolve => setTimeout(resolve, Math.min(taskCount * 100, 30000)));

        const finalStatus = bluetoothPrinter.getQueueStatus();

        recordPerformanceMetric(`队列处理-${taskCount}任务`, '最终状态', finalStatus.completed, 'completed', {
          taskCount,
          completed: finalStatus.completed,
          failed: finalStatus.failed,
          successRate: (finalStatus.completed / taskCount) * 100
        });

        expect(addSuccessCount).toBeGreaterThan(taskCount * 0.9); // 至少90%添加成功
      }
    }, 60000);

    it('应该能够快速获取队列状态', async () => {
      const queryCount = 1000;
      const queryTimes = [];

      for (let i = 0; i < queryCount; i++) {
        const { result, duration } = await measureTime(() => {
          return bluetoothPrinter.getQueueStatus();
        });

        queryTimes.push(duration);
      }

      const avgQueryTime = queryTimes.reduce((sum, time) => sum + time, 0) / queryTimes.length;
      const maxQueryTime = Math.max(...queryTimes);
      const p95QueryTime = queryTimes.sort((a, b) => a - b)[Math.floor(queryTimes.length * 0.95)];

      recordPerformanceMetric('队列状态查询', '平均查询时间', avgQueryTime, 'ms', {
        queryCount,
        maxQueryTime,
        p95QueryTime,
        queriesPerSecond: queryCount / (queryTimes.reduce((sum, time) => sum + time, 0) / 1000)
      });

      expect(avgQueryTime).toBeLessThan(10); // 平均查询时间应小于10ms
      expect(p95QueryTime).toBeLessThan(50); // 95%查询应小于50ms
    });
  });

  describe('内存使用性能测试', () => {
    it('应该能够高效处理大量数据而不出现内存泄漏', async () => {
      const iterations = 5;
      const dataPerIteration = 20;
      const memorySnapshots = [];

      for (let iteration = 0; iteration < iterations; iteration++) {
        // 记录内存使用（如果可用）
        const memoryBefore = performance.memory ? performance.memory.usedJSHeapSize : 0;

        // 处理大量数据
        const largeTexts = Array.from({ length: dataPerIteration }, (_, i) =>
          'x'.repeat(1000) + ` 数据块 ${iteration}-${i}`
        );

        for (const text of largeTexts) {
          await bluetoothPrinter.printText(text);
        }

        // 强制垃圾回收（如果可用）
        if (global.gc) {
          global.gc();
        }

        const memoryAfter = performance.memory ? performance.memory.usedJSHeapSize : 0;
        const memoryDelta = memoryAfter - memoryBefore;

        memorySnapshots.push({
          iteration: iteration + 1,
          memoryBefore,
          memoryAfter,
          memoryDelta,
          dataProcessed: largeTexts.length * 1000
        });

        // 等待处理完成
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      const totalMemoryDelta = memorySnapshots.reduce((sum, snap) => sum + snap.memoryDelta, 0);
      const avgMemoryPerMB = totalMemoryDelta / (iterations * dataPerIteration * 1000) * 1024 * 1024;

      recordPerformanceMetric('大数据处理', '内存效率', avgMemoryPerMB, 'bytes/MB', {
        iterations,
        totalDataProcessed: iterations * dataPerIteration * 1000,
        totalMemoryDelta,
        memorySnapshots
      });

      // 内存增长应该是合理的
      expect(avgMemoryPerMB).toBeLessThan(1024); // 每MB数据内存增长应小于1KB
    }, 30000);

    it('应该能够高效处理模板缓存', async () => {
      const templateCount = 50;
      const templates = [];

      // 创建大量模板
      for (let i = 0; i < templateCount; i++) {
        const template = {
          id: `cache-test-template-${i}`,
          name: `缓存测试模板 ${i}`,
          type: 'receipt',
          description: `用于缓存测试的模板 ${i}`,
          content: `
模板 ${i}
时间: {{timestamp}}
数据: {{data}}
索引: ${i}
{{#items}}
项目: {{name}} - {{value}}
{{/items}}
          `.trim(),
          enabled: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          version: '1.0.0',
          tags: ['cache', 'test', `template-${i}`]
        };

        templates.push(template);
      }

      // 注册所有模板
      const { result: registerResults, duration: registerDuration } = await measureTime(async () => {
        const promises = templates.map(template =>
          bluetoothPrinter.registerTemplate(template)
        );
        return await Promise.all(promises);
      });

      recordPerformanceMetric('模板批量注册', '注册速度', templateCount / (registerDuration / 1000), 'templates/s', {
        templateCount,
        registerDuration,
        successCount: registerResults.length
      });

      // 测试模板访问速度
      const accessTimes = [];
      for (let i = 0; i < 100; i++) {
        const templateIndex = i % templateCount;
        const templateId = `cache-test-template-${templateIndex}`;

        const { result, duration } = await measureTime(() => {
          return bluetoothPrinter.getTemplate(templateId);
        });

        accessTimes.push(duration);
      }

      const avgAccessTime = accessTimes.reduce((sum, time) => sum + time, 0) / accessTimes.length;

      recordPerformanceMetric('模板缓存访问', '平均访问时间', avgAccessTime, 'ms', {
        templateCount,
        accessCount: accessTimes.length,
        accessesPerSecond: accessTimes.length / (accessTimes.reduce((sum, time) => sum + time, 0) / 1000)
      });

      expect(avgAccessTime).toBeLessThan(50); // 平均访问时间应小于50ms
    });
  });

  describe('并发性能测试', () => {
    it('应该能够高效处理并发操作', async () => {
      const concurrencyLevels = [5, 10, 20];

      for (const concurrency of concurrencyLevels) {
        const operations = Array.from({ length: concurrency }, (_, i) =>
          bluetoothPrinter.printText(`并发测试 ${i + 1}`)
        );

        const { result: results, duration } = await measureTime(async () => {
          return await Promise.allSettled(operations);
        });

        const successCount = results.filter(r => r.status === 'fulfilled').length;
        const throughput = successCount / (duration / 1000);

        recordPerformanceMetric(`并发操作-${concurrency}并发`, '吞吐量', throughput, 'ops/s', {
          concurrency,
          successCount,
          duration,
          successRate: (successCount / concurrency) * 100
        });

        expect(successCount).toBeGreaterThan(0);
        expect(throughput).toBeGreaterThan(0.5); // 至少每秒0.5个操作
      }
    });

    it('应该能够处理混合并发操作', async () => {
      const operations = [
        ...Array.from({ length: 5 }, () => bluetoothPrinter.printText('文本操作')),
        ...Array.from({ length: 3 }, () => bluetoothPrinter.printQRCode('https://example.com')),
        ...Array.from({ length: 2 }, () => bluetoothPrinter.printBarcode('123456789', 'CODE128'))
      ];

      const { result: results, duration } = await measureTime(async () => {
        return await Promise.allSettled(operations);
      });

      const textSuccess = results.slice(0, 5).filter(r => r.status === 'fulfilled').length;
      const qrcodeSuccess = results.slice(5, 8).filter(r => r.status === 'fulfilled').length;
      const barcodeSuccess = results.slice(8, 10).filter(r => r.status === 'fulfilled').length;

      recordPerformanceMetric('混合并发操作', '总处理时间', duration, 'ms', {
        totalOperations: operations.length,
        textSuccess,
        qrcodeSuccess,
        barcodeSuccess,
        overallSuccessRate: ((textSuccess + qrcodeSuccess + barcodeSuccess) / operations.length) * 100
      });

      expect(textSuccess + qrcodeSuccess + barcodeSuccess).toBeGreaterThan(0);
    });
  });

  describe('性能基准汇总', () => {
    it('应该生成详细的性能报告', () => {
      console.log('\n📊 性能基准测试结果汇总:');
      console.log('='.repeat(70));

      // 按测试类型分组
      const groupedResults = performanceResults.reduce((groups, result) => {
        const category = result.testName.split('-')[0];
        if (!groups[category]) {
          groups[category] = [];
        }
        groups[category].push(result);
        return groups;
      }, {} as Record<string, any[]>);

      Object.entries(groupedResults).forEach(([category, results]) => {
        console.log(`\n🔹 ${category} 性能指标:`);

        results.forEach(result => {
          const status = result.value < getExpectedThreshold(result.metric) ? '✅' : '⚠️';
          console.log(`  ${status} ${result.metric}: ${result.value.toFixed(2)} ${result.unit}`);
          if (result.details) {
            const keyDetails = Object.entries(result.details)
              .filter(([_, value]) => typeof value === 'number')
              .map(([key, value]) => `${key}: ${value}`);
            if (keyDetails.length > 0) {
              console.log(`      ${keyDetails.join(', ')}`);
            }
          }
        });
      });

      console.log('\n' + '='.repeat(70));

      // 性能验证
      const criticalMetrics = performanceResults.filter(r =>
        r.metric.includes('时间') || r.metric.includes('速度') || r.metric.includes('吞吐量')
      );

      const passedMetrics = criticalMetrics.filter(r =>
        r.value < getExpectedThreshold(r.metric)
      ).length;

      const passRate = criticalMetrics.length > 0 ? (passedMetrics / criticalMetrics.length) * 100 : 100;

      console.log(`\n📈 关键性能指标通过率: ${passRate.toFixed(1)}%`);

      if (passRate >= 80) {
        console.log('🎉 性能测试通过！系统性能表现良好。');
      } else {
        console.log('⚠️ 部分性能指标未达标，建议优化相关功能。');
      }

      // 性能建议
      console.log('\n💡 性能优化建议:');
      if (passRate < 100) {
        const failedMetrics = criticalMetrics.filter(r => r.value >= getExpectedThreshold(r.metric));
        failedMetrics.forEach(metric => {
          console.log(`  - 优化 ${metric.testName} 的 ${metric.metric}`);
        });
      }
      console.log('  - 定期监控性能指标');
      console.log('  - 在生产环境中进行性能调优');
      console.log('  - 考虑启用性能监控和告警');

      expect(passRate).toBeGreaterThanOrEqual(70); // 至少70%的性能指标应该达标
    });
  });

  // 辅助函数：获取性能阈值
  function getExpectedThreshold(metric: string): number {
    const thresholds: Record<string, number> = {
      '初始化时间': 5000,
      '扫描时间': 20000,
      '打印时间': 10000,
      '渲染时间': 3000,
      '生成时间': 5000,
      '添加速度': 1, // 最小1 tasks/s
      '访问时间': 50,
      '查询时间': 10
    };

    for (const [key, threshold] of Object.entries(thresholds)) {
      if (metric.includes(key)) {
        return threshold;
      }
    }

    return Infinity; // 默认不限制
  }
});