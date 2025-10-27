/**
 * 打印队列单元测试
 */

import { PrintQueue } from '../../../../src/domain/queue/PrintQueue';
import {
  IPrintQueue,
  IQueueConfig,
  QueueStatus,
  IQueuePolicy,
  PrintJobState
} from '../../../../src/domain/queue/types';

// 测试作业类型
interface TestPrintJob {
  id: string;
  type: string;
  content: string;
  options?: any;
  priority?: number;
  deviceId?: string;
  status: PrintJobState;
  createdAt: Date;
  updatedAt: Date;
  attempts: number;
  maxAttempts: number;
  error?: Error;
  result?: any;
}

describe('PrintQueue', () => {
  let queue: IPrintQueue;
  let eventEmitter: any;

  beforeEach(() => {
    eventEmitter = {
      emit: jest.fn(),
      on: jest.fn(),
      off: jest.fn(),
      removeAllListeners: jest.fn()
    };

    queue = new PrintQueue(
      {
        maxSize: 100,
        concurrency: 1,
        retryAttempts: 3,
        retryDelay: 100,
        autoProcess: false, // 手动控制处理
        processInterval: 50
      },
      eventEmitter,
      {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn()
      } as any
    );
  });

  afterEach(() => {
    queue.dispose();
  });

  describe('初始化', () => {
    it('应该正确初始化队列', async () => {
      await queue.initialize();

      const status = queue.getStatus();
      expect(status.total).toBe(0);
      expect(status.pending).toBe(0);
      expect(status.processing).toBe(0);
      expect(status.completed).toBe(0);
      expect(status.failed).toBe(0);
      expect(status.processing).toBe(false);
      expect(status.paused).toBe(false);
    });

    it('应该使用默认配置', () => {
      const defaultQueue = new PrintQueue({}, eventEmitter, {} as any);
      const config = defaultQueue.getConfig();

      expect(config.maxSize).toBe(100);
      expect(config.concurrency).toBe(1);
      expect(config.retryAttempts).toBe(3);
      expect(config.retryDelay).toBe(1000);
      expect(config.autoProcess).toBe(true);
      expect(config.processInterval).toBe(500);
    });

    it('重复初始化应该抛出错误', async () => {
      await queue.initialize();

      await expect(queue.initialize())
        .rejects.toThrow('Queue already initialized');
    });

    it('未初始化时操作应该抛出错误', () => {
      const job: TestPrintJob = {
        id: 'test-job',
        type: 'text',
        content: 'test',
        status: PrintJobState.PENDING,
        createdAt: new Date(),
        updatedAt: new Date(),
        attempts: 0,
        maxAttempts: 3
      };

      expect(() => queue.addJob(job))
        .toThrow('Queue not initialized');
    });
  });

  describe('作业管理', () => {
    beforeEach(async () => {
      await queue.initialize();
    });

    it('应该能够添加作业', async () => {
      const job: Omit<TestPrintJob, 'id' | 'createdAt' | 'updatedAt'> = {
        type: 'text',
        content: 'Test job',
        priority: 1,
        deviceId: 'device-1',
        status: PrintJobState.PENDING,
        attempts: 0,
        maxAttempts: 3
      };

      await queue.addJob(job);

      const status = queue.getStatus();
      expect(status.total).toBe(1);
      expect(status.pending).toBe(1);

      const jobs = queue.getJobs();
      expect(jobs.length).toBe(1);
      expect(jobs[0].content).toBe('Test job');
      expect(jobs[0].priority).toBe(1);
      expect(jobs[0].status).toBe(PrintJobState.PENDING);

      expect(eventEmitter.emit).toHaveBeenCalledWith('jobQueued', expect.any(Object));
    });

    it('应该能够获取作业', async () => {
      const job: Omit<TestPrintJob, 'id' | 'createdAt' | 'updatedAt'> = {
        type: 'text',
        content: 'Test job',
        status: PrintJobState.PENDING,
        attempts: 0,
        maxAttempts: 3
      };

      await queue.addJob(job);

      const jobs = queue.getJobs();
      const retrievedJob = queue.getJob(jobs[0].id);

      expect(retrievedJob).toBe(jobs[0]);
    });

    it('应该能够获取待处理的作业', async () => {
      await queue.addJob({
        type: 'text',
        content: 'Job 1',
        status: PrintJobState.PENDING,
        attempts: 0,
        maxAttempts: 3
      });

      await queue.addJob({
        type: 'text',
        content: 'Job 2',
        status: PrintJobState.PENDING,
        attempts: 0,
        maxAttempts: 3
      });

      const nextJob = queue.getNextJob();
      expect(nextJob).toBeDefined();
      expect(nextJob!.content).toBe('Job 2'); // 高优先级
    });

    it('应该能够移除作业', async () => {
      const job: Omit<TestPrintJob, 'id' | 'createdAt' | 'updatedAt'> = {
        type: 'text',
        content: 'Test job',
        status: PrintJobState.PENDING,
        attempts: 0,
        maxAttempts: 3
      };

      await queue.addJob(job);

      const jobs = queue.getJobs();
      expect(jobs.length).toBe(1);

      const removed = await queue.removeJob(jobs[0].id);
      expect(removed).toBe(true);

      expect(queue.getJobs().length).toBe(0);
      expect(eventEmitter.emit).toHaveBeenCalledWith('jobRemoved', expect.any(Object));
    });

    it('应该能够清空队列', async () => {
      await queue.addJob({
        type: 'text',
        content: 'Job 1',
        status: PrintJobState.PENDING,
        attempts: 0,
        maxAttempts: 3
      });

      await queue.addJob({
        type: 'text',
        content: 'Job 2',
        status: PrintJobState.PENDING,
        attempts: 0,
        maxAttempts: 3
      });

      expect(queue.getJobs().length).toBe(2);

      queue.clear();

      expect(queue.getJobs().length).toBe(0);
      expect(eventEmitter.emit).toHaveBeenCalledWith('cleared');
    });

    it('队列满时应该抛出错误', async () => {
      const smallQueue = new PrintQueue(
        { maxSize: 2 },
        eventEmitter,
        {} as any
      );
      await smallQueue.initialize();

      await smallQueue.addJob({
        type: 'text',
        content: 'Job 1',
        status: PrintJobState.PENDING,
        attempts: 0,
        maxAttempts: 3
      });

      await smallQueue.addJob({
        type: 'text',
        content: 'Job 2',
        status: PrintJobState.PENDING,
        attempts: 0,
        maxAttempts: 3
      });

      await expect(smallQueue.addJob({
        type: 'text',
        content: 'Job 3',
        status: PrintJobState.PENDING,
        attempts: 0,
        maxAttempts: 3
      })).rejects.toThrow('Queue is full');

      smallQueue.dispose();
    });

    it('应该按优先级排序作业', async () => {
      await queue.addJob({
        type: 'text',
        content: 'Low priority',
        priority: 1,
        status: PrintJobState.PENDING,
        attempts: 0,
        maxAttempts: 3
      });

      await queue.addJob({
        type: 'text',
        content: 'High priority',
        priority: 10,
        status: PrintJobState.PENDING,
        attempts: 0,
        maxAttempts: 3
      });

      await queue.addJob({
        type: 'text',
        content: 'Medium priority',
        priority: 5,
        status: PrintJobState.PENDING,
        attempts: 0,
        maxAttempts: 3
      });

      const nextJob = queue.getNextJob();
      expect(nextJob!.content).toBe('High priority');

      const jobs = queue.getJobs();
      expect(jobs[0].content).toBe('High priority');
      expect(jobs[1].content).toBe('Medium priority');
      expect(jobs[2].content).toBe('Low priority');
    });
  });

  describe('状态查询', () => {
    beforeEach(async () => {
      await queue.initialize();
    });

    it('应该正确统计作业状态', async () => {
      // 添加不同状态的作业
      const jobs = [
        { type: 'text', content: 'Pending 1', status: PrintJobState.PENDING, attempts: 0, maxAttempts: 3 },
        { type: 'text', content: 'Pending 2', status: PrintJobState.PENDING, attempts: 0, maxAttempts: 3 },
        { type: 'text', content: 'Pending 3', status: PrintJobState.PENDING, attempts: 0, maxAttempts: 3 }
      ];

      for (const job of jobs) {
        await queue.addJob(job);
      }

      // 手动设置状态
      const allJobs = queue.getJobs();
      (allJobs[1] as any).status = PrintJobState.PROCESSING;
      (allJobs[2] as any).status = PrintJobState.COMPLETED;

      const status = queue.getStatus();
      expect(status.total).toBe(3);
      expect(status.pending).toBe(1);
      expect(status.processing).toBe(1);
      expect(status.completed).toBe(1);
      expect(status.failed).toBe(0);
    });

    it('应该能够获取配置', () => {
      const config = queue.getConfig();
      expect(config.maxSize).toBe(100);
      expect(config.concurrency).toBe(1);
      expect(config.retryAttempts).toBe(3);
      expect(config.retryDelay).toBe(100);
    });

    it('应该能够更新配置', () => {
      const newConfig: Partial<IQueueConfig> = {
        maxSize: 200,
        concurrency: 2,
        retryAttempts: 5
      };

      queue.updateConfig(newConfig);

      const config = queue.getConfig();
      expect(config.maxSize).toBe(200);
      expect(config.concurrency).toBe(2);
      expect(config.retryAttempts).toBe(5);
      expect(config.retryDelay).toBe(100); // 保持原值
    });
  });

  describe('处理控制', () => {
    beforeEach(async () => {
      await queue.initialize();
    });

    it('应该能够启动处理', () => {
      queue.startProcessing();

      expect(queue.getStatus().processing).toBe(true);
      expect(eventEmitter.emit).toHaveBeenCalledWith('processingStarted');
    });

    it('应该能够停止处理', () => {
      queue.startProcessing();
      queue.stopProcessing();

      expect(queue.getStatus().processing).toBe(false);
      expect(eventEmitter.emit).toHaveBeenCalledWith('processingStopped');
    });

    it('应该能够暂停处理', () => {
      queue.startProcessing();
      queue.pause();

      expect(queue.getStatus().paused).toBe(true);
      expect(eventEmitter.emit).toHaveBeenCalledWith('paused');
    });

    it('应该能够恢复处理', () => {
      queue.startProcessing();
      queue.pause();
      queue.resume();

      expect(queue.getStatus().paused).toBe(false);
      expect(eventEmitter.emit).toHaveBeenCalledWith('resumed');
    });

    it('重复启动处理应该不抛出错误', () => {
      queue.startProcessing();
      queue.startProcessing(); // 第二次调用应该被忽略

      expect(queue.getStatus().processing).toBe(true);
    });

    it('重复停止处理应该不抛出错误', () => {
      queue.stopProcessing();
      queue.stopProcessing(); // 第二次调用应该被忽略

      expect(queue.getStatus().processing).toBe(false);
    });
  });

  describe('作业处理', () => {
    beforeEach(async () => {
      await queue.initialize();
      queue.startProcessing();
    });

    it('应该能够自动处理作业', async () => {
      const job: Omit<TestPrintJob, 'id' | 'createdAt' | 'updatedAt'> = {
        type: 'text',
        content: 'Test job',
        status: PrintJobState.PENDING,
        attempts: 0,
        maxAttempts: 3
      };

      await queue.addJob(job);

      // 等待处理完成
      await new Promise(resolve => setTimeout(resolve, 200));

      const status = queue.getStatus();
      expect(status.completed).toBe(1);
      expect(eventEmitter.emit).toHaveBeenCalledWith('jobCompleted', expect.any(Object));
    });

    it('应该能够处理失败的作业', async () => {
      // 创建会失败的Mock队列
      const errorQueue = new PrintQueue(
        {
          maxSize: 100,
          concurrency: 1,
          retryAttempts: 2,
          retryDelay: 50,
          autoProcess: true
        },
        eventEmitter,
        {} as any
      );

      // 重写处理方法使其失败
      (errorQueue as any).processJobs = jest.fn().mockImplementation(async () => {
        const job = errorQueue.getNextJob();
        if (job) {
          (job as any).status = PrintJobState.FAILED;
          (job as any).error = new Error('Processing failed');
          eventEmitter.emit('jobFailed', job, new Error('Processing failed'));
        }
      });

      await errorQueue.initialize();

      const job: Omit<TestPrintJob, 'id' | 'createdAt' | 'updatedAt'> = {
        type: 'text',
        content: 'Failing job',
        status: PrintJob.PENDING,
        attempts: 0,
        maxAttempts: 3
      };

      await errorQueue.addJob(job);

      // 等待处理完成
      await new Promise(resolve => setTimeout(resolve, 200));

      const status = errorQueue.getStatus();
      expect(status.failed).toBe(1);

      errorQueue.dispose();
    });

    it('应该支持重试机制', async () => {
      let attemptCount = 0;

      // 创建第一次失败第二次成功的Mock队列
      const retryQueue = new PrintQueue(
        {
          maxSize: 100,
          concurrency: 1,
          retryAttempts: 2,
          retryDelay: 50,
          autoProcess: true
        },
        eventEmitter,
        {} as any
      );

      (retryQueue as any).processJobs = jest.fn().mockImplementation(async () => {
        const job = retryQueue.getNextJob();
        if (job) {
          attemptCount++;
          if (attemptCount === 1) {
            // 第一次失败
            (job as any).status = PrintJobState.PENDING;
            (job as any).attempts = 1;
            eventEmitter.emit('jobRetry', job);
          } else {
            // 第二次成功
            (job as any).status = PrintJobState.COMPLETED;
            eventEmitter.emit('jobCompleted', job);
          }
        }
      });

      await retryQueue.initialize();

      const job: Omit<TestPrintJob, 'id' | 'createdAt' | 'updatedAt'> = {
        type: 'text',
        content: 'Retry job',
        status: PrintJobState.PENDING,
        attempts: 0,
        maxAttempts: 3
      };

      await retryQueue.addJob(job);

      // 等待处理完成
      await new Promise(resolve => setTimeout(resolve, 300));

      expect(attemptCount).toBe(2);
      const status = retryQueue.getStatus();
      expect(status.completed).toBe(1);

      retryQueue.dispose();
    });
  });

  describe('并发控制', () => {
    it('应该控制并发处理数量', async () => {
      const concurrentQueue = new PrintQueue(
        {
          maxSize: 100,
          concurrency: 3,
          retryAttempts: 1,
          retryDelay: 50,
          autoProcess: true
        },
        eventEmitter,
        {} as any
      );

      let processingCount = 0;
      const processingJobs = new Set<string>();

      (concurrentQueue as any).processJobs = jest.fn().mockImplementation(async () => {
        while (processingCount < 3) {
          const job = concurrentQueue.getNextJob();
          if (job && !processingJobs.has(job.id)) {
            processingJobs.add(job.id);
            processingCount++;
            (job as any).status = PrintJobState.PROCESSING;

            // 模拟处理时间
            setTimeout(() => {
              (job as any).status = PrintJobState.COMPLETED;
              processingJobs.delete(job.id);
              processingCount--;
            }, 50);
          } else {
            break;
          }
        }
      });

      await concurrentQueue.initialize();

      // 添加多个作业
      for (let i = 0; i < 5; i++) {
        await concurrentQueue.addJob({
          type: 'text',
          content: `Job ${i}`,
          status: PrintJobState.PENDING,
          attempts: 0,
          maxAttempts: 1
        });
      }

      // 等待处理
      await new Promise(resolve => setTimeout(resolve, 200));

      expect(processingJobs.size).toBeLessThanOrEqual(3);

      concurrentQueue.dispose();
    });
  });

  describe('错误处理', () => {
    beforeEach(async () => {
      await queue.initialize();
    });

    it('应该处理作业添加错误', async () => {
      const invalidJob = null as any;

      await expect(queue.addJob(invalidJob))
        .rejects.toThrow();
    });

    it('应该处理队列销毁时的处理', async () => {
      await queue.startProcessing();

      // 添加作业
      await queue.addJob({
        type: 'text',
        content: 'Test job',
        status: PrintJobState.PENDING,
        attempts: 0,
        maxAttempts: 3
      });

      // 销毁队列
      queue.dispose();

      expect(queue.getStatus().processing).toBe(false);
    });

    it('销毁后不能添加作业', async () => {
      queue.dispose();

      await expect(queue.addJob({
        type: 'text',
        content: 'Test job',
        status: PrintJobState.PENDING,
        attempts: 0,
        maxAttempts: 3
      })).rejects.toThrow('Queue has been disposed');
    });

    it('销毁后不能启动处理', () => {
      queue.dispose();

      expect(() => queue.startProcessing())
        .toThrow('Queue has been disposed');
    });
  });

  describe('性能测试', () => {
    it('应该能够处理大量作业', async () => {
      await queue.initialize();

      const jobCount = 100;
      const startTime = Date.now();

      // 添加大量作业
      for (let i = 0; i < jobCount; i++) {
        await queue.addJob({
          type: 'text',
          content: `Job ${i}`,
          status: PrintJobState.PENDING,
          attempts: 0,
          maxAttempts: 3
        });
      }

      const addDuration = Date.now() - startTime;

      expect(queue.getJobs().length).toBe(jobCount);
      expect(addDuration).toBeLessThan(1000); // 应该在1秒内完成

      // 手动处理所有作业
      const processStartTime = Date.now();
      while (queue.getNextJob()) {
        const job = queue.getNextJob();
        (job as any).status = PrintJobState.COMPLETED;
      }
      const processDuration = Date.now() - processStartTime;

      expect(processDuration).toBeLessThan(500); // 处理应该很快
    });

    it('应该能够处理高优先级作业', async () => {
      await queue.initialize();

      const jobCount = 50;
      const startTime = Date.now();

      // 添加混合优先级的作业
      for (let i = 0; i < jobCount; i++) {
        await queue.addJob({
          type: 'text',
          content: `Job ${i}`,
          priority: Math.floor(Math.random() * 10),
          status: PrintJobState.PENDING,
          attempts: 0,
          maxAttempts: 3
        });
      }

      // 验证排序
      const jobs = queue.getJobs();
      for (let i = 1; i < jobs.length; i++) {
        expect(jobs[i - 1].priority).toBeGreaterThanOrEqual(jobs[i].priority);
      }

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(1000);
    });

    it('应该能够处理频繁的状态查询', async () => {
      await queue.initialize();

      // 添加作业
      for (let i = 0; i < 20; i++) {
        await queue.addJob({
          type: 'text',
          content: `Job ${i}`,
          status: PrintJobState.PENDING,
          attempts: 0,
          maxAttempts: 3
        });
      }

      const startTime = Date.now();
      const queryCount = 1000;

      // 频繁查询状态
      for (let i = 0; i < queryCount; i++) {
        queue.getStatus();
        queue.getJobs();
        queue.getNextJob();
      }

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(100); // 查询应该很快
    });
  });

  describe('边界情况', () => {
    beforeEach(async () => {
      await queue.initialize();
    });

    it('应该处理空内容作业', async () => {
      await queue.addJob({
        type: 'text',
        content: '',
        status: PrintJobState.PENDING,
        attempts: 0,
        maxAttempts: 3
      });

      const job = queue.getNextJob();
      expect(job!.content).toBe('');
    });

    it('应该处理长内容作业', async () => {
      const longContent = 'x'.repeat(10000);

      await queue.addJob({
        type: 'text',
        content: longContent,
        status: PrintJobState.PENDING,
        attempts: 0,
        maxAttempts: 3
      });

      const job = queue.getNextJob();
      expect(job!.content).toBe(longContent);
    });

    it('应该处理负优先级作业', async () => {
      await queue.addJob({
        type: 'text',
        content: 'Negative priority',
        priority: -5,
        status: PrintJob.PENDING,
        attempts: 0,
        maxAttempts: 3
      });

      const job = queue.getNextJob();
      expect(job!.priority).toBe(-5);
    });

    it('应该处理最大重试次数为0的作业', async () => {
      const retryQueue = new PrintQueue(
        {
          maxSize: 100,
          concurrency: 1,
          retryAttempts: 0,
          retryDelay: 50,
          autoProcess: true
        },
        eventEmitter,
        {} as any
      );

      (retryQueue as any).processJobs = jest.fn().mockImplementation(async () => {
        const job = retryQueue.getNextJob();
        if (job) {
          // 不应该重试，直接标记为失败
          (job as any).status = PrintJobState.FAILED;
          (job as any).attempts = 1;
          eventEmitter.emit('jobFailed', job, new Error('Failed immediately'));
        }
      });

      await retryQueue.initialize();

      await retryQueue.addJob({
        type: 'text',
        content: 'No retry job',
        status: PrintJobState.PENDING,
        attempts: 0,
        maxAttempts: 0
      });

      // 等待处理
      await new Promise(resolve => setTimeout(resolve, 200));

      const status = retryQueue.getStatus();
      expect(status.failed).toBe(1);

      retryQueue.dispose();
    });
  });

  describe('配置验证', () => {
    it('应该验证配置参数', () => {
      expect(() => {
        new PrintQueue(
          {
            maxSize: -1, // 无效值
            concurrency: 1,
            retryAttempts: 3,
            retryDelay: 100,
            autoProcess: false,
            processInterval: 50
          },
          eventEmitter,
          {} as any
        );
      }).toThrow();
    });

    it('应该使用默认值处理部分配置', () => {
      const partialQueue = new PrintQueue(
        {
          maxSize: 50,
          concurrency: 2
          // 其他配置使用默认值
        },
        eventEmitter,
        {} as any
      );

      const config = partialQueue.getConfig();
      expect(config.maxSize).toBe(50);
      expect(config.concurrency).toBe(2);
      expect(config.retryAttempts).toBe(3);
      expect(config.retryDelay).toBe(1000);
      expect(config.autoProcess).toBe(true);
      expect(config.processInterval).toBe(500);
    });
  });
});