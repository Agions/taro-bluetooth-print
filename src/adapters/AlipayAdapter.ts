/**
 * Alipay Bluetooth Adapter — wraps the Alipay mini-program's `my.*` BLE API.
 * All behavior inherited from {@link MiniProgramAdapter}.
 */
import { MiniProgramAdapter, MiniProgramBLEApi } from './BaseAdapter';

declare const my: MiniProgramBLEApi;

export class AlipayAdapter extends MiniProgramAdapter {
  protected getApi(): MiniProgramBLEApi {
    return my;
  }
}
