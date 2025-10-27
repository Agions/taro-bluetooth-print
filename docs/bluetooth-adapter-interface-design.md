# 蓝牙适配器接口设计

## 设计目标

1. **平台无关性**：定义统一的接口，支持多平台实现
2. **可扩展性**：支持新平台和新设备的扩展
3. **类型安全**：提供完整的TypeScript类型定义
4. **异步支持**：支持Promise和async/await
5. **事件驱动**：支持状态变更和事件通知

## 核心接口定义

### 1. 蓝牙设备接口

```typescript
/**
 * 蓝牙设备信息接口
 */
export interface IBluetoothDevice {
  /** 设备唯一标识 */
  readonly deviceId: string;
  /** 设备名称 */
  readonly name: string;
  /** 设备本地名称 */
  readonly localName?: string;
  /** 信号强度 */
  readonly rssi?: number;
  /** 广播数据 */
  readonly advertisData?: ArrayBuffer;
  /** 制造商数据 */
  readonly manufacturerData?: ArrayBuffer;
  /** 服务数据 */
  readonly serviceData?: Map<string, ArrayBuffer>;
  /** 服务UUID列表 */
  readonly serviceUuids?: string[];
  /** 是否可连接 */
  readonly connectable?: boolean;
  /** 设备类型 */
  readonly deviceType?: BluetoothDeviceType;
  /** 发现时间戳 */
  readonly discoveredAt: number;
  /** 设备元数据 */
  readonly metadata?: Record<string, unknown>;
}

/**
 * 蓝牙设备类型枚举
 */
export enum BluetoothDeviceType {
  UNKNOWN = 'unknown',
  CLASSIC = 'classic',
  LE = 'le',
  DUAL = 'dual'
}

/**
 * 设备连接状态
 */
export enum DeviceConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  DISCONNECTING = 'disconnecting',
  ERROR = 'error'
}
```

### 2. 蓝牙服务接口

```typescript
/**
 * 蓝牙服务信息接口
 */
export interface IBluetoothService {
  /** 服务UUID */
  readonly uuid: string;
  /** 是否为主服务 */
  readonly isPrimary: boolean;
  /** 服务特征列表 */
  readonly characteristics: IBluetoothCharacteristic[];
  /** 服务包含的服务 */
  readonly includedServices?: IBluetoothService[];
}

/**
 * 蓝牙特征值接口
 */
export interface IBluetoothCharacteristic {
  /** 特征UUID */
  readonly uuid: string;
  /** 特征属性 */
  readonly properties: CharacteristicProperties;
  /** 特征值 */
  readonly value?: ArrayBuffer;
  /** 所属服务 */
  readonly service: IBluetoothService;
  /** 描述符列表 */
  readonly descriptors?: IBluetoothDescriptor[];
}

/**
 * 特征属性枚举
 */
export enum CharacteristicProperties {
  BROADCAST = 0x01,
  READ = 0x02,
  WRITE_WITHOUT_RESPONSE = 0x04,
  WRITE = 0x08,
  NOTIFY = 0x10,
  INDICATE = 0x20,
  AUTHENTICATED_SIGNED_WRITES = 0x40,
  EXTENDED_PROPERTIES = 0x80,
  NOTIFY_ENCRYPTION_REQUIRED = 0x100,
  INDICATE_ENCRYPTION_REQUIRED = 0x200
}

/**
 * 蓝牙描述符接口
 */
export interface IBluetoothDescriptor {
  /** 描述符UUID */
  readonly uuid: string;
  /** 描述符值 */
  readonly value?: ArrayBuffer;
  /** 所属特征值 */
  readonly characteristic: IBluetoothCharacteristic;
}
```

### 3. 蓝牙适配器核心接口

```typescript
/**
 * 蓝牙适配器接口
 */
export interface IBluetoothAdapter {
  /** 适配器是否已初始化 */
  readonly isInitialized: boolean;
  /** 当前连接状态 */
  readonly connectionState: AdapterState;
  /** 支持的设备类型 */
  readonly supportedDeviceTypes: BluetoothDeviceType[];
  /** 适配器能力 */
  readonly capabilities: AdapterCapabilities;

  /**
   * 初始化适配器
   * @param options 初始化选项
   */
  initialize(options?: AdapterInitOptions): Promise<boolean>;

  /**
   * 销毁适配器
   */
  dispose(): Promise<void>;

  /**
   * 获取适配器状态
   */
  getState(): Promise<AdapterState>;

  /**
   * 开始设备扫描
   * @param options 扫描选项
   */
  startDiscovery(options?: DiscoveryOptions): Promise<boolean>;

  /**
   * 停止设备扫描
   */
  stopDiscovery(): Promise<boolean>;

  /**
   * 获取已发现的设备列表
   */
  getDiscoveredDevices(): Promise<IBluetoothDevice[]>;

  /**
   * 连接设备
   * @param deviceId 设备ID
   * @param options 连接选项
   */
  connect(deviceId: string, options?: ConnectionOptions): Promise<BluetoothConnectionResult>;

  /**
   * 断开设备连接
   * @param deviceId 设备ID
   */
  disconnect(deviceId: string): Promise<boolean>;

  /**
   * 获取设备服务
   * @param deviceId 设备ID
   */
  getServices(deviceId: string): Promise<IBluetoothService[]>;

  /**
   * 获取服务特征值
   * @param deviceId 设备ID
   * @param serviceUuid 服务UUID
   */
  getCharacteristics(deviceId: string, serviceUuid: string): Promise<IBluetoothCharacteristic[]>;

  /**
   * 读取特征值
   * @param deviceId 设备ID
   * @param serviceUuid 服务UUID
   * @param characteristicUuid 特征UUID
   */
  readCharacteristic(
    deviceId: string,
    serviceUuid: string,
    characteristicUuid: string
  ): Promise<ArrayBuffer>;

  /**
   * 写入特征值
   * @param deviceId 设备ID
   * @param serviceUuid 服务UUID
   * @param characteristicUuid 特征UUID
   * @param data 写入数据
   * @param options 写入选项
   */
  writeCharacteristic(
    deviceId: string,
    serviceUuid: string,
    characteristicUuid: string,
    data: ArrayBuffer,
    options?: WriteOptions
  ): Promise<boolean>;

  /**
   * 订阅特征值通知
   * @param deviceId 设备ID
   * @param serviceUuid 服务UUID
   * @param characteristicUuid 特征UUID
   * @param callback 数据回调
   */
  subscribeCharacteristic(
    deviceId: string,
    serviceUuid: string,
    characteristicUuid: string,
    callback: CharacteristicCallback
  ): Promise<boolean>;

  /**
   * 取消订阅特征值通知
   * @param deviceId 设备ID
   * @param serviceUuid 服务UUID
   * @param characteristicUuid 特征UUID
   */
  unsubscribeCharacteristic(
    deviceId: string,
    serviceUuid: string,
    characteristicUuid: string
  ): Promise<boolean>;

  /**
   * 注册事件监听器
   * @param event 事件类型
   * @param listener 事件监听器
   */
  addEventListener<T extends BluetoothAdapterEvent>(
    event: T['type'],
    listener: (event: T) => void
  ): () => void;

  /**
   * 移除事件监听器
   * @param event 事件类型
   * @param listener 事件监听器
   */
  removeEventListener<T extends BluetoothAdapterEvent>(
    event: T['type'],
    listener: (event: T) => void
  ): void;
}
```

### 4. 配置和选项接口

```typescript
/**
 * 适配器初始化选项
 */
export interface AdapterInitOptions {
  /** 是否启用调试模式 */
  debug?: boolean;
  /** 连接超时时间（毫秒） */
  connectionTimeout?: number;
  /** 扫描超时时间（毫秒） */
  scanTimeout?: number;
  /** 最大同时连接数 */
  maxConnections?: number;
  /** 是否自动重连 */
  autoReconnect?: boolean;
  /** 重连间隔（毫秒） */
  reconnectInterval?: number;
  /** 自定义配置 */
  customConfig?: Record<string, unknown>;
}

/**
 * 设备扫描选项
 */
export interface DiscoveryOptions {
  /** 扫描超时时间（毫秒） */
  timeout?: number;
  /** 是否允许重复设备 */
  allowDuplicatesKey?: boolean;
  /** 服务过滤 */
  services?: string[];
  /** 设备名称过滤 */
  namePrefix?: string;
  /** 信号强度过滤 */
  rssiThreshold?: number;
  /** 设备类型过滤 */
  deviceTypes?: BluetoothDeviceType[];
  /** 制造商数据过滤 */
  manufacturerData?: Map<number, ArrayBuffer>;
}

/**
 * 连接选项
 */
export interface ConnectionOptions {
  /** 连接超时时间（毫秒） */
  timeout?: number;
  /** 是否自动发现服务 */
  autoDiscoverServices?: boolean;
  /** MTU大小 */
  mtu?: number;
  /** 连接参数 */
  connectionParameters?: ConnectionParameters;
}

/**
 * 连接参数
 */
export interface ConnectionParameters {
  /** 最小连接间隔 */
  minInterval?: number;
  /** 最大连接间隔 */
  maxInterval?: number;
  /** 从设备延迟 */
  slaveLatency?: number;
  /** 连接超时时间 */
  supervisionTimeout?: number;
}

/**
 * 写入选项
 */
export interface WriteOptions {
  /** 写入类型 */
  writeType?: WriteType;
  /** 是否需要响应 */
  withoutResponse?: boolean;
  /** 分片写入 */
  withResponse?: boolean;
}

/**
 * 写入类型枚举
 */
export enum WriteType {
  WITH_RESPONSE = 'withResponse',
  WITHOUT_RESPONSE = 'withoutResponse'
}

/**
 * 适配器状态
 */
export interface AdapterState {
  /** 是否可用 */
  available: boolean;
  /** 是否正在扫描 */
  discovering: boolean;
  /** 已连接设备数量 */
  connectedDevices: number;
  /** 最大连接数 */
  maxConnections: number;
  /** 状态更新时间 */
  lastUpdated: number;
}

/**
 * 适配器能力
 */
export interface AdapterCapabilities {
  /** 支持的蓝牙版本 */
  bluetoothVersion: string;
  /** 支持的设备类型 */
  supportedDeviceTypes: BluetoothDeviceType[];
  /** 最大连接数 */
  maxConnections: number;
  /** 是否支持LE */
  supportsLE: boolean;
  /** 是否支持经典蓝牙 */
  supportsClassic: boolean;
  /** 是否支持扫描过滤 */
  supportsScanFiltering: boolean;
  /** 是否支持MTU协商 */
  supportsMTUNegotiation: boolean;
}
```

### 5. 事件和回调接口

```typescript
/**
 * 蓝牙适配器事件基类
 */
export interface BluetoothAdapterEvent {
  /** 事件类型 */
  readonly type: string;
  /** 事件时间戳 */
  readonly timestamp: number;
  /** 适配器实例 */
  readonly adapter: IBluetoothAdapter;
}

/**
 * 适配器状态变更事件
 */
export interface AdapterStateChangedEvent extends BluetoothAdapterEvent {
  readonly type: 'adapterStateChanged';
  readonly oldState: AdapterState;
  readonly newState: AdapterState;
}

/**
 * 设备发现事件
 */
export interface DeviceDiscoveredEvent extends BluetoothAdapterEvent {
  readonly type: 'deviceDiscovered';
  readonly device: IBluetoothDevice;
  readonly rssi: number;
}

/**
 * 设备连接事件
 */
export interface DeviceConnectedEvent extends BluetoothAdapterEvent {
  readonly type: 'deviceConnected';
  readonly device: IBluetoothDevice;
  readonly connectionInfo: ConnectionInfo;
}

/**
 * 设备断开连接事件
 */
export interface DeviceDisconnectedEvent extends BluetoothAdapterEvent {
  readonly type: 'deviceDisconnected';
  readonly device: IBluetoothDevice;
  readonly reason: DisconnectReason;
}

/**
 * 连接信息
 */
export interface ConnectionInfo {
  /** 设备ID */
  deviceId: string;
  /** 连接时间 */
  connectedAt: number;
  /** MTU大小 */
  mtu: number;
  /** 连接参数 */
  parameters: ConnectionParameters;
}

/**
 * 断开原因枚举
 */
export enum DisconnectReason {
  USER_DISCONNECTED = 'userDisconnected',
  DEVICE_DISCONNECTED = 'deviceDisconnected',
  TIMEOUT = 'timeout',
  ERROR = 'error',
  UNKNOWN = 'unknown'
}

/**
 * 特征值数据回调类型
 */
export type CharacteristicCallback = (
  deviceId: string,
  serviceUuid: string,
  characteristicUuid: string,
  value: ArrayBuffer
) => void;

/**
 * 连接结果
 */
export interface BluetoothConnectionResult {
  /** 是否成功 */
  success: boolean;
  /** 设备信息 */
  device?: IBluetoothDevice;
  /** 连接信息 */
  connectionInfo?: ConnectionInfo;
  /** 错误信息 */
  error?: BluetoothError;
}

/**
 * 蓝牙错误类
 */
export class BluetoothError extends Error {
  constructor(
    public readonly code: BluetoothErrorCode,
    message: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'BluetoothError';
  }
}

/**
 * 蓝牙错误代码枚举
 */
export enum BluetoothErrorCode {
  // 通用错误
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  INVALID_PARAMETER = 'INVALID_PARAMETER',
  OPERATION_NOT_SUPPORTED = 'OPERATION_NOT_SUPPORTED',
  OPERATION_IN_PROGRESS = 'OPERATION_IN_PROGRESS',

  // 适配器错误
  ADAPTER_NOT_AVAILABLE = 'ADAPTER_NOT_AVAILABLE',
  ADAPTER_INITIALIZATION_FAILED = 'ADAPTER_INITIALIZATION_FAILED',
  ADAPTER_ALREADY_INITIALIZED = 'ADAPTER_ALREADY_INITIALIZED',

  // 设备错误
  DEVICE_NOT_FOUND = 'DEVICE_NOT_FOUND',
  DEVICE_ALREADY_CONNECTED = 'DEVICE_ALREADY_CONNECTED',
  DEVICE_NOT_CONNECTED = 'DEVICE_NOT_CONNECTED',
  DEVICE_CONNECTION_FAILED = 'DEVICE_CONNECTION_FAILED',
  DEVICE_CONNECTION_TIMEOUT = 'DEVICE_CONNECTION_TIMEOUT',
  DEVICE_DISCONNECTED_UNEXPECTEDLY = 'DEVICE_DISCONNECTED_UNEXPECTEDLY',

  // 服务和特征值错误
  SERVICE_NOT_FOUND = 'SERVICE_NOT_FOUND',
  CHARACTERISTIC_NOT_FOUND = 'CHARACTERISTIC_NOT_FOUND',
  CHARACTERISTIC_NOT_READABLE = 'CHARACTERISTIC_NOT_READABLE',
  CHARACTERISTIC_NOT_WRITABLE = 'CHARACTERISTIC_NOT_WRITABLE',
  CHARACTERISTIC_NOT_NOTIFIABLE = 'CHARACTERISTIC_NOT_NOTIFIABLE',
  READ_FAILED = 'READ_FAILED',
  WRITE_FAILED = 'WRITE_FAILED',
  SUBSCRIBE_FAILED = 'SUBSCRIBE_FAILED',
  UNSUBSCRIBE_FAILED = 'UNSUBSCRIBE_FAILED',

  // 权限错误
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',

  // 资源错误
  INSUFFICIENT_RESOURCES = 'INSUFFICIENT_RESOURCES',
  CONNECTION_LIMIT_EXCEEDED = 'CONNECTION_LIMIT_EXCEEDED'
}
```

## 平台特定扩展

### 微信小程序扩展

```typescript
/**
 * 微信小程序适配器接口
 */
export interface IWeAppBluetoothAdapter extends IBluetoothAdapter {
  /**
   * 设置蓝牙数据缓存大小
   * @param size 缓存大小
   */
  setBLEMTU(size: number): Promise<boolean>;

  /**
   * 监听蓝牙设备的特征值变化
   * @param deviceId 设备ID
   * @param characteristicId 特征ID
   */
  notifyBLECharacteristicValueChange(
    deviceId: string,
    characteristicId: string
  ): Promise<boolean>;

  /**
   * 获取蓝牙设备所有服务
   * @param deviceId 设备ID
   */
  getBLEDeviceServices(deviceId: string): Promise<Array<{ uuid: string }>>;

  /**
   * 获取蓝牙设备某个服务中所有特征值
   * @param deviceId 设备ID
   * @param serviceId 服务ID
   */
  getBLEDeviceCharacteristics(
    deviceId: string,
    serviceId: string
  ): Promise<Array<{ uuid: string; properties: number }>>;
}
```

### Web Bluetooth扩展

```typescript
/**
 * Web蓝牙适配器接口
 */
export interface IWebBluetoothAdapter extends IBluetoothAdapter {
  /**
   * 请求设备
   * @param options 请求选项
   */
  requestDevice(options?: RequestDeviceOptions): Promise<IBluetoothDevice>;

  /**
   * 检查权限
   * @param permissions 权限列表
   */
  getPermissions?(permissions: BluetoothPermissions): Promise<BluetoothPermissions>;

  /**
   * 请求权限
   * @param permissions 权限列表
   */
  requestPermissions?(permissions: BluetoothPermissions): Promise<BluetoothPermissions>;
}

/**
 * 设备请求选项
 */
export interface RequestDeviceOptions {
  /** 过滤器 */
  filters?: BluetoothDeviceFilters[];
  /** 可选服务 */
  optionalServices?: string[];
  /** 接受所有设备 */
  acceptAllDevices?: boolean;
}

/**
 * 设备过滤器
 */
export interface BluetoothDeviceFilters {
  /** 服务名称 */
  services?: string[];
  /** 设备名称 */
  name?: string;
  /** 设备名称前缀 */
  namePrefix?: string;
  /** 制造商数据 */
  manufacturerData?: Map<number, ArrayBufferSource>;
  /** 服务数据 */
  serviceData?: Map<string, ArrayBufferSource>;
}
```

## 使用示例

### 基本使用

```typescript
// 创建适配器实例
const adapter = createBluetoothAdapter('weapp');

// 初始化适配器
await adapter.initialize({
  debug: true,
  connectionTimeout: 10000,
  autoReconnect: true
});

// 监听设备发现事件
adapter.addEventListener('deviceDiscovered', (event) => {
  console.log('发现设备:', event.device);
});

// 开始扫描
await adapter.startDiscovery({
  timeout: 30000,
  services: ['180f'], // 电池服务
  rssiThreshold: -80
});

// 连接设备
const result = await adapter.connect(deviceId, {
  timeout: 10000,
  autoDiscoverServices: true
});

if (result.success) {
  console.log('连接成功:', result.device);

  // 获取服务
  const services = await adapter.getServices(deviceId);
  console.log('设备服务:', services);
}
```

### 特征值操作

```typescript
// 读取特征值
const value = await adapter.readCharacteristic(
  deviceId,
  '180f', // 电池服务
  '2a19' // 电池电量特征
);

// 写入特征值
const data = new ArrayBuffer(1);
const view = new Uint8Array(data);
view[0] = 0x01;

await adapter.writeCharacteristic(
  deviceId,
  '1812', // HID服务
  '2a4a', // 报告特征
  data,
  { writeType: WriteType.WITHOUT_RESPONSE }
);

// 订阅通知
adapter.subscribeCharacteristic(
  deviceId,
  '1812', // HID服务
  '2a4a', // 报告特征
  (deviceId, serviceUuid, characteristicUuid, value) => {
    console.log('收到数据:', new Uint8Array(value));
  }
);
```

这个蓝牙适配器接口设计提供了：

1. **完整的类型定义**：支持所有主要蓝牙操作
2. **平台扩展性**：支持不同平台特定功能
3. **事件驱动**：完整的事件监听机制
4. **错误处理**：详细的错误分类和处理
5. **异步支持**：Promise/async-await友好

这为蓝牙功能的实现和使用提供了清晰、一致的接口规范。