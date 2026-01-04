# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.2.0] - 2026-01-04

### Added

- **设备管理器 (DeviceManager)** - 蓝牙设备扫描和管理功能
  - 支持设备过滤（名称、服务UUID）
  - 设备发现事件监听
  - 已配对设备管理

- **打印队列 (PrintQueue)** - 打印任务队列管理
  - 优先级排序（LOW/NORMAL/HIGH/URGENT）
  - FIFO 处理机制
  - 失败自动重试
  - 队列暂停/恢复/清空

- **离线缓存 (OfflineCache)** - 断网时自动缓存打印任务
  - 本地存储持久化
  - 任务过期清理
  - 重连后自动同步

- **模板引擎 (TemplateEngine)** - 收据和标签模板渲染
  - 内置收据模板（店铺信息、商品列表、支付信息）
  - 内置标签模板（商品名称、价格、条码）
  - 变量替换和条件渲染
  - 模板验证功能

- **条码生成器 (BarcodeGenerator)** - 多格式条码支持
  - Code128、Code39、EAN-13、EAN-8、UPC-A 格式
  - 条码内容验证
  - 可配置高度、宽度、文字位置

- **文本格式化器 (TextFormatter)** - ESC/POS 文本格式化
  - 对齐方式（左/中/右）
  - 字体缩放（1-8倍）
  - 粗体、下划线、反白样式

- **预览渲染器 (PreviewRenderer)** - 打印预览功能
  - ESC/POS 命令解析
  - 渲染为 Base64 图像
  - 支持文本、条码、二维码预览

- **Web Bluetooth 适配器 (WebBluetoothAdapter)** - H5 环境支持
  - 浏览器兼容性检测
  - 设备请求和选择
  - 完整的连接/断开/写入功能

- **连接稳定性增强**
  - 心跳检测机制
  - 自动重连（可配置重试次数和间隔）
  - 自适应传输参数（动态调整分片大小和延迟）

- **BluetoothPrinter 新方法**
  - `align(alignment)` - 设置文本对齐
  - `setSize(width, height)` - 设置字体大小
  - `setBold(enabled)` - 设置粗体
  - `setUnderline(enabled)` - 设置下划线
  - `resetStyle()` - 重置样式
  - `barcode(content, format, options)` - 打印条码

- **编码服务 (EncodingService)** - 完整的中文编码支持
  - GBK、GB2312、Big5、UTF-8 编码
  - 编码自动检测
  - 不支持字符的替代处理

### Changed

- 更新了 `src/index.ts`，导出所有新模块
- 更新了 `AdapterFactory`，支持 Web Bluetooth 平台
- 增强了 `ConnectionManager`，支持心跳和自动重连
- 更新了 API 文档和 README，添加新功能说明

### Fixed

- 修复了格式化相关的 lint 错误

## [2.1.2] - 2025-12-16

### Added

- 增强了弱网适配功能，支持动态分片大小调整
- 实现了指数退避重试策略和智能超时处理
- 添加了断点续传功能，支持作业ID生成与管理
- 实现了作业状态保存与加载机制
- 增强了图片处理功能，支持多种抖动算法（Floyd-Steinberg、Atkinson）
- 添加了图片对比度和亮度调整功能

### Changed

- 优化了灰度转换和缩放算法，提高图片处理性能
- 更新了TypeScript配置，移除无效设置
- 更新了npm依赖到最新兼容版本
- 优化了代码结构，提高了代码质量

### Fixed

- 修复了测试中缺少reflect-metadata的问题
- 修复了TypeScript编译错误
- 确保了所有异步操作都有正确的清理机制

## [2.1.1] - 2025-12-02

### Added

- Encoding类添加了配置选项，支持禁用GBK编码警告
- Logger类添加了自定义日志处理选项
- EventEmitter类添加了prepend和prependOnce方法
- EventEmitter类添加了emitAsync方法，支持异步事件处理
- EventEmitter类添加了getListeners和eventNames方法

### Changed

- 优化了Encoding类的警告机制，只在第一次使用时显示警告
- 改进了Logger类的日志格式，保持与测试期望一致
- 增强了EventEmitter类的API灵活性
- 提高了代码质量，减少了any类型的使用

### Fixed

- 修复了Jest未正常退出问题，添加了定时器清理逻辑
- 修复了TypeScript编译错误
- 修复了变量赋值前使用的问题
- 修复了重复标识符问题
- 确保了所有异步操作都有正确的清理机制

## [2.1.0] - 2025-11-25

### Added

- 支持支付宝小程序平台
- 支持百度小程序平台
- 支持字节跳动小程序平台
- 实现了平台自动检测机制
- 新增了AdapterFactory用于自动选择适配器
- 新增了BaseAdapter基类，提供通用功能
- 完善了平台检测工具

### Changed

- 优化了BluetoothPrinter类，使其使用AdapterFactory自动选择适配器
- 更新了README.md，添加了跨平台支持信息
- 优化了构建配置，提高了构建效率

### Fixed

- 修复了TypeScript错误
- 修复了测试用例中的问题
- 优化了代码结构，提高了代码可读性

## [2.0.3] - 2025-11-22

### Changed

- 优化了构建配置
- 完善了文档

## [2.0.2] - 2025-11-21

### Fixed

- 修复了部分TypeScript错误

## [2.0.1] - 2025-11-21

### Changed

- 优化了代码结构
- 完善了文档

## [2.0.0] - 2025-10-25

### Added

- 全新的架构设计
- 支持断点续传
- 支持弱网适配
- 支持图片打印
- 支持二维码打印
- 完善的事件系统
- 详细的文档

### Changed

- 重写了核心代码
- 优化了API设计
- 提高了性能和可靠性

## [1.0.0] - 2025-03-01

### Added

- 初始版本
- 基本的蓝牙打印功能
- 支持微信小程序
