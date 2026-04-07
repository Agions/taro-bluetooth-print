/**
 * UUID validation
 */

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
