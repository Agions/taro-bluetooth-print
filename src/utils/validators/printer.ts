/**
 * Printer and print job validation
 */

import {
  ValidationCodes,
  type ValidationError,
  type ValidationResult,
  type PrinterDataSchema,
  type PrintJobSchema,
} from './types';

/**
 * Validate printer connection data
 *
 * @param data - Data to validate
 * @param schema - Validation schema
 * @returns Validation result
 *
 * @example
 * ```typescript
 * const result = validatePrinterData({
 *   deviceId: 'device-123',
 *   deviceName: 'Thermal Printer',
 * }, {
 *   deviceId: { required: true },
 *   deviceName: { required: true, maxLength: 50 }
 * });
 * ```
 */
export function validatePrinterData(
  data: Record<string, unknown>,
  schema: PrinterDataSchema
): ValidationResult {
  const errors: ValidationError[] = [];

  // Device ID validation
  if (schema.deviceId) {
    const { required, pattern } = schema.deviceId;
    const value = data.deviceId;

    if (required && !value) {
      errors.push({
        field: 'deviceId',
        message: 'Device ID is required',
        code: ValidationCodes.REQUIRED,
        value,
      });
    }

    if (value && typeof value === 'string' && pattern && !pattern.test(value)) {
      errors.push({
        field: 'deviceId',
        message: 'Device ID format is invalid',
        code: ValidationCodes.PATTERN_MISMATCH,
        value,
      });
    }
  }

  // Device name validation
  if (schema.deviceName) {
    const { required, maxLength } = schema.deviceName;
    const value = data.deviceName;

    if (required && !value) {
      errors.push({
        field: 'deviceName',
        message: 'Device name is required',
        code: ValidationCodes.REQUIRED,
        value,
      });
    }

    if (value && typeof value === 'string' && maxLength && value.length > maxLength) {
      errors.push({
        field: 'deviceName',
        message: `Device name must be at most ${maxLength} characters`,
        code: ValidationCodes.TOO_LONG,
        value,
      });
    }
  }

  // Service UUID validation
  if (schema.serviceUUID) {
    const { required, pattern } = schema.serviceUUID;
    const value = data.serviceUUID;

    if (required && !value) {
      errors.push({
        field: 'serviceUUID',
        message: 'Service UUID is required',
        code: ValidationCodes.REQUIRED,
        value,
      });
    }

    if (value && typeof value === 'string' && pattern && !pattern.test(value)) {
      errors.push({
        field: 'serviceUUID',
        message: 'Service UUID format is invalid',
        code: ValidationCodes.PATTERN_MISMATCH,
        value,
      });
    }
  }

  // Characteristic UUID validation
  if (schema.characteristicUUID) {
    const { required, pattern } = schema.characteristicUUID;
    const value = data.characteristicUUID;

    if (required && !value) {
      errors.push({
        field: 'characteristicUUID',
        message: 'Characteristic UUID is required',
        code: ValidationCodes.REQUIRED,
        value,
      });
    }

    if (value && typeof value === 'string' && pattern && !pattern.test(value)) {
      errors.push({
        field: 'characteristicUUID',
        message: 'Characteristic UUID format is invalid',
        code: ValidationCodes.PATTERN_MISMATCH,
        value,
      });
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate print job data
 *
 * @param data - Data to validate
 * @param schema - Validation schema
 * @returns Validation result
 *
 * @example
 * ```typescript
 * const result = validatePrintJob({
 *   jobId: 'job-001',
 *   data: new ArrayBuffer(1024),
 *   priority: 5,
 * }, {
 *   jobId: { required: true },
 *   data: { required: true, minSize: 1 }
 * });
 * ```
 */
export function validatePrintJob(
  data: Record<string, unknown>,
  schema: PrintJobSchema
): ValidationResult {
  const errors: ValidationError[] = [];

  // Job ID validation
  if (schema.jobId) {
    const { required, maxLength } = schema.jobId;
    const value = data.jobId;

    if (required && !value) {
      errors.push({
        field: 'jobId',
        message: 'Job ID is required',
        code: ValidationCodes.REQUIRED,
        value,
      });
    }

    if (value && typeof value === 'string' && maxLength && value.length > maxLength) {
      errors.push({
        field: 'jobId',
        message: `Job ID must be at most ${maxLength} characters`,
        code: ValidationCodes.TOO_LONG,
        value,
      });
    }
  }

  // Data buffer validation
  if (schema.data) {
    const { required, minSize, maxSize } = schema.data;
    const value = data.data;

    if (required && !value) {
      errors.push({
        field: 'data',
        message: 'Print data is required',
        code: ValidationCodes.REQUIRED,
        value,
      });
    }

    if (value instanceof ArrayBuffer) {
      const byteLength = value.byteLength;

      if (minSize !== undefined && byteLength < minSize) {
        errors.push({
          field: 'data',
          message: `Print data must be at least ${minSize} bytes`,
          code: ValidationCodes.TOO_SHORT,
          value: byteLength,
        });
      }

      if (maxSize !== undefined && byteLength > maxSize) {
        errors.push({
          field: 'data',
          message: `Print data must be at most ${maxSize} bytes`,
          code: ValidationCodes.TOO_LONG,
          value: byteLength,
        });
      }
    } else if (value && !(value instanceof ArrayBuffer)) {
      errors.push({
        field: 'data',
        message: 'Print data must be an ArrayBuffer',
        code: ValidationCodes.INVALID_TYPE,
        value: typeof value,
      });
    }
  }

  // Priority validation
  if (schema.priority) {
    const { min, max } = schema.priority;
    const value = data.priority;

    if (value !== undefined && typeof value !== 'number') {
      errors.push({
        field: 'priority',
        message: 'Priority must be a number',
        code: ValidationCodes.INVALID_TYPE,
        value,
      });
    } else if (typeof value === 'number') {
      if (min !== undefined && value < min) {
        errors.push({
          field: 'priority',
          message: `Priority must be at least ${min}`,
          code: ValidationCodes.OUT_OF_RANGE,
          value,
        });
      }
      if (max !== undefined && value > max) {
        errors.push({
          field: 'priority',
          message: `Priority must be at most ${max}`,
          code: ValidationCodes.OUT_OF_RANGE,
          value,
        });
      }
    }
  }

  // Retry count validation
  if (schema.retryCount) {
    const { min, max } = schema.retryCount;
    const value = data.retryCount;

    if (value !== undefined && typeof value !== 'number') {
      errors.push({
        field: 'retryCount',
        message: 'Retry count must be a number',
        code: ValidationCodes.INVALID_TYPE,
        value,
      });
    } else if (typeof value === 'number') {
      if (min !== undefined && value < min) {
        errors.push({
          field: 'retryCount',
          message: `Retry count must be at least ${min}`,
          code: ValidationCodes.OUT_OF_RANGE,
          value,
        });
      }
      if (max !== undefined && value > max) {
        errors.push({
          field: 'retryCount',
          message: `Retry count must be at most ${max}`,
          code: ValidationCodes.OUT_OF_RANGE,
          value,
        });
      }
    }
  }

  return { valid: errors.length === 0, errors };
}
