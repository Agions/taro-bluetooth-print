/**
 * Logging Plugin
 * Provides detailed logging for printer operations
 */

import { Plugin, PluginFactory, PluginOptions } from '../types';
import { Logger, LogLevel } from '@/utils/logger';

export interface LoggingPluginOptions extends PluginOptions {
  /** Log level (default: DEBUG) */
  level?: LogLevel;
  /** Include timestamps (default: true) */
  timestamps?: boolean;
  /** Log progress updates (default: false, can be noisy) */
  logProgress?: boolean;
}

/**
 * Creates a logging plugin instance
 */
export const createLoggingPlugin: PluginFactory = (options?: LoggingPluginOptions): Plugin => {
  const opts: Required<LoggingPluginOptions> = {
    level: options?.level ?? LogLevel.DEBUG,
    timestamps: options?.timestamps ?? true,
    logProgress: options?.logProgress ?? false,
  };

  const logger = Logger.scope('PrinterLog');
  let startTime: number;

  const formatTime = (): string => {
    if (!opts.timestamps) return '';
    return `[${new Date().toISOString()}] `;
  };

  return {
    name: 'logging',
    version: '1.0.0',
    description: 'Detailed logging for printer operations',

    hooks: {
      beforeConnect: (deviceId: string) => {
        startTime = Date.now();
        logger.info(`${formatTime()}Connecting to device: ${deviceId}`);
      },

      afterConnect: (deviceId: string) => {
        const elapsed = Date.now() - startTime;
        logger.info(`${formatTime()}Connected to ${deviceId} (${elapsed}ms)`);
      },

      beforeDisconnect: (deviceId: string) => {
        logger.info(`${formatTime()}Disconnecting from: ${deviceId}`);
      },

      afterDisconnect: (deviceId: string) => {
        logger.info(`${formatTime()}Disconnected from: ${deviceId}`);
      },

      beforePrint: (buffer: Uint8Array) => {
        startTime = Date.now();
        logger.info(`${formatTime()}Starting print job: ${buffer.length} bytes`);
      },

      afterPrint: (bytesSent: number) => {
        const elapsed = Date.now() - startTime;
        const speed = ((bytesSent / elapsed) * 1000).toFixed(2);
        logger.info(`${formatTime()}Print complete: ${bytesSent} bytes in ${elapsed}ms (${speed} B/s)`);
      },

      onError: (error) => {
        logger.error(`${formatTime()}Error [${error.code}]: ${error.message}`);
        return false; // Don't suppress the error
      },

      onStateChange: (state, previousState) => {
        logger.debug(`${formatTime()}State: ${previousState} → ${state}`);
      },

      onProgress: (sent, total) => {
        if (opts.logProgress) {
          const percent = ((sent / total) * 100).toFixed(1);
          logger.debug(`${formatTime()}Progress: ${sent}/${total} (${percent}%)`);
        }
      },
    },

    init: () => {
      Logger.setLevel(opts.level);
      logger.info('Logging plugin initialized');
    },

    destroy: () => {
      logger.info('Logging plugin destroyed');
    },
  };
};
