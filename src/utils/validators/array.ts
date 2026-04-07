/**
 * Array validation
 */

import { ValidationCodes, type ValidationError, type ValidationResult } from './types';

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
