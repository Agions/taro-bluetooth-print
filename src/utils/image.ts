/**
 * Image Processing Utilities
 *
 * Provides methods for converting images to printer-compatible formats.
 * Currently supports converting RGBA images to monochrome bitmaps using various dithering algorithms.
 */

export class ImageProcessing {
  /**
   * Convert RGBA data to monochrome bitmap (1 bit per pixel)
   * suitable for ESC/POS GS v 0 command.
   * Uses Floyd-Steinberg dithering for better quality by default.
   *
   * @param data - RGBA pixel data as Uint8Array
   * @param width - Image width in pixels
   * @param height - Image height in pixels
   * @param options - Additional options for image processing
   * @returns Monochrome bitmap data as Uint8Array
   *
   * @example
   * ```typescript
   * const imageData = new Uint8Array(width * height * 4); // RGBA
   * const bitmap = ImageProcessing.toBitmap(imageData, width, height, {
   *   targetWidth: 384,
   *   ditheringAlgorithm: 'atkinson',
   *   contrast: 1.2,
   *   brightness: 0.1
   * });
   * ```
   */
  static toBitmap(
    data: Uint8Array,
    width: number,
    height: number,
    options?: {
      /** Target width for scaling (optional) */
      targetWidth?: number;
      /** Target height for scaling (optional) */
      targetHeight?: number;
      /** Whether to use dithering (default: true) */
      useDithering?: boolean;
      /** Dithering algorithm to use: 'floyd-steinberg' | 'atkinson' (default: 'floyd-steinberg') */
      ditheringAlgorithm?: 'floyd-steinberg' | 'atkinson';
      /** Scaling algorithm to use: 'nearest' for nearest neighbor, 'bilinear' for bilinear interpolation (default: 'nearest') */
      scalingAlgorithm?: 'nearest' | 'bilinear';
      /** Contrast adjustment factor (1.0 = no adjustment) */
      contrast?: number;
      /** Brightness adjustment factor (0.0 = no adjustment, negative = darker, positive = brighter) */
      brightness?: number;
      /** Threshold value for binarization (0-255, default: 128) */
      threshold?: number;
    }
  ): Uint8Array {
    // 参数验证
    if (!data || !(data instanceof Uint8Array) || width <= 0 || height <= 0) {
      return new Uint8Array(0);
    }

    if (data.length !== width * height * 4) {
      throw new Error(
        `Invalid image data length: expected ${width * height * 4}, got ${data.length}`
      );
    }

    const {
      targetWidth,
      targetHeight,
      useDithering = true,
      ditheringAlgorithm = 'floyd-steinberg',
      scalingAlgorithm = 'nearest',
      contrast = 1.0,
      brightness = 0.0,
      threshold = 128,
    } = options || {};

    // Scale image if target dimensions provided
    let processedData = data;
    let processedWidth = width;
    let processedHeight = height;

    if (targetWidth || targetHeight) {
      const { newData, newWidth, newHeight } = this.scaleImage(
        data,
        width,
        height,
        targetWidth || width,
        targetHeight || height,
        { algorithm: scalingAlgorithm }
      );
      processedData = newData;
      processedWidth = newWidth;
      processedHeight = newHeight;
    }

    const bytesPerLine = Math.ceil(processedWidth / 8);
    const bitmap = new Uint8Array(bytesPerLine * processedHeight);

    // 先将图像转换为灰度数组，提高后续计算效率
    let grayscale = this.toGrayscale(processedData, processedWidth, processedHeight);

    // 应用对比度和亮度调整
    grayscale = this.adjustContrastBrightness(grayscale, contrast, brightness);

    if (useDithering) {
      // 使用指定的抖动算法
      this.applyDithering(
        grayscale,
        processedWidth,
        processedHeight,
        bitmap,
        bytesPerLine,
        ditheringAlgorithm,
        threshold
      );
    } else {
      // 直接二值化，不使用抖动
      this.applyThreshold(
        grayscale,
        processedWidth,
        processedHeight,
        bitmap,
        bytesPerLine,
        threshold
      );
    }

    return bitmap;
  }

  /**
   * Convert RGBA data to grayscale using optimized formula
   *
   * @param data - RGBA pixel data as Uint8Array
   * @param width - Image width in pixels
   * @param height - Image height in pixels
   * @returns Grayscale image data as Float32Array
   */
  private static toGrayscale(data: Uint8Array, width: number, height: number): Float32Array {
    const grayscale = new Float32Array(width * height);

    // 使用优化的灰度转换公式，提高计算效率
    for (let i = 0; i < data.length; i += 4) {
      const index = i >> 2; // 等同于 i / 4，使用位运算提高性能
      const r = data[i] || 0;
      const g = data[i + 1] || 0;
      const b = data[i + 2] || 0;

      // 优化的灰度转换公式：使用整数运算近似，提高性能
      grayscale[index] = (r * 299 + g * 587 + b * 114) / 1000;
    }

    return grayscale;
  }

  /**
   * Adjust contrast and brightness of grayscale image
   *
   * @param grayscale - Grayscale image data
   * @param contrast - Contrast adjustment factor (1.0 = no adjustment)
   * @param brightness - Brightness adjustment factor (0.0 = no adjustment)
   * @returns Adjusted grayscale image data
   */
  private static adjustContrastBrightness(
    grayscale: Float32Array,
    contrast: number,
    brightness: number
  ): Float32Array {
    // 如果没有调整需求，直接返回原数据
    if (contrast === 1.0 && brightness === 0.0) {
      return grayscale;
    }

    const adjusted = new Float32Array(grayscale);

    // 对比度调整公式：output = (input - 128) * contrast + 128 + brightness * 255
    for (let i = 0; i < adjusted.length; i++) {
      const value = adjusted[i] || 0;
      adjusted[i] = Math.max(0, Math.min(255, (value - 128) * contrast + 128 + brightness * 255));
    }

    return adjusted;
  }

  /**
   * Apply dithering to grayscale image using specified algorithm
   *
   * @param grayscale - Grayscale image data
   * @param width - Image width
   * @param height - Image height
   * @param bitmap - Output bitmap buffer
   * @param bytesPerLine - Number of bytes per line in the bitmap
   * @param algorithm - Dithering algorithm to use
   * @param threshold - Threshold value for binarization
   */
  private static applyDithering(
    grayscale: Float32Array,
    width: number,
    height: number,
    bitmap: Uint8Array,
    bytesPerLine: number,
    algorithm: 'floyd-steinberg' | 'atkinson',
    threshold: number
  ): void {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const index = y * width + x;
        const oldPixel = grayscale[index] || 0;
        const newPixel = oldPixel < threshold ? 0 : 255;

        // 设置位图像素 (ESC/POS: 1 = 黑色, 0 = 白色)
        if (newPixel === 0) {
          const byteIndex = y * bytesPerLine + Math.floor(x / 8);
          const bitIndex = 7 - (x % 8);
          bitmap[byteIndex] = (bitmap[byteIndex] || 0) | (1 << bitIndex);
        }

        const quantError = oldPixel - newPixel;

        // 根据算法分发错误
        if (algorithm === 'floyd-steinberg') {
          this.distributeErrorFloydSteinberg(grayscale, width, height, x, y, quantError);
        } else if (algorithm === 'atkinson') {
          this.distributeErrorAtkinson(grayscale, width, height, x, y, quantError);
        }
      }
    }
  }

  /**
   * Apply simple thresholding to grayscale image with adjustable threshold
   *
   * @param grayscale - Grayscale image data
   * @param width - Image width
   * @param height - Image height
   * @param bitmap - Output bitmap buffer
   * @param bytesPerLine - Number of bytes per line in the bitmap
   * @param threshold - Threshold value for binarization (0-255)
   */
  private static applyThreshold(
    grayscale: Float32Array,
    width: number,
    height: number,
    bitmap: Uint8Array,
    bytesPerLine: number,
    threshold: number
  ): void {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const index = y * width + x;
        const pixel = grayscale[index] || 0;

        // 设置位图像素 (ESC/POS: 1 = 黑色, 0 = 白色)
        if (pixel < threshold) {
          const byteIndex = y * bytesPerLine + Math.floor(x / 8);
          const bitIndex = 7 - (x % 8);
          bitmap[byteIndex] = (bitmap[byteIndex] || 0) | (1 << bitIndex);
        }
      }
    }
  }

  /**
   * Scale an image to new dimensions
   *
   * @param data - RGBA pixel data as Uint8Array
   * @param width - Original image width in pixels
   * @param height - Original image height in pixels
   * @param targetWidth - Target width in pixels
   * @param targetHeight - Target height in pixels
   * @param options - Additional scaling options
   * @returns Scaled image data and dimensions
   */
  private static scaleImage(
    data: Uint8Array,
    width: number,
    height: number,
    targetWidth: number,
    targetHeight: number,
    options?: {
      /** Scaling algorithm to use: 'nearest' for nearest neighbor, 'bilinear' for bilinear interpolation */
      algorithm?: 'nearest' | 'bilinear';
    }
  ): { newData: Uint8Array; newWidth: number; newHeight: number } {
    // Calculate aspect ratio
    const aspectRatio = width / height;

    // Adjust target dimensions to maintain aspect ratio
    let newWidth = targetWidth;
    let newHeight = targetHeight;

    if (newWidth / newHeight > aspectRatio) {
      newWidth = Math.round(newHeight * aspectRatio);
    } else {
      newHeight = Math.round(newWidth / aspectRatio);
    }

    const newData = new Uint8Array(newWidth * newHeight * 4);

    const { algorithm = 'nearest' } = options || {};

    if (algorithm === 'bilinear') {
      // Use bilinear interpolation for better quality
      this.applyBilinearInterpolation(data, width, height, newData, newWidth, newHeight);
    } else {
      // Use nearest neighbor scaling for faster performance
      this.applyNearestNeighbor(data, width, height, newData, newWidth, newHeight);
    }

    return { newData, newWidth, newHeight };
  }

  /**
   * Apply nearest neighbor scaling to an image
   *
   * @param srcData - Source RGBA pixel data
   * @param srcWidth - Source image width
   * @param srcHeight - Source image height
   * @param destData - Destination RGBA pixel data
   * @param destWidth - Destination image width
   * @param destHeight - Destination image height
   */
  private static applyNearestNeighbor(
    srcData: Uint8Array,
    srcWidth: number,
    srcHeight: number,
    destData: Uint8Array,
    destWidth: number,
    destHeight: number
  ): void {
    const scaleX = srcWidth / destWidth;
    const scaleY = srcHeight / destHeight;

    for (let y = 0; y < destHeight; y++) {
      for (let x = 0; x < destWidth; x++) {
        const srcX = Math.round(x * scaleX);
        const srcY = Math.round(y * scaleY);

        const srcIndex = (srcY * srcWidth + srcX) * 4;
        const destIndex = (y * destWidth + x) * 4;

        // Copy RGBA channels, default to 0 if undefined
        destData[destIndex] = srcData[srcIndex] || 0; // R
        destData[destIndex + 1] = srcData[srcIndex + 1] || 0; // G
        destData[destIndex + 2] = srcData[srcIndex + 2] || 0; // B
        destData[destIndex + 3] = srcData[srcIndex + 3] || 255; // A (default to fully opaque)
      }
    }
  }

  /**
   * Apply bilinear interpolation scaling to an image
   *
   * @param srcData - Source RGBA pixel data
   * @param srcWidth - Source image width
   * @param srcHeight - Source image height
   * @param destData - Destination RGBA pixel data
   * @param destWidth - Destination image width
   * @param destHeight - Destination image height
   */
  private static applyBilinearInterpolation(
    srcData: Uint8Array,
    srcWidth: number,
    srcHeight: number,
    destData: Uint8Array,
    destWidth: number,
    destHeight: number
  ): void {
    const scaleX = srcWidth / destWidth;
    const scaleY = srcHeight / destHeight;

    for (let y = 0; y < destHeight; y++) {
      for (let x = 0; x < destWidth; x++) {
        // Calculate source coordinates
        const srcX = x * scaleX;
        const srcY = y * scaleY;

        // Get integer and fractional parts
        const srcXInt = Math.floor(srcX);
        const srcYInt = Math.floor(srcY);
        const srcXFrac = srcX - srcXInt;
        const srcYFrac = srcY - srcYInt;

        // Get the four neighboring pixels
        const x1 = Math.min(srcXInt, srcWidth - 1);
        const y1 = Math.min(srcYInt, srcHeight - 1);
        const x2 = Math.min(x1 + 1, srcWidth - 1);
        const y2 = Math.min(y1 + 1, srcHeight - 1);

        // Calculate indices for the four pixels
        const i1 = (y1 * srcWidth + x1) * 4;
        const i2 = (y1 * srcWidth + x2) * 4;
        const i3 = (y2 * srcWidth + x1) * 4;
        const i4 = (y2 * srcWidth + x2) * 4;

        // Calculate weights
        const w1 = (1 - srcXFrac) * (1 - srcYFrac);
        const w2 = srcXFrac * (1 - srcYFrac);
        const w3 = (1 - srcXFrac) * srcYFrac;
        const w4 = srcXFrac * srcYFrac;

        const destIndex = (y * destWidth + x) * 4;

        // Interpolate each channel
        destData[destIndex] = Math.round(
          (srcData[i1] || 0) * w1 +
            (srcData[i2] || 0) * w2 +
            (srcData[i3] || 0) * w3 +
            (srcData[i4] || 0) * w4
        ); // R

        destData[destIndex + 1] = Math.round(
          (srcData[i1 + 1] || 0) * w1 +
            (srcData[i2 + 1] || 0) * w2 +
            (srcData[i3 + 1] || 0) * w3 +
            (srcData[i4 + 1] || 0) * w4
        ); // G

        destData[destIndex + 2] = Math.round(
          (srcData[i1 + 2] || 0) * w1 +
            (srcData[i2 + 2] || 0) * w2 +
            (srcData[i3 + 2] || 0) * w3 +
            (srcData[i4 + 2] || 0) * w4
        ); // B

        destData[destIndex + 3] = Math.round(
          (srcData[i1 + 3] || 255) * w1 +
            (srcData[i2 + 3] || 255) * w2 +
            (srcData[i3 + 3] || 255) * w3 +
            (srcData[i4 + 3] || 255) * w4
        ); // A
      }
    }
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
  private static distributeErrorFloydSteinberg(
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

    // 预计算分发因子，提高性能
    const factors = [
      { dx: 1, dy: 0, factor: 7 / 16 }, // 右侧像素
      { dx: -1, dy: 1, factor: 3 / 16 }, // 左下像素
      { dx: 0, dy: 1, factor: 5 / 16 }, // 下方像素
      { dx: 1, dy: 1, factor: 1 / 16 }, // 右下像素
    ];

    for (const { dx, dy, factor } of factors) {
      this.distributeErrorPixel(grayscale, width, height, x + dx, y + dy, error * factor);
    }
  }

  /**
   * Distribute quantization error to neighboring pixels using Atkinson algorithm
   *
   * @param grayscale - Grayscale image data
   * @param width - Image width
   * @param height - Image height
   * @param x - Current x position
   * @param y - Current y position
   * @param error - Quantization error to distribute
   */
  private static distributeErrorAtkinson(
    grayscale: Float32Array,
    width: number,
    height: number,
    x: number,
    y: number,
    error: number
  ): void {
    // Atkinson error diffusion matrix:
    // [     1/8 1/8 ]
    // [ 1/8 1/8 1/8 ]
    // [     1/8     ]

    // 预计算分发因子，提高性能
    const factors = [
      { dx: 1, dy: 0, factor: 1 / 8 }, // 右侧像素
      { dx: 2, dy: 0, factor: 1 / 8 }, // 右右侧像素
      { dx: -1, dy: 1, factor: 1 / 8 }, // 左下像素
      { dx: 0, dy: 1, factor: 1 / 8 }, // 下方像素
      { dx: 1, dy: 1, factor: 1 / 8 }, // 右下像素
      { dx: 0, dy: 2, factor: 1 / 8 }, // 下下方像素
    ];

    for (const { dx, dy, factor } of factors) {
      this.distributeErrorPixel(grayscale, width, height, x + dx, y + dy, error * factor);
    }
  }

  /**
   * Distribute error to a single pixel with bounds checking
   *
   * @param grayscale - Grayscale image data
   * @param width - Image width
   * @param height - Image height
   * @param nx - New x position
   * @param ny - New y position
   * @param error - Error value to distribute
   */
  private static distributeErrorPixel(
    grayscale: Float32Array,
    width: number,
    height: number,
    nx: number,
    ny: number,
    error: number
  ): void {
    // 边界检查
    if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
      const index = ny * width + nx;
      const currentValue = grayscale[index] || 0;
      // 更新像素值，确保在0-255范围内
      grayscale[index] = Math.max(0, Math.min(255, currentValue + error));
    }
  }
}
