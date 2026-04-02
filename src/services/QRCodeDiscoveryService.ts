/**
 * QRCodeDiscoveryService - 二维码打印机配对服务
 *
 * 用于扫描打印机屏幕二维码获取设备信息并直连
 *
 * 支持的二维码格式：
 * 1. 商米格式 (Sunmi): 包含蓝牙地址和服务信息
 * 2. 标准格式: 包含 MAC 地址
 * 3. 自定义格式: 可扩展
 */

/**
 * 二维码发现服务配置选项
 */
export interface QRCodeDiscoveryOptions {
  /** 二维码格式类型 */
  format: 'sunmi' | 'standard' | 'custom';
  /** 是否自动连接 */
  autoConnect?: boolean;
  /** 自定义解析函数 */
  parser?: (content: string) => ParsedDeviceInfo;
}

/**
 * 解析后的设备信息
 */
export interface ParsedDeviceInfo {
  /** 设备名称 */
  name?: string;
  /** 蓝牙 MAC 地址 */
  address?: string;
  /** 服务 UUID */
  serviceUuid?: string;
  /** 设备类型 */
  type?: 'printer' | 'scanner' | 'other';
  /** 其他元数据 */
  metadata?: Record<string, string>;
}

/**
 * 发现结果
 */
export interface DiscoveryResult {
  /** 解析后的设备信息 */
  device: ParsedDeviceInfo;
  /** 原始二维码内容 */
  raw: string;
  /** 解析格式 */
  format: string;
}

/**
 * MAC 地址正则表达式 (冒号分隔)
 */
const MAC_COLON_PATTERN = /^([0-9A-Fa-f]{2}:[0-9A-Fa-f]{2}:[0-9A-Fa-f]{2}:[0-9A-Fa-f]{2}:[0-9A-Fa-f]{2}:[0-9A-Fa-f]{2})$/;

/**
 * MAC 地址正则表达式 (连字符分隔)
 */
const MAC_HYPHEN_PATTERN = /^([0-9A-Fa-f]{2}-[0-9A-Fa-f]{2}-[0-9A-Fa-f]{2}-[0-9A-Fa-f]{2}-[0-9A-Fa-f]{2}-[0-9A-Fa-f]{2})$/;

/**
 * MAC 地址正则表达式 (无分隔符)
 */
const MAC_PLAIN_PATTERN = /^([0-9A-Fa-f]{12})$/;

/**
 * 商米 JSON 格式正则
 */
const SUNMI_JSON_PATTERN = /^\{"name"\s*:\s*"([^"]+)"\s*,\s*"mac"\s*:\s*"([^"]+)"[^}]*\}$/;

/**
 * 商米分隔符格式正则 (格式: name|MAC|type)
 */
const SUNMI_PIPE_PATTERN = /^([^\|]+)\|([0-9A-Fa-f:]+)\|([^\|]+)$/;

/**
 * 二维码发现服务
 */
export class QRCodeDiscoveryService {
  private options: QRCodeDiscoveryOptions;

  constructor(options: QRCodeDiscoveryOptions) {
    this.options = options;
  }

  /**
   * 解析二维码内容
   * @param content 二维码字符串内容
   * @returns 解析结果
   */
  parse(content: string): DiscoveryResult {
    if (!content || typeof content !== 'string') {
      return {
        device: { type: 'other' },
        raw: content || '',
        format: 'unknown',
      };
    }

    const trimmedContent = content.trim();

    // 根据格式选择解析器
    switch (this.options.format) {
      case 'sunmi':
        return this.parseSunmi(trimmedContent);
      case 'standard':
        return this.parseStandard(trimmedContent);
      case 'custom':
        return this.options.parser
          ? { device: this.options.parser(trimmedContent), raw: trimmedContent, format: 'custom' }
          : this.parseStandard(trimmedContent);
      default:
        return this.parseStandard(trimmedContent);
    }
  }

  /**
   * 解析商米格式二维码
   * 商米打印机二维码通常包含:
   * - 设备名称
   * - 蓝牙地址
   * - 连接参数
   *
   * 支持的格式:
   * 1. JSON: {"name":"SUNMI P2","mac":"AA:BB:CC:DD:EE:FF","type":"printer"}
   * 2. 分隔符: SUNMI P2|AA:BB:CC:DD:EE:FF|printer
   */
  parseSunmi(content: string): DiscoveryResult {
    // 尝试解析 JSON 格式
    const jsonResult = this.parseSunmiJson(content);
    if (jsonResult) {
      return jsonResult;
    }

    // 尝试解析分隔符格式
    const pipeResult = this.parseSunmiPipe(content);
    if (pipeResult) {
      return pipeResult;
    }

    // 尝试解析纯 MAC 地址（商米设备有时只显示 MAC）
    const macResult = this.parseMacAddress(content);
    if (macResult) {
      return {
        device: { ...macResult.device, name: 'Sunmi Device', type: 'printer' },
        raw: content,
        format: 'sunmi-mac',
      };
    }

    // 无法解析，返回原始内容
    return {
      device: { type: 'other', metadata: { raw: content } },
      raw: content,
      format: 'sunmi-unknown',
    };
  }

  /**
   * 解析商米 JSON 格式
   */
  private parseSunmiJson(content: string): DiscoveryResult | null {
    // 检查是否是 JSON 格式
    if (!content.startsWith('{') || !content.endsWith('}')) {
      return null;
    }

    try {
      // 尝试使用正则解析（更可靠）
      const match = content.match(SUNMI_JSON_PATTERN);
      if (match) {
        return {
          device: {
            name: match[1],
            address: match[2],
            type: 'printer',
            metadata: this.extractJsonMetadata(content),
          },
          raw: content,
          format: 'sunmi-json',
        };
      }

      // 尝试完整 JSON 解析
      const json = JSON.parse(content);
      if (json.mac || json.MAC || json.address || json.bluetooth) {
        const address = json.mac || json.MAC || json.address || json.bluetooth;
        const name = json.name || json.Name || json.deviceName || 'Sunmi Device';
        const deviceType = this.normalizeDeviceType(json.type || json.deviceType);

        return {
          device: {
            name,
            address: this.normalizeMacAddress(address),
            type: deviceType,
            serviceUuid: json.serviceUuid || json.uuid,
            metadata: this.extractJsonMetadata(content),
          },
          raw: content,
          format: 'sunmi-json',
        };
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * 解析商米分隔符格式 (name|MAC|type)
   */
  private parseSunmiPipe(content: string): DiscoveryResult | null {
    const match = content.match(SUNMI_PIPE_PATTERN);
    if (!match) {
      return null;
    }

    const [, name, mac, type] = match;
    const normalizedMac = this.normalizeMacAddress(mac);
    if (!normalizedMac) {
      return null;
    }

    return {
      device: {
        name: name.trim(),
        address: normalizedMac,
        type: this.normalizeDeviceType(type.trim()),
        metadata: { originalType: type },
      },
      raw: content,
      format: 'sunmi-pipe',
    };
  }

  /**
   * 解析标准格式二维码
   * 标准格式通常是 MAC 地址或蓝牙设备信息
   *
   * 支持的格式:
   * 1. AA:BB:CC:DD:EE:FF (冒号分隔)
   * 2. AA-BB-CC-DD-EE-FF (连字符分隔)
   * 3. AABBCCDDEEFF (无分隔符)
   */
  parseStandard(content: string): DiscoveryResult {
    // 尝试解析 MAC 地址
    const macResult = this.parseMacAddress(content);
    if (macResult) {
      return macResult;
    }

    // 无法解析，返回原始内容
    return {
      device: { type: 'other', metadata: { raw: content } },
      raw: content,
      format: 'standard-unknown',
    };
  }

  /**
   * 解析 MAC 地址
   */
  private parseMacAddress(content: string): DiscoveryResult | null {
    // 尝试冒号分隔格式
    if (MAC_COLON_PATTERN.test(content)) {
      return {
        device: {
          address: content.toUpperCase(),
          type: 'other',
        },
        raw: content,
        format: 'mac-colon',
      };
    }

    // 尝试连字符分隔格式
    if (MAC_HYPHEN_PATTERN.test(content)) {
      return {
        device: {
          address: content.toUpperCase(),
          type: 'other',
        },
        raw: content,
        format: 'mac-hyphen',
      };
    }

    // 尝试无分隔符格式
    if (MAC_PLAIN_PATTERN.test(content)) {
      const formatted = this.formatMacWithColons(content.toUpperCase());
      return {
        device: {
          address: formatted,
          type: 'other',
        },
        raw: content,
        format: 'mac-plain',
      };
    }

    return null;
  }

  /**
   * 标准化 MAC 地址格式（转换为大写冒号分隔）
   */
  private normalizeMacAddress(mac: string): string | null {
    if (!mac || typeof mac !== 'string') {
      return null;
    }

    // 移除空格
    const cleaned = mac.replace(/\s/g, '').toUpperCase();

    // 冒号格式
    if (MAC_COLON_PATTERN.test(cleaned)) {
      return cleaned;
    }

    // 连字符格式
    if (MAC_HYPHEN_PATTERN.test(cleaned)) {
      return cleaned.replace(/-/g, ':');
    }

    // 无分隔符格式
    if (MAC_PLAIN_PATTERN.test(cleaned)) {
      return this.formatMacWithColons(cleaned);
    }

    return null;
  }

  /**
   * 格式化 MAC 地址为冒号分隔格式
   */
  private formatMacWithColons(mac: string): string {
    const parts: string[] = [];
    for (let i = 0; i < mac.length; i += 2) {
      parts.push(mac.substring(i, i + 2));
    }
    return parts.join(':');
  }

  /**
   * 标准化设备类型
   */
  private normalizeDeviceType(type: string | undefined): 'printer' | 'scanner' | 'other' {
    if (!type) {
      return 'other';
    }

    const normalized = type.toLowerCase().trim();

    if (normalized.includes('print') || normalized === 'p') {
      return 'printer';
    }

    if (normalized.includes('scan') || normalized === 's') {
      return 'scanner';
    }

    return 'other';
  }

  /**
   * 从 JSON 字符串中提取元数据
   */
  private extractJsonMetadata(jsonStr: string): Record<string, string> {
    const metadata: Record<string, string> = {};
    try {
      const json = JSON.parse(jsonStr);
      const knownKeys = ['name', 'mac', 'MAC', 'address', 'type', 'deviceType', 'serviceUuid', 'uuid'];
      for (const [key, value] of Object.entries(json)) {
        if (!knownKeys.includes(key) && value !== undefined && value !== null) {
          metadata[key] = String(value);
        }
      }
    } catch {
      // Ignore parse errors
    }
    return metadata;
  }

  /**
   * 获取配置选项
   */
  getOptions(): QRCodeDiscoveryOptions {
    return { ...this.options };
  }

  /**
   * 验证解析结果是否有效
   */
  static isValidResult(result: DiscoveryResult): boolean {
    return !!(
      result &&
      result.device &&
      result.device.address &&
      /^[0-9A-Fa-f:]{17}$/.test(result.device.address)
    );
  }
}

// Re-export QRCodeParser utilities for convenience
export {
  parseQRCode,
  parseMultipleQRCodes,
  detectQRCodeFormat,
  addQRCodeFormat,
  removeQRCodeFormat,
  getSupportedFormats,
  QR_CODE_FORMATS,
} from './QRCodeParser';
export type { QRCodeFormat } from './QRCodeParser';
