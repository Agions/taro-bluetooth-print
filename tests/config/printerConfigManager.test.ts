/**
 * PrinterConfigManager export/import tests
 *
 * Covers the new (v2.15.4) versioned PrinterConfigSnapshot format:
 * - export() includes `format`, `exportedAt`, optional `source`
 * - import() throws on malformed JSON / missing fields / unsupported version
 * - import() with merge=false replaces; with merge=true unions
 * - per-entry validation rejects entries missing required fields
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  PrinterConfigManager,
  PRINTER_CONFIG_EXPORT_VERSION,
  type IConfigStorage,
  type SavedPrinter,
} from '@/config/PrinterConfigManager';
import { BluetoothPrintError, ErrorCode } from '@/errors/BaseError';

/** In-memory IConfigStorage for hermetic tests — no localStorage needed. */
class MemoryStorage implements IConfigStorage {
  private map = new Map<string, unknown>();
  get<T>(key: string, defaultValue: T): T {
    return this.map.has(key) ? (this.map.get(key) as T) : defaultValue;
  }
  set<T>(key: string, value: T): void {
    this.map.set(key, value);
  }
  remove(key: string): void {
    this.map.delete(key);
  }
  clear(): void {
    this.map.clear();
  }
}

function makePrinter(overrides: Partial<SavedPrinter> = {}): SavedPrinter {
  const now = Date.now();
  return {
    id: 'p1',
    deviceId: 'AA:BB:CC:DD:EE:FF',
    name: 'Test Printer',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe('PrinterConfigManager export/import', () => {
  let mgr: PrinterConfigManager;

  beforeEach(() => {
    mgr = new PrinterConfigManager(new MemoryStorage());
  });

  describe('export()', () => {
    it('produces a JSON string with format version', () => {
      const json = mgr.export();
      const parsed = JSON.parse(json);
      expect(parsed.format).toBe(PRINTER_CONFIG_EXPORT_VERSION);
      expect(typeof parsed.exportedAt).toBe('number');
      expect(Array.isArray(parsed.printers)).toBe(true);
      expect(parsed.globalConfig).toBeDefined();
    });

    it('records optional source identifier', () => {
      const parsed = JSON.parse(mgr.export('pos-terminal-01'));
      expect(parsed.source).toBe('pos-terminal-01');
    });

    it('omits source when not provided', () => {
      const parsed = JSON.parse(mgr.export());
      expect(parsed.source).toBeUndefined();
    });

    it('round-trips printers via export', () => {
      mgr.savePrinter(makePrinter({ id: 'p1', name: 'Kitchen' }));
      mgr.savePrinter(makePrinter({ id: 'p2', name: 'Bar', isDefault: true }));

      const parsed = JSON.parse(mgr.export());
      expect(parsed.printers).toHaveLength(2);
      expect(parsed.printers.find((p: SavedPrinter) => p.id === 'p2').isDefault).toBe(true);
    });
  });

  describe('import() — success paths', () => {
    it('round-trips a snapshot via export → import', () => {
      mgr.savePrinter(makePrinter({ id: 'p1', name: 'Kitchen' }));
      mgr.savePrinter(makePrinter({ id: 'p2', name: 'Bar', isDefault: true }));
      mgr.setLastUsed('p1');
      const json = mgr.export('device-A');

      const target = new PrinterConfigManager(new MemoryStorage());
      const result = target.import(json);

      expect(result.imported).toBe(2);
      expect(result.skipped).toBe(0);
      expect(result.format).toBe(PRINTER_CONFIG_EXPORT_VERSION);
      expect(target.getSavedPrinters()).toHaveLength(2);
      expect(target.getLastUsedId()).toBe('p1');
    });

    it('merge=true preserves existing printers not in snapshot', () => {
      mgr.savePrinter(makePrinter({ id: 'p1', name: 'A' }));
      const json = JSON.stringify({
        format: PRINTER_CONFIG_EXPORT_VERSION,
        exportedAt: Date.now(),
        printers: [makePrinter({ id: 'p2', name: 'B' })],
        globalConfig: mgr.getGlobalConfig(),
        lastUsedPrinterId: null,
      });

      const result = mgr.import(json, true);
      expect(result.imported).toBe(1);
      expect(mgr.getSavedPrinters()).toHaveLength(2);
      expect(mgr.getPrinter('p1')).toBeDefined();
      expect(mgr.getPrinter('p2')).toBeDefined();
    });

    it('merge=false (default) replaces existing printers', () => {
      mgr.savePrinter(makePrinter({ id: 'p1', name: 'A' }));
      const json = JSON.stringify({
        format: PRINTER_CONFIG_EXPORT_VERSION,
        exportedAt: Date.now(),
        printers: [makePrinter({ id: 'p2', name: 'B' })],
        globalConfig: mgr.getGlobalConfig(),
        lastUsedPrinterId: null,
      });

      const result = mgr.import(json);
      expect(result.imported).toBe(1);
      expect(mgr.getSavedPrinters()).toHaveLength(1);
      expect(mgr.getPrinter('p1')).toBeUndefined();
      expect(mgr.getPrinter('p2')).toBeDefined();
    });
  });

  describe('import() — validation failures', () => {
    it('throws on empty string', () => {
      expect(() => mgr.import('')).toThrow(BluetoothPrintError);
    });

    it('throws on malformed JSON', () => {
      expect(() => mgr.import('not json {')).toThrow(/Failed to parse JSON/);
    });

    it('throws when root is not an object', () => {
      expect(() => mgr.import('"a string"')).toThrow(/JSON object/);
    });

    it('throws when format field is missing', () => {
      const json = JSON.stringify({ printers: [], globalConfig: {}, lastUsedPrinterId: null });
      expect(() => mgr.import(json)).toThrow(/format/);
    });

    it('throws on future format version', () => {
      const json = JSON.stringify({
        format: PRINTER_CONFIG_EXPORT_VERSION + 10,
        exportedAt: Date.now(),
        printers: [],
        globalConfig: {},
        lastUsedPrinterId: null,
      });
      expect(() => mgr.import(json)).toThrow(/newer than supported/);
    });

    it('skips invalid printer entries without throwing', () => {
      const json = JSON.stringify({
        format: PRINTER_CONFIG_EXPORT_VERSION,
        exportedAt: Date.now(),
        printers: [
          makePrinter({ id: 'valid-1' }),
          { id: 'broken' /* missing deviceId, name, timestamps */ },
          makePrinter({ id: 'valid-2' }),
        ],
        globalConfig: mgr.getGlobalConfig(),
        lastUsedPrinterId: null,
      });
      const result = mgr.import(json);
      expect(result.imported).toBe(2);
      expect(result.skipped).toBe(1);
      expect(mgr.getPrinter('broken')).toBeUndefined();
      expect(mgr.getPrinter('valid-1')).toBeDefined();
      expect(mgr.getPrinter('valid-2')).toBeDefined();
    });

    it('error code is INVALID_CONFIGURATION', () => {
      try {
        mgr.import('{}');
      } catch (e) {
        expect(e).toBeInstanceOf(BluetoothPrintError);
        expect((e as BluetoothPrintError).code).toBe(ErrorCode.INVALID_CONFIGURATION);
      }
    });
  });

  describe('backward-compat with snapshot from older version', () => {
    it('accepts format === current version', () => {
      const json = JSON.stringify({
        format: PRINTER_CONFIG_EXPORT_VERSION,
        exportedAt: 0,
        printers: [],
        globalConfig: mgr.getGlobalConfig(),
        lastUsedPrinterId: null,
      });
      const result = mgr.import(json);
      expect(result.format).toBe(PRINTER_CONFIG_EXPORT_VERSION);
    });
  });
});