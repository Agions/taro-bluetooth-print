/**
 * QQ Mini Program Bluetooth Adapter
 * Implements the IPrinterAdapter interface for QQ Mini Program
 */

import { MiniProgramAdapter, MiniProgramBLEApi } from './BaseAdapter';

// Declare QQ global for TypeScript
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface QQGlobal extends MiniProgramBLEApi {}

declare const qq: QQGlobal;

/**
 * QQ Mini Program Bluetooth Low Energy adapter
 *
 * Uses the QQ mini-program's BLE APIs (qq.xxx).
 * All connection, write, and service discovery logic is inherited from MiniProgramAdapter.
 *
 * @example
 * ```typescript
 * const adapter = new QQAdapter();
 * await adapter.connect('device-id-123');
 * await adapter.write('device-id-123', buffer);
 * await adapter.disconnect('device-id-123');
 * ```
 */
export class QQAdapter extends MiniProgramAdapter {
  /**
   * Returns the QQ mini-program BLE API object
   * @returns The qq global object providing BLE capabilities
   */
  protected getApi(): MiniProgramBLEApi {
    return qq;
  }
}
