/**
 * Print Job Manager Interface
 *
 * Manages print jobs, including pause/resume/cancel functionality
 */

import { IAdapterOptions } from '@/types';

/**
 * Print Job Manager Interface
 *
 * Manages print jobs, including pause/resume/cancel functionality
 */
export interface IPrintJobManager {
  /**
   * Starts a print job
   *
   * @param buffer - Print data buffer
   * @returns Promise<void>
   */
  start(buffer: Uint8Array, options?: { jobId?: string }): Promise<void>;

  /**
   * Pauses the current print job
   */
  pause(): void;

  /**
   * Resumes a paused print job
   *
   * @returns Promise<void>
   */
  resume(jobId?: string): Promise<void>;

  /**
   * Cancels the current print job
   */
  cancel(): void;

  /**
   * Gets the number of bytes remaining to print
   *
   * @returns number - Bytes remaining
   */
  remaining(): number;

  /**
   * Checks if the print job is paused
   *
   * @returns boolean - True if paused, false otherwise
   */
  isPaused(): boolean;

  /**
   * Checks if a print job is in progress
   *
   * @returns boolean - True if in progress, false otherwise
   */
  isInProgress(): boolean;

  /**
   * Sets adapter options for write operations
   *
   * @param options - Adapter options
   */
  setOptions(options: IAdapterOptions): void;

  /**
   * Sets the progress callback
   *
   * @param callback - Progress callback function
   */
  setProgressCallback(callback?: (sent: number, total: number) => void): void;

  /**
   * Sets the job state change callback
   *
   * @param callback - Job state change callback function
   */
  setJobStateCallback(
    callback?: (state: 'in-progress' | 'paused' | 'completed' | 'cancelled') => void
  ): void;
}
