/**
 * Image Processing Utilities
 *
 * Provides methods for converting images to printer-compatible formats.
 * Currently supports converting RGBA images to monochrome bitmaps using Floyd-Steinberg dithering.
 */

export class ImageProcessing {
  /**
   * Convert RGBA data to monochrome bitmap (1 bit per pixel)
   * suitable for ESC/POS GS v 0 command.
   * Uses Floyd-Steinberg dithering for better quality.
   *
   * @param data - RGBA pixel data as Uint8Array
   * @param width - Image width in pixels
   * @param height - Image height in pixels
   * @returns Monochrome bitmap data as Uint8Array
   *
   * @example
   * ```typescript
   * const imageData = new Uint8Array(width * height * 4); // RGBA
   * const bitmap = ImageProcessing.toBitmap(imageData, width, height);
   * ```
   */
  static toBitmap(data: Uint8Array, width: number, height: number): Uint8Array {
    // 参数验证
    if (!data || !(data instanceof Uint8Array) || width <= 0 || height <= 0) {
      return new Uint8Array(0);
    }

    if (data.length !== width * height * 4) {
      throw new Error(
        `Invalid image data length: expected ${width * height * 4}, got ${data.length}`
      );
    }

    const bytesPerLine = Math.ceil(width / 8);
    const bitmap = new Uint8Array(bytesPerLine * height);

    // 先将图像转换为灰度数组，提高后续计算效率
    const grayscale = new Float32Array(width * height);
    for (let i = 0; i < data.length; i += 4) {
      const index = i / 4;
      const r = data[i] || 0;
      const g = data[i + 1] || 0;
      const b = data[i + 2] || 0;
      grayscale[index] = 0.299 * r + 0.587 * g + 0.114 * b;
    }

    // Floyd-Steinberg dithering
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const index = y * width + x;
        const oldPixel = grayscale[index] || 0;
        const newPixel = oldPixel < 128 ? 0 : 255;

        // 设置位图像素 (ESC/POS: 1 = 黑色, 0 = 白色)
        if (newPixel === 0) {
          const byteIndex = y * bytesPerLine + Math.floor(x / 8);
          const bitIndex = 7 - (x % 8);
          bitmap[byteIndex] = (bitmap[byteIndex] || 0) | (1 << bitIndex);
        }

        const quantError = oldPixel - newPixel;

        // 错误扩散到相邻像素
        this.distributeError(grayscale, width, height, x, y, quantError);
      }
    }

    return bitmap;
  }

  /**
   * Distribute quantization error to neighboring pixels using Floyd-Steinberg algorithm
   *
   * @param grayscale - Grayscale image data
   * @param width - Image width
   * @param height - Image height
   * @param x - Current x position
   * @param y - Current y position
   * @param error - Quantization error to distribute
   */
  private static distributeError(
    grayscale: Float32Array,
    width: number,
    height: number,
    x: number,
    y: number,
    error: number
  ): void {
    // Floyd-Steinberg error diffusion matrix:
    // [  0   7/16 ]
    // [ 3/16 5/16 1/16 ]

    const distribute = (dx: number, dy: number, factor: number) => {
      const nx = x + dx;
      const ny = y + dy;
      if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
        const index = ny * width + nx;
        grayscale[index] = Math.max(0, Math.min(255, (grayscale[index] || 0) + error * factor));
      }
    };

    distribute(1, 0, 7 / 16); // 右侧像素
    distribute(-1, 1, 3 / 16); // 左下像素
    distribute(0, 1, 5 / 16); // 下方像素
    distribute(1, 1, 1 / 16); // 右下像素
  }
}
