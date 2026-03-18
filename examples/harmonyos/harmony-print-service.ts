/**
 * 鸿蒙 HarmonyOS 原生示例
 * 
 * 使用方法：
 * 1. 在 HarmonyOS 项目的 entry/src/main/ets 目录下创建
 * 2. 在 index.ets 中引入使用
 */

// 引入库 (假设已通过 npm 安装)
// import { BluetoothPrinter, HarmonyOSAdapter, TsplDriver } from 'taro-bluetooth-print';
// import { BusinessError } from '@kit.BasicServicesKit';

// 模拟导入（实际开发时请使用真实导入）
const BluetoothPrinter = require('../dist/index.cjs.js').BluetoothPrinter;
const HarmonyOSAdapter = require('../dist/index.cjs.js').HarmonyOSAdapter;
const TsplDriver = require('../dist/index.cjs.js').TsplDriver;

/**
 * 鸿蒙蓝牙打印服务
 */
class HarmonyPrintService {
  constructor() {
    // 创建适配器
    this.adapter = new HarmonyOSAdapter({
      debug: true,        // 开启调试日志
      timeout: 15000,    // 15秒超时
      autoReconnect: true // 自动重连
    });
    
    // 创建打印机
    this.printer = new BluetoothPrinter(this.adapter);
    
    // 状态
    this.connected = false;
    this.deviceId = '';
    
    // 初始化事件
    this.initEvents();
  }

  /**
   * 初始化事件监听
   */
  initEvents() {
    // 打印进度
    this.printer.on('progress', ({ sent, total }) => {
      const percent = ((sent / total) * 100).toFixed(1);
      console.log(`打印进度: ${percent}%`);
      // 可以通过事件发送到 UI
      this.emit('progress', parseFloat(percent));
    });

    // 错误
    this.printer.on('error', (error) => {
      console.error('打印错误:', error.code, error.message);
      this.emit('error', error);
    });

    // 打印完成
    this.printer.on('print-complete', () => {
      console.log('打印完成');
      this.emit('complete');
    });

    // 设备发现
    this.adapter.onDeviceFound((device) => {
      console.log('发现设备:', device.name, device.deviceId);
      this.emit('deviceFound', device);
    });

    // 状态变化
    this.adapter.onStateChange((state) => {
      console.log('适配器状态:', state);
      this.emit('stateChange', state);
    });
  }

  /**
   * 检查蓝牙状态
   */
  async checkBluetooth(): Promise<boolean> {
    try {
      const enabled = await this.adapter.isEnabled();
      if (!enabled) {
        // 请求开启蓝牙
        const result = await this.adapter.enable();
        console.log('蓝牙开启结果:', result);
        return result;
      }
      return true;
    } catch (error) {
      console.error('检查蓝牙失败:', error);
      return false;
    }
  }

  /**
   * 扫描设备
   */
  async scanDevices(timeout = 10000): Promise<any[]> {
    console.log('开始扫描设备...');
    try {
      const devices = await this.adapter.scan(timeout);
      console.log(`发现 ${devices.length} 个设备`);
      return devices;
    } catch (error) {
      console.error('扫描失败:', error);
      return [];
    }
  }

  /**
   * 连接设备
   */
  async connect(deviceId: string): Promise<void> {
    console.log('正在连接:', deviceId);
    try {
      await this.printer.connect(deviceId);
      this.connected = true;
      this.deviceId = deviceId;
      console.log('连接成功');
    } catch (error) {
      console.error('连接失败:', error);
      throw error;
    }
  }

  /**
   * 断开连接
   */
  async disconnect(): Promise<void> {
    if (this.connected) {
      await this.printer.disconnect();
      this.connected = false;
      this.deviceId = '';
      console.log('已断开连接');
    }
  }

  /**
   * 打印测试页
   */
  async printTestPage(): Promise<void> {
    if (!this.connected) {
      throw new Error('请先连接打印机');
    }

    console.log('开始打印测试页...');
    await this.printer
      .text('=== 鸿蒙打印测试 ===', 'GBK')
      .feed()
      .text(`时间: ${new Date().toLocaleString()}`, 'GBK')
      .text(`设备ID: ${this.deviceId}`, 'GBK')
      .feed(2)
      .qr('https://harmonyos.dev', { size: 6 })
      .feed(2)
      .cut()
      .print();
  }

  /**
   * 打印收据
   */
  async printReceipt(orderData: {
    storeName: string;
    items: Array<{ name: string; price: number; qty: number }>;
    total: number;
    orderNo: string;
  }): Promise<void> {
    if (!this.connected) {
      throw new Error('请先连接打印机');
    }

    const { storeName, items, total, orderNo } = orderData;

    await this.printer
      .align('center')
      .setSize(2, 2)
      .text(storeName, 'GBK')
      .resetStyle()
      .feed()
      .text('------------------------', 'GBK')
      .feed();
    
    // 商品明细
    items.forEach(item => {
      const line = `${item.name} x${item.qty}`.padEnd(15) + `¥${item.price * item.qty}`;
      this.printer.text(line, 'GBK');
    });
    
    await this.printer
      .feed()
      .text('------------------------', 'GBK')
      .feed()
      .setBold(true)
      .text(`合计: ¥${total}`, 'GBK')
      .resetStyle()
      .feed(2)
      .text(`订单号: ${orderNo}`, 'GBK')
      .feed(2)
      .align('center')
      .text('谢谢惠顾!', 'GBK')
      .feed(2)
      .qr(`https://example.com/order/${orderNo}`, { size: 5 })
      .feed(3)
      .cut()
      .print();
  }

  /**
   * 打印标签 (使用 TSPL)
   */
  async printLabel(labelData: {
    productName: string;
    price: string;
    barcode: string;
    qrcode?: string;
  }): Promise<void> {
    if (!this.connected) {
      throw new Error('请先连接打印机');
    }

    // 创建 TSPL 驱动
    const driver = new TsplDriver();
    const printer = new BluetoothPrinter(this.adapter, driver);

    // 构建标签
    driver
      .size(60, 40)           // 60x40mm 标签
      .gap(3)                 // 3mm 间隙
      .clear()
      .text(labelData.productName, { x: 20, y: 20, font: 3 })
      .text(labelData.price, { x: 20, y: 60, font: 4, xMultiplier: 2 })
      .barcode(labelData.barcode, { 
        x: 20, 
        y: 100, 
        type: 'EAN13',
        height: 50 
      });
    
    if (labelData.qrcode) {
      driver.qrcode(labelData.qrcode, { x: 250, y: 20, cellWidth: 4 });
    }
    
    driver.print(1);

    await printer.print();
  }

  /**
   * 获取连接状态
   */
  getState(): string {
    return this.connected ? 'connected' : 'disconnected';
  }

  // 简单的事件发射器
  private listeners: Map<string, Function[]> = new Map();

  on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  off(event: string, callback?: Function): void {
    if (!callback) {
      this.listeners.delete(event);
    } else {
      const callbacks = this.listeners.get(event);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index >= 0) callbacks.splice(index, 1);
      }
    }
  }

  private emit(event: string, data?: any): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(cb => cb(data));
    }
  }
}

// 导出服务
export default HarmonyPrintService;

/**
 * 使用示例
 */
/*
// 1. 创建服务实例
const printService = new HarmonyPrintService();

// 2. 监听事件
printService.on('progress', (percent) => {
  console.log('进度:', percent);
});

printService.on('error', (error) => {
  console.error('错误:', error);
});

printService.on('complete', () => {
  console.log('打印完成');
});

// 3. 检查蓝牙
const btEnabled = await printService.checkBluetooth();
if (!btEnabled) {
  console.log('需要开启蓝牙');
  return;
}

// 4. 扫描设备
const devices = await printService.scanDevices(10000);
if (devices.length === 0) {
  console.log('未发现设备');
  return;
}

// 5. 连接设备
await printService.connect(devices[0].deviceId);

// 6. 打印
await printService.printTestPage();

// 或者打印收据
await printService.printReceipt({
  storeName: '我的商店',
  items: [
    { name: '商品A', price: 10, qty: 2 },
    { name: '商品B', price: 20, qty: 1 },
  ],
  total: 40,
  orderNo: 'ORD20240318001'
});

// 7. 断开
await printService.disconnect();
*/
