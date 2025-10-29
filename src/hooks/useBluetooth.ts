/**
 * 蓝牙管理Hook
 * 提供蓝牙设备扫描、连接和状态管理功能
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { BluetoothPrinter } from '../BluetoothPrinter';
import { IDeviceInfo, IConnectionInfo } from '../types';

export interface UseBluetoothOptions {
  /** 是否自动初始化 */
  autoInitialize?: boolean;
  /** 扫描超时时间（毫秒） */
  scanTimeout?: number;
  /** 是否启用自动重连 */
  autoReconnect?: boolean;
  /** 重连间隔（毫秒） */
  reconnectInterval?: number;
}

export interface UseBluetoothReturn {
  /** 蓝牙状态 */
  isInitialized: boolean;
  /** 是否正在扫描 */
  isScanning: boolean;
  /** 是否正在连接 */
  isConnecting: boolean;
  /** 已发现的设备列表 */
  devices: IDeviceInfo[];
  /** 已连接的设备列表 */
  connectedDevices: IConnectionInfo[];
  /** 当前连接的设备 */
  currentDevice: IConnectionInfo | null;
  /** 错误信息 */
  error: string | null;

  /** 方法 */
  initialize: () => Promise<void>;
  scanDevices: (timeout?: number) => Promise<IDeviceInfo[]>;
  connectDevice: (deviceId: string) => Promise<IConnectionInfo>;
  disconnectDevice: (deviceId: string) => Promise<void>;
  clearDevices: () => void;
  clearError: () => void;

  /** 事件处理 */
  onDeviceDiscovered: (callback: (device: IDeviceInfo) => void) => void;
  onDeviceConnected: (callback: (connection: IConnectionInfo) => void) => void;
  onDeviceDisconnected: (callback: (deviceId: string) => void) => void;
  onError: (callback: (error: string) => void) => void;
}

/**
 * 蓝牙管理Hook
 */
export function useBluetooth(options: UseBluetoothOptions = {}): UseBluetoothReturn {
  const {
    autoInitialize = true,
    scanTimeout = 10000,
    autoReconnect = false,
    reconnectInterval = 3000
  } = options;

  // 状态管理
  const [isInitialized, setIsInitialized] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [devices, setDevices] = useState<IDeviceInfo[]>([]);
  const [connectedDevices, setConnectedDevices] = useState<IConnectionInfo[]>([]);
  const [currentDevice, setCurrentDevice] = useState<IConnectionInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 引用管理
  const bluetoothRef = useRef<BluetoothPrinter | null>(null);
  const scanTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const eventListenersRef = useRef<Map<string, Function[]>>(new Map());

  /**
   * 初始化蓝牙管理器
   */
  const initialize = useCallback(async () => {
    try {
      setError(null);

      if (!bluetoothRef.current) {
        bluetoothRef.current = new BluetoothPrinter();
      }

      await bluetoothRef.current.initialize();
      setIsInitialized(true);

      // 设置事件监听
      setupEventListeners();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '初始化失败';
      setError(errorMessage);
      throw err;
    }
  }, []);

  /**
   * 扫描蓝牙设备
   */
  const scanDevices = useCallback(async (timeout: number = scanTimeout) => {
    if (!isInitialized) {
      throw new Error('蓝牙未初始化');
    }

    try {
      setError(null);
      setIsScanning(true);

      const discoveredDevices = await bluetoothRef.current!.scanDevices(timeout);
      setDevices(prevDevices => {
        // 合并设备列表，避免重复
        const existingDeviceIds = new Set(prevDevices.map(d => d.id));
        const newDevices = discoveredDevices.filter(d => !existingDeviceIds.has(d.id));
        return [...prevDevices, ...newDevices];
      });

      return discoveredDevices;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '扫描失败';
      setError(errorMessage);
      throw err;
    } finally {
      setIsScanning(false);
    }
  }, [isInitialized, scanTimeout]);

  /**
   * 连接设备
   */
  const connectDevice = useCallback(async (deviceId: string) => {
    if (!isInitialized) {
      throw new Error('蓝牙未初始化');
    }

    try {
      setError(null);
      setIsConnecting(true);

      const connection = await bluetoothRef.current!.connectDevice(deviceId);

      setConnectedDevices(prev => {
        const existing = prev.find(d => d.deviceId === deviceId);
        if (existing) {
          return prev.map(d => d.deviceId === deviceId ? connection : d);
        } else {
          return [...prev, connection];
        }
      });

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
      setIsConnecting(false);
    }
  }, [isInitialized, autoReconnect, reconnectInterval]);

  /**
   * 断开设备连接
   */
  const disconnectDevice = useCallback(async (deviceId: string) => {
    if (!isInitialized) {
      throw new Error('蓝牙未初始化');
    }

    try {
      setError(null);

      await bluetoothRef.current!.disconnectDevice(deviceId);

      setConnectedDevices(prev => prev.filter(d => d.deviceId !== deviceId));

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
  }, [isInitialized, currentDevice]);

  /**
   * 清空设备列表
   */
  const clearDevices = useCallback(() => {
    setDevices([]);
  }, []);

  /**
   * 清空错误信息
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * 设置事件监听器
   */
  const setupEventListeners = useCallback(() => {
    if (!bluetoothRef.current) return;

    const handleDeviceDiscovered = (device: IDeviceInfo) => {
      setDevices(prev => {
        const existing = prev.find(d => d.id === device.id);
        if (existing) {
          return prev.map(d => d.id === device.id ? device : d);
        } else {
          return [...prev, device];
        }
      });

      // 触发自定义事件监听器
      const listeners = eventListenersRef.current.get('deviceDiscovered') || [];
      listeners.forEach(listener => listener(device));
    };

    const handleDeviceConnected = (connection: IConnectionInfo) => {
      setConnectedDevices(prev => {
        const existing = prev.find(d => d.deviceId === connection.deviceId);
        if (existing) {
          return prev.map(d => d.deviceId === connection.deviceId ? connection : d);
        } else {
          return [...prev, connection];
        }
      });
      setCurrentDevice(connection);

      // 触发自定义事件监听器
      const listeners = eventListenersRef.current.get('deviceConnected') || [];
      listeners.forEach(listener => listener(connection));
    };

    const handleDeviceDisconnected = (deviceId: string) => {
      setConnectedDevices(prev => prev.filter(d => d.deviceId !== deviceId));

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
    bluetoothRef.current.on('deviceDiscovered', handleDeviceDiscovered);
    bluetoothRef.current.on('deviceConnected', handleDeviceConnected);
    bluetoothRef.current.on('deviceDisconnected', handleDeviceDisconnected);
    bluetoothRef.current.on('connectionFailed', handleError);
  }, [currentDevice]);

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

  // 自动初始化
  useEffect(() => {
    if (autoInitialize) {
      initialize().catch(() => {
        // 初始化失败，不抛出错误
      });
    }
  }, [autoInitialize, initialize]);

  // 清理函数
  useEffect(() => {
    return () => {
      // 清理定时器
      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current);
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }

      // 销毁蓝牙实例
      if (bluetoothRef.current) {
        bluetoothRef.current.dispose().catch(() => {
          // 忽略销毁错误
        });
      }
    };
  }, []);

  return {
    // 状态
    isInitialized,
    isScanning,
    isConnecting,
    devices,
    connectedDevices,
    currentDevice,
    error,

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
  };
}