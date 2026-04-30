# Release v2.9.6 — ZPL 图像、CPCL Logo 与稳定性加固

> 📅 2026-04-30 | 🏷️ 最新版 | 📦 [npm](https://www.npmjs.com/package/taro-bluetooth-print) | 📖 [文档](https://agions.github.io/taro-bluetooth-print/)

---

## 🎯 Highlights

本次更新重点解决了 **两个驱动功能的最后拼图** 和 **三处定时器资源泄漏问题**。现在所有 8 个打印机驱动的核心功能均已完整实现。

### 🖼️ ZPL / CPCL 图像功能补全

| 驱动 | 新增方法 | 命令 | 适用设备 |
|:-----|:---------|:-----|:---------|
| **ZplDriver** | `image(x, y, width, height, bitmap)` | `^GFA` 图形字段编码 | Zebra ZD420 / GT800 / ZM400 |
| **CpclDriver** | `downloadLogo(logoName, bitmap, options?)` | `CG` 压缩图形 + `! DF` 宏存储 | HP IR3222 / 霍尼韦尔移动打印机 |

### 🔧 资源泄漏修复

- **ConnectionManager**: 连接超时 timer → 成功时 `clearTimeout`
- **PrinterStatus**: 状态查询超时 timer → 正常返回时 `clearTimeout`
- **PrintQueue**: 重试延时 timer → `clear()` 时自动取消待执行重试

### 🧪 质量

- **测试**: ✅ 879 通过 / 918 总用例（95.7%）— 较 v2.9.5 新增 2 个图像编码测试
- **类型检查**: ✅ `tsc --noEmit` 0 错误
- **代码扫描**: 通过

---

## ✅ 全功能驱动状态一览

```
 EscPos        — ESC/POS   ✅ 全功能
 TsplDriver    — TSPL      ✅ 全功能
 ZplDriver     — ZPL       ✅ 含图像打印 (^GFA)
 CpclDriver    — CPCL      ✅ 含 Logo 下载 (CG)
 StarPrinter   — STAR      ✅ 全功能
 GPrinter      — 佳博自定义 ✅ 全功能
 Xprinter      — ESC/POS   ✅ 全功能
 SprtDriver    — ESC/POS   ✅ 全功能
```

---

## 📦 安装

```bash
npm install taro-bluetooth-print@latest
# 或
pnpm add taro-bluetooth-print@latest
```

---

<details>
<summary><b>📋 完整变更日志</b></summary>

### Added

- `ZplDriver.image()` — ZPL `^GFA` 图像编码
- `CpclDriver.downloadLogo()` — CPCL `CG` 位图编码 + 宏存储
- ZPL 图像单元测试（链式调用 + 命令断言 + 边界情况）
- README「高级打印」新增 ZPL 图像和 CPCL Logo 条目
- README「打印机驱动」新增功能状态列

### Fixed

- 连接超时 timer 泄漏（ConnectionManager）
- 状态查询超时 timer 泄漏（PrinterStatus）
- 重试定时器泄漏（PrintQueue）

### Changed

- 测试用例数更新为 879（v2.9.5 为 648）
- 所有 8 个驱动标记为全功能状态
</details>

---

**感谢使用 🖨️ taro-bluetooth-print！如有问题欢迎提交 Issue。**