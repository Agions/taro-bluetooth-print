/**
 * Chainable validation helper
 */

import { ValidationCodes, type ValidationError, type ValidationResult } from './types';

export interface ChainableValidator {
  addError(message: string, code: string): ChainableValidator;
  required(): ChainableValidator;
  string(): ChainableValidator;
  number(): ChainableValidator;
  integer(): ChainableValidator;
  range(min: number, max: number): ChainableValidator;
  length(min: number, max: number): ChainableValidator;
  pattern(regex: RegExp, message?: string): ChainableValidator;
  oneOf<T>(values: readonly T[], message?: string): ChainableValidator;
  result(): ValidationResult;
}

/**
 * Create a chainable validation helper
 *
 * @param value - Value to validate
 * @param field - Field name
 * @returns Chainable validator
 *
 * @example
 * ```typescript
 * const result = check(value, 'timeout')
 *   .required()
 *   .number()
 *   .range(0, 30000)
 *   .integer()
 *   .result();
 * ```
 */
export function check(value: unknown, field: string): ChainableValidator {
  const errors: ValidationError[] = [];

  const self: ChainableValidator = {
    /** Add error manually */
    addError(message: string, code: string) {
      errors.push({ field, message, code, value });
      return this;
    },

    /** Validate required */
    required() {
      if (value === undefined || value === null || value === '') {
        errors.push({
          field,
          message: `${field} is required`,
          code: ValidationCodes.REQUIRED,
          value,
        });
      }
      return this;
    },

    /** Validate type is string */
    string() {
      if (value !== undefined && value !== null && typeof value !== 'string') {
        errors.push({
          field,
          message: `${field} must be a string`,
          code: ValidationCodes.INVALID_TYPE,
          value: typeof value,
        });
      }
      return this;
    },

    /** Validate type is number */
    number() {
      if (value !== undefined && value !== null && typeof value !== 'number') {
        errors.push({
          field,
          message: `${field} must be a number`,
          code: ValidationCodes.INVALID_TYPE,
          value: typeof value,
        });
      }
      return this;
    },

    /** Validate is integer */
    integer() {
      if (typeof value === 'number' && !Number.isInteger(value)) {
        errors.push({
          field,
          message: `${field} must be an integer`,
          code: ValidationCodes.INVALID_TYPE,
          value,
        });
      }
      return this;
    },

    /** Validate range */
    range(min: number, max: number) {
      if (typeof value === 'number') {
        if (value < min) {
          errors.push({
            field,
            message: `${field} must be at least ${min}`,
            code: ValidationCodes.OUT_OF_RANGE,
            value,
          });
        }
        if (value > max) {
          errors.push({
            field,
            message: `${field} must be at most ${max}`,
            code: ValidationCodes.OUT_OF_RANGE,
            value,
          });
        }
      }
      return this;
    },

    /** Validate string length */
    length(min: number, max: number) {
      if (typeof value === 'string') {
        if (value.length < min) {
          errors.push({
            field,
            message: `${field} must be at least ${min} characters`,
            code: ValidationCodes.TOO_SHORT,
            value,
          });
        }
        if (value.length > max) {
          errors.push({
            field,
            message: `${field} must be at most ${max} characters`,
            code: ValidationCodes.TOO_LONG,
            value,
          });
        }
      }
      return this;
    },

    /** Validate matches pattern */
    pattern(regex: RegExp, message?: string) {
      if (typeof value === 'string' && !regex.test(value)) {
        errors.push({
          field,
          message: message ?? `${field} format is invalid`,
          code: ValidationCodes.PATTERN_MISMATCH,
          value,
        });
      }
      return this;
    },

    /** Validate is one of values */
    oneOf<T>(values: readonly T[], message?: string) {
      if (!values.includes(value as T)) {
        errors.push({
          field,
          message: message ?? `${field} must be one of: ${values.join(', ')}`,
          code: ValidationCodes.INVALID_ENUM,
          value,
        });
      }
      return this;
    },

    /** Get validation result */
    result() {
      return {
        valid: errors.length === 0,
        errors,
      };
    },
  };

  return self;
}
