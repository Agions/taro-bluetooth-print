/**
 * 打印机实现
 */

import {
  IPrinter,
  PrinterState,
  PrinterType,
  IPrinterCapabilities,
  IPrinterStatus
} from './types';
import { EventEmitter } from 'events';

/**
 * 打印机实现
 */
export class Printer extends EventEmitter implements IPrinter {
  /** 打印机ID */
  public readonly id: string;

  /** 打印机名称 */
  public name: string;

  /** 打印机类型 */
  public readonly type: PrinterType;

  /** 蓝牙设备ID */
  public readonly deviceId: string;

  /** 打印机状态 */
  public state: PrinterState;

  /** 打印机能力 */
  public capabilities: IPrinterCapabilities;

  /** 当前状态 */
  public status: IPrinterStatus;

  /** 最后连接时间 */
  public lastConnected?: Date;

  /** 最后断开时间 */
  public lastDisconnected?: Date;

  /** 最后打印时间 */
  public lastPrintTime?: Date;

  /** 总打印次数 */
  public totalPrintCount: number;

  /** 成功打印次数 */
  public successPrintCount: number;

  /** 失败打印次数 */
  public failedPrintCount: number;

  /** 是否启用 */
  public enabled: boolean;

  /** 打印机属性 */
  public properties: Record<string, any>;

  constructor(
    id: string,
    name: string,
    type: PrinterType,
    deviceId: string,
    capabilities?: Partial<IPrinterCapabilities>
  ) {
    super();
    this.id = id;
    this.name = name;
    this.type = type;
    this.deviceId = deviceId;
    this.state = PrinterState.DISCONNECTED;
    this.capabilities = this.mergeCapabilities(capabilities);
    this.status = this.createInitialStatus();
    this.totalPrintCount = 0;
    this.successPrintCount = 0;
    this.failedPrintCount = 0;
    this.enabled = true;
    this.properties = {};
  }

  /**
   * 检查打印机是否已连接
   */
  public isConnected(): boolean {
    return this.state === PrinterState.CONNECTED;
  }

  /**
   * 检查打印机是否可用
   */
  public isAvailable(): boolean {
    return this.enabled && this.state === PrinterState.CONNECTED && !this.status.hasError;
  }

  /**
   * 检查打印机是否忙碌
   */
  public isBusy(): boolean {
    return this.state === PrinterState.PRINTING || this.status.isPrinting;
  }

  /**
   * 检查打印机是否有错误
   */
  public hasError(): boolean {
    return this.status.hasError || this.state === PrinterState.ERROR;
  }

  /**
   * 更新打印机状态
   */
  public updateState(state: PrinterState): void {
    const previousState = this.state;
    this.state = state;

    if (state === PrinterState.CONNECTED) {
      this.lastConnected = new Date();
    } else if (previousState === PrinterState.CONNECTED) {
      this.lastDisconnected = new Date();
    }

    this.emit('stateChanged', state);
    this.emit('statusUpdate', this.getStatus());
  }

  /**
   * 更新打印机状态信息
   */
  public updateStatus(status: Partial<IPrinterStatus>): void {
    this.status = { ...this.status, ...status };
    this.emit('statusUpdate', this.getStatus());
  }

  /**
   * 获取完整状态信息
   */
  public getStatus(): IPrinterStatus {
    return {
      ...this.status,
      state: this.state,
      isConnected: this.isConnected(),
      isAvailable: this.isAvailable(),
      isBusy: this.isBusy(),
      hasError: this.hasError(),
      lastConnected: this.lastConnected,
      lastDisconnected: this.lastDisconnected,
      lastPrintTime: this.lastPrintTime,
      totalPrintCount: this.totalPrintCount,
      successPrintCount: this.successPrintCount,
      failedPrintCount: this.failedPrintCount,
      enabled: this.enabled
    };
  }

  /**
   * 开始打印
   */
  public startPrint(): void {
    this.updateState(PrinterState.PRINTING);
    this.updateStatus({
      isPrinting: true,
      currentJobStartTime: new Date()
    });

    this.emit('printStarted');
  }

  /**
   * 完成打印
   */
  public completePrint(success: boolean = true): void {
    this.lastPrintTime = new Date();
    this.totalPrintCount++;

    if (success) {
      this.successPrintCount++;
    } else {
      this.failedPrintCount++;
    }

    this.updateState(PrinterState.CONNECTED);
    this.updateStatus({
      isPrinting: false,
      currentJobStartTime: undefined,
      lastPrintResult: success ? 'success' : 'failed',
      lastPrintTime: this.lastPrintTime
    });

    this.emit('printCompleted', { success, timestamp: this.lastPrintTime });
  }

  /**
   * 设置错误状态
   */
  public setError(error: string, details?: any): void {
    this.updateState(PrinterState.ERROR);
    this.updateStatus({
      hasError: true,
      errorMessage: error,
      errorDetails: details,
      lastErrorTime: new Date()
    });

    this.emit('error', { error, details, timestamp: new Date() });
  }

  /**
   * 清除错误状态
   */
  public clearError(): void {
    this.updateState(PrinterState.CONNECTED);
    this.updateStatus({
      hasError: false,
      errorMessage: undefined,
      errorDetails: undefined
    });

    this.emit('errorCleared');
  }

  /**
   * 设置纸张状态
   */
  public setPaperStatus(hasPaper: boolean, paperLevel?: number): void {
    this.updateStatus({
      hasPaper,
      paperLevel: paperLevel ?? (hasPaper ? 100 : 0)
    });

    if (!hasPaper) {
      this.emit('paperOut');
    }

    this.emit('paperStatusChanged', { hasPaper, paperLevel });
  }

  /**
   * 设置墨水/碳带状态
   */
  public setInkStatus(hasInk: boolean, inkLevel?: number): void {
    this.updateStatus({
      hasInk,
      inkLevel: inkLevel ?? (hasInk ? 100 : 0)
    });

    if (!hasInk) {
      this.emit('inkOut');
    }

    this.emit('inkStatusChanged', { hasInk, inkLevel });
  }

  /**
   * 设置盖子状态
   */
  public setCoverStatus(isOpen: boolean): void {
    this.updateStatus({
      coverOpen: isOpen
    });

    if (isOpen) {
      this.emit('coverOpened');
    } else {
      this.emit('coverClosed');
    }

    this.emit('coverStatusChanged', { isOpen });
  }

  /**
   * 更新打印机属性
   */
  public updateProperties(properties: Record<string, any>): void {
    this.properties = { ...this.properties, ...properties };
    this.emit('propertiesUpdated', this.properties);
  }

  /**
   * 获取打印机属性
   */
  public getProperty(key: string): any {
    return this.properties[key];
  }

  /**
   * 设置打印机属性
   */
  public setProperty(key: string, value: any): void {
    this.properties[key] = value;
    this.emit('propertyChanged', { key, value });
  }

  /**
   * 启用/禁用打印机
   */
  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    this.emit('enabledChanged', enabled);
  }

  /**
   * 重置统计信息
   */
  public resetStatistics(): void {
    this.totalPrintCount = 0;
    this.successPrintCount = 0;
    this.failedPrintCount = 0;
    this.lastPrintTime = undefined;

    this.emit('statisticsReset');
  }

  /**
   * 获取打印机信息摘要
   */
  public getSummary(): {
    id: string;
    name: string;
    type: PrinterType;
    deviceId: string;
    state: PrinterState;
    isConnected: boolean;
    isAvailable: boolean;
    isBusy: boolean;
    hasError: boolean;
    enabled: boolean;
    totalPrintCount: number;
    successPrintCount: number;
    failedPrintCount: number;
    lastPrintTime?: Date;
    lastConnected?: Date;
    lastDisconnected?: Date;
  } {
    return {
      id: this.id,
      name: this.name,
      type: this.type,
      deviceId: this.deviceId,
      state: this.state,
      isConnected: this.isConnected(),
      isAvailable: this.isAvailable(),
      isBusy: this.isBusy(),
      hasError: this.hasError(),
      enabled: this.enabled,
      totalPrintCount: this.totalPrintCount,
      successPrintCount: this.successPrintCount,
      failedPrintCount: this.failedPrintCount,
      lastPrintTime: this.lastPrintTime,
      lastConnected: this.lastConnected,
      lastDisconnected: this.lastDisconnected
    };
  }

  /**
   * 序列化为JSON
   */
  public toJSON(): {
    id: string;
    name: string;
    type: PrinterType;
    deviceId: string;
    state: PrinterState;
    capabilities: IPrinterCapabilities;
    status: IPrinterStatus;
    enabled: boolean;
    properties: Record<string, any>;
    lastConnected?: string;
    lastDisconnected?: string;
    lastPrintTime?: string;
    totalPrintCount: number;
    successPrintCount: number;
    failedPrintCount: number;
  } {
    return {
      id: this.id,
      name: this.name,
      type: this.type,
      deviceId: this.deviceId,
      state: this.state,
      capabilities: this.capabilities,
      status: this.getStatus(),
      enabled: this.enabled,
      properties: this.properties,
      lastConnected: this.lastConnected?.toISOString(),
      lastDisconnected: this.lastDisconnected?.toISOString(),
      lastPrintTime: this.lastPrintTime?.toISOString(),
      totalPrintCount: this.totalPrintCount,
      successPrintCount: this.successPrintCount,
      failedPrintCount: this.failedPrintCount
    };
  }

  /**
   * 从JSON创建打印机实例
   */
  public static fromJSON(json: any): Printer {
    const printer = new Printer(
      json.id,
      json.name,
      json.type,
      json.deviceId,
      json.capabilities
    );

    printer.state = json.state;
    printer.status = json.status;
    printer.enabled = json.enabled;
    printer.properties = json.properties || {};
    printer.totalPrintCount = json.totalPrintCount || 0;
    printer.successPrintCount = json.successPrintCount || 0;
    printer.failedPrintCount = json.failedPrintCount || 0;

    if (json.lastConnected) {
      printer.lastConnected = new Date(json.lastConnected);
    }
    if (json.lastDisconnected) {
      printer.lastDisconnected = new Date(json.lastDisconnected);
    }
    if (json.lastPrintTime) {
      printer.lastPrintTime = new Date(json.lastPrintTime);
    }

    return printer;
  }

  // 私有方法

  /**
   * 合并能力配置
   */
  private mergeCapabilities(capabilities?: Partial<IPrinterCapabilities>): IPrinterCapabilities {
    const defaultCapabilities: IPrinterCapabilities = {
      supportsColor: false,
      supportsDuplex: false,
      maxPaperWidth: 58, // 默认58mm
      maxPaperHeight: 200,
      supportedMediaTypes: ['thermal'],
      maxResolution: { width: 203, height: 203 }, // 默认203 DPI
      supportedCommands: ['print', 'cut', 'feed'],
      features: []
    };

    return {
      ...defaultCapabilities,
      ...capabilities
    };
  }

  /**
   * 创建初始状态
   */
  private createInitialStatus(): IPrinterStatus {
    return {
      state: this.state,
      isConnected: false,
      isAvailable: false,
      isPrinting: false,
      hasError: false,
      hasPaper: true,
      hasInk: true,
      coverOpen: false,
      paperLevel: 100,
      inkLevel: 100,
      temperature: 0,
      batteryLevel: undefined,
      signalStrength: 0,
      lastPrintResult: undefined,
      lastPrintTime: undefined,
      lastErrorTime: undefined,
      errorMessage: undefined,
      errorDetails: undefined,
      currentJobStartTime: undefined
    };
  }
}