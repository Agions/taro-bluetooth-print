/**
 * Taro Bluetooth Adapter
 */

import { IPrinterAdapter, PrinterState } from '../types';

// Declare Taro global for TypeScript
declare const Taro: any;

export class TaroAdapter implements IPrinterAdapter {
  private stateCallback?: (state: PrinterState) => void;

  async connect(deviceId: string): Promise<void> {
    this.updateState(PrinterState.CONNECTING);
    try {
      await Taro.createBLEConnection({ deviceId });
      this.updateState(PrinterState.CONNECTED);

      // Optional: Listen for connection state changes
      Taro.onBLEConnectionStateChange((res: any) => {
        if (res.deviceId === deviceId && !res.connected) {
          this.updateState(PrinterState.DISCONNECTED);
        }
      });
    } catch (error) {
      this.updateState(PrinterState.DISCONNECTED);
      throw error;
    }
  }

  async disconnect(deviceId: string): Promise<void> {
    this.updateState(PrinterState.DISCONNECTING);
    try {
      await Taro.closeBLEConnection({ deviceId });
      this.updateState(PrinterState.DISCONNECTED);
    } catch (error) {
      // Ignore error on disconnect
      this.updateState(PrinterState.DISCONNECTED);
    }
  }

  async write(deviceId: string, buffer: ArrayBuffer): Promise<void> {
    // We need serviceId and characteristicId. 
    // In a real app, we'd discover them. Here we assume they are passed or found.
    // For simplicity in this refactor, we'll implement a discovery helper or 
    // assume the user provides them, or we auto-discover on connect.
    // Let's add auto-discovery logic to connect() or just-in-time here.

    // Simplified: Get services and characteristics
    const services = await Taro.getBLEDeviceServices({ deviceId });
    // Find a service that looks like a printer service (usually 18F0 or similar, or just the first one with write char)
    // For this "Optimal Solution", we'll iterate to find a writeable characteristic.

    let targetServiceId = '';
    let targetCharId = '';

    for (const service of services.services) {
      const chars = await Taro.getBLEDeviceCharacteristics({ deviceId, serviceId: service.uuid });
      const writeChar = chars.characteristics.find((c: any) => c.properties.write || c.properties.writeWithoutResponse);
      if (writeChar) {
        targetServiceId = service.uuid;
        targetCharId = writeChar.uuid;
        break;
      }
    }

    if (!targetServiceId || !targetCharId) {
      throw new Error('No writeable characteristic found');
    }

    // Write in chunks (20 bytes is safe for BLE, but many support MTU negotiation. We'll stick to 20 for safety)
    const chunkSize = 20;
    const data = new Uint8Array(buffer);

    for (let i = 0; i < data.length; i += chunkSize) {
      const chunk = data.slice(i, i + chunkSize);
      await Taro.writeBLECharacteristicValue({
        deviceId,
        serviceId: targetServiceId,
        characteristicId: targetCharId,
        value: chunk.buffer
      });
      // Small delay to prevent congestion
      await new Promise(r => setTimeout(r, 20));
    }
  }

  onStateChange(callback: (state: PrinterState) => void): void {
    this.stateCallback = callback;
  }

  private updateState(state: PrinterState) {
    if (this.stateCallback) {
      this.stateCallback(state);
    }
  }
}
