/**
 * GPrinter (佳博) Driver
 *
 * 佳博 (GPrinter) 热敏打印机兼容 ESC/POS 指令集
 * 大部分命令与标准 ESC/POS 兼容，部分特殊命令需要额外处理
 */

import { EscPos, type EscPosOptions } from './escPosDriver';

/**
 * GPrinter Driver for GiaoBao (佳博) thermal printers
 *
 * 佳博打印机基于 ESC/POS 指令集，此驱动扩展了标准 EscPos
 * 添加了佳博特定的命令支持
 *
 * @example
 * ```typescript
 * import { GPrinterDriver } from 'taro-bluetooth-print';
 *
 * const driver = new GPrinterDriver();
 * let commands = driver.init();
 * commands = driver.text('Hello 佳博!', 'GBK');
 * commands = driver.cut();
 * ```
 */

/**
 * GPrinter options (same as EscPosOptions)
 */
export type GPrinterOptions = EscPosOptions;

export class GPrinterDriver extends EscPos {
  /**
   * 佳博打印机特定: 打印并走纸
   * @param lines 走纸行数
   */
  printAndFeed(lines: number): Uint8Array[] {
    // ESC d n
    return [new Uint8Array([0x1b, 0x64, lines])];
  }
}
