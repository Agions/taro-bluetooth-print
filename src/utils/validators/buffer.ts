/**
 * ArrayBuffer validation
 */

import { ValidationCodes, type ValidationError, type ValidationResult } from './types';

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
