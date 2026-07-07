/**
 * Baidu Smart Program Bluetooth Adapter — wraps the `swan.*` BLE API.
 * All behavior inherited from {@link MiniProgramAdapter}.
 */
import { MiniProgramAdapter, MiniProgramBLEApi } from './BaseAdapter';

declare const swan: MiniProgramBLEApi;

export class BaiduAdapter extends MiniProgramAdapter {
  protected getApi(): MiniProgramBLEApi {
    return swan;
  }
}
