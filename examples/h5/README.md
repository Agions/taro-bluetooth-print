# H5 Web Bluetooth 示例

基于 Web Bluetooth API 的纯前端打印示例，无需任何后端服务。

## 文件结构

```
h5/
└── index.html          # 单文件完整示例（HTML + CSS + JS）
```

## 前置条件

- Chrome 56+ / Edge 79+（Web Bluetooth 仅支持 Chromium 内核）
- 本地服务器（`file://` 协议不支持 Web Bluetooth）
- HTTPS 或 `localhost`
- 蓝牙 4.0+ 适配器

## 快速开始

### 方式 1: 使用内置开发服务器

```bash
# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev

# 浏览器打开 http://localhost:3000
```

### 方式 2: 使用任意静态服务器

```bash
# 构建库
pnpm build

# 使用 serve 启动
npx serve examples/h5

# 或使用 Python
python3 -m http.server 8080 --directory examples/h5
```

### 方式 3: 部署到任意 HTTPS 站点

```bash
# 将 examples/h5/ 目录部署到任意 HTTPS 服务器即可
# 无需构建步骤，单文件即开即用
```

## 功能特性

| 功能 | 说明 |
|:---|:---|
| 设备扫描 | 扫描附近 BLE 打印机 |
| 自动连接 | 记住上次设备 ID，下次自动重连 |
| 小票打印 | 完整收据示例（商品 / 合计 / 二维码） |
| 标签打印 | ZPL / TSPL 标签打印示例 |
| 打印队列 | 多任务排队 + 进度条 |
| 断点续传 | 大文件分片 + 自动重试 |
| 事件系统 | progress / error / complete 全事件 |

## 核心代码说明

### 初始化

```typescript
import { createBluetoothPrinter, WebBluetoothAdapter } from 'taro-bluetooth-print';

const printer = createBluetoothPrinter({
  adapter: new WebBluetoothAdapter({
    optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb'],
  }),
});
```

### 扫描并连接

```typescript
const device = await navigator.bluetooth.requestDevice({
  filters: [{ services: ['000018f0-0000-1000-8000-00805f9b34fb'] }],
});
await printer.connect(device.id);
```

### 打印小票

```typescript
await printer
  .text('=== 欢迎光临 ===', { align: 'center', bold: true, fontSize: 24 })
  .feed()
  .text('商品A     x1    ¥10.00')
  .text('商品B     x2    ¥20.00')
  .feed()
  .text('------------------------')
  .text('合计：            ¥30.00', { bold: true })
  .feed(2)
  .qr('https://example.com', { size: 6 })
  .feed(2)
  .cut()
  .print();
```

### 监听事件

```typescript
printer.on('progress', ({ sent, total }) => {
  const percent = ((sent / total) * 100).toFixed(1);
  updateProgressBar(percent);
});
printer.on('print-complete', () => showToast('打印完成'));
printer.on('error', (err) => console.error('打印错误:', err.code, err.message));
```

## 浏览器兼容性

| 浏览器 | 支持情况 | 备注 |
|:---|:---|:---|
| Chrome 56+ | ✅ | 桌面 + Android 全支持 |
| Edge 79+ | ✅ | 基于 Chromium，完全支持 |
| Opera | ✅ | 基于 Chromium，完全支持 |
| Safari | ❌ | 不支持 Web Bluetooth |
| Firefox | ❌ | 不支持 Web Bluetooth |
| iOS Chrome | ❌ | iOS WebKit 限制 |

## 常见问题

**Q: 点击「选择打印机」没有反应？**  
A: 确认使用 HTTPS 或 localhost，且浏览器支持 Web Bluetooth。

**Q: 扫描不到设备？**  
A: 确认打印机已开启 BLE 广播，手机/电脑蓝牙已打开，且浏览器已授权蓝牙权限。

**Q: 打印内容乱码？**  
A: 检查打印机编码设置，ESC/POS 打印机通常使用 GBK 编码。

**Q: 连接成功但打印失败？**  
A: 查看控制台错误信息，可能是 MTU 太小或打印机忙。尝试调整 `chunkSize` 和 `delay` 参数。

## 相关链接

- [完整文档](https://agions.github.io/taro-bluetooth-print/)
- [Web Bluetooth API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Bluetooth_API)
- [返回 examples 目录](../)
