/**
 * ByteDance (Douyin/TikTok) Bluetooth Adapter — wraps the `tt.*` BLE API.
 * All behavior inherited from {@link MiniProgramAdapter}.
 */
import { MiniProgramAdapter, MiniProgramBLEApi } from './BaseAdapter';

declare const tt: MiniProgramBLEApi;

export class ByteDanceAdapter extends MiniProgramAdapter {
  protected getApi(): MiniProgramBLEApi {
    return tt;
  }
}
