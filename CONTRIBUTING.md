# 贡献指南

首先，感谢您对 Taro Bluetooth Print 项目的关注和支持！我们欢迎各种形式的贡献，包括但不限于：

- 🐛 **Bug 报告**: 发现问题并提交详细报告
- ✨ **新功能**: 提出新功能建议或实现新功能
- 📚 **文档**: 改进文档、示例代码或教程
- 🎨 **代码**: 贡献代码、修复问题或优化性能
- 🧪 **测试**: 添加测试用例或改进测试覆盖率
- 💡 **建议**: 提出改进建议或最佳实践

## 📋 目录

- [开始之前](#开始之前)
- [开发环境设置](#开发环境设置)
- [贡献流程](#贡献流程)
- [代码规范](#代码规范)
- [测试指南](#测试指南)
- [文档贡献](#文档贡献)
- [提交规范](#提交规范)
- [社区行为准则](#社区行为准则)
- [获取帮助](#获取帮助)

## 🚀 开始之前

### 前置要求

在开始贡献之前，请确保您已经：

- ✅ 阅读了项目的 [README](README.md)
- ✅ 了解项目的 [架构设计](docs/architecture/README.md)
- ✅ 查看了 [API 文档](docs/api/README.md)
- ✅ 搜索了现有的 [Issues](https://github.com/your-org/taro-bluetooth-print/issues)
- ✅ 查看了 [贡献者列表](https://github.com/your-org/taro-bluetooth-print/graphs/contributors)

### 技能要求

- **基础知识**: 熟悉 JavaScript/TypeScript
- **框架知识**: 了解 Taro 框架和跨平台开发
- **蓝牙知识**: 了解蓝牙协议和打印原理（加分项）
- **测试经验**: 熟悉 Jest 或其他测试框架
- **Git 使用**: 熟悉 Git 基本操作和协作流程

## 🛠️ 开发环境设置

### 1. Fork 项目

```bash
# 1. 在 GitHub 上 Fork 项目
# 2. 克隆您的 Fork
git clone https://github.com/YOUR_USERNAME/taro-bluetooth-print.git
cd taro-bluetooth-print

# 3. 添加上游仓库
git remote add upstream https://github.com/your-org/taro-bluetooth-print.git
```

### 2. 安装依赖

```bash
# 安装依赖
npm install

# 或使用 yarn
yarn install

# 或使用 pnpm
pnpm install
```

### 3. 开发环境设置

```bash
# 安装开发依赖
npm install --save-dev

# 创建开发分支
git checkout -b feature/your-feature-name

# 启动开发模式
npm run dev

# 运行测试
npm test

# 代码检查
npm run lint

# 代码格式化
npm run format
```

### 4. IDE 配置

推荐使用 **VS Code** 并安装以下插件：

```json
{
  "recommendations": [
    "ms-vscode.vscode-typescript-next",
    "esbenp.prettier-vscode",
    "ms-vscode.vscode-eslint",
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-json"
  ]
}
```

VS Code 设置 (.vscode/settings.json):

```json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.preferences.importModuleSpecifier": "relative",
  "emmet.includeLanguages": {
    "typescript": "html",
    "typescriptreact": "html"
  }
}
```

## 🔄 贡献流程

### 1. 选择贡献类型

#### 报告 Bug

1. 搜索现有 Issues，确认问题未被报告
2. 使用 [Bug 报告模板](https://github.com/your-org/taro-bluetooth-print/issues/new?template=bug_report.md)
3. 提供详细的问题描述和复现步骤
4. 包含环境信息、错误日志和截图

#### 提出新功能

1. 搜索现有 Issues 和 [Discussions](https://github.com/your-org/taro-bluetooth-print/discussions)
2. 使用 [功能请求模板](https://github.com/your-org/taro-bluetooth-print/issues/new?template=feature_request.md)
3. 详细描述功能需求和使用场景
4. 说明功能的价值和实现建议

#### 贡献代码

1. Fork 项目并创建功能分支
2. 编写代码并确保通过所有测试
3. 提交 Pull Request
4. 等待代码审查和合并

### 2. 分支命名规范

```bash
# 功能分支
feature/蓝牙设备自动重连
feature/template-printing-system

# Bug 修复分支
fix/内存泄漏问题
fix/蓝牙连接异常断开

# 文档分支
docs/更新API文档
docs/添加使用示例

# 重构分支
refactor/重构事件系统
refactor/优化性能
```

### 3. 开发流程

```bash
# 1. 同步上游代码
git checkout main
git pull upstream main

# 2. 创建功能分支
git checkout -b feature/your-feature-name

# 3. 开发和测试
# ... 编写代码 ...
npm test
npm run lint

# 4. 提交代码
git add .
git commit -m "feat: 添加新功能"

# 5. 推送到您的 Fork
git push origin feature/your-feature-name

# 6. 创建 Pull Request
```

## 📝 代码规范

### 1. TypeScript 规范

```typescript
// ✅ 使用明确的类型定义
interface BluetoothDevice {
  id: string;
  name: string;
  rssi?: number;
}

// ✅ 使用泛型
class Repository<T> {
  private items: Map<string, T> = new Map();

  save(id: string, item: T): void {
    this.items.set(id, item);
  }

  find(id: string): T | undefined {
    return this.items.get(id);
  }
}

// ✅ 使用枚举
enum ConnectionState {
  Disconnected = 'disconnected',
  Connecting = 'connecting',
  Connected = 'connected',
  Error = 'error'
}

// ❌ 避免使用 any
function processData(data: any): any {
  // 避免这样的代码
}
```

### 2. 命名规范

```typescript
// ✅ 类名：PascalCase
class BluetoothManager {}

// ✅ 接口名：PascalCase，以 I 开头
interface IBluetoothAdapter {}

// ✅ 方法名：camelCase
function connectToDevice() {}

// ✅ 变量名：camelCase
const deviceList = [];

// ✅ 常量：UPPER_SNAKE_CASE
const MAX_RETRY_ATTEMPTS = 3;

// ✅ 文件名：kebab-case
// bluetooth-adapter.ts
// print-service.ts
```

### 3. 代码组织

```typescript
// ✅ 文件顶部导入
import { Injectable } from '@nestjs/common';
import { Logger } from 'winston';
import type { IBluetoothAdapter } from '../interfaces/bluetooth-adapter.interface';

// ✅ 常量定义
const DEFAULT_TIMEOUT = 5000;
const MAX_RETRIES = 3;

// ✅ 类定义
@Injectable()
export class BluetoothService {
  private readonly logger = new Logger(BluetoothService.name);

  constructor(
    @Inject('BluetoothAdapter')
    private readonly adapter: IBluetoothAdapter
  ) {}

  // ✅ 公共方法
  public async connect(): Promise<boolean> {
    try {
      return await this.adapter.connect();
    } catch (error) {
      this.logger.error('Connection failed', error);
      throw error;
    }
  }

  // ✅ 私有方法
  private async handleConnectionError(error: Error): Promise<void> {
    // 处理连接错误
  }
}
```

### 4. 错误处理

```typescript
// ✅ 使用自定义错误类
export class BluetoothError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly context?: any
  ) {
    super(message);
    this.name = 'BluetoothError';
  }
}

// ✅ 统一的错误处理
try {
  await bluetooth.connect();
} catch (error) {
  if (error instanceof BluetoothError) {
    // 处理蓝牙特定错误
    handleBluetoothError(error);
  } else {
    // 处理其他错误
    handleGenericError(error);
  }
}
```

### 5. 异步代码

```typescript
// ✅ 使用 async/await
async function scanDevices(): Promise<BluetoothDevice[]> {
  try {
    const devices = await this.adapter.scan();
    return devices;
  } catch (error) {
    throw new BluetoothError('Scan failed', 'SCAN_ERROR', error);
  }
}

// ✅ 正确处理 Promise 链
async function printData(data: string): Promise<void> {
  await this.connect();
  await this.sendData(data);
  await this.disconnect();
}

// ✅ 并发处理
async function printMultiple(items: string[]): Promise<void> {
  const promises = items.map(item => this.print(item));
  await Promise.all(promises);
}
```

## 🧪 测试指南

### 1. 测试结构

```
tests/
├── unit/                 # 单元测试
│   ├── services/
│   ├── adapters/
│   └── utils/
├── integration/          # 集成测试
│   ├── bluetooth/
│   └── printing/
├── e2e/                  # 端到端测试
├── fixtures/            # 测试数据
├── mocks/               # Mock 对象
└── utils/               # 测试工具
```

### 2. 单元测试示例

```typescript
// tests/unit/services/bluetooth-service.test.ts
import { Test, TestingModule } from '@nestjs/testing';
import { BluetoothService } from '../../../src/services/bluetooth.service';
import { IBluetoothAdapter } from '../../../src/interfaces/bluetooth-adapter.interface';

describe('BluetoothService', () => {
  let service: BluetoothService;
  let mockAdapter: jest.Mocked<IBluetoothAdapter>;

  beforeEach(async () => {
    mockAdapter = {
      connect: jest.fn(),
      disconnect: jest.fn(),
      scan: jest.fn()
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BluetoothService,
        {
          provide: 'BluetoothAdapter',
          useValue: mockAdapter
        }
      ]
    }).compile();

    service = module.get<BluetoothService>(BluetoothService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('connect', () => {
    it('should connect successfully', async () => {
      mockAdapter.connect.mockResolvedValue(true);

      const result = await service.connect();

      expect(result).toBe(true);
      expect(mockAdapter.connect).toHaveBeenCalledTimes(1);
    });

    it('should handle connection failure', async () => {
      mockAdapter.connect.mockRejectedValue(new Error('Connection failed'));

      await expect(service.connect()).rejects.toThrow('Connection failed');
    });
  });
});
```

### 3. 集成测试示例

```typescript
// tests/integration/bluetooth/printing.test.ts
import { createBluetoothPrinter } from '../../../src';
import { MockBluetoothAdapter } from '../../mocks/bluetooth-adapter.mock';

describe('Bluetooth Printing Integration', () => {
  let printer: any;
  let mockAdapter: MockBluetoothAdapter;

  beforeEach(async () => {
    mockAdapter = new MockBluetoothAdapter();
    printer = createBluetoothPrinter({
      bluetooth: {
        adapter: mockAdapter
      }
    });

    await printer.initialize();
  });

  afterEach(async () => {
    await printer.dispose();
  });

  it('should complete full printing workflow', async () => {
    // 1. 扫描设备
    mockAdapter.setMockDevices([{ id: 'test-device', name: 'Test Printer' }]);
    const devices = await printer.scanDevices();
    expect(devices).toHaveLength(1);

    // 2. 连接设备
    const connected = await printer.connect(devices[0].id);
    expect(connected).toBe(true);

    // 3. 打印文本
    const jobId = await printer.printText('Test Message');
    expect(jobId).toBeTruthy();

    // 4. 断开连接
    const disconnected = await printer.disconnect();
    expect(disconnected).toBe(true);
  });
});
```

### 4. 测试覆盖率

确保新代码的测试覆盖率不低于 80%：

```bash
# 生成覆盖率报告
npm run test:coverage

# 查看覆盖率阈值
npm run test:check-coverage
```

### 5. 性能测试

```typescript
// tests/performance/bluetooth-connection.test.ts
describe('Bluetooth Connection Performance', () => {
  it('should connect within acceptable time', async () => {
    const startTime = performance.now();

    await bluetoothService.connect();

    const endTime = performance.now();
    const duration = endTime - startTime;

    expect(duration).toBeLessThan(5000); // 5秒内连接
  });

  it('should handle concurrent connections', async () => {
    const promises = Array(10).fill(0).map(() =>
      bluetoothService.connect()
    );

    const results = await Promise.allSettled(promises);
    const successful = results.filter(r => r.status === 'fulfilled');

    expect(successful.length).toBeGreaterThan(5); // 至少一半成功
  });
});
```

## 📚 文档贡献

### 1. 文档类型

- **API 文档**: 接口说明和参数定义
- **用户指南**: 使用教程和最佳实践
- **开发文档**: 架构设计和开发流程
- **示例代码**: 实际使用案例和演示
- **故障排除**: 常见问题和解决方案

### 2. 文档规范

```markdown
# 文档标题

简要描述文档内容。

## 目录

- [章节1](#章节1)
- [章节2](#章节2)

## 章节1

### 子章节

#### 要点

- 使用清晰的语言
- 提供代码示例
- 包含实际用例

```typescript
// 代码示例
const printer = createBluetoothPrinter();
await printer.initialize();
```

> **提示**: 重要提示信息使用引用格式

### 表格

| 参数 | 类型 | 说明 | 必需 |
|------|------|------|------|
| timeout | number | 超时时间(ms) | 否 |

### 注意事项

- ⚠️ **警告**: 可能导致问题的地方
- 💡 **提示**: 有用的建议
- 📝 **注意**: 需要特别注意的地方
```

### 3. 示例代码规范

```typescript
// ✅ 完整的示例
import { createBluetoothPrinter } from 'taro-bluetooth-print';

async function printReceipt() {
  // 创建打印实例
  const printer = createBluetoothPrinter({
    printer: {
      paperWidth: 58,
      density: 8
    }
  });

  try {
    // 初始化
    await printer.initialize();

    // 连接设备
    const devices = await printer.scanDevices();
    if (devices.length === 0) {
      throw new Error('No devices found');
    }

    await printer.connect(devices[0].deviceId);

    // 打印内容
    await printer.printText('Hello, World!');

  } catch (error) {
    console.error('Printing failed:', error);
  } finally {
    // 清理资源
    await printer.dispose();
  }
}
```

## 📥 提交规范

### 1. 提交信息格式

使用 [Conventional Commits](https://www.conventionalcommits.org/zh-hans/v1.0.0/) 规范：

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### 2. 提交类型

| 类型 | 说明 | 示例 |
|------|------|------|
| `feat` | 新功能 | `feat(bluetooth): 添加自动重连功能` |
| `fix` | Bug 修复 | `fix(printing): 修复打印乱码问题` |
| `docs` | 文档更新 | `docs(api): 更新连接方法文档` |
| `style` | 代码格式 | `style: 修复 ESLint 警告` |
| `refactor` | 重构 | `refactor(adapter): 重构蓝牙适配器` |
| `test` | 测试 | `test(unit): 添加连接服务测试` |
| `chore` | 构建/工具 | `chore: 更新依赖包版本` |
| `perf` | 性能优化 | `perf(scanner): 优化设备扫描性能` |
| `ci` | CI/CD | `ci: 添加自动化测试流水线` |

### 3. 提交示例

```bash
# 功能提交
git commit -m "feat(bluetooth): 添加设备自动发现功能

- 实现设备过滤功能
- 添加设备状态缓存
- 优化扫描性能"

# Bug 修复提交
git commit -m "fix(printing): 修复图片打印失真问题

- 调整图像处理算法
- 修复内存泄漏
- 添加错误处理"

# 文档提交
git commit -m "docs(guide): 添加快速开始指南

- 新增基础使用示例
- 添加常见问题解答
- 更新安装说明"
```

### 4. Pull Request 标题

PR 标题应该遵循提交信息格式：

```markdown
feat(bluetooth): 添加设备自动重连功能

### 变更内容
- 实现连接状态监控
- 添加重连策略配置
- 优化连接失败处理

### 测试
- [x] 单元测试通过
- [x] 集成测试通过
- [x] 手动测试验证

### 检查清单
- [x] 代码符合项目规范
- [x] 测试覆盖率达标
- [x] 文档已更新
- [x] 无破坏性变更
```

## 🤝 社区行为准则

### 我们的承诺

为了营造一个开放和友好的环境，我们承诺：

- 使用友好和包容的语言
- 尊重不同的观点和经验
- 优雅地接受建设性批评
- 关注对社区最有利的事情
- 对其他社区成员表示同理心

### 不可接受的行为

- 使用性别化语言或图像，以及不受欢迎的性关注或性骚扰
- 恶意评论、侮辱/贬损评论，以及人身或政治攻击
- 公开或私下的骚扰
- 未经明确许可，发布他人的私人信息
- 在专业环境中可能被认为不适当的其他行为

### 执行

项目维护者有权利和责任删除、编辑或拒绝与本行为准则不符的评论、提交、代码、wiki 编辑、问题和其他贡献，或者暂时或永久禁止任何他们认为有不适当、威胁、冒犯或有害行为的贡献者。

## 📞 获取帮助

### 问题报告

如果您遇到问题：

1. **查看文档**: 首先查看 [文档](docs/)
2. **搜索 Issues**: 搜索 [现有问题](https://github.com/your-org/taro-bluetooth-print/issues)
3. **创建 Issue**: 如果问题未被报告，创建新的 Issue
4. **联系维护者**: 通过邮件或社交媒体联系项目维护者

### 技术讨论

- **GitHub Discussions**: [参与讨论](https://github.com/your-org/taro-bluetooth-print/discussions)
- **开发者群组**: 加入我们的开发者交流群
- **技术分享**: 参与我们的技术分享会

### 社交媒体

- **Twitter**: [@ProjectHandle](https://twitter.com/ProjectHandle)
- **博客**: [项目博客](https://blog.example.com)
- **视频教程**: [YouTube 频道](https://youtube.com/c/ProjectHandle)

## 🎉 贡献者认可

### 贡献者列表

我们使用 [All Contributors](https://allcontributors.org/) 规范来认可所有贡献者：

- 💻 代码贡献
- 📖 文档贡献
- 🐛 Bug 报告
- 💡 想法和建议
- 🤔 问答支持
- 🎨 设计贡献
- 📢 推广贡献

### 成为维护者

对于持续贡献的开发者，我们邀请成为项目维护者：

1. **持续贡献**: 在过去 6 个月内有多于 10 次有效贡献
2. **代码质量**: 提交的代码质量高，通过所有测试
3. **社区参与**: 积极参与社区讨论和代码审查
4. **责任心**: 对项目有责任心，愿意长期投入

### 贡献统计

查看 [贡献统计页面](https://github.com/your-org/taro-bluetooth-print/graphs/contributors) 了解项目贡献情况。

## 📄 许可证

通过贡献代码，您同意您的贡献将在 [MIT 许可证](LICENSE) 下授权。

---

## 🙏 感谢

感谢所有为 Taro Bluetooth Print 项目做出贡献的开发者！您的努力让这个项目变得更好。

### 特别感谢

- **Taro 团队**: 提供优秀的跨平台开发框架
- **社区成员**: 提供宝贵的反馈和建议
- **测试用户**: 帮助发现和修复问题
- **文档贡献者**: 改进项目文档和示例

---

*最后更新时间: 2024年10月27日*