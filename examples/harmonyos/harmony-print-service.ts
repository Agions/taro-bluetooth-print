/**
 * 鸿蒙 HarmonyOS 蓝牙打印服务示例
 *
 * ⚠️ 重要说明:
 * taro-bluetooth-print v2.15.x 暂未提供开箱即用的 HarmonyOS adapter
 * (目前内置: Taro / Alipay / Baidu / ByteDance / QQ / WebBluetooth 共 6 个)
 *
 * 鸿蒙接入需要:
 * 1. 基于 IPrinterAdapter 实现 HarmonyAdapter (用 @ohos.bluetooth.ble API)
 * 2. 把本文件的 HarmonyPrintService 与 HarmonyAdapter 配合使用
 *
 * 本文件演示:
 * - HarmonyPrintService 完整业务流程封装
 * - 参考的 HarmonyAdapter 接口签名
 * - 设备扫描/连接/打印的事件回调模式
 *
 * 实际接入时,先用本文件做参考,再按 IPrinterAdapter 写一个 HarmonyAdapter 即可
 */

// 库导出 (生产环境用真导入)
// import { createBluetoothPrinter, TsplDriver, CommandBuilder } from 'taro-bluetooth-print';
// import type { IPrinterAdapter } from 'taro-bluetooth-print';

/** 模拟设备类型 (生产环境用 @ohos.bluetooth 的 BluetoothDevice) */
interface MockBluetoothDevice {
  deviceId: string;
  name: string;
  rssi: number;
}

/** Service → UI 事件总线 */
type ServiceEvent =
  | 'progress'
  | 'error'
  | 'complete'
  | 'deviceFound'
  | 'stateChange'
  | 'log';

type ServiceEventPayload = {
  progress: number;
  error: { code?: string | number; message: string };
  complete: void;
  deviceFound: MockBluetoothDevice;
  stateChange: 'connected' | 'disconnected';
  log: string;
};

/**
 * 鸿蒙 BLE 适配器 — 伪代码,展示需要实现的方法
 *
 * 实际实现需要调用 HarmonyOS BLE API:
 * - @ohos.bluetoothManager.enableBluetooth()
 * - @ohos.bluetoothManager.startBLEScan({...})
 * - @ohos.bluetoothManager.connectGattClient(deviceId)
 * - characteristic.writeCharacteristicValue(...)
 *
 * 必须实现 IPrinterAdapter 接口:
 * - connect(deviceId): Promise<void>
 * - disconnect(): Promise<void>
 * - write(data: Uint8Array): Promise<void>
 */
class HarmonyAdapter {
  public debug: boolean;
  public autoReconnect: boolean;
  public deviceId: string;
  public connected: boolean;
  public onDeviceFoundCallback: ((d: MockBluetoothDevice) => void) | null;
  public onStateChangeCallback: ((s: 'connected' | 'disconnected') => void) | null;

  constructor(options: { debug?: boolean; autoReconnect?: boolean } = {}) {
    this.debug = options.debug ?? false;
    this.autoReconnect = options.autoReconnect ?? true;
    this.deviceId = '';
    this.connected = false;
    this.onDeviceFoundCallback = null;
    this.onStateChangeCallback = null;
  }

  /** 请求开启蓝牙 */
  async isEnabled(): Promise<boolean> {
    // 实际: bluetoothManager.getState() === STATE_ON
    return true;
  }

  async enable(): Promise<boolean> {
    // 实际: bluetoothManager.enableBluetooth()
    return true;
  }

  /** 扫描设备 (10s 超时) */
  async scan(timeoutMs = 10000): Promise<MockBluetoothDevice[]> {
    return new Promise<MockBluetoothDevice[]>((resolve) => {
      // 实际: bluetoothManager.startBLEScan(filters, callback)
      setTimeout(
        () => resolve([{ deviceId: 'mock-device-1', name: 'Printer-A', rssi: -45 }]),
        100
      );
      void timeoutMs;
    });
  }

  async connect(deviceId: string): Promise<void> {
    this.deviceId = deviceId;
    this.connected = true;
    this.onStateChangeCallback?.('connected');
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    this.onStateChangeCallback?.('disconnected');
  }

  async write(_data: Uint8Array): Promise<void> {
    if (!this.connected) throw new Error('Adapter not connected');
    // 实际: characteristic.writeCharacteristicValue({ value: data, ... })
  }

  onDeviceFound(cb: (d: MockBluetoothDevice) => void): void {
    this.onDeviceFoundCallback = cb;
  }
  onStateChange(cb: (s: 'connected' | 'disconnected') => void): void {
    this.onStateChangeCallback = cb;
  }
}

/** 模拟 printer 接口 (与 createBluetoothPrinter 行为对齐的最小子集) */
interface MockPrinter {
  on(event: 'progress' | 'error' | 'print-complete', cb: (data: any) => void): void;
  text(content: string, encoding?: string): MockPrinter;
  feed(lines?: number): MockPrinter;
  qr(content: string): MockPrinter;
  cut(): MockPrinter;
  print(): Promise<void>;
}

/**
 * 鸿蒙打印服务 — 业务封装
 */
type ReceiptOrder = {
  storeName: string;
  orderNo: string;
  items: Array<{ name: string; price: number; qty: number }>;
  total: number;
};

type LabelData = {
  productName: string;
  barcode: string;
};

class HarmonyPrintService {
  public adapter: HarmonyAdapter;
  public printer: MockPrinter;
  public connected: boolean;
  public deviceId: string;
  private _listeners: Map<ServiceEvent, Set<(data: any) => void>>;

  constructor() {
    this.adapter = new HarmonyAdapter({ debug: true, autoReconnect: true });
    // 真实用法: this.printer = createBluetoothPrinter({ adapter: this.adapter });
    this.printer = this._createMockPrinter();
    this.connected = false;
    this.deviceId = '';
    this._listeners = new Map();
    this._initEvents();
  }

  /** 模拟 printer (真实用 createBluetoothPrinter) */
  private _createMockPrinter(): MockPrinter {
    const listeners = new Map<string, Array<(data: any) => void>>();
    const emit = (event: string, data: any) => {
      (listeners.get(event) ?? []).forEach((cb) => cb(data));
    };
    const on = (event: string, cb: (data: any) => void) => {
      if (!listeners.has(event)) listeners.set(event, []);
      listeners.get(event)!.push(cb);
    };

    let cmd = '';
    const mock: any = {
      on,
      text(content: string, _encoding = 'GBK') {
        cmd += content;
        return mock;
      },
      feed(lines = 1) {
        cmd += '\n'.repeat(lines);
        return mock;
      },
      qr(content: string) {
        cmd += `[QR:${content}]`;
        return mock;
      },
      cut() {
        cmd += '[CUT]';
        return mock;
      },
      async print() {
        emit('progress', { sent: 100, total: 100 });
        emit('print-complete', undefined);
      }
    };
    return mock as MockPrinter;
  }

  /** 业务事件订阅 */
  on<E extends ServiceEvent>(event: E, callback: (data: ServiceEventPayload[E]) => void): void {
    if (!this._listeners.has(event)) this._listeners.set(event, new Set());
    this._listeners.get(event)!.add(callback as (data: any) => void);
  }

  private _emit<E extends ServiceEvent>(event: E, data: ServiceEventPayload[E]): void {
    this._listeners.get(event)?.forEach((cb) => cb(data));
  }

  /** 监听 printer / adapter 事件 */
  private _initEvents(): void {
    this.printer.on('progress', (p) => {
      const { sent, total } = p as { sent: number; total: number };
      this._emit('progress', (sent / total) * 100);
    });
    this.printer.on('error', (err) => {
      this._emit('error', { message: String(err) });
    });
    this.printer.on('print-complete', () => {
      this._emit('complete', undefined);
    });
    this.adapter.onDeviceFound((d) => this._emit('deviceFound', d));
    this.adapter.onStateChange((s) => this._emit('stateChange', s));
  }

  /** 初始化钩子 (鸿蒙场景下这里会 await somePermission() 等) */
  async init(): Promise<void> {
    // 实际: await abilityAccessCtrl.requestPermissions(['ohos.permission.BLUETOOTH', ...])
  }

  async checkBluetooth(): Promise<boolean> {
    try {
      const enabled = await this.adapter.isEnabled();
      if (!enabled) return await this.adapter.enable();
      return true;
    } catch (err) {
      console.error('checkBluetooth failed:', err);
      return false;
    }
  }

  async scanDevices(timeoutMs = 10000): Promise<MockBluetoothDevice[]> {
    return await this.adapter.scan(timeoutMs);
  }

  async connect(deviceId: string): Promise<void> {
    await this.adapter.connect(deviceId);
    this.connected = true;
    this.deviceId = deviceId;
  }

  async disconnect(): Promise<void> {
    if (!this.connected) return;
    await this.adapter.disconnect();
    this.connected = false;
    this.deviceId = '';
  }

  /** 打印测试页 */
  async printTestPage(): Promise<void> {
    if (!this.connected) throw new Error('请先连接打印机');
    await this.printer
      .text('=== 鸿蒙打印测试 ===')
      .feed()
      .text(`时间: ${new Date().toLocaleString()}`)
      .text(`设备: ${this.deviceId}`)
      .feed(2)
      .qr('https://harmonyos.dev')
      .feed(2)
      .cut()
      .print();
  }

  /** 打印收据 */
  async printReceipt(order: ReceiptOrder): Promise<void> {
    if (!this.connected) throw new Error('请先连接打印机');
    const { storeName, items, total, orderNo } = order;

    this.printer
      .text(storeName)
      .feed()
      .text('------------------------')
      .feed();

    items.forEach((it) => {
      const line = `${it.name} x${it.qty}`.padEnd(15) + `¥${it.price * it.qty}`;
      this.printer.text(line);
    });

    await this.printer
      .feed()
      .text('------------------------')
      .feed()
      .text(`合计: ¥${total}`)
      .text(`订单号: ${orderNo}`)
      .feed(2)
      .text('谢谢惠顾!')
      .feed(2)
      .cut()
      .print();
  }

  /** 打印标签 (TSPL) */
  async printLabel(data: LabelData): Promise<void> {
    if (!this.connected) throw new Error('请先连接打印机');
    // 真实用法:
    // const { TsplDriver, CommandBuilder, createBluetoothPrinter } = await import('taro-bluetooth-print');
    // const driver = new TsplDriver();
    // driver.size(60, 40).gap(3).clear()
    //   .text(data.productName, { x: 20, y: 20, font: 3 })
    //   .barcode(data.barcode, { x: 20, y: 160, type: 'EAN13', height: 60 });
    // const printer = createBluetoothPrinter({ adapter: this.adapter, commandBuilder: new CommandBuilder(driver) });
    // await printer.print();

    // 模拟: 直接 emit complete
    console.log('TSPL label bytes (mock) generated for', data.productName);
    this._emit('complete', undefined);
  }

  getState(): 'connected' | 'disconnected' {
    return this.connected ? 'connected' : 'disconnected';
  }
}

export { HarmonyAdapter, HarmonyPrintService };
export type { MockBluetoothDevice, ReceiptOrder, LabelData, ServiceEvent };
export default HarmonyPrintService;