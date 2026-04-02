/**
 * SprtDriver Tests
 */

import { describe, it, expect } from 'vitest';
import { SprtDriver } from '../../src/drivers/SprtDriver';

describe('SprtDriver', () => {
  it('should extend EscPos functionality', () => {
    const driver = new SprtDriver();
    // Should be able to call parent methods
    const initCmd = driver.init();
    expect(initCmd).toHaveLength(1);
  });

  it('should initialize with ESC @ command', () => {
    const driver = new SprtDriver();
    const commands = driver.init();
    expect(commands[0][0]).toBe(0x1b); // ESC
    expect(commands[0][1]).toBe(0x40); // @
  });

  it('should enter sleep mode', () => {
    const driver = new SprtDriver();
    const commands = driver.sleep();
    expect(commands).toHaveLength(1);
    expect(commands[0][0]).toBe(0x1b); // ESC
    expect(commands[0][1]).toBe(0x3d); // =
    expect(commands[0][2]).toBe(0x01); // enable
  });

  it('should wake up with null character', () => {
    const driver = new SprtDriver();
    const commands = driver.wakeUp();
    expect(commands).toHaveLength(1);
    expect(commands[0][0]).toBe(0x00); // NULL
  });

  it('should deep wake up with multiple null chars and init', () => {
    const driver = new SprtDriver();
    const commands = driver.wakeUpDeep();
    expect(commands).toHaveLength(6); // 5 NULL + 1 ESC @
    expect(commands[0][0]).toBe(0x00); // NULL
    expect(commands[5][0]).toBe(0x1b); // ESC
    expect(commands[5][1]).toBe(0x40); // @
  });

  it('should enable auto sleep', () => {
    const driver = new SprtDriver();
    const commands = driver.setAutoSleep(true);
    expect(commands).toHaveLength(1);
    expect(commands[0][0]).toBe(0x1b); // ESC
    expect(commands[0][1]).toBe(0x3d); // =
    expect(commands[0][2]).toBe(0x01); // enable
  });

  it('should disable auto sleep', () => {
    const driver = new SprtDriver();
    const commands = driver.setAutoSleep(false);
    expect(commands).toHaveLength(1);
    expect(commands[0][0]).toBe(0x1b); // ESC
    expect(commands[0][1]).toBe(0x3d); // =
    expect(commands[0][2]).toBe(0x00); // disable
  });

  it('should open cash drawer', () => {
    const driver = new SprtDriver();
    const commands = driver.openCashDrawer();
    expect(commands).toHaveLength(1);
    expect(commands[0][0]).toBe(0x1b); // ESC
    expect(commands[0][1]).toBe(0x70); // p
  });

  it('should open cash drawer with custom pin', () => {
    const driver = new SprtDriver();
    const commands = driver.openCashDrawer(1);
    expect(commands[0][2]).toBe(1); // pin 1
  });

  it('should beep', () => {
    const driver = new SprtDriver();
    const commands = driver.beep(3, 50);
    expect(commands).toHaveLength(1);
    expect(commands[0][0]).toBe(0x1b); // ESC
    expect(commands[0][1]).toBe(0x42); // B
  });

  it('should generate self test', () => {
    const driver = new SprtDriver();
    const commands = driver.selfTest();
    expect(commands).toHaveLength(1);
    expect(commands[0][0]).toBe(0x1b); // ESC
    expect(commands[0][1]).toBe(0x69); // i
  });

  it('should get status with 4 queries', () => {
    const driver = new SprtDriver();
    const commands = driver.getStatus();
    expect(commands).toHaveLength(4); // 4 status requests
    expect(commands[0][0]).toBe(0x10); // DLE
    expect(commands[0][1]).toBe(0x04); // EOT
  });

  it('should set code page', () => {
    const driver = new SprtDriver();
    const commands = driver.setCodePage(0);
    expect(commands).toHaveLength(1);
    expect(commands[0][0]).toBe(0x1b); // ESC
    expect(commands[0][1]).toBe(0x74); // t
  });

  it('should set left margin', () => {
    const driver = new SprtDriver();
    const commands = driver.setLeftMargin(5);
    expect(commands).toHaveLength(1);
    expect(commands[0][0]).toBe(0x1b); // ESC
    expect(commands[0][1]).toBe(0x6c); // l
  });

  it('should set print width', () => {
    const driver = new SprtDriver();
    const commands = driver.setPrintWidth(40);
    expect(commands).toHaveLength(1);
    expect(commands[0][0]).toBe(0x1b); // ESC
    expect(commands[0][1]).toBe(0x57); // W
  });
});
