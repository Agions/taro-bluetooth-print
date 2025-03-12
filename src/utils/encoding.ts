/**
 * 字符编码转换工具
 */

/**
 * 将文本转换为Uint8Array
 * @param text 文本内容
 * @param encoding 编码方式
 */
export function textToBuffer(text: string, encoding: 'utf-8' | 'gbk' = 'utf-8'): Uint8Array {
  if (encoding === 'utf-8') {
    return new TextEncoder().encode(text);
  } else if (encoding === 'gbk') {
    return gbkEncode(text);
  }
  return new TextEncoder().encode(text);
}

/**
 * 将Uint8Array转换为文本
 * @param buffer 二进制数据
 * @param encoding 编码方式
 */
export function bufferToText(buffer: Uint8Array, encoding: 'utf-8' | 'gbk' = 'utf-8'): string {
  if (encoding === 'utf-8') {
    return new TextDecoder('utf-8').decode(buffer);
  } else if (encoding === 'gbk') {
    return gbkDecode(buffer);
  }
  return new TextDecoder('utf-8').decode(buffer);
}

/**
 * GBK编码表 (简化版本，仅包含常用字符)
 * 实际应用中应该使用完整的GBK编码表或使用第三方库
 */
const GBK_MAP: Record<string, number[]> = {
  // 基本ASCII字符 (0x00-0x7F)
  // 中文字符映射 (简化示例)
  '中': [0xD6, 0xD0],
  '文': [0xCE, 0xC4],
  '打': [0xB4, 0xF2],
  '印': [0xD3, 0xA1],
  '机': [0xBB, 0xFA],
  // ... 更多字符
};

/**
 * GBK编码 (简化实现)
 * 在实际应用中，应该使用更完整的GBK编码库
 * @param text 要编码的文本
 */
function gbkEncode(text: string): Uint8Array {
  // 计算需要的字节数
  let byteLength = 0;
  for (const char of text) {
    if (char.charCodeAt(0) <= 0x7F) {
      byteLength += 1; // ASCII字符占1字节
    } else if (GBK_MAP[char]) {
      byteLength += 2; // 中文字符占2字节
    } else {
      byteLength += 2; // 未知字符，假设占2字节
    }
  }
  
  const result = new Uint8Array(byteLength);
  let offset = 0;
  
  for (const char of text) {
    if (char.charCodeAt(0) <= 0x7F) {
      // ASCII字符
      result[offset++] = char.charCodeAt(0);
    } else if (GBK_MAP[char]) {
      // 中文字符
      const bytes = GBK_MAP[char];
      result[offset++] = bytes[0];
      result[offset++] = bytes[1];
    } else {
      // 未知字符，使用问号替代
      result[offset++] = 0x3F; // ?
      result[offset++] = 0x3F; // ?
    }
  }
  
  return result;
}

/**
 * GBK解码 (简化实现)
 * 在实际应用中，应该使用更完整的GBK解码库
 * @param buffer 要解码的数据
 */
function gbkDecode(buffer: Uint8Array): string {
  let result = '';
  
  // 反向映射表
  const reverseMap: Record<string, string> = {};
  for (const [char, bytes] of Object.entries(GBK_MAP)) {
    const key = `${bytes[0]},${bytes[1]}`;
    reverseMap[key] = char;
  }
  
  let i = 0;
  while (i < buffer.length) {
    if (buffer[i] <= 0x7F) {
      // ASCII字符
      result += String.fromCharCode(buffer[i]);
      i += 1;
    } else {
      // 中文字符
      if (i + 1 < buffer.length) {
        const key = `${buffer[i]},${buffer[i + 1]}`;
        if (reverseMap[key]) {
          result += reverseMap[key];
        } else {
          result += '?';
        }
        i += 2;
      } else {
        // 数据不完整
        result += '?';
        i += 1;
      }
    }
  }
  
  return result;
}

/**
 * 检测文本是否包含中文字符
 * @param text 要检测的文本
 */
export function containsChinese(text: string): boolean {
  return /[\u4E00-\u9FFF]/.test(text);
}

/**
 * 检测文本所需的编码
 * 如果包含中文字符，返回'gbk'，否则返回'utf-8'
 * @param text 要检测的文本
 */
export function detectEncoding(text: string): 'utf-8' | 'gbk' {
  return containsChinese(text) ? 'gbk' : 'utf-8';
} 