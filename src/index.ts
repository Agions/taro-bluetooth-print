import { BluetoothManager } from './bluetooth';
import { PrinterManager } from './printer';
import { Commands } from './printer/commands';
import { logger } from './utils/logger';
import { configManager, type PrinterOptions } from './utils/config';
import { eventManager, EVENTS } from './utils/events';
import { Result, ErrorCode, PrinterError } from './types';

// 导出类型和类
export {
  BluetoothManager,
  PrinterManager,
  Commands,
  EVENTS,
  ErrorCode,
  PrinterError
};

// 导出类型定义
export type { PrinterOptions };

/**
 * Taro蓝牙打印库主类
 * 提供跨平台蓝牙打印功能
 */
export default class TaroBluePrint {
  public bluetooth: BluetoothManager;
  public printer: PrinterManager;
  public readonly commands: typeof Commands;
  private initialized: boolean = false;

  /**
   * 创建蓝牙打印库实例
   * @param options 打印机配置选项
   */
  constructor(options: PrinterOptions = {}) {
    // 初始化配置
    configManager.init(options);
    
    // 初始化组件
    this.bluetooth = new BluetoothManager();
    this.printer = new PrinterManager(this.bluetooth);
    this.commands = Commands;
    
    this.initialized = true;
    logger.info('Taro蓝牙打印库已初始化');
  }

  /**
   * 获取库版本号
   */
  public getVersion(): string {
    return '1.0.9'; // 每次发布更新此版本号
  }

  /**
   * 注册事件监听器
   * @param eventName 事件名称
   * @param callback 回调函数
   * @returns 用于取消监听的函数
   */
  public on(eventName: string, callback: (...args: any[]) => void): () => void {
    return eventManager.on(eventName, callback);
  }

  /**
   * 一次性事件监听
   * @param eventName 事件名称
   * @param callback 回调函数
   * @returns 用于取消监听的函数
   */
  public once(eventName: string, callback: (...args: any[]) => void): () => void {
    return eventManager.once(eventName, callback);
  }

  /**
   * 移除事件监听器
   * @param eventName 事件名称
   * @param callback 回调函数，不提供则移除该事件所有监听器
   */
  public off(eventName: string, callback?: (...args: any[]) => void): void {
    eventManager.off(eventName, callback);
  }

  /**
   * 快速打印文本
   * @param text 文本内容
   * @param deviceId 蓝牙设备ID
   * @returns 打印结果
   */
  public async quickPrint(text: string, deviceId: string): Promise<Result<boolean>> {
    // 参数验证
    if (!text || !deviceId) {
      const error = new PrinterError(
        ErrorCode.INVALID_PARAM,
        '快速打印失败: 文本内容或设备ID不能为空'
      );
      logger.error(error.message);
      return { success: false, error, code: error.code };
    }

    try {
      // 触发打印开始事件
      eventManager.emit(EVENTS.PRINTER_PRINT_START, { text, deviceId });
      
      // 确保蓝牙已初始化
      await this.bluetooth.init();

      // 连接设备
      const connected = await this.bluetooth.connect(deviceId);
      if (!connected) {
        const error = new PrinterError(
          ErrorCode.BLUETOOTH_CONNECT_FAILED,
          `快速打印失败: 无法连接到设备 ${deviceId}`
        );
        logger.error(error.message);
        return { success: false, error, code: error.code };
      }

      // 打印文本
      const result = await this.printer.printText(text);
      
      // 如果设置了自动切纸，则添加切纸命令
      if (configManager.getOption('autoCut')) {
        await this.printer.sendCommands([Commands.CUT]);
      }

      // 断开连接
      await this.bluetooth.disconnect();
      
      // 触发打印完成事件
      eventManager.emit(EVENTS.PRINTER_PRINT_COMPLETED, { success: result });
      
      return { success: result, data: result };
    } catch (error) {
      // 确保是PrinterError类型
      const printerError = error instanceof PrinterError 
        ? error 
        : new PrinterError(
            ErrorCode.UNKNOWN_ERROR,
            error instanceof Error ? error.message : String(error)
          );
      
      logger.error('快速打印失败:', printerError);
      
      // 触发错误事件
      eventManager.emit(EVENTS.PRINTER_ERROR, printerError);
      
      // 确保断开连接，防止连接残留
      try {
        await this.bluetooth.disconnect();
      } catch (disconnectError) {
        // 忽略断开连接时的错误
      }
      
      return { 
        success: false, 
        error: printerError, 
        code: printerError.code,
        message: printerError.message
      };
    }
  }

  /**
   * 更新配置
   * @param options 新的配置选项
   */
  public updateConfig(options: Partial<PrinterOptions>): void {
    Object.entries(options).forEach(([key, value]) => {
      configManager.setOption(key as keyof PrinterOptions, value);
    });
  }

  /**
   * 销毁实例，释放资源
   */
  public async destroy(): Promise<void> {
    if (!this.initialized) {
      return;
    }
    
    try {
      // 尝试断开蓝牙连接
      await this.bluetooth.disconnect();
      
      // 销毁蓝牙模块
      await this.bluetooth.destroy();
      
      // 清理事件监听器
      eventManager.removeAllListeners();
      
      this.initialized = false;
      logger.info('Taro蓝牙打印库已销毁');
    } catch (error) {
      logger.error('销毁Taro蓝牙打印库实例时出错:', error);
    }
  }

  async print(text: string, deviceId?: string): Promise<boolean> {
    try {
      if (!text) {
        throw new PrinterError(
          ErrorCode.INVALID_PARAM,
          '打印内容不能为空'
        );
      }

      // 发送打印开始事件
      eventManager.emit(EVENTS.PRINTER_PRINT_START, { text, deviceId });

      const result = await this.printer.print(text, deviceId);

      // 发送打印完成事件
      if (result) {
        eventManager.emit(EVENTS.PRINTER_PRINT_COMPLETED, { success: true });
      } else {
        eventManager.emit(EVENTS.PRINTER_PRINT_FAILED, { 
          success: false,
          error: new PrinterError(
            ErrorCode.UNKNOWN_ERROR,
            '打印失败'
          ),
          timestamp: Date.now()
        });
      }

      return result;
    } catch (error) {
      // 发送错误事件
      eventManager.emit(EVENTS.PRINTER_ERROR, { error });
      return false;
    }
  }
}