import { describe, test, expect } from 'vitest';
/**
 * Unit tests for BluetoothPrintError
 */

import { BluetoothPrintError, ErrorCode } from '../src/errors/BluetoothError';

describe('BluetoothPrintError', () => {
  describe('constructor', () => {
    it('should create error with code and message', () => {
      const error = new BluetoothPrintError(ErrorCode.CONNECTION_FAILED, 'Connection failed');

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(BluetoothPrintError);
      expect(error.code).toBe(ErrorCode.CONNECTION_FAILED);
      expect(error.message).toBe('Connection failed');
      expect(error.name).toBe('BluetoothPrintError');
    });

    it('should preserve original error', () => {
      const originalError = new Error('Original error');
      const error = new BluetoothPrintError(
        ErrorCode.WRITE_FAILED,
        'Write operation failed',
        originalError
      );

      expect(error.originalError).toBe(originalError);
    });

    it('should work without original error', () => {
      const error = new BluetoothPrintError(ErrorCode.DEVICE_NOT_FOUND, 'Device not found');

      expect(error.originalError).toBeUndefined();
    });
  });

  describe('toString', () => {
    it('should format error message with code', () => {
      const error = new BluetoothPrintError(ErrorCode.SERVICE_NOT_FOUND, 'Service not available');

      const result = error.toString();

      expect(result).toContain('BluetoothPrintError');
      expect(result).toContain('[SERVICE_NOT_FOUND]');
      expect(result).toContain('Service not available');
    });

    it('should include original error in message when present', () => {
      const originalError = new Error('Network timeout');
      const error = new BluetoothPrintError(
        ErrorCode.CONNECTION_TIMEOUT,
        'Connection timed out',
        originalError
      );

      const result = error.toString();

      expect(result).toContain('Connection timed out');
      expect(result).toContain('Caused by: Network timeout');
    });
  });

  describe('ErrorCode enum', () => {
    it('should have all expected error codes', () => {
      expect(ErrorCode.CONNECTION_FAILED).toBe('CONNECTION_FAILED');
      expect(ErrorCode.WRITE_FAILED).toBe('WRITE_FAILED');
      expect(ErrorCode.SERVICE_NOT_FOUND).toBe('SERVICE_NOT_FOUND');
      expect(ErrorCode.CHARACTERISTIC_NOT_FOUND).toBe('CHARACTERISTIC_NOT_FOUND');
      expect(ErrorCode.PRINT_JOB_IN_PROGRESS).toBe('PRINT_JOB_IN_PROGRESS');
      expect(ErrorCode.ENCODING_NOT_SUPPORTED).toBe('ENCODING_NOT_SUPPORTED');
    });
  });
});

import { ConnectionError, ConnectionErrorCode } from '../src/errors/ConnectionError';
import { PrintJobError, PrintJobErrorCode } from '../src/errors/PrintJobError';
import { CommandBuildError, CommandBuildErrorCode } from '../src/errors/CommandBuildError';

describe('ConnectionError', () => {
  describe('constructor', () => {
    it('should create error with connection error code and message', () => {
      const error = new ConnectionError(
        ConnectionErrorCode.TIMEOUT,
        'Connection timed out'
      );

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(ConnectionError);
      expect(error.name).toBe('ConnectionError');
      expect(error.message).toBe('Connection timed out');
    });

    it('should preserve original error', () => {
      const originalError = new Error('BLE unavailable');
      const error = new ConnectionError(
        ConnectionErrorCode.FAILED,
        'Connection failed',
        originalError
      );

      expect(error.originalError).toBe(originalError);
    });

    it('should map ConnectionErrorCode to base ErrorCode', () => {
      const error = new ConnectionError(ConnectionErrorCode.TIMEOUT, 'timeout');
      expect(error.code).toBe(ErrorCode.CONNECTION_TIMEOUT);
    });

    it('should map NOT_FOUND to DEVICE_NOT_FOUND', () => {
      const error = new ConnectionError(ConnectionErrorCode.NOT_FOUND, 'not found');
      expect(error.code).toBe(ErrorCode.DEVICE_NOT_FOUND);
    });

    it('should map DISCONNECTED to DEVICE_DISCONNECTED', () => {
      const error = new ConnectionError(ConnectionErrorCode.DISCONNECTED, 'disconnected');
      expect(error.code).toBe(ErrorCode.DEVICE_DISCONNECTED);
    });

    it('should use CONNECTION_FAILED as default for unknown codes', () => {
      // @ts-ignore - testing unknown code fallback
      const error = new ConnectionError('UNKNOWN_CODE' as any, 'unknown');
      expect(error.code).toBe(ErrorCode.CONNECTION_FAILED);
    });
  });

  describe('isConnectionError()', () => {
    it('should return true for ConnectionError instances', () => {
      const error = new ConnectionError(ConnectionErrorCode.FAILED, 'failed');
      expect(ConnectionError.isConnectionError(error)).toBe(true);
    });

    it('should return false for other errors', () => {
      const error = new Error('regular error');
      expect(ConnectionError.isConnectionError(error)).toBe(false);
    });

    it('should return false for null', () => {
      expect(ConnectionError.isConnectionError(null)).toBe(false);
    });
  });

  describe('ConnectionErrorCode enum', () => {
    it('should have all expected error codes', () => {
      expect(ConnectionErrorCode.FAILED).toBe('CONNECTION_FAILED');
      expect(ConnectionErrorCode.TIMEOUT).toBe('CONNECTION_TIMEOUT');
      expect(ConnectionErrorCode.NOT_FOUND).toBe('DEVICE_NOT_FOUND');
      expect(ConnectionErrorCode.DISCONNECTED).toBe('DEVICE_DISCONNECTED');
      expect(ConnectionErrorCode.SERVICE_NOT_FOUND).toBe('SERVICE_NOT_FOUND');
      expect(ConnectionErrorCode.CHARACTERISTIC_NOT_FOUND).toBe('CHARACTERISTIC_NOT_FOUND');
      expect(ConnectionErrorCode.DISCOVERY_FAILED).toBe('SERVICE_DISCOVERY_FAILED');
      expect(ConnectionErrorCode.PLATFORM_UNSUPPORTED).toBe('PLATFORM_NOT_SUPPORTED');
    });
  });
});

describe('PrintJobError', () => {
  describe('constructor', () => {
    it('should create error with print job error code and message', () => {
      const error = new PrintJobError(
        PrintJobErrorCode.FAILED,
        'Print job failed'
      );

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(PrintJobError);
      expect(error.name).toBe('PrintJobError');
      expect(error.message).toBe('Print job failed');
      expect(error.jobErrorCode).toBe(PrintJobErrorCode.FAILED);
    });

    it('should preserve original error', () => {
      const originalError = new Error('Buffer overflow');
      const error = new PrintJobError(
        PrintJobErrorCode.WRITE_FAILED,
        'Write failed',
        originalError
      );

      expect(error.originalError).toBe(originalError);
    });

    it('should map PrintJobErrorCode to base ErrorCode', () => {
      const error = new PrintJobError(PrintJobErrorCode.IN_PROGRESS, 'in progress');
      expect(error.code).toBe(ErrorCode.PRINT_JOB_IN_PROGRESS);
    });

    it('should map FAILED to PRINT_JOB_FAILED', () => {
      const error = new PrintJobError(PrintJobErrorCode.FAILED, 'failed');
      expect(error.code).toBe(ErrorCode.PRINT_JOB_FAILED);
    });

    it('should map CANCELLED to PRINT_JOB_CANCELLED', () => {
      const error = new PrintJobError(PrintJobErrorCode.CANCELLED, 'cancelled');
      expect(error.code).toBe(ErrorCode.PRINT_JOB_CANCELLED);
    });

    it('should use PRINT_JOB_FAILED as default for unknown codes', () => {
      // @ts-ignore - testing unknown code fallback
      const error = new PrintJobError('UNKNOWN_CODE' as any, 'unknown');
      expect(error.code).toBe(ErrorCode.PRINT_JOB_FAILED);
    });
  });

  describe('isPrintJobError()', () => {
    it('should return true for PrintJobError instances', () => {
      const error = new PrintJobError(PrintJobErrorCode.FAILED, 'failed');
      expect(PrintJobError.isPrintJobError(error)).toBe(true);
    });

    it('should return false for other errors', () => {
      const error = new Error('regular error');
      expect(PrintJobError.isPrintJobError(error)).toBe(false);
    });

    it('should return false for null', () => {
      expect(PrintJobError.isPrintJobError(null)).toBe(false);
    });
  });

  describe('PrintJobErrorCode enum', () => {
    it('should have all expected error codes', () => {
      expect(PrintJobErrorCode.FAILED).toBe('PRINT_JOB_FAILED');
      expect(PrintJobErrorCode.IN_PROGRESS).toBe('PRINT_JOB_IN_PROGRESS');
      expect(PrintJobErrorCode.CANCELLED).toBe('PRINT_JOB_CANCELLED');
      expect(PrintJobErrorCode.INVALID_DATA).toBe('INVALID_IMAGE_DATA');
      expect(PrintJobErrorCode.WRITE_FAILED).toBe('WRITE_FAILED');
      expect(PrintJobErrorCode.WRITE_TIMEOUT).toBe('WRITE_TIMEOUT');
    });
  });
});

describe('CommandBuildError', () => {
  describe('constructor', () => {
    it('should create error with command build error code and message', () => {
      const error = new CommandBuildError(
        CommandBuildErrorCode.INVALID_CONFIG,
        'Invalid configuration'
      );

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(CommandBuildError);
      expect(error.name).toBe('CommandBuildError');
      expect(error.message).toBe('Invalid configuration');
      expect(error.buildErrorCode).toBe(CommandBuildErrorCode.INVALID_CONFIG);
    });

    it('should preserve original error', () => {
      const originalError = new Error('Driver error');
      const error = new CommandBuildError(
        CommandBuildErrorCode.DRIVER_ERROR,
        'Driver failed',
        originalError
      );

      expect(error.originalError).toBe(originalError);
    });

    it('should map CommandBuildErrorCode to base ErrorCode', () => {
      const error = new CommandBuildError(
        CommandBuildErrorCode.ENCODING_NOT_SUPPORTED,
        'encoding not supported'
      );
      expect(error.code).toBe(ErrorCode.ENCODING_NOT_SUPPORTED);
    });

    it('should map INVALID_IMAGE to INVALID_IMAGE_DATA', () => {
      const error = new CommandBuildError(CommandBuildErrorCode.INVALID_IMAGE, 'invalid image');
      expect(error.code).toBe(ErrorCode.INVALID_IMAGE_DATA);
    });

    it('should map INVALID_QR to INVALID_QR_DATA', () => {
      const error = new CommandBuildError(CommandBuildErrorCode.INVALID_QR, 'invalid qr');
      expect(error.code).toBe(ErrorCode.INVALID_QR_DATA);
    });

    it('should map DRIVER_ERROR to PRINT_JOB_FAILED', () => {
      const error = new CommandBuildError(CommandBuildErrorCode.DRIVER_ERROR, 'driver error');
      expect(error.code).toBe(ErrorCode.PRINT_JOB_FAILED);
    });

    it('should use INVALID_CONFIGURATION as default for unknown codes', () => {
      // @ts-ignore - testing unknown code fallback
      const error = new CommandBuildError('UNKNOWN_CODE' as any, 'unknown');
      expect(error.code).toBe(ErrorCode.INVALID_CONFIGURATION);
    });
  });

  describe('isCommandBuildError()', () => {
    it('should return true for CommandBuildError instances', () => {
      const error = new CommandBuildError(CommandBuildErrorCode.INVALID_CONFIG, 'invalid');
      expect(CommandBuildError.isCommandBuildError(error)).toBe(true);
    });

    it('should return false for other errors', () => {
      const error = new Error('regular error');
      expect(CommandBuildError.isCommandBuildError(error)).toBe(false);
    });

    it('should return false for null', () => {
      expect(CommandBuildError.isCommandBuildError(null)).toBe(false);
    });
  });

  describe('CommandBuildErrorCode enum', () => {
    it('should have all expected error codes', () => {
      expect(CommandBuildErrorCode.INVALID_CONFIG).toBe('INVALID_CONFIGURATION');
      expect(CommandBuildErrorCode.ENCODING_NOT_SUPPORTED).toBe('ENCODING_NOT_SUPPORTED');
      expect(CommandBuildErrorCode.INVALID_IMAGE).toBe('INVALID_IMAGE_DATA');
      expect(CommandBuildErrorCode.INVALID_QR).toBe('INVALID_QR_DATA');
      expect(CommandBuildErrorCode.DRIVER_ERROR).toBe('DRIVER_ERROR');
    });
  });
});
