# 核心概念

## 架构设计

Taro Bluetooth Print 采用模块化架构设计，主要包含以下三个部分：

- **Core (核心层)**: 负责连接管理、打印队列维护、事件分发以及断点续传逻辑。
- **Adapters (适配器层)**: 负责与具体平台的蓝牙 API 进行交互（例如 Taro、Web Bluetooth）。
- **Drivers (驱动层)**: 负责将高层指令（如 `text()` 或 `image()`）转换为打印机能够理解的底层字节指令（例如 ESC/POS）。

## 驱动 (Drivers)

驱动层的作用是将业务指令转换为二进制数据流。

目前，本库内置了 **ESC/POS** 驱动，这是大多数热敏票据打印机通用的标准协议。

如果您需要支持其他协议（如标签打印机的 TSPL 或 CPCL），可以通过实现 `IPrinterDriver` 接口来扩展。

## 适配器 (Adapters)

适配器层抹平了不同平台蓝牙 API 的差异。

默认提供的 `TaroAdapter` 封装了 `Taro.openBluetoothAdapter` 及相关 API，专门用于 Taro 跨端开发框架。

如果您需要在纯 Web 环境或其他框架中使用，可以实现 `IPrinterAdapter` 接口来创建自定义适配器。
