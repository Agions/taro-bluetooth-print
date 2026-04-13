# PrinterConfigManager API

打印机配置管理器，负责保存和管理已配对设备、默认打印参数和用户偏好设置。支持 localStorage 和自定义存储后端。

## 导入

```typescript
import { PrinterConfigManager, printerConfigManager } from 'taro-bluetooth-print';

// 推荐：使用单例实例
const configManager = printerConfigManager;

// 或创建新实例
const configManager = new PrinterConfigManager();
```

## 创建实例

```typescript
// 使用默认 LocalStorage
const configManager = new PrinterConfigManager();

// 使用自定义存储后端
const customStorage = new LocalStorage('my_app_');
const configManager = new PrinterConfigManager(customStorage);
```

## 方法

### 打印机配置

#### `savePrinter(printer: SavedPrinter): string`

保存或更新打印机配置。如果 `isDefault` 为 `true`，会自动取消其他打印机的默认状态。

```typescript
const printerId = configManager.savePrinter({
  id: 'printer-kitchen',
  deviceId: 'XX:XX:XX:XX:XX:XX',
  name: 'Kitchen Printer',
  model: 'XP-58',
  isDefault: true,
  printConfig: {
    encoding: 'GBK',
    chunkSize: 20,
    chunkDelay: 20,
    retries: 3
  },
  autoReconnect: true
});
```

#### `getPrinter(id: string): SavedPrinter | undefined`

根据 ID 获取打印机配置。

```typescript
const printer = configManager.getPrinter('printer-kitchen');
if (printer) {
  console.log(printer.name, printer.deviceId);
}
```

#### `getSavedPrinters(): SavedPrinter[]`

获取所有已保存的打印机列表。

```typescript
const printers = configManager.getSavedPrinters();
printers.forEach(p => {
  console.log(`${p.name} (${p.isDefault ? '默认' : ''})`);
});
```

#### `getDefaultPrinter(): SavedPrinter | undefined`

获取默认打印机。如果不存在默认打印机，回退到上次使用的打印机。

```typescript
const defaultPrinter = configManager.getDefaultPrinter();
if (defaultPrinter) {
  console.log('默认打印机:', defaultPrinter.name);
}
```

#### `removePrinter(id: string): boolean`

删除已保存的打印机配置。

```typescript
const deleted = configManager.removePrinter('printer-old');
if (deleted) {
  console.log('已删除');
}
```

#### `setDefaultPrinter(id: string): void`

设置指定打印机为默认打印机。

```typescript
configManager.setDefaultPrinter('printer-kitchen');
```

#### `setLastUsed(id: string): void`

更新上次使用的打印机，同时更新 `lastConnected` 时间戳。

```typescript
configManager.setLastUsed('printer-kitchen');
```

#### `getLastUsedId(): string | null`

获取上次使用的打印机 ID。

```typescript
const lastId = configManager.getLastUsedId();
```

#### `loadPrinterConfig(printerId: string): PrintConfig`

加载打印配置，合并全局默认设置和打印机特定设置。

```typescript
const printConfig = configManager.loadPrinterConfig('printer-kitchen');
console.log(printConfig.encoding);  // 'GBK' 或全局默认值
console.log(printConfig.chunkSize); // 20 或全局默认值
```

### 全局配置

#### `getGlobalConfig(): GlobalConfig`

获取全局配置副本。

```typescript
const globalConfig = configManager.getGlobalConfig();
console.log(globalConfig.defaultEncoding);
console.log(globalConfig.scanTimeout);
```

#### `updateGlobalConfig(updates: Partial<GlobalConfig>): void`

更新全局配置。

```typescript
configManager.updateGlobalConfig({
  defaultEncoding: 'UTF-8',
  defaultChunkSize: 30,
  scanTimeout: 20000,
  enableLogging: false
});
```

#### `resetGlobalConfig(): void`

重置全局配置为默认值。

```typescript
configManager.resetGlobalConfig();
```

### 导入导出

#### `export(): string`

导出所有配置为 JSON 字符串。

```typescript
const json = configManager.export();
// 可保存到文件或发送到服务器
```

#### `import(json: string, merge?: boolean): number`

从 JSON 字符串导入配置。

```typescript
// 替换现有配置
const count = configManager.import(jsonString, false);

// 合并到现有配置
const count = configManager.import(jsonString, true);
```

### 清除操作

#### `clear(): void`

清除所有配置数据。

```typescript
configManager.clear();
```

### 统计信息

#### `getStats(): { printerCount: number; hasDefault: boolean; lastUsed: string | null }`

获取配置统计信息。

```typescript
const stats = configManager.getStats();
console.log(`打印机数量: ${stats.printerCount}`);
console.log(`有默认打印机: ${stats.hasDefault}`);
console.log(`上次使用: ${stats.lastUsed}`);
```

## 存储后端

### LocalStorage

浏览器环境默认存储后端。

```typescript
const storage = new LocalStorage('taro_bt_print_');

// 读取
const value = storage.get('key', 'default');

// 写入
storage.set('key', { foo: 'bar' });

// 删除
storage.remove('key');

// 清除所有带前缀的键
storage.clear();
```

## 类型定义

### SavedPrinter

```typescript
interface SavedPrinter {
  id: string;                    // 唯一打印机 ID
  deviceId: string;              // 蓝牙设备 ID
  name: string;                 // 友好名称
  model?: string;               // 打印机型号
  isDefault?: boolean;          // 是否默认打印机
  printConfig?: PrintConfig;    // 打印配置
  autoReconnect?: boolean;      // 断开后自动重连
  lastConnected?: number;       // 上次连接时间戳
  createdAt: number;            // 创建时间戳
  updatedAt: number;             // 更新时间戳
}
```

### PrintConfig

```typescript
interface PrintConfig {
  encoding?: string;    // 编码格式，默认 'GBK'
  chunkSize?: number;    // 分片大小
  chunkDelay?: number;   // 分片间隔 ms
  retries?: number;     // 重试次数
}
```

### GlobalConfig

```typescript
interface GlobalConfig {
  defaultEncoding: string;       // 默认编码，默认 'GBK'
  defaultChunkSize: number;      // 默认分片大小，默认 20
  defaultChunkDelay: number;     // 默认分片间隔 ms，默认 20
  defaultRetries: number;        // 默认重试次数，默认 3
  defaultAutoReconnect: boolean; // 默认自动重连，默认 true
  scanTimeout: number;           // 扫描超时 ms，默认 15000
  enableLogging: boolean;        // 启用日志，默认 true
}
```

### IConfigStorage

```typescript
interface IConfigStorage {
  get<T>(key: string, defaultValue: T): T;
  set<T>(key: string, value: T): void;
  remove(key: string): void;
  clear(): void;
}
```

## 完整示例

```typescript
import { PrinterConfigManager } from 'taro-bluetooth-print';

// 初始化配置管理器
const configManager = new PrinterConfigManager();

// 保存第一台打印机（设为默认）
configManager.savePrinter({
  id: 'printer-counter',
  deviceId: 'AA:BB:CC:DD:EE:01',
  name: 'Counter Printer',
  model: 'XP-58II',
  isDefault: true,
  printConfig: {
    encoding: 'GBK',
    chunkSize: 20,
    retries: 3
  }
});

// 保存第二台打印机
configManager.savePrinter({
  id: 'printer-kitchen',
  deviceId: 'AA:BB:CC:DD:EE:02',
  name: 'Kitchen Printer',
  model: 'XP-80C',
  printConfig: {
    encoding: 'GBK',
    chunkSize: 30,
    retries: 5
  },
  autoReconnect: true
});

// 更新全局默认值
configManager.updateGlobalConfig({
  defaultEncoding: 'GBK',
  defaultChunkSize: 25,
  scanTimeout: 15000
});

// 获取默认打印机
const defaultPrinter = configManager.getDefaultPrinter();
if (defaultPrinter) {
  console.log('默认打印机:', defaultPrinter.name);

  // 加载该打印机的完整配置
  const printConfig = configManager.loadPrinterConfig(defaultPrinter.id);
  console.log('编码:', printConfig.encoding);
  console.log('分片大小:', printConfig.chunkSize);
}

// 切换默认打印机
configManager.setDefaultPrinter('printer-kitchen');

// 记录使用
configManager.setLastUsed('printer-kitchen');

// 导出配置备份
const backup = configManager.export();
localStorage.setItem('printer-config-backup', backup);

// 恢复配置
const restored = localStorage.getItem('printer-config-backup');
if (restored) {
  configManager.import(restored, false);
}

// 查看统计
const stats = configManager.getStats();
console.log(`共 ${stats.printerCount} 台打印机`);
```
