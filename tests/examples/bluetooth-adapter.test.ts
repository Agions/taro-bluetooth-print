/**
 * 蓝牙适配器测试示例
 */

import { BluetoothAdapter } from '../../src/bluetooth/BluetoothAdapter';
import { BluetoothEventType } from '../../src/bluetooth/BluetoothTypes';
import { createMockBluetoothDevice, waitFor } from '../utils/test-utils';

describe('BluetoothAdapter', () => {
  let adapter: BluetoothAdapter;

  beforeEach(() => {
    adapter = new BluetoothAdapter();
  });

  afterEach(() => {
    adapter.destroy();
  });

  describe('初始化', () => {
    it('应该成功初始化蓝牙适配器', async () => {
      const result = await adapter.initialize();
      expect(result).toBe(true);
      expect(adapter.isInitialized()).toBe(true);
    });

    it('初始化失败时应该抛出错误', async () => {
      // 模拟初始化失败
      jest.spyOn(adapter as any, 'checkBluetoothSupport').mockResolvedValue(false);

      await expect(adapter.initialize()).rejects.toThrow('蓝牙不支持');
    });

    it('重复初始化应该返回true', async () => {
      await adapter.initialize();
      const result = await adapter.initialize();
      expect(result).toBe(true);
    });
  });

  describe('设备发现', () => {
    beforeEach(async () => {
      await adapter.initialize();
    });

    it('应该开始设备发现', async () => {
      const result = await adapter.startDiscovery();
      expect(result).toBe(true);
      expect(adapter.isDiscovering()).toBe(true);
    });

    it('发现设备时应该触发事件', async () => {
      const mockDevice = createMockBluetoothDevice();
      const discoveryListener = jest.fn();

      adapter.on(BluetoothEventType.DEVICE_DISCOVERED, discoveryListener);

      // 模拟发现设备
      (adapter as any).handleDeviceDiscovered(mockDevice);

      expect(discoveryListener).toHaveBeenCalledWith(mockDevice);
    });

    it('应该停止设备发现', async () => {
      await adapter.startDiscovery();
      const result = await adapter.stopDiscovery();
      expect(result).toBe(true);
      expect(adapter.isDiscovering()).toBe(false);
    });
  });

  describe('设备连接', () => {
    const mockDevice = createMockBluetoothDevice();

    beforeEach(async () => {
      await adapter.initialize();
    });

    it('应该连接到设备', async () => {
      const result = await adapter.connect(mockDevice.deviceId);
      expect(result).toBe(true);
      expect(adapter.getConnectionState()).toBe('connected');
    });

    it('连接成功时应该触发事件', async () => {
      const connectListener = jest.fn();

      adapter.on(BluetoothEventType.CONNECTION_STATE_CHANGED, connectListener);

      await adapter.connect(mockDevice.deviceId);

      expect(connectListener).toHaveBeenCalledWith({
        deviceId: mockDevice.deviceId,
        state: 'connected'
      });
    });

    it('连接不存在的设备应该失败', async () => {
      await expect(adapter.connect('invalid-device-id')).rejects.toThrow('设备不存在');
    });

    it('应该断开设备连接', async () => {
      await adapter.connect(mockDevice.deviceId);
      const result = await adapter.disconnect();
      expect(result).toBe(true);
      expect(adapter.getConnectionState()).toBe('disconnected');
    });
  });

  describe('数据传输', () => {
    const mockDevice = createMockBluetoothDevice();

    beforeEach(async () => {
      await adapter.initialize();
      await adapter.connect(mockDevice.deviceId);
    });

    it('应该发送数据', async () => {
      const data = new Uint8Array([0x1B, 0x21, 0x08]); // ESC ! 8
      const result = await adapter.sendCommand(data);
      expect(result).toBe(true);
    });

    it('发送空数据应该失败', async () => {
      await expect(adapter.sendCommand(new Uint8Array([]))).rejects.toThrow('数据不能为空');
    });

    it('未连接时发送数据应该失败', async () => {
      await adapter.disconnect();
      await expect(adapter.sendCommand(new Uint8Array([0x1B]))).rejects.toThrow('设备未连接');
    });
  });

  describe('错误处理', () => {
    it('应该处理蓝牙不可用错误', async () => {
      // 模拟蓝牙不可用
      jest.spyOn(navigator, 'bluetooth', 'get').mockImplementation(() => {
        throw new Error('蓝牙不可用');
      });

      await expect(adapter.initialize()).rejects.toThrow('蓝牙不可用');
    });

    it('应该处理连接超时', async () => {
      await adapter.initialize();

      // 模拟连接超时
      jest.spyOn(adapter as any, 'connectToDevice').mockImplementation(() => {
        return new Promise((_, reject) => {
          setTimeout(() => reject(new Error('连接超时')), 100);
        });
      });

      await expect(adapter.connect('test-device')).rejects.toThrow('连接超时');
    });

    it('应该处理设备断开连接', async () => {
      const mockDevice = createMockBluetoothDevice();

      await adapter.initialize();
      await adapter.connect(mockDevice.deviceId);

      const disconnectListener = jest.fn();
      adapter.on(BluetoothEventType.CONNECTION_STATE_CHANGED, disconnectListener);

      // 模拟设备断开连接
      (adapter as any).handleDeviceDisconnected(mockDevice.deviceId);

      await waitFor(() => adapter.getConnectionState() === 'disconnected');
      expect(disconnectListener).toHaveBeenCalledWith({
        deviceId: mockDevice.deviceId,
        state: 'disconnected'
      });
    });
  });

  describe('事件系统', () => {
    it('应该支持多个监听器', async () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();

      adapter.on(BluetoothEventType.CONNECTION_STATE_CHANGED, listener1);
      adapter.on(BluetoothEventType.CONNECTION_STATE_CHANGED, listener2);

      const mockDevice = createMockBluetoothDevice();
      await adapter.initialize();
      await adapter.connect(mockDevice.deviceId);

      expect(listener1).toHaveBeenCalled();
      expect(listener2).toHaveBeenCalled();
    });

    it('应该能够移除监听器', async () => {
      const listener = jest.fn();

      adapter.on(BluetoothEventType.CONNECTION_STATE_CHANGED, listener);
      adapter.off(BluetoothEventType.CONNECTION_STATE_CHANGED, listener);

      const mockDevice = createMockBluetoothDevice();
      await adapter.initialize();
      await adapter.connect(mockDevice.deviceId);

      expect(listener).not.toHaveBeenCalled();
    });

    it('应该支持一次性监听器', async () => {
      const listener = jest.fn();

      adapter.once(BluetoothEventType.CONNECTION_STATE_CHANGED, listener);

      const mockDevice = createMockBluetoothDevice();
      await adapter.initialize();
      await adapter.connect(mockDevice.deviceId);

      expect(listener).toHaveBeenCalledTimes(1);

      // 再次连接不应该触发监听器
      await adapter.disconnect();
      await adapter.connect(mockDevice.deviceId);

      expect(listener).toHaveBeenCalledTimes(1);
    });
  });

  describe('性能测试', () => {
    it('连接建立时间应该在合理范围内', async () => {
      const mockDevice = createMockBluetoothDevice();

      await adapter.initialize();

      const startTime = performance.now();
      await adapter.connect(mockDevice.deviceId);
      const endTime = performance.now();

      const connectionTime = endTime - startTime;
      expect(connectionTime).toBeLessThan(5000); // 5秒内连接成功
    });

    it('数据传输应该支持高频率操作', async () => {
      const mockDevice = createMockBluetoothDevice();
      const data = new Uint8Array([0x1B, 0x21, 0x08]);
      const iterations = 100;

      await adapter.initialize();
      await adapter.connect(mockDevice.deviceId);

      const startTime = performance.now();

      const promises = Array.from({ length: iterations }, () =>
        adapter.sendCommand(data)
      );

      await Promise.all(promises);

      const endTime = performance.now();
      const totalTime = endTime - startTime;
      const averageTime = totalTime / iterations;

      expect(averageTime).toBeLessThan(50); // 平均每次传输小于50ms
    });
  });
});