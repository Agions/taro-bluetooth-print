/**
 * Command Builder Interface
 *
 * Builds print commands using the printer driver
 */

import { IQrOptions } from '@/types';
import { TextAlign, TextStyle } from '@/formatter';
import { BarcodeOptions } from '@/barcode';

/**
 * Command Builder Interface
 *
 * Builds print commands using the printer driver
 */
export interface ICommandBuilder {
  /**
   * Adds text to the print queue
   *
   * @param content - Text content
   * @param encoding - Text encoding
   * @returns this - For method chaining
   */
  text(content: string, encoding?: string): this;

  /**
   * Adds line feeds to the print queue
   *
   * @param lines - Number of lines to feed
   * @returns this - For method chaining
   */
  feed(lines?: number): this;

  /**
   * Adds a paper cut command to the print queue
   *
   * @returns this - For method chaining
   */
  cut(): this;

  /**
   * Adds an image to the print queue
   *
   * @param data - Image data as Uint8Array
   * @param width - Image width
   * @param height - Image height
   * @returns this - For method chaining
   */
  image(data: Uint8Array, width: number, height: number): this;

  /**
   * Adds a QR code to the print queue
   *
   * @param content - QR code content
   * @param options - QR code options
   * @returns this - For method chaining
   */
  qr(content: string, options?: IQrOptions): this;

  /**
   * Clears the print queue
   *
   * @returns this - For method chaining
   */
  clear(): this;

  /**
   * Sets text alignment
   *
   * @param alignment - Text alignment (left, center, right)
   * @returns this - For method chaining
   */
  align(alignment: TextAlign): this;

  /**
   * Sets character size (width and height scale)
   *
   * @param width - Width scale factor (1-8)
   * @param height - Height scale factor (1-8)
   * @returns this - For method chaining
   */
  setSize(width: number, height: number): this;

  /**
   * Sets bold text mode
   *
   * @param enabled - Enable or disable bold
   * @returns this - For method chaining
   */
  setBold(enabled: boolean): this;

  /**
   * Sets underline text mode
   *
   * @param enabled - Enable or disable underline
   * @returns this - For method chaining
   */
  setUnderline(enabled: boolean): this;

  /**
   * Sets inverse printing mode (white on black)
   *
   * @param enabled - Enable or disable inverse
   * @returns this - For method chaining
   */
  setInverse(enabled: boolean): this;

  /**
   * Sets multiple text style properties at once
   *
   * @param style - Text style configuration
   * @returns this - For method chaining
   */
  setStyle(style: TextStyle): this;

  /**
   * Resets all text formatting to default
   *
   * @returns this - For method chaining
   */
  resetStyle(): this;

  /**
   * Adds a 1D barcode to the print queue
   *
   * @param content - Barcode content/data
   * @param options - Barcode options
   * @returns this - For method chaining
   */
  barcode(content: string, options: BarcodeOptions): this;

  /**
   * Gets the current buffer
   *
   * @returns Uint8Array - Current print buffer
   */
  getBuffer(): Uint8Array;

  /**
   * Gets the total number of bytes in the buffer
   *
   * @returns number - Total bytes
   */
  getTotalBytes(): number;
}
