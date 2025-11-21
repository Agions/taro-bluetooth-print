
import { TextEncoder } from 'util';
global.TextEncoder = TextEncoder as any;

import { EscPos } from '../src/drivers/EscPos';
import { Encoding } from '../src/utils/encoding';

// Mock Encoding since it might depend on TextEncoder which is available in Node 11+
// But let's assume it works or mock it if needed.
// Actually, let's check src/utils/encoding.ts content first?
// I haven't read it yet. Let's assume it works or read it if test fails.

describe('EscPos QR', () => {
  const driver = new EscPos();

  test('qr generates correct commands for default options', () => {
    const content = '12345';
    const commands = driver.qr(content);

    // Expect 6 commands
    expect(commands.length).toBe(6);

    // 1. Model: GS ( k 04 00 31 41 50 00 (Model 2 default)
    expect(commands[0]).toEqual(new Uint8Array([0x1D, 0x28, 0x6B, 0x04, 0x00, 0x31, 0x41, 50, 0]));

    // 2. Size: GS ( k 03 00 31 43 06 (Size 6 default)
    expect(commands[1]).toEqual(new Uint8Array([0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x43, 6]));

    // 3. Error Correction: GS ( k 03 00 31 45 49 (Level M default)
    expect(commands[2]).toEqual(new Uint8Array([0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x45, 49]));

    // 4. Store Data Header
    // Length of '12345' is 5. +3 = 8.
    // pL = 8, pH = 0.
    // GS ( k 08 00 31 50 30 ...data...
    const header = new Uint8Array([0x1D, 0x28, 0x6B, 8, 0, 0x31, 0x50, 0x30]);
    expect(commands[3]).toEqual(header);

    // 5. Store Data Content
    // '12345' encoded to UTF-8 (fallback) is [49, 50, 51, 52, 53]
    expect(Array.from(commands[4])).toEqual([49, 50, 51, 52, 53]);

    // 6. Print Symbol
    // GS ( k 03 00 31 51 30
    expect(commands[5]).toEqual(new Uint8Array([0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x51, 0x30]));
  });
});
