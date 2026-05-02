/**
 * Command Build Error
 *
 * Specialized error for command building failures
 */

import { BluetoothPrintError, ErrorCode } from './baseError';

/**
 * Command building error codes
 */
export enum CommandBuildErrorCode {
  /** Invalid configuration */
  INVALID_CONFIG = 'INVALID_CONFIGURATION',
  /** Encoding not supported */
  ENCODING_NOT_SUPPORTED = 'ENCODING_NOT_SUPPORTED',
  /** Invalid image data */
  INVALID_IMAGE = 'INVALID_IMAGE_DATA',
  /** Invalid QR code data */
  INVALID_QR = 'INVALID_QR_DATA',
  /** Driver error */
  DRIVER_ERROR = 'DRIVER_ERROR',
}

/**
 * CommandBuildError - Specialized error for command building failures
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
    const baseCode = CommandBuildError._toBaseCode(buildErrorCode);
    super(baseCode, message, originalError);
    this.name = 'CommandBuildError';

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, CommandBuildError);
    }
  }

  /**
   * Converts CommandBuildErrorCode to base ErrorCode
   */
  private static _toBaseCode(code: CommandBuildErrorCode): ErrorCode {
    const mapping: Partial<Record<CommandBuildErrorCode, ErrorCode>> = {
      [CommandBuildErrorCode.INVALID_CONFIG]: ErrorCode.INVALID_CONFIGURATION,
      [CommandBuildErrorCode.ENCODING_NOT_SUPPORTED]: ErrorCode.ENCODING_NOT_SUPPORTED,
      [CommandBuildErrorCode.INVALID_IMAGE]: ErrorCode.INVALID_IMAGE_DATA,
      [CommandBuildErrorCode.INVALID_QR]: ErrorCode.INVALID_QR_DATA,
      [CommandBuildErrorCode.DRIVER_ERROR]: ErrorCode.PRINT_JOB_FAILED,
    };
    return mapping[code] ?? ErrorCode.INVALID_CONFIGURATION;
  }

  /**
   * Checks if an error is a command build error
   */
  static isCommandBuildError(error: unknown): error is CommandBuildError {
    return error instanceof CommandBuildError;
  }
}
