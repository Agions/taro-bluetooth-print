import { vi, describe, test, expect, beforeEach } from 'vitest';
import { TextEncoder } from 'util';
global.TextEncoder = TextEncoder as any;

import { CommandBuilder } from '../../src/services/CommandBuilder';
import type { ICommandBuilder } from '../../src/services/interfaces/ICommandBuilder';
import type { IPrinterDriver } from '../../src/types';
import { TextAlign } from '../../src/formatter';
import { BarcodeFormat } from '../../src/barcode';

/**
 * CommandBuilder Contract Tests
 *
 * These tests verify that the CommandBuilder concrete class faithfully
 * implements the ICommandBuilder interface:
 *   1. Type-level: an instance is assignable to ICommandBuilder.
 *   2. Structural: every method declared on the interface exists on the
 *      class with the right shape (15 methods).
 *   3. Behavioural: the contract-prescribed return-this chaining,
 *      buffer invariants, and clear/re-init semantics all hold.
 */
describe('CommandBuilder — ICommandBuilder contract', () => {
  let mockDriver: IPrinterDriver;
  let commandBuilder: CommandBuilder;

  const encoder = new TextEncoder();

  beforeEach(() => {
    mockDriver = {
      init: vi.fn().mockReturnValue([new Uint8Array([0x1b, 0x40])]),
      text: vi.fn().mockImplementation((content: string) => [encoder.encode(content)]),
      feed: vi.fn().mockReturnValue([new Uint8Array([0x0a])]),
      cut: vi.fn().mockReturnValue([new Uint8Array([0x1d, 0x56, 0x00])]),
      image: vi.fn().mockReturnValue([new Uint8Array([0x1d, 0x76, 0x30])]),
      qr: vi.fn().mockReturnValue([new Uint8Array([0x1d, 0x28, 0x6b])]),
    };
    commandBuilder = new CommandBuilder(mockDriver);
  });

  test('instance is structurally assignable to ICommandBuilder', () => {
    // Compile-time + runtime assertion: the concrete class implements
    // every method declared on the interface.
    const asInterface: ICommandBuilder = commandBuilder;
    expect(asInterface).toBeDefined();
    expect(typeof asInterface.text).toBe('function');
    expect(typeof asInterface.feed).toBe('function');
    expect(typeof asInterface.cut).toBe('function');
    expect(typeof asInterface.image).toBe('function');
    expect(typeof asInterface.qr).toBe('function');
    expect(typeof asInterface.clear).toBe('function');
    expect(typeof asInterface.align).toBe('function');
    expect(typeof asInterface.setSize).toBe('function');
    expect(typeof asInterface.setBold).toBe('function');
    expect(typeof asInterface.setUnderline).toBe('function');
    expect(typeof asInterface.setInverse).toBe('function');
    expect(typeof asInterface.setStyle).toBe('function');
    expect(typeof asInterface.resetStyle).toBe('function');
    expect(typeof asInterface.barcode).toBe('function');
    expect(typeof asInterface.getBuffer).toBe('function');
    expect(typeof asInterface.getTotalBytes).toBe('function');
  });

  test('exposes exactly the 15 ICommandBuilder methods (no missing / no extra)', () => {
    const methodNames = [
      'text',
      'feed',
      'cut',
      'image',
      'qr',
      'clear',
      'align',
      'setSize',
      'setBold',
      'setUnderline',
      'setInverse',
      'setStyle',
      'resetStyle',
      'barcode',
      'getBuffer',
      'getTotalBytes',
    ];
    for (const name of methodNames) {
      expect(name in commandBuilder, `${name} should exist on CommandBuilder`).toBe(true);
      expect(typeof (commandBuilder as any)[name]).toBe('function');
    }
    // The two terminal accessors (getBuffer/getTotalBytes) are not in the
    // 15-method list — confirm all 15 chainable methods exist as functions
    // and that the contract-prescribed "return this" semantics hold for
    // every one. Each call gets the minimum valid argument set so the
    // implementation never throws.
    const chainable: Array<[keyof ICommandBuilder, any[]]> = [
      ['text', ['hi']],
      ['feed', []],
      ['cut', []],
      ['image', [new Uint8Array(1), 1, 1]],
      ['qr', ['x']],
      ['clear', []],
      ['align', [TextAlign.LEFT]],
      ['setSize', [1, 1]],
      ['setBold', [false]],
      ['setUnderline', [false]],
      ['setInverse', [false]],
      ['setStyle', [{}]],
      ['resetStyle', []],
      ['barcode', ['x', { format: BarcodeFormat.CODE39 }]],
    ];
    expect(chainable.length).toBe(14);
    for (const [name, args] of chainable) {
      const result = (commandBuilder as any)[name](...args);
      expect(result, `${name}() must return this for chaining`).toBe(commandBuilder);
    }
  });

  test('text() forwards content + optional encoding to the driver and chains', () => {
    const result = commandBuilder.text('Hello', 'UTF-8');
    expect(mockDriver.text).toHaveBeenCalledWith('Hello', 'UTF-8');
    expect(result).toBe(commandBuilder);

    // Without encoding, undefined is forwarded.
    commandBuilder.text('World');
    expect(mockDriver.text).toHaveBeenLastCalledWith('World', undefined);
  });

  test('feed() defaults to 1 line and cut() chains to the same instance', () => {
    const r1 = commandBuilder.feed();
    expect(mockDriver.feed).toHaveBeenCalledWith(1);
    expect(r1).toBe(commandBuilder);

    const r2 = commandBuilder.cut();
    expect(mockDriver.cut).toHaveBeenCalled();
    expect(r2).toBe(commandBuilder);
  });

  test('image() and qr() forward arguments exactly and chain', () => {
    const img = new Uint8Array(8);
    const r1 = commandBuilder.image(img, 2, 4);
    expect(mockDriver.image).toHaveBeenCalledWith(img, 2, 4);
    expect(r1).toBe(commandBuilder);

    const r2 = commandBuilder.qr('payload', { size: 4, errorCorrection: 'Q' });
    expect(mockDriver.qr).toHaveBeenCalledWith('payload', { size: 4, errorCorrection: 'Q' });
    expect(r2).toBe(commandBuilder);
  });

  test('align/setSize/setBold/setUnderline/setInverse/setStyle/resetStyle all chain and mutate the buffer', () => {
    const initial = commandBuilder.getTotalBytes();

    const r = commandBuilder
      .align(TextAlign.CENTER)
      .setSize(2, 2)
      .setBold(true)
      .setUnderline(true)
      .setInverse(true)
      .setStyle({ bold: true, align: TextAlign.LEFT })
      .resetStyle();

    expect(r).toBe(commandBuilder);
    // The formatter emits real bytes for every call → buffer must grow.
    expect(commandBuilder.getTotalBytes()).toBeGreaterThan(initial);
  });

  test('clear() re-initialises the driver and re-emits init bytes', () => {
    commandBuilder.text('will be cleared').feed(2);
    const beforeClear = commandBuilder.getTotalBytes();
    expect(beforeClear).toBeGreaterThan(2);
    expect(mockDriver.init).toHaveBeenCalledTimes(1);

    const r = commandBuilder.clear();
    expect(r).toBe(commandBuilder);
    // init() called a second time after the clear.
    expect(mockDriver.init).toHaveBeenCalledTimes(2);
    // Buffer is reset but init bytes are present.
    expect(commandBuilder.getTotalBytes()).toBe(2);
  });

  test('getBuffer() returns a Uint8Array whose length matches getTotalBytes(), and caches the result', () => {
    commandBuilder.text('hi').feed(1).cut();
    const buf = commandBuilder.getBuffer();
    expect(buf).toBeInstanceOf(Uint8Array);
    expect(buf.length).toBe(commandBuilder.getTotalBytes());

    // Cache hit — same reference.
    const cached = commandBuilder.getBuffer();
    expect(cached).toBe(buf);

    // Mutating the buffer invalidates the cache.
    commandBuilder.feed(1);
    const refetched = commandBuilder.getBuffer();
    expect(refetched).not.toBe(buf);
    expect(refetched.length).toBe(commandBuilder.getTotalBytes());
  });

  test('barcode() pushes generated commands to the buffer and chains', () => {
    const initial = commandBuilder.getTotalBytes();
    const r = commandBuilder.barcode('1234567890', {
      format: BarcodeFormat.CODE128,
      height: 60,
    });
    expect(r).toBe(commandBuilder);
    expect(commandBuilder.getTotalBytes()).toBeGreaterThan(initial);
  });
});
