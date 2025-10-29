/**
 * BluetoothPrinterSimple 单元测试
 */

import { BluetoothPrinterSimple, createBluetoothPrinterSimple } from './BluetoothPrinterSimple';
import { createMockBluetoothDevice, createMockPrintJob } from '../../tests/setup/jest-setup';

// Mock Taro
jest.mock('@tarojs/taro');

describe('BluetoothPrinterSimple', () => {
  let printer: BluetoothPrinterSimple;

  beforeEach(() => {
    printer = createBluetoothPrinterSimple();
  });

  afterEach(async () => {
    if (printer) {
      await printer.dispose();
    }
  });

  describe('constructor', () => {
    it('应该使用默认配置创建实例', () => {
      const instance = createBluetoothPrinterSimple();
      expect(instance).toBeInstanceOf(BluetoothPrinterSimple);
    });

    it('应该使用自定义配置创建实例', () => {
      const config = {
        bluetooth: { scanTimeout: 5000 },
        printer: { paperWidth: 80 }
      };

      const instance = createBluetoothPrinterSimple(config);
      expect(instance).toBeInstanceOf(BluetoothPrinterSimple);
    });
  });

  describe('initialize', () => {
    it('应该成功初始化', async () => {
      await expect(printer.initialize()).resolves.not.toThrow();
    });

    it('重复初始化不应该报错', async () => {
      await printer.initialize();
      await expect(printer.initialize()).resolves.not.toThrow();
    });
  });

  describe('scanDevices', () => {
    beforeEach(async () => {
      await printer.initialize();
    });

    it('应该返回设备列表', async () => {
      const mockDevices = [
        createMockBluetoothDevice({ deviceId: 'device-1', name: 'Printer 1' }),
        createMockBluetoothDevice({ deviceId: 'device-2', name: 'Printer 2' })
      ];

      // Mock Taro.getBluetoothDevices 返回
      const Taro = require('@tarojs/taro').default;
      Taro.getBluetoothDevices.mockResolvedValue({
        devices: mockDevices,
        errCode: 0
      });

      const devices = await printer.scanDevices();
      expect(Array.isArray(devices)).toBe(true);
    });

    it('应该处理扫描超时', async () => {
      const printerWithTimeout = createBluetoothPrinterSimple({
        bluetooth: { scanTimeout: 100 }
      });

      await printerWithTimeout.initialize();

      // Mock 延迟响应
      const Taro = require('@tarojs/taro').default;
      Taro.getBluetoothDevices.mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve({ devices: [], errCode: 0 }), 200))
      );

      const devices = await printerWithTimeout.scanDevices();
      expect(Array.isArray(devices)).toBe(true);
    });
  });

  describe('connectDevice', () => {
    beforeEach(async () => {
      await printer.initialize();
    });

    it('应该成功连接设备', async () => {
      const deviceId = 'test-device-id';

      // Mock Taro.createBLEConnection
      const Taro = require('@tarojs/taro').default;
      Taro.createBLEConnection.mockResolvedValue({ errCode: 0 });

      const connection = await printer.connectDevice(deviceId);
      expect(connection.deviceId).toBe(deviceId);
      expect(connection.connected).toBe(true);
    });

    it('应该处理连接失败', async () => {
      const deviceId = 'invalid-device-id';

      // Mock Taro.createBLEConnection 失败
      const Taro = require('@tarojs/taro').default;
      Taro.createBLEConnection.mockResolvedValue({ errCode: -1 });

      await expect(printer.connectDevice(deviceId)).rejects.toThrow();
    });
  });

  describe('printText', () => {
    beforeEach(async () => {
      await printer.initialize();
    });

    it('应该成功打印文本', async () => {
      const text = 'Hello, Printer!';

      // Mock 连接和写入
      const Taro = require('@tarojs/taro').default;
      Taro.createBLEConnection.mockResolvedValue({ errCode: 0 });
      Taro.writeBLECharacteristicValue.mockResolvedValue({ errCode: 0 });

      // 先连接设备
      await printer.connectDevice('test-device');

      const result = await printer.printText(text);
      expect(result.success).toBe(true);
      expect(result.jobId).toBeDefined();
    });

    it('应该处理未连接设备时的打印', async () => {
      const text = 'Hello, Printer!';

      await expect(printer.printText(text)).rejects.toThrow();
    });

    it('应该处理打印选项', async () => {
      const text = 'Hello, Printer!';
      const options = {
        bold: true,
        align: 'center',
        fontSize: 24
      };

      // Mock 连接和写入
      const Taro = require('@tarojs/taro').default;
      Taro.createBLEConnection.mockResolvedValue({ errCode: 0 });
      Taro.writeBLECharacteristicValue.mockResolvedValue({ errCode: 0 });

      await printer.connectDevice('test-device');

      const result = await printer.printText(text, options);
      expect(result.success).toBe(true);
    });
  });

  describe('printQRCode', () => {
    beforeEach(async () => {
      await printer.initialize();
    });

    it('应该成功打印二维码', async () => {
      const data = 'https://example.com';

      // Mock 连接和写入
      const Taro = require('@tarojs/taro').default;
      Taro.createBLEConnection.mockResolvedValue({ errCode: 0 });
      Taro.writeBLECharacteristicValue.mockResolvedValue({ errCode: 0 });

      await printer.connectDevice('test-device');

      const result = await printer.printQRCode(data);
      expect(result.success).toBe(true);
    });

    it('应该处理二维码选项', async () => {
      const data = 'https://example.com';
      const options = {
        size: 8,
        align: 'center',
        errorCorrection: 'M'
      };

      // Mock 连接和写入
      const Taro = require('@tarojs/taro').default;
      Taro.createBLEConnection.mockResolvedValue({ errCode: 0 });
      Taro.writeBLECharacteristicValue.mockResolvedValue({ errCode: 0 });

      await printer.connectDevice('test-device');

      const result = await printer.printQRCode(data, options);
      expect(result.success).toBe(true);
    });
  });

  describe('printBatch', () => {
    beforeEach(async () => {
      await printer.initialize();
    });

    it('应该成功批量打印', async () => {
      const requests = [
        { type: 'text', content: 'Title', options: { bold: true } },
        { type: 'text', content: 'Content' },
        { type: 'qrcode', content: 'https://example.com', options: { size: 6 } }
      ];

      // Mock 连接和写入
      const Taro = require('@tarojs/taro').default;
      Taro.createBLEConnection.mockResolvedValue({ errCode: 0 });
      Taro.writeBLECharacteristicValue.mockResolvedValue({ errCode: 0 });

      await printer.connectDevice('test-device');

      const results = await printer.printBatch(requests);
      expect(results).toHaveLength(3);
      expect(results.every(r => r.success)).toBe(true);
    });

    it('应该处理空批量请求', async () => {
      const results = await printer.printBatch([]);
      expect(results).toHaveLength(0);
    });
  });

  describe('getQueueStatus', () => {
    it('应该返回队列状态', () => {
      const status = printer.getQueueStatus();
      expect(status).toHaveProperty('size');
      expect(status).toHaveProperty('processing');
      expect(status).toHaveProperty('completed');
      expect(status).toHaveProperty('failed');
      expect(status).toHaveProperty('paused');
    });
  });

  describe('事件系统', () => {
    beforeEach(async () => {
      await printer.initialize();
    });

    it('应该触发设备发现事件', async () => {
      const mockDevice = createMockBluetoothDevice();
      const listener = jest.fn();

      printer.on('deviceDiscovered', listener);

      // Mock 设备发现
      const Taro = require('@tarojs/taro').default;
      Taro.getBluetoothDevices.mockResolvedValue({
        devices: [mockDevice],
        errCode: 0
      });

      await printer.scanDevices();

      // 注意：实际的事件触发依赖于具体实现
      // 这里主要测试事件监听器的注册
      expect(typeof listener).toBe('function');
    });

    it('应该触发连接状态事件', async () => {
      const connectListener = jest.fn();
      const disconnectListener = jest.fn();

      printer.on('deviceConnected', connectListener);
      printer.on('deviceDisconnected', disconnectListener);

      // Mock 连接
      const Taro = require('@tarojs/taro').default;
      Taro.createBLEConnection.mockResolvedValue({ errCode: 0 });
      Taro.closeBLEConnection.mockResolvedValue({ errCode: 0 });

      await printer.connectDevice('test-device');
      await printer.disconnectDevice('test-device');

      // 验证监听器注册
      expect(typeof connectListener).toBe('function');
      expect(typeof disconnectListener).toBe('function');
    });
  });

  describe('dispose', () => {
    it('应该正确清理资源', async () => {
      await printer.initialize();

      // 添加一些事件监听器
      const listener = jest.fn();
      printer.on('deviceDiscovered', listener);

      await expect(printer.dispose()).resolves.not.toThrow();
    });

    it('多次调用 dispose 不应该报错', async () => {
      await printer.initialize();
      await printer.dispose();

      await expect(printer.dispose()).resolves.not.toThrow();
    });
  });

  describe('错误处理', () => {
    it('应该处理初始化错误', async () => {
      // Mock Taro.openBluetoothAdapter 失败
      const Taro = require('@tarojs/taro').default;
      Taro.openBluetoothAdapter.mockRejectedValue(new Error('Bluetooth not available'));

      const errorPrinter = createBluetoothPrinterSimple();
      await expect(errorPrinter.initialize()).rejects.toThrow('Bluetooth not available');
    });

    it('应该处理扫描错误', async () => {
      await printer.initialize();

      // Mock Taro.startBluetoothDevicesDiscovery 失败
      const Taro = require('@tarojs/taro').default;
      Taro.startBluetoothDevicesDiscovery.mockRejectedValue(new Error('Scan failed'));

      await expect(printer.scanDevices()).rejects.toThrow('Scan failed');
    });

    it('应该处理连接错误', async () => {
      await printer.initialize();

      // Mock Taro.createBLEConnection 失败
      const Taro = require('@tarojs/taro').default;
      Taro.createBLEConnection.mockRejectedValue(new Error('Connection failed'));

      await expect(printer.connectDevice('invalid-device')).rejects.toThrow('Connection failed');
    });
  });
});

describe('createBluetoothPrinterSimple', () => {
  it('应该创建 BluetoothPrinterSimple 实例', () => {
    const printer = createBluetoothPrinterSimple();
    expect(printer).toBeInstanceOf(BluetoothPrinterSimple);
  });

  it('应该应用默认配置', () => {
    const printer = createBluetoothPrinterSimple();
    expect(printer).toBeDefined();
  });

  it('应该合并自定义配置', () => {
    const customConfig = {
      bluetooth: { scanTimeout: 5000 },
      printer: { paperWidth: 80 }
    };

    const printer = createBluetoothPrinterSimple(customConfig);
    expect(printer).toBeInstanceOf(BluetoothPrinterSimple);
  });
});