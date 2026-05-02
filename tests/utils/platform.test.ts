/**
 * Platform Detection Tests
 *
 * Tests for platform detection utilities (in Node.js environment)
 */
import { describe, it, expect } from 'vitest';
import { detectPlatform, PlatformType, isPlatformSupported, getPlatformName } from '@/utils/platform';

describe('Platform Detection', () => {
  describe('detectPlatform', () => {
    it('should detect UNKNOWN in Node.js environment', () => {
      // In the test environment (Node.js), none of the platform globals should exist
      expect(detectPlatform()).toBe(PlatformType.UNKNOWN);
    });

    it('should return UNKNOWN when no platform globals are defined', () => {
      expect(detectPlatform()).toBe(PlatformType.UNKNOWN);
    });
  });

  describe('isPlatformSupported', () => {
    it('should return false in test environment', () => {
      expect(isPlatformSupported()).toBe(false);
    });
  });

  describe('getPlatformName', () => {
    it('should return 未知平台 in test environment', () => {
      expect(getPlatformName()).toBe('未知平台');
    });
  });

  describe('PlatformType enum', () => {
    it('should have expected values', () => {
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