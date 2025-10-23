import { logger } from '../utils/logger';

/**
 * 图片处理工具，用于将图片转换为点阵数据供打印机打印
 */
export class PrinterImage {
  /**
   * 将图片URL转换为ImageData
   * @param imageUrl 图片URL或Base64
   * @param maxWidth 最大宽度（像素）
   */
  static async urlToImageData(imageUrl: string, maxWidth: number = 384): Promise<{
    data: Uint8ClampedArray;
    width: number;
    height: number;
  }> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => {
        try {
          // 计算调整后的宽高，保持比例
          let width = img.width;
          let height = img.height;
          
          if (width > maxWidth) {
            const ratio = maxWidth / width;
            width = maxWidth;
            height = Math.floor(height * ratio);
          }
          
          // 创建canvas并绘制图像
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('无法创建2D上下文'));
            return;
          }
          
          // 绘制图像
          ctx.fillStyle = 'white';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
          
          // 获取图像数据
          const imageData = ctx.getImageData(0, 0, width, height);
          
          resolve({
            data: imageData.data,
            width,
            height
          });
        } catch (error) {
          reject(error);
        }
      };
      
      img.onerror = () => {
        reject(new Error('图片加载失败'));
      };
      
      // 设置图片源
      img.crossOrigin = 'Anonymous'; // 允许跨域
      img.src = imageUrl;
    });
  }
  
  /**
   * 将图片数据转换为打印机可用的点阵数据
   * @param imageData 图片数据
   * @param width 图片宽度
   * @param threshold 阈值，0-255，默认128
   */
  static bitmapToRasterData(imageData: Uint8ClampedArray, width: number, threshold: number = 128): Uint8Array {
    const height = imageData.length / 4 / width;
    
    // 计算每行字节数（8个点一个字节）
    const bytesPerLine = Math.ceil(width / 8);
    const result = new Uint8Array(bytesPerLine * height);
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const pos = (y * width + x) * 4;
        
        // 获取像素的灰度值
        const r = imageData[pos];
        const g = imageData[pos + 1];
        const b = imageData[pos + 2];
        const gray = 0.299 * r + 0.587 * g + 0.114 * b;
        
        // 根据阈值决定是否为黑点
        const isBlack = gray < threshold;
        
        if (isBlack) {
          // 计算点在结果数组中的位置
          const bytePos = Math.floor(x / 8) + y * bytesPerLine;
          const bitPos = 7 - (x % 8);
          
          // 设置对应位为1
          result[bytePos] |= (1 << bitPos);
        }
      }
    }
    
    return result;
  }
  
  /**
   * 生成打印图片的ESC/POS指令
   * @param rasterData 光栅图像数据
   * @param width 图片宽度（像素）
   * @param height 图片高度（像素）
   */
  static generateRasterCommand(rasterData: Uint8Array, width: number, height: number): Uint8Array {
    // 每行字节数
    const bytesPerLine = Math.ceil(width / 8);
    
    // 命令序列
    // 1. 初始化打印机
    // 2. 设置行间距为0 (使图片连续)
    // 3. 对于每一行:
    //    - 发送位图数据命令
    //    - 发送该行的数据
    // 4. 重置行间距
    
    // 计算总命令长度
    const headerSize = 4; // ESC @ ESC 3 0
    const lineCommandSize = 4; // ESC * m nL nH
    const resetSize = 2; // ESC 2
    
    const totalSize = headerSize + (lineCommandSize + bytesPerLine) * height + resetSize;
    const result = new Uint8Array(totalSize);
    let offset = 0;
    
    // 初始化
    result[offset++] = 0x1B; // ESC
    result[offset++] = 0x40; // @
    
    // 设置行间距为0
    result[offset++] = 0x1B; // ESC
    result[offset++] = 0x33; // 3
    result[offset++] = 0x00; // 0
    
    // 计算位图模式
    // 根据打印机不同，选择合适的模式:
    // m=0: 8点单密度
    // m=1: 8点双密度
    // m=32: 24点单密度
    // m=33: 24点双密度
    const mode = 33; // 使用24点双密度模式
    
    for (let y = 0; y < height; y++) {
      // 位图命令: ESC * m nL nH
      result[offset++] = 0x1B; // ESC
      result[offset++] = 0x2A; // *
      result[offset++] = mode; // 模式
      
      // 计算宽度字节
      // 由于使用24点，每3个字节表示24个点
      // 需要根据实际宽度计算nL和nH
      const lineWidth = bytesPerLine;
      result[offset++] = lineWidth & 0xFF; // nL
      result[offset++] = (lineWidth >> 8) & 0xFF; // nH
      
      // 复制该行的图像数据
      const lineOffset = y * bytesPerLine;
      for (let i = 0; i < bytesPerLine; i++) {
        result[offset++] = rasterData[lineOffset + i];
      }
      
      // 添加换行
      result[offset++] = 0x0A; // LF
    }
    
    // 重置行间距为默认值
    result[offset++] = 0x1B; // ESC
    result[offset++] = 0x32; // 2
    
    return result.slice(0, offset); // 返回实际使用的部分
  }
  
  /**
   * 使用Dithering算法处理图像，提高打印效果
   * Floyd-Steinberg抖动算法
   * @param imageData 原始图像数据
   * @param width 图像宽度
   * @param height 图像高度
   * @param threshold 阈值 (0-255)
   * @returns 处理后的图像数据
   */
  static ditheringProcess(imageData: Uint8ClampedArray, width: number, height: number, threshold: number = 128): Uint8ClampedArray {
    // 创建副本，避免修改原始数据
    const result = new Uint8ClampedArray(imageData.length);
    for (let i = 0; i < imageData.length; i++) {
      result[i] = imageData[i];
    }
    
    // 创建灰度图像
    const gray = new Uint8Array(width * height);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const pos = (y * width + x) * 4;
        const r = result[pos];
        const g = result[pos + 1];
        const b = result[pos + 2];
        gray[y * width + x] = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
      }
    }
    
    // Floyd-Steinberg抖动算法
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        const oldPixel = gray[idx];
        // 阈值化处理
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
        result[pos] = value;
        result[pos + 1] = value;
        result[pos + 2] = value;
        // Alpha通道保持不变
      }
    }
    
    return result;
  }
  
  /**
   * 综合处理图片并生成打印命令
   * @param imageUrl 图片URL或Base64
   * @param options 图片处理选项
   */
  static async processImage(imageUrl: string, options: {
    maxWidth?: number;
    threshold?: number;
    dithering?: boolean;
  } = {}): Promise<Uint8Array> {
    try {
      const maxWidth = options.maxWidth || 384;
      const threshold = options.threshold || 128;
      const dithering = options.dithering !== undefined ? options.dithering : true;
      
      // 加载图片并转换为ImageData
      const { data, width, height } = await this.urlToImageData(imageUrl, maxWidth);
      
      // 应用抖动算法（如果启用）
      let processedData = data;
      if (dithering) {
        processedData = this.ditheringProcess(data, width, height, threshold);
      }
      
      // 转换为点阵数据
      const rasterData = this.bitmapToRasterData(processedData, width, threshold);
      
      // 生成打印命令
      return this.generateRasterCommand(rasterData, width, height);
    } catch (error) {
      logger.error('处理图片失败', error);
      throw error;
    }
  }
  
  /**
   * 处理Base64图片数据
   * @param base64 Base64编码的图片数据
   * @param options 图片处理选项
   */
  static async processBase64Image(base64: string, options: {
    maxWidth?: number;
    threshold?: number;
    dithering?: boolean;
  } = {}): Promise<Uint8Array> {
    // 确保是有效的Base64
    if (!base64.startsWith('data:image')) {
      base64 = `data:image/png;base64,${base64}`;
    }
    
    return await this.processImage(base64, options);
  }
} 