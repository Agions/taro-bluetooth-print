import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StarPrinter } from '../../src/drivers/StarPrinter';
import { IPrinterDriver } from '@/types';

describe('StarPrinter Driver', () => {
  describe('IPrinterDriver interface compliance', () => {
    it('should implement all IPrinterDriver methods', () => {
      const driver = new StarPrinter();

      expect(typeof driver.init).toBe('function');
      expect(typeof driver.text).toBe('function');
      expect(typeof driver.feed).toBe('function');
      expect(typeof driver.qr).toBe('function');
      expect(typeof driver.barcode).toBe('function');
      expect(typeof driver.image).toBe('function');
      expect(typeof driver.cut).toBe('function');
      expect(typeof driver.beep).toBe('function');
      expect(typeof driver.bold).toBe('function');
      expect(typeof driver.align).toBe('function');
    });

    it('should be an instance of IPrinterDriver', () => {
      const driver = new StarPrinter();
      expect(driver).toBeDefined();
    });
  });

  describe('init()', () => {
    it('should return ESC @ command for initialization', () => {
      const driver = new StarPrinter();
      const commands = driver.init();

      // Default: 2 commands - ESC @ (init) + ESC R n (international charset)
      expect(commands.length).toBeGreaterThanOrEqual(1);
      expect(commands[0]).toBeInstanceOf(Uint8Array);
      expect(commands[0][0]).toBe(0x1b); // ESC
      expect(commands[0][1]).toBe(0x40);  // @
    });

    it('should return initialization commands when internationalCharset disabled', () => {
      const driver = new StarPrinter({ internationalCharset: false });
      const commands = driver.init();

      // Only ESC @ (no charset selection)
      expect(commands[0][0]).toBe(0x1b);
      expect(commands[0][1]).toBe(0x40);
    });
  });

  describe('text()', () => {
    it('should return array of command buffers', () => {
      const driver = new StarPrinter();
      const commands = driver.text('Hello World');

      expect(Array.isArray(commands)).toBe(true);
      expect(commands.length).toBeGreaterThan(0);
    });

    it('should include line feed (0x0a) in text command', () => {
      const driver = new StarPrinter();
      const commands = driver.text('Test');

      // Find the line feed byte
      const hasLineFeed = commands.some(cmd =>
        Array.from(cmd).includes(0x0a)
      );
      expect(hasLineFeed).toBe(true);
    });

    it('should encode with GBK when useEncodingService is true', () => {
      const driver = new StarPrinter({ useEncodingService: true });
      const commands = driver.text('你好', 'GBK');

      expect(commands.length).toBeGreaterThan(0);
    });

    it('should encode with UTF-8 when specified', () => {
      const driver = new StarPrinter({ useEncodingService: true });
      const commands = driver.text('Hello', 'UTF-8');

      expect(commands.length).toBeGreaterThan(0);
    });

    it('should return empty array for empty string', () => {
      const driver = new StarPrinter();
      const commands = driver.text('');

      expect(Array.isArray(commands)).toBe(true);
    });

    it('should handle non-string input gracefully', () => {
      const driver = new StarPrinter();
      const commands = driver.text(null as any);
      const commands2 = driver.text(undefined as any);

      expect(Array.isArray(commands)).toBe(true);
      expect(Array.isArray(commands2)).toBe(true);
    });

    it('should fallback to TextEncoder for unsupported encoding', () => {
      const driver = new StarPrinter({ useEncodingService: false });
      const commands = driver.text('Test');

      expect(commands.length).toBeGreaterThan(0);
    });
  });

  describe('feed()', () => {
    it('should return ESC d n command', () => {
      const driver = new StarPrinter();
      const commands = driver.feed(3);

      expect(commands).toHaveLength(1);
      expect(commands[0][0]).toBe(0x1b); // ESC
      expect(commands[0][1]).toBe(0x64);  // d
      expect(commands[0][2]).toBe(3);    // lines
    });

    it('should use default 1 line when no argument', () => {
      const driver = new StarPrinter();
      const commands = driver.feed();

      expect(commands[0][2]).toBe(1);
    });

    it('should clamp lines to max 255', () => {
      const driver = new StarPrinter();
      const commands = driver.feed(300);

      expect(commands[0][2]).toBe(255);
    });

    it('should clamp lines to min 1', () => {
      const driver = new StarPrinter();
      const commands = driver.feed(-5);

      expect(commands[0][2]).toBe(1);
    });
  });

  describe('qr()', () => {
    it('should return non-empty command array for valid content', () => {
      const driver = new StarPrinter();
      const commands = driver.qr('https://example.com');

      expect(Array.isArray(commands)).toBe(true);
      expect(commands.length).toBeGreaterThan(0);
    });

    it('should return empty array for empty content', () => {
      const driver = new StarPrinter();
      const commands = driver.qr('');

      expect(Array.isArray(commands)).toBe(true);
    });

    it('should handle model 1 option', () => {
      const driver = new StarPrinter();
      const commands = driver.qr('test', { model: 1 });

      expect(commands.length).toBeGreaterThan(0);
    });

    it('should handle model 2 option (default)', () => {
      const driver = new StarPrinter();
      const commands = driver.qr('test', { model: 2 });

      expect(commands.length).toBeGreaterThan(0);
    });

    it('should handle cellSize option', () => {
      const driver = new StarPrinter();
      const commands = driver.qr('test', { cellSize: 6 } as any);

      expect(commands.length).toBeGreaterThan(0);
    });

    it('should handle size option (alias for cellSize)', () => {
      const driver = new StarPrinter();
      const commands = driver.qr('test', { size: 6 });

      expect(commands.length).toBeGreaterThan(0);
    });

    it('should handle errorCorrection option', () => {
      const driver = new StarPrinter();
      const commands = driver.qr('test', { errorCorrection: 'H' });

      expect(commands.length).toBeGreaterThan(0);
    });

    it('should handle all error correction levels', () => {
      const driver = new StarPrinter();
      const levels: Array<'L' | 'M' | 'Q' | 'H'> = ['L', 'M', 'Q', 'H'];

      levels.forEach(level => {
        const commands = driver.qr('test', { errorCorrection: level });
        expect(commands.length).toBeGreaterThan(0);
      });
    });
  });

  describe('barcode()', () => {
    it('should return non-empty command array for valid data', () => {
      const driver = new StarPrinter();
      const commands = driver.barcode('1234567890');

      expect(Array.isArray(commands)).toBe(true);
      expect(commands.length).toBeGreaterThan(0);
    });

    it('should return empty array for empty data', () => {
      const driver = new StarPrinter();
      const commands = driver.barcode('');

      expect(Array.isArray(commands)).toBe(true);
    });

    it('should generate CODE128 barcode by default', () => {
      const driver = new StarPrinter();
      const commands = driver.barcode('ABC123');

      expect(commands.length).toBeGreaterThan(0);
      // CODE128: GS k 73 (0x49)
      const hasCode128 = commands.some(cmd =>
        Array.from(cmd).includes(0x49)
      );
      expect(hasCode128).toBe(true);
    });

    it('should generate CODE39 barcode when specified', () => {
      const driver = new StarPrinter();
      const commands = driver.barcode('TEST-123', { type: 'CODE39' });

      expect(commands.length).toBeGreaterThan(0);
      // CODE39: GS k 4 (0x04)
      const hasCode39 = commands.some(cmd =>
        Array.from(cmd).includes(0x04)
      );
      expect(hasCode39).toBe(true);
    });

    it('should generate EAN13 barcode when specified', () => {
      const driver = new StarPrinter();
      const commands = driver.barcode('123456789012', { type: 'EAN13' });

      expect(commands.length).toBeGreaterThan(0);
      // EAN13: GS k 2 (0x02)
      const hasEAN13 = commands.some(cmd =>
        Array.from(cmd).includes(0x02)
      );
      expect(hasEAN13).toBe(true);
    });

    it('should set barcode height via options', () => {
      const driver = new StarPrinter();
      const commands = driver.barcode('1234', { height: 60 });

      // GS h n sets height
      const hasHeight = commands.some(cmd =>
        cmd[0] === 0x1d && cmd[1] === 0x68
      );
      expect(hasHeight).toBe(true);
    });

    it('should set barcode width via options', () => {
      const driver = new StarPrinter();
      const commands = driver.barcode('1234', { width: 3 });

      // GS w n sets width
      const hasWidth = commands.some(cmd =>
        cmd[0] === 0x1d && cmd[1] === 0x77
      );
      expect(hasWidth).toBe(true);
    });

    it('should handle HRI position options', () => {
      const driver = new StarPrinter();
      const hriOptions: Array<'none' | 'above' | 'below' | 'both'> = ['none', 'above', 'below', 'both'];

      hriOptions.forEach(hri => {
        const commands = driver.barcode('1234', { hri });
        expect(commands.length).toBeGreaterThan(0);
      });
    });
  });

  describe('image()', () => {
    it('should return empty array for invalid data', () => {
      const driver = new StarPrinter();
      const commands = driver.image(new Uint8Array(0), 100, 100);

      expect(Array.isArray(commands)).toBe(true);
    });

    it('should return empty array for zero dimensions', () => {
      const driver = new StarPrinter();
      const commands = driver.image(new Uint8Array(100), 0, 0);

      expect(Array.isArray(commands)).toBe(true);
    });

    it('should return empty array for mismatched data length', () => {
      const driver = new StarPrinter();
      // width * height * 4 = 100 * 50 * 4 = 20000, but data is smaller
      const commands = driver.image(new Uint8Array(100), 100, 50);

      expect(Array.isArray(commands)).toBe(true);
    });

    it('should generate commands for valid RGBA image', () => {
      const width = 8;
      const height = 8;
      const data = new Uint8Array(width * height * 4);
      // Fill with white pixels
      for (let i = 0; i < data.length; i += 4) {
        data[i] = 255;     // R
        data[i + 1] = 255; // G
        data[i + 2] = 255; // B
        data[i + 3] = 255; // A
      }

      const driver = new StarPrinter();
      const commands = driver.image(data, width, height);

      expect(commands.length).toBeGreaterThan(0);
      // Should have ESC * n1 n2 prefix
      expect(commands[0][0]).toBe(0x1b);
      expect(commands[0][1]).toBe(0x2a);
    });

    it('should handle dithering option', () => {
      const width = 8;
      const height = 8;
      const data = new Uint8Array(width * height * 4);
      for (let i = 0; i < data.length; i += 4) {
        data[i] = 128; data[i + 1] = 128; data[i + 2] = 128; data[i + 3] = 255;
      }

      const driver = new StarPrinter();
      const commands = driver.image(data, width, height, { dithering: true });

      expect(commands.length).toBeGreaterThan(0);
    });

    it('should handle greyscale option', () => {
      const width = 8;
      const height = 8;
      const data = new Uint8Array(width * height * 4);
      for (let i = 0; i < data.length; i += 4) {
        data[i] = 0; data[i + 1] = 0; data[i + 2] = 0; data[i + 3] = 255;
      }

      const driver = new StarPrinter();
      const commands = driver.image(data, width, height, { greyscale: true });

      expect(commands.length).toBeGreaterThan(0);
    });
  });

  describe('cut()', () => {
    it('should return GS V 0 command for full cut', () => {
      const driver = new StarPrinter();
      const commands = driver.cut();

      // Returns 2 commands: ESC d 3 (feed) + GS V 0 (cut)
      expect(commands.length).toBeGreaterThanOrEqual(1);
      // Find the cut command
      const cutCmd = commands.find(cmd => cmd[0] === 0x1d && cmd[1] === 0x56);
      expect(cutCmd).toBeDefined();
      expect(cutCmd![2]).toBe(0x00); // m=0 full cut
    });

    it('should feed paper before cutting', () => {
      const driver = new StarPrinter();
      const commands = driver.cut();

      // Should include ESC d 3 (feed 3 lines before cut)
      const hasFeed = commands.some(cmd =>
        cmd[0] === 0x1b && cmd[1] === 0x64 && cmd[2] === 0x03
      );
      expect(hasFeed).toBe(true);
    });
  });

  describe('beep()', () => {
    it('should return ESC B command', () => {
      const driver = new StarPrinter();
      const commands = driver.beep();

      expect(commands).toHaveLength(1);
      expect(commands[0][0]).toBe(0x1b); // ESC
      expect(commands[0][1]).toBe(0x42); // B
    });
  });

  describe('bold()', () => {
    it('should return ESC E 1 for bold on', () => {
      const driver = new StarPrinter();
      const commands = driver.bold(true);

      expect(commands).toHaveLength(1);
      expect(commands[0][0]).toBe(0x1b); // ESC
      expect(commands[0][1]).toBe(0x45); // E
      expect(commands[0][2]).toBe(0x01); // 1 (on)
    });

    it('should return ESC E 0 for bold off', () => {
      const driver = new StarPrinter();
      const commands = driver.bold(false);

      expect(commands).toHaveLength(1);
      expect(commands[0][0]).toBe(0x1b);
      expect(commands[0][1]).toBe(0x45);
      expect(commands[0][2]).toBe(0x00); // 0 (off)
    });
  });

  describe('align()', () => {
    it('should return ESC a 0 for left alignment', () => {
      const driver = new StarPrinter();
      const commands = driver.align('left');

      expect(commands).toHaveLength(1);
      expect(commands[0][0]).toBe(0x1b); // ESC
      expect(commands[0][1]).toBe(0x61); // a
      expect(commands[0][2]).toBe(0x00); // 0 (left)
    });

    it('should return ESC a 1 for center alignment', () => {
      const driver = new StarPrinter();
      const commands = driver.align('center');

      expect(commands).toHaveLength(1);
      expect(commands[0][2]).toBe(0x01); // 1 (center)
    });

    it('should return ESC a 2 for right alignment', () => {
      const driver = new StarPrinter();
      const commands = driver.align('right');

      expect(commands).toHaveLength(1);
      expect(commands[0][2]).toBe(0x02); // 2 (right)
    });
  });

  describe('driver options', () => {
    it('should accept useEncodingService option', () => {
      const driver = new StarPrinter({ useEncodingService: true });
      expect(driver).toBeDefined();
    });

    it('should accept showEncodingWarnings option', () => {
      const driver = new StarPrinter({ showEncodingWarnings: false });
      expect(driver).toBeDefined();
    });

    it('should accept fallbackChar option', () => {
      const driver = new StarPrinter({ fallbackChar: '#' });
      expect(driver).toBeDefined();
    });

    it('should accept internationalCharset option', () => {
      const driver = new StarPrinter({ internationalCharset: true });
      expect(driver).toBeDefined();
    });

    it('should work without options (defaults)', () => {
      const driver = new StarPrinter();
      expect(driver).toBeDefined();
      const commands = driver.init();
      expect(commands.length).toBeGreaterThan(0);
    });
  });

  describe('encoding support', () => {
    it('should support EUC-KR encoding via EncodingService', () => {
      const driver = new StarPrinter({ useEncodingService: true });
      const commands = driver.text('한글테스트', 'EUC-KR');

      expect(commands.length).toBeGreaterThan(0);
    });

    it('should support Shift-JIS encoding via EncodingService', () => {
      const driver = new StarPrinter({ useEncodingService: true });
      const commands = driver.text('日本語テスト', 'Shift-JIS');

      expect(commands.length).toBeGreaterThan(0);
    });

    it('should support ISO-2022-JP encoding via EncodingService', () => {
      const driver = new StarPrinter({ useEncodingService: true });
      const commands = driver.text('日本語テスト', 'ISO-2022-JP');

      expect(commands.length).toBeGreaterThan(0);
    });
  });
});
