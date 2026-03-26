# 更新日志 / Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

## [2.4.1] - 2026-03-24

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
