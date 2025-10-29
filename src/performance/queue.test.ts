/**
 * 打印队列性能测试
 */

import { PrintQueue } from '../domain/queue/PrintQueue';
import { createMockPrintJob } from '../../tests/setup/jest-setup';
import { getMemoryUsage, measureTime } from '../../tests/setup/jest-setup';

describe('PrintQueue Performance Tests', () => {
  let queue: PrintQueue;

  beforeEach(() => {
    queue = new PrintQueue('test-queue', {
      maxSize: 1000,
      concurrency: 5,
      autoProcess: false // 禁用自动处理以便控制测试
    });
  });

  afterEach(() => {
    queue.clear();
  });

  describe('队列操作性能', () => {
    it('应该快速处理大量任务添加', async () => {
      const jobCount = 1000;
      const jobs = Array.from({ length: jobCount }, (_, i) =>
        createMockPrintJob({
          id: `job-${i}`,
          data: { text: `Job ${i}` }
        })
      );

      const startTime = performance.now();

      await Promise.all(jobs.map(job => queue.enqueue(job)));

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(queue.size()).toBe(jobCount);
      expect(duration).toBeLessThan(1000); // 应该在1秒内完成

      console.log(`添加 ${jobCount} 个任务耗时: ${duration.toFixed(2)}ms`);
    });

    it('应该高效处理任务优先级排序', async () => {
      const jobCount = 500;
      const jobs = Array.from({ length: jobCount }, (_, i) =>
        createMockPrintJob({
          id: `job-${i}`,
          priority: ['urgent', 'high', 'normal', 'low'][Math.floor(Math.random() * 4)] as any,
          data: { text: `Job ${i}` }
        })
      );

      // 随机添加任务
      const shuffledJobs = [...jobs].sort(() => Math.random() - 0.5);

      const startTime = performance.now();

      await Promise.all(shuffledJobs.map(job => queue.enqueue(job)));

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(queue.size()).toBe(jobCount);
      expect(duration).toBeLessThan(500); // 应该在500ms内完成

      console.log(`优先级排序 ${jobCount} 个任务耗时: ${duration.toFixed(2)}ms`);
    });

    it('应该快速清空大量任务', async () => {
      const jobCount = 1000;
      const jobs = Array.from({ length: jobCount }, (_, i) =>
        createMockPrintJob({
          id: `job-${i}`,
          data: { text: `Job ${i}` }
        })
      );

      await Promise.all(jobs.map(job => queue.enqueue(job)));
      expect(queue.size()).toBe(jobCount);

      const startTime = performance.now();

      queue.clear();

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(queue.size()).toBe(0);
      expect(duration).toBeLessThan(100); // 应该在100ms内完成

      console.log(`清空 ${jobCount} 个任务耗时: ${duration.toFixed(2)}ms`);
    });
  });

  describe('内存使用性能', () => {
    it('应该有效管理大量任务的内存使用', async () => {
      const initialMemory = getMemoryUsage();
      const jobCount = 5000;
      const jobs = Array.from({ length: jobCount }, (_, i) =>
        createMockPrintJob({
          id: `job-${i}`,
          data: {
            text: 'A'.repeat(1000), // 1KB 数据
            metadata: {
              index: i,
              timestamp: Date.now(),
              extra: 'x'.repeat(500) // 额外数据
            }
          }
        })
      );

      await Promise.all(jobs.map(job => queue.enqueue(job)));

      const afterEnqueueMemory = getMemoryUsage();

      queue.clear();

      // 强制垃圾回收（如果可用）
      if (global.gc) {
        global.gc();
      }

      const afterClearMemory = getMemoryUsage();

      if (initialMemory && afterEnqueueMemory && afterClearMemory) {
        const memoryIncrease = afterEnqueueMemory.used - initialMemory.used;
        const memoryAfterClear = afterClearMemory.used - initialMemory.used;

        console.log(`初始内存: ${(initialMemory.used / 1024 / 1024).toFixed(2)}MB`);
        console.log(`添加任务后内存: ${(afterEnqueueMemory.used / 1024 / 1024).toFixed(2)}MB`);
        console.log(`清空后内存: ${(afterClearMemory.used / 1024 / 1024).toFixed(2)}MB`);
        console.log(`内存增加: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
        console.log(`内存残留: ${(memoryAfterClear / 1024 / 1024).toFixed(2)}MB`);

        // 内存增加应该合理（每个任务约1.5KB，5000个任务约7.5MB）
        expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024); // 小于10MB

        // 清空后内存应该大部分释放
        expect(memoryAfterClear).toBeLessThan(memoryIncrease * 0.2); // 残留小于20%
      }
    });

    it('应该避免内存泄漏', async () => {
      const iterations = 10;
      const jobsPerIteration = 100;
      const memoryUsages: number[] = [];

      for (let i = 0; i < iterations; i++) {
        // 添加任务
        const jobs = Array.from({ length: jobsPerIteration }, (_, j) =>
          createMockPrintJob({
            id: `job-${i}-${j}`,
            data: { text: 'Test data'.repeat(10) }
          })
        );

        await Promise.all(jobs.map(job => queue.enqueue(job)));

        // 清空队列
        queue.clear();

        // 记录内存使用
        const memory = getMemoryUsage();
        if (memory) {
          memoryUsages.push(memory.used);
        }

        // 强制垃圾回收
        if (global.gc) {
          global.gc();
        }
      }

      if (memoryUsages.length > 1) {
        const firstMemory = memoryUsages[0];
        const lastMemory = memoryUsages[memoryUsages.length - 1];
        const memoryGrowth = lastMemory - firstMemory;

        console.log(`首次内存使用: ${(firstMemory / 1024 / 1024).toFixed(2)}MB`);
        console.log(`最后内存使用: ${(lastMemory / 1024 / 1024).toFixed(2)}MB`);
        console.log(`内存增长: ${(memoryGrowth / 1024 / 1024).toFixed(2)}MB`);

        // 内存增长应该很小（小于1MB）
        expect(memoryGrowth).toBeLessThan(1024 * 1024);
      }
    });
  });

  describe('并发处理性能', () => {
    it('应该高效处理并发操作', async () => {
      const concurrentOperations = 10;
      const operationsPerThread = 100;
      const totalOperations = concurrentOperations * operationsPerThread;

      const startTime = performance.now();

      // 并发执行多个操作
      const operations = Array.from({ length: concurrentOperations }, (_, threadIndex) =>
        Array.from({ length: operationsPerThread }, async (_, opIndex) => {
          const job = createMockPrintJob({
            id: `job-${threadIndex}-${opIndex}`,
            data: { text: `Job ${threadIndex}-${opIndex}` }
          });

          await queue.enqueue(job);
          await queue.dequeue();
        })
      ).flat();

      await Promise.all(operations);

      const endTime = performance.now();
      const duration = endTime - startTime;
      const operationsPerSecond = totalOperations / (duration / 1000);

      console.log(`处理 ${totalOperations} 个并发操作耗时: ${duration.toFixed(2)}ms`);
      console.log(`每秒处理操作数: ${operationsPerSecond.toFixed(2)}`);

      // 应该能够在合理时间内完成
      expect(duration).toBeLessThan(5000); // 5秒内
      expect(operationsPerSecond).toBeGreaterThan(100); // 每秒至少100个操作
    });

    it('应该正确处理高并发队列访问', async () => {
      const readerCount = 5;
      const writerCount = 5;
      const operationsPerWorker = 200;

      let totalReads = 0;
      let totalWrites = 0;
      let totalErrors = 0;

      const startTime = performance.now();

      // 创建写入器
      const writers = Array.from({ length: writerCount }, async (_, writerIndex) => {
        for (let i = 0; i < operationsPerWorker; i++) {
          try {
            const job = createMockPrintJob({
              id: `writer-${writerIndex}-job-${i}`,
              data: { text: `Writer ${writerIndex} Job ${i}` }
            });
            await queue.enqueue(job);
            totalWrites++;
          } catch (error) {
            totalErrors++;
          }
        }
      });

      // 创建读取器
      const readers = Array.from({ length: readerCount }, async (_, readerIndex) => {
        for (let i = 0; i < operationsPerWorker; i++) {
          try {
            const job = await queue.dequeue();
            if (job) {
              totalReads++;
            }
          } catch (error) {
            totalErrors++;
          }
        }
      });

      await Promise.all([...writers, ...readers]);

      const endTime = performance.now();
      const duration = endTime - startTime;

      console.log(`高并发测试完成: ${duration.toFixed(2)}ms`);
      console.log(`总写入: ${totalWrites}, 总读取: ${totalReads}, 总错误: ${totalErrors}`);
      console.log(`队列剩余大小: ${queue.size()}`);

      expect(totalErrors).toBe(0);
      expect(duration).toBeLessThan(10000); // 10秒内完成
    });
  });

  describe('大数据量性能', () => {
    it('应该处理大体积打印任务', async () => {
      const largeDataSize = 1024 * 1024; // 1MB
      const largeData = 'x'.repeat(largeDataSize);

      const job = createMockPrintJob({
        id: 'large-job',
        data: {
          text: largeData,
          images: [largeData, largeData] // 额外的图片数据
        }
      });

      const startTime = performance.now();

      await queue.enqueue(job);
      const dequeuedJob = await queue.dequeue();

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(1000); // 1秒内完成
      expect(dequeuedJob?.id).toBe('large-job');

      console.log(`处理 1MB 数据任务耗时: ${duration.toFixed(2)}ms`);
    });

    it('应该高效处理大量小任务', async () => {
      const taskCount = 10000;
      const smallTasks = Array.from({ length: taskCount }, (_, i) =>
        createMockPrintJob({
          id: `small-task-${i}`,
          data: { text: `Small task ${i}` }
        })
      );

      const startTime = performance.now();

      // 批量添加
      await Promise.all(smallTasks.map(task => queue.enqueue(task)));

      // 批量取出
      const results = [];
      while (queue.size() > 0) {
        const job = await queue.dequeue();
        if (job) {
          results.push(job);
        }
      }

      const endTime = performance.now();
      const duration = endTime - startTime;
      const tasksPerSecond = taskCount / (duration / 1000);

      expect(results.length).toBe(taskCount);
      expect(duration).toBeLessThan(5000); // 5秒内完成
      expect(tasksPerSecond).toBeGreaterThan(2000); // 每秒至少2000个任务

      console.log(`处理 ${taskCount} 个小任务耗时: ${duration.toFixed(2)}ms`);
      console.log(`每秒处理任务数: ${tasksPerSecond.toFixed(2)}`);
    });
  });

  describe('压力测试', () => {
    it('应该在高负载下保持稳定', async () => {
      const stressDuration = 5000; // 5秒压力测试
      const concurrentWorkers = 20;
      const tasksPerWorker = 100;

      let completedTasks = 0;
      let failedTasks = 0;
      const startTime = Date.now();

      const workers = Array.from({ length: concurrentWorkers }, async (_, workerIndex) => {
        while (Date.now() - startTime < stressDuration && completedTasks + failedTasks < concurrentWorkers * tasksPerWorker) {
          try {
            // 随机操作：添加或移除任务
            if (Math.random() > 0.5) {
              const job = createMockPrintJob({
                id: `stress-job-${workerIndex}-${completedTasks}`,
                data: { text: `Stress test task ${completedTasks}` }
              });
              await queue.enqueue(job);
              completedTasks++;
            } else {
              const job = await queue.dequeue();
              if (job) {
                completedTasks++;
              }
            }
          } catch (error) {
            failedTasks++;
          }

          // 随机延迟模拟真实场景
          if (Math.random() > 0.8) {
            await new Promise(resolve => setTimeout(resolve, Math.random() * 10));
          }
        }
      });

      await Promise.all(workers);

      const actualDuration = Date.now() - startTime;
      const throughput = completedTasks / (actualDuration / 1000);

      console.log(`压力测试完成: ${actualDuration}ms`);
      console.log(`完成任务: ${completedTasks}, 失败任务: ${failedTasks}`);
      console.log(`吞吐量: ${throughput.toFixed(2)} 任务/秒`);
      console.log(`队列剩余大小: ${queue.size()}`);

      expect(failedTasks).toBeLessThan(completedTasks * 0.01); // 失败率小于1%
      expect(throughput).toBeGreaterThan(50); // 每秒至少50个任务
    });

    it('应该正确处理队列满的情况', async () => {
      const maxQueueSize = 100;
      const smallQueue = new PrintQueue('small-queue', {
        maxSize: maxQueueSize,
        concurrency: 1,
        autoProcess: false
      });

      // 填满队列
      const jobs = Array.from({ length: maxQueueSize + 50 }, (_, i) =>
        createMockPrintJob({
          id: `overflow-job-${i}`,
          data: { text: `Job ${i}` }
        })
      );

      let successCount = 0;
      let failureCount = 0;

      await Promise.all(jobs.map(async (job) => {
        try {
          await smallQueue.enqueue(job);
          successCount++;
        } catch (error) {
          failureCount++;
        }
      }));

      expect(successCount).toBe(maxQueueSize);
      expect(failureCount).toBe(50);
      expect(smallQueue.size()).toBe(maxQueueSize);

      console.log(`队列满测试: 成功 ${successCount}, 失败 ${failureCount}`);

      smallQueue.clear();
    });
  });

  describe('性能监控', () => {
    it('应该提供准确的性能指标', async () => {
      const metrics = queue.getMetrics();

      expect(metrics).toHaveProperty('totalEnqueued');
      expect(metrics).toHaveProperty('totalDequeued');
      expect(metrics).toHaveProperty('totalProcessed');
      expect(metrics).toHaveProperty('totalFailed');
      expect(metrics).toHaveProperty('averageProcessingTime');
      expect(metrics).toHaveProperty('throughput');

      expect(metrics.totalEnqueued).toBe(0);
      expect(metrics.totalDequeued).toBe(0);
      expect(metrics.totalProcessed).toBe(0);
      expect(metrics.totalFailed).toBe(0);

      // 添加一些任务
      const jobs = Array.from({ length: 10 }, (_, i) =>
        createMockPrintJob({
          id: `metrics-job-${i}`,
          data: { text: `Job ${i}` }
        })
      );

      await Promise.all(jobs.map(job => queue.enqueue(job)));

      const updatedMetrics = queue.getMetrics();
      expect(updatedMetrics.totalEnqueued).toBe(10);
    });

    it('应该监控队列状态变化', async () => {
      const statusChanges: string[] = [];

      queue.on('statusChange', (status) => {
        statusChanges.push(status);
      });

      // 添加任务触发状态变化
      const job = createMockPrintJob({
        id: 'status-job',
        data: { text: 'Status test' }
      });

      await queue.enqueue(job);

      expect(statusChanges.length).toBeGreaterThan(0);
    });
  });
});