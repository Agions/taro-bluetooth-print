/**
 * 负载测试
 * 测试系统在高负载下的表现和稳定性
 */

import { BluetoothPrinter, createBluetoothPrinter } from '../../src/BluetoothPrinter';
import {
  IBluetoothPrinterConfig,
  IPrintRequest
} from '../../src/types';

// 负载测试配置
const LOAD_TEST_CONFIG: Partial<IBluetoothPrinterConfig> = {
  bluetooth: {
    scanTimeout: 8000,
    connectionTimeout: 12000,
    autoReconnect: true,
    maxReconnectAttempts: 2,
    reconnectInterval: 1500
  },
  printer: {
    density: 8,
    speed: 3, // 负载测试时使用较慢速度
    paperWidth: 58,
    autoCut: false,
    charset: 'PC437',
    align: 'left'
  },
  queue: {
    maxSize: 1000,
    concurrency: 1,
    retryAttempts: 2,
    retryDelay: 800,
    autoProcess: true,
    processInterval: 200
  },
  template: {
    enableCache: true,
    cacheSize: 200,
    cacheTimeout: 600000,
    enableValidation: true
  },
  logging: {
    level: 'error', // 负载测试时只记录错误
    enableConsole: false,
    enableFile: false,
    maxFileSize: 1048576,
    maxFiles: 2
  },
  events: {
    enabled: true,
    maxListeners: 50,
    enableHistory: false,
    historySize: 0
  }
};

describe('负载测试', () => {
  let bluetoothPrinter: BluetoothPrinter;
  let loadTestResults: any[] = [];

  beforeEach(async () => {
    loadTestResults = [];
    bluetoothPrinter = createBluetoothPrinter(LOAD_TEST_CONFIG);
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

  function recordLoadTestResult(testName: string, success: boolean, metrics: any): void {
    const result = {
      testName,
      success,
      metrics,
      timestamp: new Date()
    };
    loadTestResults.push(result);

    const status = success ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} ${testName}`);
    console.log(`   📊 成功率: ${(metrics.successRate * 100).toFixed(1)}%`);
    console.log(`   ⚡ 吞吐量: ${metrics.throughput.toFixed(2)} ops/s`);
    console.log(`   ⏱️  平均响应时间: ${metrics.avgResponseTime.toFixed(1)}ms`);
    if (metrics.peakMemoryUsage) {
      console.log(`   💾 峰值内存使用: ${(metrics.peakMemoryUsage / 1024 / 1024).toFixed(1)}MB`);
    }
  }

  class LoadTestMonitor {
    private startTime: number;
    private endTime: number;
    private responseTimes: number[] = [];
    private successCount: number = 0;
    private errorCount: number = 0;
    private memorySnapshots: number[] = [];

    constructor() {
      this.startTime = performance.now();
      this.startMemoryMonitoring();
    }

    recordResponse(duration: number, success: boolean): void {
      this.responseTimes.push(duration);
      if (success) {
        this.successCount++;
      } else {
        this.errorCount++;
      }
    }

    complete(): any {
      this.endTime = performance.now();
      this.stopMemoryMonitoring();

      const totalDuration = this.endTime - this.startTime;
      const totalOperations = this.successCount + this.errorCount;

      return {
        totalDuration,
        totalOperations,
        successCount: this.successCount,
        errorCount: this.errorCount,
        successRate: totalOperations > 0 ? this.successCount / totalOperations : 0,
        throughput: totalOperations / (totalDuration / 1000),
        avgResponseTime: this.responseTimes.length > 0
          ? this.responseTimes.reduce((sum, time) => sum + time, 0) / this.responseTimes.length
          : 0,
        p95ResponseTime: this.responseTimes.length > 0
          ? this.responseTimes.sort((a, b) => a - b)[Math.floor(this.responseTimes.length * 0.95)]
          : 0,
        peakMemoryUsage: this.memorySnapshots.length > 0 ? Math.max(...this.memorySnapshots) : 0
      };
    }

    private startMemoryMonitoring(): void {
      const interval = setInterval(() => {
        if (performance.memory) {
          this.memorySnapshots.push(performance.memory.usedJSHeapSize);
        }
      }, 500);

      (this as any).memoryInterval = interval;
    }

    private stopMemoryMonitoring(): void {
      if ((this as any).memoryInterval) {
        clearInterval((this as any).memoryInterval);
      }
    }
  }

  describe('高负载打印测试', () => {
    it('应该能够处理大量并发打印任务', async () => {
      const monitor = new LoadTestMonitor();
      const concurrency = 50;
      const tasksPerWorker = 10;

      try {
        const workers = Array.from({ length: concurrency }, async (_, workerIndex) => {
          const workerResults = [];

          for (let taskIndex = 0; taskIndex < tasksPerWorker; taskIndex++) {
            const taskStart = performance.now();
            let success = false;

            try {
              const content = `负载测试 - Worker ${workerIndex + 1} - Task ${taskIndex + 1} - ${'x'.repeat(100)}`;
              const result = await bluetoothPrinter.printText(content);
              success = result.success;
            } catch (error) {
              success = false;
            }

            const taskDuration = performance.now() - taskStart;
            monitor.recordResponse(taskDuration, success);
            workerResults.push({ success, duration: taskDuration });

            // 短暂间隔避免过度负载
            await new Promise(resolve => setTimeout(resolve, 50));
          }

          return workerResults;
        });

        await Promise.all(workers);

        const metrics = monitor.complete();
        recordLoadTestResult('高负载并发打印', metrics.successRate > 0.9, metrics);

        expect(metrics.successRate).toBeGreaterThan(0.8); // 至少80%成功率
        expect(metrics.throughput).toBeGreaterThan(5); // 至少5 ops/s
        expect(metrics.avgResponseTime).toBeLessThan(5000); // 平均响应时间小于5秒

      } catch (error) {
        const metrics = monitor.complete();
        recordLoadTestResult('高负载并发打印', false, { ...metrics, error: error.message });
        throw error;
      }
    }, 120000);

    it('应该能够处理长时间持续负载', async () => {
      const monitor = new LoadTestMonitor();
      const duration = 60000; // 1分钟
      const targetThroughput = 2; // 每秒2个操作

      try {
        const startTime = Date.now();
        let taskCount = 0;

        while (Date.now() - startTime < duration) {
          const taskStart = performance.now();
          let success = false;

          try {
            const content = `持续负载测试 #${++taskCount} - ${new Date().toISOString()}`;
            const result = await bluetoothPrinter.printText(content);
            success = result.success;
          } catch (error) {
            success = false;
          }

          const taskDuration = performance.now() - taskStart;
          monitor.recordResponse(taskDuration, success);

          // 控制吞吐量
          const expectedInterval = 1000 / targetThroughput;
          const actualInterval = Math.max(0, expectedInterval - taskDuration);
          if (actualInterval > 0) {
            await new Promise(resolve => setTimeout(resolve, actualInterval));
          }
        }

        const metrics = monitor.complete();
        recordLoadTestResult('长时间持续负载', metrics.successRate > 0.85, metrics);

        expect(metrics.successRate).toBeGreaterThan(0.7); // 至少70%成功率
        expect(metrics.throughput).toBeGreaterThan(targetThroughput * 0.5); // 至少达到目标的50%

      } catch (error) {
        const metrics = monitor.complete();
        recordLoadTestResult('长时间持续负载', false, { ...metrics, error: error.message });
        throw error;
      }
    }, 90000);
  });

  describe('批量操作负载测试', () => {
    it('应该能够处理大规模批量打印', async () => {
      const monitor = new LoadTestMonitor();
      const batchSizes = [25, 50, 100, 200];

      try {
        for (const batchSize of batchSizes) {
          const batchStart = performance.now();

          const requests: IPrintRequest[] = Array.from({ length: batchSize }, (_, i) => ({
            type: 'text',
            content: `批量负载测试 ${i + 1} - ${'x'.repeat(50)}`
          }));

          const results = await bluetoothPrinter.printBatch(requests);
          const batchDuration = performance.now() - batchStart;

          const successCount = results.filter(r => r.success).length;
          const batchSuccessRate = successCount / batchSize;

          monitor.recordResponse(batchDuration, batchSuccessRate > 0.8);

          // 短暂间隔
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

        const metrics = monitor.complete();
        recordLoadTestResult('大规模批量打印', metrics.successRate > 0.8, metrics);

        expect(metrics.successRate).toBeGreaterThan(0.6); // 至少60%成功率

      } catch (error) {
        const metrics = monitor.complete();
        recordLoadTestResult('大规模批量打印', false, { ...metrics, error: error.message });
        throw error;
      }
    }, 120000);

    it('应该能够处理混合类型的批量操作', async () => {
      const monitor = new LoadTestMonitor();
      const mixBatches = 5;

      try {
        for (let batch = 0; batch < mixBatches; batch++) {
          const batchStart = performance.now();

          const requests: IPrintRequest[] = [
            ...Array.from({ length: 10 }, (_, i) => ({
              type: 'text' as const,
              content: `文本批量 ${batch}-${i} - ${'x'.repeat(30)}`
            })),
            ...Array.from({ length: 5 }, (_, i) => ({
              type: 'qrcode' as const,
              content: `https://example.com/batch-${batch}-${i}`
            })),
            ...Array.from({ length: 3 }, (_, i) => ({
              type: 'barcode' as const,
              content: `BATCH${batch}${i.toString().padStart(3, '0')}`
            }))
          ];

          const results = await bluetoothPrinter.printBatch(requests);
          const batchDuration = performance.now() - batchStart;

          const successCount = results.filter(r => r.success).length;
          const batchSuccessRate = successCount / requests.length;

          monitor.recordResponse(batchDuration, batchSuccessRate > 0.7);

          await new Promise(resolve => setTimeout(resolve, 2000));
        }

        const metrics = monitor.complete();
        recordLoadTestResult('混合类型批量操作', metrics.successRate > 0.7, metrics);

        expect(metrics.successRate).toBeGreaterThan(0.5); // 至少50%成功率

      } catch (error) {
        const metrics = monitor.complete();
        recordLoadTestResult('混合类型批量操作', false, { ...metrics, error: error.message });
        throw error;
      }
    }, 100000);
  });

  describe('模板系统负载测试', () => {
    beforeEach(async () => {
      // 注册多个模板用于负载测试
      const templates = [
        {
          id: 'load-template-1',
          name: '负载测试模板1',
          type: 'receipt',
          description: '负载测试用模板1',
          content: '模板1内容: {{data}} - {{timestamp}}',
          enabled: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          version: '1.0.0',
          tags: ['load', 'test']
        },
        {
          id: 'load-template-2',
          name: '负载测试模板2',
          type: 'label',
          description: '负载测试用模板2',
          content: '标签模板: {{label}} - {{value}}',
          enabled: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          version: '1.0.0',
          tags: ['load', 'test', 'label']
        },
        {
          id: 'load-template-3',
          name: '负载测试模板3',
          type: 'receipt',
          description: '负载测试用模板3',
          content: '复杂模板: {{#items}}{{name}}: {{price}}{{/items}}',
          enabled: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          version: '1.0.0',
          tags: ['load', 'test', 'complex']
        }
      ];

      for (const template of templates) {
        await bluetoothPrinter.registerTemplate(template);
      }
    });

    it('应该能够处理高频率模板渲染', async () => {
      const monitor = new LoadTestMonitor();
      const renderCount = 100;

      try {
        const renderPromises = Array.from({ length: renderCount }, async (_, index) => {
          const renderStart = performance.now();
          let success = false;

          try {
            const templateId = `load-template-${(index % 3) + 1}`;
            const data = {
              data: `数据${index}`,
              timestamp: new Date().toISOString(),
              label: `标签${index}`,
              value: Math.random() * 100,
              items: Array.from({ length: 5 }, (_, i) => ({
                name: `项目${i}`,
                price: (i + 1) * 10
              }))
            };

            const result = await bluetoothPrinter.printTemplate(templateId, data);
            success = result.success;
          } catch (error) {
            success = false;
          }

          const renderDuration = performance.now() - renderStart;
          monitor.recordResponse(renderDuration, success);
        });

        await Promise.all(renderPromises);

        const metrics = monitor.complete();
        recordLoadTestResult('高频率模板渲染', metrics.successRate > 0.9, metrics);

        expect(metrics.successRate).toBeGreaterThan(0.8); // 至少80%成功率
        expect(metrics.throughput).toBeGreaterThan(2); // 至少2 renders/s

      } catch (error) {
        const metrics = monitor.complete();
        recordLoadTestResult('高频率模板渲染', false, { ...metrics, error: error.message });
        throw error;
      }
    }, 60000);

    it('应该能够处理大量模板注册', async () => {
      const monitor = new LoadTestMonitor();
      const templateCount = 50;

      try {
        const registerPromises = Array.from({ length: templateCount }, async (_, index) => {
          const registerStart = performance.now();
          let success = false;

          try {
            const template = {
              id: `dynamic-template-${index}`,
              name: `动态模板 ${index}`,
              type: 'receipt',
              description: `动态注册的模板 ${index}`,
              content: `动态内容 ${index}: {{data}}`,
              enabled: true,
              createdAt: new Date(),
              updatedAt: new Date(),
              version: '1.0.0',
              tags: ['dynamic', 'test']
            };

            await bluetoothPrinter.registerTemplate(template);
            success = true;
          } catch (error) {
            success = false;
          }

          const registerDuration = performance.now() - registerStart;
          monitor.recordResponse(registerDuration, success);
        });

        await Promise.all(registerPromises);

        const metrics = monitor.complete();
        recordLoadTestResult('大量模板注册', metrics.successRate > 0.95, metrics);

        expect(metrics.successRate).toBeGreaterThan(0.9); // 至少90%成功率

      } catch (error) {
        const metrics = monitor.complete();
        recordLoadTestResult('大量模板注册', false, { ...metrics, error: error.message });
        throw error;
      }
    }, 45000);
  });

  describe('队列系统负载测试', () => {
    it('应该能够处理队列满载情况', async () => {
      const monitor = new LoadTestMonitor();
      const overloadFactor = 2; // 超过队列容量的2倍

      try {
        // 暂停队列以便添加大量任务
        bluetoothPrinter.pauseQueue();

        const queueCapacity = LOAD_TEST_CONFIG.queue!.maxSize!;
        const totalTasks = queueCapacity * overloadFactor;

        console.log(`队列容量: ${queueCapacity}, 添加任务数: ${totalTasks}`);

        const addPromises = Array.from({ length: totalTasks }, async (_, index) => {
          const addStart = performance.now();
          let success = false;

          try {
            const result = await bluetoothPrinter.printText(`队列过载测试 ${index + 1}`);
            success = result.success;
          } catch (error) {
            success = false;
          }

          const addDuration = performance.now() - addStart;
          monitor.recordResponse(addDuration, success);
        });

        await Promise.all(addPromises);

        // 恢复队列处理
        bluetoothPrinter.resumeQueue();

        // 等待队列处理完成
        await new Promise(resolve => setTimeout(resolve, 30000));

        const finalStatus = bluetoothPrinter.getQueueStatus();
        const processedJobs = finalStatus.completed + finalStatus.failed;

        const metrics = monitor.complete();
        metrics.processedJobs = processedJobs;
        metrics.queueCapacity = queueCapacity;

        recordLoadTestResult('队列满载处理', processedJobs > queueCapacity * 0.8, metrics);

        expect(processedJobs).toBeGreaterThan(0); // 至少处理了一些任务

      } catch (error) {
        const metrics = monitor.complete();
        recordLoadTestResult('队列满载处理', false, { ...metrics, error: error.message });
        throw error;
      }
    }, 60000);

    it('应该能够处理队列频繁操作', async () => {
      const monitor = new LoadTestMonitor();
      const operationCount = 200;

      try {
        const operations = Array.from({ length: operationCount }, async (_, index) => {
          const opStart = performance.now();
          let success = false;

          try {
            switch (index % 4) {
              case 0:
                await bluetoothPrinter.printText(`操作测试 ${index}`);
                break;
              case 1:
                bluetoothPrinter.pauseQueue();
                break;
              case 2:
                bluetoothPrinter.resumeQueue();
                break;
              case 3:
                bluetoothPrinter.getQueueStatus();
                break;
            }
            success = true;
          } catch (error) {
            success = false;
          }

          const opDuration = performance.now() - opStart;
          monitor.recordResponse(opDuration, success);
        });

        await Promise.all(operations);

        const metrics = monitor.complete();
        recordLoadTestResult('队列频繁操作', metrics.successRate > 0.9, metrics);

        expect(metrics.successRate).toBeGreaterThan(0.8); // 至少80%成功率

      } catch (error) {
        const metrics = monitor.complete();
        recordLoadTestResult('队列频繁操作', false, { ...metrics, error: error.message });
        throw error;
      }
    }, 30000);
  });

  describe('内存压力负载测试', () => {
    it('应该能够处理大数据量的内存压力', async () => {
      const monitor = new LoadTestMonitor();
      const dataSizes = [1000, 5000, 10000, 20000]; // 字符数

      try {
        for (const dataSize of dataSizes) {
          const dataStart = performance.now();
          let success = false;

          try {
            const largeData = 'x'.repeat(dataSize);
            const result = await bluetoothPrinter.printText(largeData);
            success = result.success;
          } catch (error) {
            success = false;
          }

          const dataDuration = performance.now() - dataStart;
          monitor.recordResponse(dataDuration, success);

          // 强制垃圾回收（如果可用）
          if (global.gc) {
            global.gc();
          }

          await new Promise(resolve => setTimeout(resolve, 1000));
        }

        const metrics = monitor.complete();
        recordLoadTestResult('大数据内存压力', metrics.successRate > 0.8, metrics);

        expect(metrics.successRate).toBeGreaterThan(0.6); // 至少60%成功率

      } catch (error) {
        const metrics = monitor.complete();
        recordLoadTestResult('大数据内存压力', false, { ...metrics, error: error.message });
        throw error;
      }
    }, 60000);

    it('应该能够处理对象内存泄漏', async () => {
      const monitor = new LoadTestMonitor();
      const iterations = 20;
      const objectsPerIteration = 50;

      try {
        for (let iteration = 0; iteration < iterations; iteration++) {
          const iterationStart = performance.now();

          // 创建大量对象并使用
          const objects = Array.from({ length: objectsPerIteration }, (_, i) => ({
            id: `object-${iteration}-${i}`,
            data: new Array(100).fill(`数据${i}`),
            metadata: {
              timestamp: new Date(),
              random: Math.random(),
              nested: {
                level1: { level2: { level3: `深层嵌套数据${i}` } }
              }
            }
          }));

          const objectPromises = objects.map(async (obj, index) => {
            try {
              const result = await bluetoothPrinter.printText(
                `对象处理 ${iteration}-${index}: ${JSON.stringify(obj.data).slice(0, 100)}...`
              );
              return result.success;
            } catch (error) {
              return false;
            }
          });

          const results = await Promise.all(objectPromises);
          const iterationSuccess = results.filter(r => r).length;

          const iterationDuration = performance.now() - iterationStart;
          monitor.recordResponse(iterationDuration, iterationSuccess > objectsPerIteration * 0.8);

          // 清理引用
          objects.length = 0;

          // 强制垃圾回收
          if (global.gc) {
            global.gc();
          }

          await new Promise(resolve => setTimeout(resolve, 500));
        }

        const metrics = monitor.complete();
        recordLoadTestResult('对象内存泄漏测试', metrics.successRate > 0.7, metrics);

        expect(metrics.successRate).toBeGreaterThan(0.5); // 至少50%成功率

      } catch (error) {
        const metrics = monitor.complete();
        recordLoadTestResult('对象内存泄漏测试', false, { ...metrics, error: error.message });
        throw error;
      }
    }, 90000);
  });

  describe('负载测试结果汇总', () => {
    it('应该生成详细的负载测试报告', () => {
      console.log('\n📊 负载测试结果汇总:');
      console.log('='.repeat(80));

      const totalTests = loadTestResults.length;
      const passedTests = loadTestResults.filter(r => r.success).length;
      const failedTests = totalTests - passedTests;

      console.log(`总测试数: ${totalTests}`);
      console.log(`通过测试: ${passedTests}`);
      console.log(`失败测试: ${failedTests}`);
      console.log(`通过率: ${((passedTests / totalTests) * 100).toFixed(1)}%`);

      console.log('\n📈 性能指标汇总:');
      const allMetrics = loadTestResults.map(r => r.metrics);
      const avgSuccessRate = allMetrics.reduce((sum, m) => sum + m.successRate, 0) / allMetrics.length;
      const avgThroughput = allMetrics.reduce((sum, m) => sum + m.throughput, 0) / allMetrics.length;
      const avgResponseTime = allMetrics.reduce((sum, m) => sum + m.avgResponseTime, 0) / allMetrics.length;
      const maxMemoryUsage = Math.max(...allMetrics.map(m => m.peakMemoryUsage || 0));

      console.log(`  平均成功率: ${(avgSuccessRate * 100).toFixed(1)}%`);
      console.log(`  平均吞吐量: ${avgThroughput.toFixed(2)} ops/s`);
      console.log(`  平均响应时间: ${avgResponseTime.toFixed(1)}ms`);
      console.log(`  峰值内存使用: ${(maxMemoryUsage / 1024 / 1024).toFixed(1)}MB`);

      console.log('\n🔍 详细测试结果:');
      loadTestResults.forEach((result, index) => {
        const status = result.success ? '✅' : '❌';
        console.log(`${index + 1}. ${status} ${result.testName}`);
        console.log(`   成功率: ${(result.metrics.successRate * 100).toFixed(1)}%`);
        console.log(`   吞吐量: ${result.metrics.throughput.toFixed(2)} ops/s`);
        console.log(`   响应时间: ${result.metrics.avgResponseTime.toFixed(1)}ms`);
        if (result.metrics.peakMemoryUsage) {
          console.log(`   内存使用: ${(result.metrics.peakMemoryUsage / 1024 / 1024).toFixed(1)}MB`);
        }
      });

      console.log('='.repeat(80));

      // 负载测试评估
      const criticalSuccessRate = 0.7; // 关键操作成功率应大于70%
      const minThroughput = 1; // 最小吞吐量应大于1 ops/s
      const maxResponseTime = 5000; // 最大响应时间应小于5秒

      const criticalTests = loadTestResults.filter(r =>
        r.testName.includes('打印') ||
        r.testName.includes('批量') ||
        r.testName.includes('队列')
      );

      const criticalPassed = criticalTests.filter(r =>
        r.metrics.successRate >= criticalSuccessRate &&
        r.metrics.throughput >= minThroughput &&
        r.metrics.avgResponseTime <= maxResponseTime
      ).length;

      const criticalPassRate = criticalTests.length > 0 ? (criticalPassed / criticalTests.length) * 100 : 0;

      console.log(`\n🎯 关键负载测试通过率: ${criticalPassRate.toFixed(1)}%`);

      if (criticalPassRate >= 80) {
        console.log('🎉 负载测试通过！系统在高负载下表现良好。');
      } else if (criticalPassRate >= 60) {
        console.log('⚠️ 负载测试部分通过，建议优化系统性能。');
      } else {
        console.log('❌ 负载测试未通过，系统需要重大优化。');
      }

      // 优化建议
      console.log('\n💡 负载优化建议:');
      if (avgSuccessRate < 0.9) {
        console.log('  - 提高错误处理和重试机制');
      }
      if (avgThroughput < 5) {
        console.log('  - 优化处理算法和队列管理');
      }
      if (avgResponseTime > 1000) {
        console.log('  - 减少单次操作的复杂度');
      }
      if (maxMemoryUsage > 100 * 1024 * 1024) { // 100MB
        console.log('  - 优化内存使用和垃圾回收');
      }
      console.log('  - 考虑使用连接池和缓存机制');
      console.log('  - 实施异步处理和批量操作优化');

      // 整体评估
      expect(criticalPassRate).toBeGreaterThanOrEqual(60); // 至少60%的关键测试通过
    });
  });
});