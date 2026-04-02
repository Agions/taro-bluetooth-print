/**
 * CloudPrintManager - 云打印管理器
 *
 * 支持通过 WebSocket 连接到云端服务器
 * 实现远程下发打印任务
 *
 * 应用场景：
 * - IoT 打印机（WiFi/4G 连接）
 * - 餐饮云厨房
 * - 物流云打印
 */

import { EventEmitter } from '@/core/EventEmitter';
import { Logger } from '@/utils/logger';

export interface CloudPrintOptions {
  /** WebSocket 服务器地址 */
  serverUrl: string;
  /** 设备 ID */
  deviceId: string;
  /** API 密钥（可选） */
  apiKey?: string;
  /** 自动重连 */
  reconnect?: boolean;
  /** 重连间隔 (ms) */
  reconnectInterval?: number;
  /** 心跳间隔 (ms) */
  heartbeatInterval?: number;
  /** 连接超时 (ms) */
  connectTimeout?: number;
}

export interface PrintJob {
  /** 任务 ID */
  id: string;
  /** 打印数据 */
  data: Uint8Array | string;
  /** 份数 */
  copies?: number;
  /** 优先级 */
  priority?: number;
}

export interface CloudPrinterStatus {
  /** 打印机状态 */
  status: 'idle' | 'printing' | 'error' | 'offline';
  /** 纸张状态 */
  paper?: 'ok' | 'low' | 'out';
  /** 错误信息 */
  error?: string;
  /** 最后更新时间 */
  timestamp: number;
}

/** 服务器消息类型 */
interface ServerMessage {
  type: string;
  status?: string;
  paper?: string;
  error?: string;
  success?: boolean;
  jobId?: string;
  deviceId?: string;
  timestamp?: number;
}

export interface CloudPrintEvents {
  /** 连接成功 */
  connect: void;
  /** 断开连接 */
  disconnect: void;
  /** 连接错误 */
  error: Error;
  /** 状态更新 */
  status: CloudPrinterStatus;
  /** 打印完成 */
  'print-complete': string;
  /** 打印失败 */
  'print-error': { jobId: string; error: string };
  /** 收到原始消息 */
  message: Record<string, unknown>;
}

export type CloudPrintEvent = keyof CloudPrintEvents;

/**
 * 云打印管理器
 *
 * 通过 WebSocket 连接到云端服务器，实现远程打印任务下发
 */
export class CloudPrintManager extends EventEmitter<CloudPrintEvents> {
  private readonly log = Logger.scope('CloudPrintManager');
  private options: Required<CloudPrintOptions>;
  private ws: WebSocket | null = null;
  private isConnected: boolean = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private status: CloudPrinterStatus = { status: 'offline', timestamp: Date.now() };
  private connectResolve: (() => void) | null = null;
  private connectReject: ((err: Error) => void) | null = null;

  constructor(options: CloudPrintOptions) {
    super();
    this.options = {
      reconnect: true,
      reconnectInterval: 5000,
      heartbeatInterval: 30000,
      connectTimeout: 10000,
      apiKey: undefined,
      ...options,
    } as Required<CloudPrintOptions>;
  }

  /**
   * 检查是否已连接
   */
  get connected(): boolean {
    return this.isConnected;
  }

  /**
   * 获取当前打印机状态
   */
  get currentStatus(): CloudPrinterStatus {
    return { ...this.status };
  }

  /**
   * 连接到云端服务器
   */
  async connect(): Promise<void> {
    if (this.isConnected && this.ws) {
      this.log.debug('Already connected');
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      this.connectResolve = resolve;
      this.connectReject = reject;

      const timeout = setTimeout(() => {
        this.log.error('Connection timeout');
        this.ws?.close();
        reject(new Error('Connection timeout'));
      }, this.options.connectTimeout);

      try {
        // 构建 WebSocket URL
        const url = new URL(this.options.serverUrl);
        url.searchParams.set('deviceId', this.options.deviceId);
        if (this.options.apiKey) {
          url.searchParams.set('apiKey', this.options.apiKey);
        }

        this.log.debug(`Connecting to ${url.toString()}`);
        this.ws = new WebSocket(url.toString());

        this.ws.onopen = () => {
          clearTimeout(timeout);
          this.isConnected = true;
          this.log.info('Connected to cloud server');
          this.startHeartbeat();
          this.emit('connect');
          if (this.connectResolve) {
            this.connectResolve();
            this.connectResolve = null;
            this.connectReject = null;
          }
        };

        this.ws.onclose = () => {
          clearTimeout(timeout);
          this.isConnected = false;
          this.log.warn('Disconnected from cloud server');
          this.stopHeartbeat();
          this.emit('disconnect');
          this.scheduleReconnect();

          // If we have a pending connect promise, reject it
          if (this.connectReject) {
            this.connectReject(new Error('Connection closed before established'));
            this.connectResolve = null;
            this.connectReject = null;
          }
        };

        this.ws.onerror = event => {
          clearTimeout(timeout);
          const error = new Error('WebSocket error');
          this.log.error('WebSocket error', event);
          this.emit('error', error);
          if (this.connectReject) {
            this.connectReject(error);
            this.connectResolve = null;
            this.connectReject = null;
          }
        };

        this.ws.onmessage = (event: MessageEvent) => {
          this.handleMessage(String(event.data));
        };
      } catch (error) {
        clearTimeout(timeout);
        this.log.error('Failed to create WebSocket', error);
        if (this.connectReject) {
          this.connectReject(error as Error);
          this.connectResolve = null;
          this.connectReject = null;
        }
      }
    });
  }

  /**
   * 断开连接
   */
  disconnect(): void {
    this.log.info('Disconnecting from cloud server');
    this.stopHeartbeat();
    this.cancelReconnect();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
    this.status = { status: 'offline', timestamp: Date.now() };
  }

  /**
   * 发送打印任务
   * @throws Error 如果未连接
   */
  print(job: PrintJob): void {
    if (!this.isConnected || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('Not connected to server');
    }

    const message = {
      type: 'print',
      jobId: job.id,
      data: this.arrayBufferToBase64(job.data),
      copies: job.copies || 1,
      priority: job.priority || 0,
      timestamp: Date.now(),
    };

    this.log.debug(`Sending print job: ${job.id}`);
    this.ws.send(JSON.stringify(message));
  }

  /**
   * 获取打印机状态
   */
  getStatus(): CloudPrinterStatus {
    if (!this.isConnected || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return { status: 'offline', timestamp: Date.now() };
    }

    const message = {
      type: 'status',
      deviceId: this.options.deviceId,
      timestamp: Date.now(),
    };

    this.ws.send(JSON.stringify(message));
    return { ...this.status };
  }

  /**
   * 处理接收到的消息
   */
  private handleMessage(data: string): void {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const message = JSON.parse(data) as ServerMessage;
      this.log.debug('Received message', message.type);

      switch (message.type) {
        case 'status':
          this.status = {
            status: message.status as CloudPrinterStatus['status'],
            paper: message.paper as CloudPrinterStatus['paper'],
            error: message.error,
            timestamp: Date.now(),
          };
          this.emit('status', this.status);
          break;

        case 'print-result':
          if (message.success) {
            this.log.info(`Print job completed: ${message.jobId || ''}`);
            this.emit('print-complete', message.jobId || '');
          } else {
            this.log.error(`Print job failed: ${message.jobId || ''}`, message.error);
            this.emit('print-error', { jobId: message.jobId || '', error: message.error || '' });
          }
          break;

        case 'pong':
          // 心跳响应，无需处理
          break;

        default:
          this.emit('message', message as unknown as Record<string, unknown>);
      }
    } catch (error) {
      this.log.error('Failed to parse message:', error);
    }
  }

  /**
   * 启动心跳
   */
  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (this.isConnected && this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
      }
    }, this.options.heartbeatInterval);
  }

  /**
   * 停止心跳
   */
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * 安排重连
   */
  private scheduleReconnect(): void {
    if (!this.options.reconnect) return;

    this.log.debug(`Scheduling reconnect in ${this.options.reconnectInterval}ms`);
    this.reconnectTimer = setTimeout(() => {
      this.log.info('Attempting to reconnect...');
      this.connect().catch(() => {
        // Reconnect failed, will be rescheduled by onclose handler
      });
    }, this.options.reconnectInterval);
  }

  /**
   * 取消重连
   */
  private cancelReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  /**
   * ArrayBuffer 转 Base64
   */
  private arrayBufferToBase64(buffer: Uint8Array | string): string {
    if (typeof buffer === 'string') {
      return btoa(buffer);
    }
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]!);
    }
    return btoa(binary);
  }
}
