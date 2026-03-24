/**
 * Printer Status Service
 *
 * Queries printer status including paper, battery, and error states.
 * Works with ESC/POS printers that support status commands.
 *
 * @example
 * ```typescript
 * const status = new PrinterStatus(printer);
 * const paperStatus = await status.getPaperStatus();
 * console.log('Paper:', paperStatus);
 * ```
 */

import { Logger } from '@/utils/logger';
import { BluetoothPrintError, ErrorCode } from '@/errors/BluetoothError';

/**
 * Paper status
 */
export enum PaperStatus {
  /** Paper is present and OK */
  OK = 'ok',
  /** Paper is low */
  LOW = 'low',
  /** Paper is out */
  OUT = 'out',
  /** Paper status unknown */
  UNKNOWN = 'unknown',
}

/**
 * Printer status
 */
export interface PrinterStatusInfo {
  /** Paper status */
  paper: PaperStatus;
  /** Cover open (if supported) */
  coverOpen?: boolean;
  /** Cutter error (if supported) */
  cutterError?: boolean;
  /** Motor error (if supported) */
  motorError?: boolean;
  /** Temperature issue (if supported) */
  overTemp?: boolean;
  /** Battery level (0-100, if supported) */
  batteryLevel?: number;
  /** Timestamp of status check */
  timestamp: number;
  /** Raw status bytes */
  rawStatus?: Uint8Array;
}

/**
 * Status query options
 */
export interface StatusQueryOptions {
  /** Timeout for status query in ms */
  timeout?: number;
  /** Include raw status bytes */
  includeRaw?: boolean;
}

/**
 * ESC/POS Status Commands
 */
const ESCPOS_STATUS_CMD = 0x10; // DLE
const ESCPOS_STATUS_NUL = 0x04; // ENQ

/**
 * Status response bit masks for common printers
 */
const STATUS_BIT_PAPER_OUT = 0x20; // Bit 5: Paper out
const STATUS_BIT_PAPER_LOW = 0x40; // Bit 6: Paper low

/**
 * Printer Status Service
 */
export class PrinterStatus {
  private readonly logger = Logger.scope('PrinterStatus');

  /**
   * Creates a new PrinterStatus instance
   */
  constructor() {}

  /**
   * Get printer status
   *
   * Sends ESC/POS status query command and parses the response.
   *
   * @param writeFunc - Function to write data to printer
   * @param readFunc - Function to read response from printer
   * @param options - Query options
   * @returns Printer status info
   */
  async getStatus(
    writeFunc: (data: ArrayBuffer) => Promise<void>,
    readFunc: () => Promise<ArrayBuffer>,
    options: StatusQueryOptions = {}
  ): Promise<PrinterStatusInfo> {
    const { timeout = 3000, includeRaw = false } = options;

    try {
      // Send status query: DLE ENQ
      const queryCmd = new Uint8Array([ESCPOS_STATUS_CMD, ESCPOS_STATUS_NUL]);
      await writeFunc(queryCmd.buffer);

      // Set up timeout promise
      const timeoutPromise = new Promise<ArrayBuffer>((_, reject) => {
        setTimeout(() => {
          reject(new BluetoothPrintError(ErrorCode.CONNECTION_TIMEOUT, 'Status query timed out'));
        }, timeout);
      });

      // Read response with timeout
      const response = await Promise.race([readFunc(), timeoutPromise]);

      return this.parseStatus(new Uint8Array(response), includeRaw);
    } catch (error) {
      this.logger.error('Failed to get printer status:', error);

      // Return unknown status on error
      return {
        paper: PaperStatus.UNKNOWN,
        timestamp: Date.now(),
        ...(includeRaw && { rawStatus: new Uint8Array(0) }),
      };
    }
  }

  /**
   * Parse status bytes from printer
   *
   * Different printers return different status formats.
   * This implementation handles common ESC/POS status responses.
   */
  private parseStatus(statusBytes: Uint8Array, includeRaw: boolean): PrinterStatusInfo {
    const result: PrinterStatusInfo = {
      paper: PaperStatus.UNKNOWN,
      timestamp: Date.now(),
    };

    if (includeRaw && statusBytes.length > 0) {
      result.rawStatus = statusBytes;
    }

    if (statusBytes.length === 0) {
      this.logger.warn('Empty status response');
      return result;
    }

    // First byte typically contains printer status
    const status = statusBytes[0] ?? 0;

    // Check paper status
    if ((status & STATUS_BIT_PAPER_OUT) !== 0) {
      result.paper = PaperStatus.OUT;
    } else if ((status & STATUS_BIT_PAPER_LOW) !== 0) {
      result.paper = PaperStatus.LOW;
    } else {
      result.paper = PaperStatus.OK;
    }

    // Check other status bits (printer-dependent)
    // Bit 0: Drawer open/closed
    // Bit 1: Offline
    // Bit 2: Error
    // Bit 3: Printer-specific status

    if ((status & 0x01) !== 0) {
      this.logger.debug('Drawer open detected');
    }

    if ((status & 0x02) !== 0) {
      result.coverOpen = true;
      this.logger.debug('Cover open detected');
    }

    if ((status & 0x04) !== 0) {
      result.cutterError = true;
      this.logger.debug('Cutter error detected');
    }

    if ((status & 0x10) !== 0) {
      result.overTemp = true;
      this.logger.debug('Over temperature detected');
    }

    // Second byte often contains paper sensor status
    if (statusBytes.length >= 2) {
      const paperSensor = statusBytes[1] ?? 0;

      // Paper out sensor
      if ((paperSensor & 0x04) !== 0) {
        result.paper = PaperStatus.OUT;
      } else if ((paperSensor & 0x08) !== 0) {
        result.paper = PaperStatus.LOW;
      }
    }

    this.logger.debug('Parsed status:', result);
    return result;
  }

  /**
   * Check if paper is available
   */
  async checkPaper(
    writeFunc: (data: ArrayBuffer) => Promise<void>,
    readFunc: () => Promise<ArrayBuffer>
  ): Promise<PaperStatus> {
    const status = await this.getStatus(writeFunc, readFunc);
    return status.paper;
  }

  /**
   * Check if printer is ready
   */
  async isReady(
    writeFunc: (data: ArrayBuffer) => Promise<void>,
    readFunc: () => Promise<ArrayBuffer>
  ): Promise<boolean> {
    try {
      const status = await this.getStatus(writeFunc, readFunc);
      return status.paper !== PaperStatus.OUT && !status.cutterError && !status.motorError;
    } catch {
      return false;
    }
  }

  /**
   * Get human-readable status string
   */
  static toString(status: PrinterStatusInfo): string {
    const parts: string[] = [];

    parts.push(`Paper: ${status.paper}`);

    if (status.coverOpen) {
      parts.push('Cover Open');
    }
    if (status.cutterError) {
      parts.push('Cutter Error');
    }
    if (status.motorError) {
      parts.push('Motor Error');
    }
    if (status.overTemp) {
      parts.push('Over Temperature');
    }
    if (status.batteryLevel !== undefined) {
      parts.push(`Battery: ${status.batteryLevel}%`);
    }

    return parts.join(', ');
  }
}

// Export singleton
export const printerStatus = new PrinterStatus();
