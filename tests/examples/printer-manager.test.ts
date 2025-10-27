/**
 * 打印机管理器测试示例
 */

import { PrinterManager } from '../../src/printer/PrinterManager';
import { PrinterType, PrintJobStatus } from '../../src/printer/PrinterTypes';
import { createMockPrinterConfig, createMockPrintJob, waitFor } from '../utils/test-utils';

describe('PrinterManager', () => {
  let manager: PrinterManager;

  beforeEach(() => {
    manager = new PrinterManager();
  });

  afterEach(() => {
    manager.destroy();
  });

  describe('打印机管理', () => {
    it('应该成功添加打印机', async () => {
      const config = createMockPrinterConfig();
      const result = await manager.addPrinter(config);

      expect(result).toBe(true);
      expect(manager.getPrinters()).toContainEqual(expect.objectContaining(config));
    });

    it('应该验证打印机配置', async () => {
      const invalidConfig = createMockPrinterConfig({ name: '' });

      await expect(manager.addPrinter(invalidConfig)).rejects.toThrow('打印机名称不能为空');
    });

    it('应该移除打印机', async () => {
      const config = createMockPrinterConfig();
      await manager.addPrinter(config);

      const result = await manager.removePrinter(config.name);
      expect(result).toBe(true);
      expect(manager.getPrinters()).not.toContainEqual(expect.objectContaining(config));
    });

    it('应该设置当前打印机', async () => {
      const config = createMockPrinterConfig();
      await manager.addPrinter(config);

      const result = await manager.setCurrentPrinter(config.name);
      expect(result).toBe(true);
      expect(manager.getCurrentPrinter()).toEqual(expect.objectContaining(config));
    });

    it('设置不存在的打印机应该失败', async () => {
      await expect(manager.setCurrentPrinter('non-existent-printer')).rejects.toThrow('打印机不存在');
    });
  });

  describe('打印作业管理', () => {
    let printerConfig: any;

    beforeEach(async () => {
      printerConfig = createMockPrinterConfig();
      await manager.addPrinter(printerConfig);
      await manager.setCurrentPrinter(printerConfig.name);
    });

    it('应该创建打印作业', async () => {
      const jobData = { text: 'Test Print Content' };
      const job = await manager.createPrintJob(jobData);

      expect(job).toMatchObject({
        id: expect.any(String),
        data: jobData,
        status: PrintJobStatus.PENDING,
        createdAt: expect.any(Date)
      });
    });

    it('应该执行打印作业', async () => {
      const job = await manager.createPrintJob({ text: 'Test Print' });
      const result = await manager.executePrintJob(job.id);

      expect(result).toBe(true);
      expect(manager.getJobStatus(job.id)).toBe(PrintJobStatus.COMPLETED);
    });

    it('应该取消打印作业', async () => {
      const job = await manager.createPrintJob({ text: 'Test Print' });
      const result = await manager.cancelPrintJob(job.id);

      expect(result).toBe(true);
      expect(manager.getJobStatus(job.id)).toBe(PrintJobStatus.CANCELLED);
    });

    it('应该获取作业列表', async () => {
      await manager.createPrintJob({ text: 'Job 1' });
      await manager.createPrintJob({ text: 'Job 2' });
      await manager.createPrintJob({ text: 'Job 3' });

      const jobs = manager.getJobs();
      expect(jobs).toHaveLength(3);
    });

    it('应该按状态过滤作业', async () => {
      const job1 = await manager.createPrintJob({ text: 'Job 1' });
      const job2 = await manager.createPrintJob({ text: 'Job 2' });
      const job3 = await manager.createPrintJob({ text: 'Job 3' });

      await manager.executePrintJob(job1.id);
      await manager.cancelPrintJob(job2.id);

      const completedJobs = manager.getJobs({ status: PrintJobStatus.COMPLETED });
      const cancelledJobs = manager.getJobs({ status: PrintJobStatus.CANCELLED });
      const pendingJobs = manager.getJobs({ status: PrintJobStatus.PENDING });

      expect(completedJobs).toHaveLength(1);
      expect(cancelledJobs).toHaveLength(1);
      expect(pendingJobs).toHaveLength(1);
    });
  });

  describe('模板系统', () => {
    beforeEach(async () => {
      const printerConfig = createMockPrinterConfig();
      await manager.addPrinter(printerConfig);
      await manager.setCurrentPrinter(printerConfig.name);
    });

    it('应该注册打印模板', () => {
      const template = {
        name: 'receipt',
        template: 'Receipt: {{date}}\\n{{items}}\\nTotal: {{total}}',
        defaultData: {
          date: new Date().toISOString(),
          items: [],
          total: 0
        }
      };

      const result = manager.registerTemplate(template);
      expect(result).toBe(true);
      expect(manager.getTemplate('receipt')).toEqual(template);
    });

    it('应该使用模板打印', async () => {
      const template = {
        name: 'simple',
        template: 'Hello {{name}}!',
        defaultData: { name: 'World' }
      };

      manager.registerTemplate(template);

      const job = await manager.printWithTemplate('simple', { name: 'Test User' });
      expect(job.data).toContain('Hello Test User!');
    });

    it('模板数据验证', async () => {
      const template = {
        name: 'validation',
        template: 'Price: {{price}}',
        defaultData: { price: 0 },
        validators: {
          price: (value: number) => value >= 0 || 'Price must be non-negative'
        }
      };

      manager.registerTemplate(template);

      await expect(manager.printWithTemplate('validation', { price: -10 }))
        .rejects.toThrow('Price must be non-negative');
    });
  });

  describe('队列管理', () => {
    beforeEach(async () => {
      const printerConfig = createMockPrinterConfig();
      await manager.addPrinter(printerConfig);
      await manager.setCurrentPrinter(printerConfig.name);
    });

    it('应该按顺序处理作业', async () => {
      const job1 = await manager.createPrintJob({ text: 'First' });
      const job2 = await manager.createPrintJob({ text: 'Second' });
      const job3 = await manager.createPrintJob({ text: 'Third' });

      // 启动队列处理
      manager.startQueue();

      // 等待所有作业完成
      await waitFor(() =>
        manager.getJobStatus(job1.id) === PrintJobStatus.COMPLETED &&
        manager.getJobStatus(job2.id) === PrintJobStatus.COMPLETED &&
        manager.getJobStatus(job3.id) === PrintJobStatus.COMPLETED
      );

      const completedJobs = manager.getJobs({ status: PrintJobStatus.COMPLETED });
      expect(completedJobs).toHaveLength(3);
    });

    it('应该暂停和恢复队列', async () => {
      const job1 = await manager.createPrintJob({ text: 'Job 1' });
      const job2 = await manager.createPrintJob({ text: 'Job 2' });

      manager.startQueue();
      manager.pauseQueue();

      // 等待一段时间，确保第一个作业完成但第二个被暂停
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(manager.getJobStatus(job1.id)).toBe(PrintJobStatus.COMPLETED);
      expect(manager.getJobStatus(job2.id)).toBe(PrintJobStatus.PENDING);

      manager.resumeQueue();

      await waitFor(() => manager.getJobStatus(job2.id) === PrintJobStatus.COMPLETED);
    });

    it('应该清除队列', async () => {
      await manager.createPrintJob({ text: 'Job 1' });
      await manager.createPrintJob({ text: 'Job 2' });
      await manager.createPrintJob({ text: 'Job 3' });

      manager.clearQueue();

      const pendingJobs = manager.getJobs({ status: PrintJobStatus.PENDING });
      expect(pendingJobs).toHaveLength(0);
    });
  });

  describe('错误处理', () => {
    it('应该处理打印机离线', async () => {
      const printerConfig = createMockPrinterConfig();
      await manager.addPrinter(printerConfig);
      await manager.setCurrentPrinter(printerConfig.name);

      // 模拟打印机离线
      manager.simulatePrinterOffline();

      const job = await manager.createPrintJob({ text: 'Test' });
      await expect(manager.executePrintJob(job.id)).rejects.toThrow('打印机离线');
    });

    it('应该处理打印失败', async () => {
      const printerConfig = createMockPrinterConfig();
      await manager.addPrinter(printerConfig);
      await manager.setCurrentPrinter(printerConfig.name);

      // 模拟打印失败
      manager.simulatePrintFailure();

      const job = await manager.createPrintJob({ text: 'Test' });
      await expect(manager.executePrintJob(job.id)).rejects.toThrow('打印失败');

      expect(manager.getJobStatus(job.id)).toBe(PrintJobStatus.FAILED);
    });

    it('应该重试失败的作业', async () => {
      const printerConfig = createMockPrinterConfig();
      await manager.addPrinter(printerConfig);
      await manager.setCurrentPrinter(printerConfig.name);

      // 第一次尝试失败
      manager.simulatePrintFailure();

      const job = await manager.createPrintJob({ text: 'Test' });
      await expect(manager.executePrintJob(job.id)).rejects.toThrow('打印失败');

      // 移除失败模拟
      manager.clearSimulation();

      // 重试应该成功
      const result = await manager.retryPrintJob(job.id);
      expect(result).toBe(true);
      expect(manager.getJobStatus(job.id)).toBe(PrintJobStatus.COMPLETED);
    });
  });

  describe('事件系统', () => {
    it('应该触发作业状态变更事件', async () => {
      const printerConfig = createMockPrinterConfig();
      await manager.addPrinter(printerConfig);
      await manager.setCurrentPrinter(printerConfig.name);

      const statusListener = jest.fn();
      manager.on('jobStatusChanged', statusListener);

      const job = await manager.createPrintJob({ text: 'Test' });
      await manager.executePrintJob(job.id);

      expect(statusListener).toHaveBeenCalledWith(
        expect.objectContaining({
          jobId: job.id,
          oldStatus: PrintJobStatus.PENDING,
          newStatus: PrintJobStatus.COMPLETED
        })
      );
    });

    it('应该触发队列事件', async () => {
      const queueListener = jest.fn();
      manager.on('queueStarted', queueListener);

      manager.startQueue();

      expect(queueListener).toHaveBeenCalled();
    });
  });

  describe('性能测试', () => {
    it('应该支持大量并发作业', async () => {
      const printerConfig = createMockPrinterConfig();
      await manager.addPrinter(printerConfig);
      await manager.setCurrentPrinter(printerConfig.name);

      const jobCount = 100;
      const startTime = performance.now();

      // 创建大量作业
      const jobs = await Promise.all(
        Array.from({ length: jobCount }, (_, i) =>
          manager.createPrintJob({ text: `Job ${i}` })
        )
      );

      const createEndTime = performance.now();
      const createTime = createEndTime - startTime;

      // 执行所有作业
      manager.startQueue();

      await waitFor(() => {
        const completedJobs = manager.getJobs({ status: PrintJobStatus.COMPLETED });
        return completedJobs.length === jobCount;
      });

      const executeEndTime = performance.now();
      const executeTime = executeEndTime - createEndTime;

      expect(createTime).toBeLessThan(1000); // 创建时间小于1秒
      expect(executeTime).toBeLessThan(10000); // 执行时间小于10秒
    });

    it('内存使用应该保持稳定', async () => {
      const printerConfig = createMockPrinterConfig();
      await manager.addPrinter(printerConfig);
      await manager.setCurrentPrinter(printerConfig.name);

      const initialMemory = process.memoryUsage().heapUsed;

      // 创建和执行大量作业
      for (let i = 0; i < 1000; i++) {
        const job = await manager.createPrintJob({ text: `Job ${i}` });
        await manager.executePrintJob(job.id);
      }

      // 强制垃圾回收（如果可用）
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // 内存增长应该在合理范围内（小于50MB）
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });
  });
});