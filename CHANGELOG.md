# 更新日志 / Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.3.1] - 2026-03-21

### 优化

- **打包**: 优化打包体积 -87%，编码数据懒加载
- **CI/CD**: 更新 GitHub Actions workflows，替换已弃用的 actions

### 修复

- 修复 EventEmitter lint 警告
- 修复 lint 错误和 CI 问题

### 新增

- **驱动**: 添加 GPrinterDriver 佳博驱动
- **测试**: 添加驱动单元测试

---

## [2.3.0] - 2024-03-18

### 新增

- **驱动**: 新增 ZplDriver (斑马标签打印机)
- **驱动**: 新增 CpclDriver (CPCL 移动打印机)
- **适配器**: 新增 HarmonyOSAdapter (鸿蒙系统)
- **示例**: 新增微信小程序完整示例
- **示例**: 新增 H5 WebBluetooth 示例
- **示例**: 新增鸿蒙 HarmonyOS 示例
- **示例**: 新增 React Native 示例
- **文档**: 新增驱动使用指南
- **文档**: 新增平台适配器文档
- **文档**: 完善快速开始指南
- **文档**: 完善功能特性文档
- **文档**: 完善故障排除文档

### 优化

- **代码**: 添加 drivers/index.ts 模块导出
- **代码**: 添加 services/index.ts 服务层导出
- **代码**: 简化 src/index.ts 主入口
- **代码**: 修复 lint 格式问题

### 修复

- 修复文档中的问题
- 优化代码结构

---

## [2.2.0] - 2024-xx-xx

### 新增

- 模板引擎
- 打印预览
- 插件系统
- 文本格式化

---

## [2.1.0] - 2024-xx-xx

### 新增

- TSPL 驱动
- 离线缓存
- 打印队列

---

## [2.0.0] - 2024-xx-xx

### 新增

- 完整的 ESC/POS 支持
- 微信/支付宝/百度/字节小程序适配器
- WebBluetooth 适配器
- 完整的 TypeScript 支持

---

## [1.x] - 早期版本

初始版本，仅支持基础打印功能。
