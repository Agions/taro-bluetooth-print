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

#### `setOptions(options: IAdapterOptions): this`

Sets adapter configuration options.

- `chunkSize`: Size of data chunks (default: 20).
- `delay`: Delay between chunks in ms (default: 20).
- `retries`: Number of retries on write failure (default: 0).

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

#### `qr(content: string, options?: IQrOptions): this`

Prints a QR code.
- `content`: The QR code content.
- `options`:
  - `model`: 1 or 2 (default: 2).
  - `size`: Module size 1-16 (default: 6).
  - `errorCorrection`: 'L', 'M', 'Q', 'H' (default: 'M').

#### `print(): Promise<void>`

Sends all queued commands to the printer.

#### `pause(): void`

Pauses the current print job.

#### `resume(): Promise<void>`

Resumes a paused print job.

#### `cancel(): void`

Cancels the current print job and clears the queue.

#### `remaining(): number`

Returns the number of bytes remaining in the current job or queue.
