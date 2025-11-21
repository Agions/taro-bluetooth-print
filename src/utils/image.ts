/**
 * Image Processing Utilities
 */

export class ImageProcessing {
  /**
   * Convert RGBA data to monochrome bitmap (1 bit per pixel)
   * suitable for ESC/POS GS v 0 command.
   */
  static toBitmap(data: Uint8Array, width: number, height: number): Uint8Array {
    const threshold = 128;
    // Calculate bytes per line (width / 8, rounded up)
    const bytesPerLine = Math.ceil(width / 8);
    const bitmap = new Uint8Array(bytesPerLine * height);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const offset = (y * width + x) * 4;
        const r = data[offset];
        const g = data[offset + 1];
        const b = data[offset + 2];
        // Luminance formula
        const gray = 0.299 * r + 0.587 * g + 0.114 * b;

        if (gray < threshold) {
          // Black pixel: set the corresponding bit
          const byteIndex = y * bytesPerLine + Math.floor(x / 8);
          const bitIndex = 7 - (x % 8);
          bitmap[byteIndex] |= (1 << bitIndex);
        }
      }
    }

    return bitmap;
  }
}
