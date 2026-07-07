/**
 * QQ Mini Program Bluetooth Adapter — wraps the `qq.*` BLE API.
 * All behavior inherited from {@link MiniProgramAdapter}.
 */
import { MiniProgramAdapter, MiniProgramBLEApi } from './BaseAdapter';

declare const qq: MiniProgramBLEApi;

export class QQAdapter extends MiniProgramAdapter {
  protected getApi(): MiniProgramBLEApi {
    return qq;
  }
}
