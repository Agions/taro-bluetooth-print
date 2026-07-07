# 微信小程序示例

基于 Taro 3.x + React 的完整微信小程序打印页面示例。

## 文件结构

```
weapp/
├── printer-page.tsx   # 完整打印页面（扫描 / 连接 / 打印 / 队列）
├── index.less         # 页面样式
└── pages.json         # 页面配置（需添加到项目根目录）
```

## 前置条件

- Node.js >= 18
- pnpm >= 8
- 微信开发者工具（最新稳定版）
- 已安装 `@tarojs/taro ^3.6.22`

## 快速开始

### 1. 安装依赖

```bash
pnpm add taro-bluetooth-print @tarojs/taro taro-ui
```

### 2. 添加页面配置

将 `printer-page.tsx` 复制到 Taro 项目的 `src/pages/printer/` 目录，并在 `src/app.config.ts`（或 `src/pages.json`）中添加页面路径：

```json
{
  "pages": [
    "pages/printer/index"
  ]
}
```

### 3. 配置蓝牙权限

在 `src/app.config.ts` 中配置权限：

```json
{
  "pages": [...],
  "permission": {
    "scope.bluetooth": {
      "desc": "需要使用您的蓝牙连接打印机"
    }
  }
}
```

### 4. 真机预览

微信小程序蓝牙 API 不支持开发者工具模拟器，需真机预览：

1. 点击「真机调试」或「预览」
2. 在手机上打开小程序
3. 点击「搜索打印机」扫描附近蓝牙设备
4. 选择设备后点击「连接」
5. 测试打印小票 / 标签

## 功能特性

| 功能 | 说明 |
|:---|:---|
| 蓝牙扫描 | 扫描附近 BLE 打印机设备 |
| 设备连接 | 自动重连 + 连接状态监听 |
| 小票打印 | 收据 / 小票完整示例（商品 / 合计 / 二维码） |
| 标签打印 | TSPL / ZPL 标签示例（商品标签 / 物流面单） |
| 打印队列 | 多任务排队 + 优先级调度 |
| 断点续传 | 大文件分片传输 + 断点续打 |
| 事件监听 | progress / error / state-change 全事件覆盖 |

## 核心代码说明

### 初始化打印机

```typescript
import { BluetoothPrinter, DeviceManager, PrintQueue } from 'taro-bluetooth-print';
import Taro from '@tarojs/taro';

const printer = new BluetoothPrinter({
  adapter: new TaroAdapter(),
});

const deviceManager = new DeviceManager();
const printQueue = new PrintQueue({ maxSize: 50 });
```

### 扫描设备

```typescript
const devices = await deviceManager.scanDevices({
  services: ['000018f0-0000-1000-8000-00805f9b34fb'],
  allowDuplicates: false,
});
```

### 打印小票

```typescript
await printer
  .text('=== 欢迎光临 ===', { align: 'center', bold: true })
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

## 常见问题

**Q: 真机调试时扫描不到设备？**  
A: 确认打印机已开启 BLE 广播，手机蓝牙已打开，且小程序已申请蓝牙权限。

**Q: 打印乱码？**  
A: 检查打印机编码格式，ESC/POS 默认使用 GBK，可通过 `printer.setEncoding('UTF-8')` 切换。

**Q: 连接成功但打印失败？**  
A: 查看 `printer.on('error', ...)` 的错误码，常见原因：MTU 过小、分片大小不合适、打印机忙。

## 相关链接

- [完整文档](https://agions.github.io/taro-bluetooth-print/)
- [API 参考](https://agions.github.io/taro-bluetooth-print/api/)
- [返回 examples 目录](../)
