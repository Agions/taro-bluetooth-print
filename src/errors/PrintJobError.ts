/**
 * Print Job Error
 *
 * Specialized error for print job failures
 */

import { BluetoothPrintError, ErrorCode } from './BluetoothError';

/**
 * Print job-related error codes
 */
export enum PrintJobErrorCode {
  /** Print job failed */
  FAILED = 'PRINT_JOB_FAILED',
  /** Print job is already in progress */
  IN_PROGRESS = 'PRINT_JOB_IN_PROGRESS',
  /** Print job was cancelled */
  CANCELLED = 'PRINT_JOB_CANCELLED',
  /** Print data is invalid */
  INVALID_DATA = 'INVALID_IMAGE_DATA',
  /** Write operation failed */
  WRITE_FAILED = 'WRITE_FAILED',
  /** Write operation timed out */
  WRITE_TIMEOUT = 'WRITE_TIMEOUT',
}

/**
 * PrintJobError - Specialized error for print job failures
 *
 * @example
 * ```typescript
 * throw new PrintJobError(
 *   PrintJobErrorCode.WRITE_FAILED,
 *   'Failed to send data to printer',
 *   originalError
 * );
 * ```
 */
export class PrintJobError extends BluetoothPrintError {
  constructor(
    public readonly jobErrorCode: PrintJobErrorCode,
    message: string,
    originalError?: Error
  ) {
    const baseCode = PrintJobError._toBaseCode(jobErrorCode);
    super(baseCode, message, originalError);
    this.name = 'PrintJobError';

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, PrintJobError);
    }
  }

  /**
   * Converts PrintJobErrorCode to base ErrorCode
   */
  private static _toBaseCode(code: PrintJobErrorCode): ErrorCode {
    const mapping: Partial<Record<PrintJobErrorCode, ErrorCode>> = {
      [PrintJobErrorCode.FAILED]: ErrorCode.PRINT_JOB_FAILED,
      [PrintJobErrorCode.IN_PROGRESS]: ErrorCode.PRINT_JOB_IN_PROGRESS,
      [PrintJobErrorCode.CANCELLED]: ErrorCode.PRINT_JOB_CANCELLED,
      [PrintJobErrorCode.INVALID_DATA]: ErrorCode.INVALID_IMAGE_DATA,
      [PrintJobErrorCode.WRITE_FAILED]: ErrorCode.WRITE_FAILED,
      [PrintJobErrorCode.WRITE_TIMEOUT]: ErrorCode.WRITE_TIMEOUT,
    };
    return mapping[code] ?? ErrorCode.PRINT_JOB_FAILED;
  }

  /**
   * Checks if an error is a print job error
   */
  static isPrintJobError(error: unknown): error is PrintJobError {
    return error instanceof PrintJobError;
  }
}
