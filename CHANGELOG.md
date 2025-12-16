# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
