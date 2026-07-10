/**
 * Edge-case tests for src/utils/BoundedOrderedMap.ts
 *
 * Goals:
 *  - Cover the LRU-by-createdAt eviction path (enforceMaxEntries when capacity is exceeded).
 *  - Cover all collection primitives: get / has / delete / clear / size / maxSize.
 *  - Cover all iterators: keys / values / entriesIter.
 *  - Cover boundary conditions: empty map, single entry, full-then-overflow.
 *  - Cover `rebuildIndex` (re-sorts the ordered index from the underlying entries).
 *  - Cover the constructor guard (maxEntries < 1 throws RangeError).
 *  - Cover `set` updates: re-inserting an existing key keeps the map's size at 1.
 *
 * Target coverage: 90%+
 *
 * Note: BoundedOrderedMap does not implement wall-clock TTL. Aging is
 * capacity-driven (oldest entries by `createdAt` are evicted first).
 */
import { describe, test, expect } from 'vitest';
import { BoundedOrderedMap } from '../../src/utils/BoundedOrderedMap';

interface Item {
  createdAt: number;
  data: string;
}

const make = (createdAt: number, data = `payload-${createdAt}`): Item => ({ createdAt, data });

describe('BoundedOrderedMap', () => {
  describe('constructor', () => {
    test('creates a map with the given max size', () => {
      const m = new BoundedOrderedMap<string, Item>(10);
      expect(m.maxSize).toBe(10);
      expect(m.size).toBe(0);
    });

    test('throws RangeError when maxEntries is 0', () => {
      expect(() => new BoundedOrderedMap<string, Item>(0)).toThrow(RangeError);
      expect(() => new BoundedOrderedMap<string, Item>(0)).toThrow(
        'BoundedOrderedMap: maxEntries must be >= 1'
      );
    });

    test('throws RangeError when maxEntries is negative', () => {
      expect(() => new BoundedOrderedMap<string, Item>(-1)).toThrow(RangeError);
    });
  });

  describe('boundary: empty map', () => {
    test('size and maxSize on a fresh map', () => {
      const m = new BoundedOrderedMap<string, Item>(5);
      expect(m.size).toBe(0);
      expect(m.maxSize).toBe(5);
    });

    test('get/has return undefined/false for missing keys', () => {
      const m = new BoundedOrderedMap<string, Item>(5);
      expect(m.get('nope')).toBeUndefined();
      expect(m.has('nope')).toBe(false);
    });

    test('delete returns false for missing keys', () => {
      const m = new BoundedOrderedMap<string, Item>(5);
      expect(m.delete('nope')).toBe(false);
      expect(m.size).toBe(0);
    });

    test('keys/values/entriesIter all yield nothing on an empty map', () => {
      const m = new BoundedOrderedMap<string, Item>(5);
      expect([...m.keys()]).toEqual([]);
      expect([...m.values()]).toEqual([]);
      expect([...m.entriesIter()]).toEqual([]);
    });

    test('clear on an empty map is a no-op', () => {
      const m = new BoundedOrderedMap<string, Item>(5);
      expect(() => m.clear()).not.toThrow();
      expect(m.size).toBe(0);
    });
  });

  describe('boundary: single entry', () => {
    test('put/get/has with one item', () => {
      const m = new BoundedOrderedMap<string, Item>(5);
      m.set('a', make(1, 'first'));
      expect(m.size).toBe(1);
      expect(m.get('a')).toEqual({ createdAt: 1, data: 'first' });
      expect(m.has('a')).toBe(true);
    });

    test('delete the only entry leaves the map empty', () => {
      const m = new BoundedOrderedMap<string, Item>(5);
      m.set('a', make(1));
      expect(m.delete('a')).toBe(true);
      expect(m.size).toBe(0);
      expect(m.has('a')).toBe(false);
    });

    test('single-entry iterators yield the entry', () => {
      const m = new BoundedOrderedMap<string, Item>(5);
      m.set('a', make(1, 'first'));
      expect([...m.keys()]).toEqual(['a']);
      expect([...m.values()]).toEqual([{ createdAt: 1, data: 'first' }]);
      expect([...m.entriesIter()]).toEqual([['a', { createdAt: 1, data: 'first' }]]);
    });
  });

  describe('put / update semantics', () => {
    test('re-inserting an existing key keeps size at 1 and updates the value', () => {
      const m = new BoundedOrderedMap<string, Item>(5);
      m.set('a', make(1, 'first'));
      m.set('a', make(2, 'second'));
      expect(m.size).toBe(1);
      expect(m.get('a')).toEqual({ createdAt: 2, data: 'second' });
    });

    test('re-inserting updates the stored value while keeping the entry accessible', () => {
      const m = new BoundedOrderedMap<string, Item>(3);
      m.set('a', make(10, 'A-old'));
      m.set('b', make(20, 'B'));
      m.set('a', make(30, 'A-new')); // update
      expect(m.size).toBe(2);
      expect(m.get('a')).toEqual({ createdAt: 30, data: 'A-new' });
      expect(m.get('b')).toEqual({ createdAt: 20, data: 'B' });
    });
  });

  describe('LRU eviction (capacity overflow)', () => {
    test('overflowing by 1 evicts the oldest entry', () => {
      const m = new BoundedOrderedMap<string, Item>(3);
      m.set('a', make(1));
      m.set('b', make(2));
      m.set('c', make(3));
      m.set('d', make(4)); // overflow: evict 'a' (oldest)
      expect(m.size).toBe(3);
      expect(m.has('a')).toBe(false);
      expect(m.has('b')).toBe(true);
      expect(m.has('c')).toBe(true);
      expect(m.has('d')).toBe(true);
    });

    test('overflowing by N evicts the N oldest entries', () => {
      const m = new BoundedOrderedMap<string, Item>(3);
      m.set('a', make(1));
      m.set('b', make(2));
      m.set('c', make(3));
      m.set('d', make(4));
      m.set('e', make(5)); // another overflow: evict 'b'
      expect(m.size).toBe(3);
      expect(m.has('a')).toBe(false);
      expect(m.has('b')).toBe(false);
      expect(m.has('c')).toBe(true);
      expect(m.has('d')).toBe(true);
      expect(m.has('e')).toBe(true);
    });

    test('inserting at exact capacity does not evict', () => {
      const m = new BoundedOrderedMap<string, Item>(2);
      m.set('a', make(1));
      m.set('b', make(2));
      expect(m.size).toBe(2);
      expect(m.has('a')).toBe(true);
      expect(m.has('b')).toBe(true);
    });

    test('bulk overflow — capacity=1, latest write wins', () => {
      const m = new BoundedOrderedMap<string, Item>(1);
      m.set('a', make(1));
      m.set('b', make(2));
      expect(m.size).toBe(1);
      expect(m.has('a')).toBe(false);
      expect(m.has('b')).toBe(true);
    });

    test('eviction targets the entry with the smallest createdAt, regardless of insertion order', () => {
      const m = new BoundedOrderedMap<string, Item>(2);
      m.set('late', make(100));   // inserted first, but newest by age
      m.set('mid', make(50));
      m.set('early', make(1));    // oldest by age — should be evicted
      expect(m.size).toBe(2);
      expect(m.has('early')).toBe(false);
      expect(m.has('late')).toBe(true);
      expect(m.has('mid')).toBe(true);
    });
  });

  describe('delete / clear', () => {
    test('delete returns true once and false thereafter', () => {
      const m = new BoundedOrderedMap<string, Item>(5);
      m.set('a', make(1));
      m.set('b', make(2));
      expect(m.delete('a')).toBe(true);
      expect(m.delete('a')).toBe(false);
      expect(m.size).toBe(1);
      expect(m.has('b')).toBe(true);
    });

    test('clear empties both the entries map and the ordered index', () => {
      const m = new BoundedOrderedMap<string, Item>(5);
      m.set('a', make(1));
      m.set('b', make(2));
      m.set('c', make(3));
      m.clear();
      expect(m.size).toBe(0);
      expect([...m.keys()]).toEqual([]);
      // After clear, eviction must still work without error.
      m.set('d', make(4));
      expect(m.size).toBe(1);
      expect(m.get('d')).toEqual({ createdAt: 4, data: 'payload-4' });
    });
  });

  describe('iterators', () => {
    test('keys yields all stored keys in insertion order', () => {
      const m = new BoundedOrderedMap<string, Item>(5);
      m.set('a', make(1));
      m.set('b', make(2));
      m.set('c', make(3));
      expect([...m.keys()]).toEqual(['a', 'b', 'c']);
    });

    test('values yields all stored values', () => {
      const m = new BoundedOrderedMap<string, Item>(5);
      m.set('a', make(1, 'A'));
      m.set('b', make(2, 'B'));
      expect([...m.values()].map(v => v.data)).toEqual(['A', 'B']);
    });

    test('entriesIter yields [key, value] pairs', () => {
      const m = new BoundedOrderedMap<string, Item>(5);
      m.set('a', make(1, 'A'));
      m.set('b', make(2, 'B'));
      const entries = [...m.entriesIter()];
      expect(entries).toEqual([
        ['a', { createdAt: 1, data: 'A' }],
        ['b', { createdAt: 2, data: 'B' }],
      ]);
    });

    test('iterators respect a recent eviction', () => {
      const m = new BoundedOrderedMap<string, Item>(2);
      m.set('a', make(1));
      m.set('b', make(2));
      m.set('c', make(3)); // evicts 'a'
      expect([...m.keys()]).toEqual(['b', 'c']);
      expect([...m.entriesIter()].map(([k]) => k)).toEqual(['b', 'c']);
    });
  });

  describe('rebuildIndex', () => {
    test('rebuilds the ordered index from the underlying entries', () => {
      const m = new BoundedOrderedMap<string, Item>(5);
      m.set('a', make(10));
      m.set('b', make(5));
      m.set('c', make(20));
      m.rebuildIndex();
      // No-op observation: size unchanged, all entries still reachable.
      expect(m.size).toBe(3);
      expect(m.has('a')).toBe(true);
      expect(m.has('b')).toBe(true);
      expect(m.has('c')).toBe(true);
    });

    test('after rebuildIndex, the next overflow evicts by createdAt', () => {
      const m = new BoundedOrderedMap<string, Item>(2);
      m.set('a', make(10));
      m.set('b', make(5));
      m.rebuildIndex();
      // Now push the oldest (b:5) out via an overflow.
      m.set('c', make(1));  // older than both — evicted first
      expect(m.size).toBe(2);
      // 'c' had createdAt=1, the oldest in the set, so it should be evicted.
      expect(m.has('c')).toBe(false);
      expect(m.has('a')).toBe(true);
      expect(m.has('b')).toBe(true);
    });
  });
});
