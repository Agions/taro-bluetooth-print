# Changelog

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
