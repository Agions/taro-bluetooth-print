# MultiPrinterManager API

多打印机管理器，支持多设备并发打印和负载均衡。

## 导入

```typescript
import { MultiPrinterManager } from 'taro-bluetooth-print';
```

## 创建实例

```typescript
const manager = new MultiPrinterManager({
  maxConcurrent: 3,      // 最大并发数
  loadBalance: 'round-robin',  // 负载均衡策略
  retryCount: 3
});
```

## 方法

### 添加打印机

#### `addPrinter(id: string, printer: BluetoothPrinter): void`

添加打印机到管理器。

```typescript
manager.addPrinter('printer-1', printer1);
manager.addPrinter('printer-2', printer2);
```

#### `removePrinter(id: string): void`

移除打印机。

```typescript
manager.removePrinter('printer-1');
```

### 打印操作

#### `print(data: Uint8Array, options?: PrintOptions): Promise<PrintResult>`

使用负载均衡选择打印机执行打印。

```typescript
const result = await manager.print(printData);
console.log(`使用打印机: ${result.printerId}`);
```

#### `printTo(printerId: string, data: Uint8Array): Promise<void>`

指定打印机执行打印。

```typescript
await manager.printTo('printer-1', printData);
```

### 状态查询

#### `getPrinters(): PrinterInfo[]`

获取所有打印机信息。

```typescript
const printers = manager.getPrinters();
printers.forEach(p => {
  console.log(`${p.id}: ${p.status}`);
});
```

#### `getStatus(id: string): PrinterStatus`

获取指定打印机状态。

```typescript
const status = manager.getStatus('printer-1');
// 'idle' | 'printing' | 'error' | 'offline'
```

## 事件

```typescript
manager.on('printer-added', (id) => {
  console.log('打印机添加:', id);
});

manager.on('printer-removed', (id) => {
  console.log('打印机移除:', id);
});

manager.on('printer-error', (id, error) => {
  console.error('打印机错误:', id, error);
});
```

## 负载均衡策略

| 策略 | 说明 |
|------|------|
| `round-robin` | 轮询，依次选择 |
| `least-loaded` | 选择负载最低的 |
| `random` | 随机选择 |
