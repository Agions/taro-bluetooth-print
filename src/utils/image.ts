/**
 * Image Processing Utilities
 */

export class ImageProcessing {
  /**
   * Convert RGBA data to monochrome bitmap (1 bit per pixel)
   * suitable for ESC/POS GS v 0 command.
   * Uses Floyd-Steinberg dithering for better quality.
   */
  static toBitmap(data: Uint8Array, width: number, height: number): Uint8Array {
    // Clone data to avoid modifying original
    const pixels = new Uint8Array(data);
    const bytesPerLine = Math.ceil(width / 8);
    const bitmap = new Uint8Array(bytesPerLine * height);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const offset = (y * width + x) * 4;
        const oldPixel = Math.round(
          0.299 * pixels[offset]! + 0.587 * pixels[offset + 1]! + 0.114 * pixels[offset + 2]!
        );
        const newPixel = oldPixel < 128 ? 0 : 255;

        // Set pixel in bitmap (0 = white, 1 = black in standard, but ESC/POS usually 1=black)
        // Actually standard ESC/POS GS v 0: 1 = black, 0 = white.
        // If newPixel is 0 (black), we set the bit.
        if (newPixel === 0) {
          const byteIndex = y * bytesPerLine + Math.floor(x / 8);
          const bitIndex = 7 - (x % 8);
          bitmap[byteIndex]! |= 1 << bitIndex;
        }

        const quantError = oldPixel - newPixel;

        // Distribute error to neighbors
        if (x + 1 < width) {
          ImageProcessing.addError(pixels, width, x + 1, y, (quantError * 7) / 16);
        }
        if (x - 1 >= 0 && y + 1 < height) {
          ImageProcessing.addError(pixels, width, x - 1, y + 1, (quantError * 3) / 16);
        }
        if (y + 1 < height) {
          ImageProcessing.addError(pixels, width, x, y + 1, (quantError * 5) / 16);
        }
        if (x + 1 < width && y + 1 < height) {
          ImageProcessing.addError(pixels, width, x + 1, y + 1, (quantError * 1) / 16);
        }
      }
    }

    return bitmap;
  }

  private static addError(pixels: Uint8Array, width: number, x: number, y: number, error: number) {
    const offset = (y * width + x) * 4;
    // We only care about RGB for grayscale calc, but let's adjust all channels roughly or just rely on the fact
    // we re-calculate grayscale next time we visit this pixel.
    // To be accurate, we should store grayscale values in a separate array, but modifying RGB works "okay" for simple implementation.
    // Better: convert to grayscale array first.
    // For this implementation, let's just clamp and add to R, G, B to affect the next grayscale calc.

    const add = (idx: number) => {
      const val = pixels[idx]! + error;
      pixels[idx] = Math.max(0, Math.min(255, val));
    };

    add(offset);
    add(offset + 1);
    add(offset + 2);
  }
}
