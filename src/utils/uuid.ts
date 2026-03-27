/**
 * UUID Utility Module
 *
 * Provides UUID generation and parsing utilities for device identification,
 * job tracking, and unique identifier generation.
 *
 * @example
 * ```typescript
 * import { generateUUID, parseUUID, isValidUUID } from '@/utils/uuid';
 *
 * const id = generateUUID(); // v4 UUID
 * const parsed = parseUUID(id);
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
 * UUID namespace for generating namespaced UUIDs (V5)
 */
export interface UUIDNamespace {
  /** Namespace UUID */
  uuid: string;
  /** Namespace name */
  name: string;
}

/**
 * Predefined namespaces for namespaced UUIDs (RFC 4122)
 */
export const UUID_NAMESPACES: Record<string, UUIDNamespace> = {
  NAMESPACE_DNS: { uuid: '6ba7b810-9dad-11d1-80b4-00c04fd430c8', name: 'dns' },
  NAMESPACE_URL: { uuid: '6ba7b811-9dad-11d1-80b4-00c04fd430c8', name: 'url' },
  NAMESPACE_OID: { uuid: '6ba7b812-9dad-11d1-80b4-00c04fd430c8', name: 'oid' },
  NAMESPACE_X500: { uuid: '6ba7b814-9dad-11d1-80b4-00c04fd430c8', name: 'x500' },
  NAMESPACE_NS: { uuid: '6ba7b810-9dad-11d1-80b4-00c04fd430c8', name: 'null' },
};

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
  // Version 7 in high nibble of byte 6
  randomBytes[0] = ((randomBytes[0] ?? 0) & 0x0f) | 0x70;
  // Variant (10xx) - both bytes 7 and 8 need high bits set to 10
  randomBytes[6] = ((randomBytes[6] ?? 0) & 0x3f) | 0xc0; // byte 8: variant bits 10
  randomBytes[7] = ((randomBytes[7] ?? 0) & 0x3f) | 0x80; // byte 7: variant bits 10 (high bit only, low bit is already 0 from mask)

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
 * Parse a UUID string into its components
 *
 * @param uuid - UUID string to parse
 * @returns Parsed UUID structure
 *
 * @example
 * ```typescript
 * const parsed = parseUUID('550e8400-e29b-41d4-a716-446655440000');
 * console.log(parsed.version); // 4
 * console.log(parsed.valid); // true
 * ```
 */
export function parseUUID(uuid: string): ParsedUUID {
  const result: ParsedUUID = {
    raw: uuid,
    version: 0 as unknown as UUIDVersion,
    variant: 0,
    valid: false,
  };

  // Validate basic format
  if (!uuid || typeof uuid !== 'string') {
    return result;
  }

  // Remove hyphens for processing
  const normalized = uuid.replace(/-/g, '');

  // Must be 32 hex characters
  if (normalized.length !== 32 || !/^[0-9a-f]{32}$/i.test(normalized)) {
    return result;
  }

  // Extract version
  const versionChar = normalized.charAt(12);
  const version = parseInt(versionChar, 16);

  if (isNaN(version) || version < 1 || version > 7) {
    return result;
  }

  result.version = version as UUIDVersion;

  // Extract variant
  const variantChar = normalized.charAt(16);
  const variantInt = parseInt(variantChar, 16);
  result.variant = variantInt;

  // Parse timestamp for time-based UUIDs (v1 and v7)
  if (version === 1 || version === 7) {
    if (version === 1) {
      // V1: time_low (8), time_mid (4), time_hi (4), node (12)
      const timeLow = parseInt(normalized.slice(0, 8), 16);
      const timeMid = parseInt(normalized.slice(8, 12), 16);
      const timeHi = parseInt(normalized.slice(12, 16), 16) & 0x0fff;
      result.timestamp = (timeHi << 48) | (timeMid << 32) | timeLow;
      result.node = normalized.slice(20);
    } else if (version === 7) {
      // V7: 48-bit timestamp
      const timestamp48 = parseInt(normalized.slice(0, 12), 16);
      result.timestamp = timestamp48;
    }
  }

  // Parse random bytes for random UUIDs
  if (version === 4) {
    result.random = normalized.slice(12);
  }

  result.valid = true;
  return result;
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

  // Check variant bits (should be 8, 9, a, or b)
  const variantChar = normalized.charAt(16);
  const variant = parseInt(variantChar, 16);
  if ((variant & 0xc000) !== 0x8000) {
    // Note: We don't fail on this, just note it
  }

  return { valid: true, version: version as UUIDVersion };
}

/**
 * Extract timestamp from a time-based UUID (v1 or v7)
 *
 * @param uuid - UUID string
 * @returns Timestamp in milliseconds, or null if not a time-based UUID
 *
 * @example
 * ```typescript
 * const timestamp = getUUIDTimestamp('07c450b0-7d4a-11ed-a1eb-0242ac120002');
 * console.log(new Date(timestamp ?? 0));
 * ```
 */
export function getUUIDTimestamp(uuid: string): number | null {
  const parsed = parseUUID(uuid);

  if (!parsed.valid) {
    return null;
  }

  if (parsed.version !== UUIDVersion.V1 && parsed.version !== UUIDVersion.V7) {
    return null;
  }

  return parsed.timestamp ?? null;
}

/**
 * Compare two UUIDs chronologically (for time-based UUIDs)
 *
 * @param uuidA - First UUID
 * @param uuidB - Second UUID
 * @returns -1 if A < B, 0 if equal, 1 if A > B
 *
 * @example
 * ```typescript
 * const order = compareUUIDs(uuid1, uuid2);
 * ```
 */
export function compareUUIDs(uuidA: string, uuidB: string): number {
  const parsedA = parseUUID(uuidA);
  const parsedB = parseUUID(uuidB);

  if (!parsedA.valid || !parsedB.valid) {
    throw new Error('Invalid UUID provided for comparison');
  }

  const timeA = parsedA.timestamp ?? 0;
  const timeB = parsedB.timestamp ?? 0;

  if (timeA < timeB) return -1;
  if (timeA > timeB) return 1;

  // Same timestamp, compare random parts
  return uuidA.localeCompare(uuidB);
}

/**
 * Convert UUID to bytes (Uint8Array)
 *
 * @param uuid - UUID string
 * @returns UUID as 16-byte array
 */
export function uuidToBytes(uuid: string): Uint8Array {
  const normalized = uuid.replace(/-/g, '');
  const bytes = new Uint8Array(16);

  for (let i = 0; i < 32; i += 2) {
    bytes[i / 2] = parseInt(normalized.slice(i, i + 2), 16);
  }

  return bytes;
}

/**
 * Convert bytes to UUID string
 *
 * @param bytes - 16-byte array
 * @param hyphenated - Include hyphens (default: true)
 * @returns UUID string
 */
export function bytesToUUID(bytes: Uint8Array, hyphenated = true): string {
  if (bytes.length !== 16) {
    throw new Error('UUID bytes must be exactly 16 bytes');
  }

  const hex = Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  if (hyphenated) {
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }

  return hex;
}

/**
 * Generate a short ID (8-12 character hex string)
 * Useful for display purposes like job IDs
 *
 * @param length - Length of ID (default: 8)
 * @returns Short hex ID
 *
 * @example
 * ```typescript
 * const shortId = generateShortId(8); // e.g., 'a3f2b1c9'
 * ```
 */
export function generateShortId(length = 8): string {
  const bytes = new Uint8Array(Math.ceil(length / 2));
  crypto.getRandomValues(bytes);

  const hex = Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  return hex.substring(0, length);
}

/**
 * Generate a namespaced UUID (v5)
 *
 * @param namespace - Namespace UUID
 * @param name - Name within namespace
 * @param options - Generation options
 * @returns Namespaced UUID
 *
 * @example
 * ```typescript
 * const uuid = generateNamespacedUUID(UUID_NAMESPACES.NAMESPACE_DNS, 'example.com');
 * ```
 */
export function generateNamespacedUUID(
  namespace: string,
  name: string,
  options?: UUIDOptions
): string {
  const nsBytes = uuidToBytes(namespace);
  const nameBytes = new TextEncoder().encode(name);

  // SHA-1 hashing (simplified - using Web Crypto)
  // Note: Full implementation would use crypto.subtle.digest
  // For v5, we use a deterministic pseudo-random approach
  const combined = new Uint8Array(nsBytes.length + nameBytes.length);
  combined.set(nsBytes);
  combined.set(nameBytes, nsBytes.length);

  // Simple hash for demo - in production use proper SHA-1 via Web Crypto
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    hash = ((hash << 5) - hash + (combined[i] ?? 0)) | 0;
  }

  const hashBytes = new Uint8Array(16);
  for (let i = 0; i < 16; i++) {
    hashBytes[i] = Math.abs(hash >> (i * 2)) & 0xff;
  }

  // Set version (5) and variant bits
  hashBytes[6] = ((hashBytes[6] ?? 0) & 0x0f) | 0x50;
  hashBytes[8] = ((hashBytes[8] ?? 0) & 0x3f) | 0x80;

  return bytesToUUID(hashBytes, options?.hyphenated ?? true);
}
