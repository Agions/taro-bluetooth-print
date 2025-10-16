# 贡献指南

欢迎为 Taro Bluetooth Print 项目做出贡献！感谢您愿意花时间帮助改进这个项目。

## 🚀 快速开始

### 开发环境设置

1. **Fork 仓库**
   ```bash
   # 在 GitHub 上 fork 项目
   # 然后克隆你的 fork
   git clone https://github.com/your-username/taro-bluetooth-print.git
   cd taro-bluetooth-print
   ```

2. **设置上游仓库**
   ```bash
   git remote add upstream https://github.com/original-repo/taro-bluetooth-print.git
   ```

3. **安装依赖**
   ```bash
   npm install
   ```

4. **创建开发分支**
   ```bash
   git checkout -b feature/your-feature-name
   ```

5. **进行开发**
   ```bash
   # 启动开发模式
   npm run dev

   # 启动文档开发服务器
   npm run docs:dev
   ```

## 📝 贡献类型

我们欢迎以下类型的贡献：

### 🐛 Bug 报告

发现问题时，请：

1. **搜索已有 Issues** - 确保问题未被报告
2. **创建 Issue** - 使用 Bug 报告模板
3. **提供详细信息**：
   - 复现步骤
   - 期望行为 vs 实际行为
   - 环境信息（Node.js 版本、Taro 版本、设备型号等）
   - 错误日志或截图

### ✨ 功能请求

提出新功能时，请：

1. **检查是否有类似请求**
2. **使用功能请求模板**
3. **详细描述用例和动机**
4. **考虑向后兼容性**

### 📚 文档改进

文档改进包括：

- 修复错误或不清晰的内容
- 添加使用示例
- 改进 API 文档
- 翻译文档到其他语言
- 添加教程和指南

### 🧪 测试

- 编写单元测试
- 添加集成测试
- 改进测试覆盖率
- 性能测试

### 🎨 代码贡献

代码贡献包括：

- 新功能开发
- Bug 修复
- 性能优化
- 代码重构
- 构建工具改进

## 🔧 开发指南

### 代码风格

本项目使用 ESLint 和 Prettier 进行代码格式化：

```bash
# 检查代码风格
npm run lint

# 自动修复代码风格问题
npm run lint:fix

# 格式化代码
npm run format
```

### 提交规范

使用 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

**类型 (type)**：
- `feat`: 新功能
- `fix`: Bug 修复
- `docs`: 文档更新
- `style`: 代码格式化（不影响功能）
- `refactor`: 代码重构
- `test`: 测试相关
- `chore`: 构建工具、依赖更新等

**示例**：
```
feat(bluetooth): 添加设备自动重连功能

- 实现连接状态监控
- 添加重连配置选项
- 增加连接超时处理

Closes #123
```

### 分支策略

- `main`: 主分支，稳定版本
- `develop`: 开发分支，集成新功能
- `feature/*`: 功能分支
- `bugfix/*`: Bug 修复分支
- `release/*`: 发布准备分支
- `hotfix/*`: 紧急修复分支

### 测试要求

1. **运行所有测试**
   ```bash
   npm test
   ```

2. **检查测试覆盖率**
   ```bash
   npm run test:coverage
   ```

3. **添加新测试**：
   - 为新功能添加单元测试
   - 为 Bug 修复添加回归测试
   - 确保测试覆盖率不低于 80%

### 构建验证

提交前请确保：

```bash
# 构建项目
npm run build

# 检查构建输出
npm run validate

# 构建文档
npm run docs:build
```

## 📋 提交流程

### 1. 准备工作

```bash
# 确保是最新代码
git checkout main
git pull upstream main

# 创建新分支
git checkout -b feature/your-feature-name
```

### 2. 开发和测试

```bash
# 进行开发工作
# ...

# 运行测试
npm test

# 检查代码风格
npm run lint

# 构建验证
npm run build
```

### 3. 提交代码

```bash
# 添加更改
git add .

# 提交（遵循提交规范）
git commit -m "feat: 添加新功能描述"

# 推送到你的 fork
git push origin feature/your-feature-name
```

### 4. 创建 Pull Request

1. 在 GitHub 上创建 Pull Request
2. 使用 PR 模板填写详细信息
3. 等待代码审查
4. 根据反馈进行修改

## 📖 PR 模板

### Title
```
<type>(<scope>): <description>
```

### Description
**解决的问题**：
- 描述这个 PR 解决的问题

**变更内容**：
- 详细说明主要变更
- 添加的技术债务清理

**测试**：
- [ ] 单元测试通过
- [ ] 集成测试通过
- [ ] 手动测试完成

**文档**：
- [ ] 已更新相关文档
- [ ] 添加了新的示例

**检查清单**：
- [ ] 代码符合项目规范
- [ ] 提交信息符合规范
- [ ] 没有引入新的警告
- [ ] 构建成功

## 🏗️ 项目结构

```
taro-bluetooth-print/
├── src/                    # 源代码
│   ├── bluetooth/         # 蓝牙功能
│   ├── printer/           # 打印机功能
│   ├── components/        # UI 组件
│   ├── utils/             # 工具函数
│   └── types/             # 类型定义
├── docs/                   # 文档
│   ├── .vitepress/        # VitePress 配置
│   ├── guide/             # 用户指南
│   ├── examples/          # 示例代码
│   └── reference/         # 参考文档
├── tests/                  # 测试文件
├── build/                  # 构建配置
├── scripts/                # 脚本文件
└── specs/                  # 规格文档
```

## 🧪 测试指南

### 单元测试

```typescript
// tests/unit/bluetooth.test.ts
import { BluetoothManager } from '../../src/bluetooth'

describe('BluetoothManager', () => {
  test('should initialize successfully', async () => {
    const bluetooth = new BluetoothManager()
    const result = await bluetooth.init()
    expect(result).toBe(true)
  })
})
```

### 集成测试

```typescript
// tests/integration/print-flow.test.ts
import { TaroBluePrint } from '../../src/index'

describe('Print Flow Integration', () => {
  test('should complete print workflow', async () => {
    const printer = new TaroBluePrint()
    // 集成测试逻辑
  })
})
```

### 文档测试

```typescript
// tests/docs/example-validation.test.ts
// 确保文档中的示例代码可以正常运行
```

## 📚 文档贡献

### API 文档

- 使用 JSDoc 格式添加注释
- 包含参数说明和返回值
- 提供使用示例

```typescript
/**
 * 连接蓝牙设备
 * @param deviceId 设备ID
 * @param options 连接选项
 * @param options.timeout 连接超时时间（毫秒）
 * @returns 连接是否成功
 * @example
 * ```typescript
 * const connected = await bluetooth.connect('XX:XX:XX:XX:XX:XX', {
 *   timeout: 10000
 * })
 * ```
 */
async connect(deviceId: string, options?: ConnectOptions): Promise<boolean>
```

### 示例代码

- 添加到 `docs/examples/` 目录
- 包含完整可运行的代码
- 添加详细说明
- 测试示例代码的有效性

## 🐛 调试指南

### 开发环境调试

```bash
# 启用调试模式
DEBUG=taro-bluetooth-print* npm run dev

# 使用 VS Code 调试
# 在 .vscode/launch.json 中配置调试选项
```

### 常见问题

1. **TypeScript 编译错误**
   - 检查 tsconfig.json 配置
   - 确保类型定义正确

2. **构建失败**
   - 清除缓存：`npm run clean`
   - 重新安装依赖：`rm -rf node_modules && npm install`

3. **测试失败**
   - 检查测试环境配置
   - 确保依赖服务可用

## 📦 发布流程

项目维护者负责发布新版本：

1. **更新版本号**
   ```bash
   npm version patch|minor|major
   ```

2. **生成更新日志**
   ```bash
   npm run changelog
   ```

3. **发布到 npm**
   ```bash
   npm publish
   ```

4. **创建 GitHub Release**
   - 自动生成发布说明
   - 添加二进制文件（如有）

## 🤝 社区准则

### 行为准则

- 尊重所有参与者
- 保持友好和专业
- 欢迎新手参与
- 建设性反馈

### 沟通渠道

- **GitHub Issues**: Bug 报告和功能请求
- **GitHub Discussions**: 一般讨论和问答
- **Pull Requests**: 代码贡献和审查

### 获得帮助

如果您需要帮助：

1. 查看现有的文档和 FAQ
2. 搜索已有的 Issues 和 Discussions
3. 创建新的 Issue 描述您的问题
4. 在维护者社区中寻求帮助

## 🏆 贡献者认可

我们重视每一位贡献者的贡献：

- 所有贡献者都会被添加到 [contributors.md](./contributors.md)
- 重要贡献会在更新日志中被特别提及
- 长期贡献者可能被邀请成为维护者

## 📄 许可证

通过贡献代码，您同意您的贡献将在项目的 [MIT 许可证](https://github.com/your-repo/taro-bluetooth-print/blob/main/LICENSE) 下发布。

## 📞 联系方式

如果您有任何问题或建议，可以通过以下方式联系我们：

- GitHub Issues: [创建新 Issue](https://github.com/your-repo/taro-bluetooth-print/issues/new)
- GitHub Discussions: [参与讨论](https://github.com/your-repo/taro-bluetooth-print/discussions)
- Email: [your-email@example.com]

---

感谢您的贡献！🎉