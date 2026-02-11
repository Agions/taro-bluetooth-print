import { describe, test, expect, vi, beforeEach } from 'vitest';
import { TsplDriver } from '../src/drivers/TsplDriver';
import { PluginManager } from '../src/plugins/PluginManager';
import { createLoggingPlugin, createRetryPlugin } from '../src/plugins';
import { PrinterState } from '../src/types';
import { BluetoothPrintError, ErrorCode } from '../src/errors/BluetoothError';

describe('TsplDriver', () => {
  let driver: TsplDriver;

  beforeEach(() => {
    driver = new TsplDriver();
  });

  test('should generate basic label commands', () => {
    driver
      .size(60, 40)
      .gap(3)
      .clear()
      .text('Hello World', { x: 50, y: 50 })
      .print(1);

    const commands = driver.getCommands();
    expect(commands).toContain('SIZE 60 mm, 40 mm');
    expect(commands).toContain('GAP 3 mm, 0 mm');
    expect(commands).toContain('CLS');
    expect(commands).toContain('TEXT 50,50');
    expect(commands).toContain('Hello World');
    expect(commands).toContain('PRINT 1,1');
  });

  test('should generate barcode commands', () => {
    driver.barcode('123456789', { x: 100, y: 100, type: '128', height: 80 });

    const commands = driver.getCommands();
    expect(commands).toContain('BARCODE 100,100,"128",80');
    expect(commands).toContain('123456789');
  });

  test('should generate QR code commands', () => {
    driver.qrcode('https://example.com', { x: 50, y: 50, cellWidth: 8 });

    const commands = driver.getCommands();
    expect(commands).toContain('QRCODE 50,50,M,8,A,0');
    expect(commands).toContain('https://example.com');
  });

  test('should generate box commands', () => {
    driver.box({ x: 10, y: 10, width: 100, height: 50, thickness: 3 });

    const commands = driver.getCommands();
    expect(commands).toContain('BOX 10,10,110,60,3');
  });

  test('should convert mm to dots correctly', () => {
    driver.setDPI(203);
    expect(driver.mmToDots(25.4)).toBe(203); // 1 inch = 203 dots at 203 DPI

    driver.setDPI(300);
    expect(driver.mmToDots(25.4)).toBe(300); // 1 inch = 300 dots at 300 DPI
  });

  test('should return buffer', () => {
    driver.size(40, 30).clear().print(1);
    const buffer = driver.getBuffer();

    expect(buffer).toBeInstanceOf(Uint8Array);
    expect(buffer.length).toBeGreaterThan(0);
  });

  test('should reset commands', () => {
    driver.size(40, 30).text('Test', { x: 0, y: 0 });
    expect(driver.getCommands().length).toBeGreaterThan(0);

    driver.reset();
    expect(driver.getCommands()).toBe('\r\n');
  });
});

describe('PluginManager', () => {
  let manager: PluginManager;

  beforeEach(() => {
    manager = new PluginManager();
  });

  test('should register and get plugin', async () => {
    const plugin = {
      name: 'test-plugin',
      version: '1.0.0',
      hooks: {},
    };

    await manager.register(plugin);
    expect(manager.has('test-plugin')).toBe(true);
    expect(manager.get('test-plugin')).toBe(plugin);
  });

  test('should throw on duplicate registration', async () => {
    const plugin = { name: 'test', hooks: {} };
    await manager.register(plugin);

    await expect(manager.register(plugin)).rejects.toThrow('already registered');
  });

  test('should unregister plugin', async () => {
    const destroyFn = vi.fn();
    const plugin = {
      name: 'test',
      hooks: {},
      destroy: destroyFn,
    };

    await manager.register(plugin);
    await manager.unregister('test');

    expect(manager.has('test')).toBe(false);
    expect(destroyFn).toHaveBeenCalled();
  });

  test('should execute hooks', async () => {
    const hookFn = vi.fn().mockReturnValue('modified-device');
    const plugin = {
      name: 'test',
      hooks: {
        beforeConnect: hookFn,
      },
    };

    await manager.register(plugin);
    const result = await manager.beforeConnect('original-device');

    expect(hookFn).toHaveBeenCalledWith('original-device');
    expect(result).toBe('modified-device');
  });

  test('should get all plugin names', async () => {
    await manager.register({ name: 'plugin-a', hooks: {} });
    await manager.register({ name: 'plugin-b', hooks: {} });

    expect(manager.getNames()).toContain('plugin-a');
    expect(manager.getNames()).toContain('plugin-b');
  });

  test('should clear all plugins', async () => {
    await manager.register({ name: 'plugin-a', hooks: {} });
    await manager.register({ name: 'plugin-b', hooks: {} });

    await manager.clear();

    expect(manager.getNames()).toHaveLength(0);
  });
});

describe('Built-in Plugins', () => {
  test('createLoggingPlugin should create valid plugin', () => {
    const plugin = createLoggingPlugin({ logProgress: true });

    expect(plugin.name).toBe('logging');
    expect(plugin.version).toBe('1.0.0');
    expect(plugin.hooks.beforeConnect).toBeDefined();
    expect(plugin.hooks.afterPrint).toBeDefined();
    expect(plugin.init).toBeDefined();
  });

  test('createRetryPlugin should create valid plugin', () => {
    const plugin = createRetryPlugin({ maxRetries: 5 });

    expect(plugin.name).toBe('retry');
    expect(plugin.version).toBe('1.0.0');
    expect(plugin.hooks.onError).toBeDefined();
    expect(plugin.init).toBeDefined();
  });
});
