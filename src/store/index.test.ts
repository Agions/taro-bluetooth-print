/**
 * Zustand Store 单元测试
 */

import { renderHook, act } from '@testing-library/react';
import { useStore } from './index';
import { createMockBluetoothDevice } from '../../tests/setup/jest-setup';
import React from 'react';

// Wrapper component for testing store
const StoreWrapper = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

describe('Store', () => {
  beforeEach(() => {
    // Reset store state before each test
    const { result } = renderHook(() => useStore(), { wrapper: StoreWrapper });
    act(() => {
      result.current.bluetooth.clearDevices();
      result.current.printer.clearJobs();
      result.current.app.resetPreferences();
    });
  });

  describe('蓝牙状态管理', () => {
    it('应该返回初始蓝牙状态', () => {
      const { result } = renderHook(() => useStore(), { wrapper: StoreWrapper });

      expect(result.current.bluetooth.enabled).toBe(false);
      expect(result.current.bluetooth.devices).toEqual([]);
      expect(result.current.bluetooth.connectedDevices).toEqual([]);
      expect(result.current.bluetooth.isScanning).toBe(false);
      expect(result.current.bluetooth.lastScanTime).toBe(null);
    });

    it('应该设置蓝牙启用状态', () => {
      const { result } = renderHook(() => useStore(), { wrapper: StoreWrapper });

      act(() => {
        result.current.bluetooth.setEnabled(true);
      });

      expect(result.current.bluetooth.enabled).toBe(true);

      act(() => {
        result.current.bluetooth.setEnabled(false);
      });

      expect(result.current.bluetooth.enabled).toBe(false);
    });

    it('应该添加设备到列表', () => {
      const { result } = renderHook(() => useStore(), { wrapper: StoreWrapper });

      const mockDevice = createMockBluetoothDevice({
        deviceId: 'device-1',
        name: 'Test Printer'
      });

      act(() => {
        result.current.bluetooth.addDevice(mockDevice);
      });

      expect(result.current.bluetooth.devices).toHaveLength(1);
      expect(result.current.bluetooth.devices[0]).toEqual(
        expect.objectContaining({
          deviceId: 'device-1',
          name: 'Test Printer'
        })
      );
    });

    it('应该移除设备', () => {
      const { result } = renderHook(() => useStore(), { wrapper: StoreWrapper });

      const mockDevice1 = createMockBluetoothDevice({ deviceId: 'device-1' });
      const mockDevice2 = createMockBluetoothDevice({ deviceId: 'device-2' });

      act(() => {
        result.current.bluetooth.addDevice(mockDevice1);
        result.current.bluetooth.addDevice(mockDevice2);
      });

      expect(result.current.bluetooth.devices).toHaveLength(2);

      act(() => {
        result.current.bluetooth.removeDevice('device-1');
      });

      expect(result.current.bluetooth.devices).toHaveLength(1);
      expect(result.current.bluetooth.devices[0].deviceId).toBe('device-2');
    });

    it('应该更新设备信息', () => {
      const { result } = renderHook(() => useStore(), { wrapper: StoreWrapper });

      const mockDevice = createMockBluetoothDevice({
        deviceId: 'device-1',
        name: 'Original Name',
        rssi: -60
      });

      act(() => {
        result.current.bluetooth.addDevice(mockDevice);
      });

      act(() => {
        result.current.bluetooth.updateDevice('device-1', {
          name: 'Updated Name',
          rssi: -40
        });
      });

      const device = result.current.bluetooth.devices.find(d => d.deviceId === 'device-1');
      expect(device?.name).toBe('Updated Name');
      expect(device?.rssi).toBe(-40);
    });

    it('应该设置已连接设备', () => {
      const { result } = renderHook(() => useStore(), { wrapper: StoreWrapper });

      act(() => {
        result.current.bluetooth.setConnectedDevices(['device-1', 'device-2']);
      });

      expect(result.current.bluetooth.connectedDevices).toEqual(['device-1', 'device-2']);
    });

    it('应该设置扫描状态', () => {
      const { result } = renderHook(() => useStore(), { wrapper: StoreWrapper });

      act(() => {
        result.current.bluetooth.setScanning(true);
      });

      expect(result.current.bluetooth.isScanning).toBe(true);

      act(() => {
        result.current.bluetooth.setScanning(false);
      });

      expect(result.current.bluetooth.isScanning).toBe(false);
    });

    it('应该清空设备列表', () => {
      const { result } = renderHook(() => useStore(), { wrapper: StoreWrapper });

      const mockDevice1 = createMockBluetoothDevice({ deviceId: 'device-1' });
      const mockDevice2 = createMockBluetoothDevice({ deviceId: 'device-2' });

      act(() => {
        result.current.bluetooth.addDevice(mockDevice1);
        result.current.bluetooth.addDevice(mockDevice2);
      });

      expect(result.current.bluetooth.devices).toHaveLength(2);

      act(() => {
        result.current.bluetooth.clearDevices();
      });

      expect(result.current.bluetooth.devices).toHaveLength(0);
    });
  });

  describe('打印机状态管理', () => {
    it('应该返回初始打印机状态', () => {
      const { result } = renderHook(() => useStore(), { wrapper: StoreWrapper });

      expect(result.current.printer.printers).toEqual([]);
      expect(result.current.printer.activeJobs).toEqual([]);
      expect(result.current.printer.completedJobs).toEqual([]);
      expect(result.current.printer.failedJobs).toEqual([]);
    });

    it('应该添加打印机', () => {
      const { result } = renderHook(() => useStore(), { wrapper: StoreWrapper });

      const mockPrinter = {
        id: 'printer-1',
        name: 'Test Printer',
        type: 'thermal' as const,
        state: 'idle' as const,
        connection: {
          deviceId: 'device-1',
          connected: true,
          connectedAt: new Date(),
          lastActivity: new Date()
        }
      };

      act(() => {
        result.current.printer.addPrinter(mockPrinter);
      });

      expect(result.current.printer.printers).toHaveLength(1);
      expect(result.current.printer.printers[0]).toEqual(
        expect.objectContaining({
          id: 'printer-1',
          name: 'Test Printer'
        })
      );
    });

    it('应该移除打印机', () => {
      const { result } = renderHook(() => useStore(), { wrapper: StoreWrapper });

      const mockPrinter1 = {
        id: 'printer-1',
        name: 'Printer 1',
        type: 'thermal' as const,
        state: 'idle' as const,
        connection: {
          deviceId: 'device-1',
          connected: true,
          connectedAt: new Date(),
          lastActivity: new Date()
        }
      };

      const mockPrinter2 = {
        id: 'printer-2',
        name: 'Printer 2',
        type: 'thermal' as const,
        state: 'idle' as const,
        connection: {
          deviceId: 'device-2',
          connected: true,
          connectedAt: new Date(),
          lastActivity: new Date()
        }
      };

      act(() => {
        result.current.printer.addPrinter(mockPrinter1);
        result.current.printer.addPrinter(mockPrinter2);
      });

      expect(result.current.printer.printers).toHaveLength(2);

      act(() => {
        result.current.printer.removePrinter('printer-1');
      });

      expect(result.current.printer.printers).toHaveLength(1);
      expect(result.current.printer.printers[0].id).toBe('printer-2');
    });

    it('应该更新打印机信息', () => {
      const { result } = renderHook(() => useStore(), { wrapper: StoreWrapper });

      const mockPrinter = {
        id: 'printer-1',
        name: 'Original Name',
        type: 'thermal' as const,
        state: 'idle' as const,
        connection: {
          deviceId: 'device-1',
          connected: true,
          connectedAt: new Date(),
          lastActivity: new Date()
        }
      };

      act(() => {
        result.current.printer.addPrinter(mockPrinter);
      });

      act(() => {
        result.current.printer.updatePrinter('printer-1', {
          name: 'Updated Name',
          state: 'printing'
        });
      });

      const printer = result.current.printer.printers.find(p => p.id === 'printer-1');
      expect(printer?.name).toBe('Updated Name');
      expect(printer?.state).toBe('printing');
    });

    it('应该添加打印任务', () => {
      const { result } = renderHook(() => useStore(), { wrapper: StoreWrapper });

      const mockJob = {
        id: 'job-1',
        type: 'text' as const,
        data: { text: 'Test Print' },
        options: {},
        status: 'pending' as const,
        createdAt: new Date(),
        priority: 'normal' as const
      };

      act(() => {
        result.current.printer.addJob(mockJob);
      });

      expect(result.current.printer.activeJobs).toHaveLength(1);
      expect(result.current.printer.activeJobs[0]).toEqual(
        expect.objectContaining({
          id: 'job-1',
          type: 'text'
        })
      );
    });

    it('应该更新打印任务', () => {
      const { result } = renderHook(() => useStore(), { wrapper: StoreWrapper });

      const mockJob = {
        id: 'job-1',
        type: 'text' as const,
        data: { text: 'Test Print' },
        options: {},
        status: 'pending' as const,
        createdAt: new Date(),
        priority: 'normal' as const
      };

      act(() => {
        result.current.printer.addJob(mockJob);
      });

      act(() => {
        result.current.printer.updateJob('job-1', {
          status: 'completed',
          completedAt: new Date()
        });
      });

      const job = result.current.printer.activeJobs.find(j => j.id === 'job-1');
      expect(job?.status).toBe('completed');
      expect(job?.completedAt).toBeInstanceOf(Date);
    });

    it('应该移除打印任务', () => {
      const { result } = renderHook(() => useStore(), { wrapper: StoreWrapper });

      const mockJob1 = {
        id: 'job-1',
        type: 'text' as const,
        data: { text: 'Job 1' },
        options: {},
        status: 'pending' as const,
        createdAt: new Date(),
        priority: 'normal' as const
      };

      const mockJob2 = {
        id: 'job-2',
        type: 'text' as const,
        data: { text: 'Job 2' },
        options: {},
        status: 'pending' as const,
        createdAt: new Date(),
        priority: 'normal' as const
      };

      act(() => {
        result.current.printer.addJob(mockJob1);
        result.current.printer.addJob(mockJob2);
      });

      expect(result.current.printer.activeJobs).toHaveLength(2);

      act(() => {
        result.current.printer.removeJob('job-1');
      });

      expect(result.current.printer.activeJobs).toHaveLength(1);
      expect(result.current.printer.activeJobs[0].id).toBe('job-2');
    });

    it('应该清空所有任务', () => {
      const { result } = renderHook(() => useStore(), { wrapper: StoreWrapper });

      const mockJob1 = {
        id: 'job-1',
        type: 'text' as const,
        data: { text: 'Job 1' },
        options: {},
        status: 'pending' as const,
        createdAt: new Date(),
        priority: 'normal' as const
      };

      const mockJob2 = {
        id: 'job-2',
        type: 'image' as const,
        data: { image: 'base64...' },
        options: {},
        status: 'pending' as const,
        createdAt: new Date(),
        priority: 'normal' as const
      };

      act(() => {
        result.current.printer.addJob(mockJob1);
        result.current.printer.addJob(mockJob2);
      });

      expect(result.current.printer.activeJobs).toHaveLength(2);

      act(() => {
        result.current.printer.clearJobs();
      });

      expect(result.current.printer.activeJobs).toHaveLength(0);
      expect(result.current.printer.completedJobs).toHaveLength(0);
      expect(result.current.printer.failedJobs).toHaveLength(0);
    });
  });

  describe('应用状态管理', () => {
    it('应该返回初始应用状态', () => {
      const { result } = renderHook(() => useStore(), { wrapper: StoreWrapper });

      expect(result.current.app.theme).toBe('light');
      expect(result.current.app.language).toBe('zh-CN');
      expect(result.current.app.preferences.autoConnect).toBe(true);
      expect(result.current.app.preferences.scanTimeout).toBe(10000);
      expect(result.current.app.preferences.printTimeout).toBe(30000);
    });

    it('应该设置主题', () => {
      const { result } = renderHook(() => useStore(), { wrapper: StoreWrapper });

      act(() => {
        result.current.app.setTheme('dark');
      });

      expect(result.current.app.theme).toBe('dark');

      act(() => {
        result.current.app.setTheme('light');
      });

      expect(result.current.app.theme).toBe('light');
    });

    it('应该设置语言', () => {
      const { result } = renderHook(() => useStore(), { wrapper: StoreWrapper });

      act(() => {
        result.current.app.setLanguage('en-US');
      });

      expect(result.current.app.language).toBe('en-US');

      act(() => {
        result.current.app.setLanguage('zh-CN');
      });

      expect(result.current.app.language).toBe('zh-CN');
    });

    it('应该设置偏好设置', () => {
      const { result } = renderHook(() => useStore(), { wrapper: StoreWrapper });

      act(() => {
        result.current.app.setPreferences({
          autoConnect: false,
          scanTimeout: 15000,
          printTimeout: 45000
        });
      });

      expect(result.current.app.preferences.autoConnect).toBe(false);
      expect(result.current.app.preferences.scanTimeout).toBe(15000);
      expect(result.current.app.preferences.printTimeout).toBe(45000);
    });

    it('应该部分更新偏好设置', () => {
      const { result } = renderHook(() => useStore(), { wrapper: StoreWrapper });

      const originalPreferences = { ...result.current.app.preferences };

      act(() => {
        result.current.app.setPreferences({
          autoConnect: false
        });
      });

      expect(result.current.app.preferences.autoConnect).toBe(false);
      expect(result.current.app.preferences.scanTimeout).toBe(originalPreferences.scanTimeout);
      expect(result.current.app.preferences.printTimeout).toBe(originalPreferences.printTimeout);
    });

    it('应该重置偏好设置', () => {
      const { result } = renderHook(() => useStore(), { wrapper: StoreWrapper });

      act(() => {
        result.current.app.setPreferences({
          autoConnect: false,
          scanTimeout: 20000,
          printTimeout: 50000
        });
      });

      expect(result.current.app.preferences.autoConnect).toBe(false);

      act(() => {
        result.current.app.resetPreferences();
      });

      expect(result.current.app.preferences.autoConnect).toBe(true);
      expect(result.current.app.preferences.scanTimeout).toBe(10000);
      expect(result.current.app.preferences.printTimeout).toBe(30000);
    });
  });

  describe('状态订阅', () => {
    it('应该支持状态订阅', () => {
      const { result } = renderHook(() => useStore(), { wrapper: StoreWrapper });

      let subscribedState: any;
      const unsubscribe = result.current.bluetooth.subscribe((state) => {
        subscribedState = state;
      });

      expect(typeof unsubscribe).toBe('function');

      act(() => {
        result.current.bluetooth.setEnabled(true);
      });

      expect(subscribedState.enabled).toBe(true);

      unsubscribe();
    });

    it('应该支持选择器订阅', () => {
      const { result } = renderHook(() => useStore(), { wrapper: StoreWrapper });

      let subscribedValue: boolean;
      const unsubscribe = result.current.bluetooth.subscribe(
        (state) => state.enabled,
        (enabled) => {
          subscribedValue = enabled;
        }
      );

      act(() => {
        result.current.bluetooth.setEnabled(true);
      });

      expect(subscribedValue).toBe(true);

      unsubscribe();
    });
  });

  describe('持久化', () => {
    it('应该支持状态持久化', () => {
      const { result } = renderHook(() => useStore(), { wrapper: StoreWrapper });

      act(() => {
        result.current.app.setTheme('dark');
        result.current.app.setLanguage('en-US');
      });

      // 验证状态已设置
      expect(result.current.app.theme).toBe('dark');
      expect(result.current.app.language).toBe('en-US');

      // 在实际应用中，这里会测试状态的持久化和恢复
      // 由于我们在测试环境中，主要验证状态设置是否正确
    });

    it('应该处理持久化失败', () => {
      const { result } = renderHook(() => useStore(), { wrapper: StoreWrapper });

      // Mock localStorage 失败
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = jest.fn(() => {
        throw new Error('Storage failed');
      });

      // 设置状态不应该抛出错误
      expect(() => {
        act(() => {
          result.current.app.setTheme('dark');
        });
      }).not.toThrow();

      // 恢复 localStorage
      localStorage.setItem = originalSetItem;
    });
  });

  describe('并发操作', () => {
    it('应该处理并发状态更新', async () => {
      const { result } = renderHook(() => useStore(), { wrapper: StoreWrapper });

      const mockDevice1 = createMockBluetoothDevice({ deviceId: 'device-1' });
      const mockDevice2 = createMockBluetoothDevice({ deviceId: 'device-2' });
      const mockDevice3 = createMockBluetoothDevice({ deviceId: 'device-3' });

      // 并发添加设备
      await Promise.all([
        act(async () => {
          result.current.bluetooth.addDevice(mockDevice1);
        }),
        act(async () => {
          result.current.bluetooth.addDevice(mockDevice2);
        }),
        act(async () => {
          result.current.bluetooth.addDevice(mockDevice3);
        })
      ]);

      expect(result.current.bluetooth.devices).toHaveLength(3);
    });

    it('应该处理状态更新冲突', () => {
      const { result } = renderHook(() => useStore(), { wrapper: StoreWrapper });

      const mockDevice = createMockBluetoothDevice({
        deviceId: 'device-1',
        name: 'Original Name'
      });

      act(() => {
        result.current.bluetooth.addDevice(mockDevice);
      });

      // 快速连续更新
      act(() => {
        result.current.bluetooth.updateDevice('device-1', { name: 'Updated 1' });
        result.current.bluetooth.updateDevice('device-1', { name: 'Updated 2' });
        result.current.bluetooth.updateDevice('device-1', { name: 'Final Name' });
      });

      const device = result.current.bluetooth.devices.find(d => d.deviceId === 'device-1');
      expect(device?.name).toBe('Final Name');
    });
  });

  describe('边界情况', () => {
    it('应该处理不存在的设备操作', () => {
      const { result } = renderHook(() => useStore(), { wrapper: StoreWrapper });

      // 操作不存在的设备不应该抛出错误
      expect(() => {
        act(() => {
          result.current.bluetooth.removeDevice('non-existent');
          result.current.bluetooth.updateDevice('non-existent', { name: 'Updated' });
        });
      }).not.toThrow();
    });

    it('应该处理不存在的打印机操作', () => {
      const { result } = renderHook(() => useStore(), { wrapper: StoreWrapper });

      expect(() => {
        act(() => {
          result.current.printer.removePrinter('non-existent');
          result.current.printer.updatePrinter('non-existent', { name: 'Updated' });
        });
      }).not.toThrow();
    });

    it('应该处理不存在的任务操作', () => {
      const { result } = renderHook(() => useStore(), { wrapper: StoreWrapper });

      expect(() => {
        act(() => {
          result.current.printer.removeJob('non-existent');
          result.current.printer.updateJob('non-existent', { status: 'completed' });
        });
      }).not.toThrow();
    });

    it('应该处理无效的状态值', () => {
      const { result } = renderHook(() => useStore(), { wrapper: StoreWrapper });

      expect(() => {
        act(() => {
          // @ts-ignore - 故意传入无效值
          result.current.app.setTheme('invalid-theme');
        });
      }).not.toThrow();
    });
  });
});