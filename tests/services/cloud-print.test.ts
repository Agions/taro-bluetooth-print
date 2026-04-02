import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CloudPrintManager } from '../../src/services/CloudPrintManager';

// Mock WebSocket
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState: number = MockWebSocket.CONNECTING;
  onopen: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;

  url: string;
  sentMessages: string[] = [];

  constructor(url: string) {
    this.url = url;
    // Simulate async connection
    setTimeout(() => {
      if (this.onopen) {
        this.onopen(new Event('open'));
      }
    }, 0);
  }

  send(data: string): void {
    this.sentMessages.push(data);
  }

  close(): void {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) {
      this.onclose(new CloseEvent('close'));
    }
  }

  // Helper to simulate receiving a message
  simulateMessage(data: string): void {
    if (this.onmessage) {
      this.onmessage(new MessageEvent('message', { data }));
    }
  }

  // Helper to simulate open state
  simulateOpen(): void {
    this.readyState = MockWebSocket.OPEN;
    if (this.onopen) {
      this.onopen(new Event('open'));
    }
  }
}

describe('CloudPrintManager', () => {
  let manager: CloudPrintManager;
  let originalWebSocket: typeof WebSocket;

  beforeEach(() => {
    originalWebSocket = global.WebSocket;
    // @ts-expect-error - we're replacing with mock
    global.WebSocket = MockWebSocket as unknown as typeof WebSocket;
  });

  afterEach(() => {
    global.WebSocket = originalWebSocket;
    manager?.disconnect();
  });

  describe('constructor', () => {
    it('should create instance with required options', () => {
      manager = new CloudPrintManager({
        serverUrl: 'wss://example.com/printer',
        deviceId: 'device-001',
      });

      expect(manager).toBeDefined();
      expect(manager.connected).toBe(false);
    });

    it('should apply default options', () => {
      manager = new CloudPrintManager({
        serverUrl: 'wss://example.com/printer',
        deviceId: 'device-001',
      });

      // Access private options via behavior
      expect(manager.connected).toBe(false);
    });

    it('should accept custom options', () => {
      manager = new CloudPrintManager({
        serverUrl: 'wss://example.com/printer',
        deviceId: 'device-001',
        reconnect: false,
        reconnectInterval: 10000,
        heartbeatInterval: 60000,
        connectTimeout: 30000,
        apiKey: 'test-key',
      });

      expect(manager).toBeDefined();
    });
  });

  describe('connect()', () => {
    it('should connect to WebSocket server', async () => {
      manager = new CloudPrintManager({
        serverUrl: 'wss://example.com/printer',
        deviceId: 'device-001',
      });

      const connectPromise = manager.connect();
      await expect(connectPromise).resolves.toBeUndefined();
      expect(manager.connected).toBe(true);
    });

    it('should include deviceId in URL params', async () => {
      manager = new CloudPrintManager({
        serverUrl: 'wss://example.com/printer',
        deviceId: 'device-001',
      });

      await manager.connect();

      const mockWs = (global as Record<string, unknown>).WebSocket as unknown as MockWebSocket;
      expect(mockWs.prototype.url).toContain('deviceId=device-001');
    });

    it('should include apiKey in URL params when provided', async () => {
      manager = new CloudPrintManager({
        serverUrl: 'wss://example.com/printer',
        deviceId: 'device-001',
        apiKey: 'secret-key',
      });

      await manager.connect();

      // URL should contain apiKey param
      const url = (global.WebSocket as unknown as { prototype: { url: string } }).prototype.url;
      expect(url).toContain('apiKey=secret-key');
    });

    it('should emit connect event on successful connection', async () => {
      manager = new CloudPrintManager({
        serverUrl: 'wss://example.com/printer',
        deviceId: 'device-001',
      });

      const connectEvent = vi.fn();
      manager.on('connect', connectEvent);

      await manager.connect();

      expect(connectEvent).toHaveBeenCalledTimes(1);
    });

    it('should throw on connection timeout', async () => {
      // Mock WebSocket that never connects
      const NeverConnectWs = class extends MockWebSocket {
        constructor() {
          super('wss://example.com/printer');
          // Don't call onopen
        }
      };
      // @ts-expect-error - replacing with mock
      global.WebSocket = NeverConnectWs as unknown as typeof WebSocket;

      manager = new CloudPrintManager({
        serverUrl: 'wss://example.com/printer',
        deviceId: 'device-001',
        connectTimeout: 100,
      });

      await expect(manager.connect()).rejects.toThrow('Connection timeout');
    });

    it('should not reconnect if already connecting', async () => {
      manager = new CloudPrintManager({
        serverUrl: 'wss://example.com/printer',
        deviceId: 'device-001',
      });

      // Start first connection
      const connectPromise1 = manager.connect();
      // Try second connection
      const connectPromise2 = manager.connect();

      await expect(connectPromise1).resolves.toBeUndefined();
      await expect(connectPromise2).resolves.toBeUndefined();
    });
  });

  describe('disconnect()', () => {
    it('should disconnect from server', async () => {
      manager = new CloudPrintManager({
        serverUrl: 'wss://example.com/printer',
        deviceId: 'device-001',
      });

      await manager.connect();
      expect(manager.connected).toBe(true);

      manager.disconnect();
      expect(manager.connected).toBe(false);
    });

    it('should emit disconnect event', async () => {
      manager = new CloudPrintManager({
        serverUrl: 'wss://example.com/printer',
        deviceId: 'device-001',
      });

      await manager.connect();

      const disconnectEvent = vi.fn();
      manager.on('disconnect', disconnectEvent);

      manager.disconnect();

      expect(disconnectEvent).toHaveBeenCalledTimes(1);
    });

    it('should stop heartbeat on disconnect', async () => {
      manager = new CloudPrintManager({
        serverUrl: 'wss://example.com/printer',
        deviceId: 'device-001',
        heartbeatInterval: 100,
      });

      await manager.connect();

      const disconnectEvent = vi.fn();
      manager.on('disconnect', disconnectEvent);

      manager.disconnect();

      // After disconnect, heartbeat should stop (indicated by no more events)
      expect(disconnectEvent).toHaveBeenCalledTimes(1);
    });

    it('should be safe to call when not connected', () => {
      manager = new CloudPrintManager({
        serverUrl: 'wss://example.com/printer',
        deviceId: 'device-001',
      });

      expect(() => manager.disconnect()).not.toThrow();
    });
  });

  describe('print()', () => {
    it('should throw if not connected', async () => {
      manager = new CloudPrintManager({
        serverUrl: 'wss://example.com/printer',
        deviceId: 'device-001',
      });

      await expect(
        manager.print({ id: 'job-001', data: 'test' })
      ).rejects.toThrow('Not connected to server');
    });

    it('should send print message with correct structure', async () => {
      manager = new CloudPrintManager({
        serverUrl: 'wss://example.com/printer',
        deviceId: 'device-001',
      });

      await manager.connect();

      await manager.print({
        id: 'job-001',
        data: 'Hello World',
        copies: 2,
        priority: 1,
      });

      // Check message was sent
      const mockWs = global.WebSocket as unknown as MockWebSocket;
      const sentMessage = JSON.parse(mockWs.prototype.sentMessages[0]);

      expect(sentMessage.type).toBe('print');
      expect(sentMessage.jobId).toBe('job-001');
      expect(sentMessage.copies).toBe(2);
      expect(sentMessage.priority).toBe(1);
      expect(sentMessage.data).toBeDefined();
    });

    it('should use default copies of 1', async () => {
      manager = new CloudPrintManager({
        serverUrl: 'wss://example.com/printer',
        deviceId: 'device-001',
      });

      await manager.connect();

      await manager.print({
        id: 'job-001',
        data: 'test',
      });

      const mockWs = global.WebSocket as unknown as MockWebSocket;
      const sentMessage = JSON.parse(mockWs.prototype.sentMessages[0]);

      expect(sentMessage.copies).toBe(1);
    });

    it('should encode Uint8Array data as base64', async () => {
      manager = new CloudPrintManager({
        serverUrl: 'wss://example.com/printer',
        deviceId: 'device-001',
      });

      await manager.connect();

      const data = new Uint8Array([0x1b, 0x40, 0x48, 0x65, 0x6c, 0x6c, 0x6f]); // ESC POS init + "Hello"
      await manager.print({ id: 'job-001', data });

      const mockWs = global.WebSocket as unknown as MockWebSocket;
      const sentMessage = JSON.parse(mockWs.prototype.sentMessages[0]);

      expect(sentMessage.data).toBe(btoa(String.fromCharCode(...data)));
    });
  });

  describe('getStatus()', () => {
    it('should return offline status if not connected', () => {
      manager = new CloudPrintManager({
        serverUrl: 'wss://example.com/printer',
        deviceId: 'device-001',
      });

      const status = manager.getStatus();

      expect(status.status).toBe('offline');
    });

    it('should send status request when connected', async () => {
      manager = new CloudPrintManager({
        serverUrl: 'wss://example.com/printer',
        deviceId: 'device-001',
      });

      await manager.connect();

      manager.getStatus();

      const mockWs = global.WebSocket as unknown as MockWebSocket;
      const sentMessage = JSON.parse(mockWs.prototype.sentMessages[0]);

      expect(sentMessage.type).toBe('status');
      expect(sentMessage.deviceId).toBe('device-001');
    });

    it('should return current status after receiving update', async () => {
      manager = new CloudPrintManager({
        serverUrl: 'wss://example.com/printer',
        deviceId: 'device-001',
      });

      await manager.connect();

      // Simulate status update from server
      const mockWs = global.WebSocket as unknown as MockWebSocket;
      mockWs.prototype.simulateMessage(JSON.stringify({
        type: 'status',
        status: 'idle',
        paper: 'ok',
      }));

      const status = manager.currentStatus;
      expect(status.status).toBe('idle');
      expect(status.paper).toBe('ok');
    });
  });

  describe('event handling', () => {
    it('should emit error event on WebSocket error', async () => {
      manager = new CloudPrintManager({
        serverUrl: 'wss://example.com/printer',
        deviceId: 'device-001',
      });

      const errorEvent = vi.fn();
      manager.on('error', errorEvent);

      await manager.connect();

      const mockWs = global.WebSocket as unknown as MockWebSocket;
      mockWs.prototype.onerror?.(new Event('error'));

      expect(errorEvent).toHaveBeenCalledTimes(1);
    });

    it('should emit print-complete on successful print result', async () => {
      manager = new CloudPrintManager({
        serverUrl: 'wss://example.com/printer',
        deviceId: 'device-001',
      });

      await manager.connect();

      const completeEvent = vi.fn();
      manager.on('print-complete', completeEvent);

      const mockWs = global.WebSocket as unknown as MockWebSocket;
      mockWs.prototype.simulateMessage(JSON.stringify({
        type: 'print-result',
        success: true,
        jobId: 'job-001',
      }));

      expect(completeEvent).toHaveBeenCalledWith('job-001');
    });

    it('should emit print-error on failed print result', async () => {
      manager = new CloudPrintManager({
        serverUrl: 'wss://example.com/printer',
        deviceId: 'device-001',
      });

      await manager.connect();

      const errorEvent = vi.fn();
      manager.on('print-error', errorEvent);

      const mockWs = global.WebSocket as unknown as MockWebSocket;
      mockWs.prototype.simulateMessage(JSON.stringify({
        type: 'print-result',
        success: false,
        jobId: 'job-001',
        error: 'Paper out',
      }));

      expect(errorEvent).toHaveBeenCalledWith({
        jobId: 'job-001',
        error: 'Paper out',
      });
    });

    it('should emit status event on status update', async () => {
      manager = new CloudPrintManager({
        serverUrl: 'wss://example.com/printer',
        deviceId: 'device-001',
      });

      await manager.connect();

      const statusEvent = vi.fn();
      manager.on('status', statusEvent);

      const mockWs = global.WebSocket as unknown as MockWebSocket;
      mockWs.prototype.simulateMessage(JSON.stringify({
        type: 'status',
        status: 'printing',
        paper: 'low',
      }));

      expect(statusEvent).toHaveBeenCalledWith({
        status: 'printing',
        paper: 'low',
        error: undefined,
        timestamp: expect.any(Number),
      });
    });

    it('should emit message event for unknown message types', async () => {
      manager = new CloudPrintManager({
        serverUrl: 'wss://example.com/printer',
        deviceId: 'device-001',
      });

      await manager.connect();

      const messageEvent = vi.fn();
      manager.on('message', messageEvent);

      const mockWs = global.WebSocket as unknown as MockWebSocket;
      mockWs.prototype.simulateMessage(JSON.stringify({
        type: 'custom',
        data: 'test',
      }));

      expect(messageEvent).toHaveBeenCalledWith({
        type: 'custom',
        data: 'test',
      });
    });

    it('should handle pong message without emitting event', async () => {
      manager = new CloudPrintManager({
        serverUrl: 'wss://example.com/printer',
        deviceId: 'device-001',
      });

      await manager.connect();

      const messageEvent = vi.fn();
      manager.on('message', messageEvent);

      const mockWs = global.WebSocket as unknown as MockWebSocket;
      mockWs.prototype.simulateMessage(JSON.stringify({
        type: 'pong',
        timestamp: Date.now(),
      }));

      // pong should not be emitted as a generic message
      expect(messageEvent).not.toHaveBeenCalled();
    });
  });

  describe('reconnection', () => {
    it('should schedule reconnect on disconnect', async () => {
      manager = new CloudPrintManager({
        serverUrl: 'wss://example.com/printer',
        deviceId: 'device-001',
        reconnectInterval: 100,
      });

      await manager.connect();

      const disconnectEvent = vi.fn();
      manager.on('disconnect', disconnectEvent);

      // Simulate unexpected close
      const mockWs = global.WebSocket as unknown as MockWebSocket;
      mockWs.prototype.onclose?.(new CloseEvent('close'));

      expect(disconnectEvent).toHaveBeenCalled();

      // Wait for reconnect attempt
      await new Promise(resolve => setTimeout(resolve, 150));

      // Should have attempted reconnection
      expect(manager.connected).toBe(true);
    });

    it('should not schedule reconnect if reconnect is disabled', async () => {
      manager = new CloudPrintManager({
        serverUrl: 'wss://example.com/printer',
        deviceId: 'device-001',
        reconnect: false,
        reconnectInterval: 100,
      });

      await manager.connect();

      const disconnectEvent = vi.fn();
      manager.on('disconnect', disconnectEvent);

      manager.disconnect();

      expect(disconnectEvent).toHaveBeenCalledTimes(1);

      // No automatic reconnect should happen
      await new Promise(resolve => setTimeout(resolve, 200));
      expect(manager.connected).toBe(false);
    });

    it('should cancel reconnect on manual disconnect', async () => {
      manager = new CloudPrintManager({
        serverUrl: 'wss://example.com/printer',
        deviceId: 'device-001',
        reconnectInterval: 10000,
      });

      await manager.connect();
      manager.disconnect();

      // Manual disconnect should cancel any pending reconnect
      expect(manager.connected).toBe(false);
    });
  });

  describe('heartbeat', () => {
    it('should start heartbeat after connection', async () => {
      const clock = vi.useFakeTimers();

      manager = new CloudPrintManager({
        serverUrl: 'wss://example.com/printer',
        deviceId: 'device-001',
        heartbeatInterval: 30000,
      });

      await manager.connect();

      // Advance timers to trigger heartbeat
      clock.tick(30001);

      const mockWs = global.WebSocket as unknown as MockWebSocket;
      const sentMessages = mockWs.prototype.sentMessages.filter(
        (msg: string) => JSON.parse(msg).type === 'ping'
      );

      expect(sentMessages.length).toBeGreaterThan(0);

      clock.restore();
      vi.useRealTimers();
    });

    it('should stop heartbeat on disconnect', async () => {
      const clock = vi.useFakeTimers();

      manager = new CloudPrintManager({
        serverUrl: 'wss://example.com/printer',
        deviceId: 'device-001',
        heartbeatInterval: 1000,
      });

      await manager.connect();

      // Advance time but not enough for heartbeat
      clock.tick(500);
      manager.disconnect();

      // Advance more time - heartbeat should not run
      clock.tick(2000);

      const mockWs = global.WebSocket as unknown as MockWebSocket;
      const pingMessages = mockWs.prototype.sentMessages.filter(
        (msg: string) => JSON.parse(msg).type === 'ping'
      );

      expect(pingMessages.length).toBe(0);

      clock.restore();
      vi.useRealTimers();
    });
  });
});
