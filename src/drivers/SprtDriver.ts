/**
 * SprtDriver (思普瑞特) Driver
 *
 * 思普瑞特热敏打印机兼容 ESC/POS 指令集
 * 官网：https://www.sprt-printer.com/
 *
 * 思普瑞特特点：
 * - 移动蓝牙打印机为主
 * - 低功耗优化
 * - 自动休眠/唤醒
 * - 小票据打印优化
 */

import { EscPos, type EscPosOptions } from './EscPos';

/**
 * SprtDriver options (same as EscPosOptions)
 */
export type SprtDriverOptions = EscPosOptions;

/**
 * SprtDriver for Sprt (思普瑞特) thermal printers
 *
 * 思普瑞特打印机基于 ESC/POS 指令集，此驱动扩展了标准 EscPos
 * 添加了思普瑞特特定的命令支持，特别是低功耗相关的功能
 *
 * @example
 * ```typescript
 * import { SprtDriver } from 'taro-bluetooth-print';
 *
 * const driver = new SprtDriver();
 * let commands = driver.init();
 * commands = driver.text('Hello 思普瑞特!', 'GBK');
 * commands = driver.cut();
 * ```
 */
export class SprtDriver extends EscPos {
  /**
   * 思普瑞特特定: 进入低功耗/休眠模式
   * @returns Array of command buffers
   */
  sleep(): Uint8Array[] {
    // ESC = (0x1B 0x3D 0x01) - 设置外设
    return [new Uint8Array([0x1b, 0x3d, 0x01])];
  }

  /**
   * 思普瑞特特定: 唤醒打印机
   * 发送空字符或特定序列唤醒休眠中的打印机
   * @returns Array of command buffers
   */
  wakeUp(): Uint8Array[] {
    // 发送空字符唤醒
    return [new Uint8Array([0x00])];
  }

  /**
   * 思普瑞特特定: 深度唤醒
   * 使用完整的初始化序列唤醒打印机
   * @returns Array of command buffers
   */
  wakeUpDeep(): Uint8Array[] {
    // 发送多次空字符确保唤醒
    const commands: Uint8Array[] = [];
    for (let i = 0; i < 5; i++) {
      commands.push(new Uint8Array([0x00]));
    }
    // 发送初始化命令
    commands.push(new Uint8Array([0x1b, 0x40])); // ESC @
    return commands;
  }

  /**
   * 思普瑞特特定: 打开钱箱
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
   * 思普瑞特特定: 发送声响警报
   * @param times 次数 (1-9)
   * @param duration 持续时间 (ms)
   * @returns Array of command buffers
   */
  beep(times = 3, duration = 50): Uint8Array[] {
    // ESC B n t
    return [new Uint8Array([0x1b, 0x42, times, duration])];
  }

  /**
   * 思普瑞特特定: 打印自检页
   * @returns Array of command buffers
   */
  selfTest(): Uint8Array[] {
    // ESC i (0x1B 0x69) - 自检并返回状态
    return [new Uint8Array([0x1b, 0x69])];
  }

  /**
   * 思普瑞特特定: 获取打印机状态
   * @returns Array of command buffers
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
   * 思普瑞特特定: 设置字符代码页
   * @param codePage 代码页编号 (0-255)
   * @returns Array of command buffers
   */
  setCodePage(codePage: number): Uint8Array[] {
    // ESC t n
    return [new Uint8Array([0x1b, 0x74, codePage])];
  }

  /**
   * 思普瑞特特定: 设置左边界
   * @param n 左边界字符数
   * @returns Array of command buffers
   */
  setLeftMargin(n: number): Uint8Array[] {
    // ESC l n
    return [new Uint8Array([0x1b, 0x6c, n])];
  }

  /**
   * 思普瑞特特定: 设置打印区域宽度
   * @param n 宽度 (字符数)
   * @returns Array of command buffers
   */
  setPrintWidth(n: number): Uint8Array[] {
    // ESC W n
    return [new Uint8Array([0x1b, 0x57, n])];
  }

  /**
   * 思普瑞特特定: 使能/禁止自动休眠
   * @param enable true=使能自动休眠, false=禁止自动休眠
   * @returns Array of command buffers
   */
  setAutoSleep(enable: boolean): Uint8Array[] {
    // ESC = n (设置外设)
    // n = 0x01 使能, 0x00 禁止
    return [new Uint8Array([0x1b, 0x3d, enable ? 0x01 : 0x00])];
  }
}
