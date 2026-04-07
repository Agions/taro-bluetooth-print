import { vi, describe, test, expect, beforeEach } from 'vitest';
import { TextEncoder } from 'util';
global.TextEncoder = TextEncoder as any;

import { CommandBuilder } from '../../src/services/CommandBuilder';
import type { IPrinterDriver } from '../../src/types';
import { TextAlign } from '../../src/formatter';
import { BarcodeFormat } from '../../src/barcode';

describe('CommandBuilder', () => {
  let mockDriver: IPrinterDriver;
  let commandBuilder: CommandBuilder;

  const encoder = new TextEncoder();

  beforeEach(() => {
    // Create a mock driver that returns simple byte arrays
    mockDriver = {
      init: vi.fn().mockReturnValue([new Uint8Array([0x1B, 0x40])]), // ESC @
      text: vi.fn().mockImplementation((content: string) => [encoder.encode(content)]),
      feed: vi.fn().mockReturnValue([new Uint8Array([0x0A])]), // LF
      cut: vi.fn().mockReturnValue([new Uint8Array([0x1D, 0x56, 0x00])]), // GS V
      image: vi.fn().mockReturnValue([new Uint8Array([0x1D, 0x76, 0x30])]),
      qr: vi.fn().mockReturnValue([new Uint8Array([0x1D, 0x28, 0x6B])]),
    };
    commandBuilder = new CommandBuilder(mockDriver);
  });

  describe('constructor', () => {
    test('should initialize with default EscPos driver', () => {
      const cb = new CommandBuilder();
      expect(cb).toBeInstanceOf(CommandBuilder);
      // Should have initialized with init command
      expect(cb.getTotalBytes()).toBeGreaterThan(0);
    });

    test('should initialize with custom driver', () => {
      expect(mockDriver.init).toHaveBeenCalled();
    });

    test('should call init on construction', () => {
      expect(mockDriver.init).toHaveBeenCalledTimes(1);
    });
  });

  describe('text()', () => {
    test('should add text to buffer', () => {
      commandBuilder.text('Hello');
      expect(mockDriver.text).toHaveBeenCalledWith('Hello', undefined);
      expect(commandBuilder.getTotalBytes()).toBeGreaterThan(0);
    });

    test('should add text with encoding', () => {
      commandBuilder.text('你好', 'GBK');
      expect(mockDriver.text).toHaveBeenCalledWith('你好', 'GBK');
    });

    test('should return this for chaining', () => {
      const result = commandBuilder.text('test');
      expect(result).toBe(commandBuilder);
    });
  });

  describe('feed()', () => {
    test('should add feed command to buffer', () => {
      const initialBytes = commandBuilder.getTotalBytes();
      commandBuilder.feed(3);
      expect(mockDriver.feed).toHaveBeenCalledWith(3);
      expect(commandBuilder.getTotalBytes()).toBe(initialBytes + 1);
    });

    test('should default to 1 line', () => {
      commandBuilder.feed();
      expect(mockDriver.feed).toHaveBeenCalledWith(1);
    });

    test('should return this for chaining', () => {
      const result = commandBuilder.feed(1);
      expect(result).toBe(commandBuilder);
    });
  });

  describe('cut()', () => {
    test('should add cut command to buffer', () => {
      const initialBytes = commandBuilder.getTotalBytes();
      commandBuilder.cut();
      expect(mockDriver.cut).toHaveBeenCalled();
      expect(commandBuilder.getTotalBytes()).toBe(initialBytes + 3);
    });

    test('should return this for chaining', () => {
      const result = commandBuilder.cut();
      expect(result).toBe(commandBuilder);
    });
  });

  describe('image()', () => {
    test('should add image command to buffer', () => {
      const imageData = new Uint8Array(100);
      const initialBytes = commandBuilder.getTotalBytes();
      commandBuilder.image(imageData, 10, 10);
      expect(mockDriver.image).toHaveBeenCalledWith(imageData, 10, 10);
      expect(commandBuilder.getTotalBytes()).toBe(initialBytes + 3);
    });

    test('should return this for chaining', () => {
      const result = commandBuilder.image(new Uint8Array(10), 1, 1);
      expect(result).toBe(commandBuilder);
    });
  });

  describe('qr()', () => {
    test('should add QR code command to buffer', () => {
      const initialBytes = commandBuilder.getTotalBytes();
      commandBuilder.qr('https://example.com');
      expect(mockDriver.qr).toHaveBeenCalledWith('https://example.com', undefined);
      expect(commandBuilder.getTotalBytes()).toBe(initialBytes + 3);
    });

    test('should accept QR options', () => {
      commandBuilder.qr('test', { size: 8 });
      expect(mockDriver.qr).toHaveBeenCalledWith('test', { size: 8 });
    });

    test('should return this for chaining', () => {
      const result = commandBuilder.qr('test');
      expect(result).toBe(commandBuilder);
    });
  });

  describe('clear()', () => {
    test('should reset buffer and re-initialize', () => {
      commandBuilder.text('hello');
      commandBuilder.feed(2);
      expect(commandBuilder.getTotalBytes()).toBeGreaterThan(3);

      commandBuilder.clear();
      expect(mockDriver.init).toHaveBeenCalledTimes(2);
      expect(commandBuilder.getTotalBytes()).toBeGreaterThan(0);
    });

    test('should return this for chaining', () => {
      const result = commandBuilder.clear();
      expect(result).toBe(commandBuilder);
    });
  });

  describe('align()', () => {
    test('should return this for chaining', () => {
      const result = commandBuilder.align(TextAlign.CENTER);
      expect(result).toBe(commandBuilder);
    });
  });

  describe('setSize()', () => {
    test('should return this for chaining', () => {
      const result = commandBuilder.setSize(2, 2);
      expect(result).toBe(commandBuilder);
    });
  });

  describe('setBold()', () => {
    test('should return this for chaining', () => {
      const result = commandBuilder.setBold(true);
      expect(result).toBe(commandBuilder);
    });
  });

  describe('setUnderline()', () => {
    test('should return this for chaining', () => {
      const result = commandBuilder.setUnderline(true);
      expect(result).toBe(commandBuilder);
    });
  });

  describe('setInverse()', () => {
    test('should return this for chaining', () => {
      const result = commandBuilder.setInverse(true);
      expect(result).toBe(commandBuilder);
    });
  });

  describe('setStyle()', () => {
    test('should return this for chaining', () => {
      const result = commandBuilder.setStyle({ bold: true, align: TextAlign.CENTER });
      expect(result).toBe(commandBuilder);
    });
  });

  describe('resetStyle()', () => {
    test('should return this for chaining', () => {
      const result = commandBuilder.resetStyle();
      expect(result).toBe(commandBuilder);
    });
  });

  describe('barcode()', () => {
    test('should add barcode command to buffer', () => {
      const initialBytes = commandBuilder.getTotalBytes();
      commandBuilder.barcode('1234567890128', {
        format: BarcodeFormat.EAN13,
        height: 80,
        showText: true,
      });
      // BarcodeGenerator produces more than 0 bytes
      expect(commandBuilder.getTotalBytes()).toBeGreaterThan(initialBytes);
    });

    test('should return this for chaining', () => {
      const result = commandBuilder.barcode('1234567890', { format: BarcodeFormat.CODE39 });
      expect(result).toBe(commandBuilder);
    });
  });

  describe('getBuffer()', () => {
    test('should return combined buffer as Uint8Array', () => {
      commandBuilder.text('Hello').feed(1);
      const buffer = commandBuilder.getBuffer();
      expect(buffer).toBeInstanceOf(Uint8Array);
      expect(buffer.length).toBe(commandBuilder.getTotalBytes());
    });

    test('should return cached buffer on subsequent calls', () => {
      commandBuilder.text('Hello');
      const buffer1 = commandBuilder.getBuffer();
      const buffer2 = commandBuilder.getBuffer();
      expect(buffer1).toBe(buffer2); // Same reference
    });

    test('should invalidate cache when buffer is modified', () => {
      commandBuilder.text('Hello');
      const buffer1 = commandBuilder.getBuffer();
      commandBuilder.feed(1);
      const buffer2 = commandBuilder.getBuffer();
      expect(buffer1).not.toBe(buffer2); // Different reference
    });
  });

  describe('getTotalBytes()', () => {
    test('should return total bytes in buffer', () => {
      const initial = commandBuilder.getTotalBytes();
      commandBuilder.text('ABC');
      expect(commandBuilder.getTotalBytes()).toBe(initial + 3);
    });

    test('should return 0 after clear then re-init (only init bytes)', () => {
      // The clear() re-initializes the driver, so total bytes should be > 0 from init command
      commandBuilder.clear();
      expect(commandBuilder.getTotalBytes()).toBeGreaterThan(0);
    });
  });

  describe('method chaining', () => {
    test('should support fluent chaining', () => {
      const result = commandBuilder
        .text('Header')
        .feed(1)
        .align(TextAlign.CENTER)
        .setBold(true)
        .text('Bold Centered Text')
        .feed(2)
        .cut();

      expect(result).toBe(commandBuilder);
      expect(commandBuilder.getTotalBytes()).toBeGreaterThan(0);
    });
  });
});
