/**
 * Core Type Definitions
 *
 * This file contains all the main type definitions used throughout the library.
 */

/**
 * Printer connection and operation states
 */
export enum PrinterState {
  /** Printer is disconnected from any device */
  DISCONNECTED = 'disconnected',
  /** Printer is in the process of connecting */
  CONNECTING = 'connecting',
  /** Printer is connected to a device */
  CONNECTED = 'connected',
  /** Printer is in the process of disconnecting */
  DISCONNECTING = 'disconnecting',
  /** Printer is actively printing a job */
  PRINTING = 'printing',
  /** Printer has paused the current print job */
  PAUSED = 'paused',
}

/**
 * Options for controlling Bluetooth data transfer
 */
export interface IAdapterOptions {
  /** Size of data chunks to send at once (default: 20 bytes) */
  chunkSize?: number;
  /** Delay between sending chunks in milliseconds (default: 20ms) */
  delay?: number;
  /** Number of retries on write failure (default: 3) */
  retries?: number;
}

/**
 * Interface for printer adapters
 *
 * Adapters handle the low-level communication with Bluetooth devices.
 */
export interface IPrinterAdapter {
  /**
   * Connect to a Bluetooth device
   * @param deviceId - Unique identifier of the device to connect to
   */
  connect(deviceId: string): Promise<void>;

  /**
   * Disconnect from a Bluetooth device
   * @param deviceId - Unique identifier of the device to disconnect from
   */
  disconnect(deviceId: string): Promise<void>;

  /**
   * Write data to a connected Bluetooth device
   * @param deviceId - Unique identifier of the connected device
   * @param buffer - Data to write as ArrayBuffer
   * @param options - Optional settings for the write operation
   */
  write(deviceId: string, buffer: ArrayBuffer, options?: IAdapterOptions): Promise<void>;

  /**
   * Start discovering nearby Bluetooth devices (optional)
   */
  startDiscovery?(): Promise<void>;

  /**
   * Stop discovering nearby Bluetooth devices (optional)
   */
  stopDiscovery?(): Promise<void>;

  /**
   * Register a callback for connection state changes
   * @param callback - Function to call when the state changes
   */
  onStateChange?(callback: (state: PrinterState) => void): void;
}

/**
 * Interface for printer drivers
 *
 * Drivers convert high-level print commands to device-specific byte sequences.
 */
export interface IPrinterDriver {
  /**
   * Initialize the printer to default settings
   * @returns Array of command buffers
   */
  init(): Uint8Array[];

  /**
   * Print text
   * @param content - Text content to print
   * @param encoding - Text encoding to use (default: 'GBK')
   * @returns Array of command buffers
   */
  text(content: string, encoding?: string): Uint8Array[];

  /**
   * Print an image
   * @param data - RGBA pixel data as Uint8Array
   * @param width - Image width in pixels
   * @param height - Image height in pixels
   * @returns Array of command buffers
   */
  image(data: Uint8Array, width: number, height: number): Uint8Array[];

  /**
   * Print a QR code
   * @param content - Content to encode in the QR code
   * @param options - QR code generation options
   * @returns Array of command buffers
   */
  qr(content: string, options?: IQrOptions): Uint8Array[];

  /**
   * Cut the paper
   * @returns Array of command buffers
   */
  cut(): Uint8Array[];

  /**
   * Feed paper
   * @param lines - Number of lines to feed (default: 1)
   * @returns Array of command buffers
   */
  feed(lines?: number): Uint8Array[];
}

/**
 * Options for QR code generation
 */
export interface IQrOptions {
  /** QR code model (1 or 2, default: 2) */
  model?: 1 | 2;
  /** QR code size (1-16, default: 6) */
  size?: number;
  /** Error correction level (L, M, Q, H, default: M) */
  errorCorrection?: 'L' | 'M' | 'Q' | 'H';
}

/**
 * Options for print operations
 */
export interface IPrintOptions {
  /** Text encoding to use (default: 'GBK') */
  encoding?: string;
  /** Printer codepage to use */
  codepage?: number;
}

/**
 * Print job progress information
 */
export interface PrintProgress {
  /** Number of bytes sent to the printer */
  sent: number;
  /** Total number of bytes to send */
  total: number;
}

/**
 * Device information interface
 */
export interface DeviceInfo {
  /** Unique device identifier */
  deviceId: string;
  /** Device name */
  name: string;
  /** Device RSSI (signal strength) */
  rssi?: number;
  /** Device manufacturer data */
  advertisData?: ArrayBuffer;
}
