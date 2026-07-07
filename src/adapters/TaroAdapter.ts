/**
 * Taro Bluetooth Adapter
 * Uses the Taro framework's BLE APIs (compatible with WeChat mini-program).
 *
 * All connection, write, and service discovery logic is inherited from
 * {@link MiniProgramAdapter}; this class only declares the Taro global.
 */
import { MiniProgramAdapter, MiniProgramBLEApi } from './BaseAdapter';

declare const Taro: MiniProgramBLEApi;

export class TaroAdapter extends MiniProgramAdapter {
  protected getApi(): MiniProgramBLEApi {
    return Taro;
  }
}
