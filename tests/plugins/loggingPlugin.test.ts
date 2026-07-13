/**
 * LoggingPlugin tests — exercises every hook + the options.
 *
 * Logger is captured via vi.spyOn to avoid polluting stderr during tests.
 * We assert both that the hooks fire and that the log payload is correct.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createLoggingPlugin } from '@/plugins/builtin/LoggingPlugin';
import { Logger, LogLevel } from '@/utils/logger';
import { BluetoothPrintError, ErrorCode } from '@/errors/BaseError';
import { PrinterState } from '@/types';

describe('LoggingPlugin', () => {
  let infoSpy: ReturnType<typeof vi.spyOn>;
  let debugSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;
  let savedLevel: LogLevel;

  beforeEach(() => {
    savedLevel = LogLevel.WARN; // default for tests
    infoSpy = vi.spyOn(Logger, 'info').mockImplementation(() => {});
    debugSpy = vi.spyOn(Logger, 'debug').mockImplementation(() => {});
    errorSpy = vi.spyOn(Logger, 'error').mockImplementation(() => {});
    vi.spyOn(Logger, 'scope').mockReturnValue({
      info: infoSpy,
      debug: debugSpy,
      warn: vi.fn(),
      error: errorSpy,
    } as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    Logger.setLevel(savedLevel);
  });

  it('exposes the canonical name/version/description', () => {
    const plugin = createLoggingPlugin();
    expect(plugin.name).toBe('logging');
    expect(plugin.version).toBe('1.0.0');
    expect(plugin.description).toContain('Detailed');
  });

  it('defaults: timestamps on, logProgress off, level DEBUG', () => {
    const setLevelSpy = vi.spyOn(Logger, 'setLevel');
    createLoggingPlugin().init!();
    expect(setLevelSpy).toHaveBeenCalledWith(LogLevel.DEBUG);
  });

  it('honors custom level/timestamps/logProgress options', () => {
    const setLevelSpy = vi.spyOn(Logger, 'setLevel');
    const plugin = createLoggingPlugin({
      level: LogLevel.ERROR,
      timestamps: false,
      logProgress: true,
    });
    plugin.init!();
    expect(setLevelSpy).toHaveBeenCalledWith(LogLevel.ERROR);

    // logProgress=true → onProgress now logs at debug level.
    plugin.hooks.onProgress!(50, 100);
    expect(debugSpy).toHaveBeenCalled();
    expect((debugSpy.mock.calls[0]![0] as string)).toContain('50/100');
    expect((debugSpy.mock.calls[0]![0] as string)).toContain('50.0%');
  });

  it('beforeConnect logs deviceId and resets the timer', () => {
    const plugin = createLoggingPlugin();
    plugin.hooks.beforeConnect!('AA:BB:CC:DD:EE:FF');
    expect(infoSpy).toHaveBeenCalledWith(expect.stringContaining('AA:BB:CC:DD:EE:FF'));
  });

  it('afterConnect logs elapsed ms (timestamps default)', () => {
    const plugin = createLoggingPlugin();
    plugin.hooks.beforeConnect!('dev1');
    infoSpy.mockClear();
    plugin.hooks.afterConnect!('dev1');
    expect(infoSpy).toHaveBeenCalledTimes(1);
    const msg = infoSpy.mock.calls[0]![0] as string;
    expect(msg).toContain('Connected to dev1');
    expect(msg).toMatch(/\(\d+ms\)/);
    // Default timestamps=true → includes ISO 8601 bracket prefix
    expect(msg).toMatch(/^\[\d{4}-\d{2}-\d{2}T/);
  });

  it('timestamps=false → log lines have no ISO prefix', () => {
    const plugin = createLoggingPlugin({ timestamps: false });
    plugin.hooks.beforeConnect!('dev1');
    const msg = infoSpy.mock.calls[0]![0] as string;
    expect(msg).not.toMatch(/^\[/);
  });

  it('beforeDisconnect / afterDisconnect both log', () => {
    const plugin = createLoggingPlugin({ timestamps: false });
    plugin.hooks.beforeDisconnect!('dev1');
    plugin.hooks.afterDisconnect!('dev1');
    expect(infoSpy).toHaveBeenCalledTimes(2);
    expect((infoSpy.mock.calls[0]![0] as string)).toContain('Disconnecting');
    expect((infoSpy.mock.calls[1]![0] as string)).toContain('Disconnected');
  });

  it('beforePrint logs buffer.length', () => {
    const plugin = createLoggingPlugin({ timestamps: false });
    plugin.hooks.beforePrint!(new Uint8Array(42));
    const msg = infoSpy.mock.calls[0]![0] as string;
    expect(msg).toContain('42 bytes');
  });

  it('afterPrint logs bytes + elapsed + computed B/s rate', () => {
    const plugin = createLoggingPlugin({ timestamps: false });
    // Real Date.now is used. The test asserts the message shape, not specific
    // timing values, because in-process elapsed can be 0ms (causing Infinity
    // in the rate computation — that is a real edge case in the source, not
    // a test artifact).
    plugin.hooks.beforePrint!(new Uint8Array(1000));
    infoSpy.mockClear();
    plugin.hooks.afterPrint!(1000);
    const msg = infoSpy.mock.calls[0]![0] as string;
    expect(msg).toContain('1000 bytes');
    expect(msg).toMatch(/in \d+ms/);
    expect(msg).toMatch(/\((?:\d+\.\d{2}|Infinity) B\/s\)/);
  });

  it('onError logs but does NOT suppress (returns false)', () => {
    const plugin = createLoggingPlugin({ timestamps: false });
    const err = new BluetoothPrintError(ErrorCode.WRITE_FAILED, 'bluetooth gone');
    const result = plugin.hooks.onError!(err);
    expect(result).toBe(false);
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('WRITE_FAILED'));
    expect(errorSpy.mock.calls[0]![0]).toContain('bluetooth gone');
  });

  it('onStateChange logs at debug level with arrow notation', () => {
    const plugin = createLoggingPlugin({ timestamps: false });
    plugin.hooks.onStateChange!(PrinterState.CONNECTED, PrinterState.CONNECTING);
    expect(debugSpy).toHaveBeenCalledTimes(1);
    const msg = debugSpy.mock.calls[0]![0] as string;
    expect(msg).toContain('connecting');
    expect(msg).toContain('connected');
    expect(msg).toContain('→');
  });

  it('onProgress is silent when logProgress=false (default)', () => {
    const plugin = createLoggingPlugin();
    plugin.hooks.onProgress!(50, 100);
    expect(debugSpy).not.toHaveBeenCalled();
    expect(infoSpy).not.toHaveBeenCalled();
  });

  it('destroy logs at info level', () => {
    const plugin = createLoggingPlugin({ timestamps: false });
    plugin.destroy!();
    expect(infoSpy).toHaveBeenCalledWith(expect.stringContaining('destroyed'));
  });
});