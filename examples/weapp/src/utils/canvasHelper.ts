/**
 * canvasHelper.ts — 微信小程序 Canvas 像素数据工具
 *
 * 背景: taro-bluetooth-print 的 ImageProcessing.toBitmap() 期望 RGBA Uint8Array,
 *       但微信小程序的 wx.chooseImage 只返回临时文件路径,没有直接的像素访问.
 *       需要用 <canvas type="2d"> + wx.canvasGetImageData 桥接.
 *
 * 用法:
 * ```tsx
 * const rgba = await loadImageAsRGBA(imagePath, 384);
 * const bitmap = ImageProcessing.toBitmap(rgba.data, rgba.width, rgba.height, {
 *   threshold: 128,
 *   ditheringAlgorithm: 'floyd-steinberg'
 * });
 * printer.image(bitmap, rgba.width, rgba.height);
 * ```
 */

import Taro from '@tarojs/taro';

export interface RGBAResult {
  /** RGBA 像素,长度 = width * height * 4 */
  data: Uint8Array;
  /** 像素宽度 */
  width: number;
  /** 像素高度 */
  height: number;
}

/**
 * 用 OffscreenCanvas 把图片转成 RGBA 像素数据
 *
 * @param imagePath 微信临时路径 (wxfile://...)
 * @param targetWidth 目标宽度 (px). 高度按原图比例自动计算
 * @returns { data, width, height }
 *
 * 性能:
 * - 384px 宽图 (58mm 热敏) 处理约 50ms
 * - OffscreenCanvas 不挂载到 DOM,适合后台处理
 *
 * 失败抛出 Error, 调用方需 try-catch
 */
export async function loadImageAsRGBA(imagePath: string, targetWidth = 384): Promise<RGBAResult> {
  if (!imagePath) throw new Error('imagePath is required');

  // 1. 取原图尺寸
  const info = await Taro.getImageInfo({ src: imagePath });
  const srcW = info.width;
  const srcH = info.height;
  if (!srcW || !srcH) throw new Error('Invalid image dimensions');

  // 2. 按比例缩放
  const scale = targetWidth / srcW;
  const dstW = Math.max(1, Math.round(srcW * scale));
  const dstH = Math.max(1, Math.round(srcH * scale));

  // 3. 用 OffscreenCanvas 绘制并读像素
  const canvas = Taro.createOffscreenCanvas({ type: '2d', width: dstW, height: dstH });
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');

  // 微信基础库 2.7.0+ 支持 drawImage(临时路径)
  ctx.drawImage(imagePath, 0, 0, dstW, dstH);

  // 4. 读像素
  const imageData = ctx.getImageData(0, 0, dstW, dstH);
  return {
    data: new Uint8Array(imageData.data.buffer, imageData.data.byteOffset, imageData.data.byteLength),
    width: dstW,
    height: dstH
  };
}