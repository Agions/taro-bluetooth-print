/**
 * UUID Utility Tests
 *
 * Tests for UUID generation and validation functions
 * Replaces the original uuid.test.ts after refactoring (removed unused exports)
 */
import { describe, test, expect } from 'vitest';
import {
  generateUUID,
  isValidUUID,
  UUIDVersion,
} from '../src/utils/uuid';

describe('UUID Generation', () => {
  test('generates UUID v4 (random) by default', () => {
    const uuid = generateUUID();
    expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  test('generates UUID v4 with specific version', () => {
    const uuid = generateUUID(UUIDVersion.V4);
    expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  test('generates UUID v7 (Unix timestamp-based)', () => {
    const uuid = generateUUID(UUIDVersion.V7);
    expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  test('generates UUID v1 (timestamp-based)', () => {
    const uuid = generateUUID(UUIDVersion.V1);
    expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-1[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  test('generates non-hyphenated UUID', () => {
    const uuid = generateUUID(UUIDVersion.V4, { hyphenated: false });
    expect(uuid).toMatch(/^[0-9a-f]{32}$/);
    expect(uuid).not.toContain('-');
  });

  test('generates uppercase UUID', () => {
    const uuid = generateUUID(UUIDVersion.V4, { uppercase: true });
    expect(uuid).toMatch(/^[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}$/);
  });

  test('generates unique UUIDs', () => {
    const uuids = new Set<string>();
    for (let i = 0; i < 100; i++) {
      uuids.add(generateUUID());
    }
    expect(uuids.size).toBe(100);
  });
});

describe('UUID Validation', () => {
  test('validates correct UUID', () => {
    const result = isValidUUID('550e8400-e29b-41d4-a716-446655440000');
    expect(result.valid).toBe(true);
    expect(result.version).toBe(4);
  });

  test('validates UUID v7', () => {
    const uuid = generateUUID(UUIDVersion.V7);
    const result = isValidUUID(uuid);
    expect(result.valid).toBe(true);
    expect(result.version).toBe(7);
  });

  test('rejects null input', () => {
    const result = isValidUUID(null as unknown as string);
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });

  test('rejects empty string', () => {
    const result = isValidUUID('');
    expect(result.valid).toBe(false);
  });

  test('rejects invalid format', () => {
    const result = isValidUUID('550e8400-e29b-41d4-a716-44665544000g');
    expect(result.valid).toBe(false);
  });
});