import Taro from '@tarojs/taro';

export function ab2hex(buffer: ArrayBuffer): string {
  const hexArr = Array.prototype.map.call(
    new Uint8Array(buffer),
    function(bit: number) {
      return ('00' + bit.toString(16)).slice(-2)
    }
  )
  return hexArr.join('')
}

export function inArray(arr: any[], value: any): boolean {
  return arr.indexOf(value) !== -1
}

export function typedArrayToBuffer(typedArray: Uint8Array): ArrayBuffer {
  // 确保返回正确的ArrayBuffer类型，处理SharedArrayBuffer情况
  if (typedArray.buffer instanceof ArrayBuffer) {
    return typedArray.buffer;
  } else {
    // 如果是SharedArrayBuffer，复制到新的ArrayBuffer
    const arrayBuffer = new ArrayBuffer(typedArray.length);
    new Uint8Array(arrayBuffer).set(typedArray);
    return arrayBuffer;
  }
}

export function bufferToTypedArray(buffer: ArrayBuffer): Uint8Array {
  return new Uint8Array(buffer)
}

export function encodeText(text: string): ArrayBuffer {
  const encoder = new TextEncoder();
  return encoder.encode(text).buffer
}

export function decodeText(buffer: ArrayBuffer): string {
  const decoder = new TextDecoder();
  return decoder.decode(buffer)
}

export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export function isAndroid(): Promise<boolean> {
  return Taro.getSystemInfo().then(info => info.platform === 'android')
}

export function showLoading(title: string): Promise<void> {
  Taro.showLoading({ title });
  return Promise.resolve()
}

export function hideLoading(): Promise<void> {
  Taro.hideLoading();
  return Promise.resolve()
}

export function formatError(error: any): string {
  if (error instanceof Error) {
    return error.message
  }
  if (typeof error === 'string') {
    return error
  }
  if (error && typeof error === 'object') {
    return JSON.stringify(error)
  }
  return '未知错误'
}
