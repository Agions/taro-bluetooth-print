/**
 * CPCL Driver Tests
 * Tests verify driver methods work correctly and are chainable
 */

import { describe, it, expect } from 'vitest';
import { CpclDriver } from '../../src/drivers/CpclDriver';

describe('CpclDriver', () => {
  describe('Initialization', () => {
    it('should create a new driver instance with default width', () => {
      const driver = new CpclDriver();
      expect(driver).toBeDefined();
    });

    it('should create a new driver instance with custom width', () => {
      const driver = new CpclDriver(800);
      expect(driver).toBeDefined();
    });

    it('should create a new driver instance with custom width and height', () => {
      const driver = new CpclDriver(800, 600);
      expect(driver).toBeDefined();
    });
  });

  describe('Page Setup', () => {
    it('should set page size and be chainable', () => {
      const driver = new CpclDriver();
      const result = driver.setPageSize(576, 800);
      expect(result).toBe(driver);
    });

    it('should use page size preset and be chainable', () => {
      const driver = new CpclDriver();
      const result = driver.usePageSize('4x6');
      expect(result).toBe(driver);
    });

    it('should start page and be chainable', () => {
      const driver = new CpclDriver();
      const result = driver.pageStart();
      expect(result).toBe(driver);
      expect(driver.getCommands().length).toBeGreaterThan(0);
    });

    it('should end page and be chainable', () => {
      const driver = new CpclDriver();
      driver.pageStart();
      const result = driver.pageEnd();
      expect(result).toBe(driver);
      expect(driver.getCommands()).toContain('END');
    });

    it('should form feed and be chainable', () => {
      const driver = new CpclDriver();
      const result = driver.formFeed();
      expect(result).toBe(driver);
      expect(driver.getCommands()).toContain('FORM');
    });
  });

  describe('Font Operations', () => {
    it('should set line print font and be chainable', () => {
      const driver = new CpclDriver();
      const result = driver.setLinePrint(5, 0, 40);
      expect(result).toBe(driver);
    });

    it('should set custom font and be chainable', () => {
      const driver = new CpclDriver();
      const result = driver.setFont(3, 2, 2, 90);
      expect(result).toBe(driver);
    });
  });

  describe('Text Operations', () => {
    it('should add text and be chainable', () => {
      const driver = new CpclDriver();
      const result = driver.text('Hello CPCL');
      expect(result).toBe(driver);
      expect(driver.getCommands().length).toBeGreaterThan(0);
    });

    it('should add text at position and be chainable', () => {
      const driver = new CpclDriver();
      const result = driver.textAt('Positioned Text', { x: 200, y: 100 });
      expect(result).toBe(driver);
      expect(driver.getCommands().length).toBeGreaterThan(0);
    });

    it('should add text at position with custom font and be chainable', () => {
      const driver = new CpclDriver();
      const result = driver.textAt('Custom', { x: 100, y: 50, fontSize: 7, rotation: 90 });
      expect(result).toBe(driver);
    });

    it('should add legacy text and be chainable', () => {
      const driver = new CpclDriver();
      const result = driver.legacyText('Legacy', 100, 200);
      expect(result).toBe(driver);
    });
  });

  describe('Barcode Operations', () => {
    it('should add UPC-A barcode and be chainable', () => {
      const driver = new CpclDriver();
      const result = driver.barcode('12345678901', { x: 50, y: 100, type: 'UPCA' });
      expect(result).toBe(driver);
      expect(driver.getCommands()).toContain('12345678901');
    });

    it('should add code128 barcode and be chainable', () => {
      const driver = new CpclDriver();
      const result = driver.code128('CODE128', 100, 50, 70);
      expect(result).toBe(driver);
      expect(driver.getCommands()).toContain('CODE128');
    });

    it('should add code39 barcode and be chainable', () => {
      const driver = new CpclDriver();
      const result = driver.code39('TEST-123', 50, 100, 60);
      expect(result).toBe(driver);
    });
  });

  describe('QR Code', () => {
    it('should add QR code with default options and be chainable', () => {
      const driver = new CpclDriver();
      const result = driver.qrcode('https://example.com');
      expect(result).toBe(driver);
      expect(driver.getCommands()).toContain('QR');
    });

    it('should add QR code with custom options and be chainable', () => {
      const driver = new CpclDriver();
      const result = driver.qrcode('test', { x: 100, y: 50, model: 1, size: 8, errorLevel: 'M' });
      expect(result).toBe(driver);
    });
  });

  describe('2D Barcode', () => {
    it('should add PDF417 barcode and be chainable', () => {
      const driver = new CpclDriver();
      const result = driver.twoDBarcode('PDF417DATA', 'PDF417', 50, 100, 200);
      expect(result).toBe(driver);
    });

    it('should add DATAMATRIX barcode and be chainable', () => {
      const driver = new CpclDriver();
      const result = driver.twoDBarcode('DATA', 'DATAMATRIX', 0, 0, 150);
      expect(result).toBe(driver);
    });
  });

  describe('Graphic Operations', () => {
    it('should add line and be chainable', () => {
      const driver = new CpclDriver();
      const result = driver.line({ x: 10, y: 10, width: 200, height: 0 });
      expect(result).toBe(driver);
    });

    it('should add box and be chainable', () => {
      const driver = new CpclDriver();
      const result = driver.box({ x: 50, y: 50, width: 150, height: 100, borderWidth: 3 });
      expect(result).toBe(driver);
      expect(driver.getCommands()).toContain('BOX');
    });

    it('should add inverse area and be chainable', () => {
      const driver = new CpclDriver();
      const result = driver.inverse(100, 100, 80, 30);
      expect(result).toBe(driver);
    });
  });

  describe('Printer Configuration', () => {
    it('should set density and be chainable', () => {
      const driver = new CpclDriver();
      const result = driver.setDensity(10);
      expect(result).toBe(driver);
      expect(driver.getCommands()).toContain('DENSITY');
    });

    it('should set speed and be chainable', () => {
      const driver = new CpclDriver();
      const result = driver.setSpeed(4);
      expect(result).toBe(driver);
      expect(driver.getCommands()).toContain('SPEED');
    });
  });

  describe('Cut Operations', () => {
    it('should cut and be chainable', () => {
      const driver = new CpclDriver();
      const result = driver.cut();
      expect(result).toBe(driver);
      expect(driver.getCommands()).toContain('CUT');
    });

    it('should partial cut and be chainable', () => {
      const driver = new CpclDriver();
      const result = driver.partialCut();
      expect(result).toBe(driver);
      expect(driver.getCommands()).toContain('PCUT');
    });

    it('should feed and cut and be chainable', () => {
      const driver = new CpclDriver();
      const result = driver.feedCut();
      expect(result).toBe(driver);
    });
  });

  describe('Media Operations', () => {
    it('should beep and be chainable', () => {
      const driver = new CpclDriver();
      const result = driver.beep(3, 10);
      expect(result).toBe(driver);
      expect(driver.getCommands()).toContain('BEEP');
    });

    it('should beep with default values and be chainable', () => {
      const driver = new CpclDriver();
      const result = driver.beep();
      expect(result).toBe(driver);
    });
  });

  describe('Logo Operations', () => {
    it('should add logo reference and be chainable', () => {
      const driver = new CpclDriver();
      const result = driver.logo(100, 200, 'MYLOGO');
      expect(result).toBe(driver);
    });

    it('should download logo and be chainable', () => {
      const driver = new CpclDriver();
      const bitmap = new Uint8Array(100);
      const result = driver.downloadLogo('TESTLOGO', bitmap);
      expect(result).toBe(driver);
    });

    it('should print logo and be chainable', () => {
      const driver = new CpclDriver();
      const result = driver.printLogo('MYLOGO', 50, 100);
      expect(result).toBe(driver);
    });
  });

  describe('Buffer Operations', () => {
    it('should get commands as string', () => {
      const driver = new CpclDriver();
      driver.pageStart().text('Test');
      const commands = driver.getCommands();
      expect(typeof commands).toBe('string');
      expect(commands.length).toBeGreaterThan(0);
    });

    it('should get buffer as Uint8Array', () => {
      const driver = new CpclDriver();
      driver.pageStart().text('Test');
      const buffer = driver.getBuffer();
      expect(buffer).toBeInstanceOf(Uint8Array);
      expect(buffer.length).toBeGreaterThan(0);
    });
  });

  describe('Chaining', () => {
    it('should support method chaining', () => {
      const driver = new CpclDriver();
      const result = driver
        .pageStart()
        .text('Label')
        .barcode('12345', { x: 0, y: 100, type: 'UPCA' })
        .qrcode('https://test.com')
        .pageEnd()
        .formFeed();

      expect(result).toBe(driver);
      const commands = driver.getCommands();
      expect(commands).toContain('END');
      expect(commands).toContain('FORM');
    });
  });
});
