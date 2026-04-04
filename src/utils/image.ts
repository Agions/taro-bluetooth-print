/**
 * Image Processing Utilities
 *
 * Provides methods for converting images to printer-compatible formats.
 * Supports multiple dithering algorithms and image preprocessing.
 */

export class ImageProcessing {
  // Pre-computed Bayer matrices for ordered dithering
  private static readonly BAYER_MATRIX_2: ReadonlyArray<ReadonlyArray<number>> = [
    [0, 2],
    [3, 1],
  ];

  private static readonly BAYER_MATRIX_4: ReadonlyArray<ReadonlyArray<number>> = [
    [0, 8, 2, 10],
    [12, 4, 14, 6],
    [3, 11, 1, 9],
    [15, 7, 13, 5],
  ];

  // 8x8 Bayer matrix computed from 4x4
  private static readonly BAYER_MATRIX_8: ReadonlyArray<ReadonlyArray<number>> = (() => {
    const m4 = ImageProcessing.BAYER_MATRIX_4;
    const m8: number[][] = [];
    for (let i = 0; i < 8; i++) {
      m8[i] = [];
      for (let j = 0; j < 8; j++) {
        const v = (m4[i >> 1]?.[j >> 1] ?? 0) + (i % 2) * 32 + (j % 2) * 64;
        m8[i]![j] = v;
      }
    }
    return m8;
  })();

  // Quality presets
  private static readonly QUALITY_PRESETS = {
    draft: { contrast: 0.9, brightness: -0.05, algorithm: 'ordered' as const },
    normal: { contrast: 1.0, brightness: 0.0, algorithm: 'floyd-steinberg' as const },
    high: { contrast: 1.15, brightness: 0.08, algorithm: 'halftone' as const },
  };

  /**
   * Convert RGBA data to monochrome bitmap (1 bit per pixel)
   * suitable for ESC/POS GS v 0 command.
   *
   * @example
   * ```typescript
   * const bitmap = ImageProcessing.toBitmap(rgbaData, width, height, {
   *   targetWidth: 384,
   *   ditheringAlgorithm: 'ordered',
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
      targetWidth?: number;
      targetHeight?: number;
      useDithering?: boolean;
      /** 'floyd-steinberg' | 'atkinson' | 'ordered' | 'halftone' | 'sierra' | 'stucki' (default: 'floyd-steinberg') */
      ditheringAlgorithm?:
        | 'floyd-steinberg'
        | 'atkinson'
        | 'ordered'
        | 'halftone'
        | 'sierra'
        | 'stucki';
      scalingAlgorithm?: 'nearest' | 'bilinear';
      contrast?: number;
      brightness?: number;
      threshold?: number;
      orderedMatrixSize?: 2 | 4 | 8;
      halftoneDotType?: 'round' | 'diamond' | 'square';
      qualityPreset?: 'draft' | 'normal' | 'high';
    }
  ): Uint8Array {
    if (!data || !(data instanceof Uint8Array) || width <= 0 || height <= 0) {
      return new Uint8Array(0);
    }

    if (data.length !== width * height * 4) {
      throw new Error(
        `Invalid image data length: expected ${width * height * 4}, got ${data.length}`
      );
    }

    let opts = options || {};
    if (opts.qualityPreset) {
      const preset = this.QUALITY_PRESETS[opts.qualityPreset];
      opts = { ...opts, ...preset };
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
      orderedMatrixSize = 4,
      halftoneDotType = 'round',
    } = opts;

    let processedData = data;
    let processedWidth = width;
    let processedHeight = height;

    if (targetWidth || targetHeight) {
      const scaled = this.scaleImage(
        data,
        width,
        height,
        targetWidth || width,
        targetHeight || height,
        { algorithm: scalingAlgorithm }
      );
      processedData = scaled.newData;
      processedWidth = scaled.newWidth;
      processedHeight = scaled.newHeight;
    }

    const bytesPerLine = Math.ceil(processedWidth / 8);
    const bitmap = new Uint8Array(bytesPerLine * processedHeight);

    let grayscale = this.toGrayscale(processedData, processedWidth, processedHeight);
    grayscale = this.adjustContrastBrightness(grayscale, contrast, brightness);

    if (useDithering) {
      this.applyDithering(grayscale, processedWidth, processedHeight, bitmap, bytesPerLine, {
        algorithm: ditheringAlgorithm,
        threshold,
        orderedMatrixSize,
        halftoneDotType,
      });
    } else {
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
   * Image preprocessing pipeline
   * @example
   * ```typescript
   * const processed = ImageProcessing.preprocessImage(data, w, h, {
   *   denoise: true,
   *   sharpen: true,
   *   gamma: 1.2,
   *   posterize: 4
   * });
   * ```
   */
  static preprocessImage(
    data: Uint8Array,
    width: number,
    height: number,
    options?: {
      denoise?: boolean;
      sharpen?: boolean;
      gamma?: number;
      posterize?: number;
    }
  ): Uint8Array {
    if (!data || !(data instanceof Uint8Array)) return data;
    let result = data;
    if (options?.gamma && options.gamma !== 1.0) {
      result = this.applyGammaCorrection(result, options.gamma);
    }
    if (options?.denoise) {
      result = this.applyMedianFilter(result, width, height);
    }
    if (options?.sharpen) {
      result = this.applyUnsharpMask(result, width, height);
    }
    if (options?.posterize) {
      result = this.applyPosterization(result, options.posterize);
    }
    return result;
  }

  // ─── Private helpers ────────────────────────────────────────────────────────

  private static toGrayscale(data: Uint8Array, width: number, height: number): Float32Array {
    const grayscale = new Float32Array(width * height);
    for (let i = 0; i < data.length; i += 4) {
      const idx = i >> 2;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      grayscale[idx] = (r * 299 + g * 587 + b * 114) / 1000;
    }
    return grayscale;
  }

  private static adjustContrastBrightness(
    grayscale: Float32Array,
    contrast: number,
    brightness: number
  ): Float32Array {
    if (contrast === 1.0 && brightness === 0.0) return grayscale;
    const adjusted = new Float32Array(grayscale);
    for (let i = 0; i < adjusted.length; i++) {
      const value = adjusted[i];
      adjusted[i] = Math.max(0, Math.min(255, (value - 128) * contrast + 128 + brightness * 255));
    }
    return adjusted;
  }

  private static applyDithering(
    grayscale: Float32Array,
    width: number,
    height: number,
    bitmap: Uint8Array,
    bytesPerLine: number,
    opts: {
      algorithm: 'floyd-steinberg' | 'atkinson' | 'ordered' | 'halftone' | 'sierra' | 'stucki';
      threshold: number;
      orderedMatrixSize: 2 | 4 | 8;
      halftoneDotType: 'round' | 'diamond' | 'square';
    }
  ): void {
    switch (opts.algorithm) {
      case 'ordered':
        this.applyOrderedDithering(
          grayscale,
          width,
          height,
          bitmap,
          bytesPerLine,
          opts.threshold,
          opts.orderedMatrixSize
        );
        break;
      case 'halftone':
        this.applyHalftone(
          grayscale,
          width,
          height,
          bitmap,
          bytesPerLine,
          opts.threshold,
          opts.halftoneDotType
        );
        break;
      case 'sierra':
        this.applySierraDithering(grayscale, width, height, bitmap, bytesPerLine, opts.threshold);
        break;
      case 'stucki':
        this.applyStuckiDithering(grayscale, width, height, bitmap, bytesPerLine, opts.threshold);
        break;
      case 'atkinson':
        this.applyAtkinsonDithering(grayscale, width, height, bitmap, bytesPerLine, opts.threshold);
        break;
      default:
        this.applyFloydSteinbergDithering(
          grayscale,
          width,
          height,
          bitmap,
          bytesPerLine,
          opts.threshold
        );
    }
  }

  // ─── Floyd-Steinberg ──────────────────────────────────────────────────────────

  private static applyFloydSteinbergDithering(
    grayscale: Float32Array,
    width: number,
    height: number,
    bitmap: Uint8Array,
    bytesPerLine: number,
    threshold: number
  ): void {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        const oldPixel = grayscale[idx];
        const newPixel = oldPixel < threshold ? 0 : 255;
        if (newPixel === 0) {
          const byteIdx = y * bytesPerLine + Math.floor(x / 8);
          const bitIdx = 7 - (x % 8);
          bitmap[byteIdx] = bitmap[byteIdx] | (1 << bitIdx);
        }
        const err = oldPixel - newPixel;
        this.distributeErr(grayscale, width, height, x + 1, y, (err * 7) / 16);
        this.distributeErr(grayscale, width, height, x - 1, y + 1, (err * 3) / 16);
        this.distributeErr(grayscale, width, height, x, y + 1, (err * 5) / 16);
        this.distributeErr(grayscale, width, height, x + 1, y + 1, (err * 1) / 16);
      }
    }
  }

  // ─── Atkinson ────────────────────────────────────────────────────────────────

  private static applyAtkinsonDithering(
    grayscale: Float32Array,
    width: number,
    height: number,
    bitmap: Uint8Array,
    bytesPerLine: number,
    threshold: number
  ): void {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        const oldPixel = grayscale[idx];
        const newPixel = oldPixel < threshold ? 0 : 255;
        if (newPixel === 0) {
          const byteIdx = y * bytesPerLine + Math.floor(x / 8);
          const bitIdx = 7 - (x % 8);
          bitmap[byteIdx] = bitmap[byteIdx] | (1 << bitIdx);
        }
        const err = (oldPixel - newPixel) / 8;
        this.distributeErr(grayscale, width, height, x + 1, y, err);
        this.distributeErr(grayscale, width, height, x + 2, y, err);
        this.distributeErr(grayscale, width, height, x - 1, y + 1, err);
        this.distributeErr(grayscale, width, height, x, y + 1, err);
        this.distributeErr(grayscale, width, height, x + 1, y + 1, err);
        this.distributeErr(grayscale, width, height, x, y + 2, err);
      }
    }
  }

  // ─── Ordered (Bayer) ─────────────────────────────────────────────────────────

  private static applyOrderedDithering(
    grayscale: Float32Array,
    width: number,
    height: number,
    bitmap: Uint8Array,
    bytesPerLine: number,
    thresholdOffset: number,
    matrixSize: 2 | 4 | 8
  ): void {
    const matrix =
      matrixSize === 2
        ? ImageProcessing.BAYER_MATRIX_2
        : matrixSize === 8
          ? ImageProcessing.BAYER_MATRIX_8
          : ImageProcessing.BAYER_MATRIX_4;
    const matrixMax = matrixSize === 4 ? 16 : matrixSize === 8 ? 64 : 4;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        const pixel = grayscale[idx];
        const bayerRow = matrix[y % matrixSize] ?? [];
        const bayerVal = bayerRow[x % matrixSize] ?? 0;
        const adjustedThreshold = thresholdOffset + (bayerVal / matrixMax) * 48;
        if (pixel < adjustedThreshold) {
          const byteIdx = y * bytesPerLine + Math.floor(x / 8);
          const bitIdx = 7 - (x % 8);
          bitmap[byteIdx] = bitmap[byteIdx] | (1 << bitIdx);
        }
      }
    }
  }

  // ─── Halftone ────────────────────────────────────────────────────────────────

  private static applyHalftone(
    grayscale: Float32Array,
    width: number,
    height: number,
    bitmap: Uint8Array,
    bytesPerLine: number,
    threshold: number,
    dotType: 'round' | 'diamond' | 'square'
  ): void {
    const cellSize = 4;
    const thresholds = this.computeHalftoneThresholds(cellSize, dotType);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        const pixel = grayscale[idx];
        const localY = y % cellSize;
        const localX = x % cellSize;
        const row = thresholds[localY] ?? [];
        const t = row[localX] ?? 128;
        const adjusted = t + (pixel < threshold ? -30 : 30);
        if (pixel < adjusted) {
          const byteIdx = y * bytesPerLine + Math.floor(x / 8);
          const bitIdx = 7 - (x % 8);
          bitmap[byteIdx] = bitmap[byteIdx] | (1 << bitIdx);
        }
      }
    }
  }

  private static computeHalftoneThresholds(
    cellSize: number,
    dotType: 'round' | 'diamond' | 'square'
  ): number[][] {
    const thresholds: number[][] = [];
    const center = (cellSize - 1) / 2;
    for (let y = 0; y < cellSize; y++) {
      thresholds[y] = [];
      for (let x = 0; x < cellSize; x++) {
        let dist: number;
        if (dotType === 'round') {
          dist = Math.sqrt((x - center) ** 2 + (y - center) ** 2) / center;
        } else if (dotType === 'diamond') {
          dist = (Math.abs(x - center) + Math.abs(y - center)) / center;
        } else {
          dist = Math.max(Math.abs(x - center), Math.abs(y - center)) / center;
        }
        thresholds[y]![x] = Math.min(255, Math.round(dist * 224 + 32));
      }
    }
    return thresholds;
  }

  // ─── Sierra ──────────────────────────────────────────────────────────────────

  private static applySierraDithering(
    grayscale: Float32Array,
    width: number,
    height: number,
    bitmap: Uint8Array,
    bytesPerLine: number,
    threshold: number
  ): void {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        const oldPixel = grayscale[idx];
        const newPixel = oldPixel < threshold ? 0 : 255;
        if (newPixel === 0) {
          const byteIdx = y * bytesPerLine + Math.floor(x / 8);
          const bitIdx = 7 - (x % 8);
          bitmap[byteIdx] = bitmap[byteIdx] | (1 << bitIdx);
        }
        const err = oldPixel - newPixel;
        this.distributeErr(grayscale, width, height, x + 1, y, (err * 5) / 32);
        this.distributeErr(grayscale, width, height, x - 1, y + 1, (err * 3) / 32);
        this.distributeErr(grayscale, width, height, x, y + 1, (err * 5) / 32);
        this.distributeErr(grayscale, width, height, x + 1, y + 1, (err * 2) / 32);
        this.distributeErr(grayscale, width, height, x - 2, y + 1, (err * 2) / 32);
        this.distributeErr(grayscale, width, height, x - 1, y + 2, (err * 2) / 32);
        this.distributeErr(grayscale, width, height, x, y + 2, (err * 3) / 32);
        this.distributeErr(grayscale, width, height, x + 1, y + 2, (err * 2) / 32);
        this.distributeErr(grayscale, width, height, x + 2, y + 2, (err * 1) / 32);
      }
    }
  }

  // ─── Stucki ─────────────────────────────────────────────────────────────────

  private static applyStuckiDithering(
    grayscale: Float32Array,
    width: number,
    height: number,
    bitmap: Uint8Array,
    bytesPerLine: number,
    threshold: number
  ): void {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        const oldPixel = grayscale[idx];
        const newPixel = oldPixel < threshold ? 0 : 255;
        if (newPixel === 0) {
          const byteIdx = y * bytesPerLine + Math.floor(x / 8);
          const bitIdx = 7 - (x % 8);
          bitmap[byteIdx] = bitmap[byteIdx] | (1 << bitIdx);
        }
        const err = oldPixel - newPixel;
        this.distributeErr(grayscale, width, height, x + 1, y, (err * 8) / 42);
        this.distributeErr(grayscale, width, height, x + 2, y, (err * 4) / 42);
        this.distributeErr(grayscale, width, height, x - 2, y + 1, (err * 2) / 42);
        this.distributeErr(grayscale, width, height, x - 1, y + 1, (err * 4) / 42);
        this.distributeErr(grayscale, width, height, x, y + 1, (err * 8) / 42);
        this.distributeErr(grayscale, width, height, x + 1, y + 1, (err * 4) / 42);
        this.distributeErr(grayscale, width, height, x + 2, y + 1, (err * 2) / 42);
        this.distributeErr(grayscale, width, height, x - 2, y + 2, (err * 1) / 42);
        this.distributeErr(grayscale, width, height, x - 1, y + 2, (err * 2) / 42);
        this.distributeErr(grayscale, width, height, x, y + 2, (err * 4) / 42);
        this.distributeErr(grayscale, width, height, x + 1, y + 2, (err * 2) / 42);
        this.distributeErr(grayscale, width, height, x + 2, y + 2, (err * 1) / 42);
      }
    }
  }

  // ─── Simple threshold ────────────────────────────────────────────────────────

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
        const idx = y * width + x;
        const pixel = grayscale[idx];
        if (pixel < threshold) {
          const byteIdx = y * bytesPerLine + Math.floor(x / 8);
          const bitIdx = 7 - (x % 8);
          bitmap[byteIdx] = bitmap[byteIdx] | (1 << bitIdx);
        }
      }
    }
  }

  // ─── Error distribution ──────────────────────────────────────────────────────

  private static distributeErr(
    grayscale: Float32Array,
    width: number,
    height: number,
    nx: number,
    ny: number,
    error: number
  ): void {
    if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
      const idx = ny * width + nx;
      const current = grayscale[idx];
      grayscale[idx] = Math.max(0, Math.min(255, current + error));
    }
  }

  // ─── Scaling ────────────────────────────────────────────────────────────────

  private static scaleImage(
    data: Uint8Array,
    width: number,
    height: number,
    targetWidth: number,
    targetHeight: number,
    options?: { algorithm?: 'nearest' | 'bilinear' }
  ): { newData: Uint8Array; newWidth: number; newHeight: number } {
    const aspectRatio = width / height;
    let newWidth = targetWidth;
    let newHeight = targetHeight;
    if (newWidth / newHeight > aspectRatio) {
      newWidth = Math.round(newHeight * aspectRatio);
    } else {
      newHeight = Math.round(newWidth / aspectRatio);
    }
    const newData = new Uint8Array(newWidth * newHeight * 4);
    if (options?.algorithm === 'bilinear') {
      this.applyBilinearInterpolation(data, width, height, newData, newWidth, newHeight);
    } else {
      this.applyNearestNeighbor(data, width, height, newData, newWidth, newHeight);
    }
    return { newData, newWidth, newHeight };
  }

  private static applyNearestNeighbor(
    srcData: Uint8Array,
    srcWidth: number,
    srcHeight: number,
    destData: Uint8Array,
    destWidth: number,
    destHeight: number
  ): void {
    const sx = srcWidth / destWidth;
    const sy = srcHeight / destHeight;
    for (let y = 0; y < destHeight; y++) {
      for (let x = 0; x < destWidth; x++) {
        const sjx = Math.min(srcWidth - 1, Math.round(x * sx));
        const sjy = Math.min(srcHeight - 1, Math.round(y * sy));
        const si = (sjy * srcWidth + sjx) * 4;
        const di = (y * destWidth + x) * 4;
        destData[di] = srcData[si];
        destData[di + 1] = srcData[si + 1];
        destData[di + 2] = srcData[si + 2];
        destData[di + 3] = srcData[si + 3];
      }
    }
  }

  private static applyBilinearInterpolation(
    srcData: Uint8Array,
    srcWidth: number,
    srcHeight: number,
    destData: Uint8Array,
    destWidth: number,
    destHeight: number
  ): void {
    const sx = srcWidth / destWidth;
    const sy = srcHeight / destHeight;
    for (let y = 0; y < destHeight; y++) {
      for (let x = 0; x < destWidth; x++) {
        const fx = Math.min(srcWidth - 1, x * sx);
        const fy = Math.min(srcHeight - 1, y * sy);
        const x1 = Math.floor(fx);
        const y1 = Math.floor(fy);
        const x2 = Math.min(x1 + 1, srcWidth - 1);
        const y2 = Math.min(y1 + 1, srcHeight - 1);
        const fx2 = fx - x1;
        const fy2 = fy - y1;
        const w1 = (1 - fx2) * (1 - fy2);
        const w2 = fx2 * (1 - fy2);
        const w3 = (1 - fx2) * fy2;
        const w4 = fx2 * fy2;
        for (let c = 0; c < 4; c++) {
          const ii1 = (y1 * srcWidth + x1) * 4 + c;
          const ii2 = (y1 * srcWidth + x2) * 4 + c;
          const ii3 = (y2 * srcWidth + x1) * 4 + c;
          const ii4 = (y2 * srcWidth + x2) * 4 + c;
          const v = srcData[ii1] * w1 + srcData[ii2] * w2 + srcData[ii3] * w3 + srcData[ii4] * w4;
          destData[(y * destWidth + x) * 4 + c] = Math.round(v);
        }
      }
    }
  }

  // ─── Preprocessing ─────────────────────────────────────────────────────────

  private static applyGammaCorrection(data: Uint8Array, gamma: number): Uint8Array {
    const invGamma = 1.0 / gamma;
    const lut = new Uint8Array(256);
    for (let i = 0; i < 256; i++) {
      lut[i] = Math.round(Math.pow(i / 255, invGamma) * 255);
    }
    const result = new Uint8Array(data.length);
    for (let i = 0; i < data.length; i += 4) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- lut has 256 entries, data[i] is 0-255
      result[i] = lut[data[i]]!;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      result[i + 1] = lut[data[i + 1]]!;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      result[i + 2] = lut[data[i + 2]]!;
      result[i + 3] = data[i + 3];
    }
    return result;
  }

  private static applyMedianFilter(data: Uint8Array, width: number, height: number): Uint8Array {
    const result = new Uint8Array(data.length);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const di = (y * width + x) * 4;
        const window: number[] = [];
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nx = Math.max(0, Math.min(width - 1, x + dx));
            const ny2 = Math.max(0, Math.min(height - 1, y + dy));
            const si = (ny2 * width + nx) * 4;
            for (let c = 0; c < 4; c++) {
              window.push(data[si + c]);
            }
          }
        }
        window.sort((a, b) => a - b);
        for (let c = 0; c < 4; c++) {
          result[di + c] = window[18 + c * 9] ?? 128;
        }
      }
    }
    return result;
  }

  private static applyUnsharpMask(data: Uint8Array, width: number, height: number): Uint8Array {
    // Center=3, edges=-0.5
    const kernel: number[][] = [
      [-0.5, -1.0, -0.5],
      [-1.0, 3.0, -1.0],
      [-0.5, -1.0, -0.5],
    ];
    const kHalf = 1;
    const result = new Uint8Array(data.length);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const di = (y * width + x) * 4;
        for (let c = 0; c < 4; c++) {
          let sum = 0;
          for (let ky = 0; ky < 3; ky++) {
            for (let kx = 0; kx < 3; kx++) {
              const nx = Math.max(0, Math.min(width - 1, x + kx - kHalf));
              const ny2 = Math.max(0, Math.min(height - 1, y + ky - kHalf));
              const si = (ny2 * width + nx) * 4 + c;
              const kv = kernel[ky]?.[kx] ?? 0;
              sum += data[si] * kv;
            }
          }
          result[di + c] = Math.max(0, Math.min(255, Math.round(sum)));
        }
      }
    }
    return result;
  }

  private static applyPosterization(data: Uint8Array, levels: number): Uint8Array {
    const lv = Math.max(1, Math.min(8, levels));
    const step = 255 / (Math.pow(2, lv) - 1);
    const result = new Uint8Array(data.length);
    for (let i = 0; i < data.length; i += 4) {
      result[i] = Math.round(Math.round(data[i] / step) * step);
      result[i + 1] = Math.round(Math.round(data[i + 1] / step) * step);
      result[i + 2] = Math.round(Math.round(data[i + 2] / step) * step);
      result[i + 3] = data[i + 3];
    }
    return result;
  }
}
