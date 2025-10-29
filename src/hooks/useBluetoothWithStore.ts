/**
 * 增强版蓝牙Hook - 集成状态管理
 * 结合Zustand状态管理和React Hooks
 */

import { useEffect, useCallback, useMemo, useRef } from 'react';
import { BluetoothPrinter } from '../BluetoothPrinter';
import { IDeviceInfo, IConnectionInfo } from '../types';
import { useBluetoothStore } from '../store';
import { UseBluetoothOptions, UseBluetoothReturn } from './useBluetooth';

/**
 * 增强版蓝牙Hook
 * 在原有Hook基础上集成全局状态管理
 */
export function useBluetoothWithStore(options: UseBluetoothOptions = {}) {
  const {
    autoInitialize = true,
    scanTimeout = 10000,
    autoReconnect = false,
    reconnectInterval = 3000
  } = options;

  // 全局状态
  const {
    isInitialized,
    isInitializing,
    isScanning,
    isConnecting,
    devices,
    connectedDevices,
    currentDevice,
    error,
    scanTimeout: globalScanTimeout,
    setInitialized,
    setInitializing,
    setScanning,
    setScanTimeout,
    setConnecting,
    addDevice,
    updateDevice,
    removeDevice,
    addConnectedDevice,
    updateConnectedDevice,
    removeConnectedDevice,
    setCurrentDevice,
    setError,
    clearError,
  } = useBluetoothStore();

  // 本地状态和引用
  const printerRef = useRef<BluetoothPrinter | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const eventListenersRef = useRef<Map<string, Function[]>>(new Map());

  /**
   * 初始化蓝牙管理器
   */
  const initialize = useCallback(async () => {
    try {
      clearError();
      setInitializing(true);

      if (!printerRef.current) {
        printerRef.current = new BluetoothPrinter();
      }

      await printerRef.current.initialize();
      setInitialized(true);

      // 设置全局扫描超时
      setScanTimeout(scanTimeout);

      // 设置事件监听
      setupEventListeners();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '初始化失败';
      setError(errorMessage);
      throw err;
    } finally {
      setInitializing(false);
    }
  }, [scanTimeout, setInitialized, setInitializing, setScanTimeout, setError, clearError]);

  /**
   * 扫描蓝牙设备
   */
  const scanDevices = useCallback(async (timeout: number = globalScanTimeout) => {
    if (!isInitialized) {
      throw new Error('蓝牙未初始化');
    }

    try {
      clearError();
      setScanning(true);

      const discoveredDevices = await printerRef.current!.scanDevices(timeout);

      // 添加设备到全局状态
      discoveredDevices.forEach(device => {
        addDevice(device);
      });

      return discoveredDevices;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '扫描失败';
      setError(errorMessage);
      throw err;
    } finally {
      setScanning(false);
    }
  }, [isInitialized, globalScanTimeout, clearError, setScanning, addDevice, setError]);

  /**
   * 连接设备
   */
  const connectDevice = useCallback(async (deviceId: string) => {
    if (!isInitialized) {
      throw new Error('蓝牙未初始化');
    }

    try {
      clearError();
      setConnecting(true);

      const connection = await printerRef.current!.connectDevice(deviceId);

      // 添加到全局状态
      addConnectedDevice(connection);
      setCurrentDevice(connection);

      return connection;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '连接失败';
      setError(errorMessage);

      // 自动重连逻辑
      if (autoReconnect) {
        reconnectTimeoutRef.current = setTimeout(() => {
          connectDevice(deviceId).catch(() => {
            // 重连失败，不再重试
          });
        }, reconnectInterval);
      }

      throw err;
    } finally {
      setConnecting(false);
    }
  }, [isInitialized, autoReconnect, reconnectInterval, clearError, setConnecting, addConnectedDevice, setCurrentDevice, setError]);

  /**
   * 断开设备连接
   */
  const disconnectDevice = useCallback(async (deviceId: string) => {
    if (!isInitialized) {
      throw new Error('蓝牙未初始化');
    }

    try {
      clearError();

      await printerRef.current!.disconnectDevice(deviceId);

      // 从全局状态移除
      removeConnectedDevice(deviceId);

      if (currentDevice?.deviceId === deviceId) {
        setCurrentDevice(null);
      }

      // 清除重连定时器
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '断开连接失败';
      setError(errorMessage);
      throw err;
    }
  }, [isInitialized, currentDevice, clearError, removeConnectedDevice, setCurrentDevice, setError]);

  /**
   * 清空设备列表
   */
  const clearDevices = useCallback(() => {
    // 清空全局状态
    const { clear } = useBluetoothStore.getState();
    clear();
  }, []);

  /**
   * 设置事件监听器
   */
  const setupEventListeners = useCallback(() => {
    if (!printerRef.current) return;

    const handleDeviceDiscovered = (device: IDeviceInfo) => {
      addDevice(device);

      // 触发自定义事件监听器
      const listeners = eventListenersRef.current.get('deviceDiscovered') || [];
      listeners.forEach(listener => listener(device));
    };

    const handleDeviceConnected = (connection: IConnectionInfo) => {
      addConnectedDevice(connection);
      setCurrentDevice(connection);

      // 触发自定义事件监听器
      const listeners = eventListenersRef.current.get('deviceConnected') || [];
      listeners.forEach(listener => listener(connection));
    };

    const handleDeviceDisconnected = (deviceId: string) => {
      removeConnectedDevice(deviceId);

      if (currentDevice?.deviceId === deviceId) {
        setCurrentDevice(null);
      }

      // 触发自定义事件监听器
      const listeners = eventListenersRef.current.get('deviceDisconnected') || [];
      listeners.forEach(listener => listener(deviceId));
    };

    const handleError = (err: string) => {
      setError(err);

      // 触发自定义事件监听器
      const listeners = eventListenersRef.current.get('error') || [];
      listeners.forEach(listener => listener(err));
    };

    // 注册事件监听
    printerRef.current.on('deviceDiscovered', handleDeviceDiscovered);
    printerRef.current.on('deviceConnected', handleDeviceConnected);
    printerRef.current.on('deviceDisconnected', handleDeviceDisconnected);
    printerRef.current.on('connectionFailed', handleError);
  }, [currentDevice, addDevice, addConnectedDevice, removeConnectedDevice, setCurrentDevice, setError]);

  /**
   * 添加事件监听器
   */
  const addEventListener = useCallback((event: string, listener: Function) => {
    if (!eventListenersRef.current.has(event)) {
      eventListenersRef.current.set(event, []);
    }
    eventListenersRef.current.get(event)!.push(listener);

    // 返回清理函数
    return () => {
      const listeners = eventListenersRef.current.get(event);
      if (listeners) {
        const index = listeners.indexOf(listener);
        if (index > -1) {
          listeners.splice(index, 1);
        }
      }
    };
  }, []);

  // 便捷事件监听方法
  const onDeviceDiscovered = useCallback((callback: (device: IDeviceInfo) => void) => {
    return addEventListener('deviceDiscovered', callback);
  }, [addEventListener]);

  const onDeviceConnected = useCallback((callback: (connection: IConnectionInfo) => void) => {
    return addEventListener('deviceConnected', callback);
  }, [addEventListener]);

  const onDeviceDisconnected = useCallback((callback: (deviceId: string) => void) => {
    return addEventListener('deviceDisconnected', callback);
  }, [addEventListener]);

  const onError = useCallback((callback: (error: string) => void) => {
    return addEventListener('error', callback);
  }, [addEventListener]);

  // 计算属性
  const computedState = useMemo(() => ({
    hasDevices: devices.length > 0,
    hasConnectedDevices: connectedDevices.length > 0,
    isReady: isInitialized && !isScanning && !isConnecting,
    canScan: isInitialized && !isScanning,
    canConnect: isInitialized && !isConnecting,
  }), [isInitialized, isScanning, isConnecting, devices.length, connectedDevices.length]);

  // 自动初始化
  useEffect(() => {
    if (autoInitialize && !isInitialized && !isInitializing) {
      initialize().catch(() => {
        // 初始化失败，不抛出错误
      });
    }
  }, [autoInitialize, isInitialized, isInitializing, initialize]);

  // 清理函数
  useEffect(() => {
    return () => {
      // 清理定时器
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }

      // 销毁蓝牙实例
      if (printerRef.current) {
        printerRef.current.dispose().catch(() => {
          // 忽略销毁错误
        });
      }
    };
  }, []);

  return {
    // 基本状态
    isInitialized,
    isScanning,
    isConnecting,
    devices,
    connectedDevices,
    currentDevice,
    error,

    // 计算属性
    ...computedState,

    // 方法
    initialize,
    scanDevices,
    connectDevice,
    disconnectDevice,
    clearDevices,
    clearError,

    // 事件处理
    onDeviceDiscovered,
    onDeviceConnected,
    onDeviceDisconnected,
    onError,
  } as UseBluetoothReturn & typeof computedState;
}