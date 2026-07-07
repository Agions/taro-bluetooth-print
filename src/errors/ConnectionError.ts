/**
 * Connection Error
 *
 * Specialized error for connection-related failures.
 *
 * All `ConnectionErrorCode` entries have string values identical to the
 * corresponding `ErrorCode` entries, so we cast directly. An unknown code
 * (defensive guard) falls back to `ErrorCode.CONNECTION_FAILED`.
 */

import { BluetoothPrintError, ErrorCode, isBaseCode } from './BaseError';

/** Connection-related error codes (mirror ErrorCode connection entries). */
export enum ConnectionErrorCode {
  FAILED = 'CONNECTION_FAILED',
  TIMEOUT = 'CONNECTION_TIMEOUT',
  NOT_FOUND = 'DEVICE_NOT_FOUND',
  DISCONNECTED = 'DEVICE_DISCONNECTED',
  SERVICE_NOT_FOUND = 'SERVICE_NOT_FOUND',
  CHARACTERISTIC_NOT_FOUND = 'CHARACTERISTIC_NOT_FOUND',
  DISCOVERY_FAILED = 'SERVICE_DISCOVERY_FAILED',
  PLATFORM_UNSUPPORTED = 'PLATFORM_NOT_SUPPORTED',
}

/**
 * ConnectionError - Specialized error for connection-related failures.
 *
 * @example
 * ```typescript
 * throw new ConnectionError(
 *   ConnectionErrorCode.TIMEOUT,
 *   'Connection timed out after 30s',
 *   originalError
 * );
 * ```
 */
export class ConnectionError extends BluetoothPrintError {
  constructor(code: ConnectionErrorCode, message: string, originalError?: Error) {
    const baseCode: ErrorCode = isBaseCode(code) ? code : ErrorCode.CONNECTION_FAILED;
    super(baseCode, message, originalError);
    this.name = 'ConnectionError';
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ConnectionError);
    }
  }

  static isConnectionError(error: unknown): error is ConnectionError {
    return error instanceof ConnectionError;
  }
}
