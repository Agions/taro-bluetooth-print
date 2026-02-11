/**
 * Plugin System Types
 * Defines interfaces for extending BluetoothPrinter functionality
 */

import { BluetoothPrintError } from '@/errors/BluetoothError';
import { PrinterState } from '@/types';

/**
 * Plugin lifecycle hooks
 */
export interface PluginHooks {
  /**
   * Called before connecting to a device
   * @param deviceId - Target device ID
   * @returns Modified device ID or void
   */
  beforeConnect?: (deviceId: string) => string | void | Promise<string | void>;

  /**
   * Called after successful connection
   * @param deviceId - Connected device ID
   */
  afterConnect?: (deviceId: string) => void | Promise<void>;

  /**
   * Called before disconnecting
   * @param deviceId - Device ID to disconnect
   */
  beforeDisconnect?: (deviceId: string) => void | Promise<void>;

  /**
   * Called after disconnection
   * @param deviceId - Disconnected device ID
   */
  afterDisconnect?: (deviceId: string) => void | Promise<void>;

  /**
   * Called before sending print data
   * @param buffer - Data buffer to send
   * @returns Modified buffer or void
   */
  beforePrint?: (buffer: Uint8Array) => Uint8Array | void | Promise<Uint8Array | void>;

  /**
   * Called after print job completes
   * @param bytesSent - Total bytes sent
   */
  afterPrint?: (bytesSent: number) => void | Promise<void>;

  /**
   * Called when an error occurs
   * @param error - The error that occurred
   * @returns Whether to suppress the error (true = suppress)
   */
  onError?: (error: BluetoothPrintError) => boolean | void | Promise<boolean | void>;

  /**
   * Called when printer state changes
   * @param state - New printer state
   * @param previousState - Previous state
   */
  onStateChange?: (state: PrinterState, previousState: PrinterState) => void | Promise<void>;

  /**
   * Called during print progress
   * @param sent - Bytes sent
   * @param total - Total bytes
   */
  onProgress?: (sent: number, total: number) => void | Promise<void>;
}

/**
 * Plugin configuration options
 */
export interface PluginOptions {
  [key: string]: unknown;
}

/**
 * Plugin interface
 */
export interface Plugin {
  /**
   * Unique plugin name
   */
  name: string;

  /**
   * Plugin version
   */
  version?: string;

  /**
   * Plugin description
   */
  description?: string;

  /**
   * Plugin hooks
   */
  hooks: PluginHooks;

  /**
   * Plugin initialization
   * @param options - Plugin options
   */
  init?: (options?: PluginOptions) => void | Promise<void>;

  /**
   * Plugin cleanup
   */
  destroy?: () => void | Promise<void>;
}

/**
 * Plugin factory function type
 */
export type PluginFactory = (options?: PluginOptions) => Plugin;
