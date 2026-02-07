/**
 * Alipay Bluetooth Adapter
 * Implements the IPrinterAdapter interface for Alipay Mini Program
 */

import { MiniProgramAdapter, MiniProgramBLEApi } from './BaseAdapter';

// Declare Alipay global for TypeScript
interface AlipayGlobal extends MiniProgramBLEApi {}

declare const my: AlipayGlobal;

/**
 * Alipay Bluetooth Low Energy adapter
 *
 * Uses the Alipay mini-program's BLE APIs (my.xxx).
 * All connection, write, and service discovery logic is inherited from MiniProgramAdapter.
 *
 * @example
 * ```typescript
 * const adapter = new AlipayAdapter();
 * await adapter.connect('device-id-123');
 * await adapter.write('device-id-123', buffer);
 * await adapter.disconnect('device-id-123');
 * ```
 */
export class AlipayAdapter extends MiniProgramAdapter {
  protected getApi(): MiniProgramBLEApi {
    return my;
  }
}
