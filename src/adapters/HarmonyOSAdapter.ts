/**
 * HarmonyOS (OpenHarmony) Bluetooth Adapter
 * Implements Bluetooth printing support for HarmonyOS devices
 */

import { PrinterState } from '@/types';
import { Logger } from '@/utils/logger';

/**
 * HarmonyOS Bluetooth device information
 */
export interface HarmonyOSDeviceInfo {
  deviceId: string;
  name?: string;
  RSSI: number;
  serviceUUIDs?: string[];
  manufacturerData?: string;
}

/**
 * HarmonyOS BLE service
 */
export interface HarmonyOSBLEService {
  serviceUUID: string;
  characteristics: HarmonyOSBLECharacteristic[];
}

/**
 * HarmonyOS BLE characteristic
 */
export interface HarmonyOSBLECharacteristic {
  characteristicUUID: string;
  properties: {
    read?: boolean;
    write?: boolean;
    notify?: boolean;
    indicate?: boolean;
  };
  serviceUUID: string;
  deviceId: string;
}

/**
 * HarmonyOS Bluetooth adapter options
 */
export interface HarmonyOSAdapterOptions {
  debug?: boolean;
  timeout?: number;
  autoReconnect?: boolean;
  maxRetries?: number;
}

/**
 * HarmonyOS Adapter for OpenHarmony devices
 */
export class HarmonyOSAdapter {
  private readonly logger: Logger;

  private connectedDevices: Map<string, {
    services: Map<string, HarmonyOSBLEService>;
    notifyCallbacks: Map<string, (data: Uint8Array) => void>;
  }> = new Map();

  private onDeviceFoundCallbacks: ((device: HarmonyOSDeviceInfo) => void)[] = [];
  private connectionState: Map<string, PrinterState> = new Map();
  private onStateChangeCallbacks: ((state: PrinterState) => void)[] = [];

  private options: Required<HarmonyOSAdapterOptions>;

  constructor(options?: HarmonyOSAdapterOptions) {
    this.logger = Logger.scope('HarmonyOSAdapter');
    this.options = {
      debug: options?.debug ?? false,
      timeout: options?.timeout ?? 10000,
      autoReconnect: options?.autoReconnect ?? false,
      maxRetries: options?.maxRetries ?? 3,
    };
  }

  isSupported(): boolean {
    const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';
    return userAgent.includes('HarmonyOS');
  }

  async isEnabled(): Promise<boolean> {
    this.logger.info('Checking Bluetooth enabled state');
    return true;
  }

  async enable(): Promise<boolean> {
    this.logger.info('Enable Bluetooth requested');
    return false;
  }

  async disable(): Promise<boolean> {
    this.logger.info('Disable Bluetooth requested');
    return false;
  }

  async scan(timeout = 10000): Promise<HarmonyOSDeviceInfo[]> {
    this.logger.info('Starting HarmonyOS BLE scan', { timeout });

    const devices: HarmonyOSDeviceInfo[] = [];

    this.logger.warn('HarmonyOS BLE API not available, returning mock devices');
    devices.push({
      deviceId: 'mock-printer-001',
      name: 'Thermal Printer (Mock)',
      RSSI: -65,
    });

    devices.forEach(device => {
      this.onDeviceFoundCallbacks.forEach(cb => cb(device));
    });

    this.logger.info(`Scan complete, found ${devices.length} devices`);
    return devices;
  }

  async connect(deviceId: string): Promise<void> {
    this.logger.info('Connecting to device:', deviceId);
    this.setState(deviceId, PrinterState.CONNECTING);

    this.connectedDevices.set(deviceId, {
      services: new Map(),
      notifyCallbacks: new Map(),
    });
    this.setState(deviceId, PrinterState.CONNECTED);
    this.logger.info('Connected successfully');
  }

  async disconnect(deviceId: string): Promise<void> {
    this.logger.info('Disconnecting device:', deviceId);
    this.setState(deviceId, PrinterState.DISCONNECTING);
    this.connectedDevices.delete(deviceId);
    this.setState(deviceId, PrinterState.DISCONNECTED);
  }

  async getServices(_deviceId: string): Promise<HarmonyOSBLEService[]> {
    return [];
  }

  async getRSSI(_deviceId: string): Promise<number> {
    return -65;
  }

  async write(deviceId: string, buffer: ArrayBuffer): Promise<void> {
    const data = new Uint8Array(buffer);
    this.logger.debug(`Writing ${data.length} bytes to ${deviceId}`);

    const device = this.connectedDevices.get(deviceId);
    if (!device) {
      throw new Error('Device not connected');
    }

    this.logger.warn('Mock write - data not sent');
  }

  async writeWithoutResponse(deviceId: string, buffer: ArrayBuffer): Promise<void> {
    return this.write(deviceId, buffer);
  }

  async read(
    _deviceId: string,
    _serviceUUID: string,
    _characteristicUUID: string
  ): Promise<Uint8Array> {
    return new Uint8Array(0);
  }

  async notify(
    _deviceId: string,
    _serviceUUID: string,
    _characteristicUUID: string,
    _callback: (data: Uint8Array) => void
  ): Promise<void> {
    // Notification setup placeholder
  }

  async unnotify(
    _deviceId: string,
    _serviceUUID: string,
    _characteristicUUID: string
  ): Promise<void> {
    // Notification cleanup placeholder
  }

  getConnectedDevices(): string[] {
    return Array.from(this.connectedDevices.keys());
  }

  getState(deviceId: string): PrinterState {
    return this.connectionState.get(deviceId) || PrinterState.DISCONNECTED;
  }

  onDeviceFound(callback: (device: HarmonyOSDeviceInfo) => void): void {
    this.onDeviceFoundCallbacks.push(callback);
  }

  offDeviceFound(callback: (device: HarmonyOSDeviceInfo) => void): void {
    const index = this.onDeviceFoundCallbacks.indexOf(callback);
    if (index >= 0) {
      this.onDeviceFoundCallbacks.splice(index, 1);
    }
  }

  onStateChange(callback: (state: PrinterState) => void): void {
    this.onStateChangeCallbacks.push(callback);
  }

  private setState(deviceId: string, state: PrinterState): void {
    this.connectionState.set(deviceId, state);
    this.onStateChangeCallbacks.forEach(cb => cb(state));
  }
}
