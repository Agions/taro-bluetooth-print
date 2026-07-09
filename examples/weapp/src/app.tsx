/**
 * 微信小程序 app.tsx 入口
 * - 全局初始化蓝牙适配器
 * - 暴露单例 printer / deviceManager / printQueue
 */
import { PropsWithChildren } from 'react';
import Taro from '@tarojs/taro';
import { createBluetoothPrinter, TaroAdapter, DeviceManager, PrintQueue } from 'taro-bluetooth-print';

import './app.less';

// 初始化全局打印机实例（TaroAdapter 自动适配微信小程序 API）
const printer = createBluetoothPrinter({
  adapter: new TaroAdapter()
});
const deviceManager = new DeviceManager();
const printQueue = new PrintQueue({ maxSize: 50 });

// 暴露到全局（方便页面直接 getApp().globalData 拿）
Taro.getApp && (Taro as any).appInstance?.globalData;

class App extends Taro.Component<PropsWithChildren> {
  componentDidMount() {
    // eslint-disable-next-line no-console
    console.log('[taro-bluetooth-print demo] app launched');
    // 监听全局错误
    Taro.onError((err) => {
      // eslint-disable-next-line no-console
      console.error('[global error]', err);
    });
  }

  render() {
    return this.props.children;
  }
}

// 全局状态 - 在页面中通过 getApp() 访问
const app = Taro.createApp(App, undefined, {
  globalData: { printer, deviceManager, printQueue }
});

export default app;
