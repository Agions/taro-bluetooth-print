# taro-bluetooth-print 优化待办清单

> 生成时间: 2026-02-07  
> 基于版本: v2.2.0  
> 状态: 8 测试文件，54 测试用例全部通过，tsc --noEmit 无错误

---

## P0 (必须修) — 影响功能正确性的 Bug

### P0-1: EventEmitter.emitAsync 未真正等待异步 handler

- **问题描述**: `emitAsync` 方法中，handler 的返回值（可能是 Promise）没有被 `await`。当前实现将 `handler(data)` 调用放在 `new Promise<void>(resolve => { ... resolve() })` 中，handler 同步调用后立刻 `resolve()`，如果 handler 返回 Promise，该 Promise 会被忽略。
- **影响范围**: 所有依赖 `emitAsync` 保证异步 handler 完成后再继续的逻辑。当前代码中 `emitAsync` 未在核心流程中直接使用，但作为公开 API，调用者可能依赖其语义正确性。
- **修复方案**: 将 handler 的调用结果（可能是 Promise）用 `await` 等待，或用 `Promise.resolve(handler(data))` 包装后再 resolve。
- **预估工作量**: 10 分钟

### P0-2: PrintJobManager.loadJobState 存在 unreachable code

- **问题描述**: `loadJobState` 方法中 `throw new Error(...)` 后面有大量注释代码（被注释的 localStorage 逻辑），虽不影响运行，但 `throw` 导致后面的代码永远不会执行。同时 `saveJobState` 也是空壳实现（只有日志和注释），导致断点续传的持久化功能实际不可用。
- **影响范围**: `resume(jobId)` 功能——传入 jobId 尝试从持久化存储恢复任务时永远会抛出错误。
- **修复方案**: 1) 移除 unreachable code；2) 明确在文档和代码注释中说明持久化存储需要用户自行实现（通过回调/hook），或提供默认的内存存储实现。
- **预估工作量**: 15 分钟

### P0-3: GBK 编码表严重不完整

- **问题描述**: `gbk-table.ts` 中只有约 400 个字符的手工映射（20 个标点 + 约 380 个 GB2312 一级汉字），而完整 GBK 有 21003 个字符，GB2312 一级就有 3755 个。README 声称"完整 GBK 支持"，但实际上大量常用中文字符（如"的"、"是"、"我"、"中"、"国"等高频字）会被编码为 '?'。
- **影响范围**: 所有使用 GBK 编码打印中文的场景。这是核心功能缺陷。
- **修复方案**: 使用脚本从标准 GBK 编码表生成完整的 Unicode↔GBK 映射。为控制文件体积，可将映射表压缩为二进制字符串或 base64 编码的紧凑格式，运行时解码。同时更新 README 描述。
- **预估工作量**: 1 小时（生成脚本 + 集成 + 测试）

### P0-4: PrintQueue.processQueue 用 void 忽略了 Promise 错误

- **问题描述**: `processQueue()` 方法签名为 `private processQueue(): void`，内部调用 `void this.executeJob(job).finally(...)` 忽略了 Promise 的 rejection。如果 `executeJob` 在 `emit` 或其他非 try-catch 包裹的地方抛出异常，错误会变成 unhandled rejection。
- **影响范围**: 队列处理中的异常可能导致静默失败，且在 Node.js 中可能导致进程崩溃。
- **修复方案**: 将 `processQueue` 改为 `async`，或在 `void this.executeJob(job)` 后加 `.catch()` 错误处理。
- **预估工作量**: 10 分钟

---

## P1 (重要) — 代码质量、性能、架构优化

### P1-1: Adapter 代码重复严重（架构问题）

- **问题描述**: `AlipayAdapter`、`BaiduAdapter`、`ByteDanceAdapter` 与 `TaroAdapter` 的 `connect`、`disconnect`、`write`、`discoverServices` 方法代码几乎完全相同，唯一区别是使用的全局 API 对象不同（`my`/`swan`/`tt` vs `Taro`）。每个文件约 280 行，四个文件共计 ~1120 行高度重复代码。
- **影响范围**: 维护成本极高——任何 bug 修复或功能增强（如自适应传输）需要在 4 个文件中同步修改。
- **修复方案**: 
  1. 在 `BaseAdapter` 中定义统一的 BLE API 接口 `MiniProgramBLEApi`
  2. 将 `connect`/`disconnect`/`write`/`discoverServices` 的完整实现移到 `BaseAdapter`（通过 `protected abstract getApi()` 获取平台 API）
  3. 各子类只需实现 `getApi()` 返回对应的全局对象引用
  4. WebBluetoothAdapter 由于 API 差异较大，保持独立实现
- **预估工作量**: 1 小时

### P1-2: 自适应传输逻辑仅 TaroAdapter 有

- **问题描述**: `TaroAdapter.write()` 中实现了动态调整 `chunkSize`/`delay` 的自适应传输逻辑（基于成功/失败计数动态调整），但 `AlipayAdapter`/`BaiduAdapter`/`ByteDanceAdapter` 的 `write()` 只有固定的 chunkSize 传输。
- **影响范围**: 非微信平台（支付宝/百度/字节）的弱网环境打印稳定性较差。
- **修复方案**: 随 P1-1 一起解决——将自适应传输逻辑统一到 BaseAdapter.write() 中。
- **预估工作量**: 包含在 P1-1 中

### P1-3: CommandBuilder.getBuffer() 无缓存

- **问题描述**: `getBuffer()` 每次调用都重新计算总长度并合并所有 buffer 片段。如果在打印前多次调用 `getBuffer()`（例如获取总长度、实际打印），会重复执行 O(n) 合并操作。
- **影响范围**: 性能影响——对于包含大量命令（如长收据、多图片）的打印任务，多次调用会产生不必要的内存分配和拷贝。
- **修复方案**: 添加 `_cachedBuffer` 属性，在 buffer 数组未变更时返回缓存。任何修改 buffer 的操作（text/feed/cut/image 等）时清除缓存。
- **预估工作量**: 15 分钟

### P1-4: PreviewRenderer 中 Alignment 类型未验证

- **问题描述**: `parseCommands` 中 `state.alignment = commands[i + 2] as Alignment` 直接将字节值强转为 Alignment 枚举，未验证值是否在 {0, 1, 2} 范围内。非法值会导致渲染时对齐逻辑不可预期。
- **影响范围**: 解析格式错误的 ESC/POS 数据时可能产生渲染异常。
- **修复方案**: 添加范围检查，非法值回退到 `Alignment.LEFT`。
- **预估工作量**: 5 分钟

### P1-5: PrintJobManager 构造函数中的 as unknown as 强制转换

- **问题描述**: 构造函数中 `this.adapter = { ... } as unknown as IPrinterAdapter` 绕过了类型检查，创建了一个不完整的 adapter mock。
- **影响范围**: 类型安全缺失——如果 `IPrinterAdapter` 接口增加新方法，这里不会报编译错误。
- **修复方案**: 保留向后兼容逻辑，但使用更安全的方式：创建一个抛出明确错误的 NoOpAdapter 类，或将 adapter 类型改为 `IPrinterAdapter | null` 并在使用时检查。
- **预估工作量**: 10 分钟

---

## P2 (改进) — 测试覆盖、文档

### P2-1: 缺少关键模块的单元测试

- **问题描述**: 以下核心模块缺少测试：
  - `ConnectionManager` — 连接管理、心跳、自动重连
  - `CommandBuilder` — 命令构建、链式调用、缓冲区合并
  - `PrintQueue` — 队列管理、优先级、重试
  - `TextFormatter` — 文本格式化、ESC/POS 命令生成
  - `BarcodeGenerator` — 条码生成
  - `DeviceManager` — 设备扫描管理
  - `OfflineCache` — 离线缓存
- **影响范围**: 测试覆盖率不足，重构风险高。
- **修复方案**: 为以上模块编写单元测试，重点覆盖核心逻辑和边界情况。
- **预估工作量**: 3-4 小时

### P2-2: README API 表格重复

- **问题描述**: BluetoothPrinter API 表格中 `qr`/`cut`/`setOptions`/`print`/`pause`/`resume`/`cancel`/`remaining` 方法各出现了两次。
- **影响范围**: 文档质量。
- **修复方案**: 删除重复行。
- **预估工作量**: 2 分钟

### P2-3: README 声称"完整 GBK 支持"需要修正

- **问题描述**: 在 GBK 表完善之前，README 中不应声称完整 GBK 支持。
- **影响范围**: 用户预期与实际功能不符。
- **修复方案**: 随 P0-3 一起修正。完善 GBK 表后可保留声称。
- **预估工作量**: 包含在 P0-3 中
