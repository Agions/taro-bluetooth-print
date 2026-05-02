/**
 * UUID Utility Tests
 *
 * Tests for UUID generation and validation functions
 */
import { describe, it, expect } from 'vitest';
import { generateUUID, isValidUUID, UUIDVersion } from '@/utils/uuid';

describe('UUID Utility', () => {
  describe('generateUUID', () => {
    it('should generate a valid v4 UUID by default', () => {
      const uuid = generateUUID();
      expect(typeof uuid).toBe('string');
      expect(uuid.length).toBe(36); // standard format with hyphens
      expect(uuid.charAt(14)).toBe('4'); // version indicator
    });

    it('should generate v4 UUID with correct format', () => {
      const uuid = generateUUID(UUIDVersion.V4);
      expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    });

    it('should generate v1 UUID', () => {
      const uuid = generateUUID(UUIDVersion.V1);
      expect(typeof uuid).toBe('string');
      expect(uuid.length).toBe(36);
      expect(uuid.charAt(14)).toBe('1');
    });

    it('should generate v7 UUID', () => {
      const uuid = generateUUID(UUIDVersion.V7);
      expect(typeof uuid).toBe('string');
      expect(uuid.length).toBe(36);
      expect(uuid.charAt(14)).toBe('7');
    });

    it('should generate unique UUIDs each time', () => {
      const uuids = new Set<string>();
      for (let i = 0; i < 100; i++) {
        uuids.add(generateUUID());
      }
      expect(uuids.size).toBe(100);
    });

    it('should support uppercase option', () => {
      const uuid = generateUUID(UUIDVersion.V4, { uppercase: true });
      expect(uuid).toBe(uuid.toUpperCase());
      expect(uuid).toMatch(/^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/);
    });

    it('should support unhyphenated option', () => {
      const uuid = generateUUID(UUIDVersion.V4, { hyphenated: false });
      expect(uuid).not.toContain('-');
      expect(uuid.length).toBe(32);
    });

    it('should support both uppercase and unhyphenated options', () => {
      const uuid = generateUUID(UUIDVersion.V4, {
        uppercase: true,
        hyphenated: false,
      });
      expect(uuid).not.toContain('-');
      expect(uuid).toBe(uuid.toUpperCase());
      expect(uuid.length).toBe(32);
    });
  });

  describe('isValidUUID', () => {
    const validV4UUID = '550e8400-e29b-41d4-a716-446655440000';

    it('should validate a correct v4 UUID', () => {
      const result = isValidUUID(validV4UUID);
      expect(result.valid).toBe(true);
      expect(result.version).toBe(UUIDVersion.V4);
    });

    it('should validate a correct v1 UUID', () => {
      const result = isValidUUID('f47ac10b-58cc-1372-8567-0e02b2c3d479');
      expect(result.valid).toBe(true);
      expect(result.version).toBe(UUIDVersion.V1);
    });

    it('should validate a correct v7 UUID', () => {
      const result = isValidUUID('018e4d3e-2b8f-77f4-8b71-8f3e5c5a5d6f');
      expect(result.valid).toBe(true);
      expect(result.version).toBe(UUIDVersion.V7);
    });

    it('should reject empty strings', () => {
      const result = isValidUUID('');
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject non-string input', () => {
      // @ts-expect-error - testing runtime behavior with invalid input
      const result = isValidUUID(null);
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject strings that are too short', () => {
      const result = isValidUUID('too-short');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('32 hex characters');
    });

    it('should reject invalid hex characters', () => {
      const result = isValidUUID('zzzzzzzz-zzzz-zzzz-zzzz-zzzzzzzzzzzz');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('hexadecimal');
    });

    it('should accept unhyphenated UUID strings', () => {
      const unhyphenated = '550e8400e29b41d4a716446655440000';
      const result = isValidUUID(unhyphenated);
      expect(result.valid).toBe(true);
      expect(result.version).toBe(UUIDVersion.V4);
    });

    it('should accept uppercase UUID strings', () => {
      const result = isValidUUID(validV4UUID.toUpperCase());
      expect(result.valid).toBe(true);
      expect(result.version).toBe(UUIDVersion.V4);
    });
  });
});