# 代码重复率检测报告

**项目**: taro-bluetooth-print  
**检测工具**: jscpd  
**检测目录**: `src/`  
**检测时间**: 2026-05-04  
**检测参数**: `--min-lines 5 --min-tokens 50`

---

## 总体统计

| 指标 | 数值 |
|------|------|
| 分析文件数 | 96 |
| 总代码行数 | 22,697 |
| 总 Token 数 | 154,521 |
| 发现克隆数 | 27 |
| **重复代码行数** | **388 行 (1.71%)** |
| **重复 Token 数** | **5,978 (3.87%)** |

**结论**: 代码重复率 **1.71%**（按行数），属于**良好**水平（一般认为 <3% 为可接受）。

---

## 重复代码详细分析

### 一、跨文件重复（最严重，需优先处理）

#### 1. BaseAdapter.ts ↔ ReactNativeAdapter.ts — 服务发现逻辑重复

**严重程度**: ⚠️ 高

**克隆 1**: 两个适配器类的头部声明和导入完全相同

| 文件 | 行号范围 | 行数 |
|------|----------|------|
| `src/adapters/BaseAdapter.ts` | L6-L23 | 17 行 |
| `src/adapters/ReactNativeAdapter.ts` | L17-L34 | 17 行 |

重复内容（导入和类声明）:
```typescript
import { IPrinterAdapter, IAdapterOptions, PrinterState } from '@/types';
import { Logger } from '@/utils/logger';
import { normalizeError } from '@/utils/normalizeError';
import { withTimeout } from '@/utils/withTimeout';
import { BluetoothPrintError, ErrorCode } from '@/errors/baseError';
import {
  ChunkWriteStrategy,
  type ChunkWriteContext,
  type ChunkWriteResult,
  DEFAULT_ADAPTIVE_CONFIG,
} from './ChunkWriteStrategy';
```

**克隆 2**: `findWritableCharacteristic` 方法实现几乎相同

| 文件 | 行号范围 | 行数 |
|------|----------|------|
| `src/adapters/BaseAdapter.ts` | L444-L467 | 23 行 |
| `src/adapters/ReactNativeAdapter.ts` | L421-L450 | 23 行 |

重复内容:
```typescript
// 查找可写特征的逻辑完全相同
if (writeChar) {
  this.serviceCache.set(deviceId, {
    serviceId: service.uuid,
    characteristicId: writeChar.uuid,
  });
  this.logger.info('Found writeable characteristic:', {
    service: service.uuid,
    characteristic: writeChar.uuid,
  });
  return;
}
// ... 错误处理也相同
throw new BluetoothPrintError(
  ErrorCode.CHARACTERISTIC_NOT_FOUND,
  'No writeable characteristic found. Make sure the device is a supported printer.'
);
```

**重构建议**: 将 `findWritableCharacteristic` 提取到 `BaseAdapter` 基类中，ReactNativeAdapter 继承使用。

---

#### 2. CpclDriver.ts ↔ ZplDriver.ts — 条形码方法重复

**严重程度**: ⚠️ 中

**克隆 1**: code128/code39 方法

| 文件 | 行号范围 | 行数 |
|------|----------|------|
| `src/drivers/CpclDriver.ts` | L338-L350 | 12 行 |
| `src/drivers/ZplDriver.ts` | L320-L332 | 12 行 |

重复内容:
```typescript
code128(content: string, x = 0, y = 0, height = 50): this {
  return this.barcode(content, { x, y, type: '128', height });
}

code39(content: string, x = 0, y = 0, height = 50): this {
  return this.barcode(content, { x, y, type: '39', height, ... });
}
```

**克隆 2**: 条形码配置方法

| 文件 | 行号范围 | 行数 |
|------|----------|------|
| `src/drivers/CpclDriver.ts` | L501-L513 | 12 行 |
| `src/drivers/ZplDriver.ts` | L446-L458 | 12 行 |

**重构建议**: 提取 `BarcodeMixin` 或使用组合模式，将通用条形码方法抽到基类。

---

### 二、文件内重复（同一文件中的模式重复）

#### 3. src/utils/image.ts — 抖动算法重复（最严重）

**严重程度**: 🔴 高（7 个克隆）

`image.ts` 中有 6 个抖动算法（Floyd-Steinberg、Atkinson、Burkes、Sierra、Stucki、Threshold），它们共享完全相同的像素处理循环结构：

| 克隆 | 位置 A | 位置 B | 行数 | Token 数 |
|------|--------|--------|------|----------|
| 1 | L315-L333 | L286-L304 | 18 | 252 |
| 2 | L401-L410 | L370-L379 | 9 | 90 |
| 3 | L435-L454 | L286-L305 | 19 | 289 |
| 4 | L469-L488 | L286-L305 | 19 | 289 |
| 5 | L506-L517 | L286-L297 | 11 | 124 |
| 6 | L518-L527 | L370-L379 | 9 | 90 |
| 7 | L595-L607 | L571-L583 | 12 | 134 |

重复的公共模式（出现在所有 6 个抖动函数中）:
```typescript
for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    const idx = y * width + x;
    const oldPixel = grayscale[idx];
    const newPixel = oldPixel! < threshold ? 0 : 255;
    if (newPixel === 0) {
      const byteIdx = y * bytesPerLine + Math.floor(x / 8);
      const bitIdx = 7 - (x % 8);
      bitmap[byteIdx] = bitmap[byteIdx]! | (1 << bitIdx);
    }
    const err = oldPixel! - newPixel;
    // 唯一不同的是误差扩散系数和位置
    this.distributeErr(grayscale, width, height, x + 1, y, (err * 7) / 16);
    // ...
  }
}
```

**重构建议**: 将通用像素处理循环提取为模板方法，抖动算法仅提供误差扩散策略（策略模式）：
```typescript
private static applyDithering(
  grayscale, width, height, bitmap, bytesPerLine, threshold,
  diffusionPattern: Array<{dx: number, dy: number, weight: number}>
): void { /* 公共逻辑 */ }
```

---

#### 4. src/encoding/EncodingService.ts — 编码方法重复

**严重程度**: ⚠️ 中（4 个克隆）

| 克隆 | 位置 A | 位置 B | 行数 | Token 数 |
|------|--------|--------|------|----------|
| 1 | L444-L467 (encodeBig5) | L404-L427 (encodeGbk) | 23 | 228 |
| 2 | L508-L524 (encodeKorean) | L405-L421 (encodeGbk) | 16 | 183 |
| 3 | L568-L591 (encodeShiftJis) | L404-L427 (encodeGbk) | 23 | 228 |
| 4 | L634-L643 (encodeIso2022Jp) | L406-L415 (encodeGbk) | 9 | 131 |

所有编码方法共享相同骨架:
```typescript
private encodeXxx(text: string): Uint8Array {
  const result: number[] = [];
  const fallbackCode = this.config.fallbackChar.charCodeAt(0);

  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);

    // 代理对处理 - 完全相同
    if (code >= 0xd800 && code <= 0xdbff && i + 1 < text.length) {
      const nextCode = text.charCodeAt(i + 1);
      if (nextCode >= 0xdc00 && nextCode <= 0xdfff) {
        result.push(fallbackCode);
        i++;
        continue;
      }
    }

    // ASCII 透传 - 完全相同
    if (isAscii(code)) {
      result.push(code);
      continue;
    }

    // 编码特定字符查找 - 每个方法不同
    const bytes = getXxxBytes(code);
    if (bytes) {
      result.push(bytes[0], bytes[1]);
    } else {
      result.push(fallbackCode);
    }
  }
  return new Uint8Array(result);
}
```

**重构建议**: 提取通用编码骨架方法:
```typescript
private encodeText(
  text: string,
  lookupFn: (code: number) => [number, number] | undefined
): Uint8Array { /* 公共逻辑 */ }
```

---

#### 5. src/services/PrintStatistics.ts — 统计方法重复

**严重程度**: ⚠️ 低（3 个克隆）

| 克隆 | 位置 A | 位置 B | 行数 | Token 数 |
|------|--------|--------|------|----------|
| 1 | L212-L221 (trackJobFail) | L161-L170 (trackJobComplete) | 9 | 86 |
| 2 | L221-L229 (trackJobFail) | L170-L178 (trackJobComplete) | 8 | 77 |
| 3 | L488-L493 (aggregateByDriver) | L470-L475 (aggregateByDate) | 5 | 86 |

重复内容 — 驱动统计更新:
```typescript
// trackJobComplete 和 trackJobFail 中都有:
if (record.driver) {
  let driverStats = this.byDriver[record.driver];
  if (!driverStats) {
    driverStats = { completed: 0, failed: 0 };
    this.byDriver[record.driver] = driverStats;
  }
  driverStats.completed++; // 或 .failed++
}
```

**重构建议**: 提取 `updateDriverStats(driver, field)` 和 `updateDateStats(dateKey, field)` 辅助方法。

---

#### 6. src/services/PrintJobManager.ts — 打印流程重复

**严重程度**: ⚠️ 低（1 个克隆）

| 位置 A (start) | 位置 B (resume) | 行数 | Token 数 |
|----------------|-----------------|------|----------|
| L137-L145 | L191-L199 | 8 | 76 |

重复内容 — 打印完成处理逻辑:
```typescript
if (!this._isPaused) {
  this.logger.info(`Print job ${this.jobId} completed successfully`);
  this._isInProgress = false;
  this.clearJobState();
  this.emitJobState('completed');
}
```

**重构建议**: 提取 `handleJobCompletion()` 方法。

---

#### 7. src/core/EventEmitter.ts — 事件方法重复

**严重程度**: ⚠️ 低（3 个克隆）

| 克隆 | 位置 A | 位置 B | 行数 | Token 数 |
|------|--------|--------|------|----------|
| 1 | L82-L87 (prepend) | L41-L45 (on) | 5 | 84 |
| 2 | L111-L116 (prependOnce) | L67-L72 (once) | 5 | 93 |
| 3 | L210-L224 (emit) | L160-L174 (emitSerial) | 14 | 105 |

**重构建议**: 考虑合并 `emit` 和 `emitSerial` 的公共逻辑。

---

#### 8. src/template/engines/TemplateRenderer.ts — 模板渲染重复

**严重程度**: ⚠️ 低（2 个克隆）

| 克隆 | 位置 A | 位置 B | 行数 | Token 数 |
|------|--------|--------|------|----------|
| 1 | L493-L499 | L484-L490 | 6 | 93 |
| 2 | L591-L603 | L561-L574 | 12 | 109 |

---

#### 9. src/core/di/Container.ts — DI 容器注册重复

**严重程度**: ⚠️ 低（1 个克隆）

| 位置 A | 位置 B | 行数 | Token 数 |
|--------|--------|------|----------|
| L115-L129 | L99-L111 | 14 | 80 |

---

#### 10. src/adapters/AdapterFactory.ts — 工厂方法重复

**严重程度**: ⚠️ 低（1 个克隆）

| 位置 A (create) | 位置 B (createForPlatform) | 行数 | Token 数 |
|-----------------|---------------------------|------|----------|
| L30-L47 | L65-L82 | 17 | 147 |

两个方法包含几乎相同的 switch-case 分支逻辑。

---

## 按文件排序的重复统计

| 文件 | 克隆数 | 重复行数 | 重复 Token 数 | 严重程度 |
|------|--------|----------|---------------|----------|
| `src/utils/image.ts` | 7 | ~97 | ~1,268 | 🔴 高 |
| `src/encoding/EncodingService.ts` | 4 | ~71 | ~770 | ⚠️ 中 |
| `src/services/PrintStatistics.ts` | 3 | ~22 | ~249 | ⚠️ 低 |
| `src/core/EventEmitter.ts` | 3 | ~24 | ~282 | ⚠️ 低 |
| `src/template/engines/TemplateRenderer.ts` | 2 | ~18 | ~202 | ⚠️ 低 |
| `src/adapters/BaseAdapter.ts ↔ ReactNativeAdapter.ts` | 2 | ~40 | ~236 | ⚠️ 高 |
| `src/drivers/CpclDriver.ts ↔ ZplDriver.ts` | 2 | ~24 | ~262 | ⚠️ 中 |
| `src/services/PrintJobManager.ts` | 1 | ~8 | ~76 | ⚠️ 低 |
| `src/core/di/Container.ts` | 1 | ~14 | ~80 | ⚠️ 低 |
| `src/adapters/AdapterFactory.ts` | 1 | ~17 | ~147 | ⚠️ 低 |

---

## 优先重构建议（按影响排序）

1. **🔴 高优先**: `src/utils/image.ts` — 将 6 个抖动算法重构为策略模式，预计可减少 ~90 行代码
2. **🔴 高优先**: `src/adapters/BaseAdapter.ts` ↔ `ReactNativeAdapter.ts` — 将 `findWritableCharacteristic` 提取到基类
3. **⚠️ 中优先**: `src/encoding/EncodingService.ts` — 提取通用 `encodeText()` 模板方法，预计可减少 ~60 行代码
4. **⚠️ 中优先**: `src/drivers/CpclDriver.ts` ↔ `ZplDriver.ts` — 提取条形码 mixin
5. **⚠️ 低优先**: 其余重复均为小规模模式重复，可选择性重构

---

## 总结

| 指标 | 结果 |
|------|------|
| 总重复率 | **1.71%**（按行数）/ **3.87%**（按 Token） |
| 代码质量评级 | ✅ **良好** (< 3%) |
| 跨文件重复 | 4 对文件 |
| 文件内重复 | 6 个文件 |
| 建议重构可减少代码 | ~200-250 行 |
