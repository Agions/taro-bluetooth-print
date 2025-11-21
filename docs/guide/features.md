# 功能特性

## 图片打印

支持将图片数据（RGBA）转换为 ESC/POS 指令打印。内置 Floyd-Steinberg 抖动算法，提升打印质量。

```typescript
// data: Uint8Array (RGBA pixels)
// width: 图片宽度
// height: 图片高度
printer.image(data, width, height);
```

## 二维码打印

支持自定义二维码内容、大小和纠错级别。

```typescript
printer.qr('https://example.com', {
  size: 8,              // 1-16
  model: 2,             // 1 or 2
  errorCorrection: 'M'  // L, M, Q, H
});
```

## 弱网适配

在网络不稳定的情况下，可以通过设置重试次数和分片延迟来提高成功率。

```typescript
printer.setOptions({
  retries: 3,
  delay: 50 // 增加延迟
});
```

## 断点打印

支持在打印过程中暂停、恢复或取消任务。

```typescript
// 开始打印
printer.print();

// 暂停
printer.pause();

// 检查剩余字节数
console.log(printer.remaining());

// 恢复
await printer.resume();

// 取消
printer.cancel();
```
