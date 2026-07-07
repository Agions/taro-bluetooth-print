---
outline: [2, 3]
---

# 路线图

本文档展示 taro-bluetooth-print 项目的未来发展规划。

## 长期愿景

打造最完善的跨平台蓝牙打印解决方案，支持所有主流小程序平台和 Web Bluetooth，成为物联网打印场景的首选库。

## v3.0.0 - 重大升级

### 计划中的功能

#### 核心架构

- [ ] **依赖注入框架 2.0**: 支持构造函数参数注入、属性注入
- [ ] **插件系统完善**: 完整的插件钩子体系
- [ ] **中间件支持**: 请求/响应拦截器

#### 平台支持

- [ ] **鸿蒙系统原生适配器**

#### 驱动扩展

- [ ] **EPSON ESC/POS 扩展**: 更多ESC/POS命令支持
- [ ] **自动驱动检测**: 根据打印机标识自动选择驱动
- [ ] **驱动优先级配置**: 用户可配置多驱动优先级

#### 高级功能

- [ ] **打印预览**: 生成打印效果预览图
- [ ] **模板市场**: 预设模板分享平台
- [ ] **云端配置**: 打印机配置云端管理
- [ ] **多语言支持**: 国际化(i18n)

## v2.14.0 - 架构深度重构

### 已完成 (2026-07-07)

- [x] **核心引擎解耦**: BluetoothPrinter 抽出 `handleError()` / `resolveConnectionManager()` helper，消除 4 处 try/catch 模板
- [x] **命令构建器精简**: CommandBuilder 抽出 `pushCommands()` helper，消除 7 处 buffer.push 重复（-50% 代码量）
- [x] **适配器分层**: 5 个 mini-program adapter 精简为 ~12 行薄壳类（-69% 平均）
- [x] **连接/任务服务层**: 抽出 `classifyConnectError()` / `wrapError()` helper
- [x] **命名规范统一**: 冻结 PascalCase/camelCase/I-prefix/无下划线前缀；8 个文件重命名
- [x] **错误处理优化**: ConnectionError/PrintJobError/CommandBuildError 移除冗余 mapping 表（-37% 平均）
- [x] **类型黑洞修复**: 消除 `PluginManager.ts` 的 `@ts-expect-error`
- [x] **死代码清理**: 删除 `src/utils/validation.ts`（deprecated 空 stub）
- [x] **平台适配补完**: `src/index.ts` 补 `QQAdapter` 漏掉的 export

### 性能

- 源代码: 23,355 行 → 22,567 行（**-788 行，-3.4%**）
- 重命名: 8 个文件 PascalCase 统一
- 重构 commits: 7 个 conventional commits

## v2.10.x - 持续完善

### Q2 2026 计划

#### 已完成

- [x] 插件系统 (Hook-based PluginManager)
- [x] 类型安全 EventEmitter
- [x] 测试覆盖率 80%+（1,102 测试用例）
- [x] 代码重复率 0%
- [x] 架构精简（移除过度工程的 DI 容器）

#### 进行中

- [ ] 完整 API 文档完善
- [ ] 更多驱动支持
- [ ] 性能基准测试

#### 待完成

- [ ] 设备配对管理增强
- [ ] 打印任务取消增强
- [ ] 连接状态机优化
- [ ] 更多单元测试

## v2.9.x - 架构升级

### 已完成

- [x] 插件管理器（Hook-based）
- [x] 类型安全 EventEmitter
- [x] 输出限制器
- [x] 设备管理器测试
- [x] 条码便捷方法 Mixin 模式
- [x] 打印队列测试

## 已废弃功能

以下功能已被移除或替换：

| 功能 | 替代方案 | 废弃版本 |
|------|----------|----------|
| 旧版 PrinterFactory | PrinterFactory (v2) | 2.10.0 |
| 内置验证器 | 分离的 validators/ 目录 | 2.10.0 |
| 旧版模板引擎 | TemplateEngine v2 | 2.10.0 |

## 版本策略

### 语义化版本

- **主版本 (x.0.0)**: 破坏性变更
- **次版本 (x.y.0)**: 新功能，向后兼容
- **补丁版本 (x.y.z)**: Bug 修复，向后兼容

### 支持周期

- **最新版本**: 完全支持
- **上一主要版本**: 6 个月安全更新
- **更早版本**: 不再支持

## 反馈与建议

如果您对路线图有建议，请通过以下方式联系我们：

- [GitHub Issues](https://github.com/Agions/taro-bluetooth-print/issues)
- [GitHub Discussions](https://github.com/Agions/taro-bluetooth-print/discussions)
- [Pull Requests](https://github.com/Agions/taro-bluetooth-print/pulls)

您的反馈将帮助我们更好地规划项目未来。
