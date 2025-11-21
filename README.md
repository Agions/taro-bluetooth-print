# Taro Bluetooth Print

A lightweight, high-performance Bluetooth printing library for Taro, designed for simplicity and ease of use.

## Features

*   **Simple API**: Fluent interface for building print commands.
*   **Cross-Platform**: Built on top of Taro's Bluetooth API, works on Weapp, H5, RN, etc.
*   **High Performance**: Direct byte buffer manipulation.
*   **Rich Support**: Text, Images, Barcodes (coming soon), QR Codes (coming soon).
*   **Extensible**: Modular driver architecture (ESC/POS included).

## Installation

```bash
npm install taro-bluetooth-print
# or
yarn add taro-bluetooth-print
```

## Usage

### Basic Example

```typescript
import { BluetoothPrinter } from 'taro-bluetooth-print';

const printer = new BluetoothPrinter();

async function printReceipt(deviceId: string) {
  try {
    await printer.connect(deviceId);

    await printer
      .text('Hello World!')
      .feed()
      .text('This is a test print.')
      .feed(2)
      .cut()
      .print();
      
    console.log('Print success');
  } catch (error) {
    console.error('Print failed', error);
  } finally {
    await printer.disconnect();
  }
}
```

### Printing Images

```typescript
// Assuming you have pixel data (RGBA) from a canvas or image
const imageData = new Uint8Array([...]); 
const width = 200;
const height = 100;

await printer
  .text('Image Print:')
  .feed()
  .image(imageData, width, height)
  .feed(2)
  .print();
```

## API Reference

### `BluetoothPrinter`

*   `connect(deviceId: string): Promise<this>`
*   `disconnect(): Promise<void>`
*   `text(content: string, encoding?: string): this`
*   `feed(lines?: number): this`
*   `cut(): this`
*   `image(data: Uint8Array, width: number, height: number): this`
*   `print(): Promise<void>`

## License

MIT
