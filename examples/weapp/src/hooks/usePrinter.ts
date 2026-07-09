/**
 * usePrinter — 全局打印机单例 Hook
 *
 * 消除 5+ 个页面重复的:
 *   const app = Taro.getApp();
 *   const printer = (app as any)?.globalData?.printer;
 *
 * 用法:
 *   const printer = usePrinter();
 *   if (!printer) return; // 未初始化或 app 未挂载
 *
 * 设计:
 * - 返回的 printer 是单例引用,组件重渲染不会重新创建
 * - 失败 (app 未挂载 / globalData 未注入) 返回 null,业务侧显式 guard
 * - 类型安全: 不再用 `as any` 强转 globalData,只对 single property 用 unknown narrow
 */
import { useMemo } from 'react';
import Taro from '@tarojs/taro';
import type { BluetoothPrinter, DeviceManager, PrintQueue } from 'taro-bluetooth-print';

export interface AppGlobalData {
  printer?: BluetoothPrinter;
  deviceManager?: DeviceManager;
  printQueue?: PrintQueue;
}

export function usePrinter(): BluetoothPrinter | null {
  return useMemo(() => {
    const app = Taro.getApp();
    if (!app) return null;
    const gd = (app as { globalData?: AppGlobalData }).globalData;
    return gd?.printer ?? null;
  }, []);
}

export function useDeviceManager(): DeviceManager | null {
  return useMemo(() => {
    const app = Taro.getApp();
    if (!app) return null;
    const gd = (app as { globalData?: AppGlobalData }).globalData;
    return gd?.deviceManager ?? null;
  }, []);
}