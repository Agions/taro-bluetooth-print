/**
 * Adapter Factory
 * 
 * Creates and returns the appropriate adapter based on the detected platform
 */

import { IPrinterAdapter } from '@/types';
import { TaroAdapter } from './TaroAdapter';
import { AlipayAdapter } from './AlipayAdapter';
import { BaiduAdapter } from './BaiduAdapter';
import { ByteDanceAdapter } from './ByteDanceAdapter';
import { PlatformType, detectPlatform } from '@/utils/platform';
import { BluetoothPrintError, ErrorCode } from '@/errors/BluetoothError';

/**
 * Adapter factory class
 */
export class AdapterFactory {
  /**
   * Creates an adapter instance based on the detected platform
   * 
   * @returns An instance of the appropriate adapter for the current platform
   * @throws BluetoothPrintError if the platform is not supported
   */
  static create(): IPrinterAdapter {
    const platform = detectPlatform();
    
    switch (platform) {
      case PlatformType.WECHAT:
        return new TaroAdapter();
      case PlatformType.ALIPAY:
        return new AlipayAdapter();
      case PlatformType.BAIDU:
        return new BaiduAdapter();
      case PlatformType.BYTEDANCE:
        return new ByteDanceAdapter();
      default:
        throw new BluetoothPrintError(
          ErrorCode.PLATFORM_NOT_SUPPORTED,
          `Platform ${platform} is not supported. Please use a supported mini-program platform.`
        );
    }
  }

  /**
   * Creates an adapter instance for a specific platform
   * 
   * @param platform - The platform type to create an adapter for
   * @returns An instance of the appropriate adapter for the specified platform
   * @throws BluetoothPrintError if the platform is not supported
   */
  static createForPlatform(platform: PlatformType): IPrinterAdapter {
    switch (platform) {
      case PlatformType.WECHAT:
        return new TaroAdapter();
      case PlatformType.ALIPAY:
        return new AlipayAdapter();
      case PlatformType.BAIDU:
        return new BaiduAdapter();
      case PlatformType.BYTEDANCE:
        return new ByteDanceAdapter();
      default:
        throw new BluetoothPrintError(
          ErrorCode.PLATFORM_NOT_SUPPORTED,
          `Platform ${platform} is not supported.`
        );
    }
  }
}
