/**
 * Connection Manager Service
 *
 * Manages Bluetooth device connections with heartbeat detection and auto-reconnect
 */

import type { IPrinterAdapter } from '@/types';
import { PrinterState } from '@/types';
import { IConnectionManager } from '@/services/interfaces';
import { AdapterFactory } from '@/adapters/AdapterFactory';
import { Logger } from '@/utils/logger';
import { BluetoothPrintError, ErrorCode } from '@/errors/BluetoothError';
import { EventEmitter } from '@/core/EventEmitter';

/**
 * Connection manager configuration
 */
export interface ConnectionManagerConfig {
  /** Enable heartbeat detection (default: true) */
  heartbeatEnabled?: boolean;
  /** Heartbeat interval in milliseconds (default: 5000) */
  heartbeatInterval?: number;
  /** Enable auto-reconnect (default: true) */
  autoReconnect?: boolean;
  /** Maximum reconnect attempts (default: 3) */
  maxReconnectAttempts?: number;
  /** Reconnect interval in milliseconds (default: 2000) */
  reconnectInterval?: number;
  /** Connection timeout in milliseconds (default: 10000) */
  connectionTimeout?: number;
}

/**
 * Connection manager events
 */
export interface ConnectionManagerEvents {
  /** Emitted when connection state changes */
  'state-change': PrinterState;
  /** Emitted when device is connected */
  connected: string;
  /** Emitted when device is disconnected */
  disconnected: string;
  /** Emitted when reconnection starts */
  reconnecting: { deviceId: string; attempt: number; maxAttempts: number };
  /** Emitted when reconnection succeeds */
  reconnected: string;
  /** Emitted when reconnection fails after all attempts */
  'reconnect-failed': { deviceId: string; error: Error };
  /** Emitted when heartbeat detects connection loss */
  'heartbeat-lost': string;
  /** Emitted on any error */
  error: BluetoothPrintError;
}

const DEFAULT_CONFIG: Required<ConnectionManagerConfig> = {
  heartbeatEnabled: true,
  heartbeatInterval: 5000,
  autoReconnect: true,
  maxReconnectAttempts: 3,
  reconnectInterval: 2000,
  connectionTimeout: 10000,
};

/**
 * Connection Manager implementation with heartbeat and auto-reconnect
 */
export class ConnectionManager
  extends EventEmitter<ConnectionManagerEvents>
  implements IConnectionManager
{
  private adapter: IPrinterAdapter;
  private deviceId: string | null = null;
  private state: PrinterState = PrinterState.DISCONNECTED;
  private readonly logger = Logger.scope('ConnectionManager');
  private readonly config: Required<ConnectionManagerConfig>;

  // Heartbeat state
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;

  // Reconnect state
  private reconnectAttempts: number = 0;
  private isReconnecting: boolean = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  /**
   * Creates a new ConnectionManager instance
   */
  constructor(adapter?: IPrinterAdapter, config?: ConnectionManagerConfig) {
    super();
    this.adapter = adapter || AdapterFactory.create();
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Listen to adapter state changes
    this.adapter.onStateChange?.(state => {
      this.handleStateChange(state);
    });
  }

  /**
   * Handle adapter state changes
   */
  private handleStateChange(newState: PrinterState): void {
    const previousState = this.state;
    this.state = newState;
    this.logger.debug('State changed:', { from: previousState, to: newState });
    this.emit('state-change', newState);

    // Handle unexpected disconnection
    if (
      previousState === PrinterState.CONNECTED &&
      newState === PrinterState.DISCONNECTED &&
      this.deviceId &&
      !this.isReconnecting
    ) {
      this.logger.warn('Unexpected disconnection detected');
      this.emit('disconnected', this.deviceId);
      this.stopHeartbeat();

      // Trigger auto-reconnect if enabled
      if (this.config.autoReconnect) {
        this.startReconnect();
      }
    }
  }

  /**
   * Connects to a Bluetooth device
   */
  async connect(deviceId: string, options?: { retries?: number; timeout?: number }): Promise<void> {
    this.logger.info('Connecting to device:', deviceId);

    const { retries = 0, timeout = this.config.connectionTimeout } = options || {};
    let attempts = 0;

    // Reset reconnect state
    this.reconnectAttempts = 0;
    this.isReconnecting = false;
    this.clearReconnectTimer();

    while (attempts <= retries) {
      try {
        this.deviceId = deviceId;
        this.state = PrinterState.CONNECTING;
        this.emit('state-change', PrinterState.CONNECTING);

        const connectPromise = this.adapter.connect(deviceId);
        const timeoutPromise = new Promise<void>((_, reject) => {
          setTimeout(() => {
            reject(
              new BluetoothPrintError(
                ErrorCode.CONNECTION_TIMEOUT,
                `Connection to device ${deviceId} timed out after ${timeout}ms`
              )
            );
          }, timeout);
        });

        await Promise.race([connectPromise, timeoutPromise]);
        this.state = PrinterState.CONNECTED;
        this.emit('state-change', PrinterState.CONNECTED);
        this.emit('connected', deviceId);
        this.logger.info('Connected successfully');

        // Start heartbeat if enabled
        if (this.config.heartbeatEnabled) {
          this.startHeartbeat();
        }

        return;
      } catch (error) {
        attempts++;
        if (attempts > retries) {
          this.deviceId = null;
          this.state = PrinterState.DISCONNECTED;
          this.emit('state-change', PrinterState.DISCONNECTED);
          const printError =
            error instanceof BluetoothPrintError
              ? error
              : new BluetoothPrintError(
                  ErrorCode.CONNECTION_FAILED,
                  `Connection failed after ${attempts} attempts`,
                  error as Error
                );
          this.logger.error('Connection failed:', printError);
          this.emit('error', printError);
          throw printError;
        }
        this.logger.warn(`Connection attempt ${attempts}/${retries} failed, retrying...`, error);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

  /**
   * Disconnects from the current device
   */
  async disconnect(): Promise<void> {
    this.stopHeartbeat();
    this.clearReconnectTimer();
    this.isReconnecting = false;

    if (!this.deviceId) {
      this.logger.warn('Disconnect called but no device connected');
      return;
    }

    const deviceId = this.deviceId;
    this.logger.info('Disconnecting from device:', deviceId);

    try {
      await this.adapter.disconnect(deviceId);
      this.deviceId = null;
      this.state = PrinterState.DISCONNECTED;
      this.emit('state-change', PrinterState.DISCONNECTED);
      this.emit('disconnected', deviceId);
      this.logger.info('Disconnected successfully');
    } catch (error) {
      const printError = new BluetoothPrintError(
        ErrorCode.DEVICE_DISCONNECTED,
        'Disconnect failed',
        error as Error
      );
      this.logger.error('Disconnect failed:', printError);
      this.emit('error', printError);
      throw printError;
    }
  }

  /**
   * Start heartbeat detection
   */
  private startHeartbeat(): void {
    this.stopHeartbeat();

    this.heartbeatTimer = setInterval(() => {
      this.checkHeartbeat();
    }, this.config.heartbeatInterval);

    this.logger.debug('Heartbeat started with interval:', this.config.heartbeatInterval);
  }

  /**
   * Stop heartbeat detection
   */
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
      this.logger.debug('Heartbeat stopped');
    }
  }

  /**
   * Check connection status via heartbeat
   */
  private checkHeartbeat(): void {
    if (!this.deviceId || this.state !== PrinterState.CONNECTED) {
      return;
    }

    try {
      const isConnected = this.isConnected();

      if (isConnected) {
        this.logger.debug('Heartbeat OK');
      } else {
        this.handleHeartbeatLost();
      }
    } catch (error) {
      this.logger.warn('Heartbeat check failed:', error);
      this.handleHeartbeatLost();
    }
  }

  /**
   * Handle heartbeat loss
   */
  private handleHeartbeatLost(): void {
    if (!this.deviceId) return;

    this.logger.warn('Heartbeat lost for device:', this.deviceId);
    this.emit('heartbeat-lost', this.deviceId);
    this.stopHeartbeat();

    this.state = PrinterState.DISCONNECTED;
    this.emit('state-change', PrinterState.DISCONNECTED);
    this.emit('disconnected', this.deviceId);

    if (this.config.autoReconnect && !this.isReconnecting) {
      this.startReconnect();
    }
  }

  /**
   * Start auto-reconnect process
   */
  private startReconnect(): void {
    if (!this.deviceId || this.isReconnecting) {
      return;
    }

    this.isReconnecting = true;
    this.reconnectAttempts = 0;
    this.attemptReconnect();
  }

  /**
   * Attempt to reconnect
   */
  private attemptReconnect(): void {
    if (!this.deviceId) {
      this.isReconnecting = false;
      return;
    }

    this.reconnectAttempts++;
    const deviceId = this.deviceId;

    if (this.reconnectAttempts > this.config.maxReconnectAttempts) {
      this.logger.error('Max reconnect attempts reached');
      this.isReconnecting = false;
      this.emit('reconnect-failed', {
        deviceId,
        error: new BluetoothPrintError(
          ErrorCode.CONNECTION_FAILED,
          `Reconnection failed after ${this.config.maxReconnectAttempts} attempts`
        ),
      });
      this.deviceId = null;
      return;
    }

    this.logger.info(
      `Reconnect attempt ${this.reconnectAttempts}/${this.config.maxReconnectAttempts}`
    );
    this.emit('reconnecting', {
      deviceId,
      attempt: this.reconnectAttempts,
      maxAttempts: this.config.maxReconnectAttempts,
    });

    this.state = PrinterState.CONNECTING;
    this.emit('state-change', PrinterState.CONNECTING);

    this.adapter
      .connect(deviceId)
      .then(() => {
        this.logger.info('Reconnected successfully');
        this.isReconnecting = false;
        this.reconnectAttempts = 0;
        this.state = PrinterState.CONNECTED;
        this.emit('state-change', PrinterState.CONNECTED);
        this.emit('reconnected', deviceId);

        if (this.config.heartbeatEnabled) {
          this.startHeartbeat();
        }
      })
      .catch(error => {
        this.logger.warn(`Reconnect attempt ${this.reconnectAttempts} failed:`, error);

        this.reconnectTimer = setTimeout(() => {
          this.attemptReconnect();
        }, this.config.reconnectInterval);
      });
  }

  /**
   * Clear reconnect timer
   */
  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  /**
   * Checks if a device is connected
   */
  isConnected(): boolean {
    return this.state === PrinterState.CONNECTED;
  }

  /**
   * Gets the current device ID
   */
  getDeviceId(): string | null {
    return this.deviceId;
  }

  /**
   * Gets the current connection state
   */
  getState(): PrinterState {
    return this.state;
  }

  /**
   * Gets the printer adapter instance
   */
  getAdapter(): IPrinterAdapter {
    return this.adapter;
  }

  /**
   * Gets the current configuration
   */
  getConfig(): Required<ConnectionManagerConfig> {
    return { ...this.config };
  }

  /**
   * Gets reconnect status
   */
  getReconnectStatus(): {
    isReconnecting: boolean;
    attempts: number;
    maxAttempts: number;
  } {
    return {
      isReconnecting: this.isReconnecting,
      attempts: this.reconnectAttempts,
      maxAttempts: this.config.maxReconnectAttempts,
    };
  }

  /**
   * Manually trigger reconnect
   */
  reconnect(): void {
    if (!this.deviceId) {
      throw new BluetoothPrintError(ErrorCode.DEVICE_NOT_FOUND, 'No device to reconnect to');
    }

    if (this.isReconnecting) {
      this.logger.warn('Reconnect already in progress');
      return;
    }

    this.startReconnect();
  }

  /**
   * Stop reconnect attempts
   */
  stopReconnect(): void {
    this.clearReconnectTimer();
    this.isReconnecting = false;
    this.reconnectAttempts = 0;
    this.logger.info('Reconnect stopped');
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.stopHeartbeat();
    this.clearReconnectTimer();
    this.removeAllListeners();
    this.deviceId = null;
    this.state = PrinterState.DISCONNECTED;
  }
}
