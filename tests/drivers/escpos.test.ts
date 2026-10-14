/**
 * ESC/POS Driver Tests
 */

import { describe, it, expect } from 'vitest';
import { EscPos } from '../../src/drivers/EscPosDriver';

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

  it('should support QR code with custom encoding (UTF-8 vs default GBK)', () => {
    const driver = new EscPos();
    // Default GBK: '测试' is 4 bytes in GBK
    const gbkCommands = driver.qr('测试');
    expect(gbkCommands).toHaveLength(6);
    expect(gbkCommands[4]).toHaveLength(4);

    // Custom UTF-8: '测试' is 6 bytes in UTF-8
    const utf8Commands = driver.qr('测试', { encoding: 'UTF-8' });
    expect(utf8Commands).toHaveLength(6);
    expect(utf8Commands[4]).toHaveLength(6);
  });

  it('should return empty array for empty QR content', () => {
    const driver = new EscPos();
    expect(driver.qr('')).toEqual([]);
    expect(driver.qr(null as unknown as string)).toEqual([]);
  });
});
