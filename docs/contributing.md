---
outline: [2, 3]
---

# 贡献指南

感谢您对 taro-bluetooth-print 项目的兴趣！我们欢迎各种形式的贡献，包括但不限于代码提交、Bug 报告、文档完善和功能建议。

## 开发环境

### 前置要求

- Node.js >= 18.0.0
- pnpm >= 8.0.0
- Git

### 快速开始

```bash
# 克隆仓库
git clone https://github.com/Agions/taro-bluetooth-print.git
cd taro-bluetooth-print

# 安装依赖
pnpm install

# 运行测试
pnpm test

# 构建项目
pnpm build

# 类型检查
pnpm type-check

# 代码规范检查
pnpm lint
```

## 分支管理

### 分支命名规范

| 类型 | 格式 | 示例 |
|------|------|------|
| 功能分支 | `feature/` | `feature/new-driver` |
| 修复分支 | `fix/` | `fix/connection-timeout` |
| 文档分支 | `docs/` | `docs/api-improvement` |
| 重构分支 | `refactor/` | `refactor/core-module` |

### 工作流程

1. **Fork** 仓库到您的账户
2. **创建特性分支**: `git checkout -b feature/your-feature-name`
3. **开发并测试**: 确保所有测试通过 `pnpm test`
4. **遵循代码规范**: `pnpm lint` 和 `pnpm type-check` 必须通过
5. **提交更改**: 使用清晰的提交信息
6. **Push 到您的 Fork**: `git push origin feature/your-feature-name`
7. **创建 Pull Request**: 详细描述您的更改

## 代码规范

### TypeScript

- 使用严格的 TypeScript 配置
- 避免使用 `any` 类型
- 所有公共 API 必须有 JSDoc 注释
- 优先使用 `interface` 而非 `type`

### 命名规范

| 类型 | 规范 | 示例 |
|------|------|------|
| 类名 | PascalCase | `BluetoothPrinter` |
| 方法名 | camelCase | `connectDevice` |
| 常量 | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT` |
| 接口 | PascalCase + I 前缀 | `IPrinterDriver` |
| 类型 | PascalCase | `PrintOptions` |

### 文件结构

```
src/
├── core/           # 核心模块
├── drivers/        # 打印机驱动
├── adapters/       # 平台适配器
├── services/       # 服务层
├── utils/          # 工具函数
└── index.ts        # 主入口
```

## 测试规范

### 测试覆盖率要求

- 核心模块：>= 70%
- 新增功能：>= 80%
- Bug 修复：必须包含回归测试

### 编写测试

```typescript
import { describe, it, expect } from 'vitest';
import { YourClass } from '@/path/to/your-class';

describe('YourClass', () => {
  it('should do something specific', () => {
    const instance = new YourClass();
    expect(instance.method()).toBe('expected');
  });
});
```

## Pull Request 规范

### PR 标题格式

```
<type>(<scope>): <description>

Types: feat, fix, docs, style, refactor, test, chore
Scope: core, driver, adapter, utils, etc.
```

### 示例

```
feat(driver): add support for new printer model

fix(core): resolve connection timeout issue
docs(api): update BluetoothPrinter documentation
```

### PR 描述模板

```markdown
## 描述
简要说明这个 PR 的目的和主要更改。

## 更改类型
- [ ] Bug 修复
- [ ] 新功能
- [ ] 破坏性变更
- [ ] 文档更新
- [ ] 性能优化
- [ ] 重构

## 测试
- [ ] 添加了新的测试
- [ ] 所有测试通过
- [ ] 手动测试验证

## 截图/日志
（如果适用）添加截图或日志来展示更改效果。
```

## Bug 报告

请通过 [GitHub Issues](https://github.com/Agions/taro-bluetooth-print/issues) 报告 Bug。良好的 Bug 报告包括：

- 清晰的标题和描述
- 复现步骤
- 预期行为 vs 实际行为
- 打印机型号和平台信息
- 相关日志输出

## 许可证

通过贡献代码，您同意您的贡献将按照 [MIT 许可证](../LICENSE) 发布。
