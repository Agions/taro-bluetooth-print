---
page: true
title: 迁移指南
description: 从旧版本与旧构建到现代架构（Vite / webpack）与 v1.0.8 的迁移指南
---

# 迁移指南

本指南帮助你从旧版本与旧构建体系迁移到最新的 `taro-bluetooth-print` 与文档站结构。侧边栏已在 [docs/.vitepress/config.ts](docs/.vitepress/config.ts) 中注册本页链接。

- 构建系统：从 Rollup 迁移到 Vite + webpack 双构建
- 文档系统：采用 VitePress，支持 PWA、离线访问
- 库版本：v1.0.8 强化类型与错误处理、跨平台适配器与参数校验

参考更新日志 [reference/changelog](/reference/changelog) 与 API 文档 [API](/api/) 获取完整变更细节。

## 适用范围

- 旧版本库：1.0.4、1.0.5、1.0.6 等
- 旧构建：Rollup 或自定义 bundler
- 旧接入：不同平台（微信小程序 / H5 / RN / Harmony）

## 迁移目标

1. 升级到最新库版本并验证兼容性
2. 采用现代构建工具配置（优先 Vite）
3. 明确平台适配器使用与差异
4. 修复历史不一致与类型问题
5. 完成打印功能的可靠性与性能优化校验

## 版本兼容与破坏性变更

v1.0.8 的核心目标是“修复与增强”，非破坏性为主：

- 类型与接口修复，避免不存在方法/属性的调用（如历史 `getRSSI`、`deviceClass`）
- 参数校验与空值检测增强，提升稳定性
- 适配器统一接口，跨平台一致性更好

升级后如遇编译报错，通常是历史调用了不存在的属性/方法，按下述对照表修正即可。

## 快速升级步骤

1. 升级依赖

   ```bash
   npm install taro-bluetooth-print@latest
   ```

2. 推荐切换构建工具到 Vite（如项目允许）

   ```bash
   npm install vite --save-dev
   ```

3. 按平台检查权限与入口初始化：

   - 微信小程序：蓝牙权限与域名白名单
   - H5：HTTPS 与 Web Bluetooth 支持
   - RN：蓝牙权限（Android 12+ 需额外动态权限）
   - Harmony：服务与特征值适配

4. 按 API 文档核对接口调用是否规范：
   - 统一使用 `printer.bluetooth.init()/connect()/writeData()/...`
   - 统一收据与模板打印入口 `printer.printer.printReceipt()/printWithTemplate()`

## 构建工具迁移

### 从 Rollup 到 Vite / webpack

- Vite 提供最快的开发体验与现代特性，优先推荐
- 保留 webpack 以兼容企业级构建或特定插件生态

基本 Vite 项目结构与配置可参考官方模板；如需 dual-build，可在 CI 中分别执行 `vite build` 与 `webpack --config webpack.config.js`。

### 常见构建问题

- Tree-shaking 异常：请使用具名导入并避免深层相对路径导入
- 类型提示缺失：确保 `tsconfig.json` 中 `types` 与 `lib` 配置包含 DOM / ESNext
- PWA：仅文档站需，业务项目可选

## 导入路径与 Tree-shaking

建议使用具名导出进行按需加载，减少包体积与提升可读性：

```typescript
import { BluetoothPrinter } from "taro-bluetooth-print"

// 创建实例
const printer = new BluetoothPrinter()
```

避免使用深层内置路径（例如 `taro-bluetooth-print/dist/...`）进行直接命令级访问，除非你在实现自定义模板或工具链扩展，且明确依赖变更风险。

## 平台适配器变更与注意事项

库内部提供平台适配器，并统一暴露蓝牙与打印接口。通常你直接通过 `BluetoothPrinter` 即可使用，无需手动选择适配器；如需平台专用特性，可查看对应适配器文件。

- 微信小程序（Weapp）
  - 需在 `app.json` / 项目配置中开启蓝牙权限与域名白名单
  - 图片使用 `wxfile://` 或网络地址（受域名限制）
- H5（Web Bluetooth）
  - 需 HTTPS 环境与浏览器支持（桌面 Chrome 优先）
  - 移动端支持有限，需降级策略（如提示用户使用支持的浏览器）
- React Native（RN）
  - 需第三方蓝牙库支持（Android 12+ 注意 BLUETOOTH_CONNECT 等权限）
  - 初始化时机与状态监听需绑定到 App 生命周期
- Harmony
  - 服务与特征值可能与 BLE 规范存在差异，按设备规约调试
  - 建议先通过服务/特征值发现流程定位可写通道

## API 调用迁移对照

以下对照表用于从历史代码迁移到规范接口：

- 设备发现与连接
  - 旧：自实现/不完整的发现流程
  - 新：`bluetooth.startDiscovery(options) -> onDeviceFound -> connect(deviceId)`
- 服务与特征值
  - 旧：直接假设固定 UUID，易失败
  - 新：`getServices(deviceId) -> getCharacteristics(deviceId, serviceId)` 动态发现
- 读写数据

  - 旧：自行拼装 GATT 通道写入
  - 新：优先使用 `bluetooth.writeData(arrayBuffer)` 由库自动选择可写服务/特征

- 收据打印
  - 旧：手写 ESC/POS 指令与布局
  - 新：`printer.printReceipt(options)` 或模板 `printer.printWithTemplate('receipt', data)`

如旧代码引用了不存在的方法（如历史文档中误述的 `getRSSI` 等），请改为使用设备对象的已存在属性（如 `RSSI?`）或更新的事件机制获取。

## 示例迁移：基础打印

旧版（可能使用默认导出与深层路径）：

```typescript
// 不推荐的旧方式（示例）
import TaroBluePrint from "taro-bluetooth-print/dist/index"

// 手动写入命令
await TaroBluePrint.bluetooth.write(/* ... */)
```

新版（具名导入与规范 API）：

```typescript
import { BluetoothPrinter } from "taro-bluetooth-print"

const printer = new BluetoothPrinter()

await printer.bluetooth.init()
await printer.bluetooth.startDiscovery()
const devices = await printer.bluetooth.getDiscoveredDevices()
const connected = await printer.bluetooth.connect(devices[0].deviceId)

if (connected) {
  // 文本
  await printer.printer.printText("Hello, World!", {
    align: "center",
    bold: true,
  })
  // 走纸与切纸
  await printer.printer.feed(2)
  await printer.printer.cut("partial")
}
```

## 示例迁移：收据打印

旧版（手动布局与命令）：

```typescript
// 手写 ESC/POS 表格排版
// ... 复杂、易错、适配器差异大
```

新版（使用内置 API 与模板）：

```typescript
import { BluetoothPrinter } from "taro-bluetooth-print"
const printer = new BluetoothPrinter()

await printer.bluetooth.init()
await printer.bluetooth.connect("XX:XX:XX:XX:XX:XX")
await printer.printer.init()
await printer.printer.setCharacterSet("CHINA")

await printer.printer.printReceipt({
  title: "消费小票",
  merchant: "示例商店",
  items: [
    { name: "商品A", price: 12.5, quantity: 2 },
    { name: "商品B", price: 8.0, quantity: 1 },
  ],
  total: 33.0,
  date: "2025-10-16 14:20:10",
  footer: "感谢惠顾",
})
```

或使用模板：

```typescript
await printer.printer.printWithTemplate("receipt", {
  title: "消费小票",
  merchant: "示例商店",
  items: [
    { name: "商品1", price: 10.5, quantity: 2 },
    { name: "商品2", price: 5.0, quantity: 1 },
  ],
  total: 26.0,
  date: "2025-09-28 15:30:45",
  footer: "感谢您的惠顾",
})
```

## 常见问题与修复

- 编译时类型错误：
  - 检查是否调用了不存在的接口
  - 参考 [API 文档](/api/) 中的类型定义更新
- 蓝牙连接失败：
  - 确保先 `bluetooth.init()`，再 `startDiscovery()` 与 `connect()`
  - 检查平台权限与 HTTPS（H5）
- 图片打印失败或质量差：
  - 使用 `printImage(image, { maxWidth, dithering })`
  - 参考图片打印指南 [guide/image-printing](/guide/image-printing)
- 收据换行/对齐问题：
  - 使用模板或固定宽度文本格式化
  - 参考收据示例 [examples/receipt-print](/examples/receipt-print)

## 可靠性与性能建议

- 任务队列：批量打印建议串行队列，避免缓冲乱序
- 退避重试：写入失败时指数退避与最多 1-2 次重试
- 分批走纸：适当 `feed()` 降低热堆积与粘连
- 预处理图片：在打印队列外并发处理，队列内串行写入
- 监控与日志：为连接与写入添加 `onConnectionStateChange` 与记录日志

参考批量打印示例 [examples/batch-print](/examples/batch-print)。

## 验证清单

- 构建：
  - 开发模式与生产构建均通过（Vite/webpack）
  - Tree-shaking 生效（按需导入）
- 功能：
  - 发现/连接/断开流程稳定
  - 文本/图片/条码/二维码/收据/模板打印均正常
- 跨平台：
  - Weapp/H5/RN/Harmony 对应权限与适配器均验证
- 可靠性：
  - 批量任务队列稳定，失败重试与日志有效

## 参考链接

- 更新日志：[reference/changelog](/reference/changelog)
- 快速上手：[guide/getting-started](/guide/getting-started)
- API 文档：[API](/api/)
- 示例：
  - 基础打印：[examples/basic-print](/examples/basic-print)
  - 图片打印：[examples/image-print](/examples/image-print)
  - 收据打印：[examples/receipt-print](/examples/receipt-print)
  - 批量打印：[examples/batch-print](/examples/batch-print)

---

如需进一步定制模板或优化构建，请查看项目源代码与适配器实现，例如 [docs/.vitepress/config.ts](docs/.vitepress/config.ts) 与源码中的打印模板与适配器目录。
