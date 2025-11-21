/**
 * Core Type Definitions
 */

export enum PrinterState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  DISCONNECTING = 'disconnecting',
  PRINTING = 'printing',
  PAUSED = 'paused',
}

export interface IAdapterOptions {
  chunkSize?: number; // Default 20
  delay?: number; // Delay between chunks in ms. Default 20.
  retries?: number; // Number of retries on write failure. Default 0.
}

export interface IPrinterAdapter {
  connect(deviceId: string): Promise<void>;
  disconnect(deviceId: string): Promise<void>;
  write(deviceId: string, buffer: ArrayBuffer, options?: IAdapterOptions): Promise<void>;
  startDiscovery?(): Promise<void>;
  stopDiscovery?(): Promise<void>;
  onStateChange?(callback: (state: PrinterState) => void): void;
}

export interface IPrinterDriver {
  init(): Uint8Array[];
  text(content: string, encoding?: string): Uint8Array[];
  image(data: any, width: number, height: number): Uint8Array[];
  qr(content: string, options?: IQrOptions): Uint8Array[];
  cut(): Uint8Array[];
  feed(lines: number): Uint8Array[];
}

export interface IQrOptions {
  model?: 1 | 2;
  size?: number; // 1-16
  errorCorrection?: 'L' | 'M' | 'Q' | 'H';
}

export interface IPrintOptions {
  encoding?: string;
  codepage?: number;
}
