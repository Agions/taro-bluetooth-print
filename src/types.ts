/**
 * Core Type Definitions
 */

export enum PrinterState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  DISCONNECTING = 'disconnecting',
}

export interface IPrinterAdapter {
  connect(deviceId: string): Promise<void>;
  disconnect(deviceId: string): Promise<void>;
  write(deviceId: string, buffer: ArrayBuffer): Promise<void>;
  startDiscovery?(): Promise<void>;
  stopDiscovery?(): Promise<void>;
  onStateChange?(callback: (state: PrinterState) => void): void;
}

export interface IPrinterDriver {
  init(): Uint8Array[];
  text(content: string, encoding?: string): Uint8Array[];
  image(data: any, width: number, height: number): Uint8Array[];
  cut(): Uint8Array[];
  feed(lines: number): Uint8Array[];
}

export interface IPrintOptions {
  encoding?: string;
  codepage?: number;
}
