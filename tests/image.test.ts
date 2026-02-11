import { describe, test, expect } from 'vitest';

import { ImageProcessing } from '../src/utils/image';

describe('ImageProcessing', () => {
  test('toBitmap converts white pixel to 0', () => {
    // RGBA: White (255, 255, 255, 255)
    const data = new Uint8Array([255, 255, 255, 255]);
    const width = 1;
    const height = 1;
    const bitmap = ImageProcessing.toBitmap(data, width, height);

    // Expect 0 (white)
    expect(bitmap[0]).toBe(0);
  });

  test('toBitmap converts black pixel to 1', () => {
    // RGBA: Black (0, 0, 0, 255)
    const data = new Uint8Array([0, 0, 0, 255]);
    const width = 1;
    const height = 1;
    const bitmap = ImageProcessing.toBitmap(data, width, height);

    // Expect 1 (black) - bit 7 set: 10000000 = 128
    expect(bitmap[0]).toBe(128);
  });

  test('toBitmap handles dithering (gray pixel)', () => {
    // RGBA: Gray (128, 128, 128, 255) - 2x1 image
    // Pixel 1: Gray -> Threshold 128. 128 >= 128 -> White (0). Error = 128 - 255 = -127?
    // Wait, logic: oldPixel = 128. newPixel = 128 < 128 ? 0 : 255 => 255 (White).
    // Error = 128 - 255 = -127.
    // Neighbor (Pixel 2) gets error * 7 / 16.

    const data = new Uint8Array([
      128, 128, 128, 255, // Pixel 1
      128, 128, 128, 255  // Pixel 2
    ]);
    const width = 2;
    const height = 1;
    const bitmap = ImageProcessing.toBitmap(data, width, height);

    // Byte 1 contains both pixels.
    // Pixel 1 (x=0): White (0). Bit 7 = 0.
    // Pixel 2 (x=1): Original 128 + (-127 * 7/16) = 128 - 55 = 73.
    // 73 < 128 -> Black (0). Wait, logic: newPixel = 73 < 128 ? 0 : 255 => 0 (Black).
    // So Pixel 2 should be Black. Bit 6 = 1.
    // Result byte: 01000000 = 64.

    expect(bitmap[0]).toBe(64);
  });
});
