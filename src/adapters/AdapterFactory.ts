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
import { WebBluetoothAdapter } from './WebBluetoothAdapter';
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
      case PlatformType.WEB:
        if (WebBluetoothAdapter.isSupported()) {
          return new WebBluetoothAdapter();
        }
        throw new BluetoothPrintError(
          ErrorCode.PLATFORM_NOT_SUPPORTED,
          'Web Bluetooth API is not supported in this browser. Please use a supported browser (Chrome, Edge, Opera).'
        );
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
      case PlatformType.WEB:
        if (WebBluetoothAdapter.isSupported()) {
          return new WebBluetoothAdapter();
        }
        throw new BluetoothPrintError(
          ErrorCode.PLATFORM_NOT_SUPPORTED,
          'Web Bluetooth API is not supported in this browser.'
        );
      default:
        throw new BluetoothPrintError(
          ErrorCode.PLATFORM_NOT_SUPPORTED,
          `Platform ${platform} is not supported.`
        );
    }
  }
}
