# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [2.10.1] - 2026-05-01

### Fixed

- **npm publish 版本冲突** — `v2.10.0` 因旧 tag 提前发布导致新内容无法覆盖。bump 至 `2.10.1` 重新发布。

---

## [2.10.0] - 2026-05-01

### Added

- **`ChunkWriteStrategy` 自适应分块写入抽象基类** (#R4)
  - Template Method 模式：将 MiniProgramAdapter 与 ReactNativeAdapter 共用的自适应分块写入逻辑提取到统一基类
  - 子类仅需实现 `writeSingleChunk()` 平台特定的单块写入操作
  - 公共框架包括：自适应分块大小调整、指数退避重试、连接状态周期性检查、单块超时、分块间 BLE 拥塞控制延迟
  - `MiniProgramWriteStrategy` — 封装 Taro/微信/支付宝/百度/字节/QQ 小程序 BLE API
  - `ReactNativeWriteStrategy` — 封装 react-native-ble-plx，含 withResponse/withoutResponse 降级回退

- **`withTimeout()` 工具函数集成** (#R5)
  - 提取 Promise race + setTimeout 重复模式到 `src/utils/withTimeout.ts`
  - 已集成至 `BaseAdapter.connect()`、`ReactNativeAdapter.connect()`、`ConnectionManager.connect()`、`PrinterStatus.queryStatus()`
  - 减少约 40 行重复的手动 timer 管理代码，消除遗漏 clearTimeout 的风险

### Changed

- **适配器代码重构**
  - `MiniProgramBLEApi.writeBLECharacteristicValue` 参数类型从 `ArrayBuffer` 扩展为 `ArrayBuffer | ArrayBufferLike`，消除 `chunk.buffer` 的类型兼容性 warning
  - `ReactNativeAdapter.arrayBufferToBase64` 同理扩展参数类型
  - `ChunkWriteStrategy.logger` 类型修正为 `ReturnType<typeof Logger.scope>`，修复 Logger 实例类型不匹配

### Fixed

- **`ChunkWriteStrategy.ts` 缺少 Logger 导入** — 导致 5 个适配器测试失败（TaroAdapter、AlipayAdapter、BaiduAdapter、ByteDanceAdapter、QQAdapter）
- **`chunk.buffer` 类型兼容性** — `Uint8Array.buffer` 返回 `ArrayBufferLike`，原 `ArrayBuffer` 参数类型导致 TypeScript 编译错误

### Security

- `withTimeout()` 统一使用 try/finally 模式的 timer 清理，消除所有手动 `Promise.race` + `setTimeout` 模式中遗漏 `clearTimeout` 的风险

---

## [2.9.6] - 2026-04-30

### Added

- **`ZplDriver.image()` — ZPL 图像编码实现** (#1)
  - 使用 ZPL `^GFA` (Graphic Field) 命令编码 1-bit 黑白位图
  - 支持 x/y 定位、字节校验、十六进制数据编码
  - 适用于 Zebra ZD420、GT800、ZM400 等标签打印机
  - [之前为 TODO 占位方法]

- **`CpclDriver.downloadLogo()` — CPCL Logo 下载实现** (#2)
  - 使用 CPCL `CG` (Compressed Graphic) 命令编码 1-bit 位图
  - 宏定义存储 (`! DF`)，位图大小自动推断（可选传参）
  - 向后兼容：签名保持 `(logoName, bitmap, options?)`
  - 适用于 HP IR3222、霍尼韦尔等移动打印机
  - [之前为 TODO 占位方法]

- **单元测试覆盖**
  - ZPL 图像编码：链式调用验证 (`^FO` / `^GFA` / `^FS` 命令输出断言)
  - ZPL 空 bitmap 边界处理

### Fixed

- **`ConnectionManager` 连接超时 Timer 泄漏** (#3)
  - `connect()` 中 `setTimeout` 创建的连接超时 timer 在成功连接后未清理
  - 修复：保存 timeoutId 引用，`Promise.race` 成功后显式 `clearTimeout()`

- **`PrinterStatus` 状态查询超时 Timer 泄漏** (#4)
  - `queryStatus()` 中超时 timer 在正常返回后仍驻留至超时触发
  - 修复：使用相同 timer 清理模式

- **`PrintQueue` 重试定时器泄漏** (#5)
  - 任务重试 `setTimeout` 未保存引用，`clear()` 时无法清理
  - 修复：新增 `retryTimerId` 成员，`clear()` 时自动取消待执行的重试

### Changed

- **README 文档更新**
  - 「高级打印」新增 ZPL 图像编码、CPCL Logo 下载条目
  - 「打印机驱动」新增功能状态列，明确标注各驱动支持程度
  - 「性能指标」测试用例数更新为 879（95.7% 通过率）

### Security

- 消除了所有已识别的 `setTimeout` 泄漏风险点（共 3 处）
- 资源清理路径审计通过：`disconnect` / `destroy` / `clear` 均能正确清理关联定时器

---

## [2.9.5] - 初始发布

初始发布版本，包含完整的跨平台蓝牙打印功能支持。

### 核心能力

- 7 大平台适配器：微信 / 支付宝 / 百度 / 字节跳动 / QQ 小程序 + H5 + React Native
- 8 种打印机驱动：ESC/POS、TSPL、ZPL、CPCL、STAR、佳博、芯烨、思普瑞特
- 完整打印生命周期：扫描 → 连接 → 打印 → 断开
- 丰富的打印特性：图片（Floyd-Steinberg 抖动）、QR/条码（10+ 格式）、模板引擎
- 运维体系：离线缓存、打印队列、多设备管理、历史统计、定时重试、插件系统