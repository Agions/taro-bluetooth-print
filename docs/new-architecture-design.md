# 新架构设计方案

## 设计原则

### 1. SOLID原则
- **单一职责原则(SRP)**：每个类只有一个改变的理由
- **开闭原则(OCP)**：对扩展开放，对修改关闭
- **里氏替换原则(LSP)**：子类型必须能够替换其基类型
- **接口隔离原则(ISP)**：不应该强迫客户端依赖它们不使用的接口
- **依赖倒置原则(DIP)**：高层模块不应该依赖低层模块，两者都应该依赖抽象

### 2. 架构原则
- **关注点分离**：不同层次的职责清晰分离
- **依赖注入**：通过IoC容器管理依赖关系
- **接口编程**：面向接口而非实现编程
- **事件驱动**：使用事件系统实现松耦合

## 分层架构设计

### 架构概览

```
┌─────────────────────────────────────────────────────────────┐
│                    Application Layer                       │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │   API Facade    │  │  Config Manager │  │ Event Gateway│ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
├─────────────────────────────────────────────────────────────┤
│                    Domain Layer                            │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │ Bluetooth Domain│  │ Printer Domain  │  │ Event Domain │ │
│  │    Services     │  │    Services     │  │   Services   │ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │ Command Queue   │  │ State Machines  │  │ Repositories │ │
│  │    Service      │  │                 │  │              │ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
├─────────────────────────────────────────────────────────────┤
│                Infrastructure Layer                         │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │  Bluetooth      │  │  Printer        │  │   Storage    │ │
│  │  Adapters       │  │  Adapters       │  │  Adapters    │ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │   Logger        │  │   Cache         │  │  Monitoring  │ │
│  │   Infrastructure│  │   Infrastructure│  │  Infrastructure│ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### 层次职责

#### 1. Application Layer (应用层)
**职责**：
- 提供对外API接口
- 处理用户请求和响应
- 协调领域服务
- 管理配置和生命周期

**主要组件**：
- `TaroBluePrintFacade`: 主API门面
- `ConfigurationManager`: 配置管理
- `EventGateway`: 事件网关
- `IoCContainer`: 依赖注入容器

#### 2. Domain Layer (领域层)
**职责**：
- 实现核心业务逻辑
- 定义领域模型和规则
- 管理业务状态
- 提供领域服务

**主要组件**：
- `BluetoothDomainService`: 蓝牙业务逻辑
- `PrinterDomainService`: 打印机业务逻辑
- `CommandQueueService`: 命令队列服务
- `StateManager`: 状态管理服务
- `EventDomainService`: 事件处理服务

#### 3. Infrastructure Layer (基础设施层)
**职责**：
- 实现技术细节
- 与外部系统交互
- 提供基础技术服务
- 管理硬件资源

**主要组件**：
- `BluetoothAdapter`: 蓝牙硬件适配器
- `PrinterAdapter`: 打印机硬件适配器
- `StorageAdapter`: 存储适配器
- `LoggerAdapter`: 日志基础设施
- `CacheAdapter`: 缓存基础设施
- `MonitoringAdapter`: 监控基础设施

## 核心组件设计

### 1. 依赖注入容器

```typescript
interface IIoCContainer {
  register<T>(key: string, factory: () => T, lifecycle?: Lifecycle): void;
  registerSingleton<T>(key: string, factory: () => T): void;
  registerTransient<T>(key: string, factory: () => T): void;
  resolve<T>(key: string): T;
  tryResolve<T>(key: string): T | null;
  has(key: string): boolean;
  clear(): void;
}

enum Lifecycle {
  Singleton = 'singleton',
  Transient = 'transient',
  Scoped = 'scoped'
}
```

### 2. 事件驱动架构

```typescript
interface IEventBus {
  publish<T>(event: IEvent<T>): void;
  subscribe<T>(eventType: string, handler: IEventHandler<T>): () => void;
  unsubscribe(eventType: string, handler: IEventHandler<T>): void;
  clear(): void;
}

interface IEvent<T> {
  type: string;
  data: T;
  timestamp: number;
  id: string;
}

interface IEventHandler<T> {
  handle(event: IEvent<T>): Promise<void> | void;
}
```

### 3. 命令队列系统

```typescript
interface ICommand {
  id: string;
  type: string;
  data: unknown;
  priority: number;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
}

interface ICommandQueue {
  enqueue(command: ICommand): Promise<void>;
  dequeue(): Promise<ICommand | null>;
  peek(): Promise<ICommand | null>;
  size(): Promise<number>;
  clear(): Promise<void>;
}

interface ICommandProcessor {
  process(command: ICommand): Promise<CommandResult>;
}
```

### 4. 状态管理

```typescript
interface IStateManager {
  getState<T>(key: string): T | null;
  setState<T>(key: string, value: T): void;
  subscribe<T>(key: string, listener: StateChangeListener<T>): () => void;
  unsubscribe(key: string, listener: StateChangeListener<unknown>): void;
  clear(): void;
}

type StateChangeListener<T> = (newValue: T, oldValue: T | null) => void;
```

## 新的目录结构

```
src/
├── index.ts                          # 主入口文件
├── application/                      # 应用层
│   ├── index.ts                     # 应用层入口
│   ├── facade/                      # API门面
│   │   ├── TaroBluePrintFacade.ts   # 主API门面
│   │   └── index.ts
│   ├── config/                      # 配置管理
│   │   ├── ConfigurationManager.ts
│   │   ├── ConfigurationValidator.ts
│   │   └── index.ts
│   ├── events/                      # 事件网关
│   │   ├── EventGateway.ts
│   │   ├── EventPublisher.ts
│   │   └── index.ts
│   └── container/                   # 依赖注入容器
│       ├── IoCContainer.ts
│       ├── ServiceRegistry.ts
│       └── index.ts
├── domain/                          # 领域层
│   ├── index.ts                     # 领域层入口
│   ├── bluetooth/                   # 蓝牙领域
│   │   ├── services/
│   │   │   ├── BluetoothDomainService.ts
│   │   │   ├── DeviceDiscoveryService.ts
│   │   │   └── ConnectionManagementService.ts
│   │   ├── models/
│   │   │   ├── BluetoothDevice.ts
│   │   │   ├── ConnectionState.ts
│   │   │   └── ScanResult.ts
│   │   ├── repositories/
│   │   │   ├── IBluetoothRepository.ts
│   │   │   └── BluetoothRepository.ts
│   │   └── index.ts
│   ├── printer/                     # 打印机领域
│   │   ├── services/
│   │   │   ├── PrinterDomainService.ts
│   │   │   ├── CommandQueueService.ts
│   │   │   └── TemplateService.ts
│   │   ├── models/
│   │   │   ├── PrinterCommand.ts
│   │   │   ├── PrintJob.ts
│   │   │   └── PrinterState.ts
│   │   ├── repositories/
│   │   │   ├── IPrinterRepository.ts
│   │   │   └── PrinterRepository.ts
│   │   └── index.ts
│   ├── shared/                      # 共享领域组件
│   │   ├── events/
│   │   │   ├── DomainEvent.ts
│   │   │   ├── EventBus.ts
│   │   │   └── index.ts
│   │   ├── state/
│   │   │   ├── StateManager.ts
│   │   │   ├── StateMachine.ts
│   │   │   └── index.ts
│   │   └── index.ts
│   └── index.ts
├── infrastructure/                  # 基础设施层
│   ├── index.ts                     # 基础设施层入口
│   ├── bluetooth/                   # 蓝牙基础设施
│   │   ├── adapters/
│   │   │   ├── BaseBluetoothAdapter.ts
│   │   │   ├── WeAppBluetoothAdapter.ts
│   │   │   ├── H5BluetoothAdapter.ts
│   │   │   ├── RNBluetoothAdapter.ts
│   │   │   ├── HarmonyBluetoothAdapter.ts
│   │   │   └── index.ts
│   │   ├── factories/
│   │   │   ├── BluetoothAdapterFactory.ts
│   │   │   └── index.ts
│   │   └── index.ts
│   ├── printer/                     # 打印机基础设施
│   │   ├── adapters/
│   │   │   ├── BasePrinterAdapter.ts
│   │   │   ├── ESCPOSAdapter.ts
│   │   │   └── index.ts
│   │   ├── commands/
│   │   │   ├── ESCPOSCommands.ts
│   │   │   ├── CommandBuilder.ts
│   │   │   └── index.ts
│   │   └── index.ts
│   ├── storage/                     # 存储基础设施
│   │   ├── adapters/
│   │   │   ├── MemoryStorageAdapter.ts
│   │   │   ├── LocalStorageAdapter.ts
│   │   │   └── index.ts
│   │   └── index.ts
│   ├── logging/                     # 日志基础设施
│   │   ├── adapters/
│   │   │   ├── ConsoleLoggerAdapter.ts
│   │   │   ├── FileLoggerAdapter.ts
│   │   │   └── index.ts
│   │   ├── formatters/
│   │   │   ├── StructuredFormatter.ts
│   │   │   ├── PlainTextFormatter.ts
│   │   │   └── index.ts
│   │   └── index.ts
│   ├── cache/                       # 缓存基础设施
│   │   ├── adapters/
│   │   │   ├── MemoryCacheAdapter.ts
│   │   │   ├── LRUCacheAdapter.ts
│   │   │   └── index.ts
│   │   └── index.ts
│   ├── monitoring/                  # 监控基础设施
│   │   ├── adapters/
│   │   │   ├── PerformanceMonitorAdapter.ts
│   │   │   ├── ErrorMonitorAdapter.ts
│   │   │   └── index.ts
│   │   └── index.ts
│   └── index.ts
├── shared/                          # 共享组件
│   ├── types/                       # 类型定义
│   │   ├── common.ts
│   │   ├── bluetooth.ts
│   │   ├── printer.ts
│   │   ├── events.ts
│   │   └── index.ts
│   ├── utils/                       # 工具函数
│   │   ├── validation.ts
│   │   ├── formatting.ts
│   │   ├── platform.ts
│   │   └── index.ts
│   ├── constants/                   # 常量定义
│   │   ├── errors.ts
│   │   ├── events.ts
│   │   └── index.ts
│   └── index.ts
└── tests/                           # 测试文件
    ├── unit/
    ├── integration/
    ├── e2e/
    └── fixtures/
```

## 数据流设计

### 1. 蓝牙连接流程

```
用户请求 -> API Facade -> Bluetooth Domain Service -> Bluetooth Adapter -> 硬件
          <- 响应     <- 状态管理   <- 事件发布      <- 硬件状态
```

### 2. 打印流程

```
打印请求 -> API Facade -> Printer Domain Service -> Command Queue -> Printer Adapter -> 硬件
         <- 响应     <- 状态管理   <- 事件发布      <- 命令执行    <- 硬件状态
```

### 3. 配置更新流程

```
配置更新 -> Configuration Manager -> Event Gateway -> 各领域服务
         <- 确认响应   <- 状态更新   <- 事件通知     <- 重新配置
```

## 错误处理策略

### 1. 分层错误处理
- **应用层**：处理用户输入错误，返回用户友好的错误信息
- **领域层**：处理业务规则违反，抛出领域异常
- **基础设施层**：处理技术故障，记录详细日志并抛出系统异常

### 2. 错误分类体系

```typescript
enum ErrorCategory {
  USER_INPUT = 'USER_INPUT',           // 用户输入错误
  BUSINESS_RULE = 'BUSINESS_RULE',     // 业务规则违反
  SYSTEM_ERROR = 'SYSTEM_ERROR',       // 系统错误
  NETWORK_ERROR = 'NETWORK_ERROR',     // 网络错误
  HARDWARE_ERROR = 'HARDWARE_ERROR',   // 硬件错误
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR' // 配置错误
}

class DomainError extends Error {
  constructor(
    public category: ErrorCategory,
    public code: string,
    message: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'DomainError';
  }
}
```

## 性能优化策略

### 1. 连接池管理
- 复用蓝牙连接，减少建立连接的开销
- 实现连接健康检查和自动恢复
- 支持连接超时和清理机制

### 2. 缓存策略
- 设备信息缓存
- 命令结果缓存
- 配置信息缓存

### 3. 异步处理
- 非阻塞I/O操作
- 事件驱动的异步通信
- 队列化的命令处理

这个新架构设计解决了现有架构的主要问题，提供了清晰的分层、松耦合的组件设计，并为未来的扩展和维护奠定了良好的基础。