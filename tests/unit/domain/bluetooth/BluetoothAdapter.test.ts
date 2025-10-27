/**
 * 蓝牙适配器单元测试
 */

import { BluetoothAdapter } from '../../../../src/domain/bluetooth/BluetoothAdapter';
import {
  IBluetoothAdapter,
  IBluetoothPlatformAdapter,
  BluetoothState,
  IBluetoothDevice,
  IBluetoothConnection,
  IBluetoothScanOptions
} from '../../../../src/domain/bluetooth/types';

// Mock平台适配器
class MockPlatformAdapter implements IBluetoothPlatformAdapter {
  private devices = new Map<string, IBluetoothDevice>();
  private connections = new Map<string, IBluetoothConnection>();
  private enabled = false;
  private scanning = false;

  async initialize(): Promise<void> {
    // Mock实现
  }

  async enable(): Promise<void> {
    this.enabled = true;
  }

  async disable(): Promise<void> {
    this.enabled = false;
    this.scanning = false;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  async startScan(options?: IBluetoothScanOptions): Promise<void> {
    if (!this.enabled) {
      throw new Error('Bluetooth not enabled');
    }
    if (this.scanning) {
      throw new Error('Scan already in progress');
    }
    this.scanning = true;

    // 模拟发现设备
    setTimeout(() => {
      if (this.scanning) {
        const mockDevice: IBluetoothDevice = {
          id: 'mock-device',
          name: 'MockDevice',
          address: '00:00:00:00:00:01',
          rssi: -50,
          serviceUuids: [],
          manufacturerData: new ArrayBuffer(0),
          advertisementData: {
            localName: 'MockDevice',
            serviceUuids: [],
            manufacturerData: new ArrayBuffer(0),
            serviceData: new Map(),
            txPowerLevel: -10,
            connectable: true
          }
        };
        this.devices.set(mockDevice.id, mockDevice);
      }
    }, 100);
  }

  async stopScan(): Promise<void> {
    this.scanning = false;
  }

  isScanning(): boolean {
    return this.scanning;
  }

  async connect(deviceId: string): Promise<IBluetoothConnection> {
    if (!this.enabled) {
      throw new Error('Bluetooth not enabled');
    }

    const device = this.devices.get(deviceId);
    if (!device) {
      throw new Error(`Device not found: ${deviceId}`);
    }

    const connection: IBluetoothConnection = {
      deviceId,
      connected: true,
      connectable: true,
      services: [],
      characteristics: new Map(),
      mtu: 20,
      rssi: device.rssi,
      connectedAt: new Date(),
      lastActivity: new Date()
    };

    this.connections.set(deviceId, connection);
    return connection;
  }

  async disconnect(deviceId: string): Promise<void> {
    const connection = this.connections.get(deviceId);
    if (connection) {
      connection.connected = false;
      this.connections.delete(deviceId);
    }
  }

  async disconnectAll(): Promise<void> {
    for (const deviceId of this.connections.keys()) {
      await this.disconnect(deviceId);
    }
  }

  isDeviceConnected(deviceId: string): boolean {
    const connection = this.connections.get(deviceId);
    return connection?.connected || false;
  }

  getConnectedDevices(): string[] {
    return Array.from(this.connections.keys()).filter(
      deviceId => this.connections.get(deviceId)?.connected
    );
  }

  getDeviceConnection(deviceId: string): IBluetoothConnection | undefined {
    return this.connections.get(deviceId);
  }

  // 测试辅助方法
  addMockDevice(device: IBluetoothDevice): void {
    this.devices.set(device.id, device);
  }

  removeMockDevice(deviceId: string): void {
    this.devices.delete(deviceId);
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  getDeviceCount(): number {
    return this.devices.size;
  }

  getConnectionCount(): number {
    return this.connections.size;
  }
}

describe('BluetoothAdapter', () => {
  let adapter: IBluetoothAdapter;
  let platformAdapter: MockPlatformAdapter;

  beforeEach(() => {
    platformAdapter = new MockPlatformAdapter();
    adapter = new BluetoothAdapter(
      {
        getAdapter: jest.fn().mockReturnValue(platformAdapter)
      } as any,
      {
        emit: jest.fn(),
        on: jest.fn(),
        off: jest.fn(),
        removeAllListeners: jest.fn()
      } as any,
      {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn()
      } as any
    );
  });

  afterEach(() => {
    adapter.dispose();
  });

  describe('初始化', () => {
    it('应该正确初始化蓝牙适配器', async () => {
      await adapter.initialize();

      expect(adapter.getState()).toBe(BluetoothState.POWERED_OFF);
    });

    it('初始化后应该禁用蓝牙', async () => {
      await adapter.initialize();

      expect(adapter.isEnabled()).toBe(false);
    });

    it('重复初始化应该抛出错误', async () => {
      await adapter.initialize();

      await expect(adapter.initialize()).rejects.toThrow('Adapter already initialized');
    });
  });

  describe('蓝牙状态管理', () => {
    beforeEach(async () => {
      await adapter.initialize();
    });

    it('应该能够启用蓝牙', async () => {
      await adapter.enable();

      expect(adapter.getState()).toBe(BluetoothState.POWERED_ON);
      expect(adapter.isEnabled()).toBe(true);
    });

    it('应该能够禁用蓝牙', async () => {
      await adapter.enable();
      await adapter.disable();

      expect(adapter.getState()).toBe(BluetoothState.POWERED_OFF);
      expect(adapter.isEnabled()).toBe(false);
    });

    it('禁用蓝牙应该断开所有连接', async () => {
      // 添加mock设备
      const mockDevice: IBluetoothDevice = {
        id: 'test-device',
        name: 'TestDevice',
        address: '00:00:00:00:00:01',
        rssi: -50,
        serviceUuids: [],
        manufacturerData: new ArrayBuffer(0),
        advertisementData: {
          localName: 'TestDevice',
          serviceUuids: [],
          manufacturerData: new ArrayBuffer(0),
          serviceData: new Map(),
          txPowerLevel: -10,
          connectable: true
        }
      };
      platformAdapter.addMockDevice(mockDevice);

      // 连接设备
      await adapter.enable();
      await adapter.connect(mockDevice.id);

      expect(adapter.getConnectedDevices()).toHaveLength(1);

      // 禁用蓝牙
      await adapter.disable();

      expect(adapter.getConnectedDevices()).toHaveLength(0);
    });
  });

  describe('设备扫描', () => {
    beforeEach(async () => {
      await adapter.initialize();
      await adapter.enable();
    });

    it('应该能够开始扫描', async () => {
      await adapter.startScan();

      expect(adapter.isScanning()).toBe(true);

      // 等待设备发现
      await new Promise(resolve => setTimeout(resolve, 200));
    });

    it('应该能够停止扫描', async () => {
      await adapter.startScan();
      expect(adapter.isScanning()).toBe(true);

      await adapter.stopScan();
      expect(adapter.isScanning()).toBe(false);
    });

    it('扫描超时应该自动停止', async () => {
      const timeout = 500;
      await adapter.startScan({ timeout });

      expect(adapter.isScanning()).toBe(true);

      // 等待超时
      await new Promise(resolve => setTimeout(resolve, timeout + 100));

      expect(adapter.isScanning()).toBe(false);
    });

    it('蓝牙未启用时扫描应该抛出错误', async () => {
      await adapter.disable();

      await expect(adapter.startScan())
        .rejects.toThrow('Bluetooth is not enabled');
    });

    it('重复扫描应该抛出错误', async () => {
      await adapter.startScan();

      await expect(adapter.startScan())
        .rejects.toThrow('Scan already in progress');
    });

    it('应该能够执行完整扫描', async () => {
      const devices = await adapter.scan(1000);

      expect(Array.isArray(devices)).toBe(true);
      // Mock适配器应该返回至少一个设备
      expect(devices.length).toBeGreaterThan(0);
    });
  });

  describe('设备连接', () => {
    const mockDevice: IBluetoothDevice = {
      id: 'test-device',
      name: 'TestDevice',
      address: '00:00:00:00:00:01',
      rssi: -50,
      serviceUuids: [],
      manufacturerData: new ArrayBuffer(0),
      advertisementData: {
        localName: 'TestDevice',
        serviceUuids: [],
        manufacturerData: new ArrayBuffer(0),
        serviceData: new Map(),
        txPowerLevel: -10,
        connectable: true
      }
    };

    beforeEach(async () => {
      await adapter.initialize();
      await adapter.enable();
      platformAdapter.addMockDevice(mockDevice);
    });

    it('应该能够连接设备', async () => {
      const connection = await adapter.connect(mockDevice.id);

      expect(connection.deviceId).toBe(mockDevice.id);
      expect(connection.connected).toBe(true);
      expect(adapter.isDeviceConnected(mockDevice.id)).toBe(true);
    });

    it('应该能够断开设备连接', async () => {
      await adapter.connect(mockDevice.id);
      expect(adapter.isDeviceConnected(mockDevice.id)).toBe(true);

      await adapter.disconnect(mockDevice.id);
      expect(adapter.isDeviceConnected(mockDevice.id)).toBe(false);
    });

    it('连接不存在的设备应该抛出错误', async () => {
      await expect(adapter.connect('nonexistent-device'))
        .rejects.toThrow('Device not found: nonexistent-device');
    });

    it('蓝牙未启用时连接应该抛出错误', async () => {
      await adapter.disable();

      await expect(adapter.connect(mockDevice.id))
        .rejects.toThrow('Bluetooth is not enabled');
    });

    it('应该能够获取已连接设备列表', async () => {
      expect(adapter.getConnectedDevices()).toHaveLength(0);

      await adapter.connect(mockDevice.id);
      expect(adapter.getConnectedDevices()).toHaveLength(1);

      await adapter.disconnect(mockDevice.id);
      expect(adapter.getConnectedDevices()).toHaveLength(0);
    });

    it('应该能够获取设备连接信息', async () => {
      await adapter.connect(mockDevice.id);

      const connection = adapter.getDeviceConnection(mockDevice.id);
      expect(connection).toBeDefined();
      expect(connection!.deviceId).toBe(mockDevice.id);
      expect(connection!.connected).toBe(true);
    });

    it('应该能够断开所有连接', async () => {
      // 添加第二个设备
      const mockDevice2: IBluetoothDevice = {
        ...mockDevice,
        id: 'test-device-2'
      };
      platformAdapter.addMockDevice(mockDevice2);

      // 连接两个设备
      await adapter.connect(mockDevice.id);
      await adapter.connect(mockDevice2.id);

      expect(adapter.getConnectedDevices()).toHaveLength(2);

      // 断开所有连接
      await adapter.disconnectAll();

      expect(adapter.getConnectedDevices()).toHaveLength(0);
    });
  });

  describe('事件处理', () => {
    beforeEach(async () => {
      await adapter.initialize();
    });

    it('应该能够监听事件', () => {
      const listener = jest.fn();

      adapter.on('test-event', listener);

      expect((adapter as any).on).toHaveBeenCalledWith('test-event', listener);
    });

    it('应该能够移除事件监听', () => {
      const listener = jest.fn();

      adapter.off('test-event', listener);

      expect((adapter as any).off).toHaveBeenCalledWith('test-event', listener);
    });

    it('应该能够移除所有事件监听', () => {
      adapter.removeAllListeners();

      expect((adapter as any).removeAllListeners).toHaveBeenCalled();
    });
  });

  describe('错误处理', () => {
    beforeEach(async () => {
      await adapter.initialize();
    });

    it('应该处理平台适配器错误', async () => {
      // 模拟平台适配器错误
      (platformAdapter as any).enable = jest.fn().mockRejectedValue(new Error('Platform error'));

      await expect(adapter.enable())
        .rejects.toThrow('Platform error');
    });

    it('应该处理设备连接超时', async () => {
      const mockDevice: IBluetoothDevice = {
        id: 'timeout-device',
        name: 'TimeoutDevice',
        address: '00:00:00:00:00:02',
        rssi: -50,
        serviceUuids: [],
        manufacturerData: new ArrayBuffer(0),
        advertisementData: {
          localName: 'TimeoutDevice',
          serviceUuids: [],
          manufacturerData: new ArrayBuffer(0),
          serviceData: new Map(),
          txPowerLevel: -10,
          connectable: true
        }
      };
      platformAdapter.addMockDevice(mockDevice);

      // 模拟连接超时
      (platformAdapter as any).connect = jest.fn().mockImplementation(
        () => new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Connection timeout')), 100);
        })
      );

      await expect(adapter.connect(mockDevice.id))
        .rejects.toThrow('Connection timeout');
    });
  });

  describe('资源管理', () => {
    it('应该能够正确销毁适配器', async () => {
      await adapter.initialize();
      await adapter.enable();

      // 连接设备
      const mockDevice: IBluetoothDevice = {
        id: 'test-device',
        name: 'TestDevice',
        address: '00:00:00:00:00:01',
        rssi: -50,
        serviceUuids: [],
        manufacturerData: new ArrayBuffer(0),
        advertisementData: {
          localName: 'TestDevice',
          serviceUuids: [],
          manufacturerData: new ArrayBuffer(0),
          serviceData: new Map(),
          txPowerLevel: -10,
          connectable: true
        }
      };
      platformAdapter.addMockDevice(mockDevice);
      await adapter.connect(mockDevice.id);

      expect(adapter.getConnectedDevices()).toHaveLength(1);

      // 销毁适配器
      adapter.dispose();

      expect(adapter.getConnectedDevices()).toHaveLength(0);
      expect(adapter.isDisposed()).toBe(true);
    });

    it('销毁后的适配器不能执行操作', async () => {
      await adapter.initialize();
      adapter.dispose();

      expect(() => adapter.enable()).toThrow();
      expect(() => adapter.disable()).toThrow();
      expect(() => adapter.startScan()).rejects.toThrow();
      expect(() => adapter.connect('test-id')).rejects.toThrow();
    });
  });

  describe('状态查询', () => {
    it('应该返回正确的状态信息', async () => {
      await adapter.initialize();

      const status = adapter.getStatus();
      expect(status.state).toBe(BluetoothState.POWERED_OFF);
      expect(status.scanning).toBe(false);
      expect(status.connectedDevices).toHaveLength(0);

      await adapter.enable();
      const enabledStatus = adapter.getStatus();
      expect(enabledStatus.state).toBe(BluetoothState.POWERED_ON);
      expect(enabledStatus.enabled).toBe(true);
    });
  });

  describe('性能测试', () => {
    it('应该能够处理大量设备', async () => {
      await adapter.initialize();
      await adapter.enable();

      // 添加大量mock设备
      const deviceCount = 100;
      for (let i = 0; i < deviceCount; i++) {
        const device: IBluetoothDevice = {
          id: `device-${i}`,
          name: `Device ${i}`,
          address: `00:00:00:00:00:${i.toString(16).padStart(2, '0')}`,
          rssi: -50 - Math.floor(Math.random() * 50),
          serviceUuids: [],
          manufacturerData: new ArrayBuffer(0),
          advertisementData: {
            localName: `Device ${i}`,
            serviceUuids: [],
            manufacturerData: new ArrayBuffer(0),
            serviceData: new Map(),
            txPowerLevel: -10,
            connectable: true
          }
        };
        platformAdapter.addMockDevice(device);
      }

      const startTime = Date.now();

      // 扫描设备
      const devices = await adapter.scan(1000);

      const duration = Date.now() - startTime;

      expect(devices.length).toBeGreaterThanOrEqual(deviceCount);
      expect(duration).toBeLessThan(2000); // 应该在2秒内完成
    });

    it('应该能够处理多个连接', async () => {
      await adapter.initialize();
      await adapter.enable();

      const connectionCount = 10;
      const devices: IBluetoothDevice[] = [];

      // 创建设备
      for (let i = 0; i < connectionCount; i++) {
        const device: IBluetoothDevice = {
          id: `multi-device-${i}`,
          name: `MultiDevice ${i}`,
          address: `00:00:00:00:00:${i.toString(16).padStart(2, '0')}`,
          rssi: -50,
          serviceUuids: [],
          manufacturerData: new ArrayBuffer(0),
          advertisementData: {
            localName: `MultiDevice ${i}`,
            serviceUuids: [],
            manufacturerData: new ArrayBuffer(0),
            serviceData: new Map(),
            txPowerLevel: -10,
            connectable: true
          }
        };
        devices.push(device);
        platformAdapter.addMockDevice(device);
      }

      const startTime = Date.now();

      // 并发连接所有设备
      const connectionPromises = devices.map(device => adapter.connect(device.id));
      await Promise.all(connectionPromises);

      const duration = Date.now() - startTime;

      expect(adapter.getConnectedDevices()).toHaveLength(connectionCount);
      expect(duration).toBeLessThan(3000); // 应该在3秒内完成
    });
  });
});