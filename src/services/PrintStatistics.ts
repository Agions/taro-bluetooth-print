/**
 * Print Statistics Service
 *
 * Tracks and aggregates print job statistics including success rates,
 * performance metrics, and breakdowns by date/driver.
 *
 * @example
 * ```typescript
 * const stats = new PrintStatistics();
 * stats.trackJobStart('job-1', { driver: 'EscPos' });
 * stats.trackJobComplete('job-1', 1024, 500);
 * const report = stats.getStatistics();
 * const json = stats.exportToJSON();
 * ```
 */

import { Logger } from '@/utils/logger';

/**
 * Print statistics data interface (returned by getStatistics)
 */
export interface PrintStatisticsData {
  /** Total jobs submitted */
  totalJobs: number;
  /** Successfully completed jobs */
  completedJobs: number;
  /** Failed jobs */
  failedJobs: number;
  /** Cancelled jobs */
  cancelledJobs: number;
  /** Total bytes printed */
  totalBytes: number;
  /** Average print time in milliseconds */
  averagePrintTime: number;
  /** Success rate (0-1) */
  successRate: number;
  /** Breakdown by date (YYYY-MM-DD) */
  byDate: Record<string, { completed: number; failed: number }>;
  /** Breakdown by driver name */
  byDriver: Record<string, { completed: number; failed: number }>;
}

/**
 * Job tracking metadata
 */
export interface JobTrackingMeta {
  /** Driver name */
  driver?: string;
  /** Device ID */
  deviceId?: string;
  /** Device name */
  deviceName?: string;
  /** Priority */
  priority?: number;
  /** Additional metadata */
  [key: string]: unknown;
}

/**
 * Internal job record
 */
interface JobRecord {
  id: string;
  status: 'started' | 'completed' | 'failed' | 'cancelled';
  startedAt: number;
  completedAt?: number;
  bytes?: number;
  duration?: number;
  error?: string;
  driver?: string;
  deviceId?: string;
  deviceName?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Print Statistics Service
 *
 * Collects and aggregates print job metrics for analytics and monitoring.
 * Provides breakdown by date and driver for detailed reporting.
 */
export class PrintStatistics {
  private readonly logger = Logger.scope('PrintStatistics');

  /** Internal job records map */
  private readonly jobs: Map<string, JobRecord> = new Map();

  /** Statistics counters */
  private totalJobs = 0;
  private completedJobs = 0;
  private failedJobs = 0;
  private cancelledJobs = 0;
  private totalBytes = 0;
  private totalPrintTime = 0;

  /** Date-based breakdown: YYYY-MM-DD -> { completed, failed } */
  private byDate: Record<string, { completed: number; failed: number }> = {};

  /** Driver-based breakdown: driverName -> { completed, failed } */
  private byDriver: Record<string, { completed: number; failed: number }> = {};

  /**
   * Track a job start event
   *
   * @param jobId - Unique job identifier
   * @param metadata - Optional job metadata (driver, device info, etc.)
   */
  trackJobStart(jobId: string, metadata?: JobTrackingMeta): void {
    const now = Date.now();
    const record: JobRecord = {
      id: jobId,
      status: 'started',
      startedAt: now,
      driver: metadata?.driver,
      deviceId: metadata?.deviceId,
      deviceName: metadata?.deviceName,
      metadata: metadata as Record<string, unknown>,
    };

    this.jobs.set(jobId, record);
    this.totalJobs++;

    this.logger.debug(`Job started tracked: ${jobId}`);
  }

  /**
   * Track a job completion event
   *
   * @param jobId - Unique job identifier
   * @param bytes - Number of bytes printed
   * @param duration - Print duration in milliseconds
   */
  trackJobComplete(jobId: string, bytes: number, duration: number): void {
    const record = this.jobs.get(jobId);
    const now = Date.now();

    if (!record) {
      // Orphan completion event - create minimal record
      const newRecord: JobRecord = {
        id: jobId,
        status: 'completed',
        startedAt: now - duration,
        completedAt: now,
        bytes,
        duration,
      };
      this.jobs.set(jobId, newRecord);
      this.totalJobs++;
      this.completedJobs++;
      this.totalBytes += bytes;
      this.totalPrintTime += duration;
      this.logger.warn(`Orphan completion tracked for job: ${jobId}`);
    } else {
      record.status = 'completed';
      record.completedAt = now;
      record.bytes = bytes;
      record.duration = duration;

      this.completedJobs++;
      this.totalBytes += bytes;
      this.totalPrintTime += duration;

      // Update driver breakdown
      if (record.driver) {
        if (!this.byDriver[record.driver]) {
          this.byDriver[record.driver] = { completed: 0, failed: 0 };
        }
        this.byDriver[record.driver]!.completed++;
      }

      // Update date breakdown
      const dateKey = this.formatDateKey(now);
      if (!this.byDate[dateKey]) {
        this.byDate[dateKey] = { completed: 0, failed: 0 };
      }
      this.byDate[dateKey].completed++;

      this.logger.debug(`Job completed tracked: ${jobId}, ${bytes} bytes, ${duration}ms`);
    }
  }

  /**
   * Track a job failure event
   *
   * @param jobId - Unique job identifier
   * @param error - Error message or error object
   */
  trackJobFail(jobId: string, error: unknown): void {
    const record = this.jobs.get(jobId);
    const now = Date.now();

    if (!record) {
      // Orphan failure event - create minimal record
      const newRecord: JobRecord = {
        id: jobId,
        status: 'failed',
        startedAt: now,
        completedAt: now,
        error: this.formatError(error),
      };
      this.jobs.set(jobId, newRecord);
      this.totalJobs++;
      this.failedJobs++;
      this.logger.warn(`Orphan failure tracked for job: ${jobId}`);
    } else {
      record.status = 'failed';
      record.completedAt = now;
      record.error = this.formatError(error);

      this.failedJobs++;

      // Update driver breakdown
      if (record.driver) {
        if (!this.byDriver[record.driver]) {
          this.byDriver[record.driver] = { completed: 0, failed: 0 };
        }
        this.byDriver[record.driver]!.failed++;
      }

      // Update date breakdown
      const dateKey = this.formatDateKey(now);
      if (!this.byDate[dateKey]) {
        this.byDate[dateKey] = { completed: 0, failed: 0 };
      }
      this.byDate[dateKey].failed++;

      this.logger.debug(`Job failure tracked: ${jobId}, error: ${record.error}`);
    }
  }

  /**
   * Track a job cancellation event
   *
   * @param jobId - Unique job identifier
   */
  trackJobCancel(jobId: string): void {
    const record = this.jobs.get(jobId);
    const now = Date.now();

    if (!record) {
      // Orphan cancellation event
      const newRecord: JobRecord = {
        id: jobId,
        status: 'cancelled',
        startedAt: now,
        completedAt: now,
      };
      this.jobs.set(jobId, newRecord);
      this.totalJobs++;
      this.cancelledJobs++;
      this.logger.warn(`Orphan cancellation tracked for job: ${jobId}`);
    } else {
      record.status = 'cancelled';
      record.completedAt = now;
      this.cancelledJobs++;
      this.logger.debug(`Job cancellation tracked: ${jobId}`);
    }
  }

  /**
   * Get current statistics
   *
   * @returns Complete statistics object
   */
  getStatistics(): PrintStatisticsData {
    const completedOrFailed = this.completedJobs + this.failedJobs;
    const successRate = completedOrFailed > 0 ? this.completedJobs / completedOrFailed : 0;

    const averagePrintTime = this.completedJobs > 0 ? this.totalPrintTime / this.completedJobs : 0;

    return {
      totalJobs: this.totalJobs,
      completedJobs: this.completedJobs,
      failedJobs: this.failedJobs,
      cancelledJobs: this.cancelledJobs,
      totalBytes: this.totalBytes,
      averagePrintTime,
      successRate,
      byDate: { ...this.byDate },
      byDriver: { ...this.byDriver },
    };
  }

  /**
   * Export statistics as JSON string
   *
   * @param pretty - Whether to format with indentation (default: true)
   * @returns JSON string representation
   */
  exportToJSON(pretty = true): string {
    const stats = this.getStatistics();
    return pretty ? JSON.stringify(stats, null, 2) : JSON.stringify(stats);
  }

  /**
   * Import statistics from JSON string
   *
   * @param json - JSON string to import
   * @returns Number of records imported
   */
  importFromJSON(json: string): number {
    try {
      const data = JSON.parse(json) as PrintStatistics;
      let imported = 0;

      if (typeof data.totalJobs === 'number') {
        this.totalJobs = data.totalJobs;
        imported++;
      }
      if (typeof data.completedJobs === 'number') {
        this.completedJobs = data.completedJobs;
        imported++;
      }
      if (typeof data.failedJobs === 'number') {
        this.failedJobs = data.failedJobs;
        imported++;
      }
      if (typeof data.cancelledJobs === 'number') {
        this.cancelledJobs = data.cancelledJobs;
        imported++;
      }
      if (typeof data.totalBytes === 'number') {
        this.totalBytes = data.totalBytes;
        imported++;
      }
      if (typeof data.totalPrintTime === 'number') {
        this.totalPrintTime = data.totalPrintTime;
        imported++;
      }
      if (data.byDate) {
        this.byDate = { ...data.byDate };
        imported++;
      }
      if (data.byDriver) {
        this.byDriver = { ...data.byDriver };
        imported++;
      }

      this.logger.info(`Imported statistics from JSON, ${imported} fields restored`);
      return imported;
    } catch (error) {
      this.logger.error('Failed to import statistics from JSON:', error);
      return 0;
    }
  }

  /**
   * Get statistics for a specific date range
   *
   * @param startDate - Start date (timestamp or Date)
   * @param endDate - End date (timestamp or Date)
   * @returns Filtered statistics
   */
  getStatisticsByDateRange(startDate: Date | number, endDate: Date | number): PrintStatisticsData {
    const start = typeof startDate === 'number' ? startDate : startDate.getTime();
    const end = typeof endDate === 'number' ? endDate : endDate.getTime();

    const filteredJobs = Array.from(this.jobs.values()).filter(
      job => job.startedAt >= start && job.startedAt <= end
    );

    let completed = 0;
    let failed = 0;
    let cancelled = 0;
    let bytes = 0;
    let printTime = 0;

    for (const job of filteredJobs) {
      switch (job.status) {
        case 'completed':
          completed++;
          bytes += job.bytes ?? 0;
          printTime += job.duration ?? 0;
          break;
        case 'failed':
          failed++;
          break;
        case 'cancelled':
          cancelled++;
          break;
      }
    }

    const total = filteredJobs.length;
    const completedOrFailed = completed + failed;
    const successRate = completedOrFailed > 0 ? completed / completedOrFailed : 0;
    const averagePrintTime = completed > 0 ? printTime / completed : 0;

    return {
      totalJobs: total,
      completedJobs: completed,
      failedJobs: failed,
      cancelledJobs: cancelled,
      totalBytes: bytes,
      averagePrintTime,
      successRate,
      byDate: this.aggregateByDate(filteredJobs),
      byDriver: this.aggregateByDriver(filteredJobs),
    };
  }

  /**
   * Get breakdown by date
   *
   * @returns Date-based breakdown object
   */
  getByDate(): Record<string, { completed: number; failed: number }> {
    return { ...this.byDate };
  }

  /**
   * Get breakdown by driver
   *
   * @returns Driver-based breakdown object
   */
  getByDriver(): Record<string, { completed: number; failed: number }> {
    return { ...this.byDriver };
  }

  /**
   * Reset all statistics
   */
  reset(): void {
    this.jobs.clear();
    this.totalJobs = 0;
    this.completedJobs = 0;
    this.failedJobs = 0;
    this.cancelledJobs = 0;
    this.totalBytes = 0;
    this.totalPrintTime = 0;
    this.byDate = {};
    this.byDriver = {};
    this.logger.info('Statistics reset');
  }

  /**
   * Get job record by ID
   *
   * @param jobId - Job identifier
   * @returns Job record or undefined
   */
  getJobRecord(jobId: string): JobRecord | undefined {
    return this.jobs.get(jobId);
  }

  // Private helpers

  private formatDateKey(timestamp: number): string {
    const d = new Date(timestamp);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private formatError(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    if (typeof error === 'string') {
      return error;
    }
    return String(error);
  }

  private aggregateByDate(
    jobs: JobRecord[]
  ): Record<string, { completed: number; failed: number }> {
    const result: Record<string, { completed: number; failed: number }> = {};
    for (const job of jobs) {
      const dateKey = this.formatDateKey(job.startedAt);
      if (!result[dateKey]) {
        result[dateKey] = { completed: 0, failed: 0 };
      }
      if (job.status === 'completed') {
        result[dateKey].completed++;
      } else if (job.status === 'failed') {
        result[dateKey].failed++;
      }
    }
    return result;
  }

  private aggregateByDriver(
    jobs: JobRecord[]
  ): Record<string, { completed: number; failed: number }> {
    const result: Record<string, { completed: number; failed: number }> = {};
    for (const job of jobs) {
      if (!job.driver) continue;
      if (!result[job.driver]) {
        result[job.driver] = { completed: 0, failed: 0 };
      }
      if (job.status === 'completed') {
        result[job.driver]!.completed++;
      } else if (job.status === 'failed') {
        result[job.driver]!.failed++;
      }
    }
    return result;
  }
}

/** Singleton instance for convenience */
export const printStatistics = new PrintStatistics();
