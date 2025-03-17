// Web Worker 文件，用于处理图像和OCR任务
import { logger } from './logger';

// Worker上下文类型
const ctx: Worker = self as any;

// 图像处理缓存，避免重复处理相同图像
interface ImageCache {
  [key: string]: {
    result: any;
    timestamp: number;
  }
}

// 缓存配置
const CACHE_EXPIRY_TIME = 5 * 60 * 1000; // 5分钟过期
const imageCache: ImageCache = {};

// 定期清理缓存
setInterval(() => {
  const now = Date.now();
  Object.keys(imageCache).forEach(key => {
    if (now - imageCache[key].timestamp > CACHE_EXPIRY_TIME) {
      delete imageCache[key];
    }
  });
}, 60 * 1000); // 每分钟检查一次

/**
 * 图像灰度处理
 */
function convertToGrayscale(imageData: Uint8ClampedArray): Uint8ClampedArray {
  const result = new Uint8ClampedArray(imageData.length);
  
  for (let i = 0; i < imageData.length; i += 4) {
    const r = imageData[i];
    const g = imageData[i + 1];
    const b = imageData[i + 2];
    const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
    
    result[i] = gray;     // R
    result[i + 1] = gray; // G
    result[i + 2] = gray; // B
    result[i + 3] = imageData[i + 3]; // 保持原始Alpha通道
  }
  
  return result;
}

/**
 * 图像预处理：调整大小和优化
 */
function preprocessImage(imageData: ImageData, maxWidth: number = 384): ImageData {
  const { width, height, data } = imageData;
  
  // 如果已经小于最大宽度，无需调整大小
  if (width <= maxWidth) {
    return imageData;
  }
  
  // 保持宽高比调整大小
  const ratio = maxWidth / width;
  const newWidth = maxWidth;
  const newHeight = Math.floor(height * ratio);
  
  // 检查OffscreenCanvas支持
  if (typeof OffscreenCanvas === 'undefined') {
    throw new Error('当前环境不支持OffscreenCanvas');
  }
  
  // 创建一个离屏canvas进行缩放
  const canvas = new OffscreenCanvas(newWidth, newHeight);
  const ctx = canvas.getContext('2d') as OffscreenCanvasRenderingContext2D;
  
  if (!ctx) {
    throw new Error('无法创建OffscreenCanvas上下文');
  }
  
  // 将原始图像数据绘制到临时canvas上
  const tempCanvas = new OffscreenCanvas(width, height);
  const tempCtx = tempCanvas.getContext('2d') as OffscreenCanvasRenderingContext2D;
  if (!tempCtx) {
    throw new Error('无法创建临时OffscreenCanvas上下文');
  }
  
  // 将ImageData放入临时canvas
  tempCtx.putImageData(imageData, 0, 0);
  
  // 绘制并缩放图像
  ctx.drawImage(tempCanvas, 0, 0, width, height, 0, 0, newWidth, newHeight);
  
  // 返回处理后的图像数据
  return ctx.getImageData(0, 0, newWidth, newHeight);
}

/**
 * Floyd-Steinberg抖动算法处理图像
 */
function applyDithering(imageData: ImageData, threshold: number = 128): ImageData {
  const { width, height, data } = imageData;
  const resultData = new Uint8ClampedArray(data.length);
  
  // 先复制数据
  for (let i = 0; i < data.length; i++) {
    resultData[i] = data[i];
  }
  
  // 创建灰度数组
  const gray = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const pos = (y * width + x) * 4;
      const r = resultData[pos];
      const g = resultData[pos + 1];
      const b = resultData[pos + 2];
      gray[y * width + x] = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
    }
  }
  
  // 应用Floyd-Steinberg抖动
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const oldPixel = gray[idx];
      const newPixel = oldPixel < threshold ? 0 : 255;
      gray[idx] = newPixel;
      
      // 计算误差
      const error = oldPixel - newPixel;
      
      // 将误差分散到周围像素
      if (x + 1 < width) {
        gray[idx + 1] += error * (7 / 16);
      }
      if (y + 1 < height) {
        if (x > 0) {
          gray[idx + width - 1] += error * (3 / 16);
        }
        gray[idx + width] += error * (5 / 16);
        if (x + 1 < width) {
          gray[idx + width + 1] += error * (1 / 16);
        }
      }
    }
  }
  
  // 更新结果数据
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const pos = (y * width + x) * 4;
      const value = gray[y * width + x];
      resultData[pos] = value;
      resultData[pos + 1] = value;
      resultData[pos + 2] = value;
      // Alpha通道保持不变
    }
  }
  
  return new ImageData(resultData, width, height);
}

/**
 * 处理图像并返回处理结果
 */
async function processImage(data: {
  imageData: ImageData;
  options: {
    maxWidth?: number;
    threshold?: number;
    dithering?: boolean;
  }
}): Promise<ImageData> {
  try {
    const { imageData, options } = data;
    const maxWidth = options.maxWidth || 384;
    const threshold = options.threshold || 128;
    const dithering = options.dithering !== undefined ? options.dithering : true;
    
    // 生成缓存键
    const cacheKey = `${imageData.width}x${imageData.height}-${maxWidth}-${threshold}-${dithering}`;
    
    // 检查缓存
    if (imageCache[cacheKey] && (Date.now() - imageCache[cacheKey].timestamp < CACHE_EXPIRY_TIME)) {
      return imageCache[cacheKey].result;
    }
    
    // 预处理图像
    let processedData = preprocessImage(imageData, maxWidth);
    
    // 应用抖动算法
    if (dithering) {
      processedData = applyDithering(processedData, threshold);
    }
    
    // 缓存结果
    imageCache[cacheKey] = {
      result: processedData,
      timestamp: Date.now()
    };
    
    return processedData;
  } catch (error) {
    console.error('图像处理失败:', error);
    throw error;
  }
}

/**
 * OCR文本识别（模拟实现，实际项目中需要集成真实OCR库）
 */
async function performOCR(data: {
  imageData: ImageData,
  options?: {
    language?: string;
    detectOrientation?: boolean;
  }
}): Promise<{
  text: string;
  confidence: number;
  regions?: Array<{
    text: string;
    boundingBox: { x: number, y: number, width: number, height: number }
  }>;
}> {
  // 这里应该集成实际的OCR库，如Tesseract.js
  // 下面是模拟实现
  return {
    text: "模拟OCR结果",
    confidence: 0.95,
    regions: []
  };
}

// 消息处理器
ctx.addEventListener('message', async (e: MessageEvent) => {
  try {
    const { type, data, id } = e.data;
    
    switch (type) {
      case 'processImage':
        const processedImage = await processImage(data);
        ctx.postMessage({ id, result: processedImage, error: null });
        break;
        
      case 'performOCR':
        const ocrResult = await performOCR(data);
        ctx.postMessage({ id, result: ocrResult, error: null });
        break;
        
      default:
        throw new Error(`未知消息类型: ${type}`);
    }
  } catch (error) {
    ctx.postMessage({
      id: e.data.id,
      result: null,
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// 通知主线程worker已准备就绪
ctx.postMessage({ type: 'ready' }); 