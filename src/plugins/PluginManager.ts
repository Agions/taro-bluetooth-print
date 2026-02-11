/**
 * Plugin Manager
 * Manages plugin lifecycle and hook execution
 */

import { Plugin, PluginHooks, PluginOptions } from './types';
import { BluetoothPrintError, ErrorCode } from '@/errors/BluetoothError';
import { PrinterState } from '@/types';
import { Logger } from '@/utils/logger';

/**
 * Manages plugins for BluetoothPrinter
 */
export class PluginManager {
  private plugins: Map<string, Plugin> = new Map();
  private readonly logger = Logger.scope('PluginManager');

  /**
   * Register a plugin
   * @param plugin - Plugin to register
   * @param options - Plugin options
   * @throws {BluetoothPrintError} If plugin with same name already exists
   */
  async register(plugin: Plugin, options?: PluginOptions): Promise<void> {
    if (this.plugins.has(plugin.name)) {
      throw new BluetoothPrintError(
        ErrorCode.INVALID_CONFIGURATION,
        `Plugin "${plugin.name}" is already registered`
      );
    }

    this.logger.info(`Registering plugin: ${plugin.name}${plugin.version ? ` v${plugin.version}` : ''}`);

    if (plugin.init) {
      await plugin.init(options);
    }

    this.plugins.set(plugin.name, plugin);
    this.logger.debug(`Plugin registered: ${plugin.name}`);
  }

  /**
   * Unregister a plugin
   * @param name - Plugin name to unregister
   */
  async unregister(name: string): Promise<void> {
    const plugin = this.plugins.get(name);
    if (!plugin) {
      this.logger.warn(`Plugin not found: ${name}`);
      return;
    }

    if (plugin.destroy) {
      await plugin.destroy();
    }

    this.plugins.delete(name);
    this.logger.info(`Plugin unregistered: ${name}`);
  }

  /**
   * Get a registered plugin
   * @param name - Plugin name
   * @returns Plugin instance or undefined
   */
  get(name: string): Plugin | undefined {
    return this.plugins.get(name);
  }

  /**
   * Get all registered plugin names
   * @returns Array of plugin names
   */
  getNames(): string[] {
    return Array.from(this.plugins.keys());
  }

  /**
   * Check if a plugin is registered
   * @param name - Plugin name
   * @returns True if registered
   */
  has(name: string): boolean {
    return this.plugins.has(name);
  }

  /**
   * Execute a hook across all plugins
   * @param hookName - Name of the hook to execute
   * @param args - Arguments to pass to the hook
   * @returns Result from hooks (last non-void result)
   */
  async executeHook<K extends keyof PluginHooks>(
    hookName: K,
    ...args: Parameters<NonNullable<PluginHooks[K]>>
  ): Promise<unknown> {
    let result: unknown = undefined;

    for (const [name, plugin] of this.plugins) {
      const hook = plugin.hooks[hookName];
      if (hook) {
        try {
          // @ts-expect-error - TypeScript can't infer the correct types here
          const hookResult = await hook(...args);
          if (hookResult !== undefined) {
            result = hookResult;
          }
        } catch (error) {
          this.logger.error(`Plugin "${name}" hook "${hookName}" failed:`, error);
          // Continue to next plugin
        }
      }
    }

    return result;
  }

  /**
   * Execute beforeConnect hooks
   */
  async beforeConnect(deviceId: string): Promise<string> {
    const result = await this.executeHook('beforeConnect', deviceId);
    return (result as string) || deviceId;
  }

  /**
   * Execute afterConnect hooks
   */
  async afterConnect(deviceId: string): Promise<void> {
    await this.executeHook('afterConnect', deviceId);
  }

  /**
   * Execute beforeDisconnect hooks
   */
  async beforeDisconnect(deviceId: string): Promise<void> {
    await this.executeHook('beforeDisconnect', deviceId);
  }

  /**
   * Execute afterDisconnect hooks
   */
  async afterDisconnect(deviceId: string): Promise<void> {
    await this.executeHook('afterDisconnect', deviceId);
  }

  /**
   * Execute beforePrint hooks
   */
  async beforePrint(buffer: Uint8Array): Promise<Uint8Array> {
    const result = await this.executeHook('beforePrint', buffer);
    return (result as Uint8Array) || buffer;
  }

  /**
   * Execute afterPrint hooks
   */
  async afterPrint(bytesSent: number): Promise<void> {
    await this.executeHook('afterPrint', bytesSent);
  }

  /**
   * Execute onError hooks
   * @returns True if error should be suppressed
   */
  async onError(error: BluetoothPrintError): Promise<boolean> {
    const result = await this.executeHook('onError', error);
    return result === true;
  }

  /**
   * Execute onStateChange hooks
   */
  async onStateChange(state: PrinterState, previousState: PrinterState): Promise<void> {
    await this.executeHook('onStateChange', state, previousState);
  }

  /**
   * Execute onProgress hooks
   */
  async onProgress(sent: number, total: number): Promise<void> {
    await this.executeHook('onProgress', sent, total);
  }

  /**
   * Clear all plugins
   */
  async clear(): Promise<void> {
    for (const name of this.plugins.keys()) {
      await this.unregister(name);
    }
  }
}
