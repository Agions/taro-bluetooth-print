/**
 * Taro Bluetooth Adapter
 * Implements the IPrinterAdapter interface for Taro framework
 */

import { MiniProgramAdapter, MiniProgramBLEApi } from './BaseAdapter';

// Declare Taro global for TypeScript
interface TaroGlobal extends MiniProgramBLEApi {}

declare const Taro: TaroGlobal;

/**
 * Taro Bluetooth Low Energy adapter
 *
 * Uses the Taro framework's BLE APIs (compatible with WeChat mini-program).
 * All connection, write, and service discovery logic is inherited from MiniProgramAdapter.
 *
 * @example
 * ```typescript
 * const adapter = new TaroAdapter();
 * await adapter.connect('device-id-123');
 * await adapter.write('device-id-123', buffer);
 * await adapter.disconnect('device-id-123');
 * ```
 */
export class TaroAdapter extends MiniProgramAdapter {
  protected getApi(): MiniProgramBLEApi {
    return Taro;
  }
}
