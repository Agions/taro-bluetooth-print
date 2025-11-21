# API Reference

## BluetoothPrinter

The main class for interacting with Bluetooth printers.

### Constructor

```typescript
new BluetoothPrinter(adapter?: IPrinterAdapter, driver?: IPrinterDriver)
```

### Methods

#### `connect(deviceId: string): Promise<this>`

Connects to the specified Bluetooth device.

#### `disconnect(): Promise<void>`

Disconnects from the current device.

#### `text(content: string, encoding?: string): this`

Adds text to the print queue.
- `content`: The text to print.
- `encoding`: Optional encoding (default: 'GBK').

#### `feed(lines?: number): this`

Adds line feeds.
- `lines`: Number of lines to feed (default: 1).

#### `cut(): this`

Adds a paper cut command.

#### `image(data: Uint8Array, width: number, height: number): this`

Prints an image.
- `data`: RGBA pixel data.
- `width`: Image width.
- `height`: Image height.

#### `print(): Promise<void>`

Sends all queued commands to the printer.