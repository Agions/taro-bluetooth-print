# Changelog

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
