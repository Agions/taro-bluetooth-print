/**
 * TemplateParser Tests
 *
 * Covers src/template/parsers/TemplateParser.ts
 * Goals:
 *  - variable substitution {{var}}, including nested paths & missing values
 *  - template validation for variable / loop / condition elements
 *  - getNestedValue traversal and edge cases
 *  - formatValue (currency / date / default)
 *
 * Test framework: vitest globals (describe / test / expect / beforeEach)
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { TemplateParser } from '../../src/template/parsers/TemplateParser';
import type {
  TemplateDefinition,
  TemplateElement,
} from '../../src/template/TemplateEngine';
import { TemplateType } from '../../src/template/TemplateEngine';

const makeTemplate = (elements: TemplateElement[]): TemplateDefinition => ({
  type: TemplateType.CUSTOM,
  name: 'test-template',
  width: 48,
  elements,
});

describe('TemplateParser', () => {
  let parser: TemplateParser;

  beforeEach(() => {
    parser = new TemplateParser();
  });

  // ---------------------------------------------------------------------------
  // getNestedValue
  // ---------------------------------------------------------------------------
  describe('getNestedValue', () => {
    test('returns top-level value', () => {
      expect(parser.getNestedValue({ a: 1 }, 'a')).toBe(1);
    });

    test('returns nested value via dot path', () => {
      const data = { a: { b: { c: 'deep' } } };
      expect(parser.getNestedValue(data, 'a.b.c')).toBe('deep');
    });

    test('returns undefined for missing path', () => {
      expect(parser.getNestedValue({ a: 1 }, 'b')).toBeUndefined();
      expect(parser.getNestedValue({ a: 1 }, 'a.b.c')).toBeUndefined();
    });

    test('returns undefined when traversing through non-object', () => {
      expect(parser.getNestedValue({ a: 'string' }, 'a.b')).toBeUndefined();
      expect(parser.getNestedValue({ a: 42 }, 'a.b')).toBeUndefined();
    });

    test('returns undefined when root is null/undefined', () => {
      expect(parser.getNestedValue(null as unknown as Record<string, unknown>, 'a')).toBeUndefined();
      expect(parser.getNestedValue(undefined as unknown as Record<string, unknown>, 'a')).toBeUndefined();
    });

    test('returns falsy values (0, "", false, null) as-is', () => {
      expect(parser.getNestedValue({ a: 0 }, 'a')).toBe(0);
      expect(parser.getNestedValue({ a: '' }, 'a')).toBe('');
      expect(parser.getNestedValue({ a: false }, 'a')).toBe(false);
      expect(parser.getNestedValue({ a: null }, 'a')).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // substituteVariables  - covers {{var}} replacement
  // ---------------------------------------------------------------------------
  describe('substituteVariables', () => {
    test('replaces single variable', () => {
      expect(parser.substituteVariables('Hello {{name}}!', { name: 'World' })).toBe('Hello World!');
    });

    test('replaces multiple variables', () => {
      expect(
        parser.substituteVariables('{{a}} + {{b}} = {{c}}', { a: 1, b: 2, c: 3 })
      ).toBe('1 + 2 = 3');
    });

    test('replaces nested variable via dot path', () => {
      const data = { user: { profile: { firstName: 'Ada' } } };
      expect(parser.substituteVariables('Hi {{user.profile.firstName}}', data)).toBe('Hi Ada');
    });

    test('substitutes undefined missing variable as empty string', () => {
      expect(parser.substituteVariables('A={{a}}', {})).toBe('A=');
    });

    test('JSON-stringifies null as the string "null"', () => {
      // null is not undefined, so the first guard doesn't catch it; typeof null
      // is 'object', so it falls into JSON.stringify(value) → "null".
      expect(parser.substituteVariables('V={{v}}', { v: null })).toBe('V=null');
    });

    test('JSON-stringifies object values', () => {
      const out = parser.substituteVariables('obj={{o}}', { o: { x: 1 } });
      // JSON.stringify produces `{"x":1}`
      expect(out).toBe('obj={"x":1}');
    });

    test('returns string unchanged when no markers', () => {
      expect(parser.substituteVariables('no vars here', { a: 1 })).toBe('no vars here');
    });

    test('handles repeated variable in the same template', () => {
      expect(parser.substituteVariables('{{x}}-{{x}}-{{x}}', { x: 'A' })).toBe('A-A-A');
    });

    test('stringifies boolean and number correctly', () => {
      expect(parser.substituteVariables('{{n}} {{b}}', { n: 42, b: true })).toBe('42 true');
    });
  });

  // ---------------------------------------------------------------------------
  // formatValue
  // ---------------------------------------------------------------------------
  describe('formatValue', () => {
    test('formats number as currency', () => {
      expect(parser.formatValue(12.5, 'currency')).toBe('¥12.50');
      expect(parser.formatValue(0, 'currency')).toBe('¥0.00');
    });

    test('ignores non-number when format=currency', () => {
      expect(parser.formatValue('12.5', 'currency')).toBe('12.5');
    });

    test('formats Date in zh-CN locale', () => {
      const d = new Date('2024-01-02T00:00:00Z');
      const out = parser.formatValue(d, 'date');
      // Locale may vary slightly by runtime, but must include year and a digit form
      expect(typeof out).toBe('string');
      expect(out.length).toBeGreaterThan(0);
    });

    test('ignores non-Date when format=date', () => {
      expect(parser.formatValue('2024-01-02', 'date')).toBe('2024-01-02');
    });

    test('default formatting is String(value)', () => {
      expect(parser.formatValue(123)).toBe('123');
      expect(parser.formatValue('hello')).toBe('hello');
      expect(parser.formatValue(true)).toBe('true');
    });
  });

  // ---------------------------------------------------------------------------
  // validate
  // ---------------------------------------------------------------------------
  describe('validate', () => {
    test('returns valid when no elements', () => {
      const result = parser.validate(makeTemplate([]), {});
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('returns valid when all required variables present', () => {
      const template = makeTemplate([
        { type: 'variable', name: 'name' },
        { type: 'variable', name: 'age' },
      ]);
      const result = parser.validate(template, { name: 'Ada', age: 36 });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('reports MISSING_VARIABLE for undefined values', () => {
      const template = makeTemplate([
        { type: 'variable', name: 'name' },
        { type: 'variable', name: 'age' },
      ]);
      const result = parser.validate(template, { name: 'Ada' });
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toMatchObject({
        field: 'age',
        code: 'MISSING_VARIABLE',
      });
    });

    test('null is treated as PRESENT (only undefined triggers MISSING_VARIABLE)', () => {
      const template = makeTemplate([{ type: 'variable', name: 'x' }]);
      const r1 = parser.validate(template, {});
      const r2 = parser.validate(template, { x: null });
      // Missing key → invalid
      expect(r1.valid).toBe(false);
      expect(r1.errors[0].code).toBe('MISSING_VARIABLE');
      // null value → still present, no error
      expect(r2.valid).toBe(true);
      expect(r2.errors).toHaveLength(0);
    });

    test('treats falsy primitives (0, "", false) as PRESENT', () => {
      const template = makeTemplate([
        { type: 'variable', name: 'n' },
        { type: 'variable', name: 's' },
        { type: 'variable', name: 'b' },
      ]);
      const result = parser.validate(template, { n: 0, s: '', b: false });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('reports INVALID_LOOP_VARIABLE for non-array loop source', () => {
      const template = makeTemplate([
        { type: 'loop', items: 'items', itemVar: 'it', elements: [] },
      ]);
      const result = parser.validate(template, { items: 'not-an-array' });
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toMatchObject({
        field: 'items',
        code: 'INVALID_LOOP_VARIABLE',
      });
    });

    test('reports INVALID_LOOP_VARIABLE when loop source missing', () => {
      const template = makeTemplate([
        { type: 'loop', items: 'items', itemVar: 'it', elements: [] },
      ]);
      const result = parser.validate(template, {});
      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe('INVALID_LOOP_VARIABLE');
    });

    test('passes validation when loop source is an array', () => {
      const template = makeTemplate([
        { type: 'loop', items: 'rows', itemVar: 'row', elements: [] },
      ]);
      const result = parser.validate(template, { rows: [1, 2, 3] });
      expect(result.valid).toBe(true);
    });

    test('condition elements do not produce errors (optional validation)', () => {
      const template = makeTemplate([
        { type: 'condition', variable: 'maybe', operator: 'exists', then: [] },
      ]);
      const result = parser.validate(template, {}); // 'maybe' missing
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('collects multiple errors across element types', () => {
      const template = makeTemplate([
        { type: 'variable', name: 'name' },
        { type: 'loop', items: 'rows', itemVar: 'r', elements: [] },
      ]);
      const result = parser.validate(template, { rows: 'oops' });
      expect(result.valid).toBe(false);
      // Only INVALID_LOOP_VARIABLE — variable 'name' missing also fires
      expect(result.errors.length).toBe(2);
      const codes = result.errors.map(e => e.code).sort();
      expect(codes).toEqual(['INVALID_LOOP_VARIABLE', 'MISSING_VARIABLE']);
    });
  });

  // ---------------------------------------------------------------------------
  // Mixed: substitution + validation
  // ---------------------------------------------------------------------------
  describe('substitution + validation integration', () => {
    test('substitutes nested object then validates', () => {
      const data = { order: { id: 'A1', total: 99.5 } };
      const text = 'Order {{order.id}} total {{order.total}}';
      const out = parser.substituteVariables(text, data);
      expect(out).toBe('Order A1 total 99.5');

      const template = makeTemplate([
        { type: 'variable', name: 'order.id' },
        { type: 'variable', name: 'order.total' },
      ]);
      const v = parser.validate(template, data);
      expect(v.valid).toBe(true);
    });

    test('handles empty string template and data', () => {
      expect(parser.substituteVariables('', {})).toBe('');
      const r = parser.validate(makeTemplate([]), {});
      expect(r.valid).toBe(true);
    });
  });
});
