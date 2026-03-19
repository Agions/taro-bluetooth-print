/**
 * GPrinter (佳博) Driver
 *
 * 佳博 (GPrinter) 热敏打印机兼容 ESC/POS 指令集
 * 大部分命令与标准 ESC/POS 兼容，部分特殊命令需要额外处理
 */

import { EscPos, type EscPosOptions } from './EscPos';

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
   * 佳博打印机特定: 打开钱箱
   * @param pin 钱箱引脚 (0 或 1, 默认 0)
   */
  openCashDrawer(pin = 0): Uint8Array[] {
    // ESC p m t1 t2
    // m = 0 or 1 (pin)
    // t1 = 50 (on time)
    // t2 = 200 (off time)
    return [new Uint8Array([0x1b, 0x70, pin, 50, 200])];
  }

  /**
   * 佳博打印机特定: 发送声响
   * @param times 次数 (1-9)
   * @param duration 持续时间
   */
  beep(times = 3, duration = 50): Uint8Array[] {
    // ESC B n t
    return [new Uint8Array([0x1b, 0x42, times, duration])];
  }

  /**
   * 佳博打印机特定: 打印自检页
   */
  selfTest(): Uint8Array[] {
    // ESC i
    return [new Uint8Array([0x1b, 0x69])];
  }

  /**
   * 佳博打印机特定: 获取状态
   * 返回打印机状态字节
   */
  getStatus(): Uint8Array[] {
    // DLE EOT n (n = 1-4 获取不同状态)
    // 状态 1: 打印机状态
    // 状态 2: 脱机状态
    // 状态 3: 错误状态
    // 状态 4: 纸张状态
    const buffers: Uint8Array[] = [];
    for (let i = 1; i <= 4; i++) {
      buffers.push(new Uint8Array([0x10, 0x04, i]));
    }
    return buffers;
  }

  /**
   * 佳博打印机特定: 设置字符代码页
   * @param codePage 代码页编号
   */
  setCodePage(codePage: number): Uint8Array[] {
    // ESC t n
    return [new Uint8Array([0x1b, 0x74, codePage])];
  }

  /**
   * 佳博打印机特定: 打印并走纸
   * @param lines 走纸行数
   */
  printAndFeed(lines: number): Uint8Array[] {
    // ESC d n
    return [new Uint8Array([0x1b, 0x64, lines])];
  }

  /**
   * 佳博打印机特定: 设置左边界
   * @param n 左边界字符数
   */
  setLeftMargin(n: number): Uint8Array[] {
    // ESC l n
    return [new Uint8Array([0x1b, 0x6c, n])];
  }

  /**
   * 佳博打印机特定: 设置打印区域宽度
   * @param n 宽度 (字符数)
   */
  setPrintWidth(n: number): Uint8Array[] {
    // ESC W n
    return [new Uint8Array([0x1b, 0x57, n])];
  }
}
