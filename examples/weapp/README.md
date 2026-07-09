# 微信小程序示例 (Taro 3.x)

完整可编译的 Taro 3.x 微信小程序 demo,演示 `taro-bluetooth-print` 全部核心功能。

## 📦 文件结构

```
weapp/
├── package.json              # 工程依赖
├── babel.config.js           # Babel 配置
├── tsconfig.json             # TypeScript 配置
├── project.config.json       # 微信开发者工具配置
├── config/
│   └── index.js              # Taro 构建配置
├── src/                      # 源码
│   ├── app.tsx               # 应用入口
│   ├── app.config.ts         # 应用配置（页面注册 + 蓝牙权限）
│   ├── app.less              # 全局样式
│   └── pages/
│       ├── index/            # 首页（演示入口）
│       │   ├── index.tsx
│       │   └── index.less
│       ├── printer/          # 打印机管理（扫描/连接）
│       │   ├── index.tsx
│       │   └── index.less
│       ├── receipt/          # 收据打印（ESC/POS 小票）
│       │   ├── index.tsx
│       │   └── index.less
│       └── label/            # 标签打印（TSPL）
│           ├── index.tsx
│           └── index.less
└── README.md                 # 本文件
```

## 🚀 快速开始

### 方式 1: 在本工程编译 (推荐)

```bash
cd examples/weapp
npm install
npm run build:weapp
# 产物: examples/weapp/miniprogram/
```

### 方式 2: 复制源码到 Taro 项目

1. 把 `src/pages/` 整个复制到你的 Taro 项目 `src/` 目录
2. 合并 `app.config.ts` 中的 `pages` 和 `permission` 字段
3. 合并 `app.tsx` 中全局 `printer/deviceManager/printQueue` 初始化代码

## 🛠️ 编译产物

执行 `npm run build:weapp` 后会生成:

- **`dist/`** — 完整可运行的微信小程序产物 (1.2 MB)
  - `app.js` / `app.json` / `app.wxss` — 入口
  - `pages/{index,printer,receipt,label}/` — 4 个页面
  - `common.js` (586 KB) — 业务 + taro-bluetooth-print 库代码
  - `taro.js` / `runtime.js` / `vendors.js` — 框架
- **`miniprogram/`** — 软链到 `dist/`, 方便微信开发者工具按 `miniprogramRoot` 直接打开

## ⚙️ 已知兼容性坑 (Taro 3.6.40 + webpack 5.97+)

`config/index.js` 中包含 `chain.toConfig` 拦截,关闭 webpack 全局 schema 校验。原因:

- Taro 3.6.40 内部使用 `webpackbar@5.0.2`,后者继承 `webpack.ProgressPlugin`
- Taro 传给 webpackbar 的 options 包含 `reporters` / `basic` / `fancy` 等 webpackbar 私有字段
- webpack 5.97+ 的 `ProgressPlugin` schema 不再接受这些字段,触发 `ValidationError`
- **修法**: 在 `chain.toConfig` 输出时设置 `config.validate = false`,webpack 内部 `Compiler.validate` 会跳过 schema 校验但功能完整

> 如升级到 Taro 3.6.50+ 已修复该问题,可移除此 patch

## 📱 微信开发者工具预览

1. 打开微信开发者工具
2. 导入项目 → 选择 `examples/weapp/` 目录 (含 project.config.json)
3. AppID 选择「测试号」即可
4. ⚠️ **必须真机预览** — 微信蓝牙 API 不支持模拟器
5. 点击「预览」扫码,真机上即可扫描蓝牙打印机

## 🧩 演示功能

### 🖨️ 打印机管理页 (`/pages/printer/index`)
- 扫描附近 BLE 打印机 (10s 超时)
- 选择并连接设备,显示连接状态
- 内置日志面板 (最近 50 条)
- 触发测试打印
- 跳转到收据/标签打印页

### 🧾 收据打印页 (`/pages/receipt/index`)
- ESC/POS 小票完整流程
- 居中标题 + 多倍字宽
- 商品明细 (3 行)
- 加粗合计
- 二维码
- 切纸

### 🏷️ 标签打印页 (`/pages/label/index`)
- TSPL 协议标签 (60x40mm)
- 商品名 + 价格
- EAN-13 条形码
- QRCode 二维码

## 📋 蓝牙权限配置

`src/app.config.ts` 已声明:
```typescript
permission: {
  'scope.bluetooth': {
    desc: '需要使用您的蓝牙连接打印机'
  }
},
requiredPrivateInfos: ['getLocation']
```

## 🔌 API 用法

### 初始化 (在 `app.tsx`)
```typescript
import { createBluetoothPrinter, TaroAdapter, DeviceManager, PrintQueue } from 'taro-bluetooth-print';

const printer = createBluetoothPrinter({ adapter: new TaroAdapter() });
const deviceManager = new DeviceManager();
const printQueue = new PrintQueue({ maxSize: 50 });
```

### 在页面中获取
```typescript
const app = Taro.getApp();
const printer = (app as any).globalData.printer;
const dm = (app as any).globalData.deviceManager;
const queue = (app as any).globalData.printQueue;
```

### 打印小票 (ESC/POS)
```typescript
await printer
  .text('=== 欢迎光临 ===', { encoding: 'GBK' })
  .feed()
  .text('商品 x1  ¥10.00', { encoding: 'GBK' })
  .qrcode('https://example.com', { size: 6 })
  .cut()
  .print();
```

### 打印标签 (TSPL)
```typescript
import { TsplDriver } from 'taro-bluetooth-print';

const driver = new TsplDriver()
  .size(60, 40)
  .gap(3)
  .text('商品', { x: 20, y: 20, font: 3 })
  .barcode('6901234567890', { x: 20, y: 100, type: 'EAN13' });

await printer.printWith(driver);
```

## 🐛 常见问题

**Q: 微信开发者工具编译报错 "找不到 npm 包"?**  
A: 微信小程序不能直接用 `import taro-bluetooth-print`,需要在 `project.config.json` 中勾选「使用 npm 模块」,并执行 `npm run build:weapp` 让 Taro 把 npm 依赖打包到 `miniprogram_npm/` 目录。

**Q: 真机调试时扫描不到设备?**  
A: 确认:
1. 手机蓝牙已打开
2. 打印机已开启 BLE 广播
3. 小程序已通过 `wx.openBluetoothAdapter` 初始化 (我们的 `TaroAdapter` 自动处理)
4. iOS 需在系统设置中授予微信蓝牙权限

**Q: 打印中文乱码?**  
A: ESC/POS 默认编码是 GBK,传 `{ encoding: 'GBK' }`。若仍乱码,检查打印机是否设置成中文模式 (通过 ESC @ 指令初始化)。

**Q: `npm install` 慢?**  
A: 切换 npm 镜像:
```bash
npm config set registry https://registry.npmmirror.com
```

## 📄 License

MIT · 详见 [LICENSE](../../LICENSE)
