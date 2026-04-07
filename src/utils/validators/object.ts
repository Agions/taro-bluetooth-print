/**
 * Object schema validation
 */

import { type ValidationError, type ValidationResult, type ValidationRule } from './types';

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
