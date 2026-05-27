/**
 * Shared barcode convenience methods for printer drivers
 * Eliminates code duplication across CpclDriver, ZplDriver, etc.
 *
 * Uses mixin pattern: methods are applied to driver instances,
 * so they don't appear in the source of individual drivers.
 */

/** Function type for the underlying barcode method */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type BarcodeFn = (content: string, options: any) => unknown;

/** Barcode convenience methods that get mixed into driver instances */
export interface BarcodeMixins {
  code128(content: string, x?: number, y?: number, height?: number): unknown;
  code39(content: string, x?: number, y?: number, height?: number): unknown;
}

/**
 * Apply barcode convenience methods to a driver instance.
 * Call this in the driver's constructor or after instantiation.
 *
 * @param target - The driver instance to augment
 * @param barcodeFn - The driver's `barcode()` method
 * @param code39Extra - Driver-specific code39 options
 *
 * @example
 * ```typescript
 * class CpclDriver {
 *   constructor() {
 *     applyBarcodeMixins(this, this.barcode.bind(this), { wide: 2, narrow: 1 });
 *   }
 * }
 * ```
 */
export function applyBarcodeMixins<T extends object>(
  target: T,
  barcodeFn: BarcodeFn,
  code39Extra: Record<string, string | number> = {}
): T & BarcodeMixins {
  const t = target as T & BarcodeMixins;

  t.code128 = function (content: string, x = 0, y = 0, height = 50) {
    return barcodeFn.call(target, content, { x, y, type: '128', height });
  };

  t.code39 = function (content: string, x = 0, y = 0, height = 50) {
    return barcodeFn.call(target, content, { x, y, type: '39', height, ...code39Extra });
  };

  return t;
}
