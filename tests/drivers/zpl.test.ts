/**
 * ZPL Driver Tests
 * Tests verify driver methods work correctly and are chainable
 */

import { describe, it, expect } from 'vitest';
import { ZplDriver } from '../../src/drivers/ZplDriver';

describe('ZplDriver', () => {
  describe('Initialization', () => {
    it('should create a new driver instance', () => {
      const driver = new ZplDriver();
      expect(driver).toBeDefined();
    });

    it('should initialize with commands in buffer', () => {
      const driver = new ZplDriver();
      expect(driver.getCommands().length).toBeGreaterThan(0);
    });
  });

  describe('Format Operations', () => {
    it('should start format and be chainable', () => {
      const driver = new ZplDriver();
      const result = driver.startFormat();
      expect(result).toBe(driver);
      expect(driver.getCommands()).toContain('^XA');
    });

    it('should end format and be chainable', () => {
      const driver = new ZplDriver();
      const result = driver.endFormat();
      expect(result).toBe(driver);
      expect(driver.getCommands()).toContain('^XZ');
    });

    it('should set label home position and be chainable', () => {
      const driver = new ZplDriver();
      const result = driver.labelHome(50, 100);
      expect(result).toBe(driver);
    });
  });

  describe('Field Operations', () => {
    it('should set field data and be chainable', () => {
      const driver = new ZplDriver();
      const result = driver.fieldData('Hello ZPL');
      expect(result).toBe(driver);
      expect(driver.getCommands()).toContain('^FDHello ZPL');
    });

    it('should set field origin and be chainable', () => {
      const driver = new ZplDriver();
      const result = driver.fieldOrigin(100, 50);
      expect(result).toBe(driver);
      expect(driver.getCommands()).toContain('^FO100,50');
    });

    it('should set print width and be chainable', () => {
      const driver = new ZplDriver();
      const result = driver.printWidth(800);
      expect(result).toBe(driver);
      expect(driver.getCommands()).toContain('^PW800');
    });

    it('should set label length and be chainable', () => {
      const driver = new ZplDriver();
      const result = driver.labelLength(500);
      expect(result).toBe(driver);
      expect(driver.getCommands()).toContain('^LL500');
    });

    it('should set label gap and be chainable', () => {
      const driver = new ZplDriver();
      const result = driver.labelGap(10);
      expect(result).toBe(driver);
    });

    it('should set quantity and be chainable', () => {
      const driver = new ZplDriver();
      const result = driver.quantity(100);
      expect(result).toBe(driver);
      expect(driver.getCommands()).toContain('^PQ100');
    });
  });

  describe('Text Operations', () => {
    it('should add text and be chainable', () => {
      const driver = new ZplDriver();
      const result = driver.text('Sample Text');
      expect(result).toBe(driver);
      const commands = driver.getCommands();
      expect(commands).toContain('^FD');
      expect(commands).toContain('Sample Text');
    });

    it('should add text with custom options and be chainable', () => {
      const driver = new ZplDriver();
      const result = driver.text('Custom', { x: 100, y: 50, fontHeight: 40, fontWidth: 30 });
      expect(result).toBe(driver);
    });

    it('should add scalable text and be chainable', () => {
      const driver = new ZplDriver();
      const result = driver.scalableText('Scalable', 100, 50, 50, 40);
      expect(result).toBe(driver);
    });
  });

  describe('Barcode Operations', () => {
    it('should add code128 barcode and be chainable', () => {
      const driver = new ZplDriver();
      const result = driver.code128('1234567890');
      expect(result).toBe(driver);
      expect(driver.getCommands()).toContain('^FD1234567890');
    });

    it('should add code128 with custom position and be chainable', () => {
      const driver = new ZplDriver();
      const result = driver.code128('ABC123', 100, 50, 70);
      expect(result).toBe(driver);
    });

    it('should add code39 barcode and be chainable', () => {
      const driver = new ZplDriver();
      const result = driver.code39('TEST-123');
      expect(result).toBe(driver);
    });

    it('should add ean13 barcode and be chainable', () => {
      const driver = new ZplDriver();
      const result = driver.ean13('590123412345');
      expect(result).toBe(driver);
    });
  });

  describe('QR Code', () => {
    it('should add QR code with default options and be chainable', () => {
      const driver = new ZplDriver();
      const result = driver.qrcode('https://example.com');
      expect(result).toBe(driver);
      expect(driver.getCommands()).toContain('^BQ');
    });

    it('should add QR code with custom options and be chainable', () => {
      const driver = new ZplDriver();
      const result = driver.qrcode('test', { x: 100, y: 50, model: 2, size: 8, errorLevel: 'Q' });
      expect(result).toBe(driver);
    });
  });

  describe('Graphic Operations', () => {
    it('should add box and be chainable', () => {
      const driver = new ZplDriver();
      const result = driver.box({ x: 10, y: 10, width: 200, height: 100, borderThickness: 3 });
      expect(result).toBe(driver);
      expect(driver.getCommands()).toContain('^GB');
    });

    it('should add line and be chainable', () => {
      const driver = new ZplDriver();
      const result = driver.line(10, 10, 200, 100, 5);
      expect(result).toBe(driver);
    });

    it('should add circle and be chainable', () => {
      const driver = new ZplDriver();
      const result = driver.circle(100, 100, 50, 4);
      expect(result).toBe(driver);
      expect(driver.getCommands()).toContain('^GC');
    });

    it('should add diagonal line and be chainable', () => {
      const driver = new ZplDriver();
      const result = driver.diagonal(50, 50, 100, 80, 3);
      expect(result).toBe(driver);
    });

    it('should add ellipse and be chainable', () => {
      const driver = new ZplDriver();
      const result = driver.ellipse(100, 100, 80, 50, 3);
      expect(result).toBe(driver);
    });
  });

  describe('Printer Configuration', () => {
    it('should set darkness and be chainable', () => {
      const driver = new ZplDriver();
      const result = driver.setDarkness(20);
      expect(result).toBe(driver);
    });

    it('should set speed and be chainable', () => {
      const driver = new ZplDriver();
      const result = driver.setSpeed(6);
      expect(result).toBe(driver);
    });

    it('should print config label and be chainable', () => {
      const driver = new ZplDriver();
      const result = driver.printConfigLabel();
      expect(result).toBe(driver);
    });

    it('should calibrate and be chainable', () => {
      const driver = new ZplDriver();
      const result = driver.calibrate();
      expect(result).toBe(driver);
    });

    it('should reset and be chainable', () => {
      const driver = new ZplDriver();
      driver.text('Test', { x: 100, y: 100 });
      const result = driver.reset();
      expect(result).toBe(driver);
    });
  });

  describe('Chaining', () => {
    it('should support method chaining', () => {
      const driver = new ZplDriver();
      const result = driver
        .startFormat()
        .labelHome(0, 0)
        .text('Label 1')
        .barcode('12345', { x: 0, y: 100, type: '128' })
        .endFormat()
        .quantity(50);

      expect(result).toBe(driver);
      const commands = driver.getCommands();
      expect(commands).toContain('^XA');
      expect(commands).toContain('^XZ');
      expect(commands).toContain('^PQ50');
    });
  });
});
