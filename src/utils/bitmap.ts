/**
 * Bitmap utility functions for thermal printer drivers.
 *
 * Shared helpers used by CPCL, ZPL, and other printer language drivers
 * for bitmap/hex conversion operations.
 */

/**
 * Convert a 1-bit monochrome bitmap to an uppercase hex string.
 *
 * Each byte of the bitmap is converted to a two-character hex representation.
 * Only processes up to `byteCount` bytes (or the full bitmap if smaller).
 *
 * @param bitmap - 1-bit monochrome bitmap data (MSB first, row-major)
 * @param byteCount - Number of bytes to convert (defaults to bitmap.length)
 * @returns Uppercase hex string (e.g. "FF00AB")
 */
export function bitmapToHex(bitmap: Uint8Array, byteCount?: number): string {
  const limit = Math.min(bitmap.length, byteCount ?? bitmap.length);
  const hexData: string[] = [];
  for (let i = 0; i < limit; i++) {
    hexData.push(bitmap[i]!.toString(16).padStart(2, '0').toUpperCase());
  }
  return hexData.join('');
}
