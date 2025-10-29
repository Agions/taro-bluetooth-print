/**
 * 状态管理Store
 * 使用Zustand管理全局状态
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { IDeviceInfo, IConnectionInfo, IQueueStatus, IPrintResult } from '../types';

// 蓝牙状态接口
export interface BluetoothState {
  // 初始化状态
  isInitialized: boolean;
  isInitializing: boolean;

  // 扫描状态
  isScanning: boolean;
  scanTimeout: number;

  // 连接状态
  isConnecting: boolean;

  // 设备数据
  devices: IDeviceInfo[];
  connectedDevices: IConnectionInfo[];
  currentDevice: IConnectionInfo | null;

  // 错误状态
  error: string | null;

  // 操作方法
  setInitialized: (initialized: boolean) => void;
  setInitializing: (initializing: boolean) => void;
  setScanning: (scanning: boolean) => void;
  setScanTimeout: (timeout: number) => void;
  setConnecting: (connecting: boolean) => void;
  setDevices: (devices: IDeviceInfo[]) => void;
  addDevice: (device: IDeviceInfo) => void;
  updateDevice: (deviceId: string, updates: Partial<IDeviceInfo>) => void;
  removeDevice: (deviceId: string) => void;
  setConnectedDevices: (devices: IConnectionInfo[]) => void;
  addConnectedDevice: (device: IConnectionInfo) => void;
  updateConnectedDevice: (deviceId: string, updates: Partial<IConnectionInfo>) => void;
  removeConnectedDevice: (deviceId: string) => void;
  setCurrentDevice: (device: IConnectionInfo | null) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  reset: () => void;
}

// 打印机状态接口
export interface PrinterState {
  // 初始化状态
  isInitialized: boolean;
  isInitializing: boolean;

  // 打印状态
  isPrinting: boolean;

  // 队列状态
  queueStatus: IQueueStatus;

  // 错误状态
  error: string | null;

  // 操作方法
  setInitialized: (initialized: boolean) => void;
  setInitializing: (initializing: boolean) => void;
  setPrinting: (printing: boolean) => void;
  setQueueStatus: (status: IQueueStatus) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  reset: () => void;
}

// 应用全局状态接口
export interface AppState {
  // 应用状态
  isLoading: boolean;
  theme: 'light' | 'dark' | 'auto';
  language: 'zh-CN' | 'en-US';

  // 用户偏好
  preferences: {
    autoConnect: boolean;
    scanTimeout: number;
    printTimeout: number;
    enableNotifications: boolean;
    enableSounds: boolean;
  };

  // 操作方法
  setLoading: (loading: boolean) => void;
  setTheme: (theme: 'light' | 'dark' | 'auto') => void;
  setLanguage: (language: 'zh-CN' | 'en-US') => void;
  updatePreferences: (preferences: Partial<AppState['preferences']>) => void;
  reset: () => void;
}

// 初始状态
const initialBluetoothState: Omit<BluetoothState, 'setInitialized' | 'setInitializing' | 'setScanning' | 'setScanTimeout' | 'setConnecting' | 'setDevices' | 'addDevice' | 'updateDevice' | 'removeDevice' | 'setConnectedDevices' | 'addConnectedDevice' | 'updateConnectedDevice' | 'removeConnectedDevice' | 'setCurrentDevice' | 'setError' | 'clearError' | 'reset'> = {
  isInitialized: false,
  isInitializing: false,
  isScanning: false,
  scanTimeout: 10000,
  isConnecting: false,
  devices: [],
  connectedDevices: [],
  currentDevice: null,
  error: null,
};

const initialPrinterState: Omit<PrinterState, 'setInitialized' | 'setInitializing' | 'setPrinting' | 'setQueueStatus' | 'setError' | 'clearError' | 'reset'> = {
  isInitialized: false,
  isInitializing: false,
  isPrinting: false,
  queueStatus: {
    size: 0,
    processing: 0,
    completed: 0,
    failed: 0,
    paused: false,
    processingJobs: []
  },
  error: null,
};

const initialAppState: Omit<AppState, 'setLoading' | 'setTheme' | 'setLanguage' | 'updatePreferences' | 'reset'> = {
  isLoading: false,
  theme: 'auto',
  language: 'zh-CN',
  preferences: {
    autoConnect: true,
    scanTimeout: 10000,
    printTimeout: 30000,
    enableNotifications: true,
    enableSounds: true,
  },
};

// 创建蓝牙状态Store
export const useBluetoothStore = create<BluetoothState>()(
  subscribeWithSelector((set, get) => ({
    ...initialBluetoothState,

    setInitialized: (initialized) => set({ isInitialized: initialized }),
    setInitializing: (initializing) => set({ isInitializing: initializing }),
    setScanning: (scanning) => set({ isScanning: scanning }),
    setScanTimeout: (timeout) => set({ scanTimeout: timeout }),
    setConnecting: (connecting) => set({ isConnecting: connecting }),

    setDevices: (devices) => set({ devices }),
    addDevice: (device) => set((state) => ({
      devices: state.devices.some(d => d.id === device.id)
        ? state.devices.map(d => d.id === device.id ? device : d)
        : [...state.devices, device]
    })),
    updateDevice: (deviceId, updates) => set((state) => ({
      devices: state.devices.map(d => d.id === deviceId ? { ...d, ...updates } : d)
    })),
    removeDevice: (deviceId) => set((state) => ({
      devices: state.devices.filter(d => d.id !== deviceId)
    })),

    setConnectedDevices: (devices) => set({ connectedDevices: devices }),
    addConnectedDevice: (device) => set((state) => ({
      connectedDevices: state.connectedDevices.some(d => d.deviceId === device.deviceId)
        ? state.connectedDevices.map(d => d.deviceId === device.deviceId ? device : d)
        : [...state.connectedDevices, device]
    })),
    updateConnectedDevice: (deviceId, updates) => set((state) => ({
      connectedDevices: state.connectedDevices.map(d => d.deviceId === deviceId ? { ...d, ...updates } : d)
    })),
    removeConnectedDevice: (deviceId) => set((state) => ({
      connectedDevices: state.connectedDevices.filter(d => d.deviceId !== deviceId)
    })),

    setCurrentDevice: (device) => set({ currentDevice: device }),
    setError: (error) => set({ error }),
    clearError: () => set({ error: null }),

    reset: () => set(initialBluetoothState),
  }))
);

// 创建打印机状态Store
export const usePrinterStore = create<PrinterState>()(
  subscribeWithSelector((set, get) => ({
    ...initialPrinterState,

    setInitialized: (initialized) => set({ isInitialized: initialized }),
    setInitializing: (initializing) => set({ isInitializing: initializing }),
    setPrinting: (printing) => set({ isPrinting: printing }),
    setQueueStatus: (status) => set({ queueStatus: status }),
    setError: (error) => set({ error }),
    clearError: () => set({ error: null }),

    reset: () => set(initialPrinterState),
  }))
);

// 创建应用全局状态Store
export const useAppStore = create<AppState>()(
  subscribeWithSelector((set, get) => ({
    ...initialAppState,

    setLoading: (loading) => set({ isLoading: loading }),
    setTheme: (theme) => set({ theme }),
    setLanguage: (language) => set({ language }),
    updatePreferences: (preferences) => set((state) => ({
      preferences: { ...state.preferences, ...preferences }
    })),

    reset: () => set(initialAppState),
  }))
);

// 组合Hook - 获取所有状态
export const useStore = () => {
  const bluetooth = useBluetoothStore();
  const printer = usePrinterStore();
  const app = useAppStore();

  return {
    bluetooth,
    printer,
    app,
  };
};

// 便捷的选择器Hooks
export const useBluetoothState = () => useBluetoothStore();
export const usePrinterState = () => usePrinterStore();
export const useAppState = () => useAppStore();