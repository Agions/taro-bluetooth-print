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

import { EscPos, type EscPosOptions } from './escPosDriver';

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
