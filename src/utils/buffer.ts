/**
 * 二进制数据处理工具
 */

/**
 * 合并多个ArrayBuffer
 * @param buffers 要合并的ArrayBuffer数组
 */
export function concatArrayBuffers(buffers: ArrayBuffer[]): ArrayBuffer {
  // 计算总长度
  const totalLength = buffers.reduce((len, buffer) => len + buffer.byteLength, 0);
  
  // 创建新的ArrayBuffer
  const result = new Uint8Array(totalLength);
  
  // 复制数据
  let offset = 0;
  for (const buffer of buffers) {
    const view = new Uint8Array(buffer);
    result.set(view, offset);
    offset += buffer.byteLength;
  }
  
  return result.buffer;
}

/**
 * 合并多个Uint8Array
 * @param arrays 要合并的Uint8Array数组
 */
export function concatUint8Arrays(arrays: Uint8Array[]): Uint8Array {
  // 计算总长度
  const totalLength = arrays.reduce((len, array) => len + array.length, 0);
  
  // 创建新的Uint8Array
  const result = new Uint8Array(totalLength);
  
  // 复制数据
  let offset = 0;
  for (const array of arrays) {
    result.set(array, offset);
    offset += array.length;
  }
  
  return result;
}

/**
 * 将数字转换为低字节在前的Uint8Array(小端序)
 * @param value 要转换的数字
 * @param byteLength 字节长度
 */
export function numberToLEBytes(value: number, byteLength: number = 2): Uint8Array {
  const result = new Uint8Array(byteLength);
  
  for (let i = 0; i < byteLength; i++) {
    result[i] = (value >> (i * 8)) & 0xFF;
  }
  
  return result;
}

/**
 * 将数字转换为高字节在前的Uint8Array(大端序)
 * @param value 要转换的数字
 * @param byteLength 字节长度
 */
export function numberToBEBytes(value: number, byteLength: number = 2): Uint8Array {
  const result = new Uint8Array(byteLength);
  
  for (let i = 0; i < byteLength; i++) {
    result[byteLength - 1 - i] = (value >> (i * 8)) & 0xFF;
  }
  
  return result;
}

/**
 * 将Uint8Array转换为十六进制字符串
 * @param array Uint8Array数据
 */
export function uint8ArrayToHex(array: Uint8Array): string {
  return Array.from(array)
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * 将十六进制字符串转换为Uint8Array
 * @param hex 十六进制字符串
 */
export function hexToUint8Array(hex: string): Uint8Array {
  // 确保字符串长度为偶数
  if (hex.length % 2 !== 0) {
    hex = '0' + hex;
  }
  
  const result = new Uint8Array(hex.length / 2);
  
  for (let i = 0; i < hex.length; i += 2) {
    result[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  
  return result;
} 