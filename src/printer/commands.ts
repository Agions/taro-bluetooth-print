/**
 * ESC/POS命令集
 * 参考: https://reference.epson-biz.com/modules/ref_escpos/index.php
 */
export class Commands {
  // 初始化打印机
  static INIT = new Uint8Array([0x1B, 0x40]);
  
  // 换行
  static LF = new Uint8Array([0x0A]);
  
  // 回车+换行
  static CRLF = new Uint8Array([0x0D, 0x0A]);
  
  // 切纸
  static CUT = new Uint8Array([0x1D, 0x56, 0x41, 0x00]);
  
  // 蜂鸣
  static BEEP = new Uint8Array([0x1B, 0x42, 0x05, 0x05]);
  
  // 设置对齐方式
  static ALIGN_LEFT = new Uint8Array([0x1B, 0x61, 0x00]);
  static ALIGN_CENTER = new Uint8Array([0x1B, 0x61, 0x01]);
  static ALIGN_RIGHT = new Uint8Array([0x1B, 0x61, 0x02]);
  
  // 字体大小
  static TEXT_NORMAL = new Uint8Array([0x1B, 0x21, 0x00]); // 正常大小
  static TEXT_MEDIUM = new Uint8Array([0x1B, 0x21, 0x08]); // 2倍高
  static TEXT_LARGE = new Uint8Array([0x1B, 0x21, 0x30]); // 2倍宽高
  
  // 加粗
  static BOLD_ON = new Uint8Array([0x1B, 0x45, 0x01]);
  static BOLD_OFF = new Uint8Array([0x1B, 0x45, 0x00]);
  
  // 下划线
  static UNDERLINE_ON = new Uint8Array([0x1B, 0x2D, 0x01]);
  static UNDERLINE_OFF = new Uint8Array([0x1B, 0x2D, 0x00]);
  
  // 反白
  static INVERT_ON = new Uint8Array([0x1D, 0x42, 0x01]);
  static INVERT_OFF = new Uint8Array([0x1D, 0x42, 0x00]);
  
  // 字符间距
  static setCharacterSpacing(spacing: number): Uint8Array {
    return new Uint8Array([0x1B, 0x20, spacing]);
  }
  
  // 行间距
  static setLineSpacing(spacing: number): Uint8Array {
    return new Uint8Array([0x1B, 0x33, spacing]);
  }
  
  // 设置条码高度
  static setBarcodeHeight(height: number): Uint8Array {
    return new Uint8Array([0x1D, 0x68, height]);
  }
  
  // 打印条码
  static printBarcode(content: string, type: number = 73): Uint8Array {
    const encoder = new TextEncoder();
    const contentBytes = encoder.encode(content);
    const result = new Uint8Array(4 + contentBytes.length);
    
    result[0] = 0x1D;  // GS
    result[1] = 0x6B;  // k
    result[2] = type;  // 条码类型 (默认73为CODE128)
    result[3] = contentBytes.length;  // 内容长度
    
    result.set(contentBytes, 4);
    return result;
  }
  
  // 打印二维码
  static printQRCode(content: string, size: number = 6): Uint8Array[] {
    const encoder = new TextEncoder();
    const contentBytes = encoder.encode(content);
    const contentLength = contentBytes.length;
    
    const pL = contentLength % 256;
    const pH = Math.floor(contentLength / 256);
    
    // QR码模型
    const modelCommand = new Uint8Array([0x1D, 0x28, 0x6B, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00]);
    
    // QR码大小
    const sizeCommand = new Uint8Array([0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x43, size]);
    
    // QR码纠错
    const errorCommand = new Uint8Array([0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x45, 0x31]);
    
    // QR码数据
    const dataCommand = new Uint8Array(contentLength + 8);
    dataCommand[0] = 0x1D;
    dataCommand[1] = 0x28;
    dataCommand[2] = 0x6B;
    dataCommand[3] = pL;
    dataCommand[4] = pH;
    dataCommand[5] = 0x31;
    dataCommand[6] = 0x50;
    dataCommand[7] = 0x30;
    dataCommand.set(contentBytes, 8);
    
    // 打印QR码
    const printCommand = new Uint8Array([0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x51, 0x30]);
    
    return [modelCommand, sizeCommand, errorCommand, dataCommand, printCommand];
  }
}