/**
 * UUID Utility Module
 *
 * Provides UUID generation and parsing utilities for device identification,
 * job tracking, and unique identifier generation.
 *
 * @example
 * ```typescript
 * import { generateUUID, isValidUUID } from '@/utils/uuid';
 *
 * const id = generateUUID(); // v4 UUID
 * const valid = isValidUUID(id);
 * ```
 */

/**
 * UUID version numbers
 */
export enum UUIDVersion {
  /** Version 1: Timestamp-based */
  V1 = 1,
  /** Version 4: Random */
  V4 = 4,
  /** Version 7: Unix Epoch time-based (recommended) */
  V7 = 7,
}

/**
 * Parsed UUID structure
 */
export interface ParsedUUID {
  /** Raw UUID string */
  raw: string;
  /** UUID version */
  version: UUIDVersion;
  /** Variant bits */
  variant: number;
  /** Time component (for V1, V7) in milliseconds since epoch */
  timestamp?: number;
  /** Node identifier bytes (for V1) */
  node?: string;
  /** Random bytes (for V4) */
  random?: string;
  /** Whether the UUID is valid */
  valid: boolean;
}

/**
 * UUID format options
 */
export interface UUIDOptions {
  /** Uppercase hex output */
  uppercase?: boolean;
  /** Include hyphens (default: true) */
  hyphenated?: boolean;
  /** UUID version to generate (default: V4) */
  version?: UUIDVersion;
}

/**
 * UUID validation result
 */
export interface UUIDValidationResult {
  /** Whether the UUID is valid */
  valid: boolean;
  /** Version of the UUID if valid */
  version?: UUIDVersion;
  /** Error message if invalid */
  error?: string;
}

/**
 * Generate a random UUID
 *
 * @param version - UUID version to generate (default: V4)
 * @param options - Generation options
 * @returns Generated UUID string
 *
 * @example
 * ```typescript
 * const uuid = generateUUID();
 * const uuidV7 = generateUUID(UUIDVersion.V7, { uppercase: true });
 * ```
 */
export function generateUUID(version: UUIDVersion = UUIDVersion.V4, options?: UUIDOptions): string {
  const hyphenated = options?.hyphenated ?? true;
  const uppercase = options?.uppercase ?? false;

  let uuid: string;

  switch (version) {
    case UUIDVersion.V1:
      uuid = generateUUIDv1();
      break;
    case UUIDVersion.V7:
      uuid = generateUUIDv7();
      break;
    case UUIDVersion.V4:
    default:
      uuid = generateUUIDv4();
      break;
  }

  if (!hyphenated) {
    uuid = uuid.replace(/-/g, '');
  }

  if (uppercase) {
    uuid = uuid.toUpperCase();
  }

  return uuid;
}

/**
 * Generate UUID v4 (random)
 */
function generateUUIDv4(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);

  // Set version (4) and variant bits
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40;
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;

  return formatUUIDBytes(bytes);
}

/**
 * Generate UUID v1 (timestamp-based)
 */
function generateUUIDv1(): string {
  // Get current timestamp
  const timestamp = Date.now();
  const timeLow = timestamp & 0xffffffff;
  const timeMid = (timestamp >> 32) & 0xffff;
  const timeHi = (timestamp >> 48) & 0x0fff;

  // Get node identifier (MAC address or random)
  const nodeBytes = new Uint8Array(6);
  crypto.getRandomValues(nodeBytes);
  // Set multicast bit to indicate pseudo-MAC
  nodeBytes[0] = (nodeBytes[0] ?? 0) | 0x01;

  // Clock sequence
  const clockSeq = Math.floor(Math.random() * 0x3fff);

  const bytes = new Uint8Array(16);
  // time_low (4 bytes)
  bytes[0] = (timeLow >> 24) & 0xff;
  bytes[1] = (timeLow >> 16) & 0xff;
  bytes[2] = (timeLow >> 8) & 0xff;
  bytes[3] = timeLow & 0xff;
  // time_mid (2 bytes)
  bytes[4] = (timeMid >> 8) & 0xff;
  bytes[5] = timeMid & 0xff;
  // time_hi_and_version (2 bytes)
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x10; // version 1
  bytes[7] = timeHi & 0xff;
  // clock_seq_hi_and_reserved (1 byte)
  bytes[8] = ((clockSeq >> 8) & 0x3f) | 0x80;
  // clock_seq_low (1 byte)
  bytes[9] = clockSeq & 0xff;
  // node (6 bytes)
  bytes.set(nodeBytes, 10);

  return formatUUIDBytes(bytes);
}

/**
 * Generate UUID v7 (Unix Epoch time-based, recommended)
 *
 * UUID v7 combines Unix timestamp with random data for better database performance.
 * It provides time-ordered UUIDs which are beneficial for indexing.
 */
function generateUUIDv7(): string {
  const timestamp = Date.now();
  const randomBytes = new Uint8Array(10);
  crypto.getRandomValues(randomBytes);

  const bytes = new Uint8Array(16);

  // 48-bit Unix timestamp (milliseconds)
  const timestamp48 = timestamp & 0xffffffffffff;
  bytes[0] = (timestamp48 >> 40) & 0xff;
  bytes[1] = (timestamp48 >> 32) & 0xff;
  bytes[2] = (timestamp48 >> 24) & 0xff;
  bytes[3] = (timestamp48 >> 16) & 0xff;
  bytes[4] = (timestamp48 >> 8) & 0xff;
  bytes[5] = timestamp48 & 0xff;

  // Version and variant bits for random part
  // Version 7 in high nibble of byte 6 (randomBytes[0] after copy)
  randomBytes[0] = ((randomBytes[0] ?? 0) & 0x0f) | 0x70;
  // Variant (10xx) in high nibble of byte 8 (randomBytes[2] after copy)
  randomBytes[2] = ((randomBytes[2] ?? 0) & 0x3f) | 0x80;

  // Copy random bytes
  bytes.set(randomBytes.slice(0, 6), 6);
  bytes.set(randomBytes.slice(6), 12);

  return formatUUIDBytes(bytes);
}

/**
 * Format bytes into UUID string
 */
function formatUUIDBytes(bytes: Uint8Array): string {
  const hex = Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/**
 * Validate a UUID string
 *
 * @param uuid - UUID string to validate
 * @returns Validation result
 *
 * @example
 * ```typescript
 * const result = isValidUUID('550e8400-e29b-41d4-a716-446655440000');
 * if (result.valid) {
 *   console.log(`Valid UUID v${result.version}`);
 * }
 * ```
 */
export function isValidUUID(uuid: string): UUIDValidationResult {
  if (!uuid || typeof uuid !== 'string') {
    return { valid: false, error: 'UUID must be a non-empty string' };
  }

  const normalized = uuid.replace(/-/g, '');

  if (normalized.length !== 32) {
    return { valid: false, error: `UUID must be 32 hex characters (got ${normalized.length})` };
  }

  if (!/^[0-9a-f]{32}$/i.test(normalized)) {
    return { valid: false, error: 'UUID must contain only hexadecimal characters' };
  }

  const versionChar = normalized.charAt(12);
  const version = parseInt(versionChar, 16);

  if (isNaN(version) || version < 1 || version > 7) {
    return { valid: false, error: `Invalid UUID version: ${version}` };
  }

  return { valid: true, version: version as UUIDVersion };
}
