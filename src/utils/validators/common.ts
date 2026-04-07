/**
 * Common validation helpers
 */

import { ValidationCodes, type ValidationError } from './types';

/**
 * Common validation rules
 */
export const CommonValidators = {
  /** Required string (non-empty) */
  requiredString: (field: string, value: unknown): ValidationError | null => {
    if (value === undefined || value === null || value === '') {
      return {
        field,
        message: `${field} is required`,
        code: ValidationCodes.REQUIRED,
        value,
      };
    }
    if (typeof value !== 'string') {
      return {
        field,
        message: `${field} must be a string`,
        code: ValidationCodes.INVALID_TYPE,
        value,
      };
    }
    return null;
  },

  /** Positive number */
  positiveNumber: (field: string, value: unknown): ValidationError | null => {
    if (typeof value !== 'number') {
      return {
        field,
        message: `${field} must be a number`,
        code: ValidationCodes.INVALID_TYPE,
        value,
      };
    }
    if (isNaN(value)) {
      return {
        field,
        message: `${field} must be a valid number`,
        code: ValidationCodes.NOT_A_NUMBER,
        value,
      };
    }
    if (!isFinite(value)) {
      return {
        field,
        message: `${field} must be a finite number`,
        code: ValidationCodes.INFINITY_VALUE,
        value,
      };
    }
    if (value <= 0) {
      return {
        field,
        message: `${field} must be positive`,
        code: ValidationCodes.NEGATIVE_VALUE,
        value,
      };
    }
    return null;
  },

  /** Non-negative number */
  nonNegativeNumber: (field: string, value: unknown): ValidationError | null => {
    if (typeof value !== 'number') {
      return {
        field,
        message: `${field} must be a number`,
        code: ValidationCodes.INVALID_TYPE,
        value,
      };
    }
    if (isNaN(value)) {
      return {
        field,
        message: `${field} must be a valid number`,
        code: ValidationCodes.NOT_A_NUMBER,
        value,
      };
    }
    if (value < 0) {
      return {
        field,
        message: `${field} cannot be negative`,
        code: ValidationCodes.NEGATIVE_VALUE,
        value,
      };
    }
    return null;
  },

  /** Array with items */
  nonEmptyArray: (field: string, value: unknown): ValidationError | null => {
    if (!Array.isArray(value)) {
      return {
        field,
        message: `${field} must be an array`,
        code: ValidationCodes.INVALID_TYPE,
        value,
      };
    }
    if (value.length === 0) {
      return {
        field,
        message: `${field} cannot be empty`,
        code: ValidationCodes.EMPTY_ARRAY,
        value,
      };
    }
    return null;
  },

  /** In range */
  inRange: (field: string, value: unknown, min: number, max: number): ValidationError | null => {
    if (typeof value !== 'number') {
      return {
        field,
        message: `${field} must be a number`,
        code: ValidationCodes.INVALID_TYPE,
        value,
      };
    }
    if (value < min || value > max) {
      return {
        field,
        message: `${field} must be between ${min} and ${max}`,
        code: ValidationCodes.OUT_OF_RANGE,
        value,
      };
    }
    return null;
  },

  /** String length */
  stringLength: (
    field: string,
    value: unknown,
    min: number,
    max: number
  ): ValidationError | null => {
    if (typeof value !== 'string') {
      return {
        field,
        message: `${field} must be a string`,
        code: ValidationCodes.INVALID_TYPE,
        value,
      };
    }
    if (value.length < min) {
      return {
        field,
        message: `${field} must be at least ${min} characters`,
        code: ValidationCodes.TOO_SHORT,
        value,
      };
    }
    if (value.length > max) {
      return {
        field,
        message: `${field} must be at most ${max} characters`,
        code: ValidationCodes.TOO_LONG,
        value,
      };
    }
    return null;
  },

  /** Matches pattern */
  matchesPattern: (
    field: string,
    value: unknown,
    pattern: RegExp,
    message?: string
  ): ValidationError | null => {
    if (typeof value !== 'string') {
      return {
        field,
        message: `${field} must be a string`,
        code: ValidationCodes.INVALID_TYPE,
        value,
      };
    }
    if (!pattern.test(value)) {
      return {
        field,
        message: message ?? `${field} format is invalid`,
        code: ValidationCodes.PATTERN_MISMATCH,
        value,
      };
    }
    return null;
  },

  /** Is one of enum values */
  isEnum: <T extends string>(
    field: string,
    value: unknown,
    enumValues: readonly T[]
  ): ValidationError | null => {
    if (!enumValues.includes(value as T)) {
      return {
        field,
        message: `${field} must be one of: ${enumValues.join(', ')}`,
        code: ValidationCodes.INVALID_ENUM,
        value,
      };
    }
    return null;
  },
};
