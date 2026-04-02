/**
 * Xprinter (芯烨) Driver
 *
 * 芯烨热敏打印机兼容 ESC/POS 指令集
 * 官网：http://www.xprinter.net/
 *
 * 芯烨特点：
 * - 兼容标准 ESC/POS
 * - 支持钱箱驱动
 * - 支持状态自动检测
 * - 部分型号有特殊初始化序列
 */

import { EscPos, type EscPosOptions } from './EscPos';

/**
 * Xprinter options (same as EscPosOptions)
 */
export type XprinterOptions = EscPosOptions;

/**
 * XprinterDriver for Xprinter (芯烨) thermal printers
 *
 * 芯烨打印机基于 ESC/POS 指令集，此驱动扩展了标准 EscPos
 * 添加了芯烨特定的命令支持
 *
 * @example
 * ```typescript
 * import { XprinterDriver } from 'taro-bluetooth-print';
 *
 * const driver = new XprinterDriver();
 * let commands = driver.init();
 * commands = driver.text('Hello 芯烨!', 'GBK');
 * commands = driver.cut();
 * ```
 */
export class XprinterDriver extends EscPos {
  /**
   * 芯烨打印机特定: 增强初始化
   * 添加芯烨特定的初始化序列
   *
   * @returns Array of command buffers
   */
  init(): Uint8Array[] {
    const commands = super.init();
    // 添加芯烨特定初始化
    // ESC @ (0x1B 0x40) - 初始化打印机已在父类实现
    // 这里可以添加芯烨特定的初始化命令
    return commands;
  }

  /**
   * 芯烨打印机特定: 打开钱箱
   * @param pin 钱箱引脚 (0 或 1, 默认 0)
   * @returns Array of command buffers
   */
  openCashDrawer(pin = 0): Uint8Array[] {
    // ESC p m t1 t2
    // m = 0 or 1 (pin)
    // t1 = 50 (on time)
    // t2 = 200 (off time)
    return [new Uint8Array([0x1b, 0x70, pin, 50, 200])];
  }

  /**
   * 芯烨打印机特定: 发送声响警报
   * @param times 次数 (1-9)
   * @param duration 持续时间 (ms)
   * @returns Array of command buffers
   */
  beep(times = 3, duration = 50): Uint8Array[] {
    // ESC B n t
    return [new Uint8Array([0x1b, 0x42, times, duration])];
  }

  /**
   * 芯烨打印机特定: 打印自检页
   * @returns Array of command buffers
   */
  selfTest(): Uint8Array[] {
    // ESC i (0x1B 0x69) - 自检并返回状态
    return [new Uint8Array([0x1b, 0x69])];
  }

  /**
   * 芯烨打印机特定: 获取打印机状态
   * 返回打印机状态字节
   * @returns Array of command buffers
   */
  getStatus(): Uint8Array[] {
    // ESC i (0x1B 0x69) - 自检并返回状态
    return [new Uint8Array([0x1b, 0x69])];
  }

  /**
   * 芯烨打印机特定: 获取详细状态
   * 使用 DLE EOT 命令获取不同类型的状态
   * @returns Array of command buffers (4 status queries)
   */
  getDetailedStatus(): Uint8Array[] {
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
   * 芯烨打印机特定: 设置字符代码页
   * @param codePage 代码页编号 (0-255)
   * @returns Array of command buffers
   */
  setCodePage(codePage: number): Uint8Array[] {
    // ESC t n
    return [new Uint8Array([0x1b, 0x74, codePage])];
  }

  /**
   * 芯烨打印机特定: 设置左边界
   * @param n 左边界字符数
   * @returns Array of command buffers
   */
  setLeftMargin(n: number): Uint8Array[] {
    // ESC l n
    return [new Uint8Array([0x1b, 0x6c, n])];
  }

  /**
   * 芯烨打印机特定: 设置打印区域宽度
   * @param n 宽度 (字符数)
   * @returns Array of command buffers
   */
  setPrintWidth(n: number): Uint8Array[] {
    // ESC W n
    return [new Uint8Array([0x1b, 0x57, n])];
  }

  /**
   * 芯烨打印机特定: 进纸并切割
   * @param lines 进纸行数
   * @returns Array of command buffers
   */
  feedAndCut(lines: number): Uint8Array[] {
    // 先进纸
    const feedCmd = new Uint8Array([0x1b, 0x64, lines]); // ESC d n
    // 再切割
    const cutCmd = new Uint8Array([0x1d, 0x56, 0x00]); // GS V 0
    return [feedCmd, cutCmd];
  }
}
