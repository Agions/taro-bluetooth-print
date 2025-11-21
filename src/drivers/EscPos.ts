/**
 * ESC/POS Driver Implementation
 */

import { IPrinterDriver } from '../types';
import { Encoding } from '../utils/encoding';
import { ImageProcessing } from '../utils/image';

export class EscPos implements IPrinterDriver {
  init(): Uint8Array[] {
    return [new Uint8Array([0x1B, 0x40])]; // ESC @
  }

  text(content: string, encoding: string = 'GBK'): Uint8Array[] {
    const encoded = Encoding.encode(content, encoding);
    return [encoded];
  }

  feed(lines: number = 1): Uint8Array[] {
    return [new Uint8Array([0x1B, 0x64, lines])]; // ESC d n
  }

  cut(): Uint8Array[] {
    return [new Uint8Array([0x1D, 0x56, 0x00])]; // GS V 0
  }

  image(data: Uint8Array, width: number, height: number): Uint8Array[] {
    const bitmap = ImageProcessing.toBitmap(data, width, height);
    const xL = (Math.ceil(width / 8)) % 256;
    const xH = Math.floor((Math.ceil(width / 8)) / 256);
    const yL = height % 256;
    const yH = Math.floor(height / 256);

    // GS v 0 m xL xH yL yH d1...dk
    const header = new Uint8Array([0x1D, 0x76, 0x30, 0x00, xL, xH, yL, yH]);
    return [header, bitmap];
  }
}
