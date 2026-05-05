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

import { BluetoothPrintError, ErrorCode } from '@/errors/baseError';
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
  defaultChunkSize: 50, // 增加初始 chunk size，减少 BLE 通信开销
  defaultDelay: 20,
  defaultRetries: 3,
  minChunkSize: 10,
  maxChunkSize: 256,
  maxDelay: 200,
  successThreshold: 3,
  failureThreshold: 2,
  connectionCheckInterval: 10, // 增加连接检查间隔，减少不必要的检查
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

  constructor(loggerScope: string, config: Partial<AdaptiveWriteConfig> = {}) {
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

  /** Step size for increasing chunk size on success (bytes) */
  private static readonly CHUNK_SIZE_STEP = 5;
  /** Delay backoff multiplier on failure */
  private static readonly DELAY_BACKOFF_FACTOR = 1.5;
  /** Delay recovery divisor on success */
  private static readonly DELAY_RECOVERY_FACTOR = 1.2;
  /** Timeout base (ms) for computeTimeoutMs */
  private static readonly TIMEOUT_BASE_MS = 1000;
  /** Timeout per-byte factor (ms) for computeTimeoutMs */
  private static readonly TIMEOUT_PER_BYTE_MS = 5;
  /** Maximum timeout (ms) for computeTimeoutMs */
  private static readonly TIMEOUT_MAX_MS = 10000;

  /**
   * Compute chunk write timeout based on chunk size.
   * Override to customize timeout formula per platform.
   */
  protected computeTimeoutMs(chunkLength: number): number {
    return Math.max(
      ChunkWriteStrategy.TIMEOUT_BASE_MS,
      Math.min(
        ChunkWriteStrategy.TIMEOUT_MAX_MS,
        ChunkWriteStrategy.TIMEOUT_BASE_MS + chunkLength * ChunkWriteStrategy.TIMEOUT_PER_BYTE_MS
      )
    );
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

    if (data.length === 0) {
      this.logger.warn('No data to write');
      return;
    }

    // Initialize transmission parameters
    const params = this.initializeTransmissionParams(data, adapterOptions);
    const maxChunkSize = this.getMaxChunkSize(context.deviceId);

    // Adaptive transmission state
    const adaptiveState = {
      successCount: 0,
      consecutiveFailures: 0,
      currentChunkSize: params.chunkSize,
      baseDelay: params.delay,
    };

    this.logger.debug(
      `Writing ${data.length} bytes with initial chunkSize=${adaptiveState.currentChunkSize}, delay=${adaptiveState.baseDelay}ms`
    );

    // Main transmission loop
    for (let i = 0; i < data.length; i += adaptiveState.currentChunkSize) {
      // Periodic connection state check
      await this.maybeCheckConnection(i, adaptiveState.currentChunkSize, context.deviceId);

      // Write current chunk with retries
      const chunkNum = Math.floor(i / adaptiveState.currentChunkSize) + 1;
      const writeSuccess = await this.writeChunkWithRetries(
        data,
        i,
        adaptiveState.currentChunkSize,
        context,
        chunkNum,
        params.retries,
        adaptiveState.baseDelay,
        platformOptions
      );

      if (!writeSuccess) {
        // All retries exhausted - error already thrown
        return;
      }

      // Adaptive adjustment
      this.adjustTransmissionParams(
        adaptiveState,
        writeSuccess,
        maxChunkSize,
        params.minChunkSize,
        params.maxDelay,
        params.successThreshold,
        params.failureThreshold,
        chunkNum,
        i,
        data.length
      );

      // Inter-chunk delay
      await this.maybeDelay(
        i,
        adaptiveState.currentChunkSize,
        data.length,
        adaptiveState.baseDelay
      );
    }

    this.logger.info(`Successfully wrote ${data.length} bytes`);
  }

  /**
   * Initialize transmission parameters from adapter options
   */
  private initializeTransmissionParams(
    _data: Uint8Array,
    options: IAdapterOptions
  ): {
    chunkSize: number;
    delay: number;
    retries: number;
    minChunkSize: number;
    maxDelay: number;
    successThreshold: number;
    failureThreshold: number;
  } {
    const chunkSize = Math.max(1, Math.min(256, options.chunkSize ?? this.config.defaultChunkSize));
    const delay = Math.max(10, Math.min(100, options.delay ?? this.config.defaultDelay));
    const retries = Math.max(1, Math.min(10, options.retries ?? this.config.defaultRetries));

    return {
      chunkSize,
      delay,
      retries,
      minChunkSize: this.config.minChunkSize,
      maxDelay: this.config.maxDelay,
      successThreshold: this.config.successThreshold,
      failureThreshold: this.config.failureThreshold,
    };
  }

  /**
   * Check connection periodically based on interval
   */
  private async maybeCheckConnection(
    currentIndex: number,
    chunkSize: number,
    deviceId: string
  ): Promise<void> {
    if (
      currentIndex > 0 &&
      Math.floor(currentIndex / chunkSize) % this.config.connectionCheckInterval === 0
    ) {
      await this.checkConnection(deviceId);
    }
  }

  /**
   * Write a single chunk with retry logic
   * @returns true if successful, false if all retries exhausted (error thrown)
   */
  private async writeChunkWithRetries(
    data: Uint8Array,
    startIndex: number,
    chunkSize: number,
    context: ChunkWriteContext,
    chunkNum: number,
    maxRetries: number,
    baseDelay: number,
    platformOptions?: TOptions
  ): Promise<boolean> {
    const chunk = data.slice(startIndex, startIndex + chunkSize);
    const totalChunks = Math.ceil(data.length / chunkSize);

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const writeResult = await this.writeSingleChunk(chunk, context, platformOptions);

      if (writeResult.success) {
        this.logger.debug(`Chunk ${chunkNum}/${totalChunks} written successfully`);
        return true;
      }

      if (attempt >= maxRetries) {
        this.logger.error(`Chunk ${chunkNum} failed after ${maxRetries} retries`);
        throw new BluetoothPrintError(
          ErrorCode.WRITE_FAILED,
          `Failed to write chunk ${chunkNum}/${totalChunks}`,
          writeResult.error ?? new Error('Unknown write error')
        );
      }

      this.logger.warn(`Chunk ${chunkNum} write failed, retry ${attempt + 1}/${maxRetries}`);

      // Exponential backoff
      const retryDelay = baseDelay * Math.pow(2, attempt);
      await new Promise(r => setTimeout(r, Math.min(retryDelay, this.config.maxDelay)));
    }

    return false; // Unreachable, but satisfies TypeScript
  }

  /**
   * Adjust chunk size and delay based on success/failure
   */
  private adjustTransmissionParams(
    state: {
      successCount: number;
      consecutiveFailures: number;
      currentChunkSize: number;
      baseDelay: number;
    },
    writeSuccess: boolean,
    maxChunkSize: number,
    minChunkSize: number,
    maxDelay: number,
    successThreshold: number,
    failureThreshold: number,
    _chunkNum: number,
    _currentIndex: number,
    _totalLength: number
  ): void {
    if (writeSuccess) {
      state.successCount++;
      state.consecutiveFailures = 0;

      // Increase chunk size on sustained success
      if (state.successCount % successThreshold === 0 && state.currentChunkSize < maxChunkSize) {
        state.currentChunkSize = Math.min(
          maxChunkSize,
          state.currentChunkSize + ChunkWriteStrategy.CHUNK_SIZE_STEP
        );
        state.baseDelay = Math.max(
          state.baseDelay / ChunkWriteStrategy.DELAY_RECOVERY_FACTOR,
          this.config.defaultDelay
        );
        this.logger.debug(
          `Increased chunk size to ${state.currentChunkSize}, delay to ${state.baseDelay}ms`
        );
      }
    } else {
      state.consecutiveFailures++;

      // Decrease chunk size on sustained failure
      if (state.consecutiveFailures >= failureThreshold && state.currentChunkSize > minChunkSize) {
        state.currentChunkSize = Math.max(
          minChunkSize,
          state.currentChunkSize - ChunkWriteStrategy.CHUNK_SIZE_STEP
        );
        state.baseDelay = Math.min(
          state.baseDelay * ChunkWriteStrategy.DELAY_BACKOFF_FACTOR,
          maxDelay
        );
        this.logger.debug(
          `Decreased chunk size to ${state.currentChunkSize}, delay to ${state.baseDelay}ms`
        );
        state.consecutiveFailures = 0;
      }
    }
  }

  /**
   * Apply inter-chunk delay to prevent BLE congestion
   */
  private async maybeDelay(
    currentIndex: number,
    chunkSize: number,
    totalLength: number,
    delay: number
  ): Promise<void> {
    if (currentIndex + chunkSize < totalLength) {
      await new Promise(r => setTimeout(r, delay));
    }
  }
}
