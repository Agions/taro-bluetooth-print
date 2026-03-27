/**
 * BarcodeGenerator Enhanced Tests
 * Tests for QR_CODE, PDF417 formats and enhanced validation
 */

import { describe, test, expect } from 'vitest';
import { BarcodeGenerator, BarcodeFormat } from '../src/barcode/BarcodeGenerator';

describe('BarcodeGenerator - QR_CODE Support', () => {
  const generator = new BarcodeGenerator();

  test('generates QR code commands with default options', () => {
    const commands = generator.generate('HELLO', { format: BarcodeFormat.QR_CODE });

    // Should return array of command buffers
    expect(Array.isArray(commands)).toBe(true);
    expect(commands.length).toBeGreaterThan(0);

    // Each command should be a Uint8Array
    commands.forEach(cmd => {
      expect(cmd).toBeInstanceOf(Uint8Array);
    });
  });

  test('generates QR code commands with custom size', () => {
    const commands = generator.generate('TEST', { format: BarcodeFormat.QR_CODE, height: 10 });
    expect(Array.isArray(commands)).toBe(true);
    expect(commands.length).toBeGreaterThan(0);
  });

  test('generates QR code commands with custom error correction', () => {
    const commands = generator.generate('DATA', { format: BarcodeFormat.QR_CODE, errorCorrection: 'H' });
    expect(Array.isArray(commands)).toBe(true);
    expect(commands.length).toBe(5);
  });

  test('generates QR code commands with custom model', () => {
    const commands = generator.generate('MODEL', { format: BarcodeFormat.QR_CODE, qrModel: 1 });
    expect(Array.isArray(commands)).toBe(true);
    expect(commands.length).toBe(5);
  });

  test('validates QR code content length', () => {
    // Valid: normal length content
    const result1 = generator.validate('SHORT', BarcodeFormat.QR_CODE);
    expect(result1.valid).toBe(true);

    // Invalid: content too long for QR
    const longContent = 'A'.repeat(7090);
    const result2 = generator.validate(longContent, BarcodeFormat.QR_CODE);
    expect(result2.valid).toBe(false);
    expect(result2.errors[0]?.code).toBe('CONTENT_TOO_LONG');
  });

  test('validates QR code empty content', () => {
    const result = generator.validate('', BarcodeFormat.QR_CODE);
    expect(result.valid).toBe(false);
    expect(result.errors[0]?.code).toBe('REQUIRED');
  });
});

describe('BarcodeGenerator - PDF417 Support', () => {
  const generator = new BarcodeGenerator();

  test('generates PDF417 commands with default options', () => {
    const commands = generator.generate('PDF417DATA', { format: BarcodeFormat.PDF417 });

    expect(Array.isArray(commands)).toBe(true);
    expect(commands.length).toBeGreaterThan(0);

    commands.forEach(cmd => {
      expect(cmd).toBeInstanceOf(Uint8Array);
    });
  });

  test('generates PDF417 commands with custom options', () => {
    const commands = generator.generate('COMPRESSED', {
      format: BarcodeFormat.PDF417,
      pdf417Compression: 2,
      pdf417Security: 4,
      pdf417Columns: 5,
    });

    expect(Array.isArray(commands)).toBe(true);
    expect(commands.length).toBeGreaterThan(0);
  });

  test('validates PDF417 content length', () => {
    const result = generator.validate('A'.repeat(1851), BarcodeFormat.PDF417);
    expect(result.valid).toBe(false);
    expect(result.errors[0]?.code).toBe('CONTENT_TOO_LONG');
  });

  test('validates PDF417 empty content', () => {
    const result = generator.validate('', BarcodeFormat.PDF417);
    expect(result.valid).toBe(false);
  });

  test('validates PDF417 high characters warning', () => {
    // PDF417 standard mode doesn't support high ASCII
    const result = generator.validate('Hello 世界', BarcodeFormat.PDF417);
    // Should have an error about invalid characters
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === 'INVALID_CHARACTERS')).toBe(true);
  });
});

describe('BarcodeGenerator - Enhanced Validation', () => {
  const generator = new BarcodeGenerator();

  test('validates null content returns error', () => {
    const result = generator.validate(null as unknown as string, BarcodeFormat.CODE128);
    expect(result.valid).toBe(false);
    expect(result.errors[0]?.code).toBe('REQUIRED');
  });

  test('validates undefined content returns error', () => {
    const result = generator.validate(undefined as unknown as string, BarcodeFormat.CODE128);
    expect(result.valid).toBe(false);
    expect(result.errors[0]?.code).toBe('REQUIRED');
  });

  test('validates non-string content returns error', () => {
    const result = generator.validate(123 as unknown as string, BarcodeFormat.CODE128);
    expect(result.valid).toBe(false);
    expect(result.errors[0]?.code).toBe('INVALID_TYPE');
  });

  test('validates empty string returns error', () => {
    const result = generator.validate('', BarcodeFormat.CODE128);
    expect(result.valid).toBe(false);
    expect(result.errors[0]?.code).toBe('REQUIRED');
  });

  test('getSupportedFormats includes all formats', () => {
    const formats = generator.getSupportedFormats();
    expect(formats).toContain(BarcodeFormat.QR_CODE);
    expect(formats).toContain(BarcodeFormat.PDF417);
    expect(formats).toContain(BarcodeFormat.CODE128);
    expect(formats).toContain(BarcodeFormat.CODE39);
    expect(formats).toContain(BarcodeFormat.EAN13);
    expect(formats).toContain(BarcodeFormat.EAN8);
    expect(formats).toContain(BarcodeFormat.UPCA);
    expect(formats).toContain(BarcodeFormat.ITF);
    expect(formats).toContain(BarcodeFormat.CODABAR);
  });

  test('validate CODABAR with correct format', () => {
    const result = generator.validate('A1234567890B', BarcodeFormat.CODABAR);
    expect(result.valid).toBe(true);
  });

  test('validate CODABAR with incorrect format', () => {
    const result = generator.validate('1234567890', BarcodeFormat.CODABAR);
    expect(result.valid).toBe(false);
  });
});
