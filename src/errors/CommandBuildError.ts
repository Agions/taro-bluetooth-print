/**
 * Command Build Error
 *
 * Specialized error for command building failures.
 *
 * Most `CommandBuildErrorCode` entries map 1:1 to `ErrorCode`; the lone
 * exception is `DRIVER_ERROR` (whose own string value isn't a base code),
 * so we keep a single-entry map for that case plus a fallback to
 * `ErrorCode.INVALID_CONFIGURATION` for unknown codes.
 */

import { BluetoothPrintError, ErrorCode } from './BaseError';

export enum CommandBuildErrorCode {
  INVALID_CONFIG = 'INVALID_CONFIGURATION',
  ENCODING_NOT_SUPPORTED = 'ENCODING_NOT_SUPPORTED',
  INVALID_IMAGE = 'INVALID_IMAGE_DATA',
  INVALID_QR = 'INVALID_QR_DATA',
  /** Maps to `ErrorCode.PRINT_JOB_FAILED` since "DRIVER_ERROR" isn't a base code. */
  DRIVER_ERROR = 'DRIVER_ERROR',
}

const COMMAND_BUILD_TO_BASE: Readonly<Record<CommandBuildErrorCode, ErrorCode>> = {
  [CommandBuildErrorCode.INVALID_CONFIG]: ErrorCode.INVALID_CONFIGURATION,
  [CommandBuildErrorCode.ENCODING_NOT_SUPPORTED]: ErrorCode.ENCODING_NOT_SUPPORTED,
  [CommandBuildErrorCode.INVALID_IMAGE]: ErrorCode.INVALID_IMAGE_DATA,
  [CommandBuildErrorCode.INVALID_QR]: ErrorCode.INVALID_QR_DATA,
  [CommandBuildErrorCode.DRIVER_ERROR]: ErrorCode.PRINT_JOB_FAILED,
};

/**
 * CommandBuildError - Specialized error for command building failures.
 *
 * @example
 * ```typescript
 * throw new CommandBuildError(
 *   CommandBuildErrorCode.ENCODING_NOT_SUPPORTED,
 *   'Encoding "EUC-JP" is not supported',
 *   originalError
 * );
 * ```
 */
export class CommandBuildError extends BluetoothPrintError {
  constructor(
    public readonly buildErrorCode: CommandBuildErrorCode,
    message: string,
    originalError?: Error
  ) {
    const baseCode: ErrorCode =
      COMMAND_BUILD_TO_BASE[buildErrorCode] ?? ErrorCode.INVALID_CONFIGURATION;
    super(baseCode, message, originalError);
    this.name = 'CommandBuildError';
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, CommandBuildError);
    }
  }

  static isCommandBuildError(error: unknown): error is CommandBuildError {
    return error instanceof CommandBuildError;
  }
}
