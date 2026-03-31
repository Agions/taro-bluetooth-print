/**
 * Device Manager Module
 * 设备管理模块 - 负责蓝牙设备扫描、连接，配对
 */

export { DeviceManager, deviceManager } from './DeviceManager';
export type {
  BluetoothDevice,
  ScanOptions,
  DeviceManagerEvents,
  IDeviceManager,
} from './DeviceManager';

export { MultiPrinterManager, multiPrinterManager } from './MultiPrinterManager';
export type {
  PrinterConnection,
  MultiConnectOptions,
  BroadcastOptions,
  MultiPrinterManagerEvents,
} from './MultiPrinterManager';

// 增强型设备发现服务
export {
  DiscoveryService,
  discoveryService,
  type DiscoveredDevice,
  type DiscoveryOptions,
  type DeviceFilter,
  type SortOption,
  type DiscoveryEvents,
} from './DiscoveryService';
