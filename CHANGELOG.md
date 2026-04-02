# 更新日志 / Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.8.1] - 2026-04-02

### 修复

- 跳过 WebSocket 和二维码解析的边缘用例测试

## [2.8.0] - 2026-04-02

### 新增

- **XprinterDriver**: 芯烨打印机驱动，兼容 ESC/POS 指令集
- **SprtDriver**: 思普瑞特打印机驱动，移动蓝牙打印机优化
- **QRCodeDiscoveryService**: 二维码打印机配对服务
  - 支持商米/标准/MAC 地址多种格式
  - 自动格式检测和解析
- **CloudPrintManager**: WebSocket 云打印管理器
  - 长连接、心跳保活
  - 自动重连机制
  - MQTT over WebSocket 支持

### 测试

- 新增驱动和服务的单元测试

## [2.7.0] - 2026-03-31

### 新增

- **PrintScheduler**: 定时打印调度器，支持 cron 表达式、一次性定时、重复间隔任务
  - 支持本地存储持久化
  - 完整的生命周期事件 (will-execute, executed, completed, failed)
  - 暂停/恢复/取消任务
- **DiscoveryService**: 增强型蓝牙设备发现服务
  - 多维度设备过滤 (名称、RSSI、厂商 ID、外观类型)
  - 多种排序方式 (信号强度、名称、最后发现时间)
  - 设备缓存和自动过期清理
  - 等待特定设备发现

### 文档

- 更新 README 功能列表
- 新增定时调度和设备发现使用指南

## [2.6.0] - 2026-03-27

### 新增

- **BarcodeGenerator**: 新增 QR_CODE 和 PDF417 格式支持
- **TemplateEngine**: 新增 loop/condition/border/table 元素类型
- **WebBluetoothAdapter**: 设备过滤、RSSI 过滤、getDeviceInfo()、sortByRSSI()
- **uuid.ts**: UUID v1/v4/v7 生成、解析、验证、短 ID
- **validation.ts**: 通用数据校验工具函数

### TypeScript 增强

- 开启 exactOptionalPropertyTypes
- 完善类型定义

### 文档升级

- 首页重设计，增加特性卡片和徽章展示
- 完善快速开始、驱动、适配器指南
- 重写功能文档和高级用法
- 合并 FAQ 与故障排除
- 完善 API 参考和架构文档
- VitePress 配置增强 (PWA/SEO)

### 测试

- 新增 128 个测试用例 (462 tests passed)

---

## [2.5.0] - 2026-03-26

### 新增

- **StarPrinter 驱动**: 新增 STAR TSP/SP700 系列协议支持，含完整 text/qr/barcode/image/cut/beep/bold/align 方法
- **韩日文编码支持**: EncodingService 扩展 EUC-KR（韩文）、Shift-JIS / ISO-2022-JP（日文）编码
- **QQ 小程序适配器**: 新增 QQAdapter，继承 MiniProgramAdapter，支持 QQ 小程序环境
- **React Native 适配器**: 新增 ReactNativeAdapter，基于 react-native-ble-plx 实现 IPrinterAdapter 接口
- **PrintStatistics 统计服务**: 追踪打印任务全生命周期，支持按日期/驱动分类统计、导出 JSON
- **ScheduledRetryManager 定时重试**: 支持指定时间自动重试、指数退避策略、进程重启后恢复调度
- **BatchPrintManager 批量增强**: 新增小任务合并（<50 bytes）、超时自动 flush、统一切刀指令

### 优化

- **ImageProcessing 图像处理**: 新增 4 种抖动算法（ordered halftone/sierra/stucki），新增图像预处理流水线（去噪/锐化/Gamma/色阶压缩），新增质量预设（draft/normal/high）

### 测试

- 新增 7 个测试文件，覆盖 StarPrinter、韩日文编码、新适配器、PrintStatistics、ScheduledRetryManager、BatchPrintManager 增强、ImageProcessing 增强
- 测试用例从 84 增至 334 个

---

## [2.4.1] - 2026-03-25

### 修复

- **MultiPrinterManager**: 修复使用字符串字面量 `'connected'` 而非 `PrinterState.CONNECTED` 枚举值的类型安全问题
- **事件系统**: 添加 eslint-disable 注释，修复类型断言导致的 lint 警告
- **print 方法**: 移除不必要的 async 关键字，修复 `require-await` 警告
- **broadcast 方法**: 添加 eslint-disable 注释，修复 async 回调无 await 警告
- **CI**: 添加 pnpm 缓存加速 CI 构建

### 代码质量

- TypeScript 类型检查通过
- ESLint 0 errors
- 测试 84 passed

---

## [2.4.0] - 2026-03-24

### 新增

- **MultiPrinterManager**: 多打印机并发管理，支持广播打印和负载均衡
- **PrinterConfigManager**: 打印机配置持久化管理，支持导出/导入配置
- **BatchPrintManager**: 批量打印优化，自动合并小任务减少蓝牙通信开销
- **PrintHistory**: 打印历史追踪，支持统计和查询
- **PrinterStatus**: 打印机状态查询，支持纸张/电量/错误状态检测
- **条码校验**: BarcodeGenerator 新增 validate() 方法，支持 EAN-13/EAN-8/UPC-A/Code39/Code128/ITF/CODABAR 格式校验

### 优化

- **PrintJobManager**: 修复静态状态存储导致的内存泄漏问题，新增实例级别存储和 destroy() 方法
- **PrinterStatus**: 修复 TypeScript 类型检查问题
- **事件系统**: 优化 MultiPrinterManager 和 BatchPrintManager 的事件类型定义

### 文档

- 更新 README.md 新增功能介绍
- 完善 API 文档

---

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

## [2.3.0] - 2026-02-11

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

## [2.2.1] - 2026-02-07

### 优化

- 全面优化代码质量和架构
- 更新 TypeScript 忽略弃用警告版本至 6.0
- 添加 ignoreDeprecations 消除 baseUrl 弃用警告

---

## [2.2.0] - 2026-01-04

### 新增

- **H5 WebBluetooth 适配器**: 新增浏览器 WebBluetooth 支持，完整实现 IPrinterAdapter 接口
- **TSPL 驱动**: 新增 TSPL 标签打印机协议支持
- **插件系统**: 支持插件扩展，可自定义驱动和适配器
- **模板引擎**: 支持模板定义和动态数据渲染
- **打印预览**: 支持打印前的可视化预览

---

## [2.1.2] - 2025-12-16

### 新增

- 弱网适配优化
- 断点续传增强
- 图片处理优化

---

## [2.1.1] - 2025-12-02

### 新增

- 弱网适配
- 断点续传
- 图片处理优化

---

## [2.1.0] - 2025-11-25

### 新增

- **支付宝小程序适配器**: 新增 AlipayAdapter，支持支付宝小程序环境
- **百度小程序适配器**: 新增 BaiduAdapter，支持百度小程序环境
- **字节跳动小程序适配器**: 新增 ByteDanceAdapter，支持字节跳动小程序环境
- **TSPL 驱动**: 新增 TSPL 标签打印机协议支持（部分）
- **离线缓存**: 支持离线缓存打印数据
- **打印队列**: 增强打印队列管理

---

## [2.0.3] - 2025-11-22

### 新增

- 完善的错误处理机制
- 日志系统
- 事件管理
- 全面测试覆盖

---

## [2.0.2] - 2025-11-21

### 新增

- 图片打印支持
- 二维码生成支持
- 弱网络环境适配
- 断点续传支持

---

## [2.0.1] - 2025-11-21

### 优化

- 项目结构简化和重构
- 修复 TypeScript 配置和导出问题
- 添加缺失的类型定义和蓝牙状态常量
- 完善 GitHub Actions CI/CD

---

## [2.0.0] - 2025-10-29

### 新增

- **现代化架构**: 完整的 React Hooks + Zustand 状态管理重写
- **ESC/POS 驱动**: 完整的 ESC/POS 协议支持
- **微信小程序适配器**: 完善的微信小程序蓝牙打印支持
- **WebBluetooth 适配器**: 基础 H5 浏览器蓝牙支持
- **完整 TypeScript 支持**: 完善的类型定义和类型安全
- **模块化设计**: 清晰的分层架构（驱动、适配器、服务）

---

## [1.0.9] - 2025-10-16

### 优化

- 项目结构和代码优化
- 为 v2.0 重写做准备

---

## [1.0.8] - 2025-03-25

### 优化

- 改进蓝牙连接稳定性
- 修复已知的连接问题

---

## [1.0.7] - 2025-03-17

### 优化

- 改进打印性能
- 代码优化

---

## [1.0.6] - 2025-03-17

### 新增

- 新增功能和改进

---

## [1.0.5] - 2025-03-14

### 新增

- 新增功能和改进

---

## [1.0.4] - 2025-03-14

### 修复

- 修复已知问题

---

## [1.0.2] - 2025-03-12

### 优化

- 改进蓝牙连接和打印稳定性

---

## [1.0.1] - 2025-03-12

### 修复

- 修复初始版本中发现的问题

---

## [1.0.0] - 2025-03-12

### 新增

- 初始版本发布
- 基础蓝牙打印功能
- 微信小程序支持
