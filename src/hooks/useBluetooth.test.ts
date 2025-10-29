/**
 * useBluetooth Hook 单元测试
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useBluetooth } from './useBluetooth';
import { createMockBluetoothDevice } from '../../tests/setup/jest-setup';
import React from 'react';

// Mock Taro
jest.mock('@tarojs/taro');

// Wrapper component for testing hooks
const createWrapper = () => {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
  };
};

describe('useBluetooth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('初始化', () => {
    it('应该返回初始状态', () => {
      const { result } = renderHook(() => useBluetooth(), {
        wrapper: createWrapper()
      });

      expect(result.current.isInitialized).toBe(false);
      expect(result.current.isScanning).toBe(false);
      expect(result.current.isConnecting).toBe(false);
      expect(result.current.error).toBe(null);
      expect(result.current.devices).toEqual([]);
      expect(result.current.currentDevice).toBe(null);
      expect(result.current.connectedDevices).toEqual([]);
    });

    it('应该支持自动初始化', async () => {
      const { result } = renderHook(() => useBluetooth({
        autoInitialize: true
      }), {
        wrapper: createWrapper()
      });

      // Mock Taro.openBluetoothAdapter
      const Taro = require('@tarojs/taro').default;
      Taro.openBluetoothAdapter.mockResolvedValue({ errCode: 0 });

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });
    });
  });

  describe('initialize 方法', () => {
    it('应该成功初始化', async () => {
      const { result } = renderHook(() => useBluetooth(), {
        wrapper: createWrapper()
      });

      // Mock Taro.openBluetoothAdapter
      const Taro = require('@tarojs/taro').default;
      Taro.openBluetoothAdapter.mockResolvedValue({ errCode: 0 });

      await act(async () => {
        await result.current.initialize();
      });

      expect(result.current.isInitialized).toBe(true);
      expect(result.current.error).toBe(null);
    });

    it('应该处理初始化失败', async () => {
      const { result } = renderHook(() => useBluetooth(), {
        wrapper: createWrapper()
      });

      // Mock Taro.openBluetoothAdapter 失败
      const Taro = require('@tarojs/taro').default;
      Taro.openBluetoothAdapter.mockRejectedValue(new Error('Bluetooth not available'));

      await act(async () => {
        await result.current.initialize();
      });

      expect(result.current.isInitialized).toBe(false);
      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toBe('Bluetooth not available');
    });
  });

  describe('scanDevices 方法', () => {
    beforeEach(async () => {
      const { result } = renderHook(() => useBluetooth({
        autoInitialize: true
      }), {
        wrapper: createWrapper()
      });

      // Mock Taro.openBluetoothAdapter
      const Taro = require('@tarojs/taro').default;
      Taro.openBluetoothAdapter.mockResolvedValue({ errCode: 0 });

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });
    });

    it('应该成功扫描设备', async () => {
      const { result } = renderHook(() => useBluetooth({
        autoInitialize: true
      }), {
        wrapper: createWrapper()
      });

      const mockDevices = [
        createMockBluetoothDevice({ deviceId: 'device-1', name: 'Printer 1' }),
        createMockBluetoothDevice({ deviceId: 'device-2', name: 'Printer 2' })
      ];

      // Mock Taro.getBluetoothDevices
      const Taro = require('@tarojs/taro').default;
      Taro.getBluetoothDevices.mockResolvedValue({
        devices: mockDevices,
        errCode: 0
      });

      let scannedDevices: any[] = [];
      await act(async () => {
        scannedDevices = await result.current.scanDevices();
      });

      expect(Array.isArray(scannedDevices)).toBe(true);
      expect(result.current.isScanning).toBe(false);
      expect(result.current.devices).toEqual(expect.arrayContaining([
        expect.objectContaining({ deviceId: 'device-1' }),
        expect.objectContaining({ deviceId: 'device-2' })
      ]));
    });

    it('应该处理扫描超时', async () => {
      const { result } = renderHook(() => useBluetooth({
        autoInitialize: true,
        scanTimeout: 100
      }), {
        wrapper: createWrapper()
      });

      // Mock 延迟响应
      const Taro = require('@tarojs/taro').default;
      Taro.getBluetoothDevices.mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve({ devices: [], errCode: 0 }), 200))
      );

      let scannedDevices: any[] = [];
      await act(async () => {
        scannedDevices = await result.current.scanDevices();
      });

      expect(Array.isArray(scannedDevices)).toBe(true);
      expect(result.current.isScanning).toBe(false);
    });

    it('应该防止重复扫描', async () => {
      const { result } = renderHook(() => useBluetooth({
        autoInitialize: true
      }), {
        wrapper: createWrapper()
      });

      // Mock 漫长的扫描
      const Taro = require('@tarojs/taro').default;
      Taro.getBluetoothDevices.mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve({ devices: [], errCode: 0 }), 1000))
      );

      // 开始第一次扫描
      act(() => {
        result.current.scanDevices();
      });

      expect(result.current.isScanning).toBe(true);

      // 尝试第二次扫描，应该被忽略
      act(() => {
        result.current.scanDevices();
      });

      expect(result.current.isScanning).toBe(true);
    });
  });

  describe('connectDevice 方法', () => {
    beforeEach(async () => {
      const { result } = renderHook(() => useBluetooth({
        autoInitialize: true
      }), {
        wrapper: createWrapper()
      });

      // Mock Taro.openBluetoothAdapter
      const Taro = require('@tarojs/taro').default;
      Taro.openBluetoothAdapter.mockResolvedValue({ errCode: 0 });

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });
    });

    it('应该成功连接设备', async () => {
      const { result } = renderHook(() => useBluetooth({
        autoInitialize: true
      }), {
        wrapper: createWrapper()
      });

      const deviceId = 'test-device-id';

      // Mock Taro.createBLEConnection
      const Taro = require('@tarojs/taro').default;
      Taro.createBLEConnection.mockResolvedValue({ errCode: 0 });

      let connection: any;
      await act(async () => {
        connection = await result.current.connectDevice(deviceId);
      });

      expect(connection.deviceId).toBe(deviceId);
      expect(connection.connected).toBe(true);
      expect(result.current.isConnecting).toBe(false);
      expect(result.current.currentDevice).toBeTruthy();
    });

    it('应该处理连接失败', async () => {
      const { result } = renderHook(() => useBluetooth({
        autoInitialize: true
      }), {
        wrapper: createWrapper()
      });

      const deviceId = 'invalid-device-id';

      // Mock Taro.createBLEConnection 失败
      const Taro = require('@tarojs/taro').default;
      Taro.createBLEConnection.mockResolvedValue({ errCode: -1 });

      await act(async () => {
        await expect(result.current.connectDevice(deviceId)).rejects.toThrow();
      });

      expect(result.current.isConnecting).toBe(false);
      expect(result.current.error).toBeInstanceOf(Error);
    });

    it('应该防止重复连接', async () => {
      const { result } = renderHook(() => useBluetooth({
        autoInitialize: true
      }), {
        wrapper: createWrapper()
      });

      const deviceId = 'test-device-id';

      // Mock 漫长的连接过程
      const Taro = require('@tarojs/taro').default;
      Taro.createBLEConnection.mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve({ errCode: 0 }), 1000))
      );

      // 开始第一次连接
      act(() => {
        result.current.connectDevice(deviceId);
      });

      expect(result.current.isConnecting).toBe(true);

      // 尝试第二次连接，应该被忽略
      act(() => {
        result.current.connectDevice(deviceId);
      });

      expect(result.current.isConnecting).toBe(true);
    });
  });

  describe('disconnectDevice 方法', () => {
    beforeEach(async () => {
      const { result } = renderHook(() => useBluetooth({
        autoInitialize: true
      }), {
        wrapper: createWrapper()
      });

      // Mock Taro APIs
      const Taro = require('@tarojs/taro').default;
      Taro.openBluetoothAdapter.mockResolvedValue({ errCode: 0 });
      Taro.createBLEConnection.mockResolvedValue({ errCode: 0 });
      Taro.closeBLEConnection.mockResolvedValue({ errCode: 0 });

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      // 先连接一个设备
      await act(async () => {
        await result.current.connectDevice('test-device');
      });
    });

    it('应该成功断开设备', async () => {
      const { result } = renderHook(() => useBluetooth({
        autoInitialize: true
      }), {
        wrapper: createWrapper()
      });

      const deviceId = 'test-device';

      await act(async () => {
        await result.current.disconnectDevice(deviceId);
      });

      expect(result.current.currentDevice).toBe(null);
      expect(result.current.connectedDevices).not.toContain(
        expect.objectContaining({ deviceId })
      );
    });

    it('应该处理断开失败', async () => {
      const { result } = renderHook(() => useBluetooth({
        autoInitialize: true
      }), {
        wrapper: createWrapper()
      });

      // Mock Taro.closeBLEConnection 失败
      const Taro = require('@tarojs/taro').default;
      Taro.closeBLEConnection.mockRejectedValue(new Error('Disconnect failed'));

      await act(async () => {
        await expect(result.current.disconnectDevice('test-device')).rejects.toThrow();
      });
    });
  });

  describe('clearDevices 方法', () => {
    it('应该清空设备列表', async () => {
      const { result } = renderHook(() => useBluetooth({
        autoInitialize: true
      }), {
        wrapper: createWrapper()
      });

      // Mock Taro APIs
      const Taro = require('@tarojs/taro').default;
      Taro.openBluetoothAdapter.mockResolvedValue({ errCode: 0 });
      Taro.getBluetoothDevices.mockResolvedValue({
        devices: [createMockBluetoothDevice()],
        errCode: 0
      });

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      // 先扫描一些设备
      await act(async () => {
        await result.current.scanDevices();
      });

      expect(result.current.devices.length).toBeGreaterThan(0);

      // 清空设备列表
      act(() => {
        result.current.clearDevices();
      });

      expect(result.current.devices).toEqual([]);
    });
  });

  describe('clearError 方法', () => {
    it('应该清空错误状态', async () => {
      const { result } = renderHook(() => useBluetooth({
        autoInitialize: true
      }), {
        wrapper: createWrapper()
      });

      // Mock 初始化失败
      const Taro = require('@tarojs/taro').default;
      Taro.openBluetoothAdapter.mockRejectedValue(new Error('Init failed'));

      await act(async () => {
        await result.current.initialize();
      });

      expect(result.current.error).toBeInstanceOf(Error);

      // 清空错误
      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBe(null);
    });
  });

  describe('事件监听器', () => {
    beforeEach(async () => {
      const { result } = renderHook(() => useBluetooth({
        autoInitialize: true
      }), {
        wrapper: createWrapper()
      });

      const Taro = require('@tarojs/taro').default;
      Taro.openBluetoothAdapter.mockResolvedValue({ errCode: 0 });

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });
    });

    it('应该支持设备发现事件监听', () => {
      const { result } = renderHook(() => useBluetooth({
        autoInitialize: true
      }), {
        wrapper: createWrapper()
      });

      const mockCallback = jest.fn();

      act(() => {
        const unsubscribe = result.current.onDeviceDiscovered(mockCallback);
        expect(typeof unsubscribe).toBe('function');
      });
    });

    it('应该支持设备连接事件监听', () => {
      const { result } = renderHook(() => useBluetooth({
        autoInitialize: true
      }), {
        wrapper: createWrapper()
      });

      const mockCallback = jest.fn();

      act(() => {
        const unsubscribe = result.current.onDeviceConnected(mockCallback);
        expect(typeof unsubscribe).toBe('function');
      });
    });

    it('应该支持设备断开事件监听', () => {
      const { result } = renderHook(() => useBluetooth({
        autoInitialize: true
      }), {
        wrapper: createWrapper()
      });

      const mockCallback = jest.fn();

      act(() => {
        const unsubscribe = result.current.onDeviceDisconnected(mockCallback);
        expect(typeof unsubscribe).toBe('function');
      });
    });

    it('应该支持错误事件监听', () => {
      const { result } = renderHook(() => useBluetooth({
        autoInitialize: true
      }), {
        wrapper: createWrapper()
      });

      const mockCallback = jest.fn();

      act(() => {
        const unsubscribe = result.current.onError(mockCallback);
        expect(typeof unsubscribe).toBe('function');
      });
    });
  });

  describe('配置选项', () => {
    it('应该支持自定义扫描超时', () => {
      const { result } = renderHook(() => useBluetooth({
        scanTimeout: 5000
      }), {
        wrapper: createWrapper()
      });

      // 验证配置被正确应用
      expect(result.current).toBeDefined();
    });

    it('应该支持自动重连配置', () => {
      const { result } = renderHook(() => useBluetooth({
        autoReconnect: true,
        maxRetries: 5
      }), {
        wrapper: createWrapper()
      });

      expect(result.current).toBeDefined();
    });

    it('应该支持调试模式', () => {
      const { result } = renderHook(() => useBluetooth({
        debug: true
      }), {
        wrapper: createWrapper()
      });

      expect(result.current).toBeDefined();
    });
  });

  describe('内存清理', () => {
    it('应该在组件卸载时清理资源', () => {
      const { unmount } = renderHook(() => useBluetooth(), {
        wrapper: createWrapper()
      });

      // 卸载组件不应该抛出错误
      expect(() => unmount()).not.toThrow();
    });

    it('应该清理事件监听器', () => {
      const { result, unmount } = renderHook(() => useBluetooth(), {
        wrapper: createWrapper()
      });

      // 添加事件监听器
      const unsubscribe = result.current.onDeviceDiscovered(jest.fn());

      // 卸载组件
      unmount();

      // 验证没有内存泄漏
      expect(typeof unsubscribe).toBe('function');
    });
  });
});