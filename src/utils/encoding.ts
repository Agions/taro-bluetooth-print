/**
 * Encoding Utilities
 */

export class Encoding {
  private static encoder = new TextEncoder();

  /**
   * Encode string to Uint8Array
   * Note: Native TextEncoder only supports UTF-8.
   * For GBK, we would typically need a library like 'fast-text-encoding' or 'iconv-lite'.
   * In this simplified version, we'll default to UTF-8 but allow for extension.
   */
  static encode(text: string, encoding: string = 'GBK'): Uint8Array {
    if (encoding === 'UTF-8' || encoding === 'utf-8') {
      return this.encoder.encode(text);
    }

    // TODO: Implement actual GBK encoding or integrate a polyfill.
    // For now, we fallback to UTF-8 to ensure it works, but warn.
    // In a real Taro app, you might use a pure-JS GBK implementation.
    console.warn(`Encoding ${encoding} not fully supported in simplified version, falling back to UTF-8.`);
    return this.encoder.encode(text);
  }
}
