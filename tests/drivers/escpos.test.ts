/**
 * ESC/POS Driver Tests
 */

import { describe, it, expect } from 'vitest';
import { EscPos } from '../../src/drivers/escPosDriver';

describe('EscPos Driver', () => {
  it('should initialize printer', () => {
    const driver = new EscPos();
    const commands = driver.init();
    expect(commands).toHaveLength(1);
    expect(commands[0]).toEqual(new Uint8Array([0x1b, 0x40])); // ESC @
  });

  it('should generate text command', () => {
    const driver = new EscPos();
    const commands = driver.text('Hello', 'GBK');
    expect(commands.length).toBeGreaterThan(0);
  });

  it('should generate feed command', () => {
    const driver = new EscPos();
    const commands = driver.feed(3);
    expect(commands).toHaveLength(1);
    expect(commands[0][0]).toBe(0x1b); // ESC
    expect(commands[0][1]).toBe(0x64); // d
  });

  it('should generate cut command', () => {
    const driver = new EscPos();
    const commands = driver.cut();
    expect(commands).toHaveLength(1);
    expect(commands[0][0]).toBe(0x1d); // GS
    expect(commands[0][1]).toBe(0x56); // V
  });

  it('should generate QR code command', () => {
    const driver = new EscPos();
    const commands = driver.qr('test', { size: 6, model: 2 });
    expect(commands.length).toBeGreaterThan(0);
  });
});
