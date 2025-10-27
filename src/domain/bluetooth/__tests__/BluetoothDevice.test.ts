/**
 * 蓝牙设备测试
 */

import { BluetoothDevice } from '../BluetoothDevice';
import { BluetoothDeviceType, BluetoothDeviceState } from '../types';

describe('BluetoothDevice', () => {
  let device: BluetoothDevice;

  beforeEach(() => {
    device = new BluetoothDevice('test-device-id', 'Test Device', '00:11:22:33:44:55', BluetoothDeviceType.UNKNOWN);
  });

  describe('基本属性', () => {
    it('应该初始化基本属性', () => {
      expect(device.id).toBe('test-device-id');
      expect(device.name).toBe('Test Device');
      expect(device.address).toBe('00:11:22:33:44:55');
      expect(device.type).toBe(BluetoothDeviceType.UNKNOWN);
      expect(device.state).toBe(BluetoothDeviceState.DISCONNECTED);
      expect(device.rssi).toBe(-100);
      expect(device.connectable).toBe(true);
    });

    it('应该支持更新名称', () => {
      device.name = 'Updated Name';
      expect(device.name).toBe('Updated Name');
    });

    it('应该支持更新信号强度', () => {
      device.updateRSSI(-50);
      expect(device.rssi).toBe(-50);
    });
  });

  describe('连接状态管理', () => {
    it('应该正确报告连接状态', () => {
      expect(device.isConnected()).toBe(false);

      device.updateState(BluetoothDeviceState.CONNECTED);
      expect(device.isConnected()).toBe(true);

      device.updateState(BluetoothDeviceState.DISCONNECTED);
      expect(device.isConnected()).toBe(false);
    });

    it('应该正确报告可连接状态', () => {
      expect(device.isConnectable()).toBe(true);

      device.connectable = false;
      expect(device.isConnectable()).toBe(false);

      device.connectable = true;
      device.updateState(BluetoothDeviceState.CONNECTED);
      expect(device.isConnectable()).toBe(false);
    });

    it('应该记录连接和断开时间', () => {
      const beforeConnect = new Date();
      device.updateState(BluetoothDeviceState.CONNECTED);
      const afterConnect = new Date();

      expect(device.lastConnected).toBeDefined();
      expect(device.lastConnected!.getTime()).toBeGreaterThanOrEqual(beforeConnect.getTime());
      expect(device.lastConnected!.getTime()).toBeLessThanOrEqual(afterConnect.getTime());
      expect(device.lastDisconnected).toBeUndefined();

      const beforeDisconnect = new Date();
      device.updateState(BluetoothDeviceState.DISCONNECTED);
      const afterDisconnect = new Date();

      expect(device.lastDisconnected).toBeDefined();
      expect(device.lastDisconnected!.getTime()).toBeGreaterThanOrEqual(beforeDisconnect.getTime());
      expect(device.lastDisconnected!.getTime()).toBeLessThanOrEqual(afterDisconnect.getTime());
    });
  });

  describe('服务管理', () => {
    it('应该支持添加服务', () => {
      device.addService('1800');
      device.addService('180A');

      expect(device.hasService('1800')).toBe(true);
      expect(device.hasService('180A')).toBe(true);
      expect(device.hasService('180F')).toBe(false);
      expect(device.services).toEqual(['1800', '180A']);
    });

    it('应该避免重复添加服务', () => {
      device.addService('1800');
      device.addService('1800');

      expect(device.services).toEqual(['1800']);
      expect(device.services.length).toBe(1);
    });

    it('应该支持移除服务', () => {
      device.addService('1800');
      device.addService('180A');
      device.removeService('1800');

      expect(device.hasService('1800')).toBe(false);
      expect(device.hasService('180A')).toBe(true);
      expect(device.services).toEqual(['180A']);
    });

    it('应该支持清空服务', () => {
      device.addService('1800');
      device.addService('180A');
      device.updateState(BluetoothDeviceState.CONNECTED);
      device.reset();

      expect(device.services).toEqual([]);
    });
  });

  describe('特征值管理', () => {
    it('应该支持设置和获取特征值', () => {
      const characteristic = {
        id: 'char-1',
        uuid: 'char-1',
        properties: { read: true, write: false, notify: false, indicate: false },
        value: new ArrayBuffer(10)
      };

      device.setCharacteristic('1800', 'char-1', characteristic);

      const retrieved = device.getCharacteristic('1800', 'char-1');
      expect(retrieved).toBe(characteristic);

      const notFound = device.getCharacteristic('1800', 'char-2');
      expect(notFound).toBeUndefined();
    });

    it('应该支持获取所有特征值', () => {
      const char1 = {
        id: 'char-1',
        uuid: 'char-1',
        properties: { read: true, write: false, notify: false, indicate: false },
        value: new ArrayBuffer(10)
      };

      const char2 = {
        id: 'char-2',
        uuid: 'char-2',
        properties: { read: false, write: true, notify: false, indicate: false },
        value: new ArrayBuffer(20)
      };

      device.setCharacteristic('1800', 'char-1', char1);
      device.setCharacteristic('180A', 'char-2', char2);

      const allCharacteristics = device.getAllCharacteristics();
      expect(allCharacteristics).toHaveLength(2);
      expect(allCharacteristics).toContain(char1);
      expect(allCharacteristics).toContain(char2);
    });
  });

  describe('特征值订阅管理', () => {
    it('应该支持订阅和取消订阅特征值', () => {
      device.subscribeCharacteristic('1800', 'char-1');
      device.subscribeCharacteristic('180A', 'char-2');

      expect(device.isCharacteristicSubscribed('1800', 'char-1')).toBe(true);
      expect(device.isCharacteristicSubscribed('180A', 'char-2')).toBe(true);
      expect(device.isCharacteristicSubscribed('1800', 'char-2')).toBe(false);

      device.unsubscribeCharacteristic('1800', 'char-1');
      expect(device.isCharacteristicSubscribed('1800', 'char-1')).toBe(false);
      expect(device.isCharacteristicSubscribed('180A', 'char-2')).toBe(true);
    });

    it('应该获取已订阅的特征值列表', () => {
      device.subscribeCharacteristic('1800', 'char-1');
      device.subscribeCharacteristic('180A', 'char-2');

      const subscribed = device.getSubscribedCharacteristics();
      expect(subscribed).toHaveLength(2);
      expect(subscribed).toContainEqual({ serviceId: '1800', characteristicId: 'char-1' });
      expect(subscribed).toContainEqual({ serviceId: '180A', characteristicId: 'char-2' });
    });

    it('应该在重置时清空订阅', () => {
      device.subscribeCharacteristic('1800', 'char-1');
      device.reset();

      expect(device.getSubscribedCharacteristics()).toHaveLength(0);
    });
  });

  describe('服务数据管理', () => {
    it('应该支持设置和获取服务数据', () => {
      const data = new ArrayBuffer(10);
      device.setServiceData('1800', data);

      const retrieved = device.getServiceData('1800');
      expect(retrieved).toBe(data);

      const notFound = device.getServiceData('180A');
      expect(notFound).toBeUndefined();
    });

    it('应该支持多个服务数据', () => {
      const data1 = new ArrayBuffer(10);
      const data2 = new ArrayBuffer(20);

      device.setServiceData('1800', data1);
      device.setServiceData('180A', data2);

      expect(device.getServiceData('1800')).toBe(data1);
      expect(device.getServiceData('180A')).toBe(data2);
    });

    it('应该在重置时清空服务数据', () => {
      device.setServiceData('1800', new ArrayBuffer(10));
      device.reset();

      expect(device.getServiceData('1800')).toBeUndefined();
      expect(device.serviceData.size).toBe(0);
    });
  });

  describe('制造商数据管理', () => {
    it('应该支持设置制造商数据', () => {
      const data = new ArrayBuffer(15);
      device.setManufacturerData(data);

      expect(device.manufacturerData).toBe(data);
    });

    it('应该在重置时清空制造商数据', () => {
      device.setManufacturerData(new ArrayBuffer(15));
      device.reset();

      expect(device.manufacturerData).toBeUndefined();
    });
  });

  describe('元数据管理', () => {
    it('应该支持设置和获取元数据', () => {
      device.metadata['key1'] = 'value1';
      device.metadata['key2'] = 123;

      expect(device.metadata['key1']).toBe('value1');
      expect(device.metadata['key2']).toBe(123);
    });

    it('应该在重置时清空元数据', () => {
      device.metadata['key1'] = 'value1';
      device.reset();

      expect(Object.keys(device.metadata)).toHaveLength(0);
    });
  });

  describe('设备信息摘要', () => {
    it('应该提供完整的设备摘要', () => {
      device.updateState(BluetoothDeviceState.CONNECTED);
      device.addService('1800');
      device.subscribeCharacteristic('1800', 'char-1');

      const summary = device.getSummary();

      expect(summary.id).toBe('test-device-id');
      expect(summary.name).toBe('Test Device');
      expect(summary.address).toBe('00:11:22:33:44:55');
      expect(summary.type).toBe(BluetoothDeviceType.UNKNOWN);
      expect(summary.state).toBe(BluetoothDeviceState.CONNECTED);
      expect(summary.connectable).toBe(true);
      expect(summary.servicesCount).toBe(1);
      expect(summary.subscribedCharacteristicsCount).toBe(1);
      expect(summary.lastConnected).toBeDefined();
    });
  });

  describe('设备克隆', () => {
    it('应该正确克隆设备', () => {
      device.updateState(BluetoothDeviceState.CONNECTED);
      device.addService('1800');
      device.subscribeCharacteristic('1800', 'char-1');
      device.setServiceData('1800', new ArrayBuffer(10));
      device.setManufacturerData(new ArrayBuffer(15));
      device.metadata['key1'] = 'value1';

      const cloned = device.clone();

      expect(cloned.id).toBe(device.id);
      expect(cloned.name).toBe(device.name);
      expect(cloned.address).toBe(device.address);
      expect(cloned.type).toBe(device.type);
      expect(cloned.state).toBe(device.state);
      expect(cloned.rssi).toBe(device.rssi);
      expect(cloned.connectable).toBe(device.connectable);
      expect(cloned.services).toEqual(device.services);
      expect(cloned.lastConnected).toEqual(device.lastConnected);
      expect(cloned.getServiceData('1800')).toEqual(device.getServiceData('1800'));
      expect(cloned.manufacturerData).toEqual(device.manufacturerData);
      expect(cloned.metadata).toEqual(device.metadata);
      expect(cloned.isCharacteristicSubscribed('1800', 'char-1')).toBe(true);

      // 验证是深拷贝
      cloned.name = 'Cloned Device';
      expect(device.name).toBe('Test Device');
    });
  });

  describe('JSON序列化', () => {
    it('应该正确序列化为JSON', () => {
      device.updateState(BluetoothDeviceState.CONNECTED);
      device.metadata['key1'] = 'value1';

      const json = device.toJSON();

      expect(json.id).toBe('test-device-id');
      expect(json.name).toBe('Test Device');
      expect(json.address).toBe('00:11:22:33:44:55');
      expect(json.type).toBe(BluetoothDeviceType.UNKNOWN);
      expect(json.state).toBe(BluetoothDeviceState.CONNECTED);
      expect(json.rssi).toBe(-100);
      expect(json.connectable).toBe(true);
      expect(json.services).toEqual([]);
      expect(json.lastConnected).toBeDefined();
      expect(json.metadata).toEqual({ key1: 'value1' });
    });

    it('应该支持从JSON创建设备', () => {
      const json = {
        id: 'json-device-id',
        name: 'JSON Device',
        address: 'AA:BB:CC:DD:EE:FF',
        type: BluetoothDeviceType.PRINTER,
        state: BluetoothDeviceState.CONNECTED,
        rssi: -60,
        connectable: true,
        services: ['1800', '180A'],
        lastConnected: new Date().toISOString(),
        metadata: { key: 'value' }
      };

      const device = BluetoothDevice.fromJSON(json);

      expect(device.id).toBe('json-device-id');
      expect(device.name).toBe('JSON Device');
      expect(device.address).toBe('AA:BB:CC:DD:EE:FF');
      expect(device.type).toBe(BluetoothDeviceType.PRINTER);
      expect(device.state).toBe(BluetoothDeviceState.CONNECTED);
      expect(device.rssi).toBe(-60);
      expect(device.connectable).toBe(true);
      expect(device.services).toEqual(['1800', '180A']);
      expect(device.metadata).toEqual({ key: 'value' });
    });
  });

  describe('广播数据解析', () => {
    it('应该解析设备名称', () => {
      const name = 'Test Device';
      const nameBytes = new TextEncoder().encode(name);
      const data = new Uint8Array([
        1 + nameBytes.length, // Length
        0x09, // Complete Local Name
        ...nameBytes
      ]);

      device.updateAdvertisementData(data.buffer);

      expect(device.name).toBe(name);
    });

    it('应该解析16位服务UUID', () => {
      const data = new Uint8Array([
        3, // Length
        0x03, // Complete List of 16-bit Service Class UUIDs
        0x00, 0x18 // Generic Access Service
      ]);

      device.updateAdvertisementData(data.buffer);

      expect(device.hasService('1800')).toBe(true);
    });

    it('应该解析TX功率级别', () => {
      const data = new Uint8Array([
        2, // Length
        0x0A, // Tx Power Level
        0x08 // +8 dBm
      ]);

      device.updateAdvertisementData(data.buffer);

      expect(device.metadata.txPowerLevel).toBe(8);
    });

    it('应该解析制造商数据', () => {
      const manufacturerData = new Uint8Array([0x12, 0x34, 0x56, 0x78]);
      const data = new Uint8Array([
        1 + manufacturerData.length, // Length
        0xFF, // Manufacturer Specific Data
        ...manufacturerData
      ]);

      device.updateAdvertisementData(data.buffer);

      expect(device.manufacturerData).toEqual(manufacturerData.buffer);
      expect(device.metadata.manufacturerId).toBe(0x3412); // Little endian
    });

    it('应该处理无效数据', () => {
      // 空数据
      device.updateAdvertisementData(new ArrayBuffer(0));
      expect(device.services).toEqual([]);

      // 无效长度
      const invalidData = new Uint8Array([0xFF, 0x01]);
      device.updateAdvertisementData(invalidData.buffer);
      // 应该不会抛出错误
    });
  });

  describe('边界情况', () => {
    it('应该处理空设备名称', () => {
      const device = new BluetoothDevice('test', '', 'address');
      expect(device.name).toBe('');
    });

    it('应该处理极低的信号强度', () => {
      device.updateRSSI(-1000);
      expect(device.rssi).toBe(-1000);
    });

    it('应该处理重复状态更新', () => {
      const now = new Date();
      device.updateState(BluetoothDeviceState.CONNECTED);
      const firstConnectTime = device.lastConnected;

      // 等待一毫秒确保时间不同
      setTimeout(() => {
        device.updateState(BluetoothDeviceState.CONNECTED);
        expect(device.lastConnected).toBe(firstConnectTime); // 不应该更新
      }, 1);
    });

    it('应该处理无效的订阅操作', () => {
      // 取消订阅未订阅的特征值
      device.unsubscribeCharacteristic('1800', 'char-1');
      expect(device.isCharacteristicSubscribed('1800', 'char-1')).toBe(false);
    });
  });
});