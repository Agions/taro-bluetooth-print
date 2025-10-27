/**
 * 模板模块导出
 */

// 类型定义
export type {
  ITemplate,
  ITemplateContext,
  ITemplateEngine,
  ITemplateRenderer,
  ITemplateFunction,
  ITemplateFilter,
  ITemplateCache,
  ITemplateConfig,
  ITemplateValidationResult,
  ITemplateRenderResult,
  ITemplateEvent,
  ITemplateManager,
  ITemplateVariable,
  ITemplateVariableValue,
  ITemplateDataParser,
  ITemplateCompressor,
  ITemplateI18n,
  ITemplateSecurity,
  TemplateType
} from './types';

// 重新导出相关类型
export { IReceiptTemplate, ILabelTemplate } from './types';

// 核心实现
export { TemplateEngine } from './TemplateEngine';

// 渲染器
export { TextTemplateRenderer } from './renderers/TextTemplateRenderer';
export { ReceiptTemplateRenderer } from './renderers/ReceiptTemplateRenderer';
export { LabelTemplateRenderer } from './renderers/LabelTemplateRenderer';

// 工厂函数
export function createTemplateEngine(
  name: string,
  config?: Partial<ITemplateConfig>
): TemplateEngine {
  return new TemplateEngine(name, '1.0.0', config);
}

export function createTemplate(
  id: string,
  name: string,
  type: TemplateType,
  content: any,
  options?: {
    description?: string;
    version?: string;
    tags?: string[];
    variables?: ITemplateVariable[];
    metadata?: Record<string, any>;
  }
): ITemplate {
  return {
    id,
    name,
    type,
    content,
    description: options?.description || '',
    version: options?.version || '1.0.0',
    tags: options?.tags || [],
    variables: options?.variables || [],
    metadata: options?.metadata || {},
    createdAt: new Date(),
    updatedAt: new Date(),
    enabled: true
  };
}

// 便捷工具函数
export class TemplateUtils {
  /**
   * 生成模板ID
   */
  static generateTemplateId(): string {
    return 'tpl_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * 验证模板ID格式
   */
  static isValidTemplateId(templateId: string): boolean {
    return /^tpl_\d+_[a-z0-9]{9}$/.test(templateId);
  }

  /**
   * 格式化模板类型
   */
  static formatTemplateType(type: TemplateType): string {
    const typeNames = {
      [TemplateType.TEXT]: '文本',
      [TemplateType.RECEIPT]: '收据',
      [TemplateType.LABEL]: '标签',
      [TemplateType.TICKET]: '票据',
      [TemplateType.INVOICE]: '发票',
      [TemplateType.REPORT]: '报告',
      [TemplateType.CUSTOM]: '自定义'
    };

    return typeNames[type] || type;
  }

  /**
   * 检查模板兼容性
   */
  static checkCompatibility(template: ITemplate, engine: TemplateEngine): {
    compatible: boolean;
    missingFeatures: string[];
    warnings: string[];
  } {
    const missingFeatures: string[] = [];
    const warnings: string[] = [];

    // 检查渲染器是否存在
    const renderer = engine.getRenderer(template.type);
    if (!renderer) {
      missingFeatures.push(`No renderer found for template type: ${TemplateType[template.type]}`);
    }

    // 检查变量定义
    if (template.variables && template.variables.length > 0) {
      for (const variable of template.variables) {
        if (variable.required) {
          // 检查是否在模板中使用了必需变量
          if (typeof template.content === 'string') {
            const content = template.content as string;
            if (!content.includes(`{{${variable.name}}`) && !content.includes(`{{${variable.name}|`)) {
              warnings.push(`Required variable '${variable.name}' may not be used in template`);
            }
          }
        }
      }
    }

    return {
      compatible: missingFeatures.length === 0,
      missingFeatures,
      warnings
    };
  }

  /**
   * 验证模板数据
   */
  static validateTemplateData(
    template: ITemplate,
    data: any
  ): {
    valid: boolean;
    errors: string[];
    missingVariables: string[];
  } {
    const errors: string[] = [];
    const missingVariables: string[] = [];

    if (!template.variables || template.variables.length === 0) {
      return { valid: true, errors, missingVariables };
    }

    // 检查必需变量
    for (const variable of template.variables) {
      if (variable.required) {
        const value = this.getVariableValue(variable.name, data);
        if (value === null || value === undefined) {
          missingVariables.push(variable.name);
        } else {
          // 验证类型
          const typeError = this.validateVariableType(variable, value);
          if (typeError) {
            errors.push(typeError);
          }
        }
      }
    }

    return {
      valid: errors.length === 0 && missingVariables.length === 0,
      errors,
      missingVariables
    };
  }

  /**
   * 获取变量值
   */
  static getVariableValue(path: string, data: any): any {
    const parts = path.split('.');
    let current = data;

    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        return undefined;
      }
    }

    return current;
  }

  /**
   * 验证变量类型
   */
  static validateVariableType(variable: ITemplateVariable, value: any): string | null {
    if (value === null || value === undefined) {
      return null; // 空值不验证类型
    }

    switch (variable.type) {
      case 'string':
        if (typeof value !== 'string') {
          return `Variable '${variable.name}' must be a string, got ${typeof value}`;
        }
        break;

      case 'number':
        if (typeof value !== 'number' || isNaN(value)) {
          return `Variable '${variable.name}' must be a number, got ${typeof value}`;
        }
        break;

      case 'boolean':
        if (typeof value !== 'boolean') {
          return `Variable '${variable.name}' must be a boolean, got ${typeof value}`;
        }
        break;

      case 'date':
        if (!(value instanceof Date) && typeof value !== 'string') {
          return `Variable '${variable.name}' must be a Date or string, got ${typeof value}`;
        }
        break;

      case 'array':
        if (!Array.isArray(value)) {
          return `Variable '${variable.name}' must be an array, got ${typeof value}`;
        }
        break;

      case 'object':
        if (typeof value !== 'object' || Array.isArray(value)) {
          return `Variable '${variable.name}' must be an object, got ${typeof value}`;
        }
        break;
    }

    // 验证规则
    if (variable.validation) {
      const validation = variable.validation;

      if (validation.min !== undefined && typeof value === 'number') {
        if (value < validation.min) {
          return `Variable '${variable.name}' must be at least ${validation.min}`;
        }
      }

      if (validation.max !== undefined && typeof value === 'number') {
        if (value > validation.max) {
          return `Variable '${variable.name}' must be at most ${validation.max}`;
        }
      }

      if (validation.pattern && typeof value === 'string') {
        const regex = new RegExp(validation.pattern);
        if (!regex.test(value)) {
          return `Variable '${variable.name}' must match pattern ${validation.pattern}`;
        }
      }

      if (validation.enum && Array.isArray(validation.enum)) {
        if (!validation.enum.includes(value)) {
          return `Variable '${variable.name}' must be one of: ${validation.enum.join(', ')}`;
        }
      }
    }

    return null;
  }

  /**
   * 创建模板变量
   */
  static createVariable(
    name: string,
    type: ITemplateVariable['type'],
    required: boolean = false,
    options?: {
      defaultValue?: any;
      description?: string;
      validation?: {
        min?: number;
        max?: number;
        pattern?: string;
        enum?: any[];
      };
    }
  ): ITemplateVariable {
    return {
      name,
      type,
      required,
      defaultValue: options?.defaultValue,
      description: options?.description,
      validation: options?.validation
    };
  }

  /**
   * 分析模板复杂度
   */
  static analyzeComplexity(template: ITemplate): {
    complexity: 'simple' | 'medium' | 'complex';
    features: string[];
    suggestions: string[];
  } {
    const features: string[] = [];
    const suggestions: string[] = [];
    let complexityScore = 0;

    if (typeof template.content === 'string') {
      const content = template.content as string;

      // 分析使用的功能
      if (content.includes('{{') && content.includes('}}')) {
        features.push('variable-interpolation');
        complexityScore += 1;
      }

      if (content.includes('|')) {
        features.push('filters');
        complexityScore += 1;
      }

      if (content.includes('(') && content.includes(')')) {
        features.push('function-calls');
        complexityScore += 2;
      }

      if (content.includes('if ') || content.includes('elif ') || content.includes('else')) {
        features.push('conditionals');
        complexityScore += 3;
      }

      if (content.includes('for ')) {
        features.push('loops');
        complexityScore += 4;
      }

      if (content.includes('#')) {
        features.push('comments');
        complexityScore += 0.5;
      }

      // 计算嵌套深度
      const maxDepth = this.calculateNestingDepth(content);
      complexityScore += maxDepth;

      // 生成建议
      if (complexityScore > 10) {
        suggestions.push('Consider simplifying the template logic');
        suggestions.push('Split complex templates into smaller ones');
        suggestions.push('Use more functions to reduce repetition');
      }

      if (!features.includes('variable-interpolation')) {
        suggestions.push('Add variable placeholders for dynamic content');
      }

      if (!features.includes('conditionals') && features.includes('loops')) {
        suggestions.push('Consider adding conditional logic for better flexibility');
      }
    }

    let complexity: 'simple' | 'medium' | 'complex' = 'simple';
    if (complexityScore > 5 && complexityScore <= 10) {
      complexity = 'medium';
    } else if (complexityScore > 10) {
      complexity = 'complex';
    }

    return { complexity, features, suggestions };
  }

  /**
   * 计算嵌套深度
   */
  private static calculateNestingDepth(content: string): number {
    let depth = 0;
    let maxDepth = 0;

    for (let i = 0; i < content.length; i++) {
      const char = content[i];
      if (char === '{' && i + 1 < content.length && content[i + 1] === '{') {
        depth++;
        maxDepth = Math.max(maxDepth, depth);
      } else if (char === '}' && i > 0 && content[i - 1] === '}') {
        depth--;
      }
    }

    return maxDepth;
  }

  /**
   * 优化模板性能
   */
  static optimizeTemplate(template: ITemplate): {
    optimized: ITemplate;
    improvements: string[];
  } {
    const improvements: string[] = [];
    const optimized = { ...template };

    if (typeof template.content === 'string') {
      let content = template.content as string;

      // 移除多余的空白行
      content = content.replace(/\n\s*\n/g, '\n');

      // 合并连续的文本片段
      content = content.replace(/<\/TEXT>\s*<TEXT>/g, '</TEXT><TEXT>');

      // 缓存常用函数调用
      if (content.includes('{{now()}}')) {
        improvements.push('Cache date/time functions');
      }

      // 预编译常量
      if (content.includes('{{company.name}}')) {
        improvements.push('Consider pre-compiling static values');
      }

      optimized.content = content;
    }

    return { optimized, improvements };
  }

  /**
   * 生成模板预览
   */
  static generatePreview(
    template: ITemplate,
    sampleData?: any
  ): string {
    const previewData = sampleData || this.generateSampleData(template);

    let preview = `=== ${template.name} (${TemplateType[template.type]}) ===\n\n`;

    if (template.description) {
      preview += `描述: ${template.description}\n\n`;
    }

    preview += `模板内容:\n${typeof template.content === 'string' ? template.content : JSON.stringify(template.content, null, 2)}\n\n`;

    preview += `示例数据:\n${JSON.stringify(previewData, null, 2)}\n\n`;

    if (template.variables && template.variables.length > 0) {
      preview += `变量定义:\n`;
      for (const variable of template.variables) {
        const required = variable.required ? ' (必需)' : '';
        const defaultValue = variable.defaultValue ? ` (默认: ${variable.defaultValue})` : '';
        preview += `- ${variable.name} (${variable.type})${required}${defaultValue}\n`;
      }
    }

    preview += `标签: ${template.tags.join(', ') || '无'}\n`;
    preview += `版本: ${template.version}\n`;
    preview += `创建时间: ${template.createdAt.toLocaleString()}\n`;
    preview += `更新时间: ${template.updated.toLocaleString()}`;

    return preview;
  }

  /**
   * 生成示例数据
   */
  private static generateSampleData(template: ITemplate): any {
    const data: any = {};

    if (template.variables) {
      for (const variable of template.variables) {
        if (variable.defaultValue !== undefined) {
          data[variable.name] = variable.defaultValue;
        } else {
          // 生成示例数据
          switch (variable.type) {
            case 'string':
              data[variable.name] = `示例${variable.name}`;
              break;
            case 'number':
              data[variable.name] = 100;
              break;
            case 'boolean':
              data[variable.name] = true;
              break;
            case 'date':
              data[variable.name] = new Date();
              break;
            case 'array':
              data[variable.name] = ['项目1', '项目2', '项目3'];
              break;
            case 'object':
              data[variable.name] = { key: 'value' };
              break;
          }
        }
      }
    }

    // 根据模板类型添加特定数据
    switch (template.type) {
      case TemplateType.RECEIPT:
        data.merchant = {
          name: '示例商家',
          address: '示例地址',
          phone: '13800138000'
        };
        data.order = {
          id: 'R202312270001',
          items: [
            { name: '商品A', quantity: 2, price: 15.50, total: 31.00 },
            { name: '商品B', quantity: 1, price: 25.00, total: 25.00 }
          ],
          subtotal: 56.00,
          total: 56.00
        };
        data.transaction = {
          time: new Date(),
          paymentMethod: '现金'
        };
        break;

      case TemplateType.LABEL:
        data.content = {
          title: '示例标签',
          text: '示例内容',
          barcode: {
            type: 'CODE128',
            data: '123456789'
          }
        };
        break;

      case TemplateType.TICKET:
        data.event = {
          title: '示例演出',
          date: new Date(),
          venue: '示例场馆',
          seat: 'A-1'
        };
        break;

      case TemplateType.INVOICE:
        data.invoice = {
          number: 'INV-001',
          date: new Date(),
          due: new Date(),
          customer: {
            name: '示例客户'
          }
        };
        break;
    }

    return data;
  }

  /**
   * 比较模板
   */
  static compareTemplates(
    template1: ITemplate,
    template2: ITemplate
  ): {
    differences: string[];
    similarity: number;
  } {
    const differences: string[] = [];
    let similarity = 100;

    // 比较基本信息
    if (template1.type !== template2.type) {
      differences.push(`Type: ${TemplateType[template1.type]} → ${TemplateType[template2.type]}`);
      similarity -= 20;
    }

    if (template1.name !== template2.name) {
      differences.push(`Name: ${template1.name} → ${template2.name}`);
      similarity -= 10;
    }

    // 比较内容
    if (typeof template1.content === 'string' && typeof template2.content === 'string') {
      const content1 = template1.content as string;
      const content2 = template2.content as string;

      if (content1 !== content2) {
        differences.push('Content structure differs');
        similarity -= 30;
      }
    } else if (JSON.stringify(template1.content) !== JSON.stringify(template2.content)) {
      differences.push('Content structure differs');
      similarity -= 30;
    }

    // 比较变量定义
    const vars1 = template1.variables || [];
    const vars2 = template2.variables || [];
    if (vars1.length !== vars2.length) {
      differences.push(`Variables count: ${vars1.length} → ${vars2.length}`);
      similarity -= 15;
    }

    // 比较标签
    const tags1 = template1.tags || [];
    const tags2 = template2.tags || [];
    if (tags1.length !== tags2.length || JSON.stringify(tags1) !== JSON.stringify(tags2)) {
      differences.push('Tags differ');
      similarity -= 5;
    }

    return { differences, similarity: Math.max(0, similarity) };
  }

  /**
   * 合并模板
   */
  static mergeTemplates(
    templates: ITemplate[],
    options?: {
      name?: string;
      description?: string;
      tags?: string[];
    }
  ): ITemplate {
    if (templates.length === 0) {
      throw new Error('At least one template is required');
    }

    const firstTemplate = templates[0];
    const mergedTemplate: ITemplate = {
      id: this.generateTemplateId(),
      name: options?.name || firstTemplate.name,
      type: firstTemplate.type,
      content: firstTemplate.content,
      description: options?.description || firstTemplate.description,
      version: '1.0',
      tags: options?.tags || firstTemplate.tags,
      variables: [...(firstTemplate.variables || [])],
      metadata: { ...(firstTemplate.metadata || {}) },
      createdAt: new Date(),
      updatedAt: new Date(),
      enabled: true
    };

    // 合并变量定义
    const allVariables = new Map<string, ITemplateVariable>();
    for (const template of templates) {
      if (template.variables) {
        for (const variable of template.variables) {
          const existing = allVariables.get(variable.name);
          if (!existing) {
            allVariables.set(variable.name, variable);
          } else {
            // 合并变量属性
            if (!existing.required && variable.required) {
              existing.required = true;
            }
          }
        }
      }
    }
    mergedTemplate.variables = Array.from(allVariables.values());

    return mergedTemplate;
  }

  /**
   * 分割模板
   */
  static splitTemplate(
    template: ITemplate,
    maxComplexity?: 'simple' | 'medium'
  ): ITemplate[] {
    const analysis = this.analyzeComplexity(template);

    if (analysis.complexity === 'simple' ||
        (maxComplexity && this.getComplexityLevel(analysis.complexity) <= this.getComplexityLevel(maxComplexity))) {
      return [template];
    }

    // 简单的模板分割策略
    const parts: ITemplate[] = [];
    const content = typeof template.content === 'string' ? template.content : JSON.stringify(template.content);

    // 按逻辑块分割
    const sections = content.split(/\n\s*\n/);
    const currentParts: string[] = [];
    let currentComplexity = 0;

    for (const section of sections) {
      currentParts.push(section);
      const sectionAnalysis = this.analyzeComplexity({
        ...template,
        content: currentParts.join('\n')
      });

      if (sectionAnalysis.complexity === 'complex') {
        // 完成当前部分并开始新部分
        const partTemplate = {
          ...template,
          id: this.generateTemplateId(),
          name: `${template.name} - Part ${parts.length + 1}`,
          content: currentParts.join('\n'),
          createdAt: new Date(),
          updatedAt: new Date(),
          version: '1.0',
          tags: [...template.tags, 'split']
        };

        parts.push(partTemplate);
        currentParts = [section];
        currentComplexity = 0;
      }
    }

    if (currentParts.length > 0) {
      const partTemplate = {
        ...template,
        id: this.generateTemplateId(),
        name: `${template.name} - Part ${parts.length + 1}`,
        content: currentParts.join('\n'),
        createdAt: new Date(),
        updatedAt: new Date(),
        version: '1.0',
        tags: [...template.tags, 'split']
      };
      parts.push(partTemplate);
    }

    return parts;
  }

  private static getComplexityLevel(level: string): number {
    switch (level) {
      case 'simple': return 1;
      case 'medium': return 2;
      case 'complex': return 3;
      default: return 2;
    }
  }
}

// 常量定义
export const TEMPLATE_CONSTANTS = {
  // 默认配置
  DEFAULT_CONFIG: {
    enableCache: true,
    cacheSize: 100,
    cacheStrategy: 'lru',
    cacheTimeout: 300000,
    precompile: false,
    enableValidation: true,
    enableCompression: false,
    maxTemplateSize: 1024 * 1024,
    maxRenderTime: 10000
  } as const,

  // 支持的模板类型
  TYPES: TemplateType,

  // 验证规则
  VALIDATION_RULES: {
    MAX_NAME_LENGTH: 100,
    MAX_DESCRIPTION_LENGTH: 500,
    MAX_VARIABLES: 50,
    MAX_TAG_LENGTH: 100,
    MAX_NESTING_DEPTH: 10
  } as const,

  // 性能阈值
  PERFORMANCE_THRESHOLDS: {
    MAX_RENDER_TIME: 10000,
    MAX_TEMPLATE_SIZE: 1048576,
    MAX_CACHE_SIZE: 1000,
    MIN_CACHE_HIT_RATE: 70
  } as const
};

// 默认实例
export const defaultTemplateEngine = () => {
  return createTemplateEngine('default');
};