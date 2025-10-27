# 最佳实践指南

本指南提供 Taro Bluetooth Print v2.0 的最佳实践建议，帮助开发者构建高性能、可维护、安全可靠的蓝牙打印应用。

## 📚 目录

- [架构设计原则](#架构设计原则)
- [性能优化](#性能优化)
- [错误处理策略](#错误处理策略)
- [安全管理](#安全管理)
- [代码质量](#代码质量)
- [用户体验优化](#用户体验优化)
- [部署建议](#部署建议)
- [常见陷阱避免](#常见陷阱避免)
- [监控和调试](#监控和调试)

## 🏗️ 架构设计原则

### 1. 单一职责原则

将不同的关注点分离到独立的模块中：

```typescript
// ❌ 错误：职责混乱
class PrinterManager {
  // 同时处理蓝牙连接、打印任务、UI更新等
  async printAndHandleUI(data: string) {
    await this.connect();
    await this.print(data);
    this.updateUI();
  }
}

// ✅ 正确：职责分离
class BluetoothService {
  // 只负责蓝牙连接管理
  async connect(deviceId: string): Promise<boolean> { /* ... */ }
  async disconnect(): Promise<boolean> { /* ... */ }
}

class PrintService {
  // 只负责打印任务
  async print(data: string): Promise<void> { /* ... */ }
}

class UIController {
  // 只负责UI更新
  updatePrintStatus(status: string): void { /* ... */ }
}
```

### 2. 依赖注入使用

利用内置的依赖注入容器管理对象生命周期：

```typescript
// 注册服务
container.registerSingleton<ILogger>('logger', () => new ConsoleLogger());
container.registerSingleton<IBluetoothAdapter>('adapter', () => new WeChatBluetoothAdapter());

// 创建打印实例时自动注入依赖
const printer = createBluetoothPrinter({
  dependencies: {
    logger: container.get<ILogger>('logger'),
    adapter: container.get<IBluetoothAdapter>('adapter')
  }
});
```

### 3. 事件驱动架构

使用事件系统实现松耦合的组件通信：

```typescript
// ✅ 使用事件解耦
class DeviceScanner {
  constructor(private eventBus: IEventBus) {}

  async scanDevices() {
    const devices = await this.adapter.startScan();
    this.eventBus.publish('devices:scanned', { devices });
  }
}

class PrintController {
  constructor(private eventBus: IEventBus) {
    this.eventBus.subscribe('devices:scanned', this.handleDevicesScanned.bind(this));
  }

  private handleDevicesScanned({ devices }: { devices: IBluetoothDevice[] }) {
    this.updateDeviceList(devices);
  }
}
```

### 4. 配置管理最佳实践

使用环境变量和配置文件管理不同环境的设置：

```typescript
// config/production.ts
export const productionConfig = {
  bluetooth: {
    scanTimeout: 15000,
    connectionTimeout: 10000,
    autoReconnect: true,
    maxReconnectAttempts: 5
  },
  logging: {
    level: 'error',
    enableConsole: false,
    enableFile: true
  }
};

// config/development.ts
export const developmentConfig = {
  bluetooth: {
    scanTimeout: 5000,
    connectionTimeout: 3000,
    autoReconnect: false
  },
  logging: {
    level: 'debug',
    enableConsole: true,
    enableFile: false
  }
};

// 根据环境选择配置
const config = process.env.NODE_ENV === 'production'
  ? productionConfig
  : developmentConfig;

const printer = createBluetoothPrinter(config);
```

## ⚡ 性能优化

### 1. 连接管理优化

#### 连接池管理

```typescript
class ConnectionPool {
  private connections: Map<string, IBluetoothConnection> = new Map();
  private maxConnections: number = 3;

  async getConnection(deviceId: string): Promise<IBluetoothConnection> {
    let connection = this.connections.get(deviceId);

    if (!connection && this.connections.size < this.maxConnections) {
      connection = await this.createConnection(deviceId);
      this.connections.set(deviceId, connection);
    }

    return connection;
  }

  async releaseConnection(deviceId: string): Promise<void> {
    const connection = this.connections.get(deviceId);
    if (connection) {
      await connection.disconnect();
      this.connections.delete(deviceId);
    }
  }
}
```

#### 连接复用策略

```typescript
// ✅ 保持活跃连接
class ActiveConnectionManager {
  private activeDeviceId: string | null = null;
  private connectionPromise: Promise<boolean> | null = null;

  async ensureConnected(deviceId: string): Promise<boolean> {
    if (this.activeDeviceId === deviceId && this.isConnected()) {
      return true; // 已连接到目标设备
    }

    if (this.connectionPromise) {
      return await this.connectionPromise;
    }

    this.connectionPromise = this.connectTo(deviceId);

    try {
      const connected = await this.connectionPromise;
      if (connected) {
        this.activeDeviceId = deviceId;
      }
      return connected;
    } finally {
      this.connectionPromise = null;
    }
  }
}
```

### 2. 打印队列优化

#### 批量处理策略

```typescript
class BatchPrintProcessor {
  private batchSize: number = 10;
  private batchTimeout: number = 1000; // 1秒
  private pendingRequests: IPrintRequest[] = [];
  private batchTimer: NodeJS.Timeout | null = null;

  async addToBatch(request: IPrintRequest): Promise<string> {
    const jobId = this.generateJobId();
    request.metadata = { ...request.metadata, jobId };

    this.pendingRequests.push(request);

    if (this.pendingRequests.length >= this.batchSize) {
      await this.processBatch();
    } else if (!this.batchTimer) {
      this.batchTimer = setTimeout(() => this.processBatch(), this.batchTimeout);
    }

    return jobId;
  }

  private async processBatch(): Promise<void> {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    const batch = this.pendingRequests.splice(0, this.batchSize);
    if (batch.length === 0) return;

    try {
      await this.printer.processBatch(batch);
    } catch (error) {
      // 批量失败，将任务重新加入队列或单独处理
      await this.handleBatchFailure(batch, error);
    }
  }
}
```

#### 优先级队列实现

```typescript
class PriorityPrintQueue {
  private queues: Map<PrintPriority, IPrintRequest[]> = new Map([
    [PrintPriority.Urgent, []],
    [PrintPriority.High, []],
    [PrintPriority.Normal, []],
    [PrintPriority.Low, []]
  ]);

  enqueue(request: IPrintRequest): void {
    const priority = request.priority ?? PrintPriority.Normal;
    const queue = this.queues.get(priority);
    if (queue) {
      queue.push(request);
      this.sortQueue(queue);
    }
  }

  dequeue(): IPrintRequest | null {
    // 按优先级顺序检查队列
    const priorities = [PrintPriority.Urgent, PrintPriority.High, PrintPriority.Normal, PrintPriority.Low];

    for (const priority of priorities) {
      const queue = this.queues.get(priority);
      if (queue && queue.length > 0) {
        return queue.shift()!;
      }
    }

    return null;
  }

  private sortQueue(queue: IPrintRequest[]): void {
    // 按创建时间排序，早创建的先处理
    queue.sort((a, b) =>
      (a.metadata?.createdAt ?? 0) - (b.metadata?.createdAt ?? 0)
    );
  }
}
```

### 3. 内存管理优化

#### 对象池模式

```typescript
class PrintJobPool {
  private pool: IPrintJob[] = [];
  private maxSize: number = 50;

  acquire(): IPrintJob {
    if (this.pool.length > 0) {
      const job = this.pool.pop()!;
      this.resetJob(job);
      return job;
    }

    return this.createNewJob();
  }

  release(job: IPrintJob): void {
    if (this.pool.length < this.maxSize) {
      this.cleanupJob(job);
      this.pool.push(job);
    }
  }

  private resetJob(job: IPrintJob): void {
    job.id = '';
    job.status = JobStatus.Pending;
    job.error = undefined;
    job.retryCount = 0;
    job.startedAt = undefined;
    job.completedAt = undefined;
  }

  private cleanupJob(job: IPrintJob): void {
    // 清理作业数据，释放内存
    job.request = undefined;
    job.error = undefined;
  }
}
```

#### 缓存策略

```typescript
class TemplateCache {
  private cache: Map<string, { template: Uint8Array; timestamp: number }> = new Map();
  private maxAge: number = 5 * 60 * 1000; // 5分钟
  private maxSize: number = 100;

  get(templateId: string): Uint8Array | null {
    const entry = this.cache.get(templateId);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > this.maxAge) {
      this.cache.delete(templateId);
      return null;
    }

    return entry.template;
  }

  set(templateId: string, template: Uint8Array): void {
    if (this.cache.size >= this.maxSize) {
      this.evictOldest();
    }

    this.cache.set(templateId, {
      template,
      timestamp: Date.now()
    });
  }

  private evictOldest(): void {
    let oldestKey = '';
    let oldestTime = Date.now();

    for (const [key, entry] of this.cache) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }
}
```

### 4. 异步操作优化

#### 并发控制

```typescript
class ConcurrencyController {
  private semaphore: number;
  private queue: Array<() => Promise<any>> = [];
  private running: number = 0;

  constructor(maxConcurrency: number) {
    this.semaphore = maxConcurrency;
  }

  async execute<T>(task: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await task();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });

      this.processQueue();
    });
  }

  private async processQueue(): Promise<void> {
    if (this.running >= this.semaphore || this.queue.length === 0) {
      return;
    }

    this.running++;
    const task = this.queue.shift()!;

    try {
      await task();
    } finally {
      this.running--;
      this.processQueue();
    }
  }
}
```

#### 防抖和节流

```typescript
class DebouncedScanner {
  private debounceTimer: NodeJS.Timeout | null = null;
  private isScanning: boolean = false;

  scanDevices(): Promise<IBluetoothDevice[]> {
    return new Promise((resolve, reject) => {
      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer);
      }

      this.debounceTimer = setTimeout(async () => {
        if (this.isScanning) {
          resolve([]);
          return;
        }

        try {
          this.isScanning = true;
          const devices = await this.performScan();
          resolve(devices);
        } catch (error) {
          reject(error);
        } finally {
          this.isScanning = false;
        }
      }, 300); // 300ms 防抖
    });
  }
}
```

## 🛡️ 错误处理策略

### 1. 分层错误处理

#### 错误分类和处理

```typescript
// 错误类型定义
enum ErrorCategory {
  BLUETOOTH = 'bluetooth',
  PRINT = 'print',
  CONFIG = 'config',
  NETWORK = 'network',
  USER = 'user'
}

// 错误处理器
class ErrorHandler {
  private handlers: Map<ErrorCategory, IErrorHandler> = new Map();

  constructor() {
    this.registerHandlers();
  }

  private registerHandlers(): void {
    this.handlers.set(ErrorCategory.BLUETOOTH, new BluetoothErrorHandler());
    this.handlers.set(ErrorCategory.PRINT, new PrintErrorHandler());
    this.handlers.set(ErrorCategory.CONFIG, new ConfigErrorHandler());
    this.handlers.set(ErrorCategory.NETWORK, new NetworkErrorHandler());
    this.handlers.set(ErrorCategory.USER, new UserErrorHandler());
  }

  async handleError(error: Error): Promise<ErrorHandlingResult> {
    const category = this.getCategory(error);
    const handler = this.handlers.get(category);

    if (handler) {
      return await handler.handle(error);
    }

    return {
      handled: false,
      retry: false,
      fallback: null
    };
  }

  private getCategory(error: Error): ErrorCategory {
    if (error instanceof BluetoothError) return ErrorCategory.BLUETOOTH;
    if (error instanceof PrintError) return ErrorCategory.PRINT;
    if (error instanceof ConfigError) return ErrorCategory.CONFIG;
    if (error instanceof NetworkError) return ErrorCategory.NETWORK;

    return ErrorCategory.USER;
  }
}
```

#### 重试策略

```typescript
class RetryStrategy {
  private maxAttempts: number;
  private baseDelay: number;
  private maxDelay: number;
  private backoffFactor: number;

  constructor(options: RetryOptions) {
    this.maxAttempts = options.maxAttempts ?? 3;
    this.baseDelay = options.baseDelay ?? 1000;
    this.maxDelay = options.maxDelay ?? 30000;
    this.backoffFactor = options.backoffFactor ?? 2;
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= this.maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;

        if (attempt === this.maxAttempts) {
          throw lastError;
        }

        const delay = this.calculateDelay(attempt);
        await this.sleep(delay);
      }
    }

    throw lastError!;
  }

  private calculateDelay(attempt: number): number {
    const delay = this.baseDelay * Math.pow(this.backoffFactor, attempt - 1);
    return Math.min(delay, this.maxDelay);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// 使用示例
const retryStrategy = new RetryStrategy({
  maxAttempts: 5,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffFactor: 1.5
});

await retryStrategy.execute(async () => {
  return await printer.connect(deviceId);
});
```

### 2. 断路器模式

```typescript
class CircuitBreaker {
  private failureThreshold: number;
  private recoveryTimeout: number;
  private failures: number = 0;
  private lastFailureTime: number = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

  constructor(options: CircuitBreakerOptions) {
    this.failureThreshold = options.failureThreshold ?? 5;
    this.recoveryTimeout = options.recoveryTimeout ?? 60000; // 1分钟
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (this.shouldAttemptReset()) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failures = 0;
    this.state = 'CLOSED';
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.failureThreshold) {
      this.state = 'OPEN';
    }
  }

  private shouldAttemptReset(): boolean {
    return Date.now() - this.lastFailureTime >= this.recoveryTimeout;
  }
}
```

## 🔒 安全管理

### 1. 数据安全

#### 敏感数据处理

```typescript
class SecureDataHandler {
  private encryptionKey: string;

  constructor(encryptionKey: string) {
    this.encryptionKey = encryptionKey;
  }

  // 加密敏感数据
  async encryptSensitiveData(data: string): Promise<string> {
    // 使用简单的加密算法，实际项目中应使用更强的加密
    return btoa(this.xor(data, this.encryptionKey));
  }

  // 解密敏感数据
  async decryptSensitiveData(encryptedData: string): Promise<string> {
    const decrypted = this.xor(atob(encryptedData), this.encryptionKey);
    return decrypted;
  }

  // 清理敏感数据
  sanitizeData(data: any): any {
    const sensitiveFields = ['password', 'token', 'apiKey', 'secret'];

    if (typeof data === 'string') {
      return this.maskSensitiveString(data);
    }

    if (typeof data === 'object' && data !== null) {
      const sanitized = { ...data };
      for (const field of sensitiveFields) {
        if (field in sanitized) {
          sanitized[field] = this.maskSensitiveString(sanitized[field]);
        }
      }
      return sanitized;
    }

    return data;
  }

  private xor(str: string, key: string): string {
    return str.split('').map((char, i) =>
      String.fromCharCode(char.charCodeAt(0) ^ key.charCodeAt(i % key.length))
    ).join('');
  }

  private maskSensitiveString(str: string): string {
    if (str.length <= 4) return '*'.repeat(str.length);
    return str.substring(0, 2) + '*'.repeat(str.length - 4) + str.substring(str.length - 2);
  }
}
```

#### 权限验证

```typescript
class PermissionValidator {
  private requiredPermissions: string[] = ['bluetooth', 'location'];

  async validatePermissions(): Promise<PermissionResult> {
    const results: PermissionCheck[] = [];

    for (const permission of this.requiredPermissions) {
      const granted = await this.checkPermission(permission);
      results.push({ permission, granted });
    }

    const allGranted = results.every(r => r.granted);
    const missingPermissions = results.filter(r => !r.granted).map(r => r.permission);

    return {
      granted: allGranted,
      missingPermissions,
      details: results
    };
  }

  private async checkPermission(permission: string): Promise<boolean> {
    try {
      // 根据平台检查权限
      if (process.env.TARO_ENV === 'weapp') {
        return await this.checkWeAppPermission(permission);
      } else if (process.env.TARO_ENV === 'h5') {
        return await this.checkWebPermission(permission);
      }

      return false;
    } catch (error) {
      console.error(`Failed to check permission ${permission}:`, error);
      return false;
    }
  }

  private async checkWeAppPermission(permission: string): Promise<boolean> {
    // 微信小程序权限检查
    const { authSetting } = await Taro.getSetting();

    switch (permission) {
      case 'bluetooth':
        return authSetting['scope.bluetooth'] === true;
      case 'location':
        return authSetting['scope.userLocation'] === true;
      default:
        return false;
    }
  }

  private async checkWebPermission(permission: string): Promise<boolean> {
    // Web权限检查
    switch (permission) {
      case 'bluetooth':
        return 'bluetooth' in navigator;
      case 'location':
        return 'geolocation' in navigator;
      default:
        return false;
    }
  }
}
```

### 2. 网络安全

#### 数据传输安全

```typescript
class SecureTransmission {
  private secureEndpoints: string[] = [
    '/api/print',
    '/api/template'
  ];

  async sendSecureData(endpoint: string, data: any): Promise<Response> {
    if (!this.isSecureEndpoint(endpoint)) {
      throw new Error('Insecure endpoint not allowed');
    }

    const encryptedData = await this.encryptData(data);
    const signature = await this.generateSignature(encryptedData);

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Signature': signature,
        'X-Timestamp': Date.now().toString()
      },
      body: JSON.stringify({ data: encryptedData })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response;
  }

  private isSecureEndpoint(endpoint: string): boolean {
    return this.secureEndpoints.some(secure => endpoint.startsWith(secure)) &&
           endpoint.startsWith('https://');
  }

  private async encryptData(data: any): Promise<string> {
    // 实现数据加密逻辑
    return JSON.stringify(data);
  }

  private async generateSignature(data: string): Promise<string> {
    // 实现数字签名逻辑
    return btoa(data);
  }
}
```

## 📝 代码质量

### 1. TypeScript 最佳实践

#### 严格类型定义

```typescript
// ✅ 使用严格的类型定义
interface PrintRequest {
  readonly type: PrintType;
  readonly content: string;
  readonly options: Readonly<PrintOptions>;
  readonly priority: Readonly<PrintPriority>;
  readonly metadata: Readonly<PrintMetadata>;
}

// 使用 const assertion
const PrintType = {
  TEXT: 'text',
  IMAGE: 'image',
  QRCODE: 'qrcode',
  BARCODE: 'barcode'
} as const;

type PrintType = typeof PrintType[keyof typeof PrintType];

// 使用泛型约束
interface Repository<T extends { id: string }> {
  findById(id: string): Promise<T | null>;
  save(entity: T): Promise<T>;
  delete(id: string): Promise<boolean>;
}

class PrintJobRepository implements Repository<PrintJob> {
  // 实现方法
}
```

#### 工具类型使用

```typescript
// 使用 Pick 选择需要的属性
type PrintJobEssential = Pick<PrintJob, 'id' | 'status' | 'createdAt'>;

// 使用 Omit 排除不需要的属性
type PrintRequestWithoutMetadata = Omit<PrintRequest, 'metadata'>;

// 使用 Partial 制作可选属性
type PartialPrintConfig = Partial<PrintConfig>;

// 使用 Required 确保所有属性都存在
type RequiredPrintOptions = Required<PrintOptions>;

// 使用 Record 创建映射类型
type PrintJobMap = Record<string, PrintJob>;

// 使用 ReturnType 获取函数返回类型
type PrintHandler = ReturnType<typeof createPrintHandler>;

function createPrintHandler() {
  return async (request: PrintRequest): Promise<PrintResult> => {
    // 处理逻辑
    return { success: true, jobId: 'xxx' };
  };
}
```

### 2. 测试策略

#### 单元测试最佳实践

```typescript
// 使用依赖注入便于测试
class PrintService {
  constructor(
    private adapter: IBluetoothAdapter,
    private queue: IPrintQueue,
    private logger: ILogger
  ) {}

  async print(request: PrintRequest): Promise<string> {
    try {
      this.logger.info('Starting print job', { requestId: request.id });

      const job = await this.queue.enqueue(request);
      await this.adapter.write(job.data);

      this.logger.info('Print job completed', { jobId: job.id });
      return job.id;
    } catch (error) {
      this.logger.error('Print job failed', { error, request });
      throw error;
    }
  }
}

// 测试文件
describe('PrintService', () => {
  let service: PrintService;
  let mockAdapter: jest.Mocked<IBluetoothAdapter>;
  let mockQueue: jest.Mocked<IPrintQueue>;
  let mockLogger: jest.Mocked<ILogger>;

  beforeEach(() => {
    mockAdapter = createMockBluetoothAdapter();
    mockQueue = createMockPrintQueue();
    mockLogger = createMockLogger();

    service = new PrintService(mockAdapter, mockQueue, mockLogger);
  });

  it('should successfully print a request', async () => {
    // Arrange
    const request = createMockPrintRequest();
    const expectedJob = createMockPrintJob({ id: 'job-123' });
    mockQueue.enqueue.mockResolvedValue(expectedJob);
    mockAdapter.write.mockResolvedValue(true);

    // Act
    const result = await service.print(request);

    // Assert
    expect(result).toBe('job-123');
    expect(mockQueue.enqueue).toHaveBeenCalledWith(request);
    expect(mockAdapter.write).toHaveBeenCalledWith(expectedJob.data);
    expect(mockLogger.info).toHaveBeenCalledTimes(2);
  });

  it('should handle print failures gracefully', async () => {
    // Arrange
    const request = createMockPrintRequest();
    const error = new Error('Bluetooth disconnected');
    mockQueue.enqueue.mockRejectedValue(error);

    // Act & Assert
    await expect(service.print(request)).rejects.toThrow(error);
    expect(mockLogger.error).toHaveBeenCalledWith(
      'Print job failed',
      expect.objectContaining({ error, request })
    );
  });
});
```

### 3. 代码规范

#### ESLint 配置优化

```json
{
  "extends": [
    "@tarojs/eslint-config-taro",
    "plugin:@typescript-eslint/recommended"
  ],
  "rules": {
    "@typescript-eslint/no-unused-vars": "error",
    "@typescript-eslint/explicit-function-return-type": "warn",
    "@typescript-eslint/no-explicit-any": "warn",
    "prefer-const": "error",
    "no-var": "error",
    "object-shorthand": "error",
    "prefer-template": "error"
  }
}
```

#### 代码格式化

```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false
}
```

## 🎨 用户体验优化

### 1. 状态管理

#### 状态机模式

```typescript
// 打印机状态管理
enum PrinterState {
  UNINITIALIZED = 'uninitialized',
  READY = 'ready',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  PRINTING = 'printing',
  ERROR = 'error',
  DISCONNECTED = 'disconnected'
}

class PrinterStateMachine {
  private currentState: PrinterState = PrinterState.UNINITIALIZED;
  private stateHistory: PrinterState[] = [];
  private stateListeners: Map<PrinterState, Function[]> = new Map();

  transitionTo(newState: PrinterState, reason?: string): boolean {
    if (!this.isValidTransition(this.currentState, newState)) {
      console.warn(`Invalid state transition: ${this.currentState} -> ${newState}`);
      return false;
    }

    this.stateHistory.push(this.currentState);
    this.currentState = newState;

    this.notifyStateChange(newState, reason);
    return true;
  }

  private isValidTransition(from: PrinterState, to: PrinterState): boolean {
    const validTransitions: Record<PrinterState, PrinterState[]> = {
      [PrinterState.UNINITIALIZED]: [PrinterState.READY],
      [PrinterState.READY]: [PrinterState.CONNECTING],
      [PrinterState.CONNECTING]: [PrinterState.CONNECTED, PrinterState.ERROR],
      [PrinterState.CONNECTED]: [PrinterState.PRINTING, PrinterState.DISCONNECTED],
      [PrinterState.PRINTING]: [PrinterState.CONNECTED, PrinterState.ERROR],
      [PrinterState.ERROR]: [PrinterState.READY, PrinterState.CONNECTING],
      [PrinterState.DISCONNECTED]: [PrinterState.CONNECTING, PrinterState.READY]
    };

    return validTransitions[from]?.includes(to) ?? false;
  }

  onStateChange(state: PrinterState, listener: Function): void {
    if (!this.stateListeners.has(state)) {
      this.stateListeners.set(state, []);
    }
    this.stateListeners.get(state)!.push(listener);
  }

  private notifyStateChange(state: PrinterState, reason?: string): void {
    const listeners = this.stateListeners.get(state) ?? [];
    listeners.forEach(listener => listener(state, reason));
  }
}
```

### 2. 加载状态管理

```typescript
class LoadingManager {
  private loadingStates: Map<string, LoadingState> = new Map();
  private listeners: LoadingListener[] = [];

  startLoading(key: string, message?: string): void {
    this.loadingStates.set(key, {
      isLoading: true,
      message,
      startTime: Date.now()
    });

    this.notifyListeners();
  }

  stopLoading(key: string): void {
    this.loadingStates.delete(key);
    this.notifyListeners();
  }

  isLoading(key?: string): boolean {
    if (key) {
      return this.loadingStates.has(key);
    }

    return this.loadingStates.size > 0;
  }

  getLoadingMessage(key?: string): string | null {
    if (key) {
      return this.loadingStates.get(key)?.message ?? null;
    }

    const states = Array.from(this.loadingStates.values());
    return states.length > 0 ? states[0].message : null;
  }

  addListener(listener: LoadingListener): void {
    this.listeners.push(listener);
  }

  removeListener(listener: LoadingListener): void {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  private notifyListeners(): void {
    const isLoading = this.isLoading();
    const message = this.getLoadingMessage();

    this.listeners.forEach(listener => listener(isLoading, message));
  }
}
```

### 3. 离线处理

```typescript
class OfflineManager {
  private isOnline: boolean = navigator.onLine;
  private pendingOperations: OfflineOperation[] = [];
  private listeners: OnlineStatusListener[] = [];

  constructor() {
    window.addEventListener('online', this.handleOnline.bind(this));
    window.addEventListener('offline', this.handleOffline.bind(this));
  }

  addPendingOperation(operation: OfflineOperation): void {
    if (this.isOnline) {
      this.executeOperation(operation);
    } else {
      this.pendingOperations.push(operation);
    }
  }

  private async handleOnline(): Promise<void> {
    this.isOnline = true;
    this.notifyListeners(true);

    // 处理待执行的操作
    const operations = [...this.pendingOperations];
    this.pendingOperations = [];

    for (const operation of operations) {
      try {
        await this.executeOperation(operation);
      } catch (error) {
        console.error('Failed to execute pending operation:', error);
        // 可以考虑重新加入队列
      }
    }
  }

  private handleOffline(): void {
    this.isOnline = false;
    this.notifyListeners(false);
  }

  private async executeOperation(operation: OfflineOperation): Promise<void> {
    try {
      await operation.execute();
    } catch (error) {
      if (operation.retryCount < operation.maxRetries) {
        operation.retryCount++;
        setTimeout(() => this.addPendingOperation(operation), operation.retryDelay);
      } else {
        throw error;
      }
    }
  }

  addListener(listener: OnlineStatusListener): void {
    this.listeners.push(listener);
  }

  removeListener(listener: OnlineStatusListener): void {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  private notifyListeners(isOnline: boolean): void {
    this.listeners.forEach(listener => listener(isOnline));
  }
}
```

## 🚀 部署建议

### 1. 构建优化

#### 代码分割

```typescript
// 路由级别的代码分割
const PrintPage = lazy(() => import('./pages/PrintPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));

// 功能模块的代码分割
const BluetoothModule = lazy(() => import('./modules/BluetoothModule'));
const PrintModule = lazy(() => import('./modules/PrintModule'));

// 动态导入蓝牙适配器
async function getBluetoothAdapter(): Promise<IBluetoothAdapter> {
  const { WeChatBluetoothAdapter } = await import('./adapters/WeChatAdapter');
  return new WeChatBluetoothAdapter();
}
```

#### Tree Shaking 优化

```typescript
// 使用具名导出而不是默认导出
export { BluetoothPrinter, createBluetoothPrinter, BluetoothError };
export type { IBluetoothDevice, PrintRequest };

// 避免导入整个库
// ❌ 错误
import * as BluetoothPrinter from 'taro-bluetooth-print';

// ✅ 正确
import { createBluetoothPrinter, BluetoothError } from 'taro-bluetooth-print';
```

### 2. 环境配置

#### 多环境配置

```typescript
// config/environments.ts
export const environments = {
  development: {
    apiUrl: 'http://localhost:3000/api',
    logLevel: 'debug',
    enableMockData: true
  },
  staging: {
    apiUrl: 'https://staging-api.example.com/api',
    logLevel: 'info',
    enableMockData: false
  },
  production: {
    apiUrl: 'https://api.example.com/api',
    logLevel: 'error',
    enableMockData: false
  }
};

export const currentEnvironment = environments[process.env.NODE_ENV as keyof typeof environments];
```

#### 配置验证

```typescript
class ConfigValidator {
  static validate(config: AppConfig): ValidationResult {
    const errors: string[] = [];

    // 验证必需字段
    if (!config.api?.url) {
      errors.push('API URL is required');
    }

    // 验证数据类型
    if (config.bluetooth?.scanTimeout && typeof config.bluetooth.scanTimeout !== 'number') {
      errors.push('Bluetooth scan timeout must be a number');
    }

    // 验证数据范围
    if (config.printer?.density && (config.printer.density < 0 || config.printer.density > 8)) {
      errors.push('Printer density must be between 0 and 8');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}
```

## ⚠️ 常见陷阱避免

### 1. 内存泄漏

#### 事件监听器清理

```typescript
class ComponentWithEvents {
  private disposers: Function[] = [];

  constructor(private eventBus: IEventBus) {
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    const deviceFoundHandler = this.handleDeviceFound.bind(this);
    const connectionHandler = this.handleConnectionChange.bind(this);

    this.eventBus.subscribe('bluetooth:device-found', deviceFoundHandler);
    this.eventBus.subscribe('bluetooth:connected', connectionHandler);

    // 保存清理函数
    this.disposers.push(
      () => this.eventBus.unsubscribe('bluetooth:device-found', deviceFoundHandler),
      () => this.eventBus.unsubscribe('bluetooth:connected', connectionHandler)
    );
  }

  dispose(): void {
    // 清理所有事件监听器
    this.disposers.forEach(dispose => dispose());
    this.disposers = [];
  }
}
```

#### 定时器清理

```typescript
class TimerManager {
  private timers: Set<NodeJS.Timeout | number> = new Set();

  setTimeout(callback: Function, delay: number): NodeJS.Timeout {
    const timer = setTimeout(() => {
      this.timers.delete(timer);
      callback();
    }, delay);

    this.timers.add(timer);
    return timer;
  }

  setInterval(callback: Function, interval: number): NodeJS.Timeout {
    const timer = setInterval(callback, interval);
    this.timers.add(timer);
    return timer;
  }

  clearAllTimers(): void {
    this.timers.forEach(timer => {
      clearTimeout(timer);
      clearInterval(timer);
    });
    this.timers.clear();
  }
}
```

### 2. 异步操作错误

#### Promise 链处理

```typescript
// ❌ 错误：没有正确处理 Promise 链
async function printMultiple(requests: PrintRequest[]): Promise<void> {
  requests.forEach(request => {
    printer.print(request); // 没有等待
  });
}

// ✅ 正确：正确处理异步操作
async function printMultiple(requests: PrintRequest[]): Promise<void> {
  await Promise.all(requests.map(request => printer.print(request)));
}

// 或者顺序执行
async function printSequentially(requests: PrintRequest[]): Promise<void> {
  for (const request of requests) {
    await printer.print(request);
  }
}
```

### 3. 竞态条件

#### 操作取消

```typescript
class CancellableOperation {
  private cancelled: boolean = false;

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.cancelled) {
      throw new Error('Operation has been cancelled');
    }

    try {
      const result = await operation();

      if (this.cancelled) {
        throw new Error('Operation was cancelled during execution');
      }

      return result;
    } catch (error) {
      if (this.cancelled) {
        throw new Error('Operation was cancelled');
      }
      throw error;
    }
  }

  cancel(): void {
    this.cancelled = true;
  }

  reset(): void {
    this.cancelled = false;
  }
}
```

## 🔍 监控和调试

### 1. 性能监控

```typescript
class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetric[]> = new Map();

  startTimer(name: string): () => PerformanceMetric {
    const startTime = performance.now();

    return (): PerformanceMetric => {
      const endTime = performance.now();
      const duration = endTime - startTime;

      const metric: PerformanceMetric = {
        name,
        startTime,
        endTime,
        duration,
        timestamp: Date.now()
      };

      this.recordMetric(metric);
      return metric;
    };
  }

  private recordMetric(metric: PerformanceMetric): void {
    if (!this.metrics.has(metric.name)) {
      this.metrics.set(metric.name, []);
    }

    const metrics = this.metrics.get(metric.name)!;
    metrics.push(metric);

    // 保持最近100个记录
    if (metrics.length > 100) {
      metrics.shift();
    }
  }

  getAverageDuration(name: string): number {
    const metrics = this.metrics.get(name) ?? [];
    if (metrics.length === 0) return 0;

    const total = metrics.reduce((sum, metric) => sum + metric.duration, 0);
    return total / metrics.length;
  }

  getMetricsSummary(): PerformanceSummary {
    const summary: PerformanceSummary = {};

    for (const [name, metrics] of this.metrics) {
      if (metrics.length > 0) {
        summary[name] = {
          count: metrics.length,
          average: this.getAverageDuration(name),
          min: Math.min(...metrics.map(m => m.duration)),
          max: Math.max(...metrics.map(m => m.duration))
        };
      }
    }

    return summary;
  }
}
```

### 2. 错误追踪

```typescript
class ErrorTracker {
  private errors: ErrorRecord[] = [];
  private maxErrors: number = 100;

  trackError(error: Error, context?: any): void {
    const record: ErrorRecord = {
      id: this.generateId(),
      message: error.message,
      stack: error.stack,
      timestamp: Date.now(),
      context: this.sanitizeContext(context),
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    this.errors.unshift(record);

    if (this.errors.length > this.maxErrors) {
      this.errors.pop();
    }

    // 发送到错误报告服务
    this.reportError(record);
  }

  private sanitizeContext(context: any): any {
    if (!context) return context;

    // 移除敏感信息
    const sanitized = { ...context };
    const sensitiveKeys = ['password', 'token', 'apiKey'];

    for (const key of sensitiveKeys) {
      if (key in sanitized) {
        sanitized[key] = '[REDACTED]';
      }
    }

    return sanitized;
  }

  private async reportError(record: ErrorRecord): Promise<void> {
    try {
      await fetch('/api/errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record)
      });
    } catch (error) {
      console.error('Failed to report error:', error);
    }
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }
}
```

### 3. 调试工具

```typescript
class DebugTools {
  private isEnabled: boolean = false;
  private debugData: Map<string, any> = new Map();

  enable(): void {
    this.isEnabled = true;
    console.log('🐛 Debug tools enabled');
  }

  disable(): void {
    this.isEnabled = false;
    console.log('🔒 Debug tools disabled');
  }

  log(category: string, message: string, data?: any): void {
    if (!this.isEnabled) return;

    const timestamp = new Date().toISOString();
    const logEntry = { timestamp, message, data };

    console.group(`🔍 [${category}] ${message}`);
    console.log('Data:', data);
    console.log('Timestamp:', timestamp);
    console.groupEnd();

    // 保存调试数据
    this.setDebugData(category, logEntry);
  }

  setDebugData(key: string, value: any): void {
    if (this.isEnabled) {
      this.debugData.set(key, value);
    }
  }

  getDebugData(key?: string): any {
    if (key) {
      return this.debugData.get(key);
    }

    return Object.fromEntries(this.debugData);
  }

  exportDebugData(): string {
    const data = Object.fromEntries(this.debugData);
    return JSON.stringify(data, null, 2);
  }

  clearDebugData(): void {
    this.debugData.clear();
  }
}

// 全局调试实例
export const debug = new DebugTools();

// 开发环境自动启用
if (process.env.NODE_ENV === 'development') {
  debug.enable();
}
```

## 总结

遵循这些最佳实践将帮助您：

1. **构建高质量的蓝牙打印应用** - 通过良好的架构设计和代码规范
2. **确保应用性能** - 通过性能优化策略和监控工具
3. **提高安全性** - 通过数据保护和权限验证
4. **改善用户体验** - 通过状态管理和错误处理
5. **便于维护和扩展** - 通过模块化设计和测试覆盖

记住，最佳实践是不断演进的，要根据项目需求和团队经验进行适当调整。定期回顾和优化代码质量是保持项目健康的关键。