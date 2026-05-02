/**
 * Error Classes Tests
 *
 * Tests for all custom error classes in the library
 */
import { describe, it, expect } from 'vitest';
import { BluetoothPrintError, ErrorCode } from '@/errors/baseError';
import { ConnectionError, ConnectionErrorCode } from '@/errors/ConnectionError';
import { PrintJobError, PrintJobErrorCode } from '@/errors/PrintJobError';
import { CommandBuildError, CommandBuildErrorCode } from '@/errors/CommandBuildError';

describe('BluetoothPrintError', () => {
  it('should create an error with code and message', () => {
    const error = new BluetoothPrintError(
      ErrorCode.CONNECTION_FAILED,
      'Failed to connect'
    );
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('BluetoothPrintError');
    expect(error.code).toBe(ErrorCode.CONNECTION_FAILED);
    expect(error.message).toBe('Failed to connect');
  });

  it('should capture original error', () => {
    const original = new Error('Original error');
    const error = new BluetoothPrintError(
      ErrorCode.WRITE_FAILED,
      'Write failed',
      original
    );
    expect(error.originalError).toBe(original);
    expect(error.originalError?.message).toBe('Original error');
  });

  it('should have a descriptive toString()', () => {
    const error = new BluetoothPrintError(
      ErrorCode.DEVICE_NOT_FOUND,
      'Device not found'
    );
    const str = error.toString();
    expect(str).toContain('BluetoothPrintError');
    expect(str).toContain(ErrorCode.DEVICE_NOT_FOUND);
    expect(str).toContain('Device not found');
  });

  it('should include original error in toString()', () => {
    const original = new Error('Timeout exceeded');
    const error = new BluetoothPrintError(
      ErrorCode.CONNECTION_TIMEOUT,
      'Connection timed out',
      original
    );
    const str = error.toString();
    expect(str).toContain('Timeout exceeded');
    expect(str).toContain('Caused by');
  });

  it('should convert to JSON with toJSON()', () => {
    const error = new BluetoothPrintError(
      ErrorCode.INVALID_CONFIGURATION,
      'Invalid config'
    );
    const json = error.toJSON() as Record<string, unknown>;
    expect(json.name).toBe('BluetoothPrintError');
    expect(json.code).toBe(ErrorCode.INVALID_CONFIGURATION);
    expect(json.message).toBe('Invalid config');
    expect(json.stack).toBeDefined();
  });

  it('should include original error in toJSON()', () => {
    const original = new Error('Wrong parameter');
    const error = new BluetoothPrintError(
      ErrorCode.INVALID_IMAGE_DATA,
      'Bad image',
      original
    );
    const json = error.toJSON() as { originalError?: { name: string; message: string } };
    expect(json.originalError).toBeDefined();
    expect(json.originalError?.message).toBe('Wrong parameter');
  });
});

describe('ConnectionError', () => {
  it('should create a ConnectionError', () => {
    const error = new ConnectionError(
      ConnectionErrorCode.TIMEOUT,
      'Connection timed out after 30s'
    );
    expect(error).toBeInstanceOf(BluetoothPrintError);
    expect(error.name).toBe('ConnectionError');
    expect(error.code).toBe(ErrorCode.CONNECTION_TIMEOUT);
  });

  it('should map all error codes correctly', () => {
    const testCases: Array<[ConnectionErrorCode, ErrorCode]> = [
      [ConnectionErrorCode.FAILED, ErrorCode.CONNECTION_FAILED],
      [ConnectionErrorCode.TIMEOUT, ErrorCode.CONNECTION_TIMEOUT],
      [ConnectionErrorCode.NOT_FOUND, ErrorCode.DEVICE_NOT_FOUND],
      [ConnectionErrorCode.DISCONNECTED, ErrorCode.DEVICE_DISCONNECTED],
      [ConnectionErrorCode.SERVICE_NOT_FOUND, ErrorCode.SERVICE_NOT_FOUND],
      [ConnectionErrorCode.CHARACTERISTIC_NOT_FOUND, ErrorCode.CHARACTERISTIC_NOT_FOUND],
      [ConnectionErrorCode.DISCOVERY_FAILED, ErrorCode.SERVICE_DISCOVERY_FAILED],
      [ConnectionErrorCode.PLATFORM_UNSUPPORTED, ErrorCode.PLATFORM_NOT_SUPPORTED],
    ];

    for (const [input, expected] of testCases) {
      const error = new ConnectionError(input, 'Test error');
      expect(error.code).toBe(expected);
    }
  });

  it('should fallback to CONNECTION_FAILED for unknown codes', () => {
    const error = new ConnectionError(
      'UNKNOWN_CODE' as ConnectionErrorCode,
      'Unknown error'
    );
    expect(error.code).toBe(ErrorCode.CONNECTION_FAILED);
  });

  it('should support isConnectionError type guard', () => {
    const error = new ConnectionError(ConnectionErrorCode.FAILED, 'Oops');
    expect(ConnectionError.isConnectionError(error)).toBe(true);
    expect(ConnectionError.isConnectionError(new Error('Generic'))).toBe(false);
    expect(ConnectionError.isConnectionError(null)).toBe(false);
    expect(ConnectionError.isConnectionError('string')).toBe(false);
  });
});

describe('PrintJobError', () => {
  it('should create a PrintJobError', () => {
    const error = new PrintJobError(
      PrintJobErrorCode.FAILED,
      'Print job failed'
    );
    expect(error).toBeInstanceOf(BluetoothPrintError);
    expect(error.name).toBe('PrintJobError');
    expect(error.jobErrorCode).toBe(PrintJobErrorCode.FAILED);
  });

  it('should map all error codes correctly', () => {
    const testCases: Array<[PrintJobErrorCode, ErrorCode]> = [
      [PrintJobErrorCode.FAILED, ErrorCode.PRINT_JOB_FAILED],
      [PrintJobErrorCode.IN_PROGRESS, ErrorCode.PRINT_JOB_IN_PROGRESS],
      [PrintJobErrorCode.CANCELLED, ErrorCode.PRINT_JOB_CANCELLED],
      [PrintJobErrorCode.INVALID_DATA, ErrorCode.INVALID_IMAGE_DATA],
      [PrintJobErrorCode.WRITE_FAILED, ErrorCode.WRITE_FAILED],
      [PrintJobErrorCode.WRITE_TIMEOUT, ErrorCode.WRITE_TIMEOUT],
    ];

    for (const [input, expected] of testCases) {
      const error = new PrintJobError(input, 'Test error');
      expect(error.code).toBe(expected);
    }
  });

  it('should preserve original error', () => {
    const original = new Error('Underlying error');
    const error = new PrintJobError(
      PrintJobErrorCode.WRITE_FAILED,
      'Write failed',
      original
    );
    expect(error.originalError?.message).toBe('Underlying error');
  });

  it('should support isPrintJobError type guard', () => {
    const error = new PrintJobError(PrintJobErrorCode.FAILED, 'Oops');
    expect(PrintJobError.isPrintJobError(error)).toBe(true);
    expect(PrintJobError.isPrintJobError('string')).toBe(false);
  });
});

describe('CommandBuildError', () => {
  it('should create a CommandBuildError', () => {
    const error = new CommandBuildError(
      CommandBuildErrorCode.INVALID_CONFIG,
      'Invalid configuration'
    );
    expect(error).toBeInstanceOf(BluetoothPrintError);
    expect(error.name).toBe('CommandBuildError');
    expect(error.buildErrorCode).toBe(CommandBuildErrorCode.INVALID_CONFIG);
  });

  it('should map all error codes correctly', () => {
    const testCases: Array<[CommandBuildErrorCode, ErrorCode]> = [
      [CommandBuildErrorCode.INVALID_CONFIG, ErrorCode.INVALID_CONFIGURATION],
      [CommandBuildErrorCode.ENCODING_NOT_SUPPORTED, ErrorCode.ENCODING_NOT_SUPPORTED],
      [CommandBuildErrorCode.INVALID_IMAGE, ErrorCode.INVALID_IMAGE_DATA],
      [CommandBuildErrorCode.INVALID_QR, ErrorCode.INVALID_QR_DATA],
      [CommandBuildErrorCode.DRIVER_ERROR, ErrorCode.PRINT_JOB_FAILED],
    ];

    for (const [input, expected] of testCases) {
      const error = new CommandBuildError(input, 'Test error');
      expect(error.code).toBe(expected);
    }
  });

  it('should fallback to INVALID_CONFIGURATION for unknown codes', () => {
    const error = new CommandBuildError(
      'UNKNOWN' as CommandBuildErrorCode,
      'Unknown'
    );
    expect(error.code).toBe(ErrorCode.INVALID_CONFIGURATION);
  });

  it('should support isCommandBuildError type guard', () => {
    const error = new CommandBuildError(CommandBuildErrorCode.INVALID_CONFIG, 'Oops');
    expect(CommandBuildError.isCommandBuildError(error)).toBe(true);
    expect(CommandBuildError.isCommandBuildError({})).toBe(false);
  });
});