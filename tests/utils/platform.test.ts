/**
 * Platform Detection Tests
 *
 * Tests for platform detection utilities. We test both the Node.js
 * default path and the runtime-injected paths by writing
 * mini-program globals onto globalThis before calling detectPlatform().
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  detectPlatform,
  PlatformType,
  isPlatformSupported,
  getPlatformName,
  getPlatformGlobal,
} from '@/utils/platform';

// Mini-program globals that platform.ts probes via `typeof <name>`. We
// attach them to globalThis so the `typeof` check resolves to 'object'.
// Cleanup removes them so other test files don't see them.
const PLATFORM_GLOBALS = ['wx', 'my', 'swan', 'tt', 'qq', 'window'] as const;

function clearPlatformGlobals(): void {
  for (const name of PLATFORM_GLOBALS) {
    delete (globalThis as any)[name];
  }
}

describe('Platform Detection', () => {
  beforeEach(() => {
    clearPlatformGlobals();
  });

  afterEach(() => {
    clearPlatformGlobals();
  });

  describe('detectPlatform — default (no globals)', () => {
    it('should return UNKNOWN in a clean Node.js environment', () => {
      expect(detectPlatform()).toBe(PlatformType.UNKNOWN);
    });

    it('isPlatformSupported() should be false in a clean environment', () => {
      expect(isPlatformSupported()).toBe(false);
    });

    it('getPlatformName() should be the unknown-platform label', () => {
      expect(getPlatformName()).toBe('未知平台');
    });

    it('getPlatformGlobal() should return null for the UNKNOWN case', () => {
      expect(getPlatformGlobal()).toBeNull();
    });
  });

  describe('detectPlatform — each supported platform', () => {
    it('detects WECHAT when globalThis.wx has a request method', () => {
      (globalThis as any).wx = { request: () => {} };
      expect(detectPlatform()).toBe(PlatformType.WECHAT);
      expect(getPlatformName()).toBe('微信小程序');
      expect(getPlatformGlobal()).toBe((globalThis as any).wx);
      expect(isPlatformSupported()).toBe(true);
    });

    it('detects ALIPAY when globalThis.my has a request method', () => {
      (globalThis as any).my = { request: () => {} };
      expect(detectPlatform()).toBe(PlatformType.ALIPAY);
      expect(getPlatformName()).toBe('支付宝小程序');
      expect(getPlatformGlobal()).toBe((globalThis as any).my);
      expect(isPlatformSupported()).toBe(true);
    });

    it('detects BAIDU when globalThis.swan has a request method', () => {
      (globalThis as any).swan = { request: () => {} };
      expect(detectPlatform()).toBe(PlatformType.BAIDU);
      expect(getPlatformName()).toBe('百度小程序');
      expect(getPlatformGlobal()).toBe((globalThis as any).swan);
      expect(isPlatformSupported()).toBe(true);
    });

    it('detects BYTEDANCE when globalThis.tt has a request method', () => {
      (globalThis as any).tt = { request: () => {} };
      expect(detectPlatform()).toBe(PlatformType.BYTEDANCE);
      expect(getPlatformName()).toBe('字节跳动小程序');
      expect(getPlatformGlobal()).toBe((globalThis as any).tt);
      expect(isPlatformSupported()).toBe(true);
    });

    it('detects QQ when globalThis.qq has a request method', () => {
      (globalThis as any).qq = { request: () => {} };
      expect(detectPlatform()).toBe(PlatformType.QQ);
      expect(getPlatformName()).toBe('QQ小程序');
      expect(getPlatformGlobal()).toBe((globalThis as any).qq);
      expect(isPlatformSupported()).toBe(true);
    });

    it('detects WEB when globalThis.window has a navigator property', () => {
      (globalThis as any).window = { navigator: { userAgent: 'test' } };
      expect(detectPlatform()).toBe(PlatformType.WEB);
      expect(getPlatformName()).toBe('Web平台');
      expect(getPlatformGlobal()).toBe((globalThis as any).window);
      // WEB is not a "supported" mini-program platform.
      expect(isPlatformSupported()).toBe(false);
    });
  });

  describe('type guards — hasRequestMethod / isWindowWithNavigator', () => {
    it('hasRequestMethod returns false for non-objects (null, undefined, primitives)', () => {
      // Probe the type guard indirectly: a global set to a primitive
      // should NOT be detected as a mini-program platform.
      (globalThis as any).wx = null;
      expect(detectPlatform()).toBe(PlatformType.UNKNOWN);

      (globalThis as any).wx = undefined;
      expect(detectPlatform()).toBe(PlatformType.UNKNOWN);

      (globalThis as any).wx = 42;
      expect(detectPlatform()).toBe(PlatformType.UNKNOWN);

      (globalThis as any).wx = 'string';
      expect(detectPlatform()).toBe(PlatformType.UNKNOWN);

      (globalThis as any).wx = true;
      expect(detectPlatform()).toBe(PlatformType.UNKNOWN);
    });

    it('hasRequestMethod returns false for objects missing the request method', () => {
      // A plain object with no `request` key is not a valid mini-program
      // global; detectPlatform must skip it.
      (globalThis as any).wx = { foo: 1, bar: 2 };
      expect(detectPlatform()).toBe(PlatformType.UNKNOWN);
    });

    it('hasRequestMethod returns true only for objects that expose a request method', () => {
      (globalThis as any).wx = { request: null }; // value is null but key exists
      expect(detectPlatform()).toBe(PlatformType.WECHAT);
    });

    it('isWindowWithNavigator returns false for non-window-like values', () => {
      (globalThis as any).window = null;
      expect(detectPlatform()).toBe(PlatformType.UNKNOWN);

      (globalThis as any).window = { foo: 1 }; // no navigator
      expect(detectPlatform()).toBe(PlatformType.UNKNOWN);

      (globalThis as any).window = 123;
      expect(detectPlatform()).toBe(PlatformType.UNKNOWN);
    });

    it('isWindowWithNavigator accepts any object that has a navigator property', () => {
      (globalThis as any).window = { navigator: undefined };
      expect(detectPlatform()).toBe(PlatformType.WEB);
    });
  });

  describe('precedence and ordering', () => {
    it('WECHAT takes precedence over ALIPAY when both are present', () => {
      (globalThis as any).wx = { request: () => {} };
      (globalThis as any).my = { request: () => {} };
      expect(detectPlatform()).toBe(PlatformType.WECHAT);
    });

    it('BAIDU is detected when WECHAT and ALIPAY are absent', () => {
      // ALIPAY is checked before BAIDU, so we must omit `my`.
      (globalThis as any).swan = { request: () => {} };
      expect(detectPlatform()).toBe(PlatformType.BAIDU);
    });

    it('QQ is detected when WECHAT/ALIPAY/BAIDU/BYTEDANCE are absent', () => {
      (globalThis as any).qq = { request: () => {} };
      expect(detectPlatform()).toBe(PlatformType.QQ);
    });

    it('WEB is detected only when no mini-program globals are present', () => {
      (globalThis as any).window = { navigator: {} };
      expect(detectPlatform()).toBe(PlatformType.WEB);

      // Now add a mini-program global — WEB must lose precedence.
      (globalThis as any).wx = { request: () => {} };
      expect(detectPlatform()).toBe(PlatformType.WECHAT);
    });
  });

  describe('PlatformType enum', () => {
    it('should have the expected 7 values', () => {
      expect(PlatformType.WECHAT).toBe('wechat');
      expect(PlatformType.ALIPAY).toBe('alipay');
      expect(PlatformType.BAIDU).toBe('baidu');
      expect(PlatformType.BYTEDANCE).toBe('bytedance');
      expect(PlatformType.QQ).toBe('qq');
      expect(PlatformType.WEB).toBe('web');
      expect(PlatformType.UNKNOWN).toBe('unknown');
    });
  });
});
