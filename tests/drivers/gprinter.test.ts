/**
 * GPrinter Driver Tests
 */

import { describe, it, expect } from 'vitest';
import { GPrinterDriver } from '../../src/drivers/GPrinterDriver';

describe('GPrinterDriver', () => {
  it('should extend functionality', () => {
    const driver = new GPrinterDriver();
    // Should be able to call parent methods
    const initCmd = driver.init();
    expect(initCmd).toHaveLength(1);
  });

  it('should open cash drawer', () => {
    const driver = new GPrinterDriver();
    const commands = driver.openCashDrawer();
    expect(commands).toHaveLength(1);
    expect(commands[0][0]).toBe(0x1b); // ESC
    expect(commands[0][1]).toBe(0x70); // p
  });

  it('should open cash drawer with custom pin', () => {
    const driver = new GPrinterDriver();
    const commands = driver.openCashDrawer(1);
    expect(commands[0][2]).toBe(1); // pin 1
  });

  it('should beep', () => {
    const driver = new GPrinterDriver();
    const commands = driver.beep(3, 50);
    expect(commands).toHaveLength(1);
    expect(commands[0][0]).toBe(0x1b); // ESC
    expect(commands[0][1]).toBe(0x42); // B
  });

  it('should generate self test', () => {
    const driver = new GPrinterDriver();
    const commands = driver.selfTest();
    expect(commands).toHaveLength(1);
    expect(commands[0][0]).toBe(0x1b); // ESC
    expect(commands[0][1]).toBe(0x69); // i
  });

  it('should get status', () => {
    const driver = new GPrinterDriver();
    const commands = driver.getStatus();
    expect(commands).toHaveLength(4); // 4 status requests
  });

  it('should set code page', () => {
    const driver = new GPrinterDriver();
    const commands = driver.setCodePage(0);
    expect(commands).toHaveLength(1);
    expect(commands[0][0]).toBe(0x1b); // ESC
    expect(commands[0][1]).toBe(0x74); // t
  });

  it('should print and feed', () => {
    const driver = new GPrinterDriver();
    const commands = driver.printAndFeed(3);
    expect(commands).toHaveLength(1);
    expect(commands[0][0]).toBe(0x1b); // ESC
    expect(commands[0][1]).toBe(0x64); // d
  });

  it('should set left margin', () => {
    const driver = new GPrinterDriver();
    const commands = driver.setLeftMargin(5);
    expect(commands).toHaveLength(1);
    expect(commands[0][0]).toBe(0x1b); // ESC
    expect(commands[0][1]).toBe(0x6c); // l
  });

  it('should set print width', () => {
    const driver = new GPrinterDriver();
    const commands = driver.setPrintWidth(40);
    expect(commands).toHaveLength(1);
    expect(commands[0][0]).toBe(0x1b); // ESC
    expect(commands[0][1]).toBe(0x57); // W
  });
});
