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

// Re-export all validators
export { validatePrinterData, validatePrintJob } from './validators/printer';
export { isValidBuffer } from './validators/buffer';
export { isValidUUID } from './validators/uuid';
export { validateRange } from './validators/number';
export { validateObject } from './validators/object';
export { validateArray } from './validators/array';
export { check } from './validators/chain';
export type { ChainableValidator } from './validators/chain';
export { CommonValidators } from './validators/common';

// Re-export types and constants
export { ValidationCodes } from './validators/types';
export type {
  ValidationError,
  ValidationResult,
  ValidatorFn,
  ValidationRule,
  PrinterDataSchema,
  PrintJobSchema,
} from './validators/types';
