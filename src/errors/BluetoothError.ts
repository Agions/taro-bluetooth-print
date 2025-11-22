/**
 * Custom error codes for Bluetooth printing operations
 */
export enum ErrorCode {
  // Connection errors
  CONNECTION_FAILED = 'CONNECTION_FAILED',
  CONNECTION_TIMEOUT = 'CONNECTION_TIMEOUT',
  DEVICE_NOT_FOUND = 'DEVICE_NOT_FOUND',
  DEVICE_DISCONNECTED = 'DEVICE_DISCONNECTED',

  // Service discovery errors
  SERVICE_NOT_FOUND = 'SERVICE_NOT_FOUND',
  CHARACTERISTIC_NOT_FOUND = 'CHARACTERISTIC_NOT_FOUND',
  SERVICE_DISCOVERY_FAILED = 'SERVICE_DISCOVERY_FAILED',

  // Write errors
  WRITE_FAILED = 'WRITE_FAILED',
  WRITE_TIMEOUT = 'WRITE_TIMEOUT',

  // Print job errors
  PRINT_JOB_IN_PROGRESS = 'PRINT_JOB_IN_PROGRESS',
  PRINT_JOB_CANCELLED = 'PRINT_JOB_CANCELLED',
  PRINT_JOB_FAILED = 'PRINT_JOB_FAILED',

  // Configuration errors
  INVALID_CONFIGURATION = 'INVALID_CONFIGURATION',
  ENCODING_NOT_SUPPORTED = 'ENCODING_NOT_SUPPORTED',

  // Data errors
  INVALID_IMAGE_DATA = 'INVALID_IMAGE_DATA',
  INVALID_QR_DATA = 'INVALID_QR_DATA',
}

/**
 * Custom error class for Bluetooth printing operations
 *
 * @example
 * ```typescript
 * throw new BluetoothPrintError(
 *   ErrorCode.CONNECTION_FAILED,
 *   'Failed to connect to device',
 *   originalError
 * );
 * ```
 */
export class BluetoothPrintError extends Error {
  /**
   * Creates a new BluetoothPrintError
   *
   * @param code - Error code from ErrorCode enum
   * @param message - Human-readable error message
   * @param originalError - Original error that caused this error (optional)
   */
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'BluetoothPrintError';

    // Maintains proper stack trace for where error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, BluetoothPrintError);
    }
  }

  /**
   * Returns a detailed error message including the error code
   */
  toString(): string {
    let result = `${this.name} [${this.code}]: ${this.message}`;
    if (this.originalError) {
      result += `\nCaused by: ${this.originalError.message}`;
    }
    return result;
  }
}
