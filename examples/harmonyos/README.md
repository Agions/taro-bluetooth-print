# 鸿蒙 HarmonyOS 示例

HarmonyOS 蓝牙打印服务封装示例。

## ⚠️ 重要说明

`taro-bluetooth-print` v2.15.x **未提供**开箱即用的 HarmonyOS adapter (内置 6 个 adapter: Taro / Alipay / Baidu / ByteDance / QQ / WebBluetooth)。

本文件提供:
- **HarmonyPrintService**: 完整业务流封装 (扫描/连接/打印/事件)
- **HarmonyAdapter**: 参考实现 (伪代码,展示要实现的方法),实际接入需要按 `IPrinterAdapter` 接口用 HarmonyOS BLE API 实现

## 文件结构

```
harmonyos/
└── harmony-print-service.ts   # HarmonyAdapter (伪代码) + HarmonyPrintService
```

## 前置条件

- DevEco Studio 5.0+（API 12+）
- HarmonyOS NEXT / OpenHarmony 设备（支持 BLE）
- Node.js >= 18

## 快速开始

### 1. 复制文件

将 `harmony-print-service.ts` 复制到 HarmonyOS 项目的 `src/services/` 目录。

### 2. 配置权限

在 `module.json5` 中添加蓝牙权限：

```json
{
  "module": {
    "requestPermissions": [
      {
        "name": "ohos.permission.BLUETOOTH",
        "reason": "$string:permission_bluetooth",
        "usedScene": {
          "abilities": ["EntryAbility"],
          "when": "inuse"
        }
      },
      {
        "name": "ohos.permission.BLUETOOTH_ADMIN",
        "reason": "$string:permission_bluetooth_admin",
        "usedScene": {
          "abilities": ["EntryAbility"],
          "when": "inuse"
        }
      },
      {
        "name": "ohos.permission.ACCESS_FINE_LOCATION",
        "reason": "$string:permission_location",
        "usedScene": {
          "abilities": ["EntryAbility"],
          "when": "inuse"
        }
      }
    ]
  }
}
```

### 3. 配置蓝牙特性

在 `module.json5` 中添加蓝牙特性：

```json
{
  "module": {
    "features": [
      {
        "name": "bluetooth",
        "description": "$string:feature_bluetooth",
        "type": "input"
      }
    ]
  }
}
```

### 4. 在页面中使用

```typescript
import { HarmonyPrintService } from '../services/harmony-print-service';

@Entry
@Component
struct Index {
  private printService = new HarmonyPrintService();
  private devices: bluetooth.BluetoothDevice[] = [];
  private logs: string[] = [];

  aboutToAppear() {
    this.printService.onDeviceFound((device) => {
      this.devices.push(device);
    });
    this.printService.onLog((msg) => {
      this.logs.push(msg);
    });
  }

  async onScan() {
    await this.printService.scanDevices();
  }

  async onConnect(deviceId: string) {
    await this.printService.connect(deviceId);
  }

  async onPrint() {
    await this.printService.printTestPage();
  }

  build() {
    Column() {
      Button('扫描设备').onClick(() => this.onScan())
      Button('连接').onClick(() => this.onConnect(this.devices[0]?.id))
      Button('打印').onClick(() => this.onPrint())
      List() {
        ForEach(this.devices, (device) => {
          ListItem() {
            Text(device.name)
          }
        })
      }
    }
  }
}
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

## 核心 API

### 扫描设备

```typescript
await this.printService.scanDevices({
  scanMode: bluetooth.ScanMode.LOW_POWER,
  matchMode: bluetooth.MatchMode.MATCH_AGGRESSIVELY,
});
```

### 连接设备

```typescript
await this.printService.connect(deviceId);
```

### 打印小票

```typescript
await this.printService.printReceipt({
  storeName: '示例商店',
  items: [
    { name: '商品A', price: 10, quantity: 2 },
    { name: '商品B', price: 20, quantity: 1 },
  ],
  total: 40,
});
```

### 打印标签

```typescript
await this.printService.printLabel({
  content: '商品名称',
  barcode: '6901234567890',
  qrCode: 'https://example.com',
});
```

## 常见问题

**Q: 扫描不到设备？**  
A: 确认打印机已开启 BLE 广播，设备蓝牙已打开，且已申请蓝牙权限。

**Q: 连接成功但打印失败？**  
A: 查看日志输出，可能是 MTU 太小或打印机忙。尝试调整 `chunkSize` 和 `delay` 参数。

**Q: 打印乱码？**  
A: 检查打印机编码设置，ESC/POS 打印机通常使用 GBK 编码。

## 相关链接

- [完整文档](https://agions.github.io/taro-bluetooth-print/)
- [HarmonyOS 蓝牙开发指南](https://developer.harmonyos.com/cn/develop/guides/bt)
- [返回 examples 目录](../)
