/**
 * 图片打印页 - 演示 ESC/POS 图像指令
 *
 * 流程:
 * 1. 用户从相册/相机选择图片
 * 2. 通过 OffscreenCanvas 拿到 RGBA 像素 (canvasHelper.loadImageAsRGBA)
 * 3. 用 ImageProcessing.toBitmap 转成 1-bit 灰度位图 (ESC/POS GS v 0 指令)
 * 4. 通过 printer.image(bitmap, w, h) 发送给打印机
 *
 * 注意:
 * - ImageProcessing.toBitmap 要求 data 是 RGBA 字节,长度必须 = w * h * 4
 * - OffscreenCanvas 是微信 2.7.0+ 才支持,需在 manifest 配置 canvas 2d 能力
 */
import { useState } from 'react';
import Taro from '@tarojs/taro';
import { View, Text, Button, Image } from '@tarojs/components';
import { ImageProcessing } from 'taro-bluetooth-print';
import type { BluetoothPrinter } from 'taro-bluetooth-print';

import { usePrinter } from '../../hooks/usePrinter';
import { loadImageAsRGBA } from '../../utils/canvasHelper';
import './index.less';

const TARGET_WIDTH = 384; // 58mm 热敏打印机标准宽度

export default function ImagePage() {
  const [imagePath, setImagePath] = useState<string>('');
  const [printing, setPrinting] = useState(false);
  const [imageInfo, setImageInfo] = useState<{ w: number; h: number; bytes: number } | null>(null);
  const printer = usePrinter();

  const handleChoose = async () => {
    try {
      const res = await Taro.chooseImage({
        count: 1,
        sourceType: ['album', 'camera'],
        sizeType: ['original', 'compressed']
      });
      const path = res.tempFilePaths[0];
      if (!path || !path.startsWith('wxfile://')) {
        throw new Error('非法的图片路径');
      }
      setImagePath(path);
      Taro.showToast({ title: '已选择图片', icon: 'success' });
    } catch (err: any) {
      Taro.showToast({ title: err?.errMsg ?? err?.message ?? '选择失败', icon: 'none' });
    }
  };

  const handlePrint = async () => {
    if (!imagePath) {
      Taro.showToast({ title: '请先选择图片', icon: 'none' });
      return;
    }
    if (!printer) {
      Taro.showToast({ title: '请先在「打印机管理」连接设备', icon: 'none' });
      return;
    }

    setPrinting(true);
    try {
      // 1. 读取 RGBA 像素
      const rgba = await loadImageAsRGBA(imagePath, TARGET_WIDTH);

      // 2. 转 1-bit 灰度位图 (适配 ESC/POS GS v 0 指令)
      const bitmap = ImageProcessing.toBitmap(rgba.data, rgba.width, rgba.height, {
        ditheringAlgorithm: 'floyd-steinberg',
        threshold: 128
      });

      const bytesPerRow = Math.ceil(rgba.width / 8);
      const totalBytes = bytesPerRow * rgba.height;
      setImageInfo({ w: rgba.width, h: rgba.height, bytes: totalBytes });

      // 3. 链式打印 (image 接受 data, width, height)
      await printer
        .align('center')
        .text('=== 图片打印 ===', { encoding: 'GBK' })
        .feed()
        .image(bitmap, rgba.width, rgba.height)
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
    <View className="image-page">
      <View className="image-card">
        {imagePath ? (
          <Image src={imagePath} mode="aspectFit" className="preview" />
        ) : (
          <View className="empty">
            <Text>🖼️</Text>
            <Text>未选择图片</Text>
          </View>
        )}
        {imageInfo && (
          <View className="info">
            <Text>宽: {imageInfo.w} px</Text>
            <Text>高: {imageInfo.h} px</Text>
            <Text>位图: {(imageInfo.bytes / 1024).toFixed(1)} KB</Text>
          </View>
        )}
      </View>

      <View className="actions">
        <Button onClick={handleChoose} type="primary">
          📷 选择图片
        </Button>
        <Button onClick={handlePrint} disabled={!imagePath || printing} loading={printing}>
          {printing ? '处理中...' : '🖨️ 打印图片'}
        </Button>
      </View>

      <View className="tip">
        <Text>📌 支持 JPG/PNG 格式</Text>
        <Text>📌 宽度 384px (58mm 热敏打印机)</Text>
        <Text>📌 Floyd-Steinberg 抖动算法</Text>
        <Text>📌 流程: 选择 → OffscreenCanvas 取像素 → 灰度转换 → GS v 0 指令</Text>
      </View>
    </View>
  );
}