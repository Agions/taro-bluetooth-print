/**
 * 标签模板渲染器
 */

import {
  ITemplateRenderer,
  ITemplate,
  ITemplateContext,
  TemplateType,
  ILabelTemplate
} from '../types';
import { TextTemplateRenderer } from './TextTemplateRenderer';

/**
 * 标签模板渲染器
 */
export class LabelTemplateRenderer extends TextTemplateRenderer {
  public readonly name = 'LabelTemplateRenderer';
  public readonly supportedTypes = [TemplateType.LABEL];

  /**
   * 渲染模板
   */
  public async render(
    template: ITemplate,
    data: any,
    context: ITemplateContext
  ): Promise<ArrayBuffer> {
    try {
      // 验证数据结构
      this.validateLabelData(data);

      // 转换为标准标签格式
      const labelData = this.normalizeLabelData(data);

      // 应用标签模板布局
      const labelContent = this.buildLabelContent(template, labelData);

      // 生成打印命令
      const printCommands = this.generatePrintCommands(labelContent, labelData);

      // 使用父类方法渲染文本
      const textTemplate = {
        ...template,
        content: printCommands
      };

      return await super.render(textTemplate, data, context);
    } catch (error) {
      throw new Error(`Label template render failed: ${error.message}`);
    }
  }

  /**
   * 验证模板
   */
  public async validate(template: ITemplate): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const result = await super.validate(template);

    // 额外的标签模板验证
    if (typeof template.content === 'object') {
      this.validateLabelTemplateStructure(template.content, result.errors, result.warnings);
    }

    return result;
  }

  /**
   * 获取渲染器信息
   */
  public getInfo() {
    return {
      name: this.name,
      supportedTypes: this.supportedTypes,
      features: [
        'label-layout',
        'barcode-generation',
        'qr-code-generation',
        'text-formatting',
        'image-embedding',
        'size-calibration',
        'precision-control'
      ]
    };
  }

  // 私有方法

  /**
   * 验证标签数据
   */
  private validateLabelData(data: any): void {
    if (!data) {
      throw new Error('Label data is required');
    }

    // 检查必需字段
    if (!data.content) {
      throw new Error('Label content is required');
    }

    if (data.size && (!data.size.width || !data.size.height)) {
      throw new Error('Label size must include both width and height');
    }
  }

  /**
   * 标准化标签数据
   */
  private normalizeLabelData(data: any): ILabelTemplate {
    return {
      size: data.size || {
        width: 58,
        height: 40,
        unit: 'mm'
      },
      content: {
        title: data.content?.title || '',
        text: data.content?.text || '',
        barcode: data.content?.barcode || {},
        qrCode: data.content?.qrCode || {},
        image: data.content?.image || {}
      },
      layout: data.layout || {
        orientation: 'portrait',
        margins: {
          top: 5,
          right: 5,
          bottom: 5,
          left: 5
        }
      }
    };
  }

  /**
   * 构建标签内容
   */
  private buildLabelContent(template: ITemplate, data: ILabelTemplate): string {
    const lines: string[] = [];

    // 设置标签尺寸
    lines.push(`<SIZE width="${data.size.width}" height="${data.size.height}" unit="${data.size.unit}">`);
    lines.push('<MARGINS top="' + data.layout.margins.top + '" right="' + data.layout.margins.right + '" bottom="' + data.layout.margins.bottom + '" left="' + data.layout.margins.left + '">');
    lines.push('<ORIENTATION orientation="' + data.layout.orientation + '">');

    lines.push('');

    // 标题
    if (data.content.title) {
      lines.push(`<TITLE text="${data.content.title}" align="center" bold="true">`);
      lines.push('');
    }

    // 文本内容
    if (data.content.text) {
      lines.push(`<TEXT text="${data.content.text}" align="left">`);
      lines.push('');
    }

    // 条形码
    if (data.content.barcode.data) {
      const barcodeType = data.content.barcode.type || 'CODE128';
      lines.push(`<BARCODE type="${barcodeType}" data="${data.content.barcode.data}" align="center">`);
      lines.push('');
    }

    // 二维码
    if (data.content.qrCode.data) {
      const errorCorrection = data.content.qrCode.errorCorrection || 'M';
      lines.push(`<QRCODE data="${data.content.qrCode.data}" errorCorrection="${errorCorrection}" align="center">`);
      lines.push('');
    }

    // 图片
    if (data.content.image.url) {
      const width = data.content.image.width || 200;
      const height = data.content.image.height || 200;
      lines.push(`<IMAGE src="${data.content.image.url}" width="${width}" height="${height}" align="center">`);
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * 生成打印命令
   */
  private generatePrintCommands(content: string, data: ILabelTemplate): string {
    const commands: string[] = [];

    const lines = content.split('\n');

    // 初始化命令
    commands.push('<INIT>');

    // 处理每一行
    for (const line of lines) {
      if (line.startsWith('<SIZE>')) {
        // 设置标签尺寸命令
        commands.push(line);
      } else if (line.startsWith('<MARGINS>')) {
        // 设置边距命令
        commands.push(line);
      } else if (line.startsWith('<ORIENTATION>')) {
        // 设置方向命令
        commands.push(line);
      } else if (line.startsWith('<TITLE>')) {
        // 处理标题
        const attributes = this.parseAttributes(line);
        commands.push(this.generateTextCommand(attributes.text, {
          ...attributes,
          bold: true,
          fontSize: attributes.fontSize || 16,
          align: attributes.align || 'center'
        }));
      } else if (line.startsWith('<TEXT>')) {
        // 处理文本
        const attributes = this.parseAttributes(line);
        commands.push(this.generateTextCommand(attributes.text, {
          ...attributes,
          bold: attributes.bold || false,
          fontSize: attributes.fontSize || 12,
          align: attributes.align || 'left'
        }));
      } else if (line.startsWith('<BARCODE>')) {
        // 处理条形码
        const attributes = this.parseAttributes(line);
        commands.push(this.generateBarcodeCommand(attributes.data, attributes));
      } else if (line.startsWith('<QRCODE>')) {
        // 处理二维码
        const attributes = this.parseAttributes(line);
        commands.push(this.generateQRCodeCommand(attributes.data, attributes));
      } else if (line.startsWith('<IMAGE>')) {
        // 处理图片
        const attributes = this.parseAttributes(line);
        commands.push(this.generateImageCommand(attributes.src, attributes));
      } else if (line.trim()) {
        // 普通文本
        commands.push(`<TEXT>${line}</TEXT>`);
      }
    }

    // 结束命令
    commands.push('<FEED lines="3">');
    commands.push('<CUT>');

    return commands.join('\n');
  }

  /**
   * 解析属性
   */
  private parseAttributes(line: string): Record<string, string> {
    const attributes: Record<string, string> = {};
    const tagMatch = line.match(/^<(\w+)(.*?)>$/);

    if (tagMatch) {
      const [, , attributesStr] = tagMatch;
      if (attributesStr) {
        const attrRegex = /(\w+)=["']([^"']*)["']/g;
        let match;
        while ((match = attrRegex.exec(attributesStr)) !== null) {
          attributes[match[1]] = match[2];
        }
      }
    }

    return attributes;
  }

  /**
   * 生成文本命令
   */
  private generateTextCommand(text: string, options: any): string {
    const command = ['<TEXT'];

    // 添加属性
    if (options.fontSize) {
      command.push(`fontSize="${options.fontSize}"`);
    }

    if (options.align) {
      command.push(`align="${options.align}"`);
    }

    if (options.bold) {
      command.push('bold="true"');
    }

    if (options.underline) {
      command.push('underline="true"');
    }

    if (options.doubleHeight) {
      command.push('doubleHeight="true"');
    }

    if (options.doubleWidth) {
      command.push('doubleWidth="true"');
    }

    if (command.length > 1) {
      command[command.length - 1] = `${command[command.length - 1]}>${text}</TEXT>`;
    } else {
      command.push(`>${text}</TEXT>`);
    }

    return command.join(' ');
  }

  /**
   * 生成条形码命令
   */
  private generateBarcodeCommand(data: string, options: any): string {
    const command = ['<BARCODE'];

    command.push(`data="${data}"`);

    if (options.type) {
      command.push(`type="${options.type}"`);
    }

    if (options.width) {
      command.push(`width="${options.width}"`);
    }

    if (options.height) {
      command.push(`height="${options.height}"`);
    }

    if (options.text) {
      command.push(`text="${options.text}"`);
    }

    if (options.align) {
      command.push(`align="${options.align}"`);
    }

    if (command.length > 1) {
      command[command.length - 1] = `${command[command.length - 1]}/>`;
    }

    return command.join(' ');
  }

  /**
   * 生成二维码命令
   */
  private generateQRCodeCommand(data: string, options: any): string {
    const command = ['<QRCODE'];

    command.push(`data="${data}"`);

    if (options.errorCorrection) {
      command.push(`errorCorrection="${options.errorCorrection}"`);
    }

    if (options.size) {
      command.push(`size="${options.size}"`);
    }

    if (options.margin) {
      command.push(`margin="${options.margin}"`);
    }

    if (options.align) {
      command.push(`align="${options.align}"`);
    }

    if (command.length > 1) {
      command[command.length - 1] = `${command[command.length - 1]}/>`;
    }

    return command.join(' ');
  }

  /**
   * 生成图片命令
   */
  private generateImageCommand(src: string, options: any): string {
    const command = ['<IMAGE'];

    command.push(`src="${src}"`);

    if (options.width) {
      command.push(`width="${options.width}"`);
    }

    if (options.height) {
      command.push(`height="${options.height}"`);
    }

    if (options.align) {
      command.push(`align="${options.align}"`);
    }

    if (command.length > 1) {
      command[command.length - 1] = `${command[command.length - 1]}/>`;
    }

    return command.join(' ');
  }

  /**
   * 验证标签模板结构
   */
  private validateLabelTemplateStructure(
    content: any,
    errors: string[],
    warnings: string[]
  ): void {
    if (typeof content !== 'object') {
      errors.push('Label template content must be an object');
      return;
    }

    // 检查必需的模板部分
    const recommendedParts = ['content'];
    for (const part of recommendedParts) {
      if (!content[part]) {
        warnings.push(`Missing recommended part: ${part}`);
      }
    }

    // 验证size部分
    if (content.size) {
      if (typeof content.size !== 'object') {
        errors.push('Size section must be an object');
      } else {
        if (!content.size.width || !content.size.height) {
          errors.push('Size must include both width and height');
        }

        if (content.size.unit && !['mm', 'inch', 'px'].includes(content.size.unit)) {
          errors.push('Invalid unit, must be mm, inch, or px');
        }
      }
    }

    // 验证layout部分
    if (content.layout) {
      if (typeof content.layout !== 'object') {
        errors.push('Layout section must be an object');
      } else {
        if (content.layout.orientation && !['portrait', 'landscape'].includes(content.layout.orientation)) {
          errors.push('Invalid orientation, must be portrait or landscape');
        }

        if (content.layout.margins) {
          if (typeof content.layout.margins !== 'object') {
            errors.push('Margins must be an object');
          } else {
            const margins = content.layout.margins;
            ['top', 'right', 'bottom', 'left'].forEach(margin => {
              if (typeof margins[margin] !== 'number' || margins[margin] < 0) {
                errors.push(`Margin ${margin} must be a non-negative number`);
              }
            });
          }
        }
      }
    }

    // 验证content部分
    if (content.content) {
      if (typeof content.content !== 'object') {
        errors.push('Content section must be an object');
      } else {
        // 验证二维码
        if (content.content.qrCode) {
          if (typeof content.content.qrCode !== 'object') {
            errors.push('QR code section must be an object');
          } else {
            if (content.content.qrCode.errorCorrection && !['L', 'M', 'Q', 'H'].includes(content.content.qrCode.errorCorrection)) {
              errors.push('Invalid error correction level, must be L, M, Q, or H');
            }
          }
        }

        // 验证条形码
        if (content.content.barcode) {
          if (typeof content.content.barcode !== 'object') {
            errors.push('Barcode section must be an object');
          } else {
            if (content.content.barcode.type) {
              const validTypes = ['CODE128', 'CODE39', 'EAN13', 'EAN8', 'UPC-A', 'UPC-E', 'ITF', 'CODABAR'];
              if (!validTypes.includes(content.content.barcode.type)) {
                errors.push(`Invalid barcode type, must be one of: ${validTypes.join(', ')}`);
              }
            }
          }
        }

        // 验证图片
        if (content.content.image) {
          if (typeof content.content.image !== 'object') {
            errors.push('Image section must be an object');
          } else {
            if (content.content.image.width && typeof content.content.image.width !== 'number') {
              errors.push('Image width must be a number');
            }
            if (content.content.image.height && typeof content.content.image.height !== 'number') {
              errors.push('Image height must be a number');
            }
          }
        }
      }
    }
  }

  /**
   * 计算标签尺寸（像素）
   */
  private calculateLabelSize(size: ILabelTemplate['size']): { width: number; height: number } {
    const dpi = 203; // 默认DPI

    let width = size.width;
    let height = size.height;

    // 转换单位
    if (size.unit === 'mm') {
      width = size.width * dpi / 25.4;
      height = size.height * dpi / 25.4;
    } else if (size.unit === 'inch') {
      width = size.width * dpi;
      height = size.height * dpi;
    }
    // px单位无需转换

    return { width, height };
  }

  /**
   * 获取标准标签尺寸
   */
  static getStandardSizes(): Array<{
    name: string;
    width: number;
    height: number;
    unit: 'mm' | 'inch';
  }> {
    return [
      { name: '40x30mm', width: 40, height: 30, unit: 'mm' },
      { name: '50x30mm', width: 50, height: 30, unit: 'mm' },
      { name: '58x40mm', width: 58, height: 40, unit: 'mm' },
      { name: '70x50mm', width: 70, height: 50, unit: 'mm' },
      { name: '100x70mm', width: 100, height: 70, unit: 'mm' },
      { name: '100x100mm', width: 100, height: 100, unit: 'mm' },
      { name: '2x1inch', width: 50.8, height: 25.4, unit: 'mm' },
      { name: '4x2inch', width: 101.6, height: 50.8, unit: 'mm' },
      { name: '4x3inch', width: 101.6, height: 76.2, unit: 'mm' },
      { name: '4x4inch', width: 101.6, height: 101.6, unit: 'mm' }
    ];
  }

  /**
   * 创建标准标签模板
   */
  static createStandardTemplate(): any {
    return {
      size: {
        width: 58,
        height: 40,
        unit: 'mm'
      },
      content: {
        title: '{{title}}',
        text: '{{text}}',
        barcode: {
          type: 'CODE128',
          data: '{{barcode}}',
          text: '{{barcode}}'
        },
        qrCode: {
          data: '{{qrCode}}',
          errorCorrection: 'M'
        }
      },
      layout: {
        orientation: 'portrait',
        margins: {
          top: 5,
          right: 5,
          bottom: 5,
          left: 5
        }
      }
    };
  }

  /**
   * 创建产品标签模板
   */
  static createProductLabelTemplate(): any {
    return {
      size: {
        width: 50,
        height: 30,
        unit: 'mm'
      },
      content: {
        title: '{{productName|truncate:20}}',
        text: '{{description|truncate:30}}',
        barcode: {
          type: 'CODE128',
          data: '{{sku}}',
          text: '{{sku}}'
        },
        qrCode: {
          data: '{{qrCode}}'
        }
      },
      layout: {
        orientation: 'portrait',
        margins: {
          top: 3,
          right: 3,
          bottom: 3,
          left: 3
        }
      }
    };
  }

  /**
   * 创建价格标签模板
   */
  static createPriceLabelTemplate(): any {
    return {
      size: {
        width: 70,
        height: 40,
        unit: 'mm'
      },
      content: {
        title: '{{productName|truncate:25}}',
        text: '价格：{{price|currency}}',
        barcode: {
          type: 'EAN13',
          data: '{{ean13}}'
        },
        text: '库存：{{stock}}'
      },
      layout: {
        orientation: 'landscape',
        margins: {
          top: 5,
          right: 5,
          bottom: 5,
          left: 5
        }
      }
    };
  }
}