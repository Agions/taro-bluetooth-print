import { BluetoothManager } from './bluetooth';
import { PrinterManager } from './printer';
import { Commands } from './printer/commands';

export { 
  BluetoothManager,
  PrinterManager,
  Commands
};

export default class TaroBluePrint {
  public bluetooth: BluetoothManager;
  public printer: PrinterManager;
  public commands: typeof Commands;

  constructor() {
    this.bluetooth = new BluetoothManager();
    this.printer = new PrinterManager(this.bluetooth);
    this.commands = Commands;
  }

  /**
   * 快速打印文本
   * @param text 文本内容
   * @param deviceId 蓝牙设备ID
   */
  async quickPrint(text: string, deviceId: string): Promise<boolean> {
    try {
      await this.bluetooth.connect(deviceId);
      const result = await this.printer.printText(text);
      await this.bluetooth.disconnect();
      return result;
    } catch (error) {
      console.error('打印失败:', error);
      return false;
    }
  }
}