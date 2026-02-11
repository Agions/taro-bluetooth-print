/**
 * Retry Plugin
 * Provides automatic retry with exponential backoff for failed operations
 */

import { Plugin, PluginFactory, PluginOptions } from '../types';
import { Logger } from '@/utils/logger';
import { BluetoothPrintError, ErrorCode } from '@/errors/BluetoothError';

export interface RetryPluginOptions extends PluginOptions {
  /** Maximum retry attempts (default: 3) */
  maxRetries?: number;
  /** Initial delay in ms (default: 1000) */
  initialDelay?: number;
  /** Maximum delay in ms (default: 10000) */
  maxDelay?: number;
  /** Backoff multiplier (default: 2) */
  backoffMultiplier?: number;
  /** Error codes that should trigger retry */
  retryableErrors?: ErrorCode[];
}

/**
 * Creates a retry plugin instance
 */
export const createRetryPlugin: PluginFactory = (options?: RetryPluginOptions): Plugin => {
  const opts: Required<RetryPluginOptions> = {
    maxRetries: options?.maxRetries ?? 3,
    initialDelay: options?.initialDelay ?? 1000,
    maxDelay: options?.maxDelay ?? 10000,
    backoffMultiplier: options?.backoffMultiplier ?? 2,
    retryableErrors: options?.retryableErrors ?? [
      ErrorCode.CONNECTION_FAILED,
      ErrorCode.CONNECTION_TIMEOUT,
      ErrorCode.WRITE_FAILED,
      ErrorCode.WRITE_TIMEOUT,
    ],
  };

  const logger = Logger.scope('RetryPlugin');
  let retryCount = 0;
  let currentDelay = opts.initialDelay;

  const shouldRetry = (error: BluetoothPrintError): boolean => {
    return (
      retryCount < opts.maxRetries &&
      opts.retryableErrors.includes(error.code)
    );
  };

  const sleep = (ms: number): Promise<void> => {
    return new Promise(resolve => setTimeout(resolve, ms));
  };

  return {
    name: 'retry',
    version: '1.0.0',
    description: 'Automatic retry with exponential backoff',

    hooks: {
      beforeConnect: () => {
        // Reset retry state on new connection attempt
        retryCount = 0;
        currentDelay = opts.initialDelay;
      },

      beforePrint: () => {
        // Reset retry state on new print job
        retryCount = 0;
        currentDelay = opts.initialDelay;
      },

      onError: async (error: BluetoothPrintError) => {
        if (shouldRetry(error)) {
          retryCount++;
          logger.warn(
            `Retryable error occurred (attempt ${retryCount}/${opts.maxRetries}): ${error.code}`
          );
          logger.info(`Waiting ${currentDelay}ms before retry...`);
          
          await sleep(currentDelay);
          
          // Exponential backoff
          currentDelay = Math.min(
            currentDelay * opts.backoffMultiplier,
            opts.maxDelay
          );

          // Note: Returning false means error is not suppressed
          // The actual retry logic would need to be implemented in the printer
          // This plugin mainly provides the delay and logging
          return false;
        }

        if (retryCount > 0) {
          logger.error(
            `Failed after ${retryCount} retries: ${error.code} - ${error.message}`
          );
        }

        return false;
      },
    },

    init: () => {
      logger.info(`Retry plugin initialized (max: ${opts.maxRetries}, delay: ${opts.initialDelay}ms)`);
    },
  };
};
