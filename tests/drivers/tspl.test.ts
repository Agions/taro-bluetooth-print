/**
 * TSPL Driver Tests
 * Tests verify driver methods work correctly and are chainable
 */

import { describe, it, expect } from 'vitest';
import { TsplDriver } from '../../src/drivers/TsplDriver';

describe('TsplDriver', () => {
  describe('Initialization', () => {
    it('should create a new driver instance', () => {
      const driver = new TsplDriver();
      expect(driver).toBeDefined();
    });

    it('should set DPI to 203', () => {
      const driver = new TsplDriver();
      const result = driver.setDPI(203);
      expect(result).toBe(driver); // should be chainable
    });

    it('should set DPI to 300', () => {
      const driver = new TsplDriver();
      const result = driver.setDPI(300);
      expect(result).toBe(driver);
    });
  });

  describe('Unit Conversion', () => {
    it('should convert mm to dots at 203 DPI', () => {
      const driver = new TsplDriver().setDPI(203);
      const dots = driver.mmToDots(10);
      expect(dots).toBe(80); // 10mm * 8 dots/mm
    });

    it('should convert mm to dots at 300 DPI', () => {
      const driver = new TsplDriver().setDPI(300);
      const dots = driver.mmToDots(10);
      expect(dots).toBeCloseTo(118, 0);
    });

    it('should convert dots to mm at 203 DPI', () => {
      const driver = new TsplDriver().setDPI(203);
      const mm = driver.dotsToMm(80);
      expect(mm).toBeCloseTo(10, 1);
    });
  });

  describe('Label Setup', () => {
    it('should set label size and be chainable', () => {
      const driver = new TsplDriver();
      const result = driver.size(50, 30);
      expect(result).toBe(driver);
      expect(driver.getCommands().length).toBeGreaterThan(0);
    });

    it('should set gap and be chainable', () => {
      const driver = new TsplDriver();
      const result = driver.gap(3);
      expect(result).toBe(driver);
      expect(driver.getCommands().length).toBeGreaterThan(0);
    });

    it('should set gap with offset and be chainable', () => {
      const driver = new TsplDriver();
      const result = driver.gap(3, 2);
      expect(result).toBe(driver);
    });

    it('should set speed and be chainable', () => {
      const driver = new TsplDriver();
      const result = driver.speed(5);
      expect(result).toBe(driver);
    });

    it('should set density and be chainable', () => {
      const driver = new TsplDriver();
      const result = driver.density(10);
      expect(result).toBe(driver);
    });

    it('should set direction and be chainable', () => {
      const driver = new TsplDriver();
      const result = driver.direction(1);
      expect(result).toBe(driver);
    });
  });

  describe('Content Rendering', () => {
    it('should add text and be chainable', () => {
      const driver = new TsplDriver();
      const result = driver.text('Hello World', { x: 100, y: 200 });
      expect(result).toBe(driver);
      expect(driver.getCommands().length).toBeGreaterThan(0);
    });

    it('should add text with custom font and be chainable', () => {
      const driver = new TsplDriver();
      const result = driver.text('Custom', { x: 100, y: 200, font: 4 });
      expect(result).toBe(driver);
      expect(driver.getCommands().length).toBeGreaterThan(0);
    });

    it('should add barcode and be chainable', () => {
      const driver = new TsplDriver();
      const result = driver.barcode('12345678', { x: 100, y: 200, type: '128' });
      expect(result).toBe(driver);
      expect(driver.getCommands().length).toBeGreaterThan(0);
    });

    it('should add QR code and be chainable', () => {
      const driver = new TsplDriver();
      const result = driver.qrcode('https://example.com', { x: 100, y: 200 });
      expect(result).toBe(driver);
      expect(driver.getCommands().length).toBeGreaterThan(0);
    });

    it('should add QR code with custom settings and be chainable', () => {
      const driver = new TsplDriver();
      const result = driver.qrcode('test', { x: 0, y: 0, eccLevel: 'H', cellWidth: 10, mode: 'A' });
      expect(result).toBe(driver);
    });

    it('should add box and be chainable', () => {
      const driver = new TsplDriver();
      const result = driver.box({ x: 50, y: 50, width: 200, height: 100, lineWidth: 2 });
      expect(result).toBe(driver);
      expect(driver.getCommands().length).toBeGreaterThan(0);
    });

    it('should add line and be chainable', () => {
      const driver = new TsplDriver();
      const result = driver.line({ x: 50, y: 50, width: 200, height: 0 });
      expect(result).toBe(driver);
    });

    it('should add bar (solid rectangle) and be chainable', () => {
      const driver = new TsplDriver();
      const result = driver.bar(50, 50, 100, 20);
      expect(result).toBe(driver);
    });

    it('should add reverse (inverted area) and be chainable', () => {
      const driver = new TsplDriver();
      const result = driver.reverse(50, 50, 100, 20);
      expect(result).toBe(driver);
    });
  });

  describe('Print Operations', () => {
    it('should clear buffer', () => {
      const driver = new TsplDriver();
      driver.text('Hello', { x: 0, y: 0 });
      driver.clear();
      // Buffer should be cleared or contain only CLS
      expect(driver.getCommands()).toBeTruthy();
    });

    it('should reset driver', () => {
      const driver = new TsplDriver();
      driver.text('Hello', { x: 0, y: 0 });
      driver.size(50, 30);
      driver.reset();
      expect(driver.getCommands()).toBeTruthy();
    });

    it('should feed labels and be chainable', () => {
      const driver = new TsplDriver();
      const result = driver.feed(3);
      expect(result).toBe(driver);
      expect(driver.getCommands().length).toBeGreaterThan(0);
    });

    it('should print with copies and be chainable', () => {
      const driver = new TsplDriver();
      const result = driver.print(5);
      expect(result).toBe(driver);
      expect(driver.getCommands().length).toBeGreaterThan(0);
    });

    it('should print with copies and sets and be chainable', () => {
      const driver = new TsplDriver();
      const result = driver.print(3, 2);
      expect(result).toBe(driver);
    });

    it('should cut label and be chainable', () => {
      const driver = new TsplDriver();
      const result = driver.cut();
      expect(result).toBe(driver);
      expect(driver.getCommands().length).toBeGreaterThan(0);
    });

    it('should beep and be chainable', () => {
      const driver = new TsplDriver();
      const result = driver.beep();
      expect(result).toBe(driver);
    });

    it('should home label and be chainable', () => {
      const driver = new TsplDriver();
      const result = driver.home();
      expect(result).toBe(driver);
    });
  });

  describe('Buffer Operations', () => {
    it('should get commands as string', () => {
      const driver = new TsplDriver();
      driver.size(50, 30).gap(3);
      const commands = driver.getCommands();
      expect(typeof commands).toBe('string');
      expect(commands.length).toBeGreaterThan(0);
    });

    it('should get buffer as Uint8Array', () => {
      const driver = new TsplDriver();
      driver.size(50, 30).text('Test', { x: 0, y: 0 });
      const buffer = driver.getBuffer();
      expect(buffer).toBeInstanceOf(Uint8Array);
      expect(buffer.length).toBeGreaterThan(0);
    });

    it('should handle multiple operations in sequence', () => {
      const driver = new TsplDriver();
      driver
        .size(50, 30)
        .gap(3)
        .speed(5)
        .density(8)
        .text('Product', { x: 50, y: 100 })
        .barcode('SKU123', { x: 50, y: 200, type: '128' })
        .qrcode('https://test.com', { x: 300, y: 100 })
        .print(1);

      const commands = driver.getCommands();
      expect(commands.length).toBeGreaterThan(0);
      // Should contain SIZE command
      expect(commands).toContain('SIZE');
      // Should contain PRINT command
      expect(commands).toContain('PRINT');
    });
  });
});
