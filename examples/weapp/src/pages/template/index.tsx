/**
 * 模板引擎页 - 演示 TemplateEngine
 *
 * 演示内容:
 * - 用 TemplateEngine 渲染收据模板
 * - 用 TemplateEngine 渲染标签模板
 * - 展示数据驱动打印的威力 (改动数据不需改代码)
 */
import { useState } from 'react';
import Taro from '@tarojs/taro';
import { View, Text, Button, Switch } from '@tarojs/components';
import { TemplateEngine, type ReceiptData, type LabelData } from 'taro-bluetooth-print';

import { usePrinter } from '../../hooks/usePrinter';
import './index.less';

const DEMO_RECEIPT: ReceiptData = {
  store: {
    name: '蓝喵咖啡',
    address: 'XX市XX区XX路 123 号',
    phone: '186-1003-7008'
  },
  order: {
    no: '202407090001',
    datetime: new Date().toISOString()
  },
  items: [
    { name: '美式咖啡', price: 25, qty: 1, subtotal: 25 },
    { name: '蓝喵拿铁', price: 32, qty: 2, subtotal: 64 },
    { name: '提拉米苏', price: 38, qty: 1, subtotal: 38 }
  ],
  payment: {
    subtotal: 127,
    tax: 6.35,
    total: 133.35,
    method: '微信支付'
  },
  qrCode: 'https://example.com/order/202407090001',
  footer: '谢谢惠顾！'
};

const DEMO_LABEL: LabelData = {
  name: '蓝喵马克杯 350ml',
  price: 99.0,
  barcode: '6901234567890',
  spec: '陶瓷 / 350ml / 蓝色',
  productionDate: '2024-07-09',
  expiryDate: '2030-07-09'
};

type Mode = 'receipt' | 'label';

const DATA_BY_MODE: Record<Mode, ReceiptData | LabelData> = {
  receipt: DEMO_RECEIPT,
  label: DEMO_LABEL
};

export default function TemplatePage() {
  const [printing, setPrinting] = useState(false);
  // ✅ 修复 B2: 用 lazy initializer 避免 init 时读 mode 的 race
  const [mode, setMode] = useState<Mode>('receipt');
  const [data, setData] = useState<ReceiptData | LabelData>(DEMO_RECEIPT);
  const printer = usePrinter();

  const handleToggle = (val: boolean) => {
    const next: Mode = val ? 'label' : 'receipt';
    setMode(next);
    setData(DATA_BY_MODE[next]);
  };

  const handlePrint = async () => {
    if (!printer) {
      Taro.showToast({ title: '请先在「打印机管理」连接设备', icon: 'none' });
      return;
    }

    setPrinting(true);
    try {
      const engine = new TemplateEngine();
      // TemplateEngine.renderReceipt/renderLabel 返回 Uint8Array (ESC/POS 指令流)
      const bytes =
        mode === 'receipt'
          ? engine.renderReceipt(data as ReceiptData)
          : engine.renderLabel(data as LabelData);

      Taro.showModal({
        title: '✅ 模板渲染成功',
        content: `${mode === 'receipt' ? '收据' : '标签'}指令流: ${bytes.length} bytes\n\n前端可以 preview 渲染或直接喂给 printer.`,
        showCancel: false
      });
    } catch (err: any) {
      Taro.showToast({ title: err?.message ?? '渲染失败', icon: 'none' });
    } finally {
      setPrinting(false);
    }
  };

  return (
    <View className="template-page">
      <View className="mode-card">
        <View className="mode-row">
          <Text className="mode-label">收据模式</Text>
          <Switch checked={mode === 'label'} onChange={(e) => handleToggle(e.detail.value)} />
          <Text className="mode-label">标签模式</Text>
        </View>
      </View>

      <View className="data-card">
        <Text className="data-title">📋 渲染数据</Text>
        <View className="data-content">
          <Text className="data-line">{JSON.stringify(data, null, 2)}</Text>
        </View>
      </View>

      <Button
        className="print-btn"
        type="primary"
        loading={printing}
        disabled={printing}
        onClick={handlePrint}
      >
        {printing ? '渲染中...' : '🎨 渲染模板'}
      </Button>

      <View className="tip">
        <Text>📌 TemplateEngine 把 data + template 编译成 ESC/POS 字节流</Text>
        <Text>📌 改数据不改代码 — 适合 CMS / SaaS 场景</Text>
        <Text>📌 支持 4 大元素: text / image / barcode / qrcode</Text>
        <Text>📌 renderReceipt / renderLabel 一步到位</Text>
      </View>
    </View>
  );
}