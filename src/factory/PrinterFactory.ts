/**
 * Printer Factory
 *
 * Factory for creating properly configured BluetoothPrinter instances.
 * This is the recommended way to create printer instances - avoid direct
 * constructor calls unless you need custom dependency injection.
 */

import { BluetoothPrinter } from '@/core/BluetoothPrinter';
import { ConnectionManager } from '@/services/ConnectionManager';
import { PrintJobManager } from '@/services/PrintJobManager';
import { CommandBuilder } from '@/services/CommandBuilder';
import type { IPrinterAdapter } from '@/types';
import type { IConnectionManager, IPrintJobManager, ICommandBuilder } from '@/services/interfaces';

/**
 * Options for creating a BluetoothPrinter via the factory
 */
export interface PrinterFactoryOptions {
  /**
   * Printer adapter to use for Bluetooth communication.
   * Required if not providing custom connectionManager.
   *
   * Common adapters:
   * - WebBluetoothAdapter (browser Web Bluetooth API)
   * - TaroAdapter (Taro framework)
   * - AlipayAdapter (Alipay mini-program)
   * - ReactNativeAdapter (React Native)
   *
   * @example
   * ```typescript
   * import { WebBluetoothAdapter } from 'taro-bluetooth-print';
   *
   * const printer = createBluetoothPrinter({
   *   adapter: new WebBluetoothAdapter()
   * });
   * ```
   */
  adapter?: IPrinterAdapter;

  /**
   * Custom connection manager instance.
   * If provided, overrides the default ConnectionManager.
   * Useful for testing or custom connection handling.
   */
  connectionManager?: IConnectionManager;

  /**
   * Custom print job manager instance.
   * If provided, overrides the default PrintJobManager.
   * Useful for custom job scheduling or queue management.
   */
  printJobManager?: IPrintJobManager;

  /**
   * Custom command builder instance.
   * If provided, overrides the default CommandBuilder.
   * Useful for custom command formatting or driver selection.
   */
  commandBuilder?: ICommandBuilder;
}

/**
 * Creates a new BluetoothPrinter instance with properly configured services.
 *
 * This is the recommended factory function for creating printer instances.
 * It handles dependency injection and ensures all services are properly wired.
 *
 * @param options - Factory options for configuring the printer
 * @returns A fully configured BluetoothPrinter instance
 *
 * @example
 * ```typescript
 * // Basic usage with WebBluetooth
 * import { createBluetoothPrinter, WebBluetoothAdapter } from 'taro-bluetooth-print';
 *
 * const printer = createBluetoothPrinter({
 *   adapter: new WebBluetoothAdapter()
 * });
 *
 * await printer.connect('device-id');
 * await printer.text('Hello').feed(2).cut().print();
 * ```
 *
 * @example
 * ```typescript
 * // Advanced usage with custom services
 * import { createBluetoothPrinter, TaroAdapter } from 'taro-bluetooth-print';
 *
 * const printer = createBluetoothPrinter({
 *   adapter: new TaroAdapter(),
 *   printJobManager: customPrintJobManager,
 * });
 * ```
 */
export function createBluetoothPrinter(options: PrinterFactoryOptions = {}): BluetoothPrinter {
  const { adapter, connectionManager, printJobManager, commandBuilder } = options;

  // Build dependency chain: CommandBuilder -> PrintJobManager -> ConnectionManager -> Adapter
  const finalConnectionManager = connectionManager ?? new ConnectionManager(adapter);
  const finalPrintJobManager = printJobManager ?? new PrintJobManager(finalConnectionManager);
  const finalCommandBuilder = commandBuilder ?? new CommandBuilder();

  return new BluetoothPrinter(finalConnectionManager, finalPrintJobManager, finalCommandBuilder);
}

/**
 * Creates a BluetoothPrinter instance for the Web Bluetooth API.
 *
 * This is a convenience function specifically for browser environments
 * using the Web Bluetooth API.
 *
 * @param adapterOptions - Options to pass to the WebBluetoothAdapter
 * @returns A BluetoothPrinter instance configured for Web Bluetooth
 *
 * @example
 * ```typescript
 * import { createWebBluetoothPrinter } from 'taro-bluetooth-print';
 *
 * const printer = createWebBluetoothPrinter();
 * await printer.connect('device-id');
 * ```
 */
export async function createWebBluetoothPrinter(): Promise<BluetoothPrinter> {
  try {
    const { WebBluetoothAdapter } = await import('@/adapters/WebBluetoothAdapter');
    const adapter = new WebBluetoothAdapter();
    return createBluetoothPrinter({ adapter });
  } catch {
    throw new Error(
      'Failed to dynamically import WebBluetoothAdapter. ' +
        'This adapter is only available in browser environments that support the Web Bluetooth API.'
    );
  }
}

/**
 * Default printer factory instance
 *
 * @deprecated Use the factory functions directly. This export exists
 * for backward compatibility only.
 */
export const PrinterFactory = {
  create: createBluetoothPrinter,
  createWebBluetooth: createWebBluetoothPrinter,
};
