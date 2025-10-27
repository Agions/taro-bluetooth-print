/**
 * 配置管理器单元测试
 */

import { ConfigManager } from '../../../../src/infrastructure/config/ConfigManager';
import { IConfigManager, IConfigProvider, ConfigType } from '../../../../src/infrastructure/config/types';

// Mock提供者
class MockProvider implements IConfigProvider {
  constructor(
    private data: Record<string, any> = {},
    public readonly name: string = 'MockProvider',
    public readonly priority: number = 100,
    public readonly readonly: boolean = false
  ) {}

  async get(key: string): Promise<any> {
    return this.data[key];
  }

  async set(key: string, value: any): Promise<void> {
    if (this.readonly) {
      throw new Error('Provider is readonly');
    }
    this.data[key] = value;
  }

  async has(key: string): Promise<boolean> {
    return key in this.data;
  }

  async remove(key: string): Promise<boolean> {
    if (this.readonly) {
      return false;
    }
    if (key in this.data) {
      delete this.data[key];
      return true;
    }
    return false;
  }

  keys(): string[] {
    return Object.keys(this.data);
  }

  getAll(): Record<string, any> {
    return { ...this.data };
  }

  clear(): void {
    this.data = {};
  }

  async reload(): Promise<void> {
    // Mock实现
  }

  dispose(): void {
    this.clear();
  }
}

describe('ConfigManager', () => {
  let configManager: IConfigManager;

  beforeEach(() => {
    configManager = new ConfigManager();
  });

  afterEach(() => {
    configManager.dispose();
  });

  describe('提供者管理', () => {
    it('应该能够注册配置提供者', () => {
      const provider = new MockProvider({ test: 'value' });
      configManager.registerProvider(provider);

      // 验证提供者已注册（通过get方法验证）
      expect(configManager.get('test')).toBe('value');
    });

    it('应该能够移除配置提供者', () => {
      const provider = new MockProvider({ test: 'value' });
      configManager.registerProvider(provider);

      // 验证提供者已工作
      expect(configManager.get('test')).toBe('value');

      // 移除提供者
      configManager.removeProvider(provider.name);

      // 验证提供者已移除
      expect(configManager.get('test')).toBeUndefined();
    });

    it('应该按照优先级使用提供者', () => {
      const lowPriorityProvider = new MockProvider({ key: 'low' }, 'low', 10);
      const highPriorityProvider = new MockProvider({ key: 'high' }, 'high', 200);

      configManager.registerProvider(lowPriorityProvider);
      configManager.registerProvider(highPriorityProvider);

      // 高优先级提供者应该生效
      expect(configManager.get('key')).toBe('high');
    });

    it('应该支持相同名称的提供者替换', () => {
      const provider1 = new MockProvider({ key: 'value1' }, 'test', 100);
      const provider2 = new MockProvider({ key: 'value2' }, 'test', 100);

      configManager.registerProvider(provider1);
      expect(configManager.get('key')).toBe('value1');

      configManager.registerProvider(provider2);
      expect(configManager.get('key')).toBe('value2');
    });

    it('应该能够获取统计信息', () => {
      const provider1 = new MockProvider({ key1: 'value1' }, 'provider1', 100);
      const provider2 = new MockProvider({ key2: 'value2' }, 'provider2', 200, true);

      configManager.registerProvider(provider1);
      configManager.registerProvider(provider2);

      const stats = configManager.getStats();
      expect(stats.providers).toHaveLength(2);
      expect(stats.providers[0].name).toBe('provider2'); // 高优先级在前
      expect(stats.providers[1].name).toBe('provider1');
      expect(stats.providers[0].readonly).toBe(true);
      expect(stats.providers[1].readonly).toBe(false);
    });
  });

  describe('配置获取', () => {
    beforeEach(() => {
      // 注册测试提供者
      const provider = new MockProvider({
        'string.key': 'string value',
        'number.key': 42,
        'boolean.key': true,
        'object.key': { nested: 'value' },
        'array.key': [1, 2, 3],
        'null.key': null,
        'undefined.key': undefined
      });
      configManager.registerProvider(provider);
    });

    it('应该能够获取字符串配置', () => {
      expect(configManager.get('string.key')).toBe('string value');
    });

    it('应该能够获取数字配置', () => {
      expect(configManager.get('number.key')).toBe(42);
    });

    it('应该能够获取布尔配置', () => {
      expect(configManager.get('boolean.key')).toBe(true);
    });

    it('应该能够获取对象配置', () => {
      expect(configManager.get('object.key')).toEqual({ nested: 'value' });
    });

    it('应该能够获取数组配置', () => {
      expect(configManager.get('array.key')).toEqual([1, 2, 3]);
    });

    it('应该能够获取null配置', () => {
      expect(configManager.get('null.key')).toBeNull();
    });

    it('应该能够获取undefined配置', () => {
      expect(configManager.get('undefined.key')).toBeUndefined();
    });

    it('应该能够提供默认值', () => {
      expect(configManager.get('nonexistent.key', 'default')).toBe('default');
      expect(configManager.get('null.key', 'default')).toBeNull(); // null值不会被默认值替换
    });

    it('应该支持异步获取', async () => {
      expect(await configManager.getAsync('string.key')).toBe('string value');
      expect(await configManager.getAsync('nonexistent.key', 'default')).toBe('default');
    });

    it('应该能够检查配置是否存在', () => {
      expect(configManager.has('string.key')).toBe(true);
      expect(configManager.has('nonexistent.key')).toBe(false);
      expect(configManager.has('null.key')).toBe(true);
      expect(configManager.has('undefined.key')).toBe(true);
    });

    it('应该支持异步检查', async () => {
      expect(await configManager.hasAsync('string.key')).toBe(true);
      expect(await configManager.hasAsync('nonexistent.key')).toBe(false);
    });
  });

  describe('配置设置', () => {
    beforeEach(() => {
      const provider = new MockProvider({});
      configManager.registerProvider(provider);
    });

    it('应该能够设置配置值', async () => {
      await configManager.set('test.key', 'test value');
      expect(configManager.get('test.key')).toBe('test value');
    });

    it('应该能够更新配置值', async () => {
      await configManager.set('test.key', 'initial');
      await configManager.set('test.key', 'updated');
      expect(configManager.get('test.key')).toBe('updated');
    });

    it('应该能够删除配置值', async () => {
      await configManager.set('test.key', 'value');
      expect(configManager.has('test.key')).toBe(true);

      const removed = await configManager.remove('test.key');
      expect(removed).toBe(true);
      expect(configManager.has('test.key')).toBe(false);
    });

    it('删除不存在的配置应该返回false', async () => {
      const removed = await configManager.remove('nonexistent.key');
      expect(removed).toBe(false);
    });

    it('只读提供者不应该允许设置值', async () => {
      const readonlyProvider = new MockProvider({}, 'readonly', 100, true);
      configManager.registerProvider(readonlyProvider);

      await expect(configManager.set('test.key', 'value'))
        .rejects.toThrow();
    });

    it('只读提供者不应该允许删除值', async () => {
      const readonlyProvider = new MockProvider({ key: 'value' }, 'readonly', 100, true);
      configManager.registerProvider(readonlyProvider);

      const removed = await configManager.remove('key');
      expect(removed).toBe(false);
      expect(configManager.get('key')).toBe('value');
    });
  });

  describe('批量操作', () => {
    beforeEach(() => {
      const provider = new MockProvider({
        'key1': 'value1',
        'key2': 'value2',
        'key3': 'value3'
      });
      configManager.registerProvider(provider);
    });

    it('应该能够获取所有配置', () => {
      const allConfig = configManager.getAll();
      expect(Object.keys(allConfig)).toContain('key1');
      expect(Object.keys(allConfig)).toContain('key2');
      expect(Object.keys(allConfig)).toContain('key3');
      expect(allConfig.key1).toBe('value1');
      expect(allConfig.key2).toBe('value2');
      expect(allConfig.key3).toBe('value3');
    });

    it('应该能够重载所有提供者', async () => {
      await configManager.reload();
      // Mock提供者的reload是空的，所以不会抛出错误
      expect(true).toBe(true);
    });
  });

  describe('配置验证', () => {
    beforeEach(() => {
      // 配置验证器
      (configManager as any).schemas = new Map([
        ['required.string', {
          type: ConfigType.STRING,
          required: true
        }],
        ['optional.number', {
          type: ConfigType.NUMBER,
          required: false
        }],
        ['email.value', {
          type: ConfigType.EMAIL,
          required: true
        }]
      ]);
    });

    it('应该验证必需的配置', () => {
      const validation = configManager.validate('required.string');
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toHaveLength(1);
      expect(validation.errors[0].message).toContain('required');
    });

    it('应该验证可选的配置', () => {
      const validation = configManager.validate('optional.number');
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('应该验证类型', async () => {
      await configManager.set('email.value', 'invalid-email');
      const validation = configManager.validate('email.value');
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toHaveLength(1);
      expect(validation.errors[0].message).toContain('Invalid email format');
    });

    it('应该验证所有配置', async () => {
      await configManager.set('required.string', 'valid string');
      await configManager.set('email.value', 'test@example.com');

      const validation = configManager.validate();
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });
  });

  describe('监听器', () => {
    beforeEach(() => {
      const provider = new MockProvider({});
      configManager.registerProvider(provider);
    });

    it('应该能够监听配置变化', async () => {
      let changeReceived = false;
      let oldValue: any;
      let newValue: any;

      const unsubscribe = configManager.watch('test.key', (newVal, oldVal) => {
        changeReceived = true;
        newValue = newVal;
        oldValue = oldVal;
      });

      await configManager.set('test.key', 'new value');

      expect(changeReceived).toBe(true);
      expect(newValue).toBe('new value');
      expect(oldValue).toBeUndefined();

      unsubscribe();
    });

    it('应该能够监听批量变化', async () => {
      const changes: Record<string, { newValue: any; oldValue: any }> = {};

      const unsubscribe = configManager.watchBatch(['key1', 'key2'], (changeMap) => {
        Object.assign(changes, changeMap);
      });

      await configManager.set('key1', 'value1');
      await configManager.set('key2', 'value2');

      expect(changes.key1.newValue).toBe('value1');
      expect(changes.key2.newValue).toBe('value2');

      unsubscribe();
    });

    it('应该能够取消监听', async () => {
      let changeCount = 0;

      const unsubscribe = configManager.watch('test.key', () => {
        changeCount++;
      });

      await configManager.set('test.key', 'value1');
      expect(changeCount).toBe(1);

      unsubscribe();

      await configManager.set('test.key', 'value2');
      expect(changeCount).toBe(1); // 应该还是1
    });
  });

  describe('配置导入导出', () => {
    beforeEach(() => {
      const provider = new MockProvider({
        'key1': 'value1',
        'key2': 42,
        'key3': true
      });
      configManager.registerProvider(provider);
    });

    it('应该能够导出JSON格式', () => {
      const exported = configManager.export('json');
      const parsed = JSON.parse(exported);

      expect(parsed.key1).toBe('value1');
      expect(parsed.key2).toBe(42);
      expect(parsed.key3).toBe(true);
    });

    it('应该能够导出Properties格式', () => {
      const exported = configManager.export('properties');

      expect(exported).toContain('key1=value1');
      expect(exported).toContain('key2=42');
      expect(exported).toContain('key3=true');
    });

    it('应该能够导入JSON配置', async () => {
      const importData = {
        'imported.key1': 'imported value1',
        'imported.key2': 100
      };

      await configManager.import(importData, 'json');

      expect(configManager.get('imported.key1')).toBe('imported value1');
      expect(configManager.get('imported.key2')).toBe(100);
    });

    it('应该能够导入Properties配置', async () => {
      const propertiesData = `
imported.key1=imported value1
imported.key2=100
      `;

      await configManager.import(propertiesData, 'properties');

      expect(configManager.get('imported.key1')).toBe('imported value1');
      expect(configManager.get('imported.key2')).toBe('100');
    });

    it('导入无效格式应该抛出错误', async () => {
      await expect(configManager.import('invalid json', 'json'))
        .rejects.toThrow();
    });
  });

  describe('缓存功能', () => {
    beforeEach(() => {
      // 创建启用缓存的配置管理器
      configManager = new ConfigManager({
        enableCache: true,
        cacheTTL: 1000 // 1秒
      });

      const provider = new MockProvider({
        'cached.key': 'cached value'
      });
      configManager.registerProvider(provider);
    });

    it('应该缓存配置值', () => {
      // 第一次获取
      const value1 = configManager.get('cached.key');
      // 第二次获取（应该从缓存）
      const value2 = configManager.get('cached.key');

      expect(value1).toBe('cached value');
      expect(value2).toBe('cached value');
    });

    it('设置值应该清除缓存', async () => {
      // 获取值（缓存）
      configManager.get('cached.key');

      // 设置新值（应该清除缓存）
      await configManager.set('cached.key', 'new value');

      // 获取新值
      expect(configManager.get('cached.key')).toBe('new value');
    });

    it('缓存应该有TTL', async () => {
      // 获取值（进入缓存）
      configManager.get('cached.key');

      // 等待缓存过期
      await new Promise(resolve => setTimeout(resolve, 1100));

      // 获取值（应该重新从提供者获取）
      const value = configManager.get('cached.key');
      expect(value).toBe('cached value');
    });
  });

  describe('错误处理', () => {
    it('应该处理提供者错误', () => {
      const errorProvider = new MockProvider({});
      errorProvider.get = jest.fn().mockImplementation(() => {
        throw new Error('Provider error');
      });

      configManager.registerProvider(errorProvider);

      // 应该返回undefined而不是抛出错误
      expect(configManager.get('error.key')).toBeUndefined();
    });

    it('应该处理异步提供者错误', async () => {
      const errorProvider = new MockProvider({});
      errorProvider.get = jest.fn().mockRejectedValue(new Error('Async error'));

      configManager.registerProvider(errorProvider);

      // 应该返回undefined而不是抛出错误
      await expect(configManager.getAsync('error.key')).resolves.toBeUndefined();
    });

    it('已销毁的管理器不能操作', async () => {
      configManager.dispose();

      expect(() => configManager.get('test.key')).toThrow();
      await expect(configManager.getAsync('test.key')).rejects.toThrow();
      await expect(configManager.set('test.key', 'value')).rejects.toThrow();
      expect(() => configManager.has('test.key')).toThrow();
    });
  });

  describe('统计信息', () => {
    beforeEach(() => {
      const provider = new MockProvider({
        'key1': 'value1',
        'key2': 'value2'
      });
      configManager.registerProvider(provider);
    });

    it('应该提供操作统计', () => {
      // 执行一些操作
      configManager.get('key1');
      configManager.get('key2');
      configManager.get('nonexistent');

      const stats = configManager.getStats();

      expect(stats.operations.gets).toBe(3);
      expect(stats.operations.hits).toBe(2);
      expect(stats.operations.misses).toBe(1);
      expect(stats.operations.hitRate).toBeCloseTo(66.67, 1);
    });

    it('应该跟踪缓存统计', () => {
      const stats = configManager.getStats();

      expect(stats.cache).toBeDefined();
      expect(stats.cache.enabled).toBeDefined();
      expect(stats.cache.size).toBeGreaterThanOrEqual(0);
    });
  });
});