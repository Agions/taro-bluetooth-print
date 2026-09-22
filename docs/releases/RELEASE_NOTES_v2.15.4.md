# v2.15.4 Release Notes

> 2026-07-13 · Observability + Retry Orchestration + 95% Smaller Shared Chunk + 71.5% Coverage

## ✨ Highlights

This release introduces first-class **observability primitives** and a **failure-recovery contract** across the three user-visible pipelines (BluetoothPrinter / RetryPlugin / BatchPrintManager), while shipping a major bundle-size win that cuts the shared chunk by **95%**.

## 🚀 Added

### 1. `BluetoothPrinter.job-completed` / `job-failed` events

Every underlying `adapter.write()` call now emits a job-level event with `source` / `bytes` / `durationMs` / `completedAt` (and `error: BluetoothPrintError` on failure). The new events complement the existing `print-complete` (business-level):

- **`print-complete`** — single fire when an entire print job succeeds → use for toasts / business UX
- **`job-completed` / `job-failed`** — fires once per `adapter.write()` call, **including every retry attempt** → use for SLA monitoring, fine-grained telemetry, retry orchestration

```typescript
import type { JobResult } from 'taro-bluetooth-print';

printer.on('job-completed', (evt: JobResult) => {
  console.log(`✅ ${evt.source} ${evt.bytes}B in ${evt.durationMs}ms`);
});

printer.on('job-failed', (evt) => {
  console.error(`❌ ${evt.source} failed: ${evt.error.code}`);
});
```

### 2. `RetryPlugin.onRetry` callback

Get notified **before each retry attempt's backoff sleep**. Ideal for UX hints and telemetry:

```typescript
import { createRetryPlugin } from 'taro-bluetooth-print/plugins';

createRetryPlugin({
  maxRetries: 3,
  onRetry: ({ attempt, maxRetries, delayMs, error }) => {
    Toast.show(`Reconnecting (${attempt}/${maxRetries})…`);
    trackEvent('print_retry', { attempt, errorCode: error.code });
  },
});
```

The callback's exceptions are caught and logged — they never break retry timing.

### 3. `BatchPrintManager` failed-jobs management

Failed jobs are **no longer silently dropped**. They're preserved in an internal buffer with explicit recovery APIs:

- `retryJob(id)` — re-queue a single failed job (returns boolean)
- `retryAllFailedJobs()` — re-queue everything in the failure buffer
- `getFailedJobs()` — snapshot the current failure buffer
- `clearFailedJobs()` — discard the buffer without retrying

Three new events: `batch-progress` / `batch-failed` / `job-retried`.

```typescript
batchManager.on('batch-failed', ({ jobIds, error }) => {
  Toast.show({ message: `打印失败: ${error.message}`, type: 'error' });
  setTimeout(() => batchManager.retryAllFailedJobs(), 3000);
});
```

### 4. `PrinterConfigManager.export()` / `import()` — versioned snapshot format

The existing export/import APIs (now typed as `format: 1`) gain:

- Field validation — bad input throws `BluetoothPrintError(INVALID_CONFIGURATION)`
- `import()` returns `PrinterConfigImportResult` with `imported` / `skipped` / `format`
- Forward-compatible: v0 snapshots auto-upgrade to v1 on read

## 📦 Bundle

### `GbkData` split into a dedicated chunk

The 480 KB shared chunk that previously held GBK table data now sits in its own `chunks/gbk-data-{hash}.js` and is **lazily loaded only when the encoding path actually needs the full table** (Chinese characters outside the lite table).

| Chunk | Before | After | Δ |
|---|---|---|---|
| `chunks/shared` (raw) | 480 KB | **24.7 KB** | **-95%** |
| `chunks/shared` (gzip) | 190 KB | **8.78 KB** | **-95%** |
| `chunks/gbk-data` (gzip) | (was in shared) | 179.68 KB | new independent chunk |
| `index.es.js` (gzip) | 25.5 KB | **25.48 KB** | unchanged |

Apps that don't print CJK characters never download the GBK table.

## 🧪 Testing

**77 new unit tests** added across 4 low-coverage modules:

| Module | Before | After |
|---|---|---|
| `LoggingPlugin.ts` | 17.85% | **100%** |
| `EventEmitter.ts` | 42.55% | **91.48%** |
| `GbkTable.ts` | 50% | **92%** |
| `DeviceManager.ts` | 59.84% | **90.9%** |
| **Project lines** | **67.3%** | **71.5%** |

Total: **1,436 tests passing** (38 skipped), 0 ESLint errors, 0 TypeScript errors.

## 📚 Documentation

Three API docs updated to match real signatures + new event/method coverage:

- `docs/api/bluetooth-printer.md` — added "Job-level events (v2.15.4+)" section + `JobResult` type
- `docs/api/plugins.md` — fixed stale `RetryPlugin` signature (`maxAttempts`/`backoffMs` → `maxRetries`/`initialDelay`/`maxDelay`/`backoffMultiplier`); added `onRetry` + `RetryAttempt` type
- `docs/api/batch-print-manager.md` — rewrote event table to match real `BatchEvents` (removed fictional `progress`/`item-complete`/`item-failed`/`batch-complete` that never existed in the source); added "Failed-jobs management" section
- `CHANGELOG.md` — consolidated v2.15.4 entry across A/B/C/D phases
- `README.md` + `docs/index.md` — updated test count (1,102 → 1,436) and bundle size claim (minzip 231 KB → main bundle 89 KB / 25.5 KB gzip)

## 🔧 Migration

**No breaking changes.** All additions are additive:

- `BluetoothPrinter` events: `job-completed` / `job-failed` are new; `print-complete` is unchanged
- `RetryPlugin.onRetry`: optional, default behavior unchanged
- `BatchPrintManager`: new methods/events; existing API surface untouched
- `PrinterConfigManager.export/import`: same signatures, stricter validation, returns richer result object on import

## 📊 By the numbers

| Dimension | Value |
|---|---|
| Tests | **1,436** passing (38 skipped) |
| Coverage | **71.5%** (lines) |
| Main bundle (gzip) | **25.48 KB** |
| Shared chunk (gzip) | **8.78 KB** (down from 190 KB) |
| Production deps | **0** (peerDep on `@tarojs/taro ^3.6.22` only) |
| ESLint errors | **0** |
| TypeScript errors | **0** |
| Code duplication (jscpd) | **0 clones** |
| Dead code | **0 lines** |

---

**Full Changelog**: [CHANGELOG.md](./CHANGELOG.md)
**Commits since v2.15.3**:

```
c6f3929 docs(v2.15.4): Phase D — document new observability & retry APIs
6c66416 test: bump coverage 67.3% → 71.5%, add 77 tests across 4 modules
40dd3ff build(encoding): split GbkData into dedicated chunk, shared chunk -95%
fc8dd6a feat(core): add job-completed/job-failed events + retry/failure tracking
b4866e1 chore(release): v2.15.4 — lint/type fixes + version bump
```

**Install**: `pnpm add taro-bluetooth-print@2.15.4`
