/**
 * Connection Error
 *
 * Specialized error for connection-related failures
 */

import { BluetoothPrintError, ErrorCode } from './BluetoothError';

/**
 * Connection-related error codes
 */
export enum ConnectionErrorCode {
  /** Failed to establish connection */
  FAILED = 'CONNECTION_FAILED',
  /** Connection attempt timed out */
  TIMEOUT = 'CONNECTION_TIMEOUT',
  /** Device not found during discovery */
  NOT_FOUND = 'DEVICE_NOT_FOUND',
  /** Device disconnected unexpectedly */
  DISCONNECTED = 'DEVICE_DISCONNECTED',
  /** Bluetooth service not found on device */
  SERVICE_NOT_FOUND = 'SERVICE_NOT_FOUND',
  /** Bluetooth characteristic not found */
  CHARACTERISTIC_NOT_FOUND = 'CHARACTERISTIC_NOT_FOUND',
  /** Service discovery failed */
  DISCOVERY_FAILED = 'SERVICE_DISCOVERY_FAILED',
  /** Platform doesn't support Bluetooth */
  PLATFORM_UNSUPPORTED = 'PLATFORM_NOT_SUPPORTED',
}

/**
 * ConnectionError - Specialized error for connection-related failures
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
    // Map our codes to the base ErrorCode enum
    const baseCode = ConnectionError._toBaseCode(code);
    super(baseCode, message, originalError);
    this.name = 'ConnectionError';

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ConnectionError);
    }
  }

  /**
   * Converts ConnectionErrorCode to base ErrorCode
   */
  private static _toBaseCode(code: ConnectionErrorCode): ErrorCode {
    const mapping: Partial<Record<ConnectionErrorCode, ErrorCode>> = {
      [ConnectionErrorCode.FAILED]: ErrorCode.CONNECTION_FAILED,
      [ConnectionErrorCode.TIMEOUT]: ErrorCode.CONNECTION_TIMEOUT,
      [ConnectionErrorCode.NOT_FOUND]: ErrorCode.DEVICE_NOT_FOUND,
      [ConnectionErrorCode.DISCONNECTED]: ErrorCode.DEVICE_DISCONNECTED,
      [ConnectionErrorCode.SERVICE_NOT_FOUND]: ErrorCode.SERVICE_NOT_FOUND,
      [ConnectionErrorCode.CHARACTERISTIC_NOT_FOUND]: ErrorCode.CHARACTERISTIC_NOT_FOUND,
      [ConnectionErrorCode.DISCOVERY_FAILED]: ErrorCode.SERVICE_DISCOVERY_FAILED,
      [ConnectionErrorCode.PLATFORM_UNSUPPORTED]: ErrorCode.PLATFORM_NOT_SUPPORTED,
    };
    return mapping[code] ?? ErrorCode.CONNECTION_FAILED;
  }

  /**
   * Checks if an error is a connection-related error
   */
  static isConnectionError(error: unknown): error is ConnectionError {
    return error instanceof ConnectionError;
  }
}
