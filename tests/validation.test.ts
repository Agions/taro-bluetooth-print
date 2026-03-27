/**
 * Validation Utility Tests
 * Tests for data validation utilities
 */

import { describe, test, expect } from 'vitest';
import {
  validatePrinterData,
  validatePrintJob,
  isValidBuffer,
  isValidUUID,
  validateRange,
  validateObject,
  validateArray,
  check,
  ValidationCodes,
} from '../src/utils/validation';

describe('Printer Data Validation', () => {
  test('validates correct printer data', () => {
    const data = {
      deviceId: 'device-123',
      deviceName: 'Thermal Printer',
      serviceUUID: '000018f0-0000-1000-8000-00805f9b34fb',
      characteristicUUID: '00002af0-0000-1000-8000-00805f9b34fb',
    };

    const schema = {
      deviceId: { required: true },
      deviceName: { required: true, maxLength: 50 },
    };

    const result = validatePrinterData(data, schema);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test('fails for missing required field', () => {
    const data = {
      deviceName: 'Thermal Printer',
    };

    const schema = {
      deviceId: { required: true },
    };

    const result = validatePrinterData(data, schema);
    expect(result.valid).toBe(false);
    expect(result.errors[0]?.code).toBe(ValidationCodes.REQUIRED);
  });

  test('fails for string exceeding maxLength', () => {
    const data = {
      deviceName: 'A'.repeat(100),
    };

    const schema = {
      deviceName: { maxLength: 50 },
    };

    const result = validatePrinterData(data, schema);
    expect(result.valid).toBe(false);
    expect(result.errors[0]?.code).toBe(ValidationCodes.TOO_LONG);
  });

  test('validates UUID pattern', () => {
    const data = {
      deviceId: 'not-a-valid-uuid',
    };

    const schema = {
      deviceId: { pattern: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i },
    };

    const result = validatePrinterData(data, schema);
    expect(result.valid).toBe(false);
    expect(result.errors[0]?.code).toBe(ValidationCodes.PATTERN_MISMATCH);
  });
});

describe('Print Job Validation', () => {
  test('validates correct print job', () => {
    const data = {
      jobId: 'job-001',
      data: new ArrayBuffer(1024),
      priority: 5,
      retryCount: 3,
    };

    const schema = {
      jobId: { required: true },
      data: { required: true, minSize: 1 },
      priority: { min: 1, max: 10 },
    };

    const result = validatePrintJob(data, schema);
    expect(result.valid).toBe(true);
  });

  test('fails for missing data', () => {
    const data = {
      jobId: 'job-001',
    };

    const schema = {
      data: { required: true },
    };

    const result = validatePrintJob(data, schema);
    expect(result.valid).toBe(false);
    expect(result.errors[0]?.code).toBe(ValidationCodes.REQUIRED);
  });

  test('fails for data too small', () => {
    const data = {
      data: new ArrayBuffer(0),
    };

    const schema = {
      data: { minSize: 1 },
    };

    const result = validatePrintJob(data, schema);
    expect(result.valid).toBe(false);
    expect(result.errors[0]?.code).toBe(ValidationCodes.TOO_SHORT);
  });

  test('fails for priority out of range', () => {
    const data = {
      priority: 15,
    };

    const schema = {
      priority: { min: 1, max: 10 },
    };

    const result = validatePrintJob(data, schema);
    expect(result.valid).toBe(false);
    expect(result.errors[0]?.code).toBe(ValidationCodes.OUT_OF_RANGE);
  });

  test('fails for invalid data type', () => {
    const data = {
      data: 'not-an-array-buffer',
    };

    const schema = {
      data: { required: true },
    };

    const result = validatePrintJob(data, schema);
    expect(result.valid).toBe(false);
    expect(result.errors[0]?.code).toBe(ValidationCodes.INVALID_TYPE);
  });
});

describe('Buffer Validation', () => {
  test('validates correct buffer', () => {
    const buffer = new ArrayBuffer(1024);
    const result = isValidBuffer(buffer);
    expect(result.valid).toBe(true);
  });

  test('fails for null buffer', () => {
    const result = isValidBuffer(null);
    expect(result.valid).toBe(false);
    expect(result.errors[0]?.code).toBe(ValidationCodes.INVALID_TYPE);
  });

  test('fails for required empty buffer', () => {
    const buffer = new ArrayBuffer(0);
    const result = isValidBuffer(buffer, { required: true });
    expect(result.valid).toBe(false);
    expect(result.errors[0]?.code).toBe(ValidationCodes.TOO_SHORT);
  });

  test('validates buffer size range', () => {
    const buffer = new ArrayBuffer(500);
    const result = isValidBuffer(buffer, { minSize: 100, maxSize: 1000 });
    expect(result.valid).toBe(true);
  });

  test('fails for buffer too large', () => {
    const buffer = new ArrayBuffer(2000);
    const result = isValidBuffer(buffer, { maxSize: 1000 });
    expect(result.valid).toBe(false);
    expect(result.errors[0]?.code).toBe(ValidationCodes.TOO_LONG);
  });

  test('warns for empty buffer', () => {
    const buffer = new ArrayBuffer(0);
    const result = isValidBuffer(buffer);
    expect(result.warnings).toBeDefined();
    expect(result.warnings?.length).toBeGreaterThan(0);
  });
});

describe('UUID Validation', () => {
  test('validates correct UUID', () => {
    const result = isValidUUID('550e8400-e29b-41d4-a716-446655440000');
    expect(result.valid).toBe(true);
    expect(result.version).toBe(4);
  });

  test('fails for invalid UUID', () => {
    const result = isValidUUID('not-a-uuid');
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });

  test('fails for null UUID', () => {
    const result = isValidUUID(null, { required: true });
    expect(result.valid).toBe(false);
  });

  test('validates UUID version', () => {
    const uuid = '550e8400-e29b-11d4-a716-446655440000'; // V1
    const result = isValidUUID(uuid, { versions: [1] });
    expect(result.valid).toBe(true);
  });

  test('fails for wrong UUID version', () => {
    const uuid = '550e8400-e29b-41d4-a716-446655440000'; // V4
    const result = isValidUUID(uuid, { versions: [1] });
    expect(result.valid).toBe(false);
  });
});

describe('Range Validation', () => {
  test('validates value in range', () => {
    const result = validateRange(50, 'timeout', { min: 0, max: 100 });
    expect(result.valid).toBe(true);
  });

  test('fails for value below minimum', () => {
    const result = validateRange(-5, 'timeout', { min: 0 });
    expect(result.valid).toBe(false);
    expect(result.errors[0]?.code).toBe(ValidationCodes.OUT_OF_RANGE);
  });

  test('fails for value above maximum', () => {
    const result = validateRange(150, 'timeout', { max: 100 });
    expect(result.valid).toBe(false);
    expect(result.errors[0]?.code).toBe(ValidationCodes.OUT_OF_RANGE);
  });

  test('fails for non-number', () => {
    const result = validateRange('fifty' as unknown as number, 'timeout');
    expect(result.valid).toBe(false);
    expect(result.errors[0]?.code).toBe(ValidationCodes.INVALID_TYPE);
  });

  test('fails for NaN', () => {
    const result = validateRange(NaN, 'timeout');
    expect(result.valid).toBe(false);
    expect(result.errors[0]?.code).toBe(ValidationCodes.NOT_A_NUMBER);
  });

  test('fails for Infinity', () => {
    const result = validateRange(Infinity, 'timeout');
    expect(result.valid).toBe(false);
    expect(result.errors[0]?.code).toBe(ValidationCodes.INFINITY_VALUE);
  });

  test('validates integer requirement', () => {
    const result = validateRange(5.5, 'count', { integer: true });
    expect(result.valid).toBe(false);
    expect(result.errors[0]?.code).toBe(ValidationCodes.INVALID_TYPE);
  });

  test('validates required field', () => {
    const result = validateRange(undefined, 'timeout', { required: true });
    expect(result.valid).toBe(false);
    expect(result.errors[0]?.code).toBe(ValidationCodes.REQUIRED);
  });
});

describe('Object Validation', () => {
  test('validates object with matching rules', () => {
    const data = {
      name: 'Test User',
      age: 25,
    };

    const rules = {
      name: [
        {
          name: 'required',
          validate: (v: unknown) => v !== undefined && v !== null && v !== '',
          message: 'Name is required',
          code: 'REQUIRED',
        },
      ],
      age: [
        {
          name: 'number',
          validate: (v: unknown) => typeof v === 'number',
          message: 'Age must be a number',
          code: 'INVALID_TYPE',
        },
      ],
    };

    const result = validateObject(data, rules);
    expect(result.valid).toBe(true);
  });

  test('fails validation with errors', () => {
    const data = {
      name: '',
      age: 'not-a-number',
    };

    const rules = {
      name: [
        {
          name: 'required',
          validate: (v: unknown) => v !== undefined && v !== null && v !== '',
          message: 'Name is required',
          code: 'REQUIRED',
        },
      ],
    };

    const result = validateObject(data, rules);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});

describe('Array Validation', () => {
  test('validates array with items', () => {
    const items = [1, 2, 3];
    const result = validateArray(
      items,
      (item) => ({ valid: typeof item === 'number', errors: [] }),
      { minItems: 1, maxItems: 10 }
    );
    expect(result.valid).toBe(true);
  });

  test('fails for empty array', () => {
    const result = validateArray(
      [],
      (item) => ({ valid: true, errors: [] }),
      { minItems: 1 }
    );
    expect(result.valid).toBe(false);
    expect(result.errors[0]?.code).toBe(ValidationCodes.ARRAY_TOO_SHORT);
  });

  test('fails for array too long', () => {
    const items = [1, 2, 3, 4, 5];
    const result = validateArray(
      items,
      (item) => ({ valid: true, errors: [] }),
      { maxItems: 3 }
    );
    expect(result.valid).toBe(false);
    expect(result.errors[0]?.code).toBe(ValidationCodes.ARRAY_TOO_LONG);
  });

  test('fails for non-array', () => {
    const result = validateArray(
      'not-an-array' as unknown as unknown[],
      (item) => ({ valid: true, errors: [] }),
      {}
    );
    expect(result.valid).toBe(false);
    expect(result.errors[0]?.code).toBe(ValidationCodes.INVALID_TYPE);
  });
});

describe('Chainable Validation (check)', () => {
  test('validates required value', () => {
    const result = check('hello', 'field')
      .required()
      .result();
    expect(result.valid).toBe(true);
  });

  test('fails for missing required value', () => {
    const result = check(undefined, 'field')
      .required()
      .result();
    expect(result.valid).toBe(false);
    expect(result.errors[0]?.code).toBe(ValidationCodes.REQUIRED);
  });

  test('validates string type', () => {
    const result = check('hello', 'field')
      .string()
      .result();
    expect(result.valid).toBe(true);
  });

  test('fails for non-string type', () => {
    const result = check(123, 'field')
      .string()
      .result();
    expect(result.valid).toBe(false);
    expect(result.errors[0]?.code).toBe(ValidationCodes.INVALID_TYPE);
  });

  test('validates number type', () => {
    const result = check(42, 'field')
      .number()
      .result();
    expect(result.valid).toBe(true);
  });

  test('validates integer', () => {
    const result = check(42, 'field')
      .integer()
      .result();
    expect(result.valid).toBe(true);
  });

  test('fails for non-integer', () => {
    const result = check(3.14, 'field')
      .integer()
      .result();
    expect(result.valid).toBe(false);
    expect(result.errors[0]?.code).toBe(ValidationCodes.INVALID_TYPE);
  });

  test('validates range', () => {
    const result = check(50, 'field')
      .range(0, 100)
      .result();
    expect(result.valid).toBe(true);
  });

  test('fails for value below range', () => {
    const result = check(-5, 'field')
      .range(0, 100)
      .result();
    expect(result.valid).toBe(false);
    expect(result.errors[0]?.code).toBe(ValidationCodes.OUT_OF_RANGE);
  });

  test('validates string length', () => {
    const result = check('hello', 'field')
      .length(3, 10)
      .result();
    expect(result.valid).toBe(true);
  });

  test('fails for string too short', () => {
    const result = check('hi', 'field')
      .length(3, 10)
      .result();
    expect(result.valid).toBe(false);
    expect(result.errors[0]?.code).toBe(ValidationCodes.TOO_SHORT);
  });

  test('fails for string too long', () => {
    const result = check('hello world', 'field')
      .length(3, 5)
      .result();
    expect(result.valid).toBe(false);
    expect(result.errors[0]?.code).toBe(ValidationCodes.TOO_LONG);
  });

  test('validates pattern', () => {
    const result = check('hello', 'field')
      .pattern(/^[a-z]+$/)
      .result();
    expect(result.valid).toBe(true);
  });

  test('fails for pattern mismatch', () => {
    const result = check('HELLO', 'field')
      .pattern(/^[a-z]+$/)
      .result();
    expect(result.valid).toBe(false);
    expect(result.errors[0]?.code).toBe(ValidationCodes.PATTERN_MISMATCH);
  });

  test('validates oneOf', () => {
    const result = check('apple', 'field')
      .oneOf(['apple', 'banana', 'cherry'])
      .result();
    expect(result.valid).toBe(true);
  });

  test('fails for value not in list', () => {
    const result = check('grape', 'field')
      .oneOf(['apple', 'banana', 'cherry'])
      .result();
    expect(result.valid).toBe(false);
    expect(result.errors[0]?.code).toBe(ValidationCodes.INVALID_ENUM);
  });

  test('chains multiple validations', () => {
    const result = check(42, 'count')
      .required()
      .number()
      .integer()
      .range(0, 100)
      .result();
    expect(result.valid).toBe(true);
  });

  test('adds custom error', () => {
    const result = check('invalid', 'field')
      .addError('Custom error message', 'CUSTOM_ERROR')
      .result();
    expect(result.valid).toBe(false);
    expect(result.errors[0]?.code).toBe('CUSTOM_ERROR');
    expect(result.errors[0]?.message).toBe('Custom error message');
  });
});
