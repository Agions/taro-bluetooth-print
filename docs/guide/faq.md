# 常见问题 (FAQ)

## 基础问题

### 这个库支持哪些打印机？

支持所有使用 **ESC/POS** 协议的热敏打印机，包括但不限于：
- 小票打印机
- 标签打印机（部分型号）
- 便携式蓝牙打印机

常见品牌：佳博、芯烨、商米、汉印等。

> **注意**: TSPL 协议的打印机（如部分标签打印机）需要自定义驱动。

### 是否支持非 Taro 项目？

本库是基于 Taro 开发的，依赖 `@tarojs/taro` 的蓝牙 API。

如需在其他项目中使用：
- 可以参考源码自行实现适配器
- 或使用其他专门的蓝牙打印库

### 支持哪些 Taro 版本？

建议使用 **Taro 3.x** 及以上版本。

最低requirements:
- Taro >= 3.0.0
- 小程序基础库 >= 2.9.2（微信小程序）

## 安装与配置

### 安装后报错 "Cannot find module"？

确保安装了所有依赖：

```bash
npm install taro-bluetooth-print @tarojs/taro
```

检查 `package.json`:
```json
{
  "dependencies": {
    "@tarojs/taro": "^3.6.0",
    "taro-bluetooth-print": "^2.0.0"
  }
}
```

### TypeScript 类型找不到？

确保项目的 `tsconfig.json` 包含：

```json
{
  "compilerOptions": {
    "types": ["@tarojs/taro"],
    "moduleResolution": "node",
    "esModuleInterop": true
  }
}
```

## 使用问题

### 如何获取打印机的设备 ID？

```typescript
import Taro from '@tarojs/taro';

// 1. 初始化蓝牙适配器
await Taro.openBluetoothAdapter();

// 2. 开始扫描
await Taro.startBluetoothDevicesDiscovery();

// 3. 监听发现的设备
Taro.onBluetoothDeviceFound((res) => {
  res.devices.forEach(device => {
    console.log('设备名称:', device.name);
    console.log('设备ID:', device.deviceId);
    console.log('信号强度:', device.RSSI);
  });
});

// 4. 停止扫描
setTimeout(() => {
  Taro.stopBluetoothDevicesDiscovery();
}, 5000);
```

### 可以同时连接多个打印机吗？

可以，创建多个 `BluetoothPrinter` 实例：

```typescript
const printer1 = new BluetoothPrinter();
const printer2 = new BluetoothPrinter();

await printer1.connect('device-id-1');
await printer2.connect('device-id-2');

await printer1.text('打印机1').print();
await printer2.text('打印机2').print();
```

### 打印中文时出现乱码怎么办？

1. **使用正确的编码**:
   ```typescript
   printer.text('中文', 'GBK'); // 推荐
   ```

2. **检查打印机是否支持中文**
   - 有些打印机需要下载中文字库
   - 查看打印机说明书

3. **测试不同编码**:
   ```typescript
   printer.text('测试', 'UTF-8');
   printer.text('测试', 'GBK');
   printer.text('测试', 'GB2312');
   ```

### 如何调整打印浓度/对比度？

使用 ESC/POS 原生指令：

```typescript
// 增加自定义命令方法（临时方案）
class MyPrinter extends BluetoothPrinter {
  setDensity(level: number) {
    // ESC 7 n1 n2 n3
    // level: 0-15
    const cmd = new Uint8Array([0x1B, 0x37, level, 0, 0]);
    this.buffer.push(cmd);
    return this;
  }
}

const printer = new MyPrinter();
printer.setDensity(10).text('测试').print();
```

> 建议未来版本将添加官方支持。

### 如何打印条形码？

目前库未内置条形码支持，但可以：

1. **使用二维码代替**:
   ```typescript
   printer.qr('https://example.com/product/123456');
   ```

2. **自定义驱动添加条形码**:
   ```typescript
   import { EscPos } from 'taro-bluetooth-print';
   
   class MyDriver extends EscPos {
     barcode(content: string, type: number = 73) {
       // GS k m d1...dk NUL
       const data = new TextEncoder().encode(content + '\0');
       const cmd = new Uint8Array([0x1D, 0x6B, type]);
       return [cmd, data];
     }
   }
   ```

### 断点续传有什么用？

适用场景：
1. **大量数据打印** - 可以中途暂停，避免阻塞UI
2. **可中断操作** - 用户可以取消长时间打印
3. **网络不稳定** - 暂停后可以等待网络恢复再继续

示例：
```typescript
// 打印100张小票
for (let i = 0; i < 100; i++) {
  printer.text(`小票 #${i + 1}`).feed(10);
}

// 用户可以随时暂停
button.onClick = () => printer.pause();

// 或取消
button.onClick = () => printer.cancel();
```

## 性能问题

### 打印速度太慢怎么优化？

1. **调整分片参数**:
   ```typescript
   // 默认配置（保守）
   printer.setOptions({ chunkSize: 20, delay: 20, retries: 3 });
   
   // 优化配置（网络好的情况）
   printer.setOptions({ chunkSize: 200, delay: 5, retries: 1 });
   ```

2. **减少不必要的日志**:
   ```typescript
   Logger.setLevel(LogLevel.ERROR); // 只记录错误
   ```

3. **批量操作**:
   ```typescript
   // ❌ 慢：多次调用 print()
   await printer.text('行1').print();
   await printer.text('行2').print();
   await printer.text('行3').print();
   
   // ✅ 快：一次性构建，一次打印
   await printer
     .text('行1')
     .text('行2')
     .text('行3')
     .print();
   ```

### 内存占用过高？

1. **及时断开连接**:
   ```typescript
   try {
     await printer.connect(deviceId);
     await printer.text('..').print();
   } finally {
     await printer.disconnect(); // 清理资源
   }
   ```

2. **使用完后移除监听器**:
   ```typescript
   const unsubscribe = printer.on('progress', handler);
   // 使用完后
   unsubscribe();
   ```

3. **避免打印超大图片** - 建议先压缩图片

## 高级问题

### 如何实现自定义打印机协议？

实现 `IPrinterDriver` 接口：

```typescript
import { IPrinterDriver, IQrOptions } from 'taro-bluetooth-print';

class TSPLDriver implements IPrinterDriver {
  init(): Uint8Array[] {
    // TSPL 初始化指令
    return [new TextEncoder().encode('SIZE 80 mm, 50 mm\r\n')];
  }

  text(content: string): Uint8Array[] {
    // TSPL 文本指令
    const cmd = `TEXT 10,10,"3",0,"${content}"\r\n`;
    return [new TextEncoder().encode(cmd)];
  }
  
  // 实现其他方法...
  feed(lines: number): Uint8Array[] { /*...*/ }
  cut(): Uint8Array[] { /*...*/ }
  image(data: Uint8Array, width: number, height: number): Uint8Array[] { /*...*/ }
  qr(content: string, options?: IQrOptions): Uint8Array[] { /*...*/ }
}

// 使用自定义驱动
const printer = new BluetoothPrinter(undefined, new TSPLDriver());
```

### 如何适配其他平台的蓝牙 API？

实现 `IPrinterAdapter` 接口：

```typescript
import { IPrinterAdapter, IAdapterOptions, PrinterState } from 'taro-bluetooth-print';

class WebBluetoothAdapter implements IPrinterAdapter {
  private device?: BluetoothDevice;
  private characteristic?: BluetoothRemoteGATTCharacteristic;
  
  async connect(deviceId: string): Promise<void> {
    this.device = await navigator.bluetooth.requestDevice({
      filters: [{ services: ['打印服务UUID'] }]
    });
    const server = await this.device.gatt?.connect();
    const service = await server?.getPrimaryService('服务UUID');
    this.characteristic = await service?.getCharacteristic('特征UUID');
  }

  async write(deviceId: string, buffer: ArrayBuffer, options?: IAdapterOptions): Promise<void> {
    await this.characteristic?.writeValue(buffer);
  }

  // ... 实现其他方法
}

const printer = new BluetoothPrinter(new WebBluetoothAdapter());
```

### 打印模板如何实现？

可以封装常用的打印格式：

```typescript
class PrintTemplate {
  static receipt(data: {
    title: string;
    items: Array<{ name: string; price: number; qty: number }>;
    total: number;
  }) {
    const printer = new BluetoothPrinter();
    
    // 标题
    printer.text(`======= ${data.title} =======`).feed();
    
    // 商品列表
    data.items.forEach(item => {
      const line = `${item.name} x${item.qty}    ¥${item.price.toFixed(2)}`;
      printer.text(line);
    });
    
    // 合计
    printer
      .feed()
      .text('----------------------------')
      .text(`合计：¥${data.total.toFixed(2)}`)
      .feed(2);
      
    return printer;
  }
}

// 使用模板
const printer = PrintTemplate.receipt({
  title: '购物小票',
  items: [
    { name: '商品A', price: 10, qty: 2 },
    { name: '商品B', price: 15, qty: 1 }
  ],
  total: 35
});

await printer.connect(deviceId);
await printer.print();
```

## 错误处理

### 如何捕获所有错误？

使用事件监听器：

```typescript
printer.on('error', (error) => {
  switch (error.code) {
    case ErrorCode.CONNECTION_FAILED:
      // 处理连接失败
      break;
    case ErrorCode.WRITE_FAILED:
      // 处理写入失败
      break;
    default:
      console.error('未知错误:', error);
  }
});
```

结合 try-catch：

```typescript
try {
  await printer.connect(deviceId);
  await printer.text('Test').print();
} catch (error) {
  if (error instanceof BluetoothPrintError) {
    console.error('蓝牙打印错误:', error.code, error.message);
  } else {
    console.error('其他错误:', error);
  }
}
```

## 其他

### 是否支持网络打印机？

本库仅支持**蓝牙**打印机，不支持：
- WiFi 打印机
- USB 打印机
- 云打印

### 源码在哪里？

GitHub: [https://github.com/agions/taro-bluetooth-print](https://github.com/agions/taro-bluetooth-print)

### 如何贡献代码？

查看 [CONTRIBUTING.md](https://github.com/agions/taro-bluetooth-print/blob/main/CONTRIBUTING.md)

### 商业使用需要授权吗？

本项目采用 MIT 许可证，可以免费商业使用。

---

**还有其他问题？**

- 查看 [故障排除](./troubleshooting.md)
- 查看 [API 文档](../api)
- 提交 [Issue](https://github.com/agions/taro-bluetooth-print/issues)
