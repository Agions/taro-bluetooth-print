/**
 * 内存泄漏检测测试
 * 检测系统在长时间运行下的内存使用情况和潜在的内存泄漏
 */

import { BluetoothPrinter, createBluetoothPrinter } from '../../src/BluetoothPrinter';
import {
  IBluetoothPrinterConfig,
  IPrintRequest
} from '../../src/types';

// 内存泄漏检测配置
const MEMORY_TEST_CONFIG: Partial<IBluetoothPrinterConfig> = {
  bluetooth: {
    scanTimeout: 5000,
    connectionTimeout: 8000,
    autoReconnect: false, // 避免重连影响内存测试
    maxReconnectAttempts: 1,
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
    maxSize: 100,
    concurrency: 1,
    retryAttempts: 1,
    retryDelay: 500,
    autoProcess: true,
    processInterval: 200
  },
  template: {
    enableCache: true,
    cacheSize: 50,
    cacheTimeout: 60000,
    enableValidation: false // 减少验证开销
  },
  logging: {
    level: 'error', // 最少日志
    enableConsole: false,
    enableFile: false,
    maxFileSize: 1024 * 1024,
    maxFiles: 1
  },
  events: {
    enabled: false, // 关闭事件以减少内存开销
    maxListeners: 10,
    enableHistory: false,
    historySize: 0
  }
};

describe('内存泄漏检测测试', () => {
  let bluetoothPrinter: BluetoothPrinter;
  let memorySnapshots: any[] = [];

  beforeEach(async () => {
    memorySnapshots = [];
    bluetoothPrinter = createBluetoothPrinter(MEMORY_TEST_CONFIG);
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

  function takeMemorySnapshot(label: string): void {
    if (performance.memory) {
      const snapshot = {
        label,
        timestamp: Date.now(),
        usedJSHeapSize: performance.memory.usedJSHeapSize,
        totalJSHeapSize: performance.memory.totalJSHeapSize,
        jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
      };
      memorySnapshots.push(snapshot);
      console.log(`📊 ${label}: ${((snapshot.usedJSHeapSize / 1024 / 1024).toFixed(2))}MB`);
    } else {
      console.warn(`⚠️ performance.memory 不可用，跳过 ${label} 内存快照`);
    }
  }

  function forceGarbageCollection(): void {
    if (global.gc) {
      global.gc();
      console.log('🗑️ 强制垃圾回收');
    } else {
      console.log('⚠️ 无法强制垃圾回收（需要 --expose-gc 标志）');
    }
  }

  function analyzeMemoryGrowth(): any {
    if (memorySnapshots.length < 2) {
      return { analysis: '数据不足' };
    }

    const first = memorySnapshots[0];
    const last = memorySnapshots[memorySnapshots.length - 1];
    const duration = last.timestamp - first.timestamp;

    const memoryGrowth = last.usedJSHeapSize - first.usedJSHeapSize;
    const growthRate = memoryGrowth / duration; // bytes/ms
    const growthRateMBPerMinute = (growthRate * 60 * 1000) / (1024 * 1024);

    // 检查是否有持续增长趋势
    let growthTrend = 'stable';
    let consecutiveGrowth = 0;
    let maxConsecutiveGrowth = 0;

    for (let i = 1; i < memorySnapshots.length; i++) {
      const prev = memorySnapshots[i - 1];
      const curr = memorySnapshots[i];
      if (curr.usedJSHeapSize > prev.usedJSHeapSize) {
        consecutiveGrowth++;
        maxConsecutiveGrowth = Math.max(maxConsecutiveGrowth, consecutiveGrowth);
      } else {
        consecutiveGrowth = 0;
      }
    }

    if (maxConsecutiveGrowth >= memorySnapshots.length * 0.7) {
      growthTrend = 'increasing';
    } else if (maxConsecutiveGrowth >= memorySnapshots.length * 0.3) {
      growthTrend = 'fluctuating';
    }

    return {
      analysis: 'completed',
      duration,
      initialMemoryMB: first.usedJSHeapSize / 1024 / 1024,
      finalMemoryMB: last.usedJSHeapSize / 1024 / 1024,
      memoryGrowthMB: memoryGrowth / 1024 / 1024,
      growthRateMBPerMinute,
      growthTrend,
      maxConsecutiveGrowth,
      snapshotCount: memorySnapshots.length,
      peakMemoryMB: Math.max(...memorySnapshots.map(s => s.usedJSHeapSize)) / 1024 / 1024
    };
  }

  describe('基础操作内存泄漏检测', () => {
    it('应该能够在重复创建和销毁实例时不出现内存泄漏', async () => {
      console.log('🔄 开始实例创建销毁内存泄漏测试...');

      takeMemorySnapshot('测试开始');
      forceGarbageCollection();

      const iterations = 20;
      const instances: BluetoothPrinter[] = [];

      for (let i = 0; i < iterations; i++) {
        // 创建实例
        const instance = createBluetoothPrinter(MEMORY_TEST_CONFIG);
        await instance.initialize();

        // 执行一些操作
        await instance.printText(`内存测试实例 ${i + 1}`);
        await instance.getQueueStatus();

        instances.push(instance);

        // 每5个实例销毁一次
        if ((i + 1) % 5 === 0) {
          for (const inst of instances) {
            await inst.dispose();
          }
          instances.length = 0;

          forceGarbageCollection();
          takeMemorySnapshot(`销毁${Math.floor((i + 1) / 5)}批后`);
        }
      }

      // 销毁剩余实例
      for (const instance of instances) {
        await instance.dispose();
      }

      forceGarbageCollection();
      takeMemorySnapshot('全部销毁后');

      const analysis = analyzeMemoryGrowth();
      console.log('📈 实例创建销毁内存分析:', analysis);

      expect(analysis.growthTrend).not.toBe('increasing');
      expect(analysis.growthRateMBPerMinute).toBeLessThan(10); // 每分钟增长应小于10MB
    }, 60000);

    it('应该能够在大量打印操作后正确释放内存', async () => {
      console.log('🖨️ 开始打印操作内存泄漏测试...');

      takeMemorySnapshot('打印测试开始');
      forceGarbageCollection();

      const printCycles = 5;
      const printsPerCycle = 20;

      for (let cycle = 0; cycle < printCycles; cycle++) {
        console.log(`📄 打印周期 ${cycle + 1}/${printCycles}`);

        const promises = [];
        for (let i = 0; i < printsPerCycle; i++) {
          const largeText = `打印测试 ${cycle + 1}-${i + 1} - ${'x'.repeat(500)}`;
          promises.push(bluetoothPrinter.printText(largeText));
        }

        await Promise.all(promises);

        // 等待处理完成
        await new Promise(resolve => setTimeout(resolve, 2000));

        forceGarbageCollection();
        takeMemorySnapshot(`打印周期${cycle + 1}后`);
      }

      // 等待所有任务完成
      await new Promise(resolve => setTimeout(resolve, 10000));

      forceGarbageCollection();
      takeMemorySnapshot('打印测试结束');

      const analysis = analyzeMemoryGrowth();
      console.log('📈 打印操作内存分析:', analysis);

      expect(analysis.growthRateMBPerMinute).toBeLessThan(20); // 每分钟增长应小于20MB
    }, 90000);

    it('应该能够正确释放模板缓存内存', async () => {
      console.log('📋 开始模板缓存内存泄漏测试...');

      takeMemorySnapshot('模板测试开始');
      forceGarbageCollection();

      const templateCycles = 3;
      const templatesPerCycle = 30;

      for (let cycle = 0; cycle < templateCycles; cycle++) {
        console.log(`📝 模板周期 ${cycle + 1}/${templateCycles}`);

        // 注册模板
        for (let i = 0; i < templatesPerCycle; i++) {
          const template = {
            id: `memory-test-template-${cycle}-${i}`,
            name: `内存测试模板 ${cycle}-${i}`,
            type: 'receipt',
            description: `用于内存测试的模板 ${cycle}-${i}`,
            content: `
内存测试模板 ${cycle}-${i}
时间: {{timestamp}}
数据: {{data}}
周期: ${cycle}
索引: ${i}
${'x'.repeat(100)}
            `.trim(),
            enabled: true,
            createdAt: new Date(),
            updatedAt: new Date(),
            version: '1.0.0',
            tags: ['memory', 'test', `cycle-${cycle}`]
          };

          await bluetoothPrinter.registerTemplate(template);
        }

        // 使用模板
        for (let i = 0; i < templatesPerCycle; i++) {
          const templateId = `memory-test-template-${cycle}-${i}`;
          const data = {
            timestamp: new Date().toISOString(),
            data: `数据${cycle}-${i}`
          };

          try {
            await bluetoothPrinter.printTemplate(templateId, data);
          } catch (error) {
            // 忽略模板错误，专注于内存测试
          }
        }

        forceGarbageCollection();
        takeMemorySnapshot(`模板周期${cycle + 1}后`);
      }

      // 清理：获取所有模板并尝试清理
      const allTemplates = bluetoothPrinter.getTemplates();
      console.log(`📊 总模板数: ${allTemplates.length}`);

      forceGarbageCollection();
      takeMemorySnapshot('模板测试结束');

      const analysis = analyzeMemoryGrowth();
      console.log('📈 模板缓存内存分析:', analysis);

      expect(analysis.growthRateMBPerMinute).toBeLessThan(15); // 每分钟增长应小于15MB
    }, 60000);
  });

  describe('事件系统内存泄漏检测', () => {
    it('应该能够正确清理事件监听器', async () => {
      console.log('📡 开始事件系统内存泄漏测试...');

      // 创建启用事件的实例
      const eventConfig = {
        ...MEMORY_TEST_CONFIG,
        events: {
          enabled: true,
          maxListeners: 100,
          enableHistory: true,
          historySize: 50
        }
      };

      const eventPrinter = createBluetoothPrinter(eventConfig);
      await eventPrinter.initialize();

      takeMemorySnapshot('事件测试开始');
      forceGarbageCollection();

      // 添加大量事件监听器
      const listenerCount = 50;
      const listeners: any[] = [];

      for (let i = 0; i < listenerCount; i++) {
        const listener = jest.fn();
        eventPrinter.on('jobCompleted', listener);
        eventPrinter.on('jobQueued', listener);
        eventPrinter.on('deviceDiscovered', listener);
        listeners.push(listener);
      }

      takeMemorySnapshot('添加监听器后');

      // 触发一些事件
      for (let i = 0; i < 20; i++) {
        await eventPrinter.printText(`事件触发测试 ${i + 1}`);
      }

      takeMemorySnapshot('触发事件后');

      // 移除所有监听器
      listeners.forEach(listener => {
        eventPrinter.off('jobCompleted', listener);
        eventPrinter.off('jobQueued', listener);
        eventPrinter.off('deviceDiscovered', listener);
      });

      forceGarbageCollection();
      takeMemorySnapshot('移除监听器后');

      await eventPrinter.dispose();
      forceGarbageCollection();
      takeMemorySnapshot('事件测试结束');

      const analysis = analyzeMemoryGrowth();
      console.log('📈 事件系统内存分析:', analysis);

      expect(analysis.growthTrend).not.toBe('increasing');
    }, 45000);
  });

  describe('长时间运行内存稳定性测试', () => {
    it('应该在长时间运行下保持内存稳定', async () => {
      console.log('⏰ 开始长时间运行内存稳定性测试...');

      takeMemorySnapshot('长时间测试开始');
      forceGarbageCollection();

      const testDuration = 60000; // 1分钟
      const operationInterval = 500; // 每500ms一次操作
      const startTime = Date.now();

      let operationCount = 0;

      while (Date.now() - startTime < testDuration) {
        operationCount++;

        // 随机选择不同类型的操作
        const operationType = operationCount % 4;
        let success = false;

        try {
          switch (operationType) {
            case 0:
              await bluetoothPrinter.printText(`长时间测试 ${operationCount} - ${'x'.repeat(200)}`);
              success = true;
              break;
            case 1:
              await bluetoothPrinter.printQRCode(`https://example.com/long-test/${operationCount}`);
              success = true;
              break;
            case 2:
              await bluetoothPrinter.printBarcode(`LONG${operationCount.toString().padStart(6, '0')}`, 'CODE128');
              success = true;
              break;
            case 3:
              bluetoothPrinter.getQueueStatus();
              success = true;
              break;
          }
        } catch (error) {
          success = false;
        }

        // 每10次操作记录一次内存
        if (operationCount % 10 === 0) {
          forceGarbageCollection();
          takeMemorySnapshot(`操作${operationCount}后`);
        }

        // 控制操作频率
        await new Promise(resolve => setTimeout(resolve, operationInterval));
      }

      // 等待所有任务完成
      await new Promise(resolve => setTimeout(resolve, 10000));

      forceGarbageCollection();
      takeMemorySnapshot('长时间测试结束');

      const analysis = analyzeMemoryGrowth();
      console.log('📈 长时间运行内存分析:', {
        ...analysis,
        totalOperations: operationCount,
        operationsPerSecond: operationCount / (testDuration / 1000)
      });

      expect(analysis.growthRateMBPerMinute).toBeLessThan(30); // 长时间运行时增长率应更小
      expect(analysis.growthTrend).not.toBe('increasing');
    }, 90000);

    it('应该能够在资源压力下保持内存稳定', async () => {
      console.log('💪 开始资源压力内存稳定性测试...');

      takeMemorySnapshot('压力测试开始');
      forceGarbageCollection();

      const pressureCycles = 3;
      const memoryIntensiveOperations = 15;

      for (let cycle = 0; cycle < pressureCycles; cycle++) {
        console.log(`🔥 压力周期 ${cycle + 1}/${pressureCycles}`);

        // 内存密集型操作
        const largeDataPromises = [];
        for (let i = 0; i < memoryIntensiveOperations; i++) {
          const largeData = {
            id: `pressure-${cycle}-${i}`,
            content: 'x'.repeat(1000),
            metadata: {
              timestamp: new Date(),
              randomData: Array.from({ length: 100 }, (_, j) => ({ index: j, value: Math.random() })),
              nestedObject: {
                level1: {
                  level2: {
                    level3: Array.from({ length: 50 }, (_, k) => `深度数据${k}`)
                  }
                }
              }
            };

          largeDataPromises.push(
            bluetoothPrinter.printText(
              `压力测试 ${cycle}-${i}: ${JSON.stringify(largeData.content)}`
            )
          );
        }

        await Promise.all(largeDataPromises);

        // 批量操作
        const batchRequests = Array.from({ length: 10 }, (_, i) => ({
          type: 'text' as const,
          content: `批量压力测试 ${cycle}-${i} - ${'x'.repeat(300)}`
        }));

        await bluetoothPrinter.printBatch(batchRequests);

        forceGarbageCollection();
        takeMemorySnapshot(`压力周期${cycle + 1}后`);

        // 等待处理完成
        await new Promise(resolve => setTimeout(resolve, 5000));
      }

      // 最终清理
      await new Promise(resolve => setTimeout(resolve, 10000));

      forceGarbageCollection();
      takeMemorySnapshot('压力测试结束');

      const analysis = analyzeMemoryGrowth();
      console.log('📈 资源压力内存分析:', analysis);

      // 压力测试下允许更高的内存增长率，但应该稳定
      expect(analysis.growthTrend).not.toBe('increasing');
    }, 120000);
  });

  describe('内存泄漏检测结果汇总', () => {
    it('应该生成详细的内存泄漏检测报告', () => {
      console.log('\n📊 内存泄漏检测结果汇总:');
      console.log('='.repeat(80));

      if (memorySnapshots.length === 0) {
        console.log('⚠️ 没有内存快照数据（performance.memory 不可用）');
        console.log('💡 要启用内存检测，请使用 --expose-gc 标志运行测试');
        return;
      }

      const analysis = analyzeMemoryGrowth();
      console.log('\n📈 内存使用分析:');
      console.log(`  测试持续时间: ${(analysis.duration / 1000).toFixed(1)}秒`);
      console.log(`  初始内存: ${analysis.initialMemoryMB.toFixed(2)}MB`);
      console.log(`  最终内存: ${analysis.finalMemoryMB.toFixed(2)}MB`);
      console.log(`  内存增长: ${analysis.memoryGrowthMB.toFixed(2)}MB`);
      console.log(`  增长速率: ${analysis.growthRateMBPerMinute.toFixed(2)}MB/分钟`);
      console.log(`  增长趋势: ${analysis.growthTrend}`);
      console.log(`  峰值内存: ${analysis.peakMemoryMB.toFixed(2)}MB`);
      console.log(`  快照数量: ${analysis.snapshotCount}`);

      console.log('\n📊 内存快照时间线:');
      memorySnapshots.forEach((snapshot, index) => {
        const memoryMB = (snapshot.usedJSHeapSize / 1024 / 1024).toFixed(2);
        const timeFromStart = ((snapshot.timestamp - memorySnapshots[0].timestamp) / 1000).toFixed(1);
        console.log(`  ${timeFromStart}s: ${memoryMB}MB - ${snapshot.label}`);
      });

      console.log('\n🔍 内存泄漏评估:');
      let leakSuspected = false;
      let recommendations: string[] = [];

      if (analysis.growthTrend === 'increasing') {
        leakSuspected = true;
        recommendations.push('检测到持续内存增长，可能存在内存泄漏');
      }

      if (analysis.growthRateMBPerMinute > 10) {
        leakSuspected = true;
        recommendations.push(`内存增长率过高 (${analysis.growthRateMBPerMinute.toFixed(2)}MB/min)`);
      }

      if (analysis.memoryGrowthMB > 50) {
        leakSuspected = true;
        recommendations.push(`总内存增长过大 (${analysis.memoryGrowthMB.toFixed(2)}MB)`);
      }

      if (analysis.peakMemoryMB > 200) {
        recommendations.push(`峰值内存使用过高 (${analysis.peakMemoryMB.toFixed(2)}MB)`);
      }

      if (!leakSuspected) {
        console.log('✅ 未检测到明显的内存泄漏');
        console.log('🎉 内存使用情况良好！');
      } else {
        console.log('⚠️ 怀疑存在内存泄漏');
      }

      if (recommendations.length > 0) {
        console.log('\n💡 建议:');
        recommendations.forEach(rec => console.log(`  - ${rec}`));
        console.log('  - 检查事件监听器是否正确移除');
        console.log('  - 验证定时器和异步操作是否正确清理');
        console.log('  - 确认大型对象引用是否及时释放');
        console.log('  - 考虑实现对象池或缓存清理机制');
      }

      console.log('\n🛠️ 调试建议:');
      console.log('  - 使用 Chrome DevTools Memory 标签页进行详细分析');
      console.log('  - 使用 Heap Snapshot 对比操作前后的内存状态');
      console.log('  - 使用 Allocation Timeline 查看内存分配模式');
      console.log('  - 在生产环境中监控内存使用趋势');

      console.log('='.repeat(80));

      // 内存泄漏断言
      if (memorySnapshots.length > 0) {
        // 允许一定的内存增长，但不应该有明显的泄漏趋势
        expect(analysis.growthTrend).not.toBe('increasing');
        expect(analysis.growthRateMBPerMinute).toBeLessThan(50); // 极限情况
      }
    });
  });
});