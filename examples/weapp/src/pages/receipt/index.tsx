/**
 * 收据打印页 - ESC/POS 小票示例
 *
 * 演示内容:
 * - 居中标题 + 多倍字宽
 * - 商品明细 (3 行)
 * - 分隔线
 * - 加粗合计
 * - 二维码
 * - 切纸
 */
import { useState } from 'react';
import Taro from '@tarojs/taro';
import { View, Text, Button } from '@tarojs/components';
import type { BluetoothPrinter } from 'taro-bluetooth-print';

import './index.less';

interface Item {
  name: string;
  price: number;
  qty: number;
}

const DEFAULT_ITEMS: Item[] = [
  { name: '可口可乐', price: 5, qty: 2 },
  { name: '薯条大份', price: 12, qty: 1 },
  { name: '巨无霸', price: 25, qty: 1 }
];

export default function ReceiptPage() {
  const [printing, setPrinting] = useState(false);
  const [items] = useState(DEFAULT_ITEMS);
  const total = items.reduce((sum, it) => sum + it.price * it.qty, 0);

  const handlePrint = async () => {
    const app = Taro.getApp();
    const printer: BluetoothPrinter | undefined = (app as any)?.globalData?.printer;
    if (!printer) {
      Taro.showToast({ title: '打印机未初始化', icon: 'none' });
      return;
    }

    setPrinting(true);
    try {
      await printer
        .align('center')
        .setSize(2, 2)
        .text('☕ 蓝喵咖啡', { encoding: 'GBK' })
        .feed()
        .resetSize()
        .text('地址: XX市XX区XX路 123 号', { encoding: 'GBK' })
        .text('电话: 186-1003-7008', { encoding: 'GBK' })
        .feed()
        .align('left')
        .text('------------------------', { encoding: 'GBK' });

      // 商品明细
      for (const it of items) {
        const line = `${it.name} x${it.qty}`.padEnd(15) + `¥${(it.price * it.qty).toFixed(2)}`;
        await printer.text(line, { encoding: 'GBK' });
      }

      await printer
        .feed()
        .text('------------------------', { encoding: 'GBK' })
        .feed()
        .setBold(true)
        .text(`合计: ¥${total.toFixed(2)}`, { encoding: 'GBK' })
        .resetStyle()
        .feed(2)
        .align('center')
        .text('谢谢惠顾，欢迎下次光临!', { encoding: 'GBK' })
        .feed(2)
        .qrcode(`https://example.com/order/${Date.now()}`, { size: 5 })
        .feed(3)
        .cut()
        .print();

      Taro.showToast({ title: '打印完成', icon: 'success' });
    } catch (err: any) {
      Taro.showToast({ title: err?.message ?? '打印失败', icon: 'none' });
    } finally {
      setPrinting(false);
    }
  };

  return (
    <View className="receipt-page">
      <View className="receipt-card">
        <Text className="shop-name">☕ 蓝喵咖啡</Text>
        <View className="divider" />
        {items.map((it, i) => (
          <View key={i} className="row">
            <Text className="row-name">
              {it.name} x{it.qty}
            </Text>
            <Text className="row-price">¥{(it.price * it.qty).toFixed(2)}</Text>
          </View>
        ))}
        <View className="divider" />
        <View className="row total">
          <Text className="row-name">合计</Text>
          <Text className="row-price">¥{total.toFixed(2)}</Text>
        </View>
      </View>

      <Button
        className="print-btn"
        type="primary"
        loading={printing}
        disabled={printing}
        onClick={handlePrint}
      >
        {printing ? '打印中...' : '打印此收据'}
      </Button>

      <View className="tip">
        <Text>📌 需先在「打印机管理」页连接设备</Text>
        <Text>📌 编码: GBK (适配中文小票)</Text>
        <Text>📌 流程: 居中标题 → 商品明细 → 合计 → 二维码 → 切纸</Text>
      </View>
    </View>
  );
}
