/**
 * 打印机驱动工厂
 */

import { PrinterDriver } from '../../domain/printer/PrinterDriver';
import { ThermalPrinterDriver } from '../../domain/printer/drivers/ThermalPrinterDriver';

export type PrinterType = 'thermal' | 'label' | 'pos' | 'unknown';

export interface PrinterDriverConfig {
  type: PrinterType;
  model?: string;
  encoding?: string;
  density?: number;
  speed?: number;
  width?: number;
  height?: number;
}

export class PrinterDriverFactory {
  /**
   * 根据类型创建打印机驱动
   */
  static create(config: PrinterDriverConfig): PrinterDriver {
    switch (config.type) {
      case 'thermal':
        return new ThermalPrinterDriver({
          model: config.model || 'generic',
          encoding: config.encoding || 'PC437',
          density: config.density || 8,
          speed: config.speed || 4,
          width: config.width || 58,
          height: config.height || 0
        });

      case 'label':
        // TODO: 实现标签打印机驱动
        throw new Error('Label printer driver not yet implemented');

      case 'pos':
        // TODO: 实现POS打印机驱动
        throw new Error('POS printer driver not yet implemented');

      default:
        throw new Error(`Unsupported printer type: ${config.type}`);
    }
  }

  /**
   * 创建热敏打印机驱动
   */
  static createThermal(config?: Partial<PrinterDriverConfig>): PrinterDriver {
    const defaultConfig: PrinterDriverConfig = {
      type: 'thermal',
      model: 'generic',
      encoding: 'PC437',
      density: 8,
      speed: 4,
      width: 58,
      height: 0
    };

    return this.create({ ...defaultConfig, ...config });
  }

  /**
   * 根据设备信息创建驱动
   */
  static createFromDeviceInfo(deviceInfo: {
    name?: string;
    model?: string;
    manufacturer?: string;
    services?: string[];
  }): PrinterDriver {
    // 根据设备信息推断打印机类型
    const type = this.inferPrinterType(deviceInfo);

    const config: PrinterDriverConfig = {
      type,
      model: deviceInfo.model || this.inferModel(deviceInfo),
      encoding: this.inferEncoding(deviceInfo),
      density: this.inferDensity(deviceInfo),
      speed: this.inferSpeed(deviceInfo),
      width: this.inferWidth(deviceInfo)
    };

    return this.create(config);
  }

  /**
   * 推断打印机类型
   */
  private static inferPrinterType(deviceInfo: {
    name?: string;
    model?: string;
    manufacturer?: string;
    services?: string[];
  }): PrinterType {
    const { name, model, manufacturer, services } = deviceInfo;

    // 根据设备名称推断
    if (name) {
      const nameLower = name.toLowerCase();
      if (nameLower.includes('thermal') || nameLower.includes('receipt')) {
        return 'thermal';
      }
      if (nameLower.includes('label')) {
        return 'label';
      }
      if (nameLower.includes('pos')) {
        return 'pos';
      }
    }

    // 根据制造商推断
    if (manufacturer) {
      const manufacturerLower = manufacturer.toLowerCase();
      if (manufacturerLower.includes('epson') || manufacturerLower.includes('citizen')) {
        return 'pos';
      }
      if (manufacturerLower.includes('zebra') || manufacturerLower.includes('brother')) {
        return 'label';
      }
    }

    // 根据蓝牙服务推断
    if (services && services.length > 0) {
      // 热敏打印机通常使用的服务UUID
      const thermalServices = [
        '49535343-fe7d-4ae5-8fa9-9fafd205e455', // 通用打印服务
        '000018f0-0000-1000-8000-00805f9b34fb'  // Apple打印服务
      ];

      if (services.some(service => thermalServices.includes(service))) {
        return 'thermal';
      }
    }

    return 'thermal'; // 默认为热敏打印机
  }

  /**
   * 推断型号
   */
  private static inferModel(deviceInfo: {
    name?: string;
    model?: string;
    manufacturer?: string;
  }): string {
    if (deviceInfo.model) {
      return deviceInfo.model;
    }

    if (deviceInfo.name) {
      // 从设备名称中提取型号
      const name = deviceInfo.name;
      const modelMatch = name.match(/([A-Z]{2,}-\d{3,})/);
      if (modelMatch) {
        return modelMatch[1];
      }
    }

    return 'generic';
  }

  /**
   * 推断编码
   */
  private static inferEncoding(deviceInfo: {
    name?: string;
    manufacturer?: string;
  }): string {
    const { manufacturer } = deviceInfo;

    // 根据制造商推断编码
    if (manufacturer) {
      const manufacturerLower = manufacturer.toLowerCase();
      if (manufacturerLower.includes('epson')) {
        return 'PC850';
      }
      if (manufacturerLower.includes('citizen')) {
        return 'PC860';
      }
    }

    return 'PC437'; // 默认编码
  }

  /**
   * 推断密度
   */
  private static inferDensity(deviceInfo: {
    name?: string;
    model?: string;
  }): number {
    const { name, model } = deviceInfo;

    // 高密度关键词
    const highDensityKeywords = ['hd', 'high', '203', '300'];

    // 中密度关键词
    const mediumDensityKeywords = ['md', 'medium', '180', '200'];

    const text = `${name || ''} ${model || ''}`.toLowerCase();

    if (highDensityKeywords.some(keyword => text.includes(keyword))) {
      return 12;
    }

    if (mediumDensityKeywords.some(keyword => text.includes(keyword))) {
      return 8;
    }

    return 8; // 默认密度
  }

  /**
   * 推断速度
   */
  private static inferSpeed(deviceInfo: {
    name?: string;
    model?: string;
  }): number {
    const { name, model } = deviceInfo;

    // 高速关键词
    const highSpeedKeywords = ['fast', 'high', '300', '350'];

    // 中速关键词
    const mediumSpeedKeywords = ['medium', 'normal', '200', '250'];

    const text = `${name || ''} ${model || ''}`.toLowerCase();

    if (highSpeedKeywords.some(keyword => text.includes(keyword))) {
      return 6;
    }

    if (mediumSpeedKeywords.some(keyword => text.includes(keyword))) {
      return 4;
    }

    return 4; // 默认速度
  }

  /**
   * 推进纸张宽度
   */
  private static inferWidth(deviceInfo: {
    name?: string;
    model?: string;
  }): number {
    const { name, model } = deviceInfo;

    // 80mm关键词
    const width80Keywords = ['80', '3inch', '3"'];

    // 58mm关键词
    const width58Keywords = ['58', '2inch', '2"'];

    const text = `${name || ''} ${model || ''}`.toLowerCase();

    if (width80Keywords.some(keyword => text.includes(keyword))) {
      return 80;
    }

    if (width58Keywords.some(keyword => text.includes(keyword))) {
      return 58;
    }

    return 58; // 默认宽度
  }

  /**
   * 获取支持的打印机类型
   */
  static getSupportedTypes(): PrinterType[] {
    return ['thermal']; // 目前只支持热敏打印机
  }

  /**
   * 验证驱动配置
   */
  static validateConfig(config: PrinterDriverConfig): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!config.type) {
      errors.push('Printer type is required');
    }

    if (config.type === 'thermal') {
      if (config.density && (config.density < 1 || config.density > 20)) {
        errors.push('Thermal printer density must be between 1 and 20');
      }

      if (config.speed && (config.speed < 1 || config.speed > 10)) {
        errors.push('Thermal printer speed must be between 1 and 10');
      }

      if (config.width && (config.width < 20 || config.width > 200)) {
        errors.push('Thermal printer width must be between 20 and 200');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}