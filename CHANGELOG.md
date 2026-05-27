# Changelog

## [2.13.0] - 2026-05-27

### Changed

- **架构精简**: 移除过度工程的 DI 容器系统（Container、Tokens、ServiceProvider、di-factory），约 1,048 行冗余代码
- **事件系统统一**: 移除冗余的 EventBus，统一使用类型安全的 EventEmitter
- **插件系统统一**: 移除冗余的 core/plugin PluginManager，保留 plugins/PluginManager
- **代码重复消除**: 重复率从 0.57% 降至 0%（8 个克隆 → 0 个）
  - TemplateRenderer 提取 `buildTableSeparatorLine` 和 `renderFillLines` 辅助方法
  - CpclDriver/ZplDriver 提取 `barcode-helpers.ts` mixin 模式
  - BaseAdapter 统一重导出共享依赖，消除 ReactNativeAdapter 重复导入
  - PreviewRenderer 合并 handleESC/handleGS 为 `handleControlSequence`
  - gbk-lite.ts 数据去重（582 → 106 条目，减少 81.8%）
- **类型安全提升**: 类型断言从 124 处降至 73 处
  - EventEmitter 内部存储改用映射类型，消除 10+ 类型断言
  - 消除所有 `as` 类型转换中的不必要断言
- **错误处理改进**: 修复 6 处空 catch 块，所有异常均记录日志
  - CloudPrintManager、QRCodeDiscoveryService、PrinterStatus、PrintScheduler
- **魔法数字提取**: 8 个硬编码数字提取为命名常量
  - `DEFAULT_HEARTBEAT_INTERVAL`、`DEFAULT_RECONNECT_INTERVAL`、`DEFAULT_CONNECTION_TIMEOUT`
  - `DEFAULT_RETRY_BASE_DELAY`、`DEFAULT_RETRY_MAX_DELAY`、`MAX_TIMEOUT_MS`
- **工厂模式简化**: 移除 `PrinterFactory` 对象包装，保留 `createBluetoothPrinter` 和 `createWebBluetoothPrinter` 函数

### Removed

- 删除 `src/core/di/` 目录（Container.ts、Tokens.ts、index.ts）
- 删除 `src/core/event/` 目录（EventBus.ts、index.ts）
- 删除 `src/core/plugin/` 目录（PluginManager.ts、index.ts）
- 删除 `src/providers/` 目录（ServiceProvider.ts、index.ts）
- 删除 `src/factory/di-factory.ts`
- 删除 5 个对应的测试文件
- 删除根目录多余报告文档（ARCHITECTURE_ANALYSIS.md、CODE_DUPLICATION_REPORT.md、RELEASE_v2.9.6.md）

### Added

- 新增 `src/drivers/barcode-helpers.ts` — 条码便捷方法 mixin
- BaseAdapter 新增共享依赖重导出

### Testing

- 1,102 tests passed, 38 skipped, 0 regressions
- type-check: 0 errors
- build: 通过
- 代码重复率: 0%（jscpd 检测）

### Performance

- 源代码: 25,828 行 → 24,687 行（-1,141 行，-4.4%）
- 源文件: 96 个 → 84 个（-12 个）
- 构建产物: 631 KB（gzip 231 KB）

---

## [2.12.0] - 2026-05-25

### Changed

- **代码质量优化**: 全面消除 ESLint 错误和警告
- **测试覆盖率提升**: 从 64% 提升至 80.87%
- **Bug 修复**: sendAudioData 无限循环（catch 块缺少 break）

### Testing

- 434 tests passed
- coverage: 80.87%

---

## [2.11.0] - 2026-05-04

### Changed

- **错误体系统一**: 将 14 处 `throw new Error()` 迁移为 `BluetoothPrintError` + `ErrorCode`，覆盖 ReactNativeAdapter、DeviceManager、PrinterConfigManager、PrinterFactory、PreviewRenderer、PrintQueue、CloudPrintManager、PrintJobManager、PrintScheduler、image.ts
- **DiscoveryService.ts**: 移除顶部 3 条 eslint-disable 规则，清理注释代码
- **TemplateRenderer.ts**: `itemData: any` → `Record<string, unknown>`，移除 3 处行内 eslint-disable
- **outputLimiter.ts**: batchProcess 错误处理规范化（instanceof Error 守卫 + message 输出）
- **魔数提取**: ChunkWriteStrategy 提取 7 个常量（CHUNK_SIZE_STEP、DELAY_BACKOFF_FACTOR 等），PrintHistory 提取 DEFAULT_MAX_ENTRIES，TemplateRenderer/TemplateEngine 提取 DEFAULT_PAPER_WIDTH

### Added

- 新增 ErrorCode: `QUEUE_FULL`、`QUEUE_JOB_NOT_FOUND`、`PREVIEW_FAILED`

### Testing

- 985 tests passed, 38 skipped, 0 regressions
- type-check: 0 errors
- lint: 0 errors

---

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [2.10.2] - 2026-05-02

### Fixed

- **代码质量优化 — 消除所有 ESLint 错误** (#37 → 0)
  - 移除 3 个文件顶部 `eslint-disable`（共 18 条规则绕过）
  - 修复所有非空断言 (`!`) — `Uint8Array[i]!`、`parts[x]!`、`job.nextRunTime!` 等
  - 修复所有 `any` 类型绕过 — `as string` 改为 `typeof` 运行时检查
  - JSON.parse 结果改用 `as Record<string, unknown>` + 类型守卫访问
  - 异步方法 `void` → `await`，消除 `require-await` 错误
  - `Record<string, any>` → `Record<string, unknown>`
  - 消除 `no-base-to-string`：`String(value)` → `JSON.stringify(value)`
  - 消除 `no-unused-vars`：废弃变量改为 `void timeout`
- **零 ESLint 警告/错误、零非空断言、零行内 eslint-disable 残留**

---
