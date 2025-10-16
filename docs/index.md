---
page: true
title: Taro Bluetooth Print
description: 基于 Taro 的蓝牙打印机库
---

# Taro Bluetooth Print

<div align="center">

**基于 Taro 的蓝牙打印机库**

支持微信小程序、H5、React Native 等多平台的蓝牙打印功能

[![npm version](https://badge.fury.io/js/taro-bluetooth-print.svg)](https://badge.fury.io/js/taro-bluetooth-print)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-blue.svg)](https://www.typescriptlang.org/)

[快速开始](/guide/getting-started) • [API 文档](/api/) • [示例](/examples/) • [更新日志](/reference/changelog)

</div>

## ✨ 特性

- 🚀 **多平台支持**: 微信小程序、H5、React Native 等多端兼容
- 📱 **蓝牙管理**: 完整的蓝牙设备连接、管理、监控功能
- 🖨️ **打印支持**: 文本、图片、条码、二维码等多种打印格式
- 🎯 **TypeScript**: 完整的 TypeScript 类型定义和智能提示
- 📦 **现代构建**: 支持 Vite、webpack 等现代构建工具
- 🌳 **Tree-shaking**: 支持按需加载，减少包体积
- 📚 **完善文档**: 详细的 API 文档和使用示例

## 📦 安装

```bash
# npm
npm install taro-bluetooth-print

# yarn
yarn add taro-bluetooth-print

# pnpm
pnpm add taro-bluetooth-print
```

## 🚀 快速开始

```typescript
import { BluetoothPrinter } from "taro-bluetooth-print"

// 创建打印机实例
const printer = new BluetoothPrinter()

// 连接蓝牙设备
await printer.connect()

// 打印文本
await printer.printText("Hello, World!")

// 打印图片
await printer.printImage("/path/to/image.png")

// 断开连接
await printer.disconnect()
```

## 📖 文档

- [快速开始](/guide/getting-started) - 5 分钟上手指南
- [API 参考](/api/) - 完整的 API 文档
- [示例代码](/examples/) - 实际使用案例
- [常见问题](/reference/faq) - 常见问题解答

## 🏗️ 构建工具支持

本库已针对现代构建工具进行了优化，支持：

- ✅ **Vite** - 推荐的主构建工具，提供最快的开发体验和最优的构建结果
- ✅ **webpack** - 企业级应用构建工具，提供额外的兼容性支持
- ✅ **TypeScript** - 完整的类型支持和智能提示
- ✅ **Tree-shaking** - 支持按需加载，优化包体积

## 🤝 贡献

欢迎贡献代码！请查看 [贡献指南](/reference/contributing) 了解详情。

## 📄 许可证

[MIT](https://github.com/Agions/taro-bluetooth-print/blob/main/LICENSE)

---

<div align="center">

Made with ❤️ by Agions

</div>
