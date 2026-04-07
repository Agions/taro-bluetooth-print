/**
 * Core validation types
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
