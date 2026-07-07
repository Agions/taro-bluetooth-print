/**
 * Print Job Error
 *
 * Specialized error for print job failures.
 *
 * All `PrintJobErrorCode` entries have string values identical to the
 * corresponding `ErrorCode` entries; we cast directly and fall back to
 * `ErrorCode.PRINT_JOB_FAILED` for unknown codes (defensive guard).
 */

import { BluetoothPrintError, ErrorCode } from './BaseError';

export enum PrintJobErrorCode {
  FAILED = 'PRINT_JOB_FAILED',
  IN_PROGRESS = 'PRINT_JOB_IN_PROGRESS',
  CANCELLED = 'PRINT_JOB_CANCELLED',
  INVALID_DATA = 'INVALID_IMAGE_DATA',
  WRITE_FAILED = 'WRITE_FAILED',
  WRITE_TIMEOUT = 'WRITE_TIMEOUT',
}

/** True when `code` matches a base `ErrorCode` value. */
function isBaseCode(code: string): code is ErrorCode {
  return (Object.values(ErrorCode) as string[]).includes(code);
}

/**
 * PrintJobError - Specialized error for print job failures.
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
    const baseCode: ErrorCode = isBaseCode(jobErrorCode)
      ? jobErrorCode
      : ErrorCode.PRINT_JOB_FAILED;
    super(baseCode, message, originalError);
    this.name = 'PrintJobError';
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, PrintJobError);
    }
  }

  static isPrintJobError(error: unknown): error is PrintJobError {
    return error instanceof PrintJobError;
  }
}
