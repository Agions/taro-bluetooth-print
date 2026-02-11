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
