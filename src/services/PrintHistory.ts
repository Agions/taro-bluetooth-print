/**
 * Print History Service
 *
 * Tracks all print jobs with timestamps, status, and metadata.
 * Provides querying and analytics capabilities.
 *
 * @example
 * ```typescript
 * const history = new PrintHistory();
 * history.addJob({ data, status: 'completed' });
 * const recentJobs = history.getRecent(10);
 * ```
 */

import { Logger } from '@/utils/logger';
import { PrintJobStatus, PrintJobPriority } from '@/queue/PrintQueue';

/**
 * Print history entry
 */
export interface PrintHistoryEntry {
  /** Unique entry ID */
  id: string;
  /** Job ID from PrintJobManager */
  jobId?: string;
  /** Print data size in bytes */
  dataSize: number;
  /** Job status */
  status: PrintJobStatus | 'unknown';
  /** Priority */
  priority: PrintJobPriority;
  /** Creation timestamp */
  createdAt: number;
  /** Start timestamp */
  startedAt?: number;
  /** Completion timestamp */
  completedAt?: number;
  /** Duration in milliseconds */
  duration?: number;
  /** Error message if failed */
  error?: string;
  /** Device ID */
  deviceId?: string;
  /** Device name */
  deviceName?: string;
  /** Metadata */
  metadata?: Record<string, unknown>;
}

/**
 * History statistics
 */
export interface PrintHistoryStats {
  /** Total jobs */
  total: number;
  /** Completed jobs */
  completed: number;
  /** Failed jobs */
  failed: number;
  /** Cancelled jobs */
  cancelled: number;
  /** Average duration in ms */
  avgDuration: number;
  /** Total bytes printed */
  totalBytes: number;
  /** Success rate */
  successRate: number;
}

/**
 * Query options for history
 */
export interface HistoryQueryOptions {
  /** Start date filter */
  startDate?: number;
  /** End date filter */
  endDate?: number;
  /** Status filter */
  status?: PrintJobStatus | PrintJobStatus[];
  /** Device ID filter */
  deviceId?: string;
  /** Limit results */
  limit?: number;
  /** Offset for pagination */
  offset?: number;
}

/**
 * Print History Service
 */
export class PrintHistory {
  private readonly logger = Logger.scope('PrintHistory');
  private readonly entries: Map<string, PrintHistoryEntry> = new Map();
  private counter = 0;
  /** Default maximum number of history entries */
  private static readonly DEFAULT_MAX_ENTRIES = 1000;

  private readonly maxEntries: number;

  /** Ordered index of entry IDs by createdAt (ascending) for fast pruning */
  private readonly orderedIds: { id: string; createdAt: number }[] = [];

  /**
   * Creates a new PrintHistory instance
   * @param maxEntries - Maximum number of entries to keep (default: 1000)
   */
  constructor(maxEntries = PrintHistory.DEFAULT_MAX_ENTRIES) {
    this.maxEntries = maxEntries;
  }

  /**
   * Add a new print job to history
   */
  addJob(params: {
    jobId?: string;
    data: Uint8Array;
    status: PrintJobStatus | 'unknown';
    priority?: PrintJobPriority;
    deviceId?: string;
    deviceName?: string;
    metadata?: Record<string, unknown>;
  }): string {
    const id = this.generateId();
    const now = Date.now();

    const entry: PrintHistoryEntry = {
      id,
      jobId: params.jobId,
      dataSize: params.data.length,
      status: params.status,
      priority: params.priority ?? PrintJobPriority.NORMAL,
      createdAt: now,
      deviceId: params.deviceId,
      deviceName: params.deviceName,
      metadata: params.metadata,
    };

    this.entries.set(id, entry);

    // Maintain the ordered index: insert at the correct position (ascending by createdAt)
    const insertIdx = this.findInsertPosition(now);
    this.orderedIds.splice(insertIdx, 0, { id, createdAt: now });

    this.enforceMaxEntries();

    this.logger.debug(`History entry added: ${id}`);
    return id;
  }

  /**
   * Update job status
   */
  updateJob(
    id: string,
    updates: Partial<{
      status: PrintJobStatus | 'unknown';
      startedAt: number;
      completedAt: number;
      error: string;
    }>
  ): void {
    const entry = this.entries.get(id);
    if (!entry) {
      this.logger.warn(`History entry not found: ${id}`);
      return;
    }

    Object.assign(entry, updates);

    if (updates.startedAt) {
      entry.startedAt = updates.startedAt;
    }

    if (updates.completedAt) {
      entry.completedAt = updates.completedAt;
      if (entry.startedAt) {
        entry.duration = updates.completedAt - entry.startedAt;
      }
    }

    if (updates.error) {
      entry.error = updates.error;
    }

    if (updates.status) {
      entry.status = updates.status;
    }

    this.logger.debug(`History entry updated: ${id}`);
  }

  /**
   * Get entry by ID
   */
  getEntry(id: string): PrintHistoryEntry | undefined {
    return this.entries.get(id);
  }

  /**
   * Get recent jobs
   */
  getRecent(count = 10): PrintHistoryEntry[] {
    return Array.from(this.entries.values())
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, count);
  }

  /**
   * Query history with filters
   */
  query(options: HistoryQueryOptions = {}): PrintHistoryEntry[] {
    let results = Array.from(this.entries.values());

    if (options.startDate) {
      const startDate = options.startDate;
      results = results.filter(e => e.createdAt >= startDate);
    }

    if (options.endDate) {
      const endDate = options.endDate;
      results = results.filter(e => e.createdAt <= endDate);
    }

    if (options.status) {
      const statuses = Array.isArray(options.status) ? options.status : [options.status];
      results = results.filter(e => statuses.includes(e.status as PrintJobStatus));
    }

    if (options.deviceId) {
      results = results.filter(e => e.deviceId === options.deviceId);
    }

    // Sort by creation date descending
    results.sort((a, b) => b.createdAt - a.createdAt);

    // Pagination
    if (options.offset) {
      results = results.slice(options.offset);
    }

    if (options.limit) {
      results = results.slice(0, options.limit);
    }

    return results;
  }

  /**
   * Get statistics
   */
  getStats(options?: { days?: number }): PrintHistoryStats {
    let entries = Array.from(this.entries.values());

    // Filter by days if specified
    if (options?.days) {
      const cutoff = Date.now() - options.days * 24 * 60 * 60 * 1000;
      entries = entries.filter(e => e.createdAt >= cutoff);
    }

    const completed = entries.filter(e => e.status === PrintJobStatus.COMPLETED);
    const failed = entries.filter(e => e.status === PrintJobStatus.FAILED || e.error);
    const cancelled = entries.filter(e => e.status === PrintJobStatus.CANCELLED);

    const totalDuration = completed
      .filter(e => e.duration !== undefined)
      .reduce((sum, e) => sum + (e.duration || 0), 0);

    const totalBytes = entries.reduce((sum, e) => sum + e.dataSize, 0);

    return {
      total: entries.length,
      completed: completed.length,
      failed: failed.length,
      cancelled: cancelled.length,
      avgDuration: completed.length > 0 ? totalDuration / completed.length : 0,
      totalBytes,
      successRate: entries.length > 0 ? (completed.length / entries.length) * 100 : 0,
    };
  }

  /**
   * Clear all history
   */
  clear(): void {
    this.entries.clear();
    this.orderedIds.length = 0;
    this.logger.info('Print history cleared');
  }

  /**
   * Export history as JSON
   */
  export(): string {
    return JSON.stringify(Array.from(this.entries.values()), null, 2);
  }

  /**
   * Import history from JSON
   */
  import(json: string): number {
    try {
      const data = JSON.parse(json) as PrintHistoryEntry[];
      let imported = 0;

      for (const entry of data) {
        if (entry.id && entry.dataSize) {
          this.entries.set(entry.id, entry);
          imported++;
        }
      }

      // Rebuild the ordered index after bulk import
      this.rebuildIndex();

      this.enforceMaxEntries();
      this.logger.info(`Imported ${imported} history entries`);
      return imported;
    } catch (error) {
      this.logger.error('Failed to import history:', error);
      return 0;
    }
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    this.counter++;
    return `history_${Date.now()}_${this.counter}`;
  }

  /**
   * Enforce maximum entries limit using the ordered index.
   * Instead of full-sorting, we use the pre-sorted index to find and remove the oldest entries.
   */
  private enforceMaxEntries(): void {
    if (this.entries.size <= this.maxEntries) {
      return;
    }

    const excess = this.entries.size - this.maxEntries;

    // The ordered index is ascending by createdAt, so the first `excess` entries are the oldest
    for (let i = 0; i < excess; i++) {
      const item = this.orderedIds[i];
      if (item) {
        this.entries.delete(item.id);
      }
    }

    // Remove the pruned entries from the ordered index
    this.orderedIds.splice(0, excess);

    this.logger.debug(`Pruned ${excess} old history entries`);
  }

  /**
   * Binary search to find the insertion position for a given timestamp
   * in the orderedIds array (ascending order).
   */
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

  /**
   * Rebuild the ordered index from the entries map.
   * Used after bulk operations like import.
   */
  private rebuildIndex(): void {
    this.orderedIds.length = 0;
    for (const [id, entry] of this.entries) {
      this.orderedIds.push({ id, createdAt: entry.createdAt });
    }
    this.orderedIds.sort((a, b) => a.createdAt - b.createdAt);
  }
}

// Export singleton instance
export const printHistory = new PrintHistory();
