/**
 * Platform detection utilities
 *
 * Provides functions to detect the current platform and environment
 */

// Declare global objects for TypeScript
declare const wx: any;
declare const my: any;
declare const swan: any;
declare const tt: any;
declare const window: any;

/**
 * Supported platform types
 */
export enum PlatformType {
  /** WeChat Mini Program */
  WECHAT = 'wechat',
  /** Alipay Mini Program */
  ALIPAY = 'alipay',
  /** Baidu Smart Program */
  BAIDU = 'baidu',
  /** ByteDance Mini Program (Douyin, Toutiao) */
  BYTEDANCE = 'bytedance',
  /** Web platform */
  WEB = 'web',
  /** Unknown platform */
  UNKNOWN = 'unknown'
}

/**
 * Detects the current platform
 *
 * @returns The detected platform type
 */
export function detectPlatform(): PlatformType {
  // Check for WeChat Mini Program
  if (typeof wx !== 'undefined' && wx.request) {
    return PlatformType.WECHAT;
  }

  // Check for Alipay Mini Program
  if (typeof my !== 'undefined' && my.request) {
    return PlatformType.ALIPAY;
  }

  // Check for Baidu Smart Program
  if (typeof swan !== 'undefined' && swan.request) {
    return PlatformType.BAIDU;
  }

  // Check for ByteDance Mini Program
  if (typeof tt !== 'undefined' && tt.request) {
    return PlatformType.BYTEDANCE;
  }

  // Check for Web platform
  if (typeof window !== 'undefined' && window.navigator) {
    return PlatformType.WEB;
  }

  return PlatformType.UNKNOWN;
}

/**
 * Gets the platform-specific global object
 *
 * @returns The platform-specific global object or null if unknown
 */
export function getPlatformGlobal(): any {
  switch (detectPlatform()) {
    case PlatformType.WECHAT:
      return wx;
    case PlatformType.ALIPAY:
      return my;
    case PlatformType.BAIDU:
      return swan;
    case PlatformType.BYTEDANCE:
      return tt;
    case PlatformType.WEB:
      return window;
    default:
      return null;
  }
}

/**
 * Checks if the current platform is supported
 *
 * @returns True if the platform is supported, false otherwise
 */
export function isPlatformSupported(): boolean {
  const platform = detectPlatform();
  return platform !== PlatformType.UNKNOWN && platform !== PlatformType.WEB;
}

/**
 * Gets the platform name as a human-readable string
 *
 * @returns The platform name
 */
export function getPlatformName(): string {
  switch (detectPlatform()) {
    case PlatformType.WECHAT:
      return '微信小程序';
    case PlatformType.ALIPAY:
      return '支付宝小程序';
    case PlatformType.BAIDU:
      return '百度小程序';
    case PlatformType.BYTEDANCE:
      return '字节跳动小程序';
    case PlatformType.WEB:
      return 'Web平台';
    default:
      return '未知平台';
  }
}