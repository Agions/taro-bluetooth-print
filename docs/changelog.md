---
outline: [2, 3]
---

# 更新日志

所有重要的项目变更都会记录在此文件中。

本项目遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/) 规范，并使用 [Semantic Versioning](https://semver.org/lang/zh-CN/) 进行版本管理。

## [2.9.2] - 2026-04-13

### 修复

- **Container.ts**: 修复 `injectable` 装饰器类型断言，使用 `unknown` 中转解决 TypeScript 严格模式下的类型转换错误

### 文档

- 完善 API 文档完整性
- 补充缺失的文档页面

## [2.9.1] - 2026-04-13

### 修复

- **Container.ts**: 解决 lint 错误，包括 Prettier 格式化和不必要的 `any` 类型声明

## [2.9.0] - 2026-04-13

### 架构升级

- **依赖注入容器**: 新增 `Container` 类，支持构造函数注入、工厂函数注入、实例注入
- **事件总线**: 新增 `EventBus` 类，实现应用内组件通信
- **插件系统**: 新增 `PluginManager`，支持插件生命周期管理
- **ServiceProvider**: 新增 `ServiceProvider` 模块，统一管理所有服务注册

### 新增功能

- `Container.register()` / `registerSingleton()` / `registerType()` / `registerInstance()` - 多种注册方式
- `Container.resolve()` / `resolveAll()` - 服务解析
- 装饰器支持：`@injectable()` / `@inject(token)`

### 测试覆盖率提升

- DeviceManager: 0% → 47.7%
- PrintQueue: 0% → 60.3%
- OfflineCache: 0% → 71.7%
- OutputLimiter: 新增测试套件

## [2.8.4] - 2026-04-05

### 修复

- `image.ts`: 添加 TypeScript strict mode non-null assertions，解决 `noUncheckedIndexedAccess` 警告

### 性能优化

- `image.ts`: 移除 TypedArray 访问上的冗余 `?? 0` / `?? 255` 操作符

## [2.8.3] - 2026-04-04

### 性能优化

- `image.ts`: 移除 TypedArray 访问上的冗余操作符
- gzip 体积：225.96 KB → 225.79 KB（-0.17 KB）

## [2.8.0] - 2026-04-02

### 新增

- **XprinterDriver**: 芯烨打印机驱动
- **SprtDriver**: 思普瑞特打印机驱动
- **QRCodeDiscoveryService**: 二维码打印机配对服务
- **CloudPrintManager**: WebSocket 云打印管理器

## [2.7.0] - 2026-03-31

### 新增

- **PrintScheduler**: 定时打印调度器
- **DiscoveryService**: 增强型蓝牙设备发现服务

## [2.6.0] - 2026-03-27

### 首次正式发布

- 完整的蓝牙打印解决方案
- 多平台支持：微信小程序、H5、鸿蒙系统
- 多协议支持：ESC/POS、TSPL、ZPL、CPCL、STAR
