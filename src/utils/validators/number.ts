/**
 * Numeric range validation
 */

import { ValidationCodes, type ValidationError, type ValidationResult } from './types';

/**
 * Validate numeric range
 *
 * @param value - Value to validate
 * @param field - Field name for error messages
 * @param options - Range options
 * @returns Validation result
 *
 * @example
 * ```typescript
 * const result = validateRange(value, 'timeout', { min: 0, max: 30000, integer: true });
 * ```
 */
export function validateRange(
  value: unknown,
  field: string,
  options?: {
    required?: boolean;
    min?: number;
    max?: number;
    integer?: boolean;
  }
): ValidationResult {
  const errors: ValidationError[] = [];

  if (value === undefined || value === null) {
    if (options?.required) {
      errors.push({
        field,
        message: `${field} is required`,
        code: ValidationCodes.REQUIRED,
      });
    }
    return { valid: errors.length === 0, errors };
  }

  if (typeof value !== 'number') {
    errors.push({
      field,
      message: `${field} must be a number`,
      code: ValidationCodes.INVALID_TYPE,
      value: typeof value,
    });
    return { valid: false, errors };
  }

  if (isNaN(value)) {
    errors.push({
      field,
      message: `${field} must be a valid number`,
      code: ValidationCodes.NOT_A_NUMBER,
      value,
    });
    return { valid: false, errors };
  }

  if (!isFinite(value)) {
    errors.push({
      field,
      message: `${field} must be a finite number`,
      code: ValidationCodes.INFINITY_VALUE,
      value,
    });
    return { valid: false, errors };
  }

  if (options?.integer && !Number.isInteger(value)) {
    errors.push({
      field,
      message: `${field} must be an integer`,
      code: ValidationCodes.INVALID_TYPE,
      value,
    });
  }

  if (options?.min !== undefined && value < options.min) {
    errors.push({
      field,
      message: `${field} must be at least ${options.min}`,
      code: ValidationCodes.OUT_OF_RANGE,
      value,
    });
  }

  if (options?.max !== undefined && value > options.max) {
    errors.push({
      field,
      message: `${field} must be at most ${options.max}`,
      code: ValidationCodes.OUT_OF_RANGE,
      value,
    });
  }

  return { valid: errors.length === 0, errors };
}
