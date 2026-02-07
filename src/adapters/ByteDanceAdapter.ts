/**
 * ByteDance Bluetooth Adapter
 * Implements the IPrinterAdapter interface for ByteDance Mini Program
 */

import { MiniProgramAdapter, MiniProgramBLEApi } from './BaseAdapter';

// Declare ByteDance global for TypeScript
interface ByteDanceGlobal extends MiniProgramBLEApi {}

declare const tt: ByteDanceGlobal;

/**
 * ByteDance Bluetooth Low Energy adapter
 *
 * Uses the ByteDance mini-program's BLE APIs (tt.xxx, for Douyin/TikTok etc).
 * All connection, write, and service discovery logic is inherited from MiniProgramAdapter.
 *
 * @example
 * ```typescript
 * const adapter = new ByteDanceAdapter();
 * await adapter.connect('device-id-123');
 * await adapter.write('device-id-123', buffer);
 * await adapter.disconnect('device-id-123');
 * ```
 */
export class ByteDanceAdapter extends MiniProgramAdapter {
  protected getApi(): MiniProgramBLEApi {
    return tt;
  }
}
