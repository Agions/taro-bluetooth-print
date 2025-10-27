/**
 * 配置管理模块导出
 */

// 核心类
export { ConfigManager } from './ConfigManager';

// 配置提供者
export {
  MemoryConfigProvider,
  EnvironmentConfigProvider,
  FileConfigProvider,
  RemoteConfigProvider,
  CompositeConfigProvider
} from './ConfigProvider';

// 类型定义
export type {
  IConfig,
  IConfigProvider,
  IConfigManager,
  IConfigCache,
  IConfigSchema,
  IConfigChangeEvent,
  IConfigSerializer,
  IConfigProviderFactory,
  ValidationRule,
  ValidationResult,
  ValidationError,
  ValidationWarning,
  IEnvironmentConfig,
  CacheStats,
  ConfigStats
} from './types';

export {
  ConfigType,
  EnvironmentType,
  IConfigManagerConfig
} from './types';

// 创建默认实例
export const defaultConfigManager = new ConfigManager({
  enableCache: true,
  enableValidation: true,
  enableHotReload: false,
  envPrefix: 'TARO_BLUETOOTH_PRINT'
});

// 配置工厂函数
export function createConfigManager(config?: IConfigManagerConfig): ConfigManager {
  return new ConfigManager(config);
}

// 配置构建器
export class ConfigBuilder {
  private config: Partial<IConfig> = {};

  /**
   * 设置配置值
   */
  value(value: any): this {
    this.config.value = value;
    return this;
  }

  /**
   * 设置配置类型
   */
  type(type: ConfigType): this {
    this.config.type = type;
    return this;
  }

  /**
   * 设置为必需
   */
  required(required: boolean = true): this {
    this.config.required = required;
    return this;
  }

  /**
   * 设置默认值
   */
  defaultValue(value: any): this {
    this.config.defaultValue = value;
    return this;
  }

  /**
   * 设置描述
   */
  description(description: string): this {
    this.config.description = description;
    return this;
  }

  /**
   * 添加验证规则
   */
  addValidation(rule: ValidationRule): this {
    if (!this.config.validation) {
      this.config.validation = [];
    }
    this.config.validation.push(rule);
    return this;
  }

  /**
   * 设置环境变量映射
   */
  envVar(envVar: string): this {
    this.config.envVar = envVar;
    return this;
  }

  /**
   * 设置为敏感配置
   */
  sensitive(sensitive: boolean = true): this {
    this.config.sensitive = sensitive;
    return this;
  }

  /**
   * 设置为只读
   */
  readonly(readonly: boolean = true): this {
    this.config.readonly = readonly;
    return this;
  }

  /**
   * 设置为可热更新
   */
  hotReload(hotReload: boolean = true): this {
    this.config.hotReload = hotReload;
    return this;
  }

  /**
   * 设置元数据
   */
  metadata(metadata: Record<string, any>): this {
    this.config.metadata = { ...this.config.metadata, ...metadata };
    return this;
  }

  /**
   * 构建配置对象
   */
  build(): IConfig {
    return {
      value: this.config.value,
      type: this.config.type || ConfigType.STRING,
      required: this.config.required || false,
      defaultValue: this.config.defaultValue,
      description: this.config.description,
      validation: this.config.validation,
      envVar: this.config.envVar,
      sensitive: this.config.sensitive || false,
      readonly: this.config.readonly || false,
      hotReload: this.config.hotReload || false,
      metadata: this.config.metadata || {}
    };
  }
}

// 常用验证规则
export const ValidationRules = {
  /**
   * 必填验证
   */
  required(message?: string): ValidationRule {
    return {
      name: 'required',
      validate: (value: any) => value !== undefined && value !== null && value !== '',
      message: message || 'This field is required'
    };
  },

  /**
   * 最小长度验证
   */
  minLength(min: number, message?: string): ValidationRule {
    return {
      name: 'minLength',
      validate: (value: any) => {
        if (typeof value !== 'string') return true;
        return value.length >= min;
      },
      message: message || `Minimum length is ${min}`
    };
  },

  /**
   * 最大长度验证
   */
  maxLength(max: number, message?: string): ValidationRule {
    return {
      name: 'maxLength',
      validate: (value: any) => {
        if (typeof value !== 'string') return true;
        return value.length <= max;
      },
      message: message || `Maximum length is ${max}`
    };
  },

  /**
   * 最小值验证
   */
  min(min: number, message?: string): ValidationRule {
    return {
      name: 'min',
      validate: (value: any) => {
        if (typeof value !== 'number') return true;
        return value >= min;
      },
      message: message || `Minimum value is ${min}`
    };
  },

  /**
   * 最大值验证
   */
  max(max: number, message?: string): ValidationRule {
    return {
      name: 'max',
      validate: (value: any) => {
        if (typeof value !== 'number') return true;
        return value <= max;
      },
      message: message || `Maximum value is ${max}`
    };
  },

  /**
   * 正则表达式验证
   */
  regex(pattern: RegExp, message?: string): ValidationRule {
    return {
      name: 'regex',
      validate: (value: any) => {
        if (typeof value !== 'string') return true;
        return pattern.test(value);
      },
      message: message || `Value does not match pattern ${pattern}`
    };
  },

  /**
   * 邮箱验证
   */
  email(message?: string): ValidationRule {
    return {
      name: 'email',
      validate: (value: any) => {
        if (typeof value !== 'string') return true;
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
      },
      message: message || 'Invalid email format'
    };
  },

  /**
   * URL验证
   */
  url(message?: string): ValidationRule {
    return {
      name: 'url',
      validate: (value: any) => {
        if (typeof value !== 'string') return true;
        try {
          new URL(value);
          return true;
        } catch {
          return false;
        }
      },
      message: message || 'Invalid URL format'
    };
  },

  /**
   * 枚举值验证
   */
  enum(values: any[], message?: string): ValidationRule {
    return {
      name: 'enum',
      validate: (value: any) => values.includes(value),
      message: message || `Value must be one of: ${values.join(', ')}`
    };
  },

  /**
   * 自定义验证
   */
  custom(validator: (value: any) => boolean | string, name?: string): ValidationRule {
    return {
      name: name || 'custom',
      validate: validator,
      message: undefined // 由验证函数返回消息
    };
  }
};

// 配置常量
export const ConfigKeys = {
  // 蓝牙配置
  BLUETOOTH_ADAPTER_TYPE: 'bluetooth.adapter.type',
  BLUETOOTH_SCAN_TIMEOUT: 'bluetooth.scan.timeout',
  BLUETOOTH_CONNECTION_TIMEOUT: 'bluetooth.connection.timeout',
  BLUETOOTH_MAX_RETRY_COUNT: 'bluetooth.maxRetryCount',
  BLUETOOTH_RETRY_DELAY: 'bluetooth.retryDelay',

  // 打印机配置
  PRINTER_DEFAULT_TYPE: 'printer.defaultType',
  PRINTER_DEFAULT_WIDTH: 'printer.defaultWidth',
  PRINTER_QUEUE_SIZE: 'printer.queueSize',
  PRINTER_JOB_TIMEOUT: 'printer.jobTimeout',
  PRINTER_AUTO_RECONNECT: 'printer.autoReconnect',

  // 日志配置
  LOG_LEVEL: 'log.level',
  LOG_MAX_FILE_SIZE: 'log.maxFileSize',
  LOG_MAX_FILES: 'log.maxFiles',
  LOG_CONSOLE_ENABLED: 'log.console.enabled',
  LOG_FILE_ENABLED: 'log.file.enabled',

  // 缓存配置
  CACHE_ENABLED: 'cache.enabled',
  CACHE_TTL: 'cache.ttl',
  CACHE_MAX_SIZE: 'cache.maxSize',

  // 性能配置
  PERFORMANCE_MONITORING_ENABLED: 'performance.monitoring.enabled',
  PERFORMANCE_SAMPLE_RATE: 'performance.sampleRate',
  PERFORMANCE_MAX_SAMPLES: 'performance.maxSamples',

  // 安全配置
  SECURITY_ENCRYPTION_ENABLED: 'security.encryption.enabled',
  SECURITY_ENCRYPTION_KEY: 'security.encryption.key',
  SECURITY_ACCESS_TOKEN_EXPIRY: 'security.accessToken.expiry',

  // 开发配置
  DEVELOPMENT_MODE: 'development.mode',
  DEVELOPMENT_DEBUG_ENABLED: 'development.debug.enabled',
  DEVELOPMENT_MOCK_SERVICES: 'development.mockServices',

  // API配置
  API_BASE_URL: 'api.baseUrl',
  API_TIMEOUT: 'api.timeout',
  API_RETRY_COUNT: 'api.retryCount',
  API_RETRY_DELAY: 'api.retryDelay'
} as const;

// 环境类型常量
export const Environments = {
  DEVELOPMENT: 'development',
  TESTING: 'testing',
  STAGING: 'staging',
  PRODUCTION: 'production'
} as const;

// 配置工具函数
export class ConfigUtils {
  /**
   * 深度合并配置对象
   */
  static deepMerge(target: any, source: any): any {
    const result = { ...target };

    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(result[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }

    return result;
  }

  /**
   * 获取嵌套配置值
   */
  static getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * 设置嵌套配置值
   */
  static setNestedValue(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    const target = keys.reduce((current, key) => {
      if (!current[key] || typeof current[key] !== 'object') {
        current[key] = {};
      }
      return current[key];
    }, obj);
    target[lastKey] = value;
  }

  /**
   * 删除嵌套配置值
   */
  static removeNestedValue(obj: any, path: string): boolean {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    const target = keys.reduce((current, key) => current?.[key], obj);

    if (target && target.hasOwnProperty(lastKey)) {
      delete target[lastKey];
      return true;
    }

    return false;
  }

  /**
   * 扁平化配置对象
   */
  static flatten(obj: any, prefix = '', separator = '.'): Record<string, any> {
    const result: Record<string, any> = {};

    for (const key in obj) {
      const value = obj[key];
      const newKey = prefix ? `${prefix}${separator}${key}` : key;

      if (value && typeof value === 'object' && !Array.isArray(value)) {
        Object.assign(result, this.flatten(value, newKey, separator));
      } else {
        result[newKey] = value;
      }
    }

    return result;
  }

  /**
   * 反扁平化配置对象
   */
  static unflatten(obj: Record<string, any>, separator = '.'): Record<string, any> {
    const result: Record<string, any> = {};

    for (const [key, value] of Object.entries(obj)) {
      this.setNestedValue(result, key, value);
    }

    return result;
  }

  /**
   * 验证配置结构
   */
  static validateStructure(config: any, schema: Record<string, IConfig>): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    for (const [key, schemaDef] of Object.entries(schema)) {
      const value = this.getNestedValue(config, key);

      if (schemaDef.required && (value === undefined || value === null)) {
        errors.push({
          key,
          message: `Required config '${key}' is missing`,
          value
        });
        continue;
      }

      if (value !== undefined) {
        // 类型验证
        if (!this.validateType(value, schemaDef.type)) {
          errors.push({
            key,
            message: `Config '${key}' must be of type ${schemaDef.type}`,
            value
          });
        }

        // 自定义验证
        if (schemaDef.validation) {
          for (const rule of schemaDef.validation) {
            const result = rule.validate(value);
            if (result === false) {
              errors.push({
                key,
                message: rule.message || `Validation failed for config '${key}'`,
                value,
                rule: rule.name
              });
            } else if (typeof result === 'string') {
              errors.push({
                key,
                message: result,
                value,
                rule: rule.name
              });
            }
          }
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * 验证类型
   */
  private static validateType(value: any, type: ConfigType): boolean {
    switch (type) {
      case ConfigType.STRING:
        return typeof value === 'string';
      case ConfigType.NUMBER:
        return typeof value === 'number' && !isNaN(value);
      case ConfigType.BOOLEAN:
        return typeof value === 'boolean';
      case ConfigType.ARRAY:
        return Array.isArray(value);
      case ConfigType.OBJECT:
        return typeof value === 'object' && value !== null && !Array.isArray(value);
      case ConfigType.JSON:
        try {
          JSON.stringify(value);
          return true;
        } catch {
          return false;
        }
      case ConfigType.DATE:
        return value instanceof Date || (!isNaN(Date.parse(value)));
      case ConfigType.URL:
        try {
          new URL(value);
          return true;
        } catch {
          return false;
        }
      case ConfigType.EMAIL:
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
      default:
        return true;
    }
  }
}