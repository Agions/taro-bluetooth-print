/**
 * TemplateEngine Enhanced Tests
 * Tests for loop, condition, border, and table elements
 */

import { describe, test, expect } from 'vitest';
import { TemplateEngine, TemplateElement, LoopElement, ConditionElement, BorderElement, TableElement } from '../src/template/TemplateEngine';
import { BarcodeFormat } from '../src/barcode/BarcodeGenerator';

describe('TemplateEngine - Loop Element', () => {
  const engine = new TemplateEngine();

  test('renders loop element correctly', () => {
    const loopElement: LoopElement = {
      type: 'loop',
      items: 'items',
      itemVar: 'item',
      elements: [
        { type: 'text', content: '{{item}}' },
      ],
    };

    const data = {
      items: ['Apple', 'Banana', 'Cherry'],
    };

    // The loop element should be part of a template
    const template = {
      type: 'custom' as const,
      name: 'Test Loop',
      width: 48,
      elements: [loopElement],
    };

    // Just verify it doesn't throw
    expect(() => engine.render(template, data)).not.toThrow();
  });

  test('renders loop with index variable', () => {
    const loopElement: LoopElement = {
      type: 'loop',
      items: 'items',
      itemVar: 'item',
      indexVar: 'idx',
      elements: [
        { type: 'text', content: '{{idx}}: {{item}}' },
      ],
    };

    const data = {
      items: ['First', 'Second'],
    };

    const template = {
      type: 'custom' as const,
      name: 'Test Loop with Index',
      width: 48,
      elements: [loopElement],
    };

    expect(() => engine.render(template, data)).not.toThrow();
  });

  test('renders loop with separator', () => {
    const loopElement: LoopElement = {
      type: 'loop',
      items: 'items',
      itemVar: 'item',
      separator: '---',
      elements: [
        { type: 'text', content: '{{item}}' },
      ],
    };

    const data = {
      items: ['A', 'B', 'C'],
    };

    const template = {
      type: 'custom' as const,
      name: 'Test Loop with Separator',
      width: 48,
      elements: [loopElement],
    };

    expect(() => engine.render(template, data)).not.toThrow();
  });

  test('handles non-array items gracefully', () => {
    const loopElement: LoopElement = {
      type: 'loop',
      items: 'items',
      itemVar: 'item',
      elements: [
        { type: 'text', content: '{{item}}' },
      ],
    };

    const data = {
      items: 'not-an-array',
    };

    const template = {
      type: 'custom' as const,
      name: 'Test Non-array',
      width: 48,
      elements: [loopElement],
    };

    // Should not throw, just render nothing
    expect(() => engine.render(template, data)).not.toThrow();
  });
});

describe('TemplateEngine - Condition Element', () => {
  const engine = new TemplateEngine();

  test('renders condition with exists operator', () => {
    const conditionElement: ConditionElement = {
      type: 'condition',
      variable: 'showDiscount',
      operator: 'exists',
      then: [{ type: 'text', content: 'Discount Applied!' }],
    };

    const data = {
      showDiscount: true,
    };

    const template = {
      type: 'custom' as const,
      name: 'Test Condition Exists',
      width: 48,
      elements: [conditionElement],
    };

    expect(() => engine.render(template, data)).not.toThrow();
  });

  test('renders condition with not_exists operator', () => {
    const conditionElement: ConditionElement = {
      type: 'condition',
      variable: 'missingField',
      operator: 'not_exists',
      then: [{ type: 'text', content: 'Field is missing' }],
    };

    const data = {};

    const template = {
      type: 'custom' as const,
      name: 'Test Condition Not Exists',
      width: 48,
      elements: [conditionElement],
    };

    expect(() => engine.render(template, data)).not.toThrow();
  });

  test('renders condition with equals operator', () => {
    const conditionElement: ConditionElement = {
      type: 'condition',
      variable: 'status',
      operator: 'equals',
      value: 'active',
      then: [{ type: 'text', content: 'Status is active' }],
    };

    const data = { status: 'active' };

    const template = {
      type: 'custom' as const,
      name: 'Test Equals',
      width: 48,
      elements: [conditionElement],
    };

    expect(() => engine.render(template, data)).not.toThrow();
  });

  test('renders condition with truthy operator', () => {
    const conditionElement: ConditionElement = {
      type: 'condition',
      variable: 'flag',
      operator: 'truthy',
      then: [{ type: 'text', content: 'Flag is truthy' }],
    };

    const data = { flag: 'yes' };

    const template = {
      type: 'custom' as const,
      name: 'Test Truthy',
      width: 48,
      elements: [conditionElement],
    };

    expect(() => engine.render(template, data)).not.toThrow();
  });

  test('renders condition with else branch', () => {
    const conditionElement: ConditionElement = {
      type: 'condition',
      variable: 'count',
      operator: 'gt',
      value: 5,
      then: [{ type: 'text', content: 'More than 5' }],
      else: [{ type: 'text', content: '5 or less' }],
    };

    const data = { count: 3 };

    const template = {
      type: 'custom' as const,
      name: 'Test With Else',
      width: 48,
      elements: [conditionElement],
    };

    expect(() => engine.render(template, data)).not.toThrow();
  });

  test('renders condition with gt operator', () => {
    const conditionElement: ConditionElement = {
      type: 'condition',
      variable: 'value',
      operator: 'gt',
      value: 100,
      then: [{ type: 'text', content: 'Greater than 100' }],
    };

    const data = { value: 150 };

    const template = {
      type: 'custom' as const,
      name: 'Test GT',
      width: 48,
      elements: [conditionElement],
    };

    expect(() => engine.render(template, data)).not.toThrow();
  });

  test('renders condition with lte operator', () => {
    const conditionElement: ConditionElement = {
      type: 'condition',
      variable: 'value',
      operator: 'lte',
      value: 10,
      then: [{ type: 'text', content: 'Less than or equal to 10' }],
    };

    const data = { value: 10 };

    const template = {
      type: 'custom' as const,
      name: 'Test LTE',
      width: 48,
      elements: [conditionElement],
    };

    expect(() => engine.render(template, data)).not.toThrow();
  });
});

describe('TemplateEngine - Border Element', () => {
  const engine = new TemplateEngine();

  test('renders border element with single style', () => {
    const borderElement: BorderElement = {
      type: 'border',
      style: 'single',
    };

    const template = {
      type: 'custom' as const,
      name: 'Test Border Single',
      width: 48,
      elements: [borderElement],
    };

    expect(() => engine.render(template, {})).not.toThrow();
  });

  test('renders border element with double style', () => {
    const borderElement: BorderElement = {
      type: 'border',
      style: 'double',
    };

    const template = {
      type: 'custom' as const,
      name: 'Test Border Double',
      width: 48,
      elements: [borderElement],
    };

    expect(() => engine.render(template, {})).not.toThrow();
  });

  test('renders border element with thick style', () => {
    const borderElement: BorderElement = {
      type: 'border',
      style: 'thick',
    };

    const template = {
      type: 'custom' as const,
      name: 'Test Border Thick',
      width: 48,
      elements: [borderElement],
    };

    expect(() => engine.render(template, {})).not.toThrow();
  });

  test('renders border element with custom characters', () => {
    const borderElement: BorderElement = {
      type: 'border',
      style: 'single',
      topLeft: '#',
      topRight: '#',
      bottomLeft: '#',
      bottomRight: '#',
      top: '=',
      bottom: '=',
      left: ':',
      right: ':',
    };

    const template = {
      type: 'custom' as const,
      name: 'Test Border Custom Chars',
      width: 48,
      elements: [borderElement],
    };

    expect(() => engine.render(template, {})).not.toThrow();
  });

  test('renders border element with padding', () => {
    const borderElement: BorderElement = {
      type: 'border',
      style: 'single',
      filled: true,
      padding: 1,
    };

    const template = {
      type: 'custom' as const,
      name: 'Test Border Padding',
      width: 48,
      elements: [borderElement],
    };

    expect(() => engine.render(template, {})).not.toThrow();
  });

  test('renders border element without top border', () => {
    const borderElement: BorderElement = {
      type: 'border',
      style: 'single',
      drawTop: false,
    };

    const template = {
      type: 'custom' as const,
      name: 'Test Border No Top',
      width: 48,
      elements: [borderElement],
    };

    expect(() => engine.render(template, {})).not.toThrow();
  });

  test('renders border element without bottom border', () => {
    const borderElement: BorderElement = {
      type: 'border',
      style: 'single',
      drawBottom: false,
    };

    const template = {
      type: 'custom' as const,
      name: 'Test Border No Bottom',
      width: 48,
      elements: [borderElement],
    };

    expect(() => engine.render(template, {})).not.toThrow();
  });
});

describe('TemplateEngine - Table Element', () => {
  const engine = new TemplateEngine();

  test('renders table element correctly', () => {
    const tableElement: TableElement = {
      type: 'table',
      columns: [
        { header: 'Name', width: 15 },
        { header: 'Qty', width: 5 },
        { header: 'Price', width: 10 },
      ],
      rowsVar: 'items',
      showHeader: true,
      borderStyle: 'single',
    };

    const data = {
      items: [
        { Name: 'Apple', Qty: 5, Price: 2.50 },
        { Name: 'Banana', Qty: 3, Price: 1.25 },
      ],
    };

    const template = {
      type: 'custom' as const,
      name: 'Test Table',
      width: 48,
      elements: [tableElement],
    };

    expect(() => engine.render(template, data)).not.toThrow();
  });

  test('renders table without header', () => {
    const tableElement: TableElement = {
      type: 'table',
      columns: [
        { header: 'Col1', width: 10 },
        { header: 'Col2', width: 10 },
      ],
      rowsVar: 'rows',
      showHeader: false,
    };

    const data = {
      rows: [{ Col1: 'A', Col2: 'B' }],
    };

    const template = {
      type: 'custom' as const,
      name: 'Test Table No Header',
      width: 48,
      elements: [tableElement],
    };

    expect(() => engine.render(template, data)).not.toThrow();
  });

  test('handles empty table data', () => {
    const tableElement: TableElement = {
      type: 'table',
      columns: [
        { header: 'Item', width: 20 },
      ],
      rowsVar: 'items',
    };

    const data = {
      items: [],
    };

    const template = {
      type: 'custom' as const,
      name: 'Test Empty Table',
      width: 48,
      elements: [tableElement],
    };

    expect(() => engine.render(template, data)).not.toThrow();
  });

  test('handles non-array table data', () => {
    const tableElement: TableElement = {
      type: 'table',
      columns: [
        { header: 'Item', width: 20 },
      ],
      rowsVar: 'items',
    };

    const data = {
      items: 'not-an-array',
    };

    const template = {
      type: 'custom' as const,
      name: 'Test Non-array Table',
      width: 48,
      elements: [tableElement],
    };

    expect(() => engine.render(template, data)).not.toThrow();
  });
});

describe('TemplateEngine - Validation', () => {
  const engine = new TemplateEngine();

  test('validates template with required variable', () => {
    const template = {
      type: 'custom' as const,
      name: 'Test Validation',
      width: 48,
      elements: [
        { type: 'variable', name: 'requiredField' },
      ],
    };

    const result = engine.validate(template, { requiredField: 'value' });
    expect(result.valid).toBe(true);

    const result2 = engine.validate(template, {});
    expect(result2.valid).toBe(false);
    expect(result2.errors[0]?.code).toBe('MISSING_VARIABLE');
  });

  test('validates loop variable must be array', () => {
    const loopElement: LoopElement = {
      type: 'loop',
      items: 'items',
      itemVar: 'item',
      elements: [],
    };

    const template = {
      type: 'custom' as const,
      name: 'Test Loop Validation',
      width: 48,
      elements: [loopElement],
    };

    const result = engine.validate(template, { items: [1, 2, 3] });
    expect(result.valid).toBe(true);

    const result2 = engine.validate(template, { items: 'not-array' });
    expect(result2.valid).toBe(false);
    expect(result2.errors[0]?.code).toBe('INVALID_LOOP_VARIABLE');
  });
});
