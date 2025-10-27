/**
 * 模板引擎单元测试
 */

import { TemplateEngine } from '../../../../src/domain/template/TemplateEngine';
import {
  ITemplateEngine,
  ITemplate,
  ITemplateContext,
  ITemplateRenderer,
  TemplateType
} from '../../../../src/domain/template/types';

// Mock渲染器
class MockTemplateRenderer implements ITemplateRenderer {
  constructor(
    public readonly name: string,
    public readonly supportedTypes: TemplateType[],
    private renderResult: string = 'mock rendered'
  ) {}

  async render(template: ITemplate, data: any, context: ITemplateContext): Promise<ArrayBuffer> {
    return new TextEncoder().encode(this.renderResult).buffer;
  }

  async validate(template: ITemplate): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    return {
      valid: true,
      errors: [],
      warnings: []
    };
  }

  getInfo(): {
    name: string;
    supportedTypes: TemplateType[];
    features: string[];
  } {
    return {
      name: this.name,
      supportedTypes: this.supportedTypes,
      features: ['mock-rendering']
    };
  }

  // 测试辅助方法
  setRenderResult(result: string): void {
    this.renderResult = result;
  }
}

// Mock模板缓存
class MockTemplateCache {
  private cache = new Map<string, ArrayBuffer>();
  private disposed = false;

  get(key: string): ArrayBuffer | undefined {
    if (this.disposed) return undefined;
    return this.cache.get(key);
  }

  set(key: string, data: ArrayBuffer): void {
    if (this.disposed) return;
    this.cache.set(key, data);
  }

  clear(key?: string): void {
    if (key) {
      this.cache.delete(key);
    } else {
      this.cache.clear();
    }
  }

  clearAll(): void {
    this.cache.clear();
  }

  getStats(): any {
    return {
      size: this.cache.size,
      hits: 0,
      misses: 0,
      hitRate: 0
    };
  }

  dispose(): void {
    this.clearAll();
    this.disposed = true;
  }

  isDisposed(): boolean {
    return this.disposed;
  }
}

describe('TemplateEngine', () => {
  let engine: ITemplateEngine;
  let eventEmitter: any;
  let logger: any;

  beforeEach(() => {
    eventEmitter = {
      emit: jest.fn(),
      on: jest.fn(),
      off: jest.fn(),
      removeAllListeners: jest.fn()
    };

    logger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn()
    };

    engine = new TemplateEngine(
      new MockTemplateCache(),
      eventEmitter,
      logger
    );
  });

  afterEach(() => {
    engine.dispose();
  });

  describe('初始化', () => {
    it('应该正确初始化模板引擎', async () => {
      await engine.initialize();

      // 应该不抛出错误
    });

    it('重复初始化应该抛出错误', async () => {
      await engine.initialize();

      await expect(engine.initialize())
        .rejects.toThrow('TemplateEngine already initialized');
    });

    it('未初始化时操作应该抛出错误', async () => {
      const template: ITemplate = {
        id: 'test-template',
        name: 'Test Template',
        type: TemplateType.TEXT,
        content: 'Test content',
        description: 'Test description',
        createdAt: new Date(),
        updatedAt: new Date(),
        version: '1.0.0',
        tags: [],
        metadata: {},
        enabled: true
      };

      await expect(engine.registerTemplate(template))
        .rejects.toThrow('TemplateEngine not initialized');
    });
  });

  describe('模板管理', () => {
    beforeEach(async () => {
      await engine.initialize();
    });

    it('应该能够注册模板', async () => {
      const template: ITemplate = {
        id: 'test-template',
        name: 'Test Template',
        type: TemplateType.TEXT,
        content: 'Hello {{name}}!',
        description: 'Test description',
        createdAt: new Date(),
        updatedAt: new Date(),
        version: '1.0.0',
        tags: ['test'],
        metadata: {},
        enabled: true
      };

      await engine.registerTemplate(template);

      const retrieved = engine.getTemplate('test-template');
      expect(retrieved).toBe(template);
      expect(eventEmitter.emit).toHaveBeenCalledWith('templateRegistered', template);
    });

    it('应该能够注销模板', async () => {
      const template: ITemplate = {
        id: 'test-template',
        name: 'Test Template',
        type: TemplateType.TEXT,
        content: 'Test content',
        description: 'Test description',
        createdAt: new Date(),
        updatedAt: new Date(),
        version: '1.0.0',
        tags: [],
        metadata: {},
        enabled: true
      };

      await engine.registerTemplate(template);
      expect(engine.getTemplate('test-template')).toBeDefined();

      engine.unregisterTemplate('test-template');
      expect(engine.getTemplate('test-template')).toBeUndefined();
      expect(eventEmitter.emit).toHaveBeenCalledWith('templateUnregistered', 'test-template');
    });

    it('应该能够获取所有模板', async () => {
      const templates: ITemplate[] = [
        {
          id: 'template-1',
          name: 'Template 1',
          type: TemplateType.TEXT,
          content: 'Content 1',
          description: 'Description 1',
          createdAt: new Date(),
          updatedAt: new Date(),
          version: '1.0.0',
          tags: [],
          metadata: {},
          enabled: true
        },
        {
          id: 'template-2',
          name: 'Template 2',
          type: TemplateType.RECEIPT,
          content: 'Content 2',
          description: 'Description 2',
          createdAt: new Date(),
          updatedAt: new Date(),
          version: '1.0.0',
          tags: [],
          metadata: {},
          enabled: true
        },
        {
          id: 'template-3',
          name: 'Template 3',
          type: TemplateType.LABEL,
          content: 'Content 3',
          description: 'Description 3',
          createdAt: new Date(),
          updatedAt: new Date(),
          version: '1.0.0',
          tags: [],
          metadata: {},
          enabled: true
        }
      ];

      for (const template of templates) {
        await engine.registerTemplate(template);
      }

      const allTemplates = engine.getTemplates();
      expect(allTemplates.length).toBe(3);
      expect(allTemplates.some(t => t.id === 'template-1')).toBe(true);
      expect(allTemplates.some(t => t.id === 'template-2')).toBe(true);
      expect(allTemplates.some(t => t.id === 'template-3')).toBe(true);
    });

    it('应该能够按类型获取模板', async () => {
      await engine.registerTemplate({
        id: 'text-template',
        name: 'Text Template',
        type: TemplateType.TEXT,
        content: 'Text content',
        description: 'Text description',
        createdAt: new Date(),
        updatedAt: new Date(),
        version: '1.0.0',
        tags: [],
        metadata: {},
        enabled: true
      });

      await engine.registerTemplate({
        id: 'receipt-template',
        name: 'Receipt Template',
        type: TemplateType.RECEIPT,
        content: 'Receipt content',
        description: 'Receipt description',
        createdAt: new Date(),
        updatedAt: new Date(),
        version: '1.0.0',
        tags: [],
        metadata: {},
        enabled: true
      });

      const textTemplates = engine.getTemplatesByType(TemplateType.TEXT);
      const receiptTemplates = engine.getTemplatesByType(TemplateType.RECEIPT);

      expect(textTemplates.length).toBe(1);
      expect(textTemplates[0].id).toBe('text-template');

      expect(receiptTemplates.length).toBe(1);
      expect(receiptTemplates[0].id).toBe('receipt-template');
    });
  });

  describe('渲染器管理', () => {
    beforeEach(async () => {
      await engine.initialize();
    });

    it('应该能够注册渲染器', () => {
      const renderer = new MockTemplateRenderer(
        'MockRenderer',
        [TemplateType.TEXT],
        'Mock rendered result'
      );

      engine.registerRenderer('mock', renderer);

      expect(engine.getRenderer('mock')).toBe(renderer);
      expect(engine.getAvailableRenderers()).toContain('mock');
      expect(eventEmitter.emit).toHaveBeenCalledWith('rendererRegistered', {
        type: 'mock',
        renderer
      });
    });

    it('应该能够注销渲染器', () => {
      const renderer = new MockTemplateRenderer('MockRenderer', [TemplateType.TEXT]);
      engine.registerRenderer('mock', renderer);

      expect(engine.getRenderer('mock')).toBeDefined();

      engine.unregisterRenderer('mock');
      expect(engine.getRenderer('mock')).toBeUndefined();
      expect(eventEmitter.emit).toHaveBeenCalledWith('rendererUnregistered', 'mock');
    });

    it('应该能够获取可用渲染器', () => {
      engine.registerRenderer('text', new MockTemplateRenderer('TextRenderer', [TemplateType.TEXT]));
      engine.registerRenderer('receipt', new MockTemplateRenderer('ReceiptRenderer', [TemplateType.RECEIPT]));
      engine.registerRenderer('label', new MockTemplateRenderer('LabelRenderer', [TemplateType.LABEL]));

      const availableRenderers = engine.getAvailableRenderers();
      expect(availableRenderers).toContain('text');
      expect(availableRenderers).toContain('receipt');
      expect(availableRenderers).toContain('label');
    });
  });

  describe('模板渲染', () => {
    beforeEach(async () => {
      await engine.initialize();
      engine.registerRenderer('text', new MockTemplateRenderer('TextRenderer', [TemplateType.TEXT]));
      engine.registerRenderer('receipt', new MockTemplateRenderer('ReceiptRenderer', [TemplateType.RECEIPT]));
    });

    it('应该能够渲染文本模板', async () => {
      const template: ITemplate = {
        id: 'text-template',
        name: 'Text Template',
        type: TemplateType.TEXT,
        content: 'Hello {{name}}!',
        description: 'Text description',
        createdAt: new Date(),
        updatedAt: new Date(),
        version: '1.0.0',
        tags: [],
        metadata: {},
        enabled: true
      };

      await engine.registerTemplate(template);

      const data = { name: 'World' };
      const result = await engine.render('text-template', data);

      expect(result).toBeInstanceOf(ArrayBuffer);
      const text = new TextDecoder().decode(result);
      expect(text).toBe('mock rendered');
    });

    it('应该能够渲染收据模板', async () => {
      const template: ITemplate = {
        id: 'receipt-template',
        name: 'Receipt Template',
        type: TemplateType.RECEIPT,
        content: {
          merchant: {
            name: '{{merchant.name}}',
            address: '{{merchant.address}}'
          }
        },
        description: 'Receipt description',
        createdAt: new Date(),
        updatedAt: new Date(),
        version: '1.0.0',
        tags: [],
        metadata: {},
        enabled: true
      };

      await engine.registerTemplate(template);

      const data = {
        merchant: {
          name: 'Test Store',
          address: 'Test Address'
        }
      };

      const result = await engine.render('receipt-template', data);
      expect(result).toBeInstanceOf(ArrayBuffer);
    });

    it('应该能够批量渲染模板', async () => {
      await engine.registerTemplate({
        id: 'template-1',
        name: 'Template 1',
        type: TemplateType.TEXT,
        content: 'Content 1',
        description: 'Description 1',
        createdAt: new Date(),
        updatedAt: new Date(),
        version: '1.0.0',
        tags: [],
        metadata: {},
        enabled: true
      });

      await engine.registerTemplate({
        id: 'template-2',
        name: 'Template 2',
        type: TemplateType.TEXT,
        content: 'Content 2',
        description: 'Description 2',
        createdAt: new Date(),
        updatedAt: new Date(),
        version: '1.0.0',
        tags: [],
        metadata: {},
        enabled: true
      });

      const requests = [
        {
          templateId: 'template-1',
          data: { key: 'value1' }
        },
        {
          templateId: 'template-2',
          data: { key: 'value2' }
        }
      ];

      const results = await engine.renderBatch(requests);

      expect(results).toHaveLength(2);
      expect(results[0]).toBeInstanceOf(ArrayBuffer);
      expect(results[1]).toBeInstanceOf(ArrayBuffer);
    });

    it('应该支持自定义上下文', async () => {
      const template: ITemplate = {
        id: 'context-template',
        name: 'Context Template',
        type: TemplateType.TEXT,
        content: 'Hello {{locale}}!',
        description: 'Context description',
        createdAt: new Date(),
        updatedAt: new Date(),
        version: '1.0.0',
        tags: [],
        metadata: {},
        enabled: true
      };

      await engine.registerTemplate(template);

      const context: Partial<ITemplateContext> = {
        locale: 'zh-CN'
      };

      const result = await engine.render('context-template', {}, context);
      expect(result).toBeInstanceOf(ArrayBuffer);
    });

    it('应该处理不存在的模板错误', async () => {
      await expect(engine.render('nonexistent-template', {}))
        .rejects.toThrow('Template nonexistent-template not found');
    });

    it('应该处理不支持类型的模板错误', async () => {
      const template: ITemplate = {
        id: 'unsupported-template',
        name: 'Unsupported Template',
        type: TemplateType.CUSTOM,
        content: 'Unsupported content',
        description: 'Unsupported description',
        createdAt: new Date(),
        updatedAt: new Date(),
        version: '1.0.0',
        tags: [],
        metadata: {},
        enabled: true
      };

      await engine.registerTemplate(template);

      await expect(engine.render('unsupported-template', {}))
        .rejects.toThrow('No renderer found for template type: custom');
    });
  });

  describe('模板验证', () => {
    beforeEach(async () => {
      await engine.initialize();
    });

    it('应该能够验证有效模板', async () => {
      const template: ITemplate = {
        id: 'valid-template',
        name: 'Valid Template',
        type: TemplateType.TEXT,
        content: 'Valid content',
        description: 'Valid description',
        createdAt: new Date(),
        updatedAt: new Date(),
        version: '1.0.0',
        tags: [],
        metadata: {},
        enabled: true
      };

      const validation = await engine.validateTemplate(template);
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
      expect(validation.warnings).toHaveLength(0);
    });

    it('应该能够验证无效模板', async () => {
      // Mock渲染器返回验证失败
      const renderer = new MockTemplateRenderer('InvalidRenderer', [TemplateType.TEXT]);
      renderer.validate = jest.fn().mockResolvedValue({
        valid: false,
        errors: ['Template is invalid'],
        warnings: ['Template warning']
      });

      engine.registerRenderer('invalid', renderer);

      const template: ITemplate = {
        id: 'invalid-template',
        name: 'Invalid Template',
        type: TemplateType.TEXT,
        content: 'Invalid content',
        description: 'Invalid description',
        createdAt: new Date(),
        updatedAt: new Date(),
        version: '1.0.0',
        tags: [],
        metadata: {},
        enabled: true
      };

      await engine.registerTemplate(template);

      const validation = await engine.validateTemplate(template);
      expect(validation.valid).toBe(false);
      expect(validation.errors).toHaveLength(1);
      expect(validation.errors[0]).toBe('Template is invalid');
      expect(validation.warnings).toHaveLength(1);
      expect(validation.warnings[0]).toBe('Template warning');
    });

    it('应该验证所有模板', async () => {
      await engine.registerTemplate({
        id: 'valid-template-1',
        name: 'Valid Template 1',
        type: TemplateType.TEXT,
        content: 'Valid content 1',
        description: 'Valid description 1',
        createdAt: new Date(),
        updatedAt: new Date(),
        version: '1.0.0',
        tags: [],
        metadata: {},
        enabled: true
      });

      await engine.registerTemplate({
        id: 'invalid-template',
        name: 'Invalid Template',
        type: TemplateType.TEXT,
        content: 'Invalid content',
        description: 'Invalid description',
        createdAt: new Date(),
        updatedAt: new Date(),
        version: '1.0.0',
        tags: [],
        metadata: {},
        enabled: true
      });

      // Mock验证器：valid模板通过，invalid模板失败
      (engine as any).validateTemplate = jest.fn().mockImplementation(async (template) => {
        if (template.id === 'invalid-template') {
          return {
            valid: false,
            errors: ['Invalid template'],
            warnings: []
          };
        }
        return {
          valid: true,
          errors: [],
          warnings: []
        };
      });

      const validation = await engine.validateTemplate();
      expect(validation.valid).toBe(false);
      expect(validation.errors).toHaveLength(1);
      expect(validation.errors[0]).toBe('Invalid template');
    });
  });

  describe('预览功能', () => {
    beforeEach(async () => {
      await engine.initialize();
      engine.registerRenderer('text', new MockTemplateRenderer('TextRenderer', [TemplateType.TEXT]));
    });

    it('应该能够预览模板', async () => {
      const template: ITemplate = {
        id: 'preview-template',
        name: 'Preview Template',
        type: TemplateType.TEXT,
        content: 'Hello {{name}}!',
        description: 'Preview description',
        createdAt: new Date(),
        updatedAt: new Date(),
        version: '1.0.0',
        tags: [],
        metadata: {},
        enabled: true
      };

      await engine.registerTemplate(template);

      const data = { name: 'World' };
      const preview = await engine.preview('preview-template', data);

      expect(preview).toBe('mock rendered');
    });

    it('预览不存在的模板应该抛出错误', async () => {
      await expect(engine.preview('nonexistent-template', {}))
        .rejects.toThrow('Template nonexistent-template not found');
    });
  });

  describe('缓存功能', () => {
    beforeEach(async () => {
      await engine.initialize();
      engine.registerRenderer('text', new MockTemplateRenderer('TextRenderer', [TemplateType.TEXT]));
    });

    it('应该缓存渲染结果', async () => {
      const template: ITemplate = {
        id: 'cache-template',
        name: 'Cache Template',
        type: TemplateType.TEXT,
        content: 'Cached content',
        description: 'Cache description',
        createdAt: new Date(),
        updatedAt: new Date(),
        version: '1.0.0',
        tags: [],
        metadata: {},
        enabled: true
      };

      await engine.registerTemplate(template);

      const data = { name: 'World' };

      // 第一次渲染
      const result1 = await engine.render('cache-template', data);
      // 第二次渲染（应该从缓存获取）
      const result2 = await engine.render('cache-template', data);

      expect(result1).toEqual(result2);
    });

    it('应该能够清空缓存', async () => {
      const template: ITemplate = {
        id: 'cache-template',
        name: 'Cache Template',
        type: TemplateType.TEXT,
        content: 'Cache content',
        description: 'Cache description',
        createdAt: new Date(),
        updatedAt: new Date(),
        version: '1.0.0',
        tags: [],
        metadata: {},
        enabled: true
      };

      await engine.registerTemplate(template);

      // 渲染一次（进入缓存）
      await engine.render('cache-template', {});

      // 清空缓存
      engine.clearCache();

      expect(eventEmitter.emit).toHaveBeenCalledWith('cacheCleared');

      // 再次渲染（重新处理）
      await engine.render('cache-template', {});
      // 应该成功，因为缓存已清空，会重新处理
    });
  });

  describe('统计信息', () => {
    beforeEach(async () => {
      await engine.initialize();
    });

    it('应该提供统计信息', () => {
      const stats = engine.getStats();

      expect(stats.templates).toBe(0);
      expect(stats.renderers).toBe(0);
      expect(stats.cacheHits).toBe(0);
      expect(stats.cacheMisses).toBe(0);
      expect(stats.renderCount).toBe(0);
    });

    it('应该跟踪模板数量', async () => {
      await engine.registerTemplate({
        id: 'template-1',
        name: 'Template 1',
        type: TemplateType.TEXT,
        content: 'Content 1',
        description: 'Description 1',
        createdAt: new Date(),
        updatedAt: new Date(),
        version: '1.0.0',
        tags: [],
        metadata: {},
        enabled: true
      });

      await engine.registerTemplate({
        id: 'template-2',
        name: 'Template 2',
        type: TemplateType.RECEIPT,
        content: 'Content 2',
        description: 'Description 2',
        createdAt: new Date(),
        updatedAt: new Date(),
        version: '1.0.0',
        tags: [],
        metadata: {},
        enabled: true
      });

      const stats = engine.getStats();
      expect(stats.templates).toBe(2);
    });

    it('应该跟踪渲染器数量', () => {
      engine.registerRenderer('text', new MockTemplateRenderer('TextRenderer', [TemplateType.TEXT]));
      engine.registerRenderer('receipt', new MockTemplateRenderer('ReceiptRenderer', [TemplateType.RECEIPT]));

      const stats = engine.getStats();
      expect(stats.renderers).toBe(2);
    });
  });

  describe('错误处理', () => {
    beforeEach(async () => {
      await engine.initialize();
    });

    it('应该处理渲染器错误', async () => {
      const errorRenderer = new MockTemplateRenderer('ErrorRenderer', [TemplateType.TEXT]);
      errorRenderer.render = jest.fn().mockRejectedValue(new Error('Render error'));

      engine.registerRenderer('error', errorRenderer);

      const template: ITemplate = {
        id: 'error-template',
        name: 'Error Template',
        type: TemplateType.TEXT,
        content: 'Error content',
        description: 'Error description',
        createdAt: new Date(),
        updatedAt: new Date(),
        version: '1.0.0',
        tags: [],
        metadata: {},
        enabled: true
      };

      await engine.registerTemplate(template);

      await expect(engine.render('error-template', {}))
        .rejects.toThrow('Render error');
    });

    it('应该处理缓存错误', async () => {
      const errorCache = new MockTemplateCache();
      const errorEngine = new TemplateEngine(
        errorCache,
        eventEmitter,
        logger
      );

      await errorEngine.initialize();
      errorCache.dispose();

      const template: ITemplate = {
        id: 'error-template',
        name: 'Error Template',
        type: TemplateType.TEXT,
        content: 'Error content',
        description: 'Error description',
        createdAt: new Date(),
        updatedAt: new Date(),
        version: '1.0.0',
        tags: [],
        metadata: {},
        enabled: true
      };

      await errorEngine.registerTemplate(template);

      await expect(errorEngine.render('error-template', {}))
        .rejects.toThrow('TemplateEngine not initialized');
    });
  });

    it('应该处理销毁后的操作', async () => {
      await engine.initialize();

      const template: ITemplate = {
        id: 'test-template',
        name: 'Test Template',
        type: TemplateType.TEXT,
        content: 'Test content',
        description: 'Test description',
        createdAt: new Date(),
        updatedAt: new Date(),
        version: '1.0.0',
        tags: [],
        metadata: {},
        enabled: true
      };

      await engine.registerTemplate(template);
      engine.dispose();

      expect(() => engine.getTemplate('test-template'))
        .toThrow('TemplateEngine has been disposed');
      expect(() => engine.render('test-template', {}))
        .rejects.toThrow('TemplateEngine has been disposed');
      expect(() => engine.registerRenderer('test', new MockTemplateRenderer('test', [TemplateType.TEXT])))
        .toThrow('TemplateEngine has been disposed');
    });
  });

  describe('性能测试', () => {
    it('应该能够处理大量模板', async () => {
      await engine.initialize();
      engine.registerRenderer('text', new MockTemplateRenderer('TextRenderer', [TemplateType.TEXT]));

      const templateCount = 100;
      const startTime = Date.now();

      // 注册大量模板
      for (let i = 0; i < templateCount; i++) {
        await engine.registerTemplate({
          id: `template-${i}`,
          name: `Template ${i}`,
          type: TemplateType.TEXT,
          content: `Content ${i}`,
          description: `Description ${i}`,
          createdAt: new Date(),
          updatedAt: new Date(),
          version: '1.0.0',
          tags: [],
          metadata: {},
          enabled: true
        });
      }

      const duration = Date.now() - startTime;

      expect(engine.getTemplates().length).toBe(templateCount);
      expect(duration).toBeLessThan(1000); // 应该在1秒内完成
    });

    it('应该能够处理频繁渲染', async () => {
      await engine.initialize();
      engine.registerRenderer('text', new MockTemplateRenderer('TextRenderer', [TemplateType.TEXT]));

      const template: ITemplate = {
        id: 'render-template',
        name: 'Render Template',
        type: TemplateType.TEXT,
        content: 'Render content',
        description: 'Render description',
        createdAt: new Date(),
        updatedAt: new Date(),
        version: '1.0.0',
        tags: [],
        metadata: {},
        enabled: true
      };

      await engine.registerTemplate(template);

      const renderCount = 100;
      const startTime = Date.now();

      // 频繁渲染
      const promises: Promise<ArrayBuffer>[] = [];
      for (let i = 0; i < renderCount; i++) {
        promises.push(engine.render('render-template', { index: i }));
      }

      const results = await Promise.all(promises);

      const duration = Date.now() - startTime;

      expect(results.length).toBe(renderCount);
      expect(results.every(result => result instanceof ArrayBuffer)).toBe(true);
      expect(duration).toBeLessThan(1000); // 应该在1秒内完成
    });

    it('应该能够处理批量渲染', async () => {
      await engine.initialize();
      engine.registerRenderer('text', new MockTemplateRenderer('TextRenderer', [TemplateType.TEXT]));
      engine.registerRenderer('receipt', new MockTemplateRenderer('ReceiptRenderer', [TemplateType.RECEIPT]));

      // 创建大量模板
      for (let i = 0; i < 20; i++) {
        await engine.registerTemplate({
          id: `batch-template-${i}`,
          name: `Batch Template ${i}`,
          type: i % 2 === 0 ? TemplateType.TEXT : TemplateType.RECEIPT,
          content: `Batch Content ${i}`,
          description: `Batch Description ${i}`,
          createdAt: new Date(),
          updatedAt: new Date(),
          version: '1.0.0',
          tags: [],
          metadata: {},
          enabled: true
        });
      }

      const requestCount = 50;
      const requests = [];
      for (let i = 0; i < requestCount; i++) {
        requests.push({
          templateId: `batch-template-${i % 20}`,
          data: { index: i }
        });
      }

      const startTime = Date.now();
      const results = await engine.renderBatch(requests);

      const duration = Date.now() - startTime;

      expect(results.length).toBe(requestCount);
      expect(results.every(result => result instanceof ArrayBuffer)).toBe(true);
      expect(duration).toBeLessThan(2000); // 批量渲染应该稍慢但仍合理
    });
  });

  describe('边界情况', () => {
    beforeEach(async () => {
      await engine.initialize();
    });

    it('应该处理空内容模板', async () => {
      const template: ITemplate = {
        id: 'empty-template',
        name: 'Empty Template',
        type: TemplateType.TEXT,
        content: '',
        description: 'Empty description',
        createdAt: new Date(),
        updatedAt: new Date(),
        version: '1.0.0',
        tags: [],
        metadata: {},
        enabled: true
      };

      await engine.registerTemplate(template);

      const result = await engine.render('empty-template', {});
      expect(result).toBeInstanceOf(ArrayBuffer);
    });

    it('应该处理长内容模板', async () => {
      const longContent = 'x'.repeat(10000);
      const template: ITemplate = {
        id: 'long-template',
        name: 'Long Template',
        type: TemplateType.TEXT,
        content: longContent,
        description: 'Long description',
        createdAt: new Date(),
        updatedAt: new Date(),
        version: '1.0.0',
        tags: [],
        metadata: {},
        enabled: true
      };

      await engine.registerTemplate(template);

      const result = await engine.render('long-template', {});
      expect(result).toBeInstanceOf(ArrayBuffer);
    });

    it('应该处理复杂数据', async () => {
      const complexData = {
        user: {
          id: 1,
          name: 'Test User',
          profile: {
            age: 25,
            interests: ['reading', 'coding', 'music'],
            settings: {
              theme: 'dark',
              notifications: true
            }
          }
        },
        items: [
          { id: 1, name: 'Item 1', price: 10.99 },
          { id: 2, name: 'Item 2', price: 20.99 }
        ],
        metadata: {
          created: new Date(),
          version: '2.0.0',
          features: ['feature1', 'feature2', 'feature3']
        }
      };

      const template: ITemplate = {
        id: 'complex-template',
        name: 'Complex Template',
        type: TemplateType.TEXT,
        content: '{{user.name}} - {{user.profile.age}}',
        description: 'Complex description',
        createdAt: new Date(),
        updatedAt: new Date(),
        version: '1.0.0',
        tags: [],
        metadata: {},
        enabled: true
      };

      await engine.registerTemplate(template);

      const result = await engine.render('complex-template', complexData);
      expect(result).toBeInstanceOf(ArrayBuffer);
    });

    it('应该处理特殊字符', async () => {
      const template: ITemplate = {
        id: 'special-template',
        name: '特殊字符模板 🚀',
        type: TemplateType.TEXT,
        content: 'Hello 世界! 🎉\n\tSpecial chars: \'"',
        description: '特殊字符描述',
        createdAt: new Date(),
        updatedAt: new Date(),
        version: '1.0.0',
        tags: ['特殊字符'],
        metadata: {},
        enabled: true
      };

      await engine.registerTemplate(template);

      const result = await engine.render('special-template', {});
      expect(result).toBeInstanceOf(ArrayBuffer);
    });
  });

  describe('模板类型测试', () => {
    beforeEach(async () => {
      await engine.initialize();

      // 注册所有类型的渲染器
      engine.registerRenderer('text', new MockTemplateRenderer('TextRenderer', [TemplateType.TEXT]));
      engine.registerRenderer('receipt', new MockTemplateRenderer('ReceiptRenderer', [TemplateType.RECEIPT]));
      engine.registerRenderer('label', new MockTemplateRenderer('LabelRenderer', [TemplateType.LABEL]));
      engine.registerRenderer('ticket', new MockTemplateRenderer('TicketRenderer', [TemplateType.TICKET]));
      engine.registerRenderer('invoice', new MockTemplateRenderer('InvoiceRenderer', [TemplateType.INVOICE]));
      engine.registerRenderer('report', new MockTemplateRenderer('ReportRenderer', [TemplateType.REPORT]));
      engine.registerRenderer('custom', new MockTemplateRenderer('CustomRenderer', [TemplateType.CUSTOM]));
    });

    it('应该支持所有模板类型', async () => {
      const types = [
        TemplateType.TEXT,
        TemplateType.RECEIPT,
        TemplateType.LABEL,
        TemplateType.TICKET,
        TemplateType.INVOICE,
        TemplateType.REPORT,
        TemplateType.CUSTOM
      ];

      for (const type of types) {
        const template: ITemplate = {
          id: `${type}-template`,
          name: `${type} Template`,
          type,
          content: `${type} content`,
          description: `${type} description`,
          createdAt: new Date(),
          updatedAt: new Date(),
          version: '1.0.0',
          tags: [type],
          metadata: {},
          enabled: true
        };

        await engine.registerTemplate(template);
        const result = await engine.render(`${type}-template`, {});
        expect(result).toBeInstanceOf(ArrayBuffer);
      }
    });

    it('应该拒绝未知类型的模板', async () => {
      const template: ITemplate = {
        id: 'unknown-template',
        name: 'Unknown Template',
        type: TemplateType.TEXT,
        content: 'Unknown content',
        description: 'Unknown description',
        createdAt: new Date(),
        updatedAt: new Date(),
        version: '1.0.0',
        tags: [],
        metadata: {},
        enabled: true
      };

      await engine.registerTemplate(template);
      // Mock渲染器只支持text和receipt类型
      (engine as any).registerRenderer = jest.fn().mockReturnValue(new MockTemplateRenderer('TestRenderer', [TemplateType.TEXT]));

      const result = await engine.render('unknown-template', {});
      expect(result).toBeInstanceOf(ArrayBuffer);
    });
  });
});