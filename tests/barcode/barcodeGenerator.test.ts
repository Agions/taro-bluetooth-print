/**
 * Barcode Generator Tests
 *
 * Tests for barcode validation and command generation
 */
import { describe, it, expect } from 'vitest';
import { BarcodeGenerator, BarcodeFormat } from '@/barcode/BarcodeGenerator';

describe('BarcodeGenerator', () => {
  let generator: BarcodeGenerator;

  beforeEach(() => {
    generator = new BarcodeGenerator();
  });

  describe('validate', () => {
    it('should reject null/undefined content', () => {
      // @ts-expect-error - testing runtime
      expect(generator.validate(null, BarcodeFormat.CODE128).valid).toBe(false);
      // @ts-expect-error - testing runtime
      expect(generator.validate(undefined, BarcodeFormat.CODE128).valid).toBe(false);
    });

    it('should reject non-string content', () => {
      // @ts-expect-error - testing runtime
      const result = generator.validate(12345, BarcodeFormat.CODE128);
      expect(result.valid).toBe(false);
      expect(result.errors[0]?.code).toBe('INVALID_TYPE');
    });

    it('should reject empty content', () => {
      const result = generator.validate('', BarcodeFormat.CODE128);
      expect(result.valid).toBe(false);
      expect(result.errors[0]?.code).toBe('REQUIRED');
    });

    it('should return unsupported format error for unknown format', () => {
      // @ts-expect-error - testing runtime
      const result = generator.validate('test', 'UNKNOWN');
      expect(result.valid).toBe(false);
      expect(result.errors[0]?.code).toBe('UNSUPPORTED_FORMAT');
    });

    describe('EAN-13', () => {
      it('should validate 12-digit EAN-13', () => {
        const result = generator.validate('590123456789', BarcodeFormat.EAN13);
        expect(result.valid).toBe(true);
      });

      it('should validate 13-digit EAN-13 with correct check digit', () => {
        const result = generator.validate('5901234567893', BarcodeFormat.EAN13);
        expect(result.valid).toBe(true);
      });

      it('should reject 13-digit EAN-13 with wrong check digit', () => {
        const result = generator.validate('5901234567890', BarcodeFormat.EAN13);
        expect(result.valid).toBe(false);
        expect(result.errors[0]?.code).toBe('INVALID_CHECK_DIGIT');
      });

      it('should reject non-numeric EAN-13', () => {
        const result = generator.validate('ABCDEFGHIJKL', BarcodeFormat.EAN13);
        expect(result.valid).toBe(false);
        expect(result.errors[0]?.code).toBe('INVALID_LENGTH');
      });
    });

    describe('EAN-8', () => {
      it('should validate 7-digit EAN-8', () => {
        const result = generator.validate('9638507', BarcodeFormat.EAN8);
        expect(result.valid).toBe(true);
      });

      it('should validate 8-digit EAN-8 with correct check digit', () => {
        const result = generator.validate('96385074', BarcodeFormat.EAN8);
        expect(result.valid).toBe(true);
      });
    });

    describe('UPC-A', () => {
      it('should validate 11-digit UPC-A', () => {
        const result = generator.validate('01234567890', BarcodeFormat.UPCA);
        expect(result.valid).toBe(true);
      });

      it('should validate 12-digit UPC-A with correct check digit', () => {
        const result = generator.validate('042100005264', BarcodeFormat.UPCA);
        expect(result.valid).toBe(true);
      });
    });

    describe('Code 39', () => {
      it('should validate valid Code 39 content', () => {
        const result = generator.validate('HELLO123', BarcodeFormat.CODE39);
        expect(result.valid).toBe(true);
      });

      it('should reject Code 39 with invalid characters', () => {
        const result = generator.validate('hello@world', BarcodeFormat.CODE39);
        expect(result.valid).toBe(false);
        expect(result.errors[0]?.code).toBe('INVALID_CHARACTERS');
      });
    });

    describe('Code 128', () => {
      it('should validate valid Code 128 content', () => {
        const result = generator.validate('Hello123', BarcodeFormat.CODE128);
        expect(result.valid).toBe(true);
      });

      it('should reject Code 128 with non-ASCII characters', () => {
        const result = generator.validate('héllo', BarcodeFormat.CODE128);
        expect(result.valid).toBe(false);
        expect(result.errors[0]?.code).toBe('INVALID_CHARACTERS');
      });
    });

    describe('ITF', () => {
      it('should validate even-length numeric ITF', () => {
        const result = generator.validate('123456', BarcodeFormat.ITF);
        expect(result.valid).toBe(true);
      });

      it('should reject odd-length ITF', () => {
        const result = generator.validate('12345', BarcodeFormat.ITF);
        expect(result.valid).toBe(false);
        expect(result.errors[0]?.code).toBe('INVALID_LENGTH');
      });

      it('should reject non-numeric ITF', () => {
        const result = generator.validate('AB1234', BarcodeFormat.ITF);
        expect(result.valid).toBe(false);
        expect(result.errors[0]?.code).toBe('INVALID_CHARACTERS');
      });
    });

    describe('CODABAR', () => {
      it('should validate CODABAR with proper start/stop chars', () => {
        const result = generator.validate('A12345B', BarcodeFormat.CODABAR);
        expect(result.valid).toBe(true);
      });

      it('should reject CODABAR without start/stop chars', () => {
        const result = generator.validate('12345', BarcodeFormat.CODABAR);
        expect(result.valid).toBe(false);
      });
    });

    describe('QR Code', () => {
      it('should validate valid QR code content', () => {
        const result = generator.validate('https://example.com', BarcodeFormat.QR_CODE);
        expect(result.valid).toBe(true);
      });

      it('should reject empty QR code content', () => {
        const result = generator.validate('', BarcodeFormat.QR_CODE);
        expect(result.valid).toBe(false);
      });
    });
  });

  describe('generate', () => {
it('should generate commands for valid EAN-13', () => {
        const commands = generator.generate('5901234567893', {
          format: BarcodeFormat.EAN13,
        });
      expect(commands.length).toBeGreaterThan(0);
      expect(commands[0]).toBeInstanceOf(Uint8Array);
    });

    it('should generate commands for valid QR code', () => {
      const commands = generator.generate('https://example.com', {
        format: BarcodeFormat.QR_CODE,
        qrModel: 2,
        errorCorrection: 'M',
      });
      expect(commands.length).toBeGreaterThan(0);
    });

    it('should generate commands for valid PDF417', () => {
      const commands = generator.generate('Some data', {
        format: BarcodeFormat.PDF417,
      });
      expect(commands.length).toBeGreaterThan(0);
    });

    it('should return empty array for invalid content', () => {
      const commands = generator.generate('', {
        format: BarcodeFormat.CODE128,
      });
      expect(commands).toEqual([]);
    });
  });

  describe('getSupportedFormats', () => {
    it('should return all barcode formats', () => {
      const formats = generator.getSupportedFormats();
      expect(formats).toContain(BarcodeFormat.CODE128);
      expect(formats).toContain(BarcodeFormat.EAN13);
      expect(formats).toContain(BarcodeFormat.QR_CODE);
      expect(formats).toContain(BarcodeFormat.CODE39);
      expect(formats.length).toBe(9); // 9 formats total
    });
  });
});