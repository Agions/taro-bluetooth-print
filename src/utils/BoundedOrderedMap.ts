/**
 * Bounded Ordered Map
 *
 * A `Map<K, V>` that enforces a maximum size, evicting the oldest entries
 * (by `value.createdAt`) when capacity is exceeded. The underlying ordered
 * index enables O(log n) insertion position lookup (binary search) and
 * O(k) eviction of the k oldest entries.
 *
 * @typeParam K - Key type
 * @typeParam V - Value type (must carry a `createdAt: number` for ordering)
 *
 * @example
 * ```typescript
 * const map = new BoundedOrderedMap<string, PrintHistoryEntry>(1000);
 * map.set('id-1', { id: 'id-1', createdAt: Date.now(), ... });
 * const entry = map.get('id-1');
 * map.size; // current entry count
 * ```
 */
export class BoundedOrderedMap<K, V extends { createdAt: number }> {
  private readonly entries = new Map<K, V>();
  private readonly orderedIds: Array<{ id: K; createdAt: number }> = [];

  constructor(private readonly maxEntries: number) {
    if (maxEntries < 1) {
      throw new RangeError('BoundedOrderedMap: maxEntries must be >= 1');
    }
  }

  /** Insert or update an entry. Triggers eviction if size exceeds maxEntries. */
  set(id: K, value: V): void {
    this.entries.set(id, value);
    const insertIdx = this.findInsertPosition(value.createdAt);
    this.orderedIds.splice(insertIdx, 0, { id, createdAt: value.createdAt });
    this.enforceMaxEntries();
  }

  get(id: K): V | undefined {
    return this.entries.get(id);
  }

  has(id: K): boolean {
    return this.entries.has(id);
  }

  delete(id: K): boolean {
    const removed = this.entries.delete(id);
    if (removed) {
      // O(n) scan; sizes are bounded so acceptable.
      const idx = this.orderedIds.findIndex(item => item.id === id);
      if (idx !== -1) this.orderedIds.splice(idx, 1);
    }
    return removed;
  }

  clear(): void {
    this.entries.clear();
    this.orderedIds.length = 0;
  }

  get size(): number {
    return this.entries.size;
  }

  get maxSize(): number {
    return this.maxEntries;
  }

  values(): IterableIterator<V> {
    return this.entries.values();
  }

  keys(): IterableIterator<K> {
    return this.entries.keys();
  }

  entriesIter(): IterableIterator<[K, V]> {
    return this.entries.entries();
  }

  /**
   * Re-sort the ordered index from the underlying entries. Call after bulk
   * mutations that bypass `set()` (e.g. restoring from persistence).
   */
  rebuildIndex(): void {
    this.orderedIds.length = 0;
    for (const [id, value] of this.entries) {
      this.orderedIds.push({ id, createdAt: value.createdAt });
    }
    this.orderedIds.sort((a, b) => a.createdAt - b.createdAt);
  }

  /** Trim oldest entries until size <= maxEntries. */
  private enforceMaxEntries(): void {
    const excess = this.entries.size - this.maxEntries;
    if (excess <= 0) return;
    // orderedIds is ascending by createdAt, so the first `excess` entries are the oldest.
    for (let i = 0; i < excess; i++) {
      const item = this.orderedIds[i];
      if (item) this.entries.delete(item.id);
    }
    this.orderedIds.splice(0, excess);
  }

  /** Binary search for the insertion position to keep orderedIds ascending. */
  private findInsertPosition(createdAt: number): number {
    let lo = 0;
    let hi = this.orderedIds.length;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      const midEntry = this.orderedIds[mid];
      if (midEntry && midEntry.createdAt <= createdAt) {
        lo = mid + 1;
      } else {
        hi = mid;
      }
    }
    return lo;
  }
}
