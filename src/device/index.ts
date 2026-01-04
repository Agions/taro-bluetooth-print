/**
 * Device Manager Module
 * 设备管理模块 - 负责蓝牙设备扫描、连接、配对
 */

export { DeviceManager, deviceManager } from './DeviceManager';
export type {
  BluetoothDevice,
  ScanOptions,
  DeviceManagerEvents,
  IDeviceManager,
} from './DeviceManager';
