# Core Concepts

## Architecture

Taro Bluetooth Print is built with a modular architecture:

- **Core**: Handles connection management and the print queue.
- **Adapters**: Platform-specific implementations (e.g., Taro, Web Bluetooth).
- **Drivers**: Protocol implementations (e.g., ESC/POS, TSPL).

## Drivers

Drivers are responsible for converting high-level commands (like `text()` or `image()`) into the raw byte commands understood by the printer.

Currently, the library comes with a built-in **ESC/POS** driver, which is the standard for most thermal receipt printers.

## Adapters

Adapters bridge the gap between the library and the underlying platform's Bluetooth API. The default `TaroAdapter` uses `Taro.openBluetoothAdapter` and related APIs.
