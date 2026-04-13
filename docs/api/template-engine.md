# TemplateEngine API

模板引擎，提供模板解析和渲染功能，支持变量替换、条件渲染、循环渲染、边框绘制和表格绘制。

## 导入

```typescript
import { TemplateEngine, templateEngine, TemplateType } from 'taro-bluetooth-print';

// 或单独导入类型
import type {
  ReceiptData,
  LabelData,
  TemplateDefinition,
  TemplateElement,
  ValidationResult,
} from 'taro-bluetooth-print';
```

## 创建实例

### 推荐方式：使用单例

```typescript
import { templateEngine } from 'taro-bluetooth-print';

// 直接使用单例实例
const commands = templateEngine.renderReceipt(receiptData);
```

### 手动实例化

```typescript
import { TemplateEngine } from 'taro-bluetooth-print';

// 指定纸宽（默认 48 字符）
const engine = new TemplateEngine(58);
```

## 方法

### 模板渲染

#### `renderReceipt(data: ReceiptData): Uint8Array`

渲染小票模板，返回 ESC/POS 字节命令。

```typescript
const commands = templateEngine.renderReceipt({
  store: {
    name: '我的商店',
    address: '北京市朝阳区xxx路',
    phone: '010-12345678'
  },
  order: {
    id: 'ORDER20240101001',
    date: '2024-01-01 10:30:00',
    cashier: '张三'
  },
  items: [
    { name: '商品A', quantity: 2, price: 10.00 },
    { name: '商品B', quantity: 1, price: 25.00, discount: 5.00 }
  ],
  payment: {
    subtotal: 45.00,
    discount: 5.00,
    total: 40.00,
    method: '微信支付',
    received: 50.00,
    change: 10.00
  },
  qrCode: 'https://example.com/order/123',
  footer: '如有问题请联系我店'
});
```

#### `renderLabel(data: LabelData): Uint8Array`

渲染标签模板，适用于商品标签、价格标签等。

```typescript
const commands = templateEngine.renderLabel({
  name: '农夫山泉',
  price: 2.50,
  spec: '550ml',
  barcode: '6920236372283',
  barcodeFormat: 'EAN13',
  productionDate: '2024-01-01',
  expiryDate: '2025-01-01'
});
```

#### `render(template: TemplateDefinition, data: Record<string, unknown>): Uint8Array`

渲染自定义模板。

```typescript
const template: TemplateDefinition = {
  type: TemplateType.CUSTOM,
  name: '自定义小票',
  width: 48,
  elements: [
    { type: 'text', content: '{{store.name}}', align: 'center', bold: true },
    { type: 'line', char: '-' },
    { type: 'loop', items: 'items', itemVar: 'item', elements: [...] },
    { type: 'condition', variable: 'showDiscount', operator: 'truthy', then: [...] }
  ]
};

const commands = templateEngine.render(template, { store: {...}, items: [...] });
```

### 模板注册

#### `registerTemplate(name: string, template: TemplateDefinition): void`

注册自定义模板供后续使用。

```typescript
const myTemplate: TemplateDefinition = {
  type: TemplateType.CUSTOM,
  name: '我的模板',
  width: 48,
  elements: [
    { type: 'text', content: '=== {{store.name}} ===', align: 'center' },
    { type: 'feed', lines: 1 }
  ]
};

templateEngine.registerTemplate('myReceipt', myTemplate);
```

#### `getTemplate(name: string): TemplateDefinition | undefined`

获取已注册的模板。

```typescript
const template = templateEngine.getTemplate('myReceipt');
if (template) {
  const commands = templateEngine.render(template, data);
}
```

### 模板验证

#### `validate(template: TemplateDefinition, data: Record<string, unknown>): ValidationResult`

验证模板数据是否完整，返回验证结果。

```typescript
const result = templateEngine.validate(template, data);

if (!result.valid) {
  result.errors.forEach(error => {
    console.error(`${error.code}: ${error.message} (字段: ${error.field})`);
  });
}
```

## 数据结构

### ReceiptData - 小票数据

| 属性 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `store` | `StoreInfo` | 是 | 店铺信息 |
| `order` | `OrderInfo` | 否 | 订单信息 |
| `items` | `ReceiptItem[]` | 是 | 商品列表 |
| `payment` | `PaymentInfo` | 是 | 支付信息 |
| `qrCode` | `string` | 否 | 二维码内容 |
| `footer` | `string` | 否 | 页脚文本 |

### LabelData - 标签数据

| 属性 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `name` | `string` | 是 | 商品名称 |
| `price` | `number` | 是 | 商品价格 |
| `barcode` | `string` | 否 | 条码内容 |
| `barcodeFormat` | `BarcodeFormat` | 否 | 条码格式 |
| `spec` | `string` | 否 | 规格 |
| `productionDate` | `string` | 否 | 生产日期 |
| `expiryDate` | `string` | 否 | 过期日期 |

### StoreInfo - 店铺信息

| 属性 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `name` | `string` | 是 | 店铺名称 |
| `address` | `string` | 否 | 店铺地址 |
| `phone` | `string` | 否 | 联系电话 |
| `logo` | `Uint8Array` | 否 | Logo 图片数据 |

### OrderInfo - 订单信息

| 属性 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | `string` | 是 | 订单号 |
| `date` | `string` | 是 | 订单日期 |
| `cashier` | `string` | 否 | 收银员 |

### ReceiptItem - 商品项

| 属性 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `name` | `string` | 是 | 商品名称 |
| `quantity` | `number` | 是 | 数量 |
| `price` | `number` | 是 | 单价 |
| `discount` | `number` | 否 | 折扣金额 |

### PaymentInfo - 支付信息

| 属性 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `subtotal` | `number` | 是 | 小计金额 |
| `tax` | `number` | 否 | 税额 |
| `discount` | `number` | 否 | 优惠金额 |
| `total` | `number` | 是 | 合计金额 |
| `method` | `string` | 是 | 支付方式 |
| `received` | `number` | 否 | 实收金额 |
| `change` | `number` | 否 | 找零金额 |

## 模板元素类型

模板引擎支持以下元素类型，可组合使用构建复杂模板：

### 文本元素

```typescript
{ type: 'text', content: 'Hello {{name}}', align: 'center', size: 2, bold: true }
```

| 属性 | 类型 | 说明 |
|------|------|------|
| `type` | `'text'` | 元素类型 |
| `content` | `string` | 文本内容，支持 `{{variable}}` 变量替换 |
| `align` | `'left' \| 'center' \| 'right'` | 文本对齐 |
| `size` | `number` | 字体大小 (1-4) |
| `bold` | `boolean` | 是否加粗 |

### 分隔线元素

```typescript
{ type: 'line', char: '-', length: 48 }
```

| 属性 | 类型 | 说明 |
|------|------|------|
| `type` | `'line'` | 元素类型 |
| `char` | `string` | 分隔符字符（默认 `-`） |
| `length` | `number` | 线条长度（默认纸宽） |

### 图片元素

```typescript
{ type: 'image', data: imageData, width: 200, height: 100 }
```

| 属性 | 类型 | 说明 |
|------|------|------|
| `type` | `'image'` | 元素类型 |
| `data` | `Uint8Array` | 图片数据 |
| `width` | `number` | 图片宽度 |
| `height` | `number` | 图片高度 |

### 二维码元素

```typescript
{ type: 'qrcode', content: 'https://example.com', size: 6 }
```

| 属性 | 类型 | 说明 |
|------|------|------|
| `type` | `'qrcode'` | 元素类型 |
| `content` | `string` | 二维码内容，支持变量替换 |
| `size` | `number` | 二维码大小 (1-10) |

### 条码元素

```typescript
{ type: 'barcode', content: '12345678', format: 'CODE128', height: 60 }
```

| 属性 | 类型 | 说明 |
|------|------|------|
| `type` | `'barcode'` | 元素类型 |
| `content` | `string` | 条码内容，支持变量替换 |
| `format` | `BarcodeFormat` | 条码格式 |
| `height` | `number` | 条码高度 |

### 走纸元素

```typescript
{ type: 'feed', lines: 3 }
```

| 属性 | 类型 | 说明 |
|------|------|------|
| `type` | `'feed'` | 元素类型 |
| `lines` | `number` | 走纸行数 |

### 变量元素

```typescript
{ type: 'variable', name: 'order.id', format: 'currency' }
```

| 属性 | 类型 | 说明 |
|------|------|------|
| `type` | `'variable'` | 元素类型 |
| `name` | `string` | 变量名，支持嵌套路径 `user.address.city` |
| `format` | `string` | 格式化类型（`'currency'` 转为 ¥ 格式，`'date'` 转为日期） |

### 循环元素

```typescript
{
  type: 'loop',
  items: 'items',
  itemVar: 'item',
  indexVar: 'idx',
  separator: '---',
  elements: [
    { type: 'text', content: '{{item.name}} x{{item.quantity}}' }
  ]
}
```

| 属性 | 类型 | 说明 |
|------|------|------|
| `type` | `'loop'` | 元素类型 |
| `items` | `string` | 要遍历的数组变量名 |
| `itemVar` | `string` | 当前项的变量名 |
| `indexVar` | `string` | 索引变量名（可选） |
| `elements` | `TemplateElement[]` | 循环体中的元素 |
| `separator` | `string` | 项之间的分隔符（可选） |

### 条件元素

```typescript
{
  type: 'condition',
  variable: 'user.vip',
  operator: 'equals',
  value: true,
  then: [
    { type: 'text', content: 'VIP用户专属优惠' }
  ],
  else: [
    { type: 'text', content: '普通用户' }
  ]
}
```

| 属性 | 类型 | 说明 |
|------|------|------|
| `type` | `'condition'` | 元素类型 |
| `variable` | `string` | 要检查的变量名 |
| `operator` | 条件操作符 | 运算符 |
| `value` | `unknown` | 比较值（二元运算符时使用） |
| `then` | `TemplateElement[]` | 条件为真时渲染的元素 |
| `else` | `TemplateElement[]` | 条件为假时渲染的元素（可选） |

#### 条件操作符

| 操作符 | 说明 | 示例 |
|--------|------|------|
| `exists` | 变量存在且不为 null | `variable: 'user'` |
| `not_exists` | 变量不存在或为 null | `variable: 'user'` |
| `equals` | 等于 | `variable: 'status', value: 'active'` |
| `not_equals` | 不等于 | `variable: 'status', value: 'disabled'` |
| `gt` | 大于 | `variable: 'age', value: 18` |
| `gte` | 大于等于 | `variable: 'age', value: 18` |
| `lt` | 小于 | `variable: 'stock', value: 10` |
| `lte` | 小于等于 | `variable: 'stock', value: 10` |
| `truthy` | 真值 | `variable: 'showBanner'` |
| `falsy` | 假值 | `variable: 'isDisabled'` |

### 边框元素

```typescript
{
  type: 'border',
  style: 'double',
  drawTop: true,
  drawBottom: true,
  drawLeft: true,
  drawRight: true,
  filled: true,
  padding: 1
}
```

| 属性 | 类型 | 说明 |
|------|------|------|
| `type` | `'border'` | 元素类型 |
| `style` | `BorderStyle` | 边框样式 |
| `topLeft` | `string` | 自定义左上角字符 |
| `topRight` | `string` | 自定义右上角字符 |
| `bottomLeft` | `string` | 自定义左下角字符 |
| `bottomRight` | `string` | 自定义右下角字符 |
| `top` | `string` | 自定义上边框字符 |
| `bottom` | `string` | 自定义下边框字符 |
| `left` | `string` | 自定义左边框字符 |
| `right` | `string` | 自定义右边框字符 |
| `drawTop` | `boolean` | 是否绘制上边框（默认 true） |
| `drawBottom` | `boolean` | 是否绘制下边框（默认 true） |
| `drawLeft` | `boolean` | 是否绘制左边框（默认 false） |
| `drawRight` | `boolean` | 是否绘制右边框（默认 false） |
| `filled` | `boolean` | 是否填充内部（默认 false） |
| `padding` | `number` | 内边距（默认 0） |

#### 边框样式 BorderStyle

| 样式 | 说明 | 示例字符 |
|------|------|----------|
| `'single'` | 单线 | `+ - |` |
| `'double'` | 双线 | `╔ ═ ║` |
| `'thick'` | 粗线 | `┏ ━ ┃` |
| `'rounded'` | 圆角 | `╭ ─ │` |
| `'dashed'` | 虚线 | `+ - :` |
| `'none'` | 无边框 | 空白 |

### 表格元素

```typescript
{
  type: 'table',
  columns: [
    { header: '商品', width: 20, headerAlign: 'left', cellAlign: 'left' },
    { header: '数量', width: 8, headerAlign: 'center', cellAlign: 'center' },
    { header: '金额', width: 12, headerAlign: 'right', cellAlign: 'right' }
  ],
  rowsVar: 'items',
  showHeader: true,
  borderStyle: 'single',
  alternateRows: false
}
```

| 属性 | 类型 | 说明 |
|------|------|------|
| `type` | `'table'` | 元素类型 |
| `columns` | `TableColumn[]` | 列定义数组 |
| `rowsVar` | `string` | 行数据数组的变量名 |
| `showHeader` | `boolean` | 是否显示表头（默认 true） |
| `borderStyle` | `BorderStyle` | 边框样式（默认 `'single'`） |
| `alternateRows` | `boolean` | 是否交替行颜色（默认 false） |

#### TableColumn - 表格列定义

| 属性 | 类型 | 说明 |
|------|------|------|
| `header` | `string` | 列标题 |
| `width` | `number` | 列宽（字符数） |
| `headerAlign` | `TextAlign` | 表头对齐方式 |
| `cellAlign` | `TextAlign` | 单元格对齐方式 |

## TemplateDefinition - 模板定义

| 属性 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `type` | `TemplateType` | 是 | 模板类型 |
| `name` | `string` | 是 | 模板名称 |
| `width` | `number` | 是 | 纸宽（字符数） |
| `elements` | `TemplateElement[]` | 是 | 模板元素数组 |

### TemplateType - 模板类型枚举

| 值 | 说明 |
|----|------|
| `RECEIPT` | 小票模板 |
| `LABEL` | 标签模板 |
| `CUSTOM` | 自定义模板 |

## ValidationResult - 验证结果

| 属性 | 类型 | 说明 |
|------|------|------|
| `valid` | `boolean` | 是否有效 |
| `errors` | `Array<{ field, message, code }>` | 错误列表 |

### 错误码

| 错误码 | 说明 |
|--------|------|
| `MISSING_VARIABLE` | 缺少必需的变量 |
| `INVALID_LOOP_VARIABLE` | 循环变量必须是数组 |

## 完整示例

### 使用模板引擎渲染小票

```typescript
import { TemplateEngine, TemplateType } from 'taro-bluetooth-print';

const engine = new TemplateEngine(48);

// 准备数据
const receiptData = {
  store: {
    name: '便利超市',
    address: '科技园店',
    phone: '400-888-8888'
  },
  order: {
    id: '20240101001',
    date: '2024-01-01 10:30:00',
    cashier: '小李'
  },
  items: [
    { name: '农夫山泉', quantity: 2, price: 2.00 },
    { name: '方便面', quantity: 1, price: 4.50 },
    { name: '火腿肠', quantity: 3, price: 2.50, discount: 1.00 }
  ],
  payment: {
    subtotal: 14.50,
    discount: 1.00,
    total: 13.50,
    method: '微信支付',
    received: 20.00,
    change: 6.50
  },
  qrCode: 'https://example.com/order/123'
};

// 渲染
const commands = engine.renderReceipt(receiptData);

// 发送到打印机
await printer.connect('device-id');
await printer.send(commands);
```

### 使用自定义模板

```typescript
import { TemplateEngine, TemplateType } from 'taro-bluetooth-print';

const engine = new TemplateEngine(48);

// 定义自定义模板
const customTemplate = {
  type: TemplateType.CUSTOM,
  name: '简洁收据',
  width: 48,
  elements: [
    // 标题
    { type: 'text', content: '{{store.name}}', align: 'center', bold: true, size: 2 },
    { type: 'feed', lines: 1 },
    
    // 分隔线
    { type: 'line', char: '=' },
    
    // 订单信息
    { type: 'condition', variable: 'order', operator: 'exists', then: [
      { type: 'text', content: '订单号: {{order.id}}' },
      { type: 'text', content: '日期: {{order.date}}' },
      { type: 'line', char: '-' }
    ]},
    
    // 商品列表（循环）
    { type: 'loop', items: 'items', itemVar: 'item', elements: [
      { type: 'text', content: '{{item.name}}' },
      { type: 'text', content: 'x{{item.quantity}}  ¥{{item.price}}' }
    ]},
    
    // 边框
    {
      type: 'border',
      style: 'double',
      drawTop: true,
      drawBottom: true,
      filled: true,
      padding: 1
    },
    
    // 合计
    { type: 'text', content: '合计: ¥{{payment.total}}', align: 'right', bold: true },
    { type: 'feed', lines: 2 }
  ]
};

// 注册模板
engine.registerTemplate('simpleReceipt', customTemplate);

// 渲染
const commands = engine.render(customTemplate, receiptData);
```

### 使用表格模板

```typescript
const tableTemplate = {
  type: TemplateType.CUSTOM,
  name: '库存清单',
  width: 58,
  elements: [
    { type: 'text', content: '库存清单', align: 'center', bold: true, size: 2 },
    { type: 'feed', lines: 1 },
    {
      type: 'table',
      columns: [
        { header: '商品', width: 20 },
        { header: '库存', width: 10, cellAlign: 'center' },
        { header: '单价', width: 12, cellAlign: 'right' },
        { header: '小计', width: 12, cellAlign: 'right' }
      ],
      rowsVar: 'inventory',
      showHeader: true,
      borderStyle: 'single'
    }
  ]
};

const inventoryData = {
  inventory: [
    { '商品': '农夫山泉', '库存': 100, '单价': 2.00, '小计': 200.00 },
    { '商品': '康师傅', '库存': 50, '单价': 4.50, '小计': 225.00 },
    { '商品': '火腿肠', '库存': 80, '单价': 2.50, '小计': 200.00 }
  ]
};

const commands = engine.render(tableTemplate, inventoryData);
```
