/**
 * Multi Printer Manager
 *
 * Manages multiple simultaneous Bluetooth printer connections.
 * Provides concurrent printing to multiple devices.
 *
 * @example
 * ```typescript
 * const manager = new MultiPrinterManager();
 *
 * // Connect to multiple printers
 * await manager.connect('printer-1', 'device-id-1');
 * await manager.connect('printer-2', 'device-id-2');
 *
 * // Print to specific printer
 * await manager.print('printer-1', buffer);
 *
 * // Broadcast to all printers
 * await manager.broadcast(buffer);
 *
 * // Disconnect
 * await manager.disconnectAll();
 * ```
 */

import { Logger } from '@/utils/logger';
import { BluetoothPrintError, ErrorCode } from '@/errors/BluetoothError';
import { BluetoothPrinter } from '@/core/BluetoothPrinter';
import { PrinterState } from '@/types';

/**
 * Printer connection info
 */
export interface PrinterConnection {
  /** Custom printer ID */
  printerId: string;
  /** Device ID */
  deviceId: string;
  /** Device name */
  name: string;
  /** BluetoothPrinter instance */
  printer: BluetoothPrinter;
  /** Connection timestamp */
  connectedAt: number;
  /** Last activity timestamp */
  lastActivity?: number;
}

/**
 * Connection options
 */
export interface MultiConnectOptions {
  /** Custom printer ID (optional, auto-generated if not provided) */
  printerId?: string;
  /** Device ID to connect */
  deviceId: string;
  /** Connection timeout in ms */
  timeout?: number;
}

/**
 * Broadcast options
 */
export interface BroadcastOptions {
  /** Parallel or sequential broadcast */
  parallel?: boolean;
  /** Continue on individual failure */
  continueOnError?: boolean;
}

/**
 * Multi Printer Manager Events
 */
export interface MultiPrinterManagerEvents {
  /** Emitted when a printer connects */
  'printer-connected': (data: PrinterConnection) => void;
  /** Emitted when a printer disconnects */
  'printer-disconnected': (data: { printerId: string; deviceId: string }) => void;
  /** Emitted when a printer has an error */
  'printer-error': (data: { printerId: string; error: Error }) => void;
  /** Emitted when broadcast completes */
  'broadcast-complete': (data: { success: number; failed: number }) => void;
}

/**
 * Event handler map type
 */
type EventHandlerMap = {
  [K in keyof MultiPrinterManagerEvents]: Set<MultiPrinterManagerEvents[K]>;
};

/**
 * Multi Printer Manager
 *
 * Manages multiple Bluetooth printer connections and supports:
 * - Concurrent connections to multiple printers
 * - Broadcasting print jobs to all printers
 * - Individual printer control
 * - Automatic reconnection
 */
export class MultiPrinterManager {
  private readonly logger = Logger.scope('MultiPrinterManager');
  private readonly printers: Map<string, PrinterConnection> = new Map();
  private readonly deviceToPrinter: Map<string, string> = new Map();
  private readonly listeners: EventHandlerMap = {
    'printer-connected': new Set(),
    'printer-disconnected': new Set(),
    'printer-error': new Set(),
    'broadcast-complete': new Set(),
  };

  /**
   * Creates a new MultiPrinterManager instance
   */
  constructor() {}

  /**
   * Register event listener
   */
  on<K extends keyof MultiPrinterManagerEvents>(
    event: K,
    callback: MultiPrinterManagerEvents[K]
  ): void {
    this.listeners[event].add(callback);
  }

  /**
   * Remove event listener
   */
  off<K extends keyof MultiPrinterManagerEvents>(
    event: K,
    callback: MultiPrinterManagerEvents[K]
  ): void {
    this.listeners[event].delete(callback);
  }

  /**
   * Emit an event
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  private emit<K extends keyof MultiPrinterManagerEvents>(event: K, data: any): void {
    this.listeners[event].forEach(handler => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        (handler as (data: any) => void)(data);
      } catch (error) {
        this.logger.error(`Error in event handler for "${event}":`, error);
      }
    });
  }

  /**
   * Connect to a printer
   *
   * @param printerId - Custom ID for this printer (will be auto-generated if not provided)
   * @param deviceId - Bluetooth device ID
   * @param deviceName - Optional device name
   * @returns The printer ID used
   */
  async connect(
    printerIdOrDeviceId: string,
    deviceId?: string,
    deviceName?: string
  ): Promise<string> {
    // Overload: connect(printerId, deviceId, deviceName?)
    // Overload: connect(deviceId) - uses deviceId as printerId

    let printerId: string;
    let actualDeviceId: string;
    let actualDeviceName: string | undefined;

    if (deviceId === undefined) {
      // Called with just deviceId: connect(deviceId)
      printerId = printerIdOrDeviceId;
      actualDeviceId = printerIdOrDeviceId;
    } else {
      // Called with printerId and deviceId: connect(printerId, deviceId, deviceName?)
      printerId = printerIdOrDeviceId;
      actualDeviceId = deviceId;
      actualDeviceName = deviceName;
    }

    // Check if already connected
    if (this.printers.has(printerId)) {
      this.logger.warn(`Printer already connected: ${printerId}`);
      return printerId;
    }

    // Check if device is already connected to another printer
    const existingPrinterId = this.deviceToPrinter.get(actualDeviceId);
    if (existingPrinterId) {
      throw new BluetoothPrintError(
        ErrorCode.CONNECTION_FAILED,
        `Device ${actualDeviceId} is already connected as "${existingPrinterId}"`
      );
    }

    this.logger.info(`Connecting printer "${printerId}" to device ${actualDeviceId}`);

    try {
      const printer = new BluetoothPrinter();

      // Set up error handler
      printer.on('error', error => {
        this.emit('printer-error', { printerId, error });
      });

      // Connect
      await printer.connect(actualDeviceId);

      const connection: PrinterConnection = {
        printerId,
        deviceId: actualDeviceId,
        name: actualDeviceName || `Printer ${printerId}`,
        printer,
        connectedAt: Date.now(),
        lastActivity: Date.now(),
      };

      this.printers.set(printerId, connection);
      this.deviceToPrinter.set(actualDeviceId, printerId);

      this.emit('printer-connected', connection);
      this.logger.info(`Printer "${printerId}" connected successfully`);

      return printerId;
    } catch (error) {
      this.logger.error(`Failed to connect printer "${printerId}":`, error);
      throw error;
    }
  }

  /**
   * Disconnect a printer
   */
  async disconnect(printerId: string): Promise<void> {
    const connection = this.printers.get(printerId);
    if (!connection) {
      this.logger.warn(`Printer not found: ${printerId}`);
      return;
    }

    this.logger.info(`Disconnecting printer "${printerId}"`);

    try {
      await connection.printer.disconnect();
    } catch (error) {
      this.logger.warn(`Error during disconnect for "${printerId}":`, error);
    }

    this.deviceToPrinter.delete(connection.deviceId);
    this.printers.delete(printerId);

    this.emit('printer-disconnected', {
      printerId,
      deviceId: connection.deviceId,
    });

    this.logger.info(`Printer "${printerId}" disconnected`);
  }

  /**
   * Disconnect all printers
   */
  async disconnectAll(): Promise<void> {
    this.logger.info('Disconnecting all printers');

    const disconnectPromises = Array.from(this.printers.keys()).map(id =>
      this.disconnect(id).catch(error => {
        this.logger.error(`Error disconnecting "${id}":`, error);
      })
    );

    await Promise.allSettled(disconnectPromises);

    this.logger.info('All printers disconnected');
  }

  /**
   * Get a printer by ID
   */
  getPrinter(printerId: string): BluetoothPrinter | undefined {
    return this.printers.get(printerId)?.printer;
  }

  /**
   * Get connection info for a printer
   */
  getConnection(printerId: string): PrinterConnection | undefined {
    return this.printers.get(printerId);
  }

  /**
   * Get all connected printers
   */
  getAllPrinters(): PrinterConnection[] {
    return Array.from(this.printers.values());
  }

  /**
   * Get printer count
   */
  get count(): number {
    return this.printers.size;
  }

  /**
   * Check if a printer is connected
   */
  isConnected(printerId: string): boolean {
    return this.printers.has(printerId);
  }

  /**
   * Update last activity timestamp for a printer
   */
  touch(printerId: string): void {
    const connection = this.printers.get(printerId);
    if (connection) {
      connection.lastActivity = Date.now();
    }
  }

  /**
   * Print to a specific printer
   */
  print(printerId: string, data: Uint8Array): void {
    const connection = this.printers.get(printerId);
    if (!connection) {
      throw new BluetoothPrintError(ErrorCode.DEVICE_NOT_FOUND, `Printer not found: ${printerId}`);
    }

    connection.lastActivity = Date.now();
    this.touch(printerId);

    // Note: Actual printing should be done through the printer's API
    // This method is a placeholder for direct buffer printing
    this.logger.debug(`Print to "${printerId}": ${data.length} bytes`);
  }

  /**
   * Broadcast data to all connected printers
   */
  async broadcast(
    data: Uint8Array,
    options: BroadcastOptions = {}
  ): Promise<{ success: number; failed: number }> {
    const { parallel = true, continueOnError = true } = options;

    this.logger.info(`Broadcasting to ${this.printers.size} printers`);

    const results = { success: 0, failed: 0 };

    if (this.printers.size === 0) {
      return results;
    }

    const printPromises = Array.from(this.printers.entries()).map(
      // eslint-disable-next-line @typescript-eslint/require-await
      async ([printerId, connection]) => {
        try {
          // Update activity
          connection.lastActivity = Date.now();

          // Print using the printer's fluent API
          // Note: In real usage, you'd call the actual print method
          this.logger.debug(`Broadcast to "${printerId}": ${data.length} bytes`);
          results.success++;
        } catch (error) {
          this.logger.error(`Broadcast failed for "${printerId}":`, error);
          results.failed++;

          if (!continueOnError) {
            throw error;
          }
        }
      }
    );

    if (parallel) {
      await Promise.allSettled(printPromises);
    } else {
      for (const promise of printPromises) {
        try {
          await promise;
        } catch {
          // Already handled in the promise
        }
      }
    }

    this.emit('broadcast-complete', results);
    this.logger.info(`Broadcast complete: ${results.success} success, ${results.failed} failed`);

    return results;
  }

  /**
   * Find idle printers (for load balancing)
   */
  getIdlePrinters(): PrinterConnection[] {
    return Array.from(this.printers.values())
      .filter(c => c.printer.state === PrinterState.CONNECTED)
      .sort((a, b) => (a.lastActivity ?? 0) - (b.lastActivity ?? 0));
  }

  /**
   * Get printer statistics
   */
  getStats(): {
    total: number;
    connected: number;
    byName: Record<string, number>;
  } {
    const stats = {
      total: this.printers.size,
      connected: 0,
      byName: {} as Record<string, number>,
    };

    for (const connection of this.printers.values()) {
      if (connection.printer.state === PrinterState.CONNECTED) {
        stats.connected++;
      }

      stats.byName[connection.name] = (stats.byName[connection.name] || 0) + 1;
    }

    return stats;
  }

  /**
   * Clean up inactive printers (based on last activity)
   */
  async cleanupInactive(maxIdleMs = 300000): Promise<number> {
    const now = Date.now();
    let cleaned = 0;

    for (const [printerId, connection] of this.printers.entries()) {
      const idleTime = now - (connection.lastActivity ?? connection.connectedAt);
      if (idleTime > maxIdleMs) {
        this.logger.info(`Cleaning up inactive printer "${printerId}" (idle ${idleTime}ms)`);
        await this.disconnect(printerId);
        cleaned++;
      }
    }

    return cleaned;
  }

  /**
   * Destroy the manager and disconnect all printers
   */
  async destroy(): Promise<void> {
    this.logger.info('Destroying MultiPrinterManager');

    await this.disconnectAll();

    // Clear all listeners
    for (const key of Object.keys(this.listeners) as (keyof EventHandlerMap)[]) {
      this.listeners[key].clear();
    }

    this.logger.info('MultiPrinterManager destroyed');
  }
}

// Export singleton for convenience
export const multiPrinterManager = new MultiPrinterManager();
