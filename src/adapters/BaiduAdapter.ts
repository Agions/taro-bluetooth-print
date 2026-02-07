/**
 * Baidu Bluetooth Adapter
 * Implements the IPrinterAdapter interface for Baidu Smart Program
 */

import { MiniProgramAdapter, MiniProgramBLEApi } from './BaseAdapter';

// Declare Baidu global for TypeScript
interface BaiduGlobal extends MiniProgramBLEApi {}

declare const swan: BaiduGlobal;

/**
 * Baidu Bluetooth Low Energy adapter
 *
 * Uses the Baidu smart program's BLE APIs (swan.xxx).
 * All connection, write, and service discovery logic is inherited from MiniProgramAdapter.
 *
 * @example
 * ```typescript
 * const adapter = new BaiduAdapter();
 * await adapter.connect('device-id-123');
 * await adapter.write('device-id-123', buffer);
 * await adapter.disconnect('device-id-123');
 * ```
 */
export class BaiduAdapter extends MiniProgramAdapter {
  protected getApi(): MiniProgramBLEApi {
    return swan;
  }
}
