# 常见问题 (FAQ)

本页面列出了使用 Taro Bluetooth Print 库时的常见问题和解决方案。

## 安装和配置

### Q: 如何安装这个库?

**A:** 使用 npm、yarn 或 pnpm 安装:

```bash
npm install taro-bluetooth-print
# 或
yarn add taro-bluetooth-print
# 或
pnpm add taro-bluetooth-print
```

### Q: 需要安装其他依赖吗?

**A:** 本库依赖于 `@tarojs/taro` (版本 >= 3.0.0)。如果您的项目已经使用 Taro,则无需额外安装。

### Q: 支持哪些 Taro 版本?

**A:** 本库支持 Taro 3.0 及以上版本,推荐使用最新的稳定版本。

### Q: 如何在 TypeScript 项目中使用?

**A:** 本库内置完整的 TypeScript 类型定义,无需额外配置:

```typescript
import TaroBluePrint from "taro-bluetooth-print"

const printer = new TaroBluePrint({
  debug: true,
  encoding: "UTF-8",
})
```

## 蓝牙连接

### Q: 蓝牙初始化失败怎么办?

**A:** 检查以下几点:

1. 确保设备蓝牙已开启
2. 检查应用是否有蓝牙使用权限
3. 在小程序中,确保已在 `app.json` 中声明蓝牙权限:

```json
{
  "permission": {
    "scope.bluetooth": {
      "desc": "你的小程序需要使用蓝牙功能"
    }
  }
}
```

4. 在 H5 中,确保使用 HTTPS 协议(Web Bluetooth API 要求)

### Q: 找不到蓝牙设备?

**A:** 可能的原因和解决方案:

1. **设备未开启或距离太远**

   - 确保打印机已开启且在蓝牙范围内(通常 10 米以内)

2. **设备已被其他应用连接**

   - 断开其他应用的连接,或重启打印机

3. **搜索超时时间太短**
   - 增加搜索超时时间:

```typescript
await printer.bluetooth.startDiscovery({
  timeout: 15000, // 15秒
})
```

4. **Service UUID 不匹配**
   - 尝试不指定 Service UUID,搜索所有设备:

```typescript
await printer.bluetooth.startDiscovery({
  services: [], // 搜索所有服务
})
```

### Q: 连接设备后频繁断开?

**A:** 可能的原因:

1. **信号干扰**

   - 远离其他蓝牙设备和 Wi-Fi 路由器
   - 确保打印机与手机距离在 3 米以内

2. **电量不足**

   - 检查打印机电量,及时充电

3. **设备不稳定**
   - 重启打印机和蓝牙适配器
   - 更新打印机固件

### Q: 如何监听连接状态变化?

**A:** 使用连接状态监听器:

```typescript
printer.bluetooth.onConnectionStateChange((connected) => {
  if (connected) {
    console.log("设备已连接")
  } else {
    console.log("设备已断开")
    // 可以在这里实现自动重连逻辑
  }
})
```

## 打印问题

### Q: 打印内容显示乱码?

**A:** 这通常是字符编码问题:

1. **检查编码设置**

```typescript
const printer = new TaroBluePrint({
  encoding: "GBK", // 大多数热敏打印机使用 GBK 编码
  characterSet: "CHINA", // 设置为中国字符集
})
```

2. **尝试不同的编码**

   - 如果 GBK 不行,尝试 UTF-8
   - 部分打印机可能需要特定的编码

3. **检查字符集**

```typescript
await printer.printer.setCharacterSet("CHINA")
```

### Q: 打印的图片模糊或失真?

**A:** 优化图片打印质量:

1. **调整图片宽度**

```typescript
await printer.printer.printImage(imagePath, {
  maxWidth: 384, // 58mm纸张推荐384像素
  // maxWidth: 576 // 80mm纸张推荐576像素
})
```

2. **启用抖动算法**

```typescript
await printer.printer.printImage(imagePath, {
  dithering: true, // 提高黑白图片质量
})
```

3. **使用高对比度图片**
   - 确保图片颜色对比度高
   - 避免使用灰度图,转换为纯黑白

### Q: 二维码打印后无法扫描?

**A:** 检查二维码设置:

1. **增加二维码尺寸**

```typescript
await printer.printer.printQRCode("https://example.com", {
  size: 10, // 增大尺寸(1-16)
})
```

2. **提高纠错级别**

```typescript
await printer.printer.printQRCode("https://example.com", {
  errorCorrection: "H", // 最高纠错级别
})
```

3. **减少二维码内容**
   - 内容越少,二维码越简单,越容易扫描
   - 使用短链接服务缩短 URL

### Q: 打印速度很慢?

**A:** 优化打印性能:

1. **减少单次写入数据量**

```typescript
// 避免一次性发送大量数据
// 推荐分批发送
```

2. **关闭调试模式**

```typescript
const printer = new TaroBluePrint({
  debug: false, // 生产环境关闭调试
})
```

3. **优化图片尺寸**
   - 提前将图片缩放到合适大小
   - 避免实时处理大尺寸图片

### Q: 打印内容被截断?

**A:** 检查以下几点:

1. **纸张宽度设置**

```typescript
const printer = new TaroBluePrint({
  paperWidth: 58, // 或 80,根据实际纸张宽度
})
```

2. **文本行长度**

   - 58mm 纸张:每行约 32 个英文字符或 16 个汉字
   - 80mm 纸张:每行约 48 个英文字符或 24 个汉字

3. **手动添加换行**

```typescript
await printer.printer.printText("很长的文本内容...\n继续下一行")
```

## 平台特定问题

### Q: 微信小程序中如何使用?

**A:** 确保正确配置权限:

1. 在 `app.json` 中添加权限声明
2. 在用户操作后初始化蓝牙(不能在小程序启动时自动初始化)
3. 使用 `wx.openBluetoothAdapter()` 前需要用户授权

### Q: H5 平台有什么限制?

**A:** H5 平台使用 Web Bluetooth API,有以下限制:

1. **必须使用 HTTPS**

   - 本地开发可以使用 `localhost`
   - 生产环境必须使用 HTTPS

2. **浏览器兼容性**

   - Chrome 56+
   - Edge 79+
   - Opera 43+
   - Safari 不支持

3. **用户手势触发**
   - 蓝牙请求必须由用户手势(点击等)触发
   - 不能自动连接

### Q: React Native 平台如何使用?

**A:** React Native 平台需要额外配置:

1. 安装蓝牙插件(如 `react-native-bluetooth-classic`)
2. 配置原生权限
3. 确保本库与蓝牙插件兼容

## 错误处理

### Q: 如何处理打印失败?

**A:** 使用 try-catch 捕获错误:

```typescript
try {
  await printer.printer.printText("Hello, World!")
  console.log("打印成功")
} catch (error) {
  console.error("打印失败:", error.message)

  // 根据错误类型处理
  if (error.code === "BLUETOOTH_NOT_CONNECTED") {
    // 重新连接
    await printer.bluetooth.connect(deviceId)
  }
}
```

### Q: 常见错误代码及解决方案?

**A:** 常见错误代码:

| 错误代码                  | 说明       | 解决方案                   |
| ------------------------- | ---------- | -------------------------- |
| `BLUETOOTH_NOT_AVAILABLE` | 蓝牙不可用 | 检查设备蓝牙是否开启       |
| `BLUETOOTH_NOT_CONNECTED` | 蓝牙未连接 | 先连接设备                 |
| `DEVICE_NOT_FOUND`        | 设备未找到 | 检查设备是否开启并在范围内 |
| `CONNECTION_FAILED`       | 连接失败   | 检查设备状态,重试连接      |
| `WRITE_FAILED`            | 写入失败   | 检查连接状态,重试操作      |
| `INVALID_PARAM`           | 参数无效   | 检查参数格式和取值范围     |

## 性能优化

### Q: 如何提高打印性能?

**A:** 性能优化建议:

1. **批量操作**

```typescript
// 避免多次单独调用
await printer.printer.printText("行1")
await printer.printer.printText("行2")
await printer.printer.printText("行3")

// 推荐:使用数组一次性打印
await printer.printer.printText(["行1", "行2", "行3"])
```

2. **预处理图片**

   - 提前将图片转换为合适的尺寸和格式
   - 使用缓存避免重复处理

3. **合理使用队列**
   - 避免同时执行多个打印任务
   - 使用队列顺序处理

### Q: 如何减少内存占用?

**A:** 内存优化建议:

1. **及时断开连接**

```typescript
try {
  // 打印操作
} finally {
  await printer.bluetooth.disconnect() // 确保断开连接
}
```

2. **清理资源**

```typescript
// 使用完毕后销毁实例
await printer.destroy()
```

3. **避免内存泄漏**
   - 移除事件监听器
   - 清理定时器和异步操作

## 调试技巧

### Q: 如何开启调试模式?

**A:** 在创建实例时启用:

```typescript
const printer = new TaroBluePrint({
  debug: true, // 开启调试日志
})
```

调试模式会输出详细的运行日志,帮助定位问题。

### Q: 如何查看蓝牙设备信息?

**A:** 使用以下方法:

```typescript
// 获取设备列表
const devices = await printer.bluetooth.getDiscoveredDevices()

devices.forEach((device) => {
  console.log("设备ID:", device.deviceId)
  console.log("设备名称:", device.name)
  console.log("信号强度:", device.RSSI)
})

// 获取服务列表
const services = await printer.bluetooth.getServices(deviceId)
console.log("设备服务:", services)
```

### Q: 如何测试打印机是否正常工作?

**A:** 使用测试页功能:

```typescript
await printer.printer.printTestPage()
```

这会打印一个包含基本信息的测试页,验证打印机功能。

## 更多帮助

如果以上内容没有解决您的问题:

1. 查看 [API 文档](/api/) 了解详细用法
2. 浏览 [示例代码](/examples/) 学习实际应用
3. 访问 [GitHub Issues](https://github.com/Agions/taro-bluetooth-print/issues) 提交问题
4. 加入社区讨论群获取帮助

## 贡献

发现文档有误或有更好的解决方案? 欢迎提交 PR 完善本文档!
