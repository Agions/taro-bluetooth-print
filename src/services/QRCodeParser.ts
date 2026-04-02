/**
 * QRCodeParser - 二维码解析工具
 *
 * 提供通用的二维码解析能力，支持多种格式的自动识别
 */

import { ParsedDeviceInfo } from './QRCodeDiscoveryService';

/**
 * 二维码格式定义
 */
export interface QRCodeFormat {
  /** 格式名称 */
  name: string;
  /** 正则表达式 */
  pattern: RegExp;
  /** 解析函数 */
  parse: (match: RegExpMatchArray, raw: string) => ParsedDeviceInfo;
}

/**
 * 内置支持的二维码格式
 */
export const QR_CODE_FORMATS: QRCodeFormat[] = [
  // 商米 JSON 格式
  {
    name: 'sunmi-json',
    pattern: /^\{"name"\s*:\s*"([^"]+)"\s*,\s*"mac"\s*:\s*"([^"]+)"[^}]*\}$/,
    parse: (match) => ({
      name: match[1] ?? '',
      address: (match[2] ?? '').toUpperCase(),
      type: 'printer',
    }),
  },
  // 商米分隔符格式
  {
    name: 'sunmi-pipe',
    pattern: /^([^\|]+)\|([0-9A-Fa-f:]+)\|([^\|]+)$/,
    parse: (match) => ({
      name: (match[1] ?? '').trim(),
      address: (match[2] ?? '').toUpperCase(),
      type: 'printer',
    }),
  },
  // MAC 地址（冒号分隔）
  {
    name: 'mac-colon',
    pattern: /^([0-9A-Fa-f]{2}:[0-9A-Fa-f]{2}:[0-9A-Fa-f]{2}:[0-9A-Fa-f]{2}:[0-9A-Fa-f]{2}:[0-9A-Fa-f]{2})$/,
    parse: (match) => ({
      address: (match[1] ?? '').toUpperCase(),
      type: 'other',
    }),
  },
  // MAC 地址（连字符分隔）
  {
    name: 'mac-hyphen',
    pattern: /^([0-9A-Fa-f]{2}-[0-9A-Fa-f]{2}-[0-9A-Fa-f]{2}-[0-9A-Fa-f]{2}-[0-9A-Fa-f]{2}-[0-9A-Fa-f]{2})$/,
    parse: (match) => ({
      address: ((match[1] ?? '').toUpperCase()).replace(/-/g, ':'),
      type: 'other',
    }),
  },
  // MAC 地址（无分隔符）
  {
    name: 'mac-plain',
    pattern: /^([0-9A-Fa-f]{12})$/,
    parse: (match) => {
      const mac = (match[1] ?? '').toUpperCase();
      const formatted = `${mac.slice(0, 2)}:${mac.slice(2, 4)}:${mac.slice(4, 6)}:${mac.slice(6, 8)}:${mac.slice(8, 10)}:${mac.slice(10, 12)}`;
      return {
        address: formatted,
        type: 'other',
      };
    },
  },
];

/**
 * 解析二维码字符串
 *
 * @param content 二维码原始内容
 * @returns 解析后的设备信息，如果无法解析则返回 null
 */
export function parseQRCode(content: string): ParsedDeviceInfo | null {
  if (!content || typeof content !== 'string') {
    return null;
  }

  const trimmedContent = content.trim();

  for (const format of QR_CODE_FORMATS) {
    const match = trimmedContent.match(format.pattern);
    if (match) {
      return format.parse(match, trimmedContent);
    }
  }

  return null;
}

/**
 * 批量解析多个二维码
 *
 * @param contents 二维码内容数组
 * @returns 解析结果数组，包含成功解析和失败的结果
 */
export function parseMultipleQRCodes(contents: string[]): {
  success: Array<{ content: string; device: ParsedDeviceInfo }>;
  failed: string[];
} {
  const success: Array<{ content: string; device: ParsedDeviceInfo }> = [];
  const failed: string[] = [];

  for (const content of contents) {
    const result = parseQRCode(content);
    if (result) {
      success.push({ content, device: result });
    } else {
      failed.push(content);
    }
  }

  return { success, failed };
}

/**
 * 检测二维码内容类型
 *
 * @param content 二维码内容
 * @returns 格式名称，如果无法识别则返回 null
 */
export function detectQRCodeFormat(content: string): string | null {
  if (!content || typeof content !== 'string') {
    return null;
  }

  const trimmedContent = content.trim();

  for (const format of QR_CODE_FORMATS) {
    if (format.pattern.test(trimmedContent)) {
      return format.name;
    }
  }

  return null;
}

/**
 * 添加自定义二维码格式
 *
 * @param format 格式定义
 */
export function addQRCodeFormat(format: QRCodeFormat): void {
  // 检查是否已存在同名格式
  const existingIndex = QR_CODE_FORMATS.findIndex((f) => f.name === format.name);
  if (existingIndex >= 0) {
    QR_CODE_FORMATS[existingIndex] = format;
  } else {
    QR_CODE_FORMATS.push(format);
  }
}

/**
 * 移除自定义二维码格式
 *
 * @param formatName 格式名称
 * @returns 是否成功移除
 */
export function removeQRCodeFormat(formatName: string): boolean {
  const index = QR_CODE_FORMATS.findIndex((f) => f.name === formatName);
  if (index >= 0) {
    QR_CODE_FORMATS.splice(index, 1);
    return true;
  }
  return false;
}

/**
 * 获取所有支持的格式名称列表
 */
export function getSupportedFormats(): string[] {
  return QR_CODE_FORMATS.map((f) => f.name);
}
