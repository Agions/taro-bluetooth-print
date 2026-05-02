/**
 * Text Formatter Tests
 *
 * Tests for ESC/POS text formatting commands
 */
import { describe, it, expect } from 'vitest';
import { TextFormatter, TextAlign } from '@/formatter/TextFormatter';

describe('TextFormatter', () => {
  let formatter: TextFormatter;

  beforeEach(() => {
    formatter = new TextFormatter();
  });

  describe('setStyle', () => {
    it('should generate alignment command for center', () => {
      const commands = formatter.setStyle({ align: TextAlign.CENTER });
      expect(commands.length).toBe(1);
      expect(commands[0]).toEqual(new Uint8Array([0x1b, 0x61, 1])); // ESC a 1
    });

    it('should generate alignment command for right', () => {
      const commands = formatter.setStyle({ align: TextAlign.RIGHT });
      expect(commands.length).toBe(1);
      expect(commands[0]).toEqual(new Uint8Array([0x1b, 0x61, 2])); // ESC a 2
    });

    it('should not generate alignment command if same as current', () => {
      // Default is LEFT
      const commands = formatter.setStyle({ align: TextAlign.LEFT });
      expect(commands.length).toBe(0);
    });

    it('should generate size command for 2x2', () => {
      const commands = formatter.setStyle({ widthScale: 2, heightScale: 2 });
      expect(commands.length).toBe(1);
      expect(commands[0]).toEqual(new Uint8Array([0x1d, 0x21, 0x11])); // GS ! 17
    });

    it('should generate bold on command', () => {
      const commands = formatter.setStyle({ bold: true });
      expect(commands.length).toBe(1);
      expect(commands[0]).toEqual(new Uint8Array([0x1b, 0x45, 1])); // ESC E 1
    });

    it('should generate bold off command', () => {
      formatter.setStyle({ bold: true }); // set it on first
      const commands = formatter.setStyle({ bold: false });
      expect(commands[0]).toEqual(new Uint8Array([0x1b, 0x45, 0])); // ESC E 0
    });

    it('should generate underline on command', () => {
      const commands = formatter.setStyle({ underline: true });
      expect(commands[0]).toEqual(new Uint8Array([0x1b, 0x2d, 1])); // ESC - 1
    });

    it('should generate inverse on command', () => {
      const commands = formatter.setStyle({ inverse: true });
      expect(commands[0]).toEqual(new Uint8Array([0x1d, 0x42, 1])); // GS B 1
    });

    it('should generate multiple commands at once', () => {
      const commands = formatter.setStyle({
        align: TextAlign.CENTER,
        bold: true,
        widthScale: 2,
        heightScale: 2,
      });
      expect(commands.length).toBe(3); // align + size + bold
    });

    it('should clamp size values to valid range', () => {
      const commands = formatter.setStyle({ widthScale: 99, heightScale: -5 });
      expect(commands.length).toBe(1);
      // width=8, height=1 → ((8-1) << 4) | (1-1) = 0x70
      expect(commands[0]).toEqual(new Uint8Array([0x1d, 0x21, 0x70]));
    });
  });

  describe('resetStyle', () => {
    it('should generate no commands when already at defaults', () => {
      const commands = formatter.resetStyle();
      expect(commands.length).toBe(0);
    });

    it('should generate reset commands after style changes', () => {
      formatter.setStyle({ bold: true, align: TextAlign.CENTER, widthScale: 2, heightScale: 2 });
      const commands = formatter.resetStyle();
      expect(commands.length).toBe(3); // align + size + bold
    });

    it('should return to default state', () => {
      formatter.setStyle({ bold: true, align: TextAlign.CENTER });
      formatter.resetStyle();
      const style = formatter.getCurrentStyle();
      expect(style.bold).toBe(false);
      expect(style.align).toBe(TextAlign.LEFT);
      expect(style.widthScale).toBe(1);
      expect(style.heightScale).toBe(1);
    });
  });

  describe('format', () => {
    it('should return empty array for empty string', () => {
      // @ts-expect-error - testing runtime
      expect(formatter.format('')).toEqual([]);
      // @ts-expect-error - testing runtime
      expect(formatter.format(null)).toEqual([]);
    });

    it('should apply style when provided', () => {
      const commands = formatter.format('test', { bold: true });
      expect(commands.length).toBeGreaterThan(0);
      // Should include bold command
      expect(commands[0]).toEqual(new Uint8Array([0x1b, 0x45, 1]));
    });
  });

  describe('individual setters', () => {
    it('should set alignment via align()', () => {
      expect(formatter.align(TextAlign.CENTER)).toEqual([
        new Uint8Array([0x1b, 0x61, 1]),
      ]);
    });

    it('should set size via setSize()', () => {
      expect(formatter.setSize(3, 5)).toEqual([
        new Uint8Array([0x1d, 0x21, 0x24]), // ((3-1)<<4) | (5-1) = 0x24
      ]);
    });

    it('should set bold via setBold()', () => {
      expect(formatter.setBold(true)).toEqual([
        new Uint8Array([0x1b, 0x45, 1]),
      ]);
      expect(formatter.setBold(false)).toEqual([
        new Uint8Array([0x1b, 0x45, 0]),
      ]);
    });

    it('should set underline via setUnderline()', () => {
      expect(formatter.setUnderline(true)).toEqual([
        new Uint8Array([0x1b, 0x2d, 1]),
      ]);
    });

    it('should set inverse via setInverse()', () => {
      expect(formatter.setInverse(true)).toEqual([
        new Uint8Array([0x1d, 0x42, 1]),
      ]);
    });
  });

  describe('getCurrentStyle', () => {
    it('should return default style initially', () => {
      const style = formatter.getCurrentStyle();
      expect(style.align).toBe(TextAlign.LEFT);
      expect(style.bold).toBe(false);
      expect(style.widthScale).toBe(1);
      expect(style.heightScale).toBe(1);
    });

    it('should return a copy (not reference)', () => {
      const style = formatter.getCurrentStyle();
      style.bold = true;
      expect(formatter.getCurrentStyle().bold).toBe(false); // original unchanged
    });
  });

  describe('TextAlign enum', () => {
    it('should have correct values', () => {
      expect(TextAlign.LEFT).toBe('left');
      expect(TextAlign.CENTER).toBe('center');
      expect(TextAlign.RIGHT).toBe('right');
    });
  });

  describe('singleton', () => {
    it('should be exported as textFormatter', async () => {
      const { textFormatter } = await import('@/formatter/TextFormatter');
      expect(textFormatter).toBeInstanceOf(TextFormatter);
      const commands = textFormatter.setStyle({ bold: true });
      expect(commands.length).toBeGreaterThan(0);
    });
  });
});