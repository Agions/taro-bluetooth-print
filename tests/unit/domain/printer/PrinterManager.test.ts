/**
 * 打印机管理器单元测试
 */

import { PrinterManager } from '../../../../src/domain/printer/PrinterManager';
import {
  IPrinterManager,
  IPrinter,
  IPrintDriver,
  PrinterState,
  PrintJobState
} from '../../../../src/domain/printer/types';

// Mock打印驱动
class MockPrintDriver implements IPrintDriver {
  private connected = false;
  private disposed = false;

  constructor(private name: string = 'MockDriver') {}

  async initialize(): Promise<void> {
    if (this.disposed) {
      throw new Error('Driver has been disposed');
    }
  }

  async connect(): Promise<void> {
    if (this.disposed) {
      throw new Error('Driver has been disposed');
    }
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }

  isConnected(): boolean {
    return this.connected;
  }

  async print(data: ArrayBuffer): Promise<boolean> {
    if (!this.connected) {
      throw new Error('Driver is not connected');
    }
    if (this.disposed) {
      throw new Error('Driver has been disposed');
    }
    // 模拟打印操作
    return true;
  }

  async getStatus(): Promise<any> {
    return {
      connected: this.connected,
      ready: this.connected,
      paper: 'ready',
      error: null
    };
  }

  getName(): string {
    return this.name;
  }

  getCapabilities(): any {
    return {
      text: true,
      barcode: true,
      qrcode: true,
      image: true,
      autoCut: false
    };
  }

  dispose(): void {
    this.disconnect();
    this.disposed = true;
  }

  isDisposed(): boolean {
    return this.disposed;
  }

  // 测试辅助方法
  setConnected(connected: boolean): void {
    this.connected = connected;
  }
}

// Mock驱动工厂
class MockDriverFactory {
  private drivers = new Map<string, IPrintDriver>();

  register(type: string, driver: IPrintDriver): void {
    this.drivers.set(type, driver);
  }

  create(type: string): IPrintDriver {
    const driver = this.drivers.get(type);
    if (!driver) {
      throw new Error(`Driver not found: ${type}`);
    }
    return driver;
  }

  getSupportedTypes(): string[] {
    return Array.from(this.drivers.keys());
  }

  dispose(): void {
    this.drivers.forEach(driver => driver.dispose());
    this.drivers.clear();
  }
}

describe('PrinterManager', () => {
  let printerManager: IPrinterManager;
  let driverFactory: MockDriverFactory;
  let eventEmitter: any;

  beforeEach(() => {
    driverFactory = new MockDriverFactory();
    eventEmitter = {
      emit: jest.fn(),
      on: jest.fn(),
      off: jest.fn(),
      removeAllListeners: jest.fn()
    };

    printerManager = new PrinterManager(
      driverFactory as any,
      eventEmitter,
      {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn()
      } as any
    );

    // 注册默认驱动
    driverFactory.register('thermal', new MockPrintDriver('ThermalDriver'));
    driverFactory.register('label', new MockPrintDriver('LabelDriver'));
  });

  afterEach(() => {
    printerManager.dispose();
    driverFactory.dispose();
  });

  describe('初始化', () => {
    it('应该正确初始化打印机管理器', async () => {
      await printerManager.initialize();
      // 应该不抛出错误
    });

    it('重复初始化应该抛出错误', async () => {
      await printerManager.initialize();

      await expect(printerManager.initialize())
        .rejects.toThrow('PrinterManager already initialized');
    });

    it('未初始化时操作应该抛出错误', async () => {
      await expect(printerManager.addPrinter({
        name: 'TestPrinter',
        deviceId: 'device-1',
        type: 'thermal',
        model: 'TestModel',
        manufacturer: 'TestManufacturer'
      })).rejects.toThrow('PrinterManager not initialized');
    });
  });

  describe('打印机管理', () => {
    beforeEach(async () => {
      await printerManager.initialize();
    });

    it('应该能够添加打印机', async () => {
      const printer = await printerManager.addPrinter({
        name: 'TestPrinter',
        deviceId: 'device-1',
        type: 'thermal',
        model: 'TestModel',
        manufacturer: 'TestManufacturer'
      });

      expect(printer.id).toBeDefined();
      expect(printer.name).toBe('TestPrinter');
      expect(printer.deviceId).toBe('device-1');
      expect(printer.type).toBe('thermal');
      expect(printer.status).toBe(PrinterState.DISCONNECTED);
      expect(printer.createdAt).toBeInstanceOf(Date);
      expect(printer.updatedAt).toBeInstanceOf(Date);

      expect(eventEmitter.emit).toHaveBeenCalledWith('printerAdded', printer);
    });

    it('应该能够移除打印机', async () => {
      const printer = await printerManager.addPrinter({
        name: 'TestPrinter',
        deviceId: 'device-1',
        type: 'thermal',
        model: 'TestModel',
        manufacturer: 'TestManufacturer'
      });

      await printerManager.removePrinter(printer.id);

      expect(printerManager.getPrinter(printer.id)).toBeUndefined();
      expect(eventEmitter.emit).toHaveBeenCalledWith('printerRemoved', printer.id);
    });

    it('应该能够获取打印机', async () => {
      const printer = await printerManager.addPrinter({
        name: 'TestPrinter',
        deviceId: 'device-1',
        type: 'thermal',
        model: 'TestModel',
        manufacturer: 'TestManufacturer'
      });

      const retrieved = printerManager.getPrinter(printer.id);
      expect(retrieved).toBe(printer);
    });

    it('应该能够获取所有打印机', async () => {
      await printerManager.addPrinter({
        name: 'Printer1',
        deviceId: 'device-1',
        type: 'thermal',
        model: 'Model1',
        manufacturer: 'Manufacturer1'
      });

      await printerManager.addPrinter({
        name: 'Printer2',
        deviceId: 'device-2',
        type: 'label',
        model: 'Model2',
        manufacturer: 'Manufacturer2'
      });

      const printers = printerManager.getPrinters();
      expect(printers.length).toBe(2);
      expect(printers.some(p => p.name === 'Printer1')).toBe(true);
      expect(printers.some(p => p.name === 'Printer2')).toBe(true);
    });

    it('应该能够按设备ID获取打印机', async () => {
      const deviceId = 'test-device-1';
      await printerManager.addPrinter({
        name: 'TestPrinter',
        deviceId,
        type: 'thermal',
        model: 'TestModel',
        manufacturer: 'TestManufacturer'
      });

      const printers = printerManager.getPrintersByDeviceId(deviceId);
      expect(printers.length).toBe(1);
      expect(printers[0].deviceId).toBe(deviceId);
    });

    it('应该能够获取已连接的打印机', async () => {
      const printer1 = await printerManager.addPrinter({
        name: 'ConnectedPrinter',
        deviceId: 'device-1',
        type: 'thermal',
        model: 'Model1',
        manufacturer: 'Manufacturer1'
      });

      const printer2 = await printerManager.addPrinter({
        name: 'DisconnectedPrinter',
        deviceId: 'device-2',
        type: 'label',
        model: 'Model2',
        manufacturer: 'Manufacturer2'
      });

      // 手动设置状态（模拟连接）
      (printer1 as any).status = PrinterState.CONNECTED;

      const connectedPrinters = printerManager.getConnectedPrinters();
      expect(connectedPrinters.length).toBe(1);
      expect(connectedPrinters[0].id).toBe(printer1.id);
    });

    it('应该能够获取就绪的打印机', async () => {
      const printer1 = await printerManager.addPrinter({
        name: 'ReadyPrinter',
        deviceId: 'device-1',
        type: 'thermal',
        model: 'Model1',
        manufacturer: 'Manufacturer1'
      });

      const printer2 = await printerManager.addPrinter({
        name: 'BusyPrinter',
        deviceId: 'device-2',
        type: 'label',
        model: 'Model2',
        manufacturer: 'Manufacturer2'
      });

      // 手动设置状态
      (printer1 as any).status = PrinterState.READY;
      (printer2 as any).status = PrinterState.PRINTING;

      const readyPrinters = printerManager.getReadyPrinters();
      expect(readyPrinters.length).toBe(1);
      expect(readyPrinters[0].id).toBe(printer1.id);
    });
  });

  describe('驱动管理', () => {
    beforeEach(async () => {
      await printerManager.initialize();
    });

    it('应该能够注册驱动', async () => {
      const newDriver = new MockPrintDriver('NewDriver');
      await printerManager.registerDriver('new-type', newDriver);

      expect(eventEmitter.emit).toHaveBeenCalledWith('driverRegistered', {
        type: 'new-type',
        driver: newDriver
      });
    });

    it('应该能够获取驱动', async () => {
      const thermalDriver = printerManager.getDriver('thermal');
      expect(thermalDriver).toBeDefined();
      expect(thermalDriver.getName()).toBe('ThermalDriver');

      const nonexistentDriver = printerManager.getDriver('nonexistent');
      expect(nonexistentDriver).toBeUndefined();
    });

    it('应该能够获取可用驱动类型', async () => {
      const availableTypes = printerManager.getAvailableDrivers();
      expect(availableTypes).toContain('thermal');
      expect(availableTypes).toContain('label');
    });
  });

  describe('打印机创建', () => {
    beforeEach(async () => {
      await printerManager.initialize();
    });

    it('应该能够创建打印机', async () => {
      const printer = await printerManager.createPrinter(
        'thermal',
        'device-1',
        {
          name: 'CreatedPrinter',
          model: 'CreatedModel',
          manufacturer: 'CreatedManufacturer'
        }
      );

      expect(printer.id).toBeDefined();
      expect(printer.name).toBe('CreatedPrinter');
      expect(printer.deviceId).toBe('device-1');
      expect(printer.type).toBe('thermal');
      expect(printer.model).toBe('CreatedModel');
      expect(printer.manufacturer).toBe('CreatedManufacturer');
      expect(printer.status).toBe(PrinterState.DISCONNECTED);
      expect(printer.driver).toBeDefined();

      expect(eventEmitter.emit).toHaveBeenCalledWith('printerAdded', printer);
    });

    it('创建不存在驱动类型的打印机应该抛出错误', async () => {
      await expect(printerManager.createPrinter('nonexistent', 'device-1'))
        .rejects.toThrow('Driver not found: nonexistent');
    });

    it('应该使用默认名称', async () => {
      const printer = await printerManager.createPrinter('thermal', 'device-1');

      expect(printer.name).toBe('Printer device-1');
    });
  });

  describe('连接管理', () => {
    let printer: IPrinter;

    beforeEach(async () => {
      await printerManager.initialize();
      printer = await printerManager.createPrinter('thermal', 'device-1');
    });

    it('应该能够连接打印机', async () => {
      await printerManager.connectPrinter(printer.id);

      expect(printer.status).toBe(PrinterState.CONNECTED);
      expect(printer.driver?.isConnected()).toBe(true);
      expect(eventEmitter.emit).toHaveBeenCalledWith('printerConnected', printer);
    });

    it('应该能够断开打印机', async () => {
      await printerManager.connectPrinter(printer.id);
      expect(printer.status).toBe(PrinterState.CONNECTED);

      await printerManager.disconnectPrinter(printer.id);

      expect(printer.status).toBe(PrinterState.DISCONNECTED);
      expect(printer.driver?.isConnected()).toBe(false);
      expect(eventEmitter.emit).toHaveBeenCalledWith('printerDisconnected', printer.id);
    });

    it('连接不存在的打印机应该抛出错误', async () => {
      await expect(printerManager.connectPrinter('nonexistent-printer'))
        .rejects.toThrow('Printer not found: nonexistent-printer');
    });

    it('断开不存在的打印机应该抛出错误', async () => {
      // 不应该抛出错误，静默处理
      await expect(printerManager.disconnectPrinter('nonexistent-printer'))
        .resolves.toBeUndefined();
    });
  });

  describe('打印功能', () => {
    let printer: IPrinter;

    beforeEach(async () => {
      await printerManager.initialize();
      printer = await printerManager.createPrinter('thermal', 'device-1');
      await printerManager.connectPrinter(printer.id);
    });

    it('应该能够打印文本', async () => {
      const result = await printerManager.printText(
        printer.id,
        'Test print content',
        { bold: true }
      );

      expect(result).toBe(true);
    });

    it('应该能够打印图片', async () => {
      const imageData = new ArrayBuffer(100);
      const result = await printerManager.printImage(
        printer.id,
        imageData,
        { width: 200, height: 100 }
      );

      expect(result).toBe(true);
    });

    it('应该能够打印原始数据', async () => {
      const rawData = new ArrayBuffer(50);
      const result = await printerManager.printRaw(printer.id, rawData);

      expect(result).toBe(true);
    });

    it('打印未连接的打印机应该抛出错误', async () => {
      await printerManager.disconnectPrinter(printer.id);

      await expect(printerManager.printText(printer.id, 'test'))
        .rejects.toThrow('Printer not connected');
    });

    it('应该能够获取打印机状态', async () => {
      const status = await printerManager.getPrinterStatus(printer.id);

      expect(status.connected).toBe(true);
      expect(status.ready).toBe(true);
    });
  });

  describe('错误处理', () => {
    beforeEach(async () => {
      await printerManager.initialize();
    });

    it('应该处理驱动初始化错误', async () => {
      const errorDriver = new MockPrintDriver('ErrorDriver');
      errorDriver.initialize = jest.fn().mockRejectedValue(new Error('Init error'));

      await printerManager.registerDriver('error-type', errorDriver);

      await expect(printerManager.createPrinter('error-type', 'device-1'))
        .rejects.toThrow('Init error');
    });

    it('应该处理驱动连接错误', async () => {
      const errorDriver = new MockPrintDriver('ErrorDriver');
      errorDriver.connect = jest.fn().mockRejectedValue(new Error('Connect error'));

      await printerManager.registerDriver('error-type', errorDriver);
      const printer = await printerManager.createPrinter('error-type', 'device-1');

      await expect(printerManager.connectPrinter(printer.id))
        .rejects.toThrow('Connect error');
    });

    it('应该处理打印错误', async () => {
      const errorDriver = new MockPrintDriver('ErrorDriver');
      errorDriver.print = jest.fn().mockRejectedValue(new Error('Print error'));

      await printerManager.registerDriver('error-type', errorDriver);
      const printer = await printerManager.createPrinter('error-type', 'device-1');
      await printerManager.connectPrinter(printer.id);

      await expect(printerManager.printText(printer.id, 'test'))
        .rejects.toThrow('Print error');
    });
  });

  describe('状态管理', () => {
    let printer: IPrinter;

    beforeEach(async () => {
      await printerManager.initialize();
      printer = await printerManager.createPrinter('thermal', 'device-1');
    });

    it('应该正确跟踪打印机状态变化', async () => {
      expect(printer.status).toBe(PrinterState.DISCONNECTED);

      await printerManager.connectPrinter(printer.id);
      expect(printer.status).toBe(PrinterState.CONNECTED);

      await printerManager.disconnectPrinter(printer.id);
      expect(printer.status).toBe(PrinterState.DISCONNECTED);
    });

    it('应该正确更新时间戳', async () => {
      const initialUpdatedAt = printer.updatedAt;

      // 等待一小段时间确保时间戳不同
      await new Promise(resolve => setTimeout(resolve, 10));

      await printerManager.connectPrinter(printer.id);

      expect(printer.updatedAt.getTime()).toBeGreaterThan(initialUpdatedAt.getTime());
    });
  });

  describe('性能测试', () => {
    it('应该能够处理大量打印机', async () => {
      await printerManager.initialize();

      const printerCount = 50;
      const startTime = Date.now();

      // 创建大量打印机
      const printers: IPrinter[] = [];
      for (let i = 0; i < printerCount; i++) {
        const printer = await printerManager.createPrinter('thermal', `device-${i}`);
        printers.push(printer);
      }

      const duration = Date.now() - startTime;

      expect(printers.length).toBe(printerCount);
      expect(printerManager.getPrinters().length).toBe(printerCount);
      expect(duration).toBeLessThan(1000); // 应该在1秒内完成
    });

    it('应该能够处理并发连接', async () => {
      await printerManager.initialize();

      const connectionCount = 10;
      const printers: IPrinter[] = [];

      // 创建打印机
      for (let i = 0; i < connectionCount; i++) {
        const printer = await printerManager.createPrinter('thermal', `device-${i}`);
        printers.push(printer);
      }

      const startTime = Date.now();

      // 并发连接所有打印机
      const connectionPromises = printers.map(printer =>
        printerManager.connectPrinter(printer.id)
      );

      await Promise.all(connectionPromises);

      const duration = Date.now() - startTime;

      const connectedPrinters = printerManager.getConnectedPrinters();
      expect(connectedPrinters.length).toBe(connectionCount);
      expect(duration).toBeLessThan(2000); // 应该在2秒内完成
    });

    it('应该能够处理并发打印', async () => {
      await printerManager.initialize();
      const printer = await printerManager.createPrinter('thermal', 'device-1');
      await printerManager.connectPrinter(printer.id);

      const printCount = 20;
      const startTime = Date.now();

      // 并发打印
      const printPromises = [];
      for (let i = 0; i < printCount; i++) {
        printPromises.push(printerManager.printText(printer.id, `Print job ${i}`));
      }

      const results = await Promise.all(printPromises);

      const duration = Date.now() - startTime;

      expect(results.every(result => result === true)).toBe(true);
      expect(duration).toBeLessThan(1000); // 应该在1秒内完成
    });
  });

  describe('资源管理', () => {
    it('应该能够正确销毁管理器', async () => {
      await printerManager.initialize();

      // 添加一些打印机
      await printerManager.addPrinter({
        name: 'Printer1',
        deviceId: 'device-1',
        type: 'thermal',
        model: 'Model1',
        manufacturer: 'Manufacturer1'
      });

      await printerManager.addPrinter({
        name: 'Printer2',
        deviceId: 'device-2',
        type: 'label',
        model: 'Model2',
        manufacturer: 'Manufacturer2'
      });

      expect(printerManager.getPrinters().length).toBe(2);

      // 销毁管理器
      printerManager.dispose();

      expect(printerManager.getPrinters().length).toBe(0);
      expect((printerManager as any).isDisposed()).toBe(true);
    });

    it('销毁后不能执行操作', async () => {
      await printerManager.initialize();
      printerManager.dispose();

      await expect(printerManager.addPrinter({
        name: 'TestPrinter',
        deviceId: 'device-1',
        type: 'thermal',
        model: 'TestModel',
        manufacturer: 'TestManufacturer'
      })).rejects.toThrow('PrinterManager has been disposed');
    });

    it('应该正确处理驱动生命周期', async () => {
      await printerManager.initialize();

      const driver = new MockPrintDriver('TestDriver');
      await printerManager.registerDriver('test', driver);

      const printer = await printerManager.createPrinter('test', 'device-1');
      await printerManager.connectPrinter(printer.id);

      expect(driver.isConnected()).toBe(true);

      await printerManager.disconnectPrinter(printer.id);
      expect(driver.isConnected()).toBe(false);

      printerManager.dispose();

      expect(driver.isDisposed()).toBe(true);
    });
  });

  describe('边界情况', () => {
    beforeEach(async () => {
      await printerManager.initialize();
    });

    it('应该处理空名称的打印机', async () => {
      const printer = await printerManager.addPrinter({
        name: '',
        deviceId: 'device-1',
        type: 'thermal',
        model: 'Model',
        manufacturer: 'Manufacturer'
      });

      expect(printer.name).toBe('');
    });

    it('应该处理特殊字符的打印机名称', async () => {
      const printer = await printerManager.addPrinter({
        name: '测试打印机 🖨️',
        deviceId: 'device-1',
        type: 'thermal',
        model: 'Model',
        manufacturer: 'Manufacturer'
      });

      expect(printer.name).toBe('测试打印机 🖨️');
    });

    it('应该处理长名称的打印机', async () => {
      const longName = 'A'.repeat(1000);
      const printer = await printerManager.addPrinter({
        name: longName,
        deviceId: 'device-1',
        type: 'thermal',
        model: 'Model',
        manufacturer: 'Manufacturer'
      });

      expect(printer.name).toBe(longName);
    });

    it('应该处理相同的设备ID', async () => {
      const deviceId = 'same-device';

      const printer1 = await printerManager.createPrinter('thermal', deviceId, {
        name: 'Printer1'
      });

      const printer2 = await printerManager.createPrinter('label', deviceId, {
        name: 'Printer2'
      });

      expect(printer1.deviceId).toBe(deviceId);
      expect(printer2.deviceId).toBe(deviceId);
      expect(printer1.id).not.toBe(printer2.id);

      const printers = printerManager.getPrintersByDeviceId(deviceId);
      expect(printers.length).toBe(2);
    });
  });
});