/**
 * Xprinter Driver Tests
 */

import { describe, it, expect } from 'vitest';
import { XprinterDriver } from '../../src/drivers/XprinterDriver';

describe('XprinterDriver', () => {
  it('should extend EscPos functionality', () => {
    const driver = new XprinterDriver();
    // Should be able to call parent methods
    const initCmd = driver.init();
    expect(initCmd).toHaveLength(1);
  });

  it('should initialize with ESC @ command', () => {
    const driver = new XprinterDriver();
    const commands = driver.init();
    expect(commands[0][0]).toBe(0x1b); // ESC
    expect(commands[0][1]).toBe(0x40); // @
  });

  it('should open cash drawer', () => {
    const driver = new XprinterDriver();
    const commands = driver.openCashDrawer();
    expect(commands).toHaveLength(1);
    expect(commands[0][0]).toBe(0x1b); // ESC
    expect(commands[0][1]).toBe(0x70); // p
    expect(commands[0][2]).toBe(0); // pin 0
  });

  it('should open cash drawer with custom pin', () => {
    const driver = new XprinterDriver();
    const commands = driver.openCashDrawer(1);
    expect(commands[0][2]).toBe(1); // pin 1
  });

  it('should beep', () => {
    const driver = new XprinterDriver();
    const commands = driver.beep(3, 50);
    expect(commands).toHaveLength(1);
    expect(commands[0][0]).toBe(0x1b); // ESC
    expect(commands[0][1]).toBe(0x42); // B
  });

  it('should generate self test', () => {
    const driver = new XprinterDriver();
    const commands = driver.selfTest();
    expect(commands).toHaveLength(1);
    expect(commands[0][0]).toBe(0x1b); // ESC
    expect(commands[0][1]).toBe(0x69); // i
  });

  it('should get status', () => {
    const driver = new XprinterDriver();
    const commands = driver.getStatus();
    expect(commands).toHaveLength(1);
    expect(commands[0][0]).toBe(0x1b); // ESC
    expect(commands[0][1]).toBe(0x69); // i
  });

  it('should get detailed status with 4 queries', () => {
    const driver = new XprinterDriver();
    const commands = driver.getDetailedStatus();
    expect(commands).toHaveLength(4); // 4 status requests
    expect(commands[0][0]).toBe(0x10); // DLE
    expect(commands[0][1]).toBe(0x04); // EOT
  });

  it('should set code page', () => {
    const driver = new XprinterDriver();
    const commands = driver.setCodePage(0);
    expect(commands).toHaveLength(1);
    expect(commands[0][0]).toBe(0x1b); // ESC
    expect(commands[0][1]).toBe(0x74); // t
  });

  it('should set left margin', () => {
    const driver = new XprinterDriver();
    const commands = driver.setLeftMargin(5);
    expect(commands).toHaveLength(1);
    expect(commands[0][0]).toBe(0x1b); // ESC
    expect(commands[0][1]).toBe(0x6c); // l
  });

  it('should set print width', () => {
    const driver = new XprinterDriver();
    const commands = driver.setPrintWidth(40);
    expect(commands).toHaveLength(1);
    expect(commands[0][0]).toBe(0x1b); // ESC
    expect(commands[0][1]).toBe(0x57); // W
  });

  it('should feed and cut', () => {
    const driver = new XprinterDriver();
    const commands = driver.feedAndCut(3);
    expect(commands).toHaveLength(2);
    // First command: feed
    expect(commands[0][0]).toBe(0x1b); // ESC
    expect(commands[0][1]).toBe(0x64); // d
    // Second command: cut
    expect(commands[1][0]).toBe(0x1d); // GS
    expect(commands[1][1]).toBe(0x56); // V
  });
});
