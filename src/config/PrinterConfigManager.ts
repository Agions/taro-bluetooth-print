/**
 * Printer Configuration Manager
 *
 * Manages persistent printer configurations including:
 * - Saved devices and their settings
 * - Default print parameters
 * - User preferences
 *
 * Supports localStorage and file-based storage backends.
 *
 * @example
 * ```typescript
 * const configManager = new PrinterConfigManager();
 *
 * // Save a printer configuration
 * configManager.savePrinter({
 *   id: 'my-printer',
 *   deviceId: 'XX:XX:XX:XX:XX:XX',
 *   name: 'Kitchen Printer',
 *   isDefault: true
 * });
 *
 * // Get all saved printers
 * const printers = configManager.getSavedPrinters();
 *
 * // Load configuration for a printer
 * const config = configManager.loadPrinterConfig('my-printer');
 * ```
 */

import { Logger } from '@/utils/logger';

/**
 * Print configuration for a device
 */
export interface PrintConfig {
  /** Encoding (default: 'GBK') */
  encoding?: string;
  /** Chunk size for data transfer */
  chunkSize?: number;
  /** Delay between chunks in ms */
  chunkDelay?: number;
  /** Number of retries */
  retries?: number;
}

/**
 * Saved printer configuration
 */
export interface SavedPrinter {
  /** Unique printer ID */
  id: string;
  /** Bluetooth device ID */
  deviceId: string;
  /** Friendly name */
  name: string;
  /** Printer model/type */
  model?: string;
  /** Whether this is the default printer */
  isDefault?: boolean;
  /** Print configuration */
  printConfig?: PrintConfig;
  /** Auto-reconnect on disconnect */
  autoReconnect?: boolean;
  /** Last connected timestamp */
  lastConnected?: number;
  /** Creation timestamp */
  createdAt: number;
  /** Update timestamp */
  updatedAt: number;
}

/**
 * Global configuration
 */
export interface GlobalConfig {
  /** Default encoding */
  defaultEncoding: string;
  /** Default chunk size */
  defaultChunkSize: number;
  /** Default chunk delay */
  defaultChunkDelay: number;
  /** Default retries */
  defaultRetries: number;
  /** Auto-reconnect by default */
  defaultAutoReconnect: boolean;
  /** Scan timeout in ms */
  scanTimeout: number;
  /** Enable logging */
  enableLogging: boolean;
}

/**
 * Configuration storage interface
 */
export interface IConfigStorage {
  get<T>(key: string, defaultValue: T): T;
  set<T>(key: string, value: T): void;
  remove(key: string): void;
  clear(): void;
}

/**
 * LocalStorage-based implementation
 */
export class LocalStorage implements IConfigStorage {
  private prefix: string;

  constructor(prefix = 'taro_bt_print_') {
    this.prefix = prefix;
  }

  get<T>(key: string, defaultValue: T): T {
    try {
      const stored = localStorage.getItem(this.prefix + key);
      if (stored === null) {
        return defaultValue;
      }
      return JSON.parse(stored) as T;
    } catch {
      return defaultValue;
    }
  }

  set<T>(key: string, value: T): void {
    try {
      localStorage.setItem(this.prefix + key, JSON.stringify(value));
    } catch (error) {
      Logger.scope('ConfigStorage').error(`Failed to save "${key}":`, error);
    }
  }

  remove(key: string): void {
    try {
      localStorage.removeItem(this.prefix + key);
    } catch (error) {
      Logger.scope('ConfigStorage').error(`Failed to remove "${key}":`, error);
    }
  }

  clear(): void {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(this.prefix)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
    } catch (error) {
      Logger.scope('ConfigStorage').error('Failed to clear storage:', error);
    }
  }
}

/**
 * Default global configuration
 */
const DEFAULT_GLOBAL_CONFIG: GlobalConfig = {
  defaultEncoding: 'GBK',
  defaultChunkSize: 20,
  defaultChunkDelay: 20,
  defaultRetries: 3,
  defaultAutoReconnect: true,
  scanTimeout: 15000,
  enableLogging: true,
};

/**
 * Storage keys
 */
const KEYS = {
  PRINTERS: 'printers',
  GLOBAL_CONFIG: 'global_config',
  LAST_USED_PRINTER: 'last_used_printer',
} as const;

/**
 * Printer Configuration Manager
 */
export class PrinterConfigManager {
  private readonly logger = Logger.scope('PrinterConfigManager');
  private readonly storage: IConfigStorage;
  private printers: Map<string, SavedPrinter> = new Map();
  private globalConfig: GlobalConfig;
  private lastUsedPrinterId: string | null = null;

  /**
   * Creates a new PrinterConfigManager instance
   *
   * @param storage - Storage backend (defaults to LocalStorage)
   */
  constructor(storage?: IConfigStorage) {
    this.storage = storage || new LocalStorage();
    this.globalConfig = { ...DEFAULT_GLOBAL_CONFIG };
    this.load();
  }

  /**
   * Load configuration from storage
   */
  private load(): void {
    try {
      // Load printers
      const printers = this.storage.get<SavedPrinter[]>(KEYS.PRINTERS, []);
      this.printers.clear();
      for (const printer of printers) {
        if (printer.id) {
          this.printers.set(printer.id, printer);
        }
      }

      // Load global config
      const globalConfig = this.storage.get<GlobalConfig | null>(KEYS.GLOBAL_CONFIG, null);
      if (globalConfig) {
        this.globalConfig = { ...DEFAULT_GLOBAL_CONFIG, ...globalConfig };
      }

      // Load last used
      this.lastUsedPrinterId = this.storage.get<string | null>(KEYS.LAST_USED_PRINTER, null);

      this.logger.debug(`Loaded ${this.printers.size} saved printers`);
    } catch (error) {
      this.logger.error('Failed to load configuration:', error);
    }
  }

  /**
   * Save configuration to storage
   */
  private save(): void {
    try {
      // Save printers
      const printersArray = Array.from(this.printers.values());
      this.storage.set(KEYS.PRINTERS, printersArray);

      // Save global config
      this.storage.set(KEYS.GLOBAL_CONFIG, this.globalConfig);

      // Save last used
      if (this.lastUsedPrinterId) {
        this.storage.set(KEYS.LAST_USED_PRINTER, this.lastUsedPrinterId);
      } else {
        this.storage.remove(KEYS.LAST_USED_PRINTER);
      }
    } catch (error) {
      this.logger.error('Failed to save configuration:', error);
    }
  }

  /**
   * Save a printer configuration
   *
   * @param printer - Printer configuration to save
   * @returns The saved printer ID
   */
  savePrinter(printer: SavedPrinter): string {
    const now = Date.now();
    const existing = this.printers.get(printer.id);

    const savedPrinter: SavedPrinter = {
      ...printer,
      id: printer.id,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };

    // If setting as default, unset other defaults
    if (savedPrinter.isDefault) {
      for (const [id, p] of this.printers.entries()) {
        if (id !== printer.id && p.isDefault) {
          this.printers.set(id, { ...p, isDefault: false });
        }
      }
    }

    this.printers.set(printer.id, savedPrinter);
    this.save();

    this.logger.info(`Saved printer: ${printer.id} (${printer.name})`);
    return printer.id;
  }

  /**
   * Get a saved printer by ID
   */
  getPrinter(id: string): SavedPrinter | undefined {
    return this.printers.get(id);
  }

  /**
   * Get all saved printers
   */
  getSavedPrinters(): SavedPrinter[] {
    return Array.from(this.printers.values());
  }

  /**
   * Get default printer
   */
  getDefaultPrinter(): SavedPrinter | undefined {
    for (const printer of this.printers.values()) {
      if (printer.isDefault) {
        return printer;
      }
    }

    // Fall back to last used
    if (this.lastUsedPrinterId) {
      return this.printers.get(this.lastUsedPrinterId);
    }

    return undefined;
  }

  /**
   * Remove a saved printer
   */
  removePrinter(id: string): boolean {
    const deleted = this.printers.delete(id);
    if (deleted) {
      this.save();
      this.logger.info(`Removed printer: ${id}`);

      if (this.lastUsedPrinterId === id) {
        this.lastUsedPrinterId = null;
        this.save();
      }
    }
    return deleted;
  }

  /**
   * Set printer as default
   */
  setDefaultPrinter(id: string): void {
    const printer = this.printers.get(id);
    if (!printer) {
      throw new Error(`Printer not found: ${id}`);
    }

    // Unset other defaults
    for (const [pid, p] of this.printers.entries()) {
      if (p.isDefault && pid !== id) {
        this.printers.set(pid, { ...p, isDefault: false });
      }
    }

    // Set this one as default
    this.printers.set(id, { ...printer, isDefault: true });
    this.save();

    this.logger.info(`Set default printer: ${id}`);
  }

  /**
   * Update last used printer
   */
  setLastUsed(id: string): void {
    if (!this.printers.has(id)) {
      this.logger.warn(`Cannot set last used: printer not found ${id}`);
      return;
    }

    this.lastUsedPrinterId = id;

    // Also update lastConnected timestamp
    const printer = this.printers.get(id);
    if (printer) {
      this.printers.set(id, { ...printer, lastConnected: Date.now() });
    }

    this.save();
  }

  /**
   * Get last used printer ID
   */
  getLastUsedId(): string | null {
    return this.lastUsedPrinterId;
  }

  /**
   * Get global configuration
   */
  getGlobalConfig(): GlobalConfig {
    return { ...this.globalConfig };
  }

  /**
   * Update global configuration
   */
  updateGlobalConfig(updates: Partial<GlobalConfig>): void {
    this.globalConfig = { ...this.globalConfig, ...updates };
    this.save();
    this.logger.debug('Global config updated');
  }

  /**
   * Reset global config to defaults
   */
  resetGlobalConfig(): void {
    this.globalConfig = { ...DEFAULT_GLOBAL_CONFIG };
    this.save();
    this.logger.info('Global config reset to defaults');
  }

  /**
   * Load print config for a printer (with defaults applied)
   */
  loadPrinterConfig(printerId: string): PrintConfig {
    const printer = this.printers.get(printerId);
    const printConfig = printer?.printConfig || {};

    return {
      encoding: printConfig.encoding ?? this.globalConfig.defaultEncoding,
      chunkSize: printConfig.chunkSize ?? this.globalConfig.defaultChunkSize,
      chunkDelay: printConfig.chunkDelay ?? this.globalConfig.defaultChunkDelay,
      retries: printConfig.retries ?? this.globalConfig.defaultRetries,
    };
  }

  /**
   * Export all configuration as JSON
   */
  export(): string {
    return JSON.stringify(
      {
        printers: Array.from(this.printers.values()),
        globalConfig: this.globalConfig,
        lastUsedPrinterId: this.lastUsedPrinterId,
        exportedAt: Date.now(),
      },
      null,
      2
    );
  }

  /**
   * Import configuration from JSON
   *
   * @param json - JSON string to import
   * @param merge - If true, merge with existing config; if false, replace
   * @returns Number of printers imported
   */
  import(json: string, merge = false): number {
    try {
      const data = JSON.parse(json) as {
        printers?: SavedPrinter[];
        globalConfig?: GlobalConfig;
        lastUsedPrinterId?: string;
      };

      let imported = 0;

      if (!merge) {
        this.printers.clear();
      }

      if (data.printers && Array.isArray(data.printers)) {
        for (const printer of data.printers) {
          if (printer.id) {
            this.printers.set(printer.id, printer);
            imported++;
          }
        }
      }

      if (data.globalConfig) {
        this.globalConfig = { ...DEFAULT_GLOBAL_CONFIG, ...data.globalConfig };
      }

      if (data.lastUsedPrinterId && this.printers.has(data.lastUsedPrinterId)) {
        this.lastUsedPrinterId = data.lastUsedPrinterId;
      }

      this.save();
      this.logger.info(`Imported ${imported} printers`);

      return imported;
    } catch (error) {
      this.logger.error('Failed to import configuration:', error);
      return 0;
    }
  }

  /**
   * Clear all configuration
   */
  clear(): void {
    this.printers.clear();
    this.lastUsedPrinterId = null;
    this.storage.clear();
    this.logger.info('All configuration cleared');
  }

  /**
   * Get statistics
   */
  getStats(): {
    printerCount: number;
    hasDefault: boolean;
    lastUsed: string | null;
  } {
    let hasDefault = false;
    for (const printer of this.printers.values()) {
      if (printer.isDefault) {
        hasDefault = true;
        break;
      }
    }

    return {
      printerCount: this.printers.size,
      hasDefault,
      lastUsed: this.lastUsedPrinterId,
    };
  }
}

// Export singleton for convenience
export const printerConfigManager = new PrinterConfigManager();
