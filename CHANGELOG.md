# Changelog

## [2.18.0] - 2026-10-27

### Added

- **设备管理与底层传输解耦 (`DeviceManager`)** — 彻底移除 `DeviceManager` 对 `@tarojs/taro` 的硬导入依赖，支持依赖注入 `IPrinterAdapter` 与 `IStorageAdapter`，在 Web Bluetooth、React Native、SSR/Node.js 等无 Taro 容器环境下纯净运行。
- **设备发现标准契约 (`IPrinterAdapter.startDiscovery`)** — 在适配器接口规范化 `startDiscovery?` 与 `stopDiscovery?` 发现钩子，打通全平台蓝牙扫描规范。
- **定时调度跨端持久化 (`PrintScheduler`)** — 移除直接依赖 `window.localStorage` 的假定，接入 `IStorageAdapter` 与 `createUniversalStorage`，在微信、支付宝、字节跳动等小程序环境中无缝支持任务防丢持久化。
- **STAR 驱动契约标准化 (`StarDriver`)** — 新增标准化命名的 `StarDriver`，并原生实现 `IProtocolDriver`（支持 `getBuffer()` 与 `clear()`），与 `BluetoothPrinter.useDriver()` 契约深度对齐；保留 `StarPrinter` 兼容别名。

### Changed

- **传输层单点精准切片 (`PrintJobManager`)** — 移除作业管理器内部 512B 人工盲切循环，完整打印字节流直接提交至 `adapter.write()`，由底层 `ChunkWriteStrategy` 依据硬件协商 MTU 精确分包并通过 `onProgress` 向上穿透真实发送进度，彻底杜绝多字节/图片指令被拦腰截断撕裂的隐患。
- **惰性单例代理模式 (`deviceManager`)** — `deviceManager` 升级为按需初始化的 Lazy Singleton Proxy，并导出 `getDeviceManager()` 访问工厂，消除全局导入初始化的副作用。

## [2.17.4] - 2026-10-21

### Fixed

- **单元测试断言与参数修正** — 修正 `print-queue-convergence.test.ts` 中 `BatchPrintManager.addJob` 参数契约与 `WALJournal.isDuplicate` 状态校验逻辑。

## [2.17.3] - 2026-10-21

### Fixed

- **单元测试 Taro 隔离 Mock 补充** — 在 `tests/queue/print-queue-convergence.test.ts` 补充 `@tarojs/taro` 顶层 Mock，避免在纯 Node 运行环境中访问全局对象导致测试报错。

## [2.17.2] - 2026-10-21

### Fixed

- **TS 类型断言修复** — 修复惰性代理中属性访问在 `tsc --noEmit` 严格模式下对未定义索引签名的类型断言（TS2352）。

## [2.17.1] - 2026-10-21

### Fixed

- **类型与格式检查优化** — 优化 `printQueue` 和 `offlineCache` 的惰性单例代理实现，严格满足 `@typescript-eslint/recommended-requiring-type-checking` 类型约束与 Prettier 规则。

## [2.17.0] - 2026-10-21

### Added

- **任务队列指数退避重试 (`PrintQueue`)** — `QueueConfig` 扩展 `backoffFactor` 与 `maxRetryDelay` 配置，并在任务重试时派发 `'job-retry'` 事件，统一底层重试机制。
- **手动任务重试与队列快照 (`retryJob`)** — `PrintQueue` 新增 `retryJob()` 与 `getRetryQueue()`，支持重置重试计数或指定延迟调度。
- **批处理打印队列直连 (`BatchPrintManager.flushToQueue`)** — `BatchPrintManager` 接入底层物理队列 `PrintQueue`，合并小任务后可直接排队提交并享受 WAL 日志追踪。
- **惰性单例代理 (`Lazy Singleton`)** — 针对顶层单例 `printQueue` 与 `offlineCache` 改为按需初始化的 Lazy Proxy，彻底消除无用 import 造成的全局副作用，并新增 `getPrintQueue()`、`getOfflineCache()` 访问函数。

### Deprecated

- **标记重复与旧版模块** — 将 `OfflineCache`（由 `WALJournal` 替代）与 `ScheduledRetryManager`（由 `PrintQueue` 指数退避替代）标记为 `@deprecated`，计划在 v3.0.0 移除。

## [2.16.1] - 2026-10-15

### Fixed

- **类型系统继承兼容** — 修复 `WALJournal` 继承 `EventEmitter` 时 `logger` 访问修饰符不一致的问题（TS2415）。
- **通用存储环境探测优化** — `createUniversalStorage` 增加对 Node/浏览器 `localStorage` 的主动可用性探测，防止非标准环境下的异常回退。
- **单元测试隔离性增强** — 完善针对 `TaroStorageAdapter` 与多环境存储降级逻辑的独立测试用例。

## [2.16.0] - 2026-10-14

### Added

- **ESC/POS 二维码自定义编码支持 (Fixes #16)** — `IQrOptions` 新增 `encoding?: string` 属性，`EscPosDriver.qr()` 与 `StarPrinter.qr()` 开放自定义字符集编码（如 `UTF-8` / `GBK`），默认保持 `GBK` 向后兼容，解决主流扫码枪和手机扫码默认 UTF-8 解码乱码的问题。
- **WAL 预写日志容灾引擎 (`WALJournal`)** — 实现微秒级预写日志记录与两级容灾存储模型，覆盖 `QUEUED` -> `IN_PROGRESS` -> `COMPLETED` / `FAILED` 全生命周期状态机追踪，支持冷启动日志回放（Rehydration）自愈。
- **跨平台存储统一抽象适配层 (`IStorageAdapter`)** — 提供跨端统一的同步键值持久化抽象，内置 `MemoryStorageAdapter`（纯内存/服务端/测试环境）、`LocalStorageAdapter`（Web/H5 环境）、`TaroStorageAdapter`（微信/支付宝/字节等全系小程序环境）以及环境自适应工厂 `createUniversalStorage`。
- **高效 CRC32 校验与幂等去重引擎 (`crc32`)** — 纯 JS 高性能 CRC32 指纹哈希算法，支持在内存与 WAL 层面设定滑动时间窗口（Deduplication Window），拦截弱网或重复点击造成的误打漏打。
- **`PrintQueue` 深度容灾与自愈集成** — 打印队列原生无缝挂载 `WALJournal`，在添加、执行、重试、取消流程中自动持久化日志，并提供 `recoverFromWAL()` 一键自愈重放闪退或崩溃未完成任务。
- **`BluetoothPrinter` 统一驱动与容灾 API** — 新增 `useDriver()`、`getActiveDriver()`、`enableWAL()`、`getWAL()` 门面接口，支持优雅挂载协议驱动与按需激活容灾引擎。
- **完善的单元测试覆盖** — 新增 `tests/cache/wal-journal.test.ts` 及 ESC/POS 二维码编码单元测试，全量覆盖各平台存储契约、WAL 状态转移、去重过滤、队列崩溃重放与字符集编码测试。

## [2.15.6] - 2026-09-24

### Fixed

- **CI/CD 流水线一致性** — 统一 `release.yml` 的 pnpm 为主流程锁定的 v9 版本，解决 pnpm 10 引起的 lockfile config 校验冲突。
- **单元测试优化** — 修复 `CpclDriver` 页面起始/结束指令调用，消除全局 `@tarojs/taro` 间接依赖引起的测试异常。

## [2.15.5] - 2026-09-22

### Added

- **驱动层统一抽象契约** (`IProtocolDriver` / `IReceiptDriver` / `ILabelDriver`) — 建立标准化协议接口规范，为多协议驱动提供生命周期、指令缓冲区获取与清理的标准约定。
- **`BluetoothPrinter.printDriver(driver, options?)`** — 核心门面新增协议驱动直接执行通道，支持直接传入 TSPL / ZPL / CPCL 驱动实例并复用底层分片、重试与进度状态机，打印完成后自动清空驱动指令缓冲。
- **补齐顶层 `ReactNativeAdapter` 导出** — 在根入口 `src/index.ts` 补齐遗漏导出的 `ReactNativeAdapter`。
- **新增单元测试** — 补充针对 `printDriver()` 流程、驱动契约与适配器导出的单元测试。

### Changed

- **驱动标准化升级** — `TsplDriver`、`ZplDriver`、`CpclDriver` 实现统一协议契约，规范协议标识与缓冲区重置接口。
- **贡献指南规范化** — 修复 `CONTRIBUTING.md` 中指向架构设计与 API 文档的失效链接，将测试框架从陈旧的 Jest 修正为 Vitest 并提供真实单元测试示例，校准最后更新时间。
- **文档体系清理** — 移除根目录临时发布跟踪文件至 `docs/releases/` 归档，清理无意义构建占位文件 `docs/README.md`，同步 VitePress 文档站 Changelog。
- **包信息优化** — 移除 `package.json` description 中的硬编码易过时版本号，补齐 React Native 与 QQ 等平台支持描述。

## [2.15.4] - 2026-07-13

### Added (Phase A — 可观测性 + 重试编排)

- **`BluetoothPrinter.job-completed` / `job-failed` 事件** — 每次底层 `adapter.write()` 完成后触发，携带 `source` / `bytes` / `durationMs` / `completedAt`（失败额外带 `error: BluetoothPrintError`）。与 `print-complete`（业务级）并存：`print-complete` 用于业务提示，新事件用于精细化埋点 / SLA 监控 / 重试编排。
  - 新类型 `JobResult` 已从 `taro-bluetooth-print` 命名导出

- **`RetryPlugin.onRetry` 回调** — 每次重试 **sleep 之前** 触发，携带 `attempt` / `maxRetries` / `delayMs` / `error`。用于 UI Toast（"正在重连 2/3..."）或遥测。回调内异常被捕获并 log，不会影响 retry 计时。

- **`BatchPrintManager` 失败任务管理**
  - 新方法：`retryJob(id)` / `retryAllFailedJobs()` / `getFailedJobs()` / `clearFailedJobs()`
  - 新事件：`batch-progress`（`{ sent, total, jobIds }`）/ `batch-failed`（`{ jobIds, bytes, error }`）/ `job-retried`（`BatchJob`）
  - 失败任务保留在内部 `failedJobs` 缓冲中（**不**自动从队列删除），等待显式重试

- **`PrinterConfigManager.export()` / `import()` 升级为 versioned snapshot（format=1）**
  - 字段校验（缺字段 / 类型错 → 抛 `BluetoothPrintError(INVALID_CONFIGURATION)`）
  - `import()` 返回 `PrinterConfigImportResult`（含 `imported` / `skipped` / `format`）
  - 向后兼容：v0 格式仍可读，但会自动升级为 v1

### Changed (Phase B — 包体积优化)

- **`GbkData` 拆分为独立 chunk** — `shared` chunk 从 **480KB → 24.7KB**（gzip 190KB → 8.78KB，**-95%**）
  - 用户业务只需要 ES/POS 主路径时，浏览器首屏不会下载 455KB GBK 全表
  - `gbk-data-{hash}.js` 仍按需加载（首次遇到 CJK 字符时触发）

### Testing (Phase C — 覆盖率提升)

- **77 个新单元测试**（1,359 → 1,436），覆盖率 **67.3% → 71.5%**（lines）
- 重点提升：
  - `LoggingPlugin.ts` 17.85% → **100%**
  - `EventEmitter.ts` 42.55% → **91.48%**
  - `GbkTable.ts` 50% → **92%**
  - `DeviceManager.ts` 59.84% → **90.9%**

### Docs (Phase D)

- `docs/api/bluetooth-printer.md` — 新增「任务级事件」章节 + `JobResult` 类型定义
- `docs/api/plugins.md` — RetryPlugin 字段更新为真实签名 + 新增 `onRetry` 章节 + `RetryAttempt` 类型
- `docs/api/batch-print-manager.md` — 事件列表重写（对齐真实 `BatchEvents`）+ 新增「失败任务管理」章节

## [2.15.3] - 2026-07-10

### Added

- **`BluetoothPrinter.writeRaw(buffer, options?)`** — 原始字节透传通道，绕过 `CommandBuilder` 直接走连接层。
  - 用途：让 `TsplDriver` / `ZplDriver` / `StarPrinter` / `CPCL` 等非 ESC/POS driver 通过统一管线端到端跑通
  - 复用 `PrintJobManager` 的分片 / 重试 / 进度 / 暂停 / 状态机
  - 不触碰 `commandBuilder` 命令队列 — 可与 `text()` / `qr()` / `cut()` 自由混用
  - 抛出 `CONNECTION_FAILED` (未连接) / `PRINT_JOB_FAILED` (adapter 错误) — 与 `print()` 一致
  - 9 个新单元测试覆盖端到端 TSPL 流、进度事件、完成事件、错误处理、空 buffer 等场景
  - **配套**：`examples/weapp/src/pages/label/index.tsx` 端到端跑通 TSPL 标签打印（之前只能到 step 3）

- **6 个新 / 扩展 API 文档** — 覆盖 `writeRaw()`、drivers / adapters / factory / errors / plugins 5 个新文件 + bluetooth-printer.md 扩展原始字节透传章节
  - [bluetooth-printer.md (扩展)](./api/bluetooth-printer.md#原始字节透传v2153) — 新增 `writeRaw()` 章节
  - [drivers.md (新)](./api/drivers.md) — TSPL / ZPL / CPCL / StarPRNT 完整 driver 指南
  - [adapters.md (新)](./api/adapters.md) — 平台 adapter 接入 + AdapterFactory 自动选择
  - [errors.md (新)](./api/errors.md) — 完整错误码 + 子类 + retry 模式
  - [factory.md (新)](./api/factory.md) — `createBluetoothPrinter` / `createWebBluetoothPrinter` / `PrinterFactory`
  - [plugins.md (新)](./api/plugins.md) — PluginManager / 内置插件 / 自定义插件
  - `docs/api/index.md` TOC 重构：新增 "服务层"、"工具与模板"、"工厂"、"插件系统"、"类型定义"、"事件总线" 分类块

### Changed

- **构建产物按 sub-export 拆分** — 主 bundle `index.es.js` / `index.cjs.js` 从 **630KB → 86KB**（-86%）
  - 5 个 lib entry：`index` / `core` / `drivers` / `adapters` / `encoding`
  - 共享代码 hoist 到 `dist/chunks/shared-*.js`（190KB gzip）
  - 总 dist 大小 2.6MB → ~715KB（-73%）
  - 浏览器端可按需 import：`taro-bluetooth-print/drivers` 只取驱动层
  - 新增独立 UMD 构建配置 `vite.umd.config.ts`（Vite 7 不支持 multi-entry + UMD）
  - 新增 script：`npm run build:umd`
  - **修复**：vitepress public 资源不再 leak 到 dist/`hero-illustration.svg` / `logo.svg` / `manifest.webmanifest` 等

### Testing

- 新增 **206 个单元测试**（1,102 → 1,308 个），覆盖率 **62.61% → 66.97%**（lines）
- 重点补强：
  - `template/engines/TemplateRenderer` 47.69% → **99.67%**
  - `template/parsers/TemplateParser` 73.52% → **97.05%**
  - `utils/platform` 47.61% → **100%**
  - `utils/BoundedOrderedMap` 70.83% → **100%**
  - `utils/normalizeError` 62.5% → **100%**
- 新增 4 个接口契约测试：`CommandBuilder` / `ConnectionManager` / `PrintJobManager` 各自实现对应 `I*` 接口
- 新增 1 个 `PrintJobManager` 边界测试集（cancel/pause/resume/start 边界 + 大 buffer 分片 + 错误恢复 + 静态 store）
- 修复 4 个 spec 假设错误（strict `> 0` 时间比较、`resume()` 早返回、no-op adapter 错误码、清理阈值）

### Follow-up (v3.x)

- `TsplDriverAdapter` — 让 `printer.text(...).qr(...).print()` 在 TSPL 模式也能跑（对称体验）。该改动有 4 个 design trade-off（cursor 策略 / init 语义 / image RLE 编码 / 字节累加方式），不在 v2.15.3 hotfix 范围内。
- `interfaces/*.ts` 0% 覆盖率保留 — 纯 type-only 文件，无运行时代码可测。
- **剩余 API 文档**（v2.15.4+）：`connection-manager` / `command-builder` / `print-job-manager` / `print-scheduler` / `cloud-print-manager` / `qrcode-discovery` / `qrcode-parser` / `text-formatter` / `preview-renderer` / `encoding-service` / `image-processing` / `logger` / `platform` / `output-limiter` / `event-emitter` / `types`（17 个服务层 / 工具 / 类型文档）。v2.15.3 周期内优先保障 writeRaw API + 用户最常用的 4 个模块（drivers / adapters / errors / factory / plugins）有正式文档。

---

## [2.15.2] - 2026-07-07

### Changed

- ** Discussions 入口改造** — 因 GitHub Discussions 页面当前为空，正式文档中讨论入口改为 docs 内页面：`https://agions.github.io/taro-bluetooth-print/guide/discussions`
  - README.md: `💬 讨论` 链接改为 docs 页面
  - docs/roadmap.md: GitHub Discussions 链接改为 docs 页面
  - 新增 docs/guide/discussions.md：整合社区渠道说明、Issue 报告规范、PR 规范、行为准则

---

## [2.15.1] - 2026-07-07

### Fixed

- **README logo 修复** — npm 注册表 README 中 logo 使用相对路径 `docs/public/logo.svg`，在 npmjs.com 上无法访问。已改为绝对 URL：`https://agions.github.io/taro-bluetooth-print/logo.svg`（GitHub Pages 托管，全球 CDN 可用）
- **examples 文档补全** — 为 `examples/weapp` / `examples/h5` / `examples/harmonyos` / `examples/react-native` 各添加专业 README.md，包含前置条件、快速开始、核心代码说明、平台差异、常见问题
- **examples/README.md 重写** — 新增平台对比表、4 大示例场景（小票 / 标签 / 队列 / 断点续传）带完整代码示例、平台功能矩阵、常见问题汇总

### Changed

- **README.md** — 示例项目章节从简单表格升级为带场景代码块的专业文档（+119 行）
- **examples/README.md** — 从 159 行重写为 187 行专业文档，新增 4 个平台 README（各 ~120-180 行）
- **Brand Consistency** — 所有示例文档统一使用品牌渐变色（indigo → cyan）和文档结构模板

---

## [2.15.0] - 2026-07-07

### Added

- **Professional Documentation Redesign** — Complete visual overhaul of docs site with custom brand identity
  - 6 new SVG logo variants (primary, mark, dark, wordmark, OG cover, hero banner)
  - Reimagined docs landing page with hero banner, feature cards, and compatibility matrix
  - Full Mermaid architecture diagrams (6-layer system, connection sequence, print flow)
- **Online Documentation Link** — `homepage` and `documentation` fields added to `package.json`
  - Live docs: https://agions.github.io/taro-bluetooth-print/

### Changed

- **README.md** — Hero section with brand badges, 4 why-choose cards, architecture mermaid diagram, 8×7 platform compatibility matrix, error handling pattern guide, and plugin ecosystem section (360 → 443 lines)
- **docs/index.md** — VitePress hero with `hero-banner.svg`, 6 feature cards, full protocol×platform matrix, 6 highlight cards with hover effects (154 → 305 lines)
- **docs/guide/architecture.md** — Added mermaid `flowchart TD` (6-layer architecture), `sequenceDiagram` (connection flow + print flow), detailed layer responsibility table
- **docs/.vitepress/config.ts** — Updated SEO meta tags, OG image (`og-cover.svg`), brand theme color (`#6366f1`)
- **Brand Identity** — Unified design language: indigo → cyan gradient (`#4338ca` → `#6366f1` → `#0891b2`), rounded-receipt motif, Bluetooth waveform arcs, 7×7 QR matrix

### Assets

| File | Size | Purpose |
|:---|:---|:---|
| `docs/public/logo.svg` | 240×240 | Primary logo (gradient plate + receipt + BT arcs) |
| `docs/public/logo-mark.svg` | 64×64 | Compact icon-only variant |
| `docs/public/logo-dark.svg` | 240×240 | Dark background variant |
| `docs/public/wordmark.svg` | 560×96 | Horizontal logo with tagline |
| `docs/public/og-cover.svg` | 1200×630 | Social sharing card |
| `docs/public/hero-banner.svg` | 1600×400 | Docs landing page hero |
| `docs/public/favicon.svg` | 32×32 | Browser tab favicon (redesigned) |

### Documentation

- All SVG assets are inline-path (0 external dependencies)
- Docs build time: 19.3s, 0 errors
- Mermaid diagrams render correctly in VitePress

---

## [2.14.0] - 2026-07-07

### Changed

- **核心引擎解耦**: `BluetoothPrinter` 抽出 `handleError()` 与 `resolveConnectionManager()` helper，消除 4 处 try/catch 模板
- **命令构建器精简**: `CommandBuilder` 抽出 `pushCommands()` helper，消除 7 处 `buffer.push + invalidateCache` 重复
- **适配器分层**: 5 个 mini-program adapter（Taro / Alipay / Baidu / ByteDance / QQ）精简为薄壳类（-69% 平均）
- **服务层去重**: `ConnectionManager.classifyConnectError()`、`PrintJobManager.wrapError()` 抽离，消除嵌套三元
- **错误类去重**: `ConnectionError` / `PrintJobError` 移除冗余 mapping 表（基于字符串值与 `ErrorCode` 完全一致）；`CommandBuildError` 仅保留 DRIVER_ERROR 单条映射
- **类型黑洞修复**: `PluginManager.executeHook()` 移除 `@ts-expect-error`，改用显式类型守卫
- **命名规范统一**: 冻结 PascalCase（类文件）/ camelCase（工具文件）/ `I`-prefix（接口）/ 0 下划线前缀 4 条规则
- **API 表面补完**: `src/index.ts` 新增 `QQAdapter` 导出

### Removed

- `src/utils/validation.ts` — deprecated 空 stub，无任何引用

### Renamed

- `drivers/escPosDriver.ts` → `drivers/EscPosDriver.ts`
- `drivers/barcode-helpers.ts` → `drivers/BarcodeHelpers.ts`
- `errors/baseError.ts` → `errors/BaseError.ts`
- `plugins/types.ts` → `plugins/PluginTypes.ts`
- `encoding/gbk-{table,lite,data}.ts` → `encoding/Gbk{Table,Lite,Data}.ts`
- `encoding/korean-japanese.ts` → `encoding/KoreanJapanese.ts`

### Refactoring Metrics

| 指标 | Before | After | Δ |
|---|---:|---:|---:|
| `BluetoothPrinter.ts` | 433 行 | 277 行 | **-36%** |
| `CommandBuilder.ts` | 315 行 | 158 行 | **-50%** |
| `PrintJobManager.ts` | 539 行 | 386 行 | **-28%** |
| 5 mini-program adapters | ~200 行 | ~62 行 | **-69%** |
| 3 error classes | 225 行 | 142 行 | **-37%** |
| **Total** | **23,355 行** | **22,567 行** | **-788 / -3.4%** |

### Testing

- 1,102 tests passed, 38 skipped, 0 regressions
- type-check: 0 errors (strict + noUncheckedIndexedAccess 全开)
- eslint: 0 errors / 0 warnings
- vite build: 22.84s · 230.91 KB gzip（基线 22.25s · 230.58 KB gzip）
- GitHub Actions CI: ✅ success (Run #28835694715)

### Commits

7 个 conventional commits 落地 (`be2fbdc..06f5ede`)：

- `2fc1f2d` refactor(core): simplify BluetoothPrinter & CommandBuilder
- `27fdd6a` refactor(services): dedup ConnectionManager + PrintJobManager
- `c6adaf6` refactor(adapters): deduplicate mini-program adapters and BaseAdapter imports
- `2bf28f6` refactor: enforce PascalCase file naming for class-bearing modules
- `6dfe1c5` refactor: remove @ts-expect-error and dead code
- `8e9193d` refactor(errors): deduplicate error-code mapping tables
- `06f5ede` chore: update import paths after PascalCase file renames
