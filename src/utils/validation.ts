/**
 * Validation Utility Module
 *
 * Provides comprehensive data validation utilities for printer data,
 * print jobs, device parameters, and general purpose validation.
 *
 * @example
 * ```typescript
 * import { validatePrinterData, validatePrintJob, isValidBuffer } from '@/utils/validation';
 *
 * const result = validatePrinterData(data);
 * if (!result.valid) {
 *   console.error('Validation errors:', result.errors);
 * }
 * ```
 */

/**
 * Validation error details
 */
export interface ValidationError {
  /** Field that failed validation */
  field: string;
  /** Human-readable error message */
  message: string;
  /** Error code for programmatic handling */
  code: string;
  /** Actual value that failed (optional) */
  value?: unknown;
}

/**
 * Validation result
 */
export interface ValidationResult {
  /** Whether validation passed */
  valid: boolean;
  /** List of validation errors */
  errors: ValidationError[];
  /** Warnings (non-fatal issues) */
  warnings?: ValidationError[];
}

/**
 * Validator function type
 */
export type ValidatorFn<T = unknown> = (value: T) => ValidationResult;

/**
 * Validation rule definition
 */
export interface ValidationRule<T = unknown> {
  /** Rule name */
  name: string;
  /** Validation function */
  validate: (value: T) => boolean;
  /** Error message if validation fails */
  message: string;
  /** Error code */
  code: string;
}

/**
 * Common error codes
 */
export const ValidationCodes = {
  REQUIRED: 'REQUIRED',
  INVALID_TYPE: 'INVALID_TYPE',
  INVALID_FORMAT: 'INVALID_FORMAT',
  OUT_OF_RANGE: 'OUT_OF_RANGE',
  TOO_SHORT: 'TOO_SHORT',
  TOO_LONG: 'TOO_LONG',
  INVALID_ENUM: 'INVALID_ENUM',
  PATTERN_MISMATCH: 'PATTERN_MISMATCH',
  INVALID_BUFFER: 'INVALID_BUFFER',
  INVALID_ENCODING: 'INVALID_ENCODING',
  EMPTY_ARRAY: 'EMPTY_ARRAY',
  ARRAY_TOO_SHORT: 'ARRAY_TOO_SHORT',
  ARRAY_TOO_LONG: 'ARRAY_TOO_LONG',
  DUPLICATE_VALUE: 'DUPLICATE_VALUE',
  NEGATIVE_VALUE: 'NEGATIVE_VALUE',
  ZERO_VALUE: 'ZERO_VALUE',
  NOT_A_NUMBER: 'NOT_A_NUMBER',
  INFINITY_VALUE: 'INFINITY_VALUE',
  INVALID_JSON: 'INVALID_JSON',
  UNSUPPORTED_VALUE: 'UNSUPPORTED_VALUE',
  INVALID_VERSION: 'INVALID_VERSION',
} as const;

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

/**
 * Printer data validation schema
 */
export interface PrinterDataSchema {
  /** Device ID */
  deviceId?: { required?: boolean; pattern?: RegExp };
  /** Device name */
  deviceName?: { required?: boolean; maxLength?: number };
  /** Service UUID */
  serviceUUID?: { required?: boolean; pattern?: RegExp };
  /** Characteristic UUID */
  characteristicUUID?: { required?: boolean; pattern?: RegExp };
}

/**
 * Print job data validation schema
 */
export interface PrintJobSchema {
  /** Job ID */
  jobId?: { required?: boolean; maxLength?: number };
  /** Data buffer */
  data?: { required?: boolean; minSize?: number; maxSize?: number };
  /** Priority */
  priority?: { min?: number; max?: number };
  /** Retry count */
  retryCount?: { min?: number; max?: number };
  /** Metadata */
  metadata?: { required?: boolean };
}

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

/**
 * Validate an ArrayBuffer
 *
 * @param buffer - Buffer to validate
 * @param options - Validation options
 * @returns Validation result
 *
 * @example
 * ```typescript
 * const result = isValidBuffer(data, { minSize: 1, maxSize: 1024 * 1024 });
 * ```
 */
export function isValidBuffer(
  buffer: unknown,
  options?: {
    minSize?: number;
    maxSize?: number;
    required?: boolean;
  }
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  if (!(buffer instanceof ArrayBuffer)) {
    errors.push({
      field: 'buffer',
      message: 'Expected an ArrayBuffer',
      code: ValidationCodes.INVALID_TYPE,
      value: typeof buffer,
    });
    return {
      valid: false,
      errors,
      ...(warnings.length > 0 ? { warnings } : {}),
    };
  }

  const byteLength = buffer.byteLength;
  // When required is true without explicit minSize, treat empty buffer as TOO_SHORT
  const effectiveMinSize =
    options?.required && options?.minSize === undefined ? 1 : options?.minSize;

  if (effectiveMinSize !== undefined && byteLength < effectiveMinSize) {
    errors.push({
      field: 'buffer',
      message: `Buffer must be at least ${effectiveMinSize} bytes`,
      code: ValidationCodes.TOO_SHORT,
      value: byteLength,
    });
  }

  if (options?.maxSize !== undefined && byteLength > options.maxSize) {
    errors.push({
      field: 'buffer',
      message: `Buffer exceeds maximum size of ${options.maxSize} bytes`,
      code: ValidationCodes.TOO_LONG,
      value: byteLength,
    });
  }

  if (byteLength === 0) {
    warnings.push({
      field: 'buffer',
      message: 'Buffer is empty',
      code: ValidationCodes.EMPTY_ARRAY,
      value: byteLength,
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    ...(warnings.length > 0 ? { warnings } : {}),
  };
}

/**
 * Validate a string is valid UUID
 *
 * @param value - Value to validate
 * @param options - Validation options
 * @returns Validation result
 *
 * @example
 * ```typescript
 * const result = isValidUUID(value, { required: true });
 * ```
 */
export function isValidUUID(
  value: unknown,
  options?: { required?: boolean; versions?: number[] }
): { valid: boolean; version?: number; error?: string } {
  if (value === undefined || value === null || value === '') {
    if (options?.required) {
      return { valid: false, error: 'UUID is required' };
    }
    return { valid: true };
  }

  if (typeof value !== 'string') {
    return { valid: false, error: 'UUID must be a string' };
  }

  // UUID format: 8-4-4-4-12 hex characters
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidPattern.test(value)) {
    return { valid: false, error: 'Invalid UUID format (expected 8-4-4-4-12 hex format)' };
  }

  // Extract version
  const versionChar = value.charAt(14);
  const version = parseInt(versionChar, 16);

  if (options?.versions) {
    if (!options.versions.includes(version)) {
      return { valid: false, error: `UUID version must be one of: ${options.versions.join(', ')}` };
    }
  }

  return { valid: true, version };
}

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

/**
 * Validate an object against a schema
 *
 * @param data - Data object to validate
 * @param rules - Validation rules per field
 * @returns Validation result
 *
 * @example
 * ```typescript
 * const result = validateObject(data, {
 *   name: [
 *     { name: 'required', validate: v => v !== undefined, message: 'Name is required', code: 'REQUIRED' },
 *     { name: 'maxLength', validate: v => v.length <= 50, message: 'Max 50 chars', code: 'TOO_LONG' }
 *   ],
 *   age: [
 *     { name: 'number', validate: v => typeof v === 'number', message: 'Must be number', code: 'INVALID_TYPE' }
 *   ]
 * });
 * ```
 */
export function validateObject<T extends Record<string, unknown>>(
  data: T,
  rules: {
    [K in keyof T]?: ValidationRule<T[K]>[];
  }
): ValidationResult {
  const errors: ValidationError[] = [];

  for (const [field, fieldRules] of Object.entries(rules)) {
    if (!fieldRules) continue;

    const value = data[field];

    for (const rule of fieldRules) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        if (!rule.validate(value)) {
          /* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment */
          errors.push({ field, message: rule.message, code: rule.code, value });
          /* eslint-enable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment */
        }
      } catch (err) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
        const errorMessage = err instanceof Error ? err.message : String(err);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        errors.push({
          field,
          message: `Validation error: ${errorMessage}`,
          code: 'VALIDATION_ERROR',
          value,
        });
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate an array of items
 *
 * @param items - Array to validate
 * @param itemValidator - Validator function for each item
 * @param options - Array validation options
 * @returns Validation result
 *
 * @example
 * ```typescript
 * const result = validateArray(items, item => validatePrintJob(item, schema), { minItems: 1, maxItems: 100 });
 * ```
 */
export function validateArray<T>(
  items: unknown,
  itemValidator: (item: T, index: number) => ValidationResult,
  options?: {
    required?: boolean;
    minItems?: number;
    maxItems?: number;
  }
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  if (items === undefined || items === null) {
    if (options?.required) {
      errors.push({
        field: 'array',
        message: 'Array is required',
        code: ValidationCodes.REQUIRED,
      });
    }
    return { valid: errors.length === 0, errors, warnings };
  }

  if (!Array.isArray(items)) {
    errors.push({
      field: 'array',
      message: 'Expected an array',
      code: ValidationCodes.INVALID_TYPE,
      value: typeof items,
    });
    return { valid: false, errors, warnings };
  }

  if (options?.minItems !== undefined && items.length < options.minItems) {
    errors.push({
      field: 'array',
      message: `Array must have at least ${options.minItems} items`,
      code: ValidationCodes.ARRAY_TOO_SHORT,
      value: items.length,
    });
  }

  if (options?.maxItems !== undefined && items.length > options.maxItems) {
    errors.push({
      field: 'array',
      message: `Array must have at most ${options.maxItems} items`,
      code: ValidationCodes.ARRAY_TOO_LONG,
      value: items.length,
    });
  }

  // Validate each item
  for (let i = 0; i < items.length; i++) {
    const itemResult = itemValidator(items[i] as T, i);
    errors.push(
      ...itemResult.errors.map(err => ({
        ...err,
        field: `${err.field}[${i}]`,
      }))
    );
    if (itemResult.warnings) {
      warnings.push(
        ...itemResult.warnings.map(w => ({
          ...w,
          field: `${w.field}[${i}]`,
        }))
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    ...(warnings.length > 0 ? { warnings } : {}),
  };
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
export function check(value: unknown, field: string) {
  const errors: ValidationError[] = [];

  // Define interface for chainable methods
  interface ChainableValidator {
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
