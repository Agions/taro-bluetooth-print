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

  qr(content: string, options?: import('../types').IQrOptions): Uint8Array[] {
    const model = options?.model ?? 2;
    const size = options?.size ?? 6;
    const errorCorrection = options?.errorCorrection ?? 'M';

    const commands: Uint8Array[] = [];

    // 1. Set Model (Function 165)
    // GS ( k 04 00 31 41 n1 n2
    // n1: 49 (Model 1), 50 (Model 2)
    // n2: 0
    commands.push(new Uint8Array([0x1D, 0x28, 0x6B, 0x04, 0x00, 0x31, 0x41, model === 1 ? 49 : 50, 0]));

    // 2. Set Module Size (Function 167)
    // GS ( k 03 00 31 43 n
    commands.push(new Uint8Array([0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x43, size]));

    // 3. Set Error Correction (Function 169)
    // GS ( k 03 00 31 45 n
    // n: 48 (L), 49 (M), 50 (Q), 51 (H)
    const ecMap = { 'L': 48, 'M': 49, 'Q': 50, 'H': 51 };
    commands.push(new Uint8Array([0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x45, ecMap[errorCorrection]]));

    // 4. Store Data (Function 180)
    // GS ( k pL pH 31 50 30 d1...dk
    // pL, pH: length of data + 3
    const data = Encoding.encode(content, 'GBK'); // Use GBK or UTF-8 depending on printer. Usually GBK for Chinese.
    const len = data.length + 3;
    const pL = len % 256;
    const pH = Math.floor(len / 256);

    commands.push(new Uint8Array([0x1D, 0x28, 0x6B, pL, pH, 0x31, 0x50, 0x30]));
    commands.push(data);

    // 5. Print Symbol (Function 181)
    // GS ( k 03 00 31 51 30
    commands.push(new Uint8Array([0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x51, 0x30]));

    return commands;
  }
}
