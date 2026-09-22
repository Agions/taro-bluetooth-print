/**
 * Unified Driver Contracts
 * 打印机驱动层统一抽象契约
 *
 * 为 Receipt (小票) 与 Label (标签) 驱动提供标准化契约与类型定义。
 */

/**
 * 基础打印机协议驱动接口
 */
export interface IProtocolDriver {
  /** 协议或驱动名称标识 */
  readonly protocol: string;

  /**
   * 获取当前驱动构建完成的全部字节流
   */
  getBuffer(): Uint8Array;

  /**
   * 清空内部指令缓冲区
   */
  clear(): void;
}

/**
 * 热敏小票打印机驱动扩展契约 (ESC/POS, Star, Sprt 等)
 */
export interface IReceiptDriver extends IProtocolDriver {
  text(content: string, encoding?: string): this;
  feed(lines?: number): this;
  cut(partial?: boolean): this;
}

/**
 * 标签/条码打印机驱动扩展契约 (TSPL, ZPL, CPCL 等)
 */
export interface ILabelDriver extends IProtocolDriver {
  size(width: number, height: number): this;
  print(copies?: number): this;
}
