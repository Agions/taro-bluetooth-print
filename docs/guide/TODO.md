# 未完成功能 / TODO Items

本文档记录当前未完成的功能项及其实现计划。

---

## 🔴 高优先级 (High Priority)

### 1. CPCL Logo Download 编码实现 ⚠️

**驱动**: `CpclDriver.ts`
**位置**: `src/drivers/CpclDriver.ts:486-492`

**当前状态**: Placeholder implementation

**问题描述**:
CPCL (Common Printer Command Language) 的 logo download 功能需要将 bitmap 数据编码为 CPCL 格式并下载到打印机内存中。

**当前代码**:
```typescript
downloadLogo(logoName: string, _bitmap: Uint8Array): this {
  this.commands.push(`! DF ${logoName}`);
  // TODO: Encode bitmap to CPCL format
  this.logger.debug('CPCL logo download not fully implemented');
  this.commands.push(`! DF`);
  return this;
}
```

**实现要求**:
1. 将 RGBA bitmap 转换为 1-bit monochrome bitmap
2. 应用 dithering 算法（可使用现有的 `ImageProcessing.toBitmap()`）
3. 编码为 CPCL 格式
4. 生成 `! GUI` 命令序列

**CPCL 格式参考**:
```
! DF <filename> <width> <height> <compress> <data_size>
! GUI <x> <y> <filename>
```

**预计工作量**: 4-6 小时
**依赖**: `ImageProcessing` 工具类（已存在）
**参考**: `StarPrinter.ts` 的 image 实现已完成类似的图像处理

**测试计划**:
- [ ] 单元测试：bitmap 转换
- [ ] 单元测试：CPCL 命令生成
- [ ] 集成测试：完整 logo download 流程

---

### 2. ZPL Image 编码实现 ⚠️

**驱动**: `ZplDriver.ts`
**位置**: `src/drivers/ZplDriver.ts:439-444`

**当前状态**: Placeholder implementation

**问题描述**:
ZPL (Zebra Programming Language) 的 image 功能需要使用 `^GFA` 或 `^XG` 命令将图像数据编码为 ZPL 格式。

**当前代码**:
```typescript
image(_x: number, _y: number, _width: number, _height: number, _bitmap: Uint8Array): this {
  // TODO: Implement proper ZPL image encoding using ^GFA or ^XG commands
  // For now, this is a placeholder
  this.logger.debug('ZPL image encoding not fully implemented');
  return this;
}
```

**实现要求**:
1. 将 RGBA bitmap 转换为 1-bit monochrome bitmap
2. 应用 dithering 算法（可使用现有的 `ImageProcessing.toBitmap()`）
3. 使用 `^GFA` (Graphic Field ASCII) 或 `^XG` 命令编码图像数据
4. 支持可选的二进制压缩格式

**ZPL 格式参考**:
```
^XA
^FO<x>,<y>
^GFA<total_bytes>,<bytes_per_row>,<width>,<data>^FS
^XZ
```

或使用 `^XG` 用于已下载到显卡的图像。

**预计工作量**: 6-8 小时
**依赖**: `ImageProcessing` 工具类（已存在）
**参考**: ZPL II Programming Guide

**测试计划**:
- [ ] 单元测试：bitmap 转换
- [ ] 单元测试：^GFA 命令生成
- [ ] 单元测试：^XG 命令生成
- [ ] 集成测试：完整 image 打印流程

---

### 3. GBK 编码完整支持 ⚠️

**模块**: `encoding.ts`
**位置**: `src/utils/encoding.ts:82-98`

**当前状态**: Partial implementation (fallback to UTF-8)

**问题描述**:
当前编码服务只完整支持 UTF-8，其他编码（包括 GBK）都回退到 UTF-8，可能导致中文显示问题。

**当前代码**:
```typescript
// UTF-8 encoding is fully supported
if (normalizedEncoding === 'UTF8' || normalizedEncoding === 'UTF-8') {
  return this.utf8Encoder.encode(text);
}

// For other encodings, show warning only once if enabled
if (this.config.showWarnings && !this.warningShown) {
  logger.warn(
    `Encoding ${encoding} not yet fully implemented, falling back to UTF-8. ` +
      `This may cause display issues with some printers.`
  );
  this.warningShown = true;
}

return this.utf8Encoder.encode(text);
```

**实现要求**:
1. 使用现有的 `EncodingService` 和 GBK 数据表（`src/encoding/`）
2. 添加 GBK 编码器支持：
   - `src/encoding/gbk-lite.ts` (已存在 85.71% 覆盖)
   - `src/encoding/gbk-table.ts` (已存在 52.17% 覆盖)
3. 整合到 `Encoding.encode()` 方法
4. 支持其他常用编码：
   - GB2312
   - Big5
   - EUC-KR
   - Shift-JIS
   - ISO-2022-JP

**当前进度**:
- ✅ `EncodingService` 已实现 (68.12% 覆盖)
- ✅ GBK 数据表已存在
- ✅ GBK-Lite 编码器已存在 (85.71% 覆盖)
- ❌ 尚未整合到 `Encoding.encode()` 方法

**预计工作量**: 8-12 小时
**依赖**: `EncodingService`, GBK 数据表（已存在）
**复杂度**: 中等（需要处理编码映射和边界情况）

**测试计划**:
- [ ] 单元测试：GBK 编码
- [ ] 单元测试：GB2312 编码
- [ ] 单元测试：Big5 编码
- [ ] 单元测试：Fallback 逻辑
- [ ] 集成测试：实际打印验证

---

## 🟡 中优先级 (Medium Priority)

### 4. DI 容器 (Dependency Injection)

**模块**: `Container.ts`
**位置**: `src/core/di/Container.ts`

**当前状态**: 未测试 (0% 覆盖)

**问题描述**:
DI 容器已实现但缺少测试用例，需要添加完整的测试覆盖。

**实现要求**:
1. 注册依赖
2. 解析依赖
3. 生命周期管理
4. 循环依赖检测
5. 单例模式支持

**预计工作量**: 3-4 小时
**当前覆盖率**: 0%
**目标覆盖率**: 90%+

---

### 5. EventBus 事件总线

**模块**: `EventBus.ts`
**位置**: `src/core/event/EventBus.ts`

**当前状态**: 未测试 (0% 覆盖)

**问题描述**:
EventBus 已实现但缺少测试用例，需要添加完整的测试覆盖。

**实现要求**:
1. 事件订阅
2. 事件发布
3. 取消订阅
4. 一次性订阅
5. 异步事件处理

**预计工作量**: 2-3 小时
**当前覆盖率**: 0%
**目标覆盖率**: 90%+

---

### 6. PluginManager 插件管理器

**模块**: `PluginManager.ts`
**位置**: `src/core/plugin/PluginManager.ts`

**当前状态**: 未测试 (0% 覆盖)

**问题描述**:
PluginManager 已实现但缺少测试用例，需要添加完整的测试覆盖。

**实现要求**:
1. 插件加载
2. 插件卸载
3. 生命周期钩子
4. 插件依赖管理

**预计工作量**: 3-4 小时
**当前覆盖率**: 0%
**目标覆盖率**: 90%+

---

## 🟢 低优先级 (Low Priority)

### 7. 性能基准测试套件

**目标**: 建立性能基准监控

**当前状态**: 未实现

**实现要求**:
1. 连接建立性能测试
2. 文本打印性能测试
3. 图片处理性能测试
4. 内存使用监控
5. 性能回归检测

**预计工作量**: 8-12 小时
**优先级**: 低（功能完整后实施）

---

### 8. 故障排查手册

**目标**: 提供详细的故障排查指南

**当前状态**: 未实现

**实现要求**:
1. 常见问题 FAQ
2. 错误代码参考
3. 调试指南
4. 平台特定问题
5. 打印机兼容性列表

**预计工作量**: 12-16 小时
**优先级**: 低（可以逐步完善）

---

## 📊 状态总览

| 功能 | 驱动/模块 | 状态 | 优先级 | 预计工作量 | 进度 |
|-----|----------|------|--------|-----------|------|
| CPCL Logo Download | CpclDriver | 🔴 未完成 | 高 | 4-6h | 10% |
| ZPL Image Encoding | ZplDriver | 🔴 未完成 | 高 | 6-8h | 10% |
| GBK Encoding Support | encoding.ts | 🟡 部分完成 | 高 | 8-12h | 60% |
| DI Container 测试 | Container.ts | 🟡 未测试 | 中 | 3-4h | 0% |
| EventBus 测试 | EventBus.ts | 🟡 未测试 | 中 | 2-3h | 0% |
| PluginManager 测试 | PluginManager.ts | 🟡 未测试 | 中 | 3-4h | 0% |
| 性能基准测试 | - | 🟢 未实现 | 低 | 8-12h | 0% |
| 故障排查手册 | - | 🟢 未实现 | 低 | 12-16h | 0% |

---

## 🎯 实施计划

### Q2 2026 (4-6 月)

**目标**: 完成高优先级功能

- [x] 安全漏洞修复（已完成）
- [x] 文档完善（已完成）
- [ ] GBK 编码完整支持
- [ ] ZPL Image 编码实现
- [ ] CPCL Logo Download 实现

### Q3 2026 (7-9 月)

**目标**: 完成中优先级功能

- [ ] DI 容器测试覆盖
- [ ] EventBus 测试覆盖
- [ ] PluginManager 测试覆盖
- [ ] 整体测试覆盖率提升到 70%+

### Q4 2026 (10-12 月)

**目标**: 完成低优先级功能

- [ ] 性能基准测试套件
- [ ] 故障排查手册
- [ ] 整体测试覆盖率提升到 85%+

---

## 💡 贡献指南

如果您想贡献代码实现这些功能，请参考：

1. **Fork 项目**: 从 GitHub fork 仓库
2. **创建分支**: `feature/<功能名称>`
3. **编写测试**: 确保测试覆盖率达到目标
4. **提交 PR**: 详细描述实现细节和测试用例
5. **代码审查**: 通过团队的代码审查

**联系方式**:
- GitHub Issues: [Agions/taro-bluetooth-print/issues](https://github.com/Agions/taro-bluetooth-print/issues)
- Email: 1051736049@qq.com

---

## 🔗 相关资源

- **CPCL 编程指南**: 查阅打印机厂商文档
- **ZPL II 编程指南**: [Zebra ZPL II Programming Guide](https://www.zebra.com/content/dam/zebra/manuals/printers/common/programming-guides/p7694706-001-en.pdf)
- **GBK 编码表**: [GBK 字符集](http://www.unicode.org/Public/MAPPINGS/VENDORS/MICSFT/WINDOWS/CP936.TXT)
- **项目 Wiki**: [GitHub Wiki](https://github.com/Agions/taro-bluetooth-print/wiki)

---

**最后更新**: 2026-04-25
**维护者**: Agions
**版本**: v2.9.4
