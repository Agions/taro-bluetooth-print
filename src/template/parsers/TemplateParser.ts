/**
 * Template Parser
 *
 * Handles template validation and data extraction.
 * Provides variable substitution and nested value access.
 */

import type { TemplateDefinition, ValidationResult } from '../TemplateEngine';

/**
 * Template Parser class
 * Handles template validation and data extraction
 */
export class TemplateParser {
  /**
   * Validate template data
   */
  validate(template: TemplateDefinition, data: Record<string, unknown>): ValidationResult {
    const errors: ValidationResult['errors'] = [];

    for (const element of template.elements) {
      if (element.type === 'variable') {
        const value = this.getNestedValue(data, element.name);
        if (value === undefined) {
          errors.push({
            field: element.name,
            message: `Missing required variable: ${element.name}`,
            code: 'MISSING_VARIABLE',
          });
        }
      } else if (element.type === 'loop') {
        const items = this.getNestedValue(data, element.items);
        if (!Array.isArray(items)) {
          errors.push({
            field: element.items,
            message: `Loop variable '${element.items}' must be an array`,
            code: 'INVALID_LOOP_VARIABLE',
          });
        }
      } else if (element.type === 'condition') {
        // Condition validation is optional - conditions can reference missing data
      }
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Substitute variables in a string
   */
  substituteVariables(template: string, data: Record<string, unknown>): string {
    return template.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (_, key: string) => {
      const value = this.getNestedValue(data, key);
      if (value === undefined) return '';
      if (typeof value === 'object') return JSON.stringify(value);
      // eslint-disable-next-line @typescript-eslint/no-base-to-string
      return String(value);
    });
  }

  /**
   * Get nested value from object
   */
  getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    const keys = path.split('.');
    let current: unknown = obj;

    for (const key of keys) {
      if (current === null || current === undefined) {
        return undefined;
      }
      if (typeof current === 'object') {
        current = (current as Record<string, unknown>)[key];
      } else {
        return undefined;
      }
    }

    return current;
  }

  /**
   * Format a value with optional format string
   */
  formatValue(value: unknown, format?: string): string {
    if (format === 'currency' && typeof value === 'number') {
      return `¥${value.toFixed(2)}`;
    }
    if (format === 'date' && value instanceof Date) {
      return value.toLocaleDateString('zh-CN');
    }
    return String(value);
  }
}
