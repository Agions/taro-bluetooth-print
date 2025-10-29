/**
 * 蓝牙适配器工厂
 */

import { BluetoothAdapter } from '../../domain/bluetooth/BluetoothAdapter';
import { getPlatform } from '../../utils/platform';

// 平台适配器导入
import { WeappBluetoothAdapter } from '../../bluetooth/weapp';
import { H5BluetoothAdapter } from '../../bluetooth/h5';
import { ReactNativeBluetoothAdapter } from '../../bluetooth/rn';
import { HarmonyBluetoothAdapter } from '../../bluetooth/harmony';

export type Platform = 'weapp' | 'h5' | 'rn' | 'harmony' | 'unknown';

export class BluetoothAdapterFactory {
  /**
   * 根据平台创建蓝牙适配器
   */
  static create(platform?: Platform): BluetoothAdapter {
    const currentPlatform = platform || getPlatform();

    switch (currentPlatform) {
      case 'weapp':
        return new WeappBluetoothAdapter();

      case 'h5':
        return new H5BluetoothAdapter();

      case 'rn':
        return new ReactNativeBluetoothAdapter();

      case 'harmony':
        return new HarmonyBluetoothAdapter();

      default:
        throw new Error(`Unsupported platform: ${currentPlatform}`);
    }
  }

  /**
   * 获取当前平台支持的蓝牙功能
   */
  static getSupportedFeatures(platform?: Platform): string[] {
    const currentPlatform = platform || getPlatform();

    switch (currentPlatform) {
      case 'weapp':
        return [
          'scan',
          'connect',
          'disconnect',
          'write',
          'read',
          'notify',
          'getServices',
          'getCharacteristics'
        ];

      case 'h5':
        return [
          'scan',
          'connect',
          'disconnect',
          'write',
          'getServices'
        ];

      case 'rn':
        return [
          'scan',
          'connect',
          'disconnect',
          'write',
          'read',
          'notify',
          'getServices',
          'getCharacteristics'
        ];

      case 'harmony':
        return [
          'scan',
          'connect',
          'disconnect',
          'write',
          'read',
          'getServices'
        ];

      default:
        return [];
    }
  }

  /**
   * 检查平台是否支持蓝牙
   */
  static isSupported(platform?: Platform): boolean {
    const currentPlatform = platform || getPlatform();
    return currentPlatform !== 'unknown';
  }

  /**
   * 获取平台信息
   */
  static getPlatformInfo(platform?: Platform): {
    platform: Platform;
    name: string;
    version: string;
    supported: boolean;
  } {
    const currentPlatform = platform || getPlatform();

    const platformMap = {
      weapp: { name: '微信小程序', version: '1.0.0' },
      h5: { name: 'Web H5', version: '1.0.0' },
      rn: { name: 'React Native', version: '1.0.0' },
      harmony: { name: '鸿蒙系统', version: '1.0.0' },
      unknown: { name: '未知平台', version: '0.0.0' }
    };

    const info = platformMap[currentPlatform];

    return {
      platform: currentPlatform,
      name: info.name,
      version: info.version,
      supported: currentPlatform !== 'unknown'
    };
  }

  /**
   * 创建带有配置的蓝牙适配器
   */
  static createWithConfig(config: {
    platform?: Platform;
    timeout?: number;
    retries?: number;
    debug?: boolean;
  }): BluetoothAdapter {
    const adapter = this.create(config.platform);

    // 如果适配器支持配置，应用配置
    if ('configure' in adapter && typeof adapter.configure === 'function') {
      adapter.configure({
        timeout: config.timeout || 10000,
        retries: config.retries || 3,
        debug: config.debug || false
      });
    }

    return adapter;
  }

  /**
   * 验证适配器功能
   */
  static async validateAdapter(adapter: BluetoothAdapter): Promise<{
    valid: boolean;
    features: string[];
    errors: string[];
  }> {
    const errors: string[] = [];
    const features: string[] = [];

    try {
      // 检查基本功能
      await adapter.initialize();
      features.push('initialize');

      // 检查扫描功能
      if (typeof adapter.startScan === 'function') {
        features.push('scan');
      }

      // 检查连接功能
      if (typeof adapter.connect === 'function') {
        features.push('connect');
      }

      // 检查断开连接功能
      if (typeof adapter.disconnect === 'function') {
        features.push('disconnect');
      }

      // 检查写入功能
      if (typeof adapter.write === 'function') {
        features.push('write');
      }

    } catch (error) {
      errors.push(`Validation error: ${error.message}`);
    }

    return {
      valid: errors.length === 0,
      features,
      errors
    };
  }
}