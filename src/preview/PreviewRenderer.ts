/**
 * Preview Renderer
 *
 * Renders ESC/POS commands to preview images.
 * Simulates thermal printer output for preview purposes.
 *
 * @example
 * ```typescript
 * const renderer = new PreviewRenderer();
 * const preview = await renderer.render(commands, { paperWidth: 58 });
 * console.log(preview.base64);
 * ```
 */

import { Logger } from '@/utils/logger';

/**
 * Preview options
 */
export interface PreviewOptions {
  /** Paper width in mm (default: 58) */
  paperWidth?: number;
  /** DPI (default: 203) */
  dpi?: number;
  /** Background color (default: '#ffffff') */
  backgroundColor?: string;
  /** Foreground color (default: '#000000') */
  foregroundColor?: string;
  /** Font size in pixels (default: 24) */
  fontSize?: number;
  /** Line height multiplier (default: 1.2) */
  lineHeight?: number;
}

/**
 * Preview result
 */
export interface PreviewResult {
  /** Base64 encoded image */
  base64: string;
  /** Image width in pixels */
  width: number;
  /** Image height in pixels */
  height: number;
  /** MIME type */
  mimeType: string;
}

/**
 * Preview renderer interface
 */
export interface IPreviewRenderer {
  render(commands: Uint8Array, options?: PreviewOptions): PreviewResult;
  renderToImageData(commands: Uint8Array, options?: PreviewOptions): ImageData;
}

/**
 * ESC/POS command codes
 */
const ESC = 0x1b;
const GS = 0x1d;
const LF = 0x0a;

/**
 * Text alignment
 */
enum Alignment {
  LEFT = 0,
  CENTER = 1,
  RIGHT = 2,
}

/**
 * Render state
 */
interface RenderState {
  x: number;
  y: number;
  alignment: Alignment;
  widthScale: number;
  heightScale: number;
  bold: boolean;
  underline: boolean;
  inverse: boolean;
  fontSize: number;
  lineHeight: number;
}

/**
 * Default preview options
 */
const DEFAULT_OPTIONS: Required<PreviewOptions> = {
  paperWidth: 58,
  dpi: 203,
  backgroundColor: '#ffffff',
  foregroundColor: '#000000',
  fontSize: 24,
  lineHeight: 1.2,
};

/**
 * Preview Renderer class
 * Renders ESC/POS commands to preview images
 */
export class PreviewRenderer implements IPreviewRenderer {
  private readonly logger = Logger.scope('PreviewRenderer');

  /**
   * Render ESC/POS commands to a preview image
   */
  render(commands: Uint8Array, options?: PreviewOptions): PreviewResult {
    const opts = { ...DEFAULT_OPTIONS, ...options };

    // Calculate pixel width from paper width and DPI
    const pixelWidth = Math.floor((opts.paperWidth / 25.4) * opts.dpi);

    // Parse commands and estimate height
    const { lines, estimatedHeight } = this.parseCommands(commands, opts);

    // Create canvas (in browser) or return placeholder (in mini-program)
    if (typeof document !== 'undefined' && typeof document.createElement === 'function') {
      return this.renderToCanvas(lines, pixelWidth, estimatedHeight, opts);
    }

    // For mini-program environment, return a placeholder
    return this.createPlaceholder(pixelWidth, estimatedHeight);
  }

  /**
   * Render to ImageData (for Canvas rendering)
   */
  renderToImageData(commands: Uint8Array, options?: PreviewOptions): ImageData {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const pixelWidth = Math.floor((opts.paperWidth / 25.4) * opts.dpi);
    const { lines, estimatedHeight } = this.parseCommands(commands, opts);

    if (typeof document !== 'undefined' && typeof document.createElement === 'function') {
      const canvas = document.createElement('canvas');
      canvas.width = pixelWidth;
      canvas.height = estimatedHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Failed to get canvas context');
      }

      this.drawToContext(ctx, lines, pixelWidth, estimatedHeight, opts);
      return ctx.getImageData(0, 0, pixelWidth, estimatedHeight);
    }

    // Return empty ImageData for non-browser environments
    return new ImageData(pixelWidth, estimatedHeight);
  }

  /**
   * Parse ESC/POS commands into renderable lines
   */
  private parseCommands(
    commands: Uint8Array,
    opts: Required<PreviewOptions>
  ): { lines: RenderLine[]; estimatedHeight: number } {
    const lines: RenderLine[] = [];
    const state: RenderState = {
      x: 0,
      y: 0,
      alignment: Alignment.LEFT,
      widthScale: 1,
      heightScale: 1,
      bold: false,
      underline: false,
      inverse: false,
      fontSize: opts.fontSize,
      lineHeight: opts.lineHeight,
    };

    let currentLine: RenderLine = {
      segments: [],
      alignment: Alignment.LEFT,
      height: opts.fontSize * opts.lineHeight,
    };

    let i = 0;
    let textBuffer = '';

    const flushText = () => {
      if (textBuffer.length > 0) {
        currentLine.segments.push({
          type: 'text',
          content: textBuffer,
          bold: state.bold,
          underline: state.underline,
          inverse: state.inverse,
          widthScale: state.widthScale,
          heightScale: state.heightScale,
          fontSize: state.fontSize,
        });
        textBuffer = '';
      }
    };

    const newLine = () => {
      flushText();
      if (currentLine.segments.length > 0 || lines.length === 0) {
        currentLine.alignment = state.alignment;
        lines.push(currentLine);
      }
      currentLine = {
        segments: [],
        alignment: state.alignment,
        height: state.fontSize * state.heightScale * state.lineHeight,
      };
    };

    while (i < commands.length) {
      const byte = commands[i];
      if (byte === undefined) {
        i++;
        continue;
      }

      if (byte === ESC && i + 1 < commands.length) {
        const nextByte = commands[i + 1];

        switch (nextByte) {
          case 0x40: // ESC @ - Initialize
            flushText();
            state.alignment = Alignment.LEFT;
            state.widthScale = 1;
            state.heightScale = 1;
            state.bold = false;
            state.underline = false;
            state.inverse = false;
            i += 2;
            break;

          case 0x61: // ESC a - Alignment
            flushText();
            if (i + 2 < commands.length) {
              const alignValue = commands[i + 2];
              state.alignment =
                alignValue === Alignment.LEFT ||
                alignValue === Alignment.CENTER ||
                alignValue === Alignment.RIGHT
                  ? alignValue
                  : Alignment.LEFT;
            }
            i += 3;
            break;

          case 0x45: // ESC E - Bold
            flushText();
            if (i + 2 < commands.length) {
              state.bold = commands[i + 2] !== 0;
            }
            i += 3;
            break;

          case 0x2d: // ESC - - Underline
            flushText();
            if (i + 2 < commands.length) {
              state.underline = commands[i + 2] !== 0;
            }
            i += 3;
            break;

          case 0x64: // ESC d - Feed lines
            newLine();
            if (i + 2 < commands.length) {
              const feedLines = commands[i + 2] ?? 1;
              for (let j = 0; j < feedLines - 1; j++) {
                lines.push({
                  segments: [],
                  alignment: state.alignment,
                  height: state.fontSize * state.lineHeight,
                });
              }
            }
            i += 3;
            break;

          default:
            i += 2;
        }
      } else if (byte === GS && i + 1 < commands.length) {
        const nextByte = commands[i + 1];

        switch (nextByte) {
          case 0x21: // GS ! - Character size
            flushText();
            if (i + 2 < commands.length) {
              const size = commands[i + 2] ?? 0;
              state.widthScale = ((size >> 4) & 0x07) + 1;
              state.heightScale = (size & 0x07) + 1;
            }
            i += 3;
            break;

          case 0x42: // GS B - Inverse
            flushText();
            if (i + 2 < commands.length) {
              state.inverse = commands[i + 2] !== 0;
            }
            i += 3;
            break;

          case 0x56: // GS V - Cut
            newLine();
            lines.push({
              segments: [{ type: 'cut' }],
              alignment: Alignment.CENTER,
              height: 20,
            });
            i += 3;
            break;

          case 0x28: // GS ( - Extended commands (QR code, etc.)
            flushText();
            // Skip QR code commands for now
            if (i + 3 < commands.length) {
              const pL = commands[i + 2] ?? 0;
              const pH = commands[i + 3] ?? 0;
              const len = pL + pH * 256;
              i += 4 + len;
            } else {
              i += 2;
            }
            break;

          case 0x76: // GS v - Raster image
            flushText();
            // Skip image data
            if (i + 7 < commands.length) {
              const xL = commands[i + 4] ?? 0;
              const xH = commands[i + 5] ?? 0;
              const yL = commands[i + 6] ?? 0;
              const yH = commands[i + 7] ?? 0;
              const bytesPerLine = xL + xH * 256;
              const height = yL + yH * 256;
              const imageSize = bytesPerLine * height;

              lines.push({
                segments: [{ type: 'image', width: bytesPerLine * 8, height }],
                alignment: state.alignment,
                height: height,
              });

              i += 8 + imageSize;
            } else {
              i += 2;
            }
            break;

          default:
            i += 2;
        }
      } else if (byte === LF) {
        newLine();
        i++;
      } else if (byte >= 0x20 && byte < 0x80) {
        // ASCII printable character
        textBuffer += String.fromCharCode(byte);
        i++;
      } else if (byte >= 0x80) {
        // Multi-byte character (GBK/UTF-8)
        // Try to decode as GBK (2 bytes) or UTF-8
        if (i + 1 < commands.length) {
          const nextByte = commands[i + 1];
          if (nextByte !== undefined) {
            // Simple GBK decoding attempt
            try {
              const decoder = new TextDecoder('gbk');
              const decoded = decoder.decode(commands.slice(i, i + 2));
              textBuffer += decoded;
              i += 2;
            } catch {
              // Fallback: skip byte
              i++;
            }
          } else {
            i++;
          }
        } else {
          i++;
        }
      } else {
        i++;
      }
    }

    // Flush remaining text
    flushText();
    if (currentLine.segments.length > 0) {
      currentLine.alignment = state.alignment;
      lines.push(currentLine);
    }

    // Calculate total height
    const estimatedHeight = Math.max(100, lines.reduce((acc, line) => acc + line.height, 0) + 40);

    return { lines, estimatedHeight };
  }

  /**
   * Render to canvas and return base64
   */
  private renderToCanvas(
    lines: RenderLine[],
    width: number,
    height: number,
    opts: Required<PreviewOptions>
  ): PreviewResult {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get canvas context');
    }

    this.drawToContext(ctx, lines, width, height, opts);

    const base64 = canvas.toDataURL('image/png');
    return {
      base64,
      width,
      height,
      mimeType: 'image/png',
    };
  }

  /**
   * Draw lines to canvas context
   */
  private drawToContext(
    ctx: CanvasRenderingContext2D,
    lines: RenderLine[],
    width: number,
    height: number,
    opts: Required<PreviewOptions>
  ): void {
    // Fill background
    ctx.fillStyle = opts.backgroundColor;
    ctx.fillRect(0, 0, width, height);

    let y = 20; // Top margin

    for (const line of lines) {
      if (line.segments.length === 0) {
        y += line.height;
        continue;
      }

      for (const segment of line.segments) {
        if (segment.type === 'text') {
          const fontSize = segment.fontSize * segment.heightScale;
          const fontWeight = segment.bold ? 'bold' : 'normal';
          ctx.font = `${fontWeight} ${fontSize}px monospace`;

          // Calculate text width for alignment
          const textWidth = ctx.measureText(segment.content).width * segment.widthScale;
          let x = 10; // Left margin

          switch (line.alignment) {
            case Alignment.CENTER:
              x = (width - textWidth) / 2;
              break;
            case Alignment.RIGHT:
              x = width - textWidth - 10;
              break;
          }

          if (segment.inverse) {
            ctx.fillStyle = opts.foregroundColor;
            ctx.fillRect(x - 2, y - fontSize, textWidth + 4, fontSize * 1.2);
            ctx.fillStyle = opts.backgroundColor;
          } else {
            ctx.fillStyle = opts.foregroundColor;
          }

          // Scale text horizontally if needed
          if (segment.widthScale > 1) {
            ctx.save();
            ctx.scale(segment.widthScale, 1);
            ctx.fillText(segment.content, x / segment.widthScale, y);
            ctx.restore();
          } else {
            ctx.fillText(segment.content, x, y);
          }

          if (segment.underline) {
            ctx.strokeStyle = opts.foregroundColor;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(x, y + 2);
            ctx.lineTo(x + textWidth, y + 2);
            ctx.stroke();
          }
        } else if (segment.type === 'cut') {
          // Draw cut line
          ctx.strokeStyle = '#cccccc';
          ctx.setLineDash([5, 5]);
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(width, y);
          ctx.stroke();
          ctx.setLineDash([]);
        } else if (segment.type === 'image') {
          // Draw placeholder for image
          ctx.fillStyle = '#eeeeee';
          ctx.fillRect(10, y - segment.height, segment.width, segment.height);
          ctx.strokeStyle = '#cccccc';
          ctx.strokeRect(10, y - segment.height, segment.width, segment.height);
        }
      }

      y += line.height;
    }
  }

  /**
   * Create placeholder result for non-browser environments
   */
  private createPlaceholder(width: number, height: number): PreviewResult {
    this.logger.warn('Canvas not available, returning placeholder');

    // Return a minimal valid PNG base64 (1x1 white pixel)
    const placeholderBase64 =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';

    return {
      base64: placeholderBase64,
      width,
      height,
      mimeType: 'image/png',
    };
  }
}

/**
 * Render line
 */
interface RenderLine {
  segments: RenderSegment[];
  alignment: Alignment;
  height: number;
}

/**
 * Render segment
 */
type RenderSegment =
  | {
      type: 'text';
      content: string;
      bold: boolean;
      underline: boolean;
      inverse: boolean;
      widthScale: number;
      heightScale: number;
      fontSize: number;
    }
  | { type: 'cut' }
  | { type: 'image'; width: number; height: number };

// Export singleton instance for convenience
export const previewRenderer = new PreviewRenderer();
