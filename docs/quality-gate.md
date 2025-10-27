# 质量门禁系统

## 概述

本项目实现了一个全面的质量门禁系统，用于在 CI/CD 流程中自动检查代码质量、测试覆盖率、性能指标、安全
性和文档完整性。

## 功能特性

### 🔍 多维度质量检查

- **代码覆盖率**: 检查语句、分支、函数和行覆盖率
- **代码质量**: ESLint、Prettier、TypeScript 类型检查
- **性能指标**: 包大小、加载时间、内存使用
- **安全检查**: 依赖漏洞审计、敏感信息检查
- **文档完整性**: API 文档覆盖率、必需文档检查

### ⚙️ 可配置的规则

通过 `quality-gate.config.json` 文件可以自定义各项检查的阈值：

```json
{
  "coverage": {
    "statements": 80,
    "branches": 75,
    "functions": 80,
    "lines": 80
  },
  "codeQuality": {
    "eslint": {
      "maxWarnings": 5,
      "maxErrors": 0
    }
  },
  "performance": {
    "bundleSize": {
      "max": "2MB",
      "warning": "1.5MB"
    }
  }
}
```

### 📊 详细的报告生成

- **控制台输出**: 实时显示检查进度和结果
- **JSON 报告**: 机器可读的详细报告
- **质量评分**: 0-100 分的综合质量评分
- **分类统计**: 按检查类型分类的详细统计

## 使用方法

### 本地使用

```bash
# 运行完整质量检查
npm run quality:check

# 运行特定类型检查
npm run quality:coverage    # 只检查覆盖率
npm run quality:security    # 只检查安全性
npm run quality:performance # 只检查性能

# 使用详细输出模式
node scripts/quality-gate.js --verbose

# 使用自定义配置文件
node scripts/quality-gate.js --config=custom-config.json
```

### CI/CD 集成

质量门禁已集成到 GitHub Actions 工作流中：

1. **自动触发**: 在 push 到 main/develop 分支或创建 PR 时自动运行
2. **全面检查**: 包含代码质量、安全、性能、文档等所有维度
3. **PR 评论**: 自动在 PR 中添加质量检查报告评论
4. **状态检查**: 根据检查结果设置 PR 状态

### 命令行选项

```bash
# 基本用法
node scripts/quality-gate.js

# 选项说明
--verbose                   # 显示详细输出
--check-type=<type>        # 只运行特定类型的检查
--config=<path>            # 使用自定义配置文件

# 检查类型
all                       # 运行所有检查（默认）
coverage                   # 只检查代码覆盖率
code-quality              # 只检查代码质量
performance               # 只检查性能指标
testing                   # 只检查测试质量
security                  # 只检查安全性
documentation             # 只检查文档完整性
```

## 配置说明

### 覆盖率配置

```json
{
  "coverage": {
    "statements": 80, // 语句覆盖率阈值
    "branches": 75, // 分支覆盖率阈值
    "functions": 80, // 函数覆盖率阈值
    "lines": 80, // 行覆盖率阈值
    "threshold": {
      "high": 90, // 优秀阈值
      "medium": 70, // 良好阈值
      "low": 50 // 及格阈值
    }
  }
}
```

### 代码质量配置

```json
{
  "codeQuality": {
    "eslint": {
      "maxWarnings": 5, // 最大警告数量
      "maxErrors": 0 // 最大错误数量
    },
    "prettier": {
      "enforce": true // 是否强制代码格式检查
    },
    "typescript": {
      "noErrors": true // 是否要求TypeScript编译无错误
    }
  }
}
```

### 性能配置

```json
{
  "performance": {
    "bundleSize": {
      "max": "2MB", // 最大包大小
      "warning": "1.5MB" // 警告包大小
    },
    "loadTime": {
      "max": 3000, // 最大加载时间(ms)
      "warning": 2000 // 警告加载时间(ms)
    },
    "memory": {
      "max": "50MB", // 最大内存使用
      "warning": "30MB" // 警告内存使用
    }
  }
}
```

### 安全配置

```json
{
  "security": {
    "vulnerabilityThreshold": "medium", // 漏洞严重程度阈值
    "auditPassRequired": true // 是否要求安全审计通过
  }
}
```

### 文档配置

```json
{
  "documentation": {
    "apiCoverage": 80, // API文档覆盖率要求
    "readmeExists": true, // 是否要求README文件存在
    "changelogExists": true // 是否要求CHANGELOG文件存在
  }
}
```

## 报告解读

### 质量评分系统

- **90-100 分**: 优秀 - 代码质量很高
- **80-89 分**: 良好 - 代码质量符合要求
- **70-79 分**: 合格 - 代码质量基本达标
- **0-69 分**: 需要改进 - 代码质量有待提升

### 检查状态说明

- ✅ **通过**: 检查项目符合要求
- ❌ **失败**: 检查项目不符合要求，会阻止合并
- ⚠️ **警告**: 检查项目需要关注，但不阻止合并
- 💥 **错误**: 检查过程中发生错误

### 报告文件

质量门禁会生成以下报告文件：

```
quality-gate-reports/
├── quality-gate-report-1699123456789.json  # 详细JSON报告
└── ...
```

## 最佳实践

### 1. 渐进式改进

对于现有项目，建议：

1. 先设置较宽松的阈值
2. 逐步提高要求
3. 重点修复阻止合并的失败项

### 2. 团队协作

1. 在代码评审时关注质量门禁结果
2. 及时修复质量问题
3. 定期回顾和调整质量标准

### 3. 持续监控

1. 监控质量趋势
2. 关注质量评分变化
3. 定期更新配置以适应项目发展

## 故障排除

### 常见问题

**Q: 质量门禁报告"覆盖率报告不存在"**

A: 请先运行测试生成覆盖率报告：

```bash
npm run test:coverage
```

**Q: ESLint 检查失败**

A: 运行自动修复：

```bash
npm run quality:fix
```

**Q: 安全检查发现漏洞**

A: 更新依赖包：

```bash
npm audit fix
```

### 调试模式

使用 `--verbose` 选项获取详细输出：

```bash
node scripts/quality-gate.js --verbose
```

## 扩展开发

### 添加新的检查类型

1. 在 `QualityGate` 类中添加新的检查方法
2. 在配置文件中添加相应的配置项
3. 更新报告生成逻辑

### 自定义报告格式

可以扩展 `generateReport()` 方法来支持其他报告格式，如 HTML、PDF 等。

## 相关文档

- [测试策略](./testing-strategy.md)
- [CI/CD 配置](../.github/workflows/)
- [代码覆盖率监控](./coverage-monitoring.md)

---

_本文档随项目更新，最后更新时间: 2024 年 10 月_
