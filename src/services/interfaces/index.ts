/**
 * Service Interfaces
 *
 * Defines the interfaces for the core services used by BluetoothPrinter
 *
 * @packageDocumentation
 */

// Re-export individual interfaces for tree-shaking and clear dependencies
export type { IConnectionManager } from './IConnectionManager';
export type { IPrintJobManager } from './IPrintJobManager';
export type { ICommandBuilder } from './ICommandBuilder';
