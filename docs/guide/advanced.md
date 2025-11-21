# Advanced Usage

## Custom Drivers

You can implement your own driver by adhering to the `IPrinterDriver` interface. This is useful if you need to support a non-standard printer or a different command set (like TSPL for label printers).

```typescript
import { IPrinterDriver } from 'taro-bluetooth-print';

class MyCustomDriver implements IPrinterDriver {
  init() {
    return [/* init commands */];
  }
  // ... implement other methods
}

const printer = new BluetoothPrinter(undefined, new MyCustomDriver());
```

## Direct Command Injection

If you need to send a specific command that isn't covered by the helper methods, you can access the underlying adapter directly, but it's recommended to extend the driver instead.
