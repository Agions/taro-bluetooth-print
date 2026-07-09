/**
 * 标签打印页 - TSPL 协议示例
 *
 * 演示内容:
 * - 60x40mm 标签尺寸
 * - 商品名称 (大字)
 * - 价格
 * - EAN-13 条形码
 * - QRCode 二维码
 *
 * 注意: 标签打印使用 TsplDriver,需要打印机支持 TSPL 协议
 */
import { useState } from 'react';
import Taro from '@tarojs/taro';
import { View, Text, Button } from '@tarojs/components';
import { TsplDriver } from 'taro-bluetooth-print';
import type { BluetoothPrinter } from 'taro-bluetooth-print';

import './index.less';

export default function LabelPage() {
  const [printing, setPrinting] = useState(false);

  const handlePrint = async () => {
    const app = Taro.getApp();
    const printer: BluetoothPrinter | undefined = (app as any)?.globalData?.printer;
    if (!printer) {
      Taro.showToast({ title: '打印机未初始化', icon: 'none' });
      return;
    }

    setPrinting(true);
    try {
      // 创建 TSPL 驱动,设置 60x40mm 标签
      const driver = new TsplDriver();
      driver
        .size(60, 40)
        .gap(3)
        .clear()
        .text('商品名称: 蓝喵马克杯', { x: 20, y: 20, font: 3 })
        .text('¥99.00', { x: 20, y: 80, font: 4 })
        .barcode('6901234567890', { x: 20, y: 160, type: 'EAN13', height: 60 })
        .qrcode('https://example.com/p/12345', { x: 20, y: 240, size: 6 });

      // 提交到打印机
      await printer.printWith(driver);
      Taro.showToast({ title: '标签已发送', icon: 'success' });
    } catch (err: any) {
      Taro.showToast({ title: err?.message ?? '打印失败', icon: 'none' });
    } finally {
      setPrinting(false);
    }
  };

  return (
    <View className="label-page">
      <View className="label-card">
        <Text className="label-title">🏷️ 商品标签预览</Text>
        <View className="label-preview">
          <Text className="p-name">商品名称: 蓝喵马克杯</Text>
          <Text className="p-price">¥99.00</Text>
          <View className="p-bar">
            <Text className="bar-text">|||||||||| 6901234567890</Text>
          </View>
          <View className="p-qr">
            <Text>▣▣▣▣▣▣▣</Text>
            <Text>▣  ▣▣▣</Text>
            <Text>▣▣  ▣▣</Text>
          </View>
        </View>
      </View>

      <Button
        className="print-btn"
        type="primary"
        loading={printing}
        disabled={printing}
        onClick={handlePrint}
      >
        {printing ? '打印中...' : '打印此标签'}
      </Button>

      <View className="tip">
        <Text>📌 需先在「打印机管理」页连接设备</Text>
        <Text>📌 打印机需支持 TSPL 协议 (TSC / 某些 Zebra 兼容)</Text>
        <Text>📌 规格: 60x40mm, 间隙 3mm, 1 张</Text>
      </View>
    </View>
  );
}
