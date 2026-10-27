/**
 * Tests for StarDriver contract unification and StarPrinter backward compatibility
 * 验证 StarDriver 实现了 IProtocolDriver 契约，并保持与旧版 StarPrinter 100% 兼容
 */

import { describe, test, expect } from 'vitest';
import { StarDriver, StarPrinter } from '../../src/drivers';
import type { IProtocolDriver } from '../../src/drivers/contracts';

describe('StarDriver Contract & Compatibility', () => {
  test('StarDriver implements IProtocolDriver and accumulates buffers into getBuffer()', () => {
    const driver = new StarDriver();
    const asProtocolDriver: IProtocolDriver = driver;

    expect(asProtocolDriver.protocol).toBe('STAR');

    driver.init();
    driver.text('Hello Star Driver');
    driver.feed(2);
    driver.cut();

    const buffer = driver.getBuffer();
    expect(buffer).toBeInstanceOf(Uint8Array);
    expect(buffer.length).toBeGreaterThan(0);

    // clear() should reset buffer
    driver.clear();
    expect(driver.getBuffer().length).toBe(0);
  });

  test('StarPrinter alias references StarDriver', () => {
    expect(StarPrinter).toBe(StarDriver);

    const legacy = new StarPrinter();
    expect(legacy).toBeInstanceOf(StarDriver);
  });
});
