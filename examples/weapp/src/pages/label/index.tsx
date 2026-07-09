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
 * ⚠️ v2.15.x TSPL 集成说明 (重要 API 边界):
 *
 * 当前版本的 taro-bluetooth-print 主链路 (createBluetoothPrinter + BluetoothPrinter.print())
 *   是基于 ESC/POS CommandBuilder 设计的 (依赖 EscPosDriver.init())。
 *
 * TsplDriver **不实现 IPrinterDriver**, 也**没有 init() 方法**,
 *   所以 `new CommandBuilder(tsplDriver)` 会 throw (constructor 里调 driver.init())。
 *
 * 正确的 TSPL 工作流 (v2.15.x):
 *   1. const driver = new TsplDriver();
 *   2. driver.size(...).gap(...).text(...)... — 链式构造 TSPL 指令
 *   3. const bytes = driver.getBuffer(); — 拿到 ASCII 字节流
 *   4. 通过 adapter 直接写入 BLE characteristic:
 *        await adapter.write(bytes);
 *      (此示例库未暴露 BluetoothPrinter.writeRaw() 公开 API,
 *       如有需求可基于 ConnectionManager.adapter 自己封装)
 *
 * 本页面演示到步骤 3 (生成字节), 步骤 4 在用户实际项目中按平台实现。
 */
import { useState } from 'react';
import Taro from '@tarojs/taro';
import { View, Text, Button } from '@tarojs/components';
import { TsplDriver } from 'taro-bluetooth-print';

import { usePrinter } from '../../hooks/usePrinter';
import './index.less';

export default function LabelPage() {
  const [printing, setPrinting] = useState(false);
  const [result, setResult] = useState<string>('');
  const basePrinter = usePrinter();

  const handleGenerate = async () => {
    if (!basePrinter) {
      Taro.showToast({ title: '请先在「打印机管理」连接设备', icon: 'none' });
      return;
    }

    setPrinting(true);
    try {
      // 1. 用 TSPL driver 链式构造标签指令
      const driver = new TsplDriver();
      driver
        .size(60, 40)
        .gap(3)
        .clear()
        .text('商品名称: 蓝喵马克杯', { x: 20, y: 20, font: 3 })
        .text('¥99.00', { x: 20, y: 80, font: 4 })
        .barcode('6901234567890', { x: 20, y: 160, type: 'EAN13', height: 60 })
        .qrcode('https://example.com/p/12345', { x: 20, y: 240, cellWidth: 6 })
        .print(1, 1);

      // 2. 取 ASCII 字节流 (TSPL 协议)
      const bytes = driver.getBuffer();
      const preview = driver.getCommands().split('\r\n').filter(Boolean).slice(0, 6).join('\n');

      setResult(
        `✅ TSPL 指令流生成成功\n\n` +
          `字节数: ${bytes.length}\n` +
          `驱动: TsplDriver\n` +
          `协议: TSPL (用于标签机)\n\n` +
          `前 6 条指令预览:\n${preview}\n\n` +
          `⚠️ 当前版本需通过 adapter.write(bytes) 发送,\n` +
          `完整 ESC/POS 流程见「收据打印」页`
      );
    } catch (err: any) {
      setResult(`❌ 生成失败: ${err?.message ?? err}`);
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
        onClick={handleGenerate}
      >
        {printing ? '生成中...' : '生成 TSPL 指令'}
      </Button>

      {result && (
        <View className="result-card">
          <Text>{result}</Text>
        </View>
      )}

      <View className="tip">
        <Text>📌 需先在「打印机管理」页连接设备</Text>
        <Text>📌 打印机需支持 TSPL 协议 (TSC / 某些 Zebra 兼容)</Text>
        <Text>📌 规格: 60x40mm, 间隙 3mm, 1 张</Text>
        <Text>📌 流程: TsplDriver 链式 → getBuffer() → adapter.write()</Text>
      </View>
    </View>
  );
}