/**
 * PrintScheduler - Scheduled printing service
 * Supports one-time scheduling, repeat intervals, and cron expressions
 */

import { EventEmitter } from '../core/EventEmitter';
import { generateUUID } from '../utils/uuid';
import { normalizeError } from '../utils/normalizeError';
import { BluetoothPrintError, ErrorCode } from '@/errors/baseError';

export interface ScheduledPrint {
  id: string;
  name: string;
  cronExpression?: string;
  onceAt?: number;
  repeatInterval?: number;
  printerId?: string;
  templateData: Record<string, unknown>;
  templateId?: string;
  status: 'active' | 'paused' | 'completed' | 'failed';
  nextRunTime?: number;
  lastRunTime?: number;
  totalRuns: number;
  maxRuns?: number;
  createdAt: number;
  updatedAt: number;
}

export interface ScheduleOptions {
  name: string;
  cronExpression?: string;
  onceAt?: Date | number;
  repeatInterval?: number;
  printerId?: string;
  templateData: Record<string, unknown>;
  templateId?: string;
  maxRuns?: number;
}

export interface ScheduleEvents {
  'will-execute': ScheduledPrint;
  executed: { job: ScheduledPrint; success: boolean; error?: Error };
  'next-run': { job: ScheduledPrint; runTime: number };
  completed: ScheduledPrint;
  failed: { job: ScheduledPrint; error: Error };
}

/**
 * Parse cron expression (simplified, 5-field format)
 * Format: min hour day month weekday
 */
export function parseCronExpression(cron: string): {
  minutes: number[];
  hours: number[];
  daysOfMonth: number[];
  months: number[];
  daysOfWeek: number[];
} {
  const parts = cron.trim().split(/\s+/);
  if (parts.length !== 5) {
    throw new BluetoothPrintError(ErrorCode.INVALID_CONFIGURATION, 'Invalid cron expression');
  }

  const [minPart, hourPart, dayPart, monthPart, dowPart] = parts as [
    string,
    string,
    string,
    string,
    string,
  ];

  const parseField = (field: string, min: number, max: number): number[] => {
    if (field === '*') {
      return Array.from({ length: max - min + 1 }, (_, i) => min + i);
    }

    const result: number[] = [];
    const stepMatch = field.match(/^\*\/(\d+)$/);
    if (stepMatch && stepMatch[1]) {
      const step = parseInt(stepMatch[1], 10);
      for (let i = min; i <= max; i += step) {
        result.push(i);
      }
      return result;
    }

    const rangeMatch = field.match(/^(\d+)-(\d+)$/);
    if (rangeMatch && rangeMatch[1] && rangeMatch[2]) {
      const start = parseInt(rangeMatch[1], 10);
      const end = parseInt(rangeMatch[2], 10);
      for (let i = start; i <= end; i++) {
        result.push(i);
      }
      return result;
    }

    const listMatch = field.match(/^(\d+(?:,\d+)*)$/);
    if (listMatch && listMatch[1]) {
      return listMatch[1].split(',').map(n => parseInt(n, 10));
    }

    const single = parseInt(field, 10);
    if (!isNaN(single)) {
      return [single];
    }

    return [];
  };

  return {
    minutes: parseField(minPart, 0, 59),
    hours: parseField(hourPart, 0, 23),
    daysOfMonth: parseField(dayPart, 1, 31),
    months: parseField(monthPart, 1, 12),
    daysOfWeek: parseField(dowPart, 0, 6),
  };
}

export function getNextCronRun(cron: string, fromTime: number = Date.now()): number {
  const parts = parseCronExpression(cron);

  // Pre-sort for binary search and compute max values
  const sortedMinutes = [...parts.minutes].sort((a, b) => a - b);
  const sortedHours = [...parts.hours].sort((a, b) => a - b);
  const sortedMonths = [...parts.months].sort((a, b) => a - b);
  const sortedDaysOfMonth = [...parts.daysOfMonth].sort((a, b) => a - b);

  const minMinute = sortedMinutes[0] ?? 0;
  const minHour = sortedHours[0] ?? 0;
  const minMonth = sortedMonths[0] ?? 1;
  const maxDay = sortedDaysOfMonth[sortedDaysOfMonth.length - 1] ?? 31;

  // Convert to Sets for O(1) lookup
  const minuteSet = new Set(parts.minutes);
  const hourSet = new Set(parts.hours);
  const monthSet = new Set(parts.months);
  const dayOfMonthSet = new Set(parts.daysOfMonth);
  const dayOfWeekSet = new Set(parts.daysOfWeek);

  /**
   * Find the next value in a sorted array that is >= the target.
   * Returns the found value, or null if no such value exists.
   */
  const findNextValue = (sortedArr: number[], target: number): number | null => {
    let lo = 0;
    let hi = sortedArr.length - 1;
    let result: number | null = null;
    while (lo <= hi) {
      const mid = (lo + hi) >>> 1;
      const midVal = sortedArr[mid];
      if (midVal !== undefined && midVal >= target) {
        result = midVal;
        hi = mid - 1;
      } else {
        lo = mid + 1;
      }
    }
    return result;
  };

  // Smart jump algorithm: instead of iterating minute-by-minute, skip to next valid value at each level
  const date = new Date(fromTime);
  date.setSeconds(0, 0);
  date.setMinutes(date.getMinutes() + 1);

  const maxIterations = 525600;
  for (let i = 0; i < maxIterations; i++) {
    const currentMonth = date.getMonth() + 1;

    // Skip to next valid month
    if (!monthSet.has(currentMonth)) {
      const nextMonth = findNextValue(sortedMonths, currentMonth);
      if (nextMonth !== null) {
        date.setMonth(nextMonth - 1, 1);
        date.setHours(0, 0, 0, 0);
      } else {
        // Wrap to next year's first valid month
        date.setFullYear(date.getFullYear() + 1, minMonth - 1, 1);
        date.setHours(0, 0, 0, 0);
      }
      continue;
    }

    const dayOfMonth = date.getDate();
    const dayOfWeek = date.getDay();

    // Skip to next valid day of month
    if (!dayOfMonthSet.has(dayOfMonth) || !dayOfWeekSet.has(dayOfWeek)) {
      if (dayOfMonth > maxDay || (!dayOfWeekSet.has(dayOfWeek) && dayOfMonth >= 28)) {
        // Past max valid day, move to next month
        date.setMonth(date.getMonth() + 1, 1);
        date.setHours(0, 0, 0, 0);
      } else {
        date.setDate(date.getDate() + 1);
        date.setHours(0, 0, 0, 0);
      }
      continue;
    }

    const hour = date.getHours();

    // Skip to next valid hour
    if (!hourSet.has(hour)) {
      const nextHour = findNextValue(sortedHours, hour);
      if (nextHour !== null) {
        date.setHours(nextHour, 0, 0, 0);
      } else {
        // No more valid hours today, move to next day
        date.setDate(date.getDate() + 1);
        date.setHours(minHour, 0, 0, 0);
      }
      continue;
    }

    const minute = date.getMinutes();

    // Skip to next valid minute
    if (!minuteSet.has(minute)) {
      const nextMinute = findNextValue(sortedMinutes, minute);
      if (nextMinute !== null) {
        date.setMinutes(nextMinute, 0, 0);
      } else {
        // No more valid minutes this hour, advance to next hour
        const nextH = findNextValue(sortedHours, hour + 1);
        if (nextH !== null) {
          date.setHours(nextH, minMinute, 0, 0);
        } else {
          // No more valid hours today, move to next day
          date.setDate(date.getDate() + 1);
          date.setHours(minHour, minMinute, 0, 0);
        }
      }
      continue;
    }

    // All fields match
    return date.getTime();
  }

  throw new BluetoothPrintError(
    ErrorCode.INVALID_CONFIGURATION,
    'Cannot find next run time within one year'
  );
}

export function getNextIntervalRun(interval: number, fromTime: number = Date.now()): number {
  return fromTime + interval;
}

export class PrintScheduler extends EventEmitter<ScheduleEvents> {
  private jobs: Map<string, ScheduledPrint> = new Map();
  private timer: ReturnType<typeof setTimeout> | null = null;
  private isRunning: boolean = false;
  private onPrintExecute?: (job: ScheduledPrint) => Promise<void>;
  private persistKey: string = 'print-scheduler-jobs';
  private persistTimer: ReturnType<typeof setTimeout> | null = null;
  private static readonly PERSIST_DEBOUNCE_MS = 500;

  constructor() {
    super();
    this.restoreJobs();
  }

  setPrintExecutor(executor: (job: ScheduledPrint) => Promise<void>): void {
    this.onPrintExecute = executor;
  }

  scheduleOnce(
    options: Omit<ScheduleOptions, 'cronExpression' | 'repeatInterval'>
  ): ScheduledPrint {
    const { onceAt, ...rest } = options;
    const executeAt = onceAt instanceof Date ? onceAt.getTime() : onceAt;

    if (!executeAt || executeAt <= Date.now()) {
      throw new BluetoothPrintError(
        ErrorCode.INVALID_CONFIGURATION,
        'onceAt must be a future date'
      );
    }

    const job: ScheduledPrint = {
      id: generateUUID(),
      name: rest.name,
      onceAt: executeAt,
      templateData: rest.templateData,
      templateId: rest.templateId,
      printerId: rest.printerId,
      status: 'active',
      nextRunTime: executeAt,
      totalRuns: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.addJob(job);
    return job;
  }

  scheduleRepeat(options: Omit<ScheduleOptions, 'onceAt'>): ScheduledPrint {
    const { cronExpression, repeatInterval, ...rest } = options;

    if (!cronExpression && !repeatInterval) {
      throw new BluetoothPrintError(
        ErrorCode.INVALID_CONFIGURATION,
        'Either cronExpression or repeatInterval is required'
      );
    }

    const job: ScheduledPrint = {
      id: generateUUID(),
      name: rest.name,
      cronExpression,
      repeatInterval,
      templateData: rest.templateData,
      templateId: rest.templateId,
      printerId: rest.printerId,
      status: 'active',
      totalRuns: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    if (job.cronExpression) {
      job.nextRunTime = getNextCronRun(job.cronExpression);
    } else if (job.repeatInterval) {
      job.nextRunTime = getNextIntervalRun(job.repeatInterval);
    }

    this.addJob(job);
    return job;
  }

  scheduleCron(options: ScheduleOptions): ScheduledPrint {
    return this.scheduleRepeat(options);
  }

  private addJob(job: ScheduledPrint): void {
    this.jobs.set(job.id, job);
    this.persistJobs();
    this.scheduleNext();
    this.emit('next-run', { job, runTime: job.nextRunTime! });
  }

  cancel(jobId: string): boolean {
    const job = this.jobs.get(jobId);
    if (!job) return false;
    job.status = 'completed';
    this.jobs.delete(jobId);
    this.persistJobs();
    return true;
  }

  pause(jobId: string): boolean {
    const job = this.jobs.get(jobId);
    if (!job || job.status !== 'active') return false;
    job.status = 'paused';
    job.updatedAt = Date.now();
    this.persistJobs();
    return true;
  }

  resume(jobId: string): boolean {
    const job = this.jobs.get(jobId);
    if (!job || job.status !== 'paused') return false;

    if (job.cronExpression) {
      job.nextRunTime = getNextCronRun(job.cronExpression);
    } else if (job.repeatInterval) {
      job.nextRunTime = Date.now() + job.repeatInterval;
    }

    job.status = 'active';
    job.updatedAt = Date.now();
    this.persistJobs();
    this.scheduleNext();
    return true;
  }

  update(
    jobId: string,
    updates: Partial<Pick<ScheduledPrint, 'name' | 'templateData' | 'printerId'>>
  ): boolean {
    const job = this.jobs.get(jobId);
    if (!job) return false;

    if (updates.name !== undefined) job.name = updates.name;
    if (updates.templateData !== undefined) job.templateData = updates.templateData;
    if (updates.printerId !== undefined) job.printerId = updates.printerId;
    job.updatedAt = Date.now();

    this.persistJobs();
    return true;
  }

  getAllJobs(): ScheduledPrint[] {
    return Array.from(this.jobs.values());
  }

  getActiveJobs(): ScheduledPrint[] {
    return this.getAllJobs().filter(j => j.status === 'active');
  }

  getJob(jobId: string): ScheduledPrint | undefined {
    return this.jobs.get(jobId);
  }

  getUpcomingJobs(limit: number = 10): ScheduledPrint[] {
    return this.getActiveJobs()
      .filter((j): j is ScheduledPrint & { nextRunTime: number } => !!j.nextRunTime)
      .sort((a, b) => a.nextRunTime - b.nextRunTime)
      .slice(0, limit);
  }

  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.scheduleNext();
  }

  stop(): void {
    this.isRunning = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  private scheduleNext(): void {
    if (!this.isRunning) return;

    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    const nextJob = this.getActiveJobs()
      .filter((j): j is ScheduledPrint & { nextRunTime: number } => !!j.nextRunTime)
      .sort((a, b) => a.nextRunTime - b.nextRunTime)[0];

    if (!nextJob) return;

    const delay = nextJob.nextRunTime - Date.now();
    if (delay <= 0) {
      void this.executeJob(nextJob);
      return;
    }

    this.timer = setTimeout(
      () => {
        void this.executeJob(nextJob);
      },
      Math.min(delay, 2147483647)
    );
  }

  private async executeJob(job: ScheduledPrint): Promise<void> {
    if (!this.isRunning || job.status !== 'active') return;

    this.emit('will-execute', job);

    try {
      if (this.onPrintExecute) {
        await this.onPrintExecute(job);
      }

      job.lastRunTime = Date.now();
      job.totalRuns++;
      job.updatedAt = Date.now();

      if (job.maxRuns && job.totalRuns >= job.maxRuns) {
        job.status = 'completed';
        this.jobs.delete(job.id);
        this.emit('completed', job);
      } else if (job.cronExpression) {
        job.nextRunTime = getNextCronRun(job.cronExpression);
      } else if (job.repeatInterval) {
        job.nextRunTime = Date.now() + job.repeatInterval;
      } else if (job.onceAt) {
        job.status = 'completed';
        this.jobs.delete(job.id);
        this.emit('completed', job);
      }

      this.persistJobs();
      this.emit('executed', { job, success: true });
    } catch (error) {
      job.status = 'failed';
      job.updatedAt = Date.now();
      this.persistJobs();
      this.emit('executed', { job, success: false, error: normalizeError(error) });
      this.emit('failed', { job, error: normalizeError(error) });
    }

    if (job.status === 'active' && job.nextRunTime) {
      this.scheduleNext();
      this.emit('next-run', { job, runTime: job.nextRunTime });
    }
  }

  private persistJobs(): void {
    if (this.persistTimer) {
      clearTimeout(this.persistTimer);
    }
    this.persistTimer = setTimeout(() => {
      this.persistTimer = null;
      try {
        const data = JSON.stringify(Array.from(this.jobs.entries()));
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(this.persistKey, data);
        }
      } catch {
        // Persist errors are non-critical — the in-memory job list remains functional;
        // persistence is only for crash-recovery convenience across app restarts
      }
      // If jobs map is now empty, ensure the persisted state reflects that
      // (handled by the next call or stop())
    }, PrintScheduler.PERSIST_DEBOUNCE_MS);
  }

  private restoreJobs(): void {
    try {
      if (typeof localStorage === 'undefined') return;
      const data = localStorage.getItem(this.persistKey);
      if (data) {
        const entries = JSON.parse(data) as [string, ScheduledPrint][];
        for (const [id, job] of entries) {
          if (job.status === 'completed') continue;
          if (job.onceAt && job.onceAt < Date.now()) continue;
          if (job.cronExpression && job.nextRunTime && job.nextRunTime < Date.now()) {
            job.nextRunTime = getNextCronRun(job.cronExpression);
          }
          if (!job.nextRunTime) continue;
          this.jobs.set(id, job);
        }
      }
    } catch {
      // Restore errors from corrupted/missing localStorage are non-critical;
      // the system initializes with an empty job list and continues normally — no data loss
    }
  }

  clear(): void {
    this.stop();
    this.jobs.clear();
    this.flushPersist();
  }

  private flushPersist(): void {
    if (this.persistTimer) {
      clearTimeout(this.persistTimer);
      this.persistTimer = null;
    }
    try {
      const data = JSON.stringify(Array.from(this.jobs.entries()));
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(this.persistKey, data);
      }
    } catch {
      // Persist errors are non-critical
    }
  }

  getStatus(): {
    isRunning: boolean;
    totalJobs: number;
    activeJobs: number;
    nextScheduledRun: number | null;
  } {
    const activeJobs = this.getActiveJobs();
    const nextJob = activeJobs
      .filter((j): j is ScheduledPrint & { nextRunTime: number } => !!j.nextRunTime)
      .sort((a, b) => a.nextRunTime - b.nextRunTime)[0];

    return {
      isRunning: this.isRunning,
      totalJobs: this.jobs.size,
      activeJobs: activeJobs.length,
      nextScheduledRun: nextJob?.nextRunTime ?? null,
    };
  }
}

export const printScheduler = new PrintScheduler();

export default PrintScheduler;
