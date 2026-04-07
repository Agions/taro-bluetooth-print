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
export { check, ChainableValidator } from './validators/chain';

// Re-export types and constants
export {
  ValidationCodes,
  CommonValidators,
  type ValidationError,
  type ValidationResult,
  type ValidatorFn,
  type ValidationRule,
  type PrinterDataSchema,
  type PrintJobSchema,
} from './validators/types';
