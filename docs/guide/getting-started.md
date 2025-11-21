# Getting Started

## Installation

Install the package using npm or yarn:

```bash
npm install taro-bluetooth-print
# or
yarn add taro-bluetooth-print
```

## Basic Usage

Import the `BluetoothPrinter` class and create an instance:

```typescript
import { BluetoothPrinter } from 'taro-bluetooth-print';

const printer = new BluetoothPrinter();
```

### Connect and Print

```typescript
async function printReceipt(deviceId: string) {
  try {
    // 1. Connect to the printer
    await printer.connect(deviceId);

    // 2. Build and send commands
    await printer
      .text('Welcome to Taro Print!')
      .feed()
      .text('--------------------------------')
      .feed()
      .text('Item 1 .................... $10.00')
      .text('Item 2 .................... $20.00')
      .feed(2)
      .cut()
      .print();
      
    console.log('Print success');
  } catch (error) {
    console.error('Print failed', error);
  } finally {
    // 3. Always disconnect
    await printer.disconnect();
  }
}
```
