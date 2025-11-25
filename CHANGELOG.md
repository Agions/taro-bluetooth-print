# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

## [2.0.2] -  2025-11-21

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
