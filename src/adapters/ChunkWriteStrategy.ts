/**
 * Adaptive Chunk Write Strategy
 *
 * Encapsulates the common adaptive chunk-based write logic shared by
 * MiniProgramAdapter and ReactNativeAdapter. This is the Template Method
 * pattern: the framework handles adaptive transmission, retry, timeout,
 * and chunk size adjustment; subclasses only need to provide the
 * platform-specific single-chunk write operation.
 *
 * @template TOptions - Platform-specific options/context for writeChunk()
 */

import { BluetoothPrintError, ErrorCode } from '@/errors/BluetoothError';
import type { IAdapterOptions } from '@/types';
import { Logger } from '@/utils/logger';

/**
 * Context passed to each writeChunk() call
 */
export interface ChunkWriteContext {
  /** Device identifier */
  deviceId: string;
  /** Service UUID */
  serviceId: string;
  /** Characteristic UUID */
  characteristicId: string;
}

/**
 * Configuration for the adaptive write strategy
 */
export interface AdaptiveWriteConfig {
  /** Default chunk size in bytes */
  defaultChunkSize: number;
  /** Default inter-chunk delay in ms */
  defaultDelay: number;
  /** Default retry count */
  defaultRetries: number;
  /** Minimum chunk size */
  minChunkSize: number;
  /** Maximum chunk size (can be overridden per-call by adapter) */
  maxChunkSize: number;
  /** Maximum delay between retries in ms */
  maxDelay: number;
  /** Number of successful chunks before increasing chunk size */
  successThreshold: number;
  /** Number of consecutive failures before reducing chunk size */
  failureThreshold: number;
  /** Interval (in chunks) for connection re-check */
  connectionCheckInterval: number;
}

/**
 * Default adaptive write configuration
 */
export const DEFAULT_ADAPTIVE_CONFIG: AdaptiveWriteConfig = {
  defaultChunkSize: 20,
  defaultDelay: 20,
  defaultRetries: 3,
  minChunkSize: 10,
  maxChunkSize: 256,
  maxDelay: 200,
  successThreshold: 3,
  failureThreshold: 2,
  connectionCheckInterval: 5,
};

/**
 * Result of a single chunk write attempt
 */
export interface ChunkWriteResult {
  /** Whether the write was successful */
  success: boolean;
  /** The error if write failed */
  error?: Error;
}

/**
 * Adaptive Chunk Write Strategy (Template Method)
 *
 * Provides the full adaptive chunk-based write pipeline. Subclasses
 * (or composing classes) implement writeSingleChunk() for platform-
 * specific BLE write operations.
 */
export abstract class ChunkWriteStrategy<TOptions = void> {
  protected readonly logger: ReturnType<typeof Logger.scope>;
  protected readonly config: AdaptiveWriteConfig;

  constructor(
    loggerScope: string,
    config: Partial<AdaptiveWriteConfig> = {}
  ) {
    this.logger = Logger.scope(loggerScope);
    this.config = { ...DEFAULT_ADAPTIVE_CONFIG, ...config };
  }

  /**
   * Write a single chunk to the device.
   *
   * Platform-specific implementation — subclasses must implement this
   * to call the appropriate BLE API (Taro, React Native, etc.).
   *
   * @param chunk - Data chunk to write
   * @param context - Device/service/characteristic identifiers
   * @param options - Platform-specific options
   * @returns Result indicating success or failure
   */
  protected abstract writeSingleChunk(
    chunk: Uint8Array,
    context: ChunkWriteContext,
    options?: TOptions
  ): Promise<ChunkWriteResult>;

  /**
   * Check if the device is still connected (optional hook).
   * Default: no-op. Override for platforms that support connection state polling.
   */
  protected async checkConnection(_deviceId: string): Promise<void> {
    // default: no connection check
  }

  /**
   * Compute chunk write timeout based on chunk size.
   * Override to customize timeout formula per platform.
   */
  protected computeTimeoutMs(chunkLength: number): number {
    return Math.max(1000, Math.min(10000, 1000 + chunkLength * 5));
  }

  /**
   * Compute the maximum chunk size for a given device.
   * Override to respect MTU or other platform-specific limits.
   */
  protected getMaxChunkSize(_deviceId: string): number {
    return this.config.maxChunkSize;
  }

  /**
   * Execute the adaptive chunk-based write pipeline.
   *
   * @param buffer - Full data buffer to write
   * @param context - Device/service/characteristic identifiers
   * @param adapterOptions - IAdapterOptions (chunkSize, delay, retries)
   * @param platformOptions - Platform-specific options forwarded to writeSingleChunk
   *
   * @throws {BluetoothPrintError} When all retries are exhausted for a chunk
   */
  async execute(
    buffer: ArrayBuffer,
    context: ChunkWriteContext,
    adapterOptions: IAdapterOptions = {},
    platformOptions?: TOptions
  ): Promise<void> {
    const data = new Uint8Array(buffer);

    const chunkSize = Math.max(
      1,
      Math.min(256, adapterOptions.chunkSize ?? this.config.defaultChunkSize)
    );
    const delay = Math.max(
      10,
      Math.min(100, adapterOptions.delay ?? this.config.defaultDelay)
    );
    const retries = Math.max(
      1,
      Math.min(10, adapterOptions.retries ?? this.config.defaultRetries)
    );

    const maxChunkSize = this.getMaxChunkSize(context.deviceId);

    let currentChunkSize = chunkSize;
    let baseDelay = delay;
    let totalChunks = Math.ceil(data.length / currentChunkSize);

    this.logger.debug(`Writing ${data.length} bytes in ${totalChunks} chunks`);

    if (data.length === 0) {
      this.logger.warn('No data to write');
      return;
    }

    // Adaptive transmission state
    let successCount = 0;
    let consecutiveFailures = 0;
    const { minChunkSize, maxDelay, successThreshold, failureThreshold, connectionCheckInterval } =
      this.config;

    for (let i = 0; i < data.length; i += currentChunkSize) {
      // Periodic connection state check
      if (i > 0 && Math.floor(i / currentChunkSize) % connectionCheckInterval === 0) {
        await this.checkConnection(context.deviceId);
      }

      const chunk = data.slice(i, i + currentChunkSize);
      const chunkNum = Math.floor(i / currentChunkSize) + 1;
      let attempt = 0;
      let writeSuccess = false;

      while (attempt <= retries) {
        const writeResult = await this.writeSingleChunk(chunk, context, platformOptions);

        if (writeResult.success) {
          this.logger.debug(`Chunk ${chunkNum}/${totalChunks} written successfully`);
          writeSuccess = true;
          break;
        }

        attempt++;
        if (attempt > retries) {
          this.logger.error(`Chunk ${chunkNum} failed after ${retries} retries`);
          throw new BluetoothPrintError(
            ErrorCode.WRITE_FAILED,
            `Failed to write chunk ${chunkNum}/${totalChunks}`,
            writeResult.error ?? new Error('Unknown write error')
          );
        }

        this.logger.warn(`Chunk ${chunkNum} write failed, retry ${attempt}/${retries}`);

        const retryDelay = baseDelay * Math.pow(2, attempt - 1);
        await new Promise(r => setTimeout(r, Math.min(retryDelay, maxDelay)));
      }

      // Adaptive chunk size and delay adjustment
      if (writeSuccess) {
        successCount++;
        consecutiveFailures = 0;

        if (successCount % successThreshold === 0 && currentChunkSize < maxChunkSize) {
          currentChunkSize = Math.min(maxChunkSize, currentChunkSize + 5);
          baseDelay = Math.max(baseDelay / 1.2, delay);
          totalChunks = Math.ceil((data.length - i - currentChunkSize) / currentChunkSize) + chunkNum;
          this.logger.debug(`Increased chunk size to ${currentChunkSize}, delay to ${baseDelay}`);
        }
      } else {
        consecutiveFailures++;

        if (consecutiveFailures >= failureThreshold && currentChunkSize > minChunkSize) {
          currentChunkSize = Math.max(minChunkSize, currentChunkSize - 5);
          baseDelay = Math.min(baseDelay * 1.5, maxDelay);
          totalChunks = Math.ceil((data.length - i - currentChunkSize) / currentChunkSize) + chunkNum;
          this.logger.debug(`Decreased chunk size to ${currentChunkSize}, delay to ${baseDelay}`);
          consecutiveFailures = 0;
        }
      }

      // Inter-chunk delay to prevent BLE congestion
      if (i + currentChunkSize < data.length) {
        await new Promise(r => setTimeout(r, baseDelay));
      }
    }

    this.logger.info(`Successfully wrote ${data.length} bytes`);
  }
}