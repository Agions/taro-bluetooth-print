/**
 * 事件基类实现
 */

import {
  IEvent,
  IDomainEvent,
  IIntegrationEvent,
  IApplicationEvent
} from './types';

/**
 * 基础事件抽象类
 */
export abstract class BaseEvent implements IEvent {
  /** 事件唯一标识符 */
  public readonly id: string;

  /** 事件类型 */
  public readonly type: string;

  /** 事件时间戳 */
  public readonly timestamp: number;

  /** 事件来源 */
  public readonly source?: string;

  /** 事件版本 */
  public readonly version?: number;

  /** 事件数据 */
  public readonly data?: any;

  /** 事件元数据 */
  public readonly metadata?: Record<string, any>;

  constructor(eventType: string, data?: any, options: {
    id?: string;
    source?: string;
    version?: number;
    metadata?: Record<string, any>;
  } = {}) {
    this.id = options.id || this.generateId();
    this.type = eventType;
    this.timestamp = Date.now();
    this.data = data;
    this.source = options.source;
    this.version = options.version || 1;
    this.metadata = options.metadata || {};
  }

  /**
   * 生成唯一ID
   */
  private generateId(): string {
    return `${this.type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 转换为JSON
   */
  public toJSON(): Record<string, any> {
    return {
      id: this.id,
      type: this.type,
      timestamp: this.timestamp,
      source: this.source,
      version: this.version,
      data: this.data,
      metadata: this.metadata
    };
  }

  /**
   * 从JSON创建事件
   */
  public static fromJSON<T extends BaseEvent>(
    this: new (eventType: string, data?: any, options?: any) => T,
    json: Record<string, any>
  ): T {
    return new this(
      json.type,
      json.data,
      {
        id: json.id,
        source: json.source,
        version: json.version,
        metadata: json.metadata
      }
    );
  }

  /**
   * 克隆事件
   */
  public clone(options: {
    data?: any;
    metadata?: Record<string, any>;
    source?: string;
  } = {}): this {
    const Clazz = this.constructor as new (eventType: string, data?: any, options?: any) => this;
    return new Clazz(
      this.type,
      options.data !== undefined ? options.data : this.data,
      {
        id: this.generateId(),
        source: options.source !== undefined ? options.source : this.source,
        version: this.version,
        metadata: { ...this.metadata, ...options.metadata }
      }
    );
  }

  /**
   * 检查事件类型
   */
  public isType(eventType: string): boolean {
    return this.type === eventType;
  }

  /**
   * 检查事件是否过期
   */
  public isExpired(maxAge: number): boolean {
    return Date.now() - this.timestamp > maxAge;
  }

  /**
   * 获取事件年龄
   */
  public getAge(): number {
    return Date.now() - this.timestamp;
  }

  /**
   * 转换为字符串
   */
  public toString(): string {
    return `${this.type}(id=${this.id}, timestamp=${this.timestamp})`;
  }
}

/**
 * 领域事件基类
 */
export abstract class DomainEvent extends BaseEvent implements IDomainEvent {
  /** 聚合根ID */
  public readonly aggregateId: string;

  /** 聚合根类型 */
  public readonly aggregateType: string;

  /** 事件版本 */
  public readonly eventVersion: number;

  constructor(
    eventType: string,
    aggregateId: string,
    aggregateType: string,
    data?: any,
    options: {
      eventVersion?: number;
      id?: string;
      source?: string;
      version?: number;
      metadata?: Record<string, any>;
    } = {}
  ) {
    super(eventType, data, options);
    this.aggregateId = aggregateId;
    this.aggregateType = aggregateType;
    this.eventVersion = options.eventVersion || 1;
  }

  /**
   * 转换为JSON
   */
  public toJSON(): Record<string, any> {
    return {
      ...super.toJSON(),
      aggregateId: this.aggregateId,
      aggregateType: this.aggregateType,
      eventVersion: this.eventVersion
    };
  }

  /**
   * 克隆领域事件
   */
  public clone(options: {
    data?: any;
    metadata?: Record<string, any>;
    source?: string;
    aggregateId?: string;
  } = {}): this {
    const Clazz = this.constructor as new (
      eventType: string,
      aggregateId: string,
      aggregateType: string,
      data?: any,
      options?: any
    ) => this;

    return new Clazz(
      this.type,
      options.aggregateId !== undefined ? options.aggregateId : this.aggregateId,
      this.aggregateType,
      options.data !== undefined ? options.data : this.data,
      {
        eventVersion: this.eventVersion,
        id: this.generateId(),
        source: options.source !== undefined ? options.source : this.source,
        version: this.version,
        metadata: { ...this.metadata, ...options.metadata }
      }
    );
  }
}

/**
 * 集成事件基类
 */
export abstract class IntegrationEvent extends BaseEvent implements IIntegrationEvent {
  /** 目标系统 */
  public readonly targetSystem?: string;

  /** 关联ID */
  public readonly correlationId?: string;

  /** 因果ID */
  public readonly causationId?: string;

  constructor(
    eventType: string,
    data?: any,
    options: {
      targetSystem?: string;
      correlationId?: string;
      causationId?: string;
      id?: string;
      source?: string;
      version?: number;
      metadata?: Record<string, any>;
    } = {}
  ) {
    super(eventType, data, options);
    this.targetSystem = options.targetSystem;
    this.correlationId = options.correlationId;
    this.causationId = options.causationId;
  }

  /**
   * 转换为JSON
   */
  public toJSON(): Record<string, any> {
    return {
      ...super.toJSON(),
      targetSystem: this.targetSystem,
      correlationId: this.correlationId,
      causationId: this.causationId
    };
  }

  /**
   * 创建相关事件
   */
  public createRelatedEvent<T extends IntegrationEvent>(
    eventType: string,
    data?: any,
    options: {
      targetSystem?: string;
      metadata?: Record<string, any>;
    } = {}
  ): T {
    const Clazz = this.constructor as new (
      eventType: string,
      data?: any,
      options?: any
    ) => T;

    return new Clazz(eventType, data, {
      targetSystem: options.targetSystem || this.targetSystem,
      correlationId: this.correlationId,
      causationId: this.id,
      source: this.source,
      version: this.version,
      metadata: { ...this.metadata, ...options.metadata }
    });
  }
}

/**
 * 应用事件基类
 */
export abstract class ApplicationEvent extends BaseEvent implements IApplicationEvent {
  /** 用户ID */
  public readonly userId?: string;

  /** 会话ID */
  public readonly sessionId?: string;

  /** 请求ID */
  public readonly requestId?: string;

  constructor(
    eventType: string,
    data?: any,
    options: {
      userId?: string;
      sessionId?: string;
      requestId?: string;
      id?: string;
      source?: string;
      version?: number;
      metadata?: Record<string, any>;
    } = {}
  ) {
    super(eventType, data, options);
    this.userId = options.userId;
    this.sessionId = options.sessionId;
    this.requestId = options.requestId;
  }

  /**
   * 转换为JSON
   */
  public toJSON(): Record<string, any> {
    return {
      ...super.toJSON(),
      userId: this.userId,
      sessionId: this.sessionId,
      requestId: this.requestId
    };
  }

  /**
   * 创建用户相关事件
   */
  public createUserEvent<T extends ApplicationEvent>(
    eventType: string,
    data?: any,
    options: {
      metadata?: Record<string, any>;
    } = {}
  ): T {
    const Clazz = this.constructor as new (
      eventType: string,
      data?: any,
      options?: any
    ) => T;

    return new Clazz(eventType, data, {
      userId: this.userId,
      sessionId: this.sessionId,
      requestId: this.requestId,
      source: this.source,
      version: this.version,
      metadata: { ...this.metadata, ...options.metadata }
    });
  }
}

/**
 * 事件工厂类
 */
export class EventFactory {
  /**
   * 创建基础事件
   */
  static createEvent<T extends BaseEvent>(
    eventClass: new (eventType: string, data?: any, options?: any) => T,
    eventType: string,
    data?: any,
    options?: any
  ): T {
    return new eventClass(eventType, data, options);
  }

  /**
   * 创建领域事件
   */
  static createDomainEvent<T extends DomainEvent>(
    eventClass: new (eventType: string, aggregateId: string, aggregateType: string, data?: any, options?: any) => T,
    eventType: string,
    aggregateId: string,
    aggregateType: string,
    data?: any,
    options?: any
  ): T {
    return new eventClass(eventType, aggregateId, aggregateType, data, options);
  }

  /**
   * 创建集成事件
   */
  static createIntegrationEvent<T extends IntegrationEvent>(
    eventClass: new (eventType: string, data?: any, options?: any) => T,
    eventType: string,
    data?: any,
    options?: any
  ): T {
    return new eventClass(eventType, data, options);
  }

  /**
   * 创建应用事件
   */
  static createApplicationEvent<T extends ApplicationEvent>(
    eventClass: new (eventType: string, data?: any, options?: any) => T,
    eventType: string,
    data?: any,
    options?: any
  ): T {
    return new eventClass(eventType, data, options);
  }

  /**
   * 从JSON创建事件
   */
  static fromJSON<T extends BaseEvent>(
    eventClass: new (eventType: string, data?: any, options?: any) => T,
    json: Record<string, any>
  ): T {
    return eventClass.fromJSON(json);
  }
}

/**
 * 事件构建器
 */
export class EventBuilder<T extends BaseEvent = BaseEvent> {
  private eventType?: string;
  private data?: any;
  private options: any = {};

  /**
   * 设置事件类型
   */
  setType(eventType: string): this {
    this.eventType = eventType;
    return this;
  }

  /**
   * 设置事件数据
   */
  setData(data: any): this {
    this.data = data;
    return this;
  }

  /**
   * 设置事件源
   */
  setSource(source: string): this {
    this.options.source = source;
    return this;
  }

  /**
   * 设置事件版本
   */
  setVersion(version: number): this {
    this.options.version = version;
    return this;
  }

  /**
   * 设置元数据
   */
  setMetadata(metadata: Record<string, any>): this {
    this.options.metadata = { ...this.options.metadata, ...metadata };
    return this;
  }

  /**
   * 设置事件ID
   */
  setId(id: string): this {
    this.options.id = id;
    return this;
  }

  /**
   * 构建基础事件
   */
  build(eventClass: new (eventType: string, data?: any, options?: any) => T): T {
    if (!this.eventType) {
      throw new Error('Event type is required');
    }

    return new eventClass(this.eventType, this.data, this.options);
  }

  /**
   * 构建领域事件
   */
  buildDomain<T extends DomainEvent>(
    eventClass: new (eventType: string, aggregateId: string, aggregateType: string, data?: any, options?: any) => T,
    aggregateId: string,
    aggregateType: string
  ): T {
    if (!this.eventType) {
      throw new Error('Event type is required');
    }

    return new eventClass(this.eventType, aggregateId, aggregateType, this.data, this.options);
  }

  /**
   * 构建集成事件
   */
  buildIntegration<T extends IntegrationEvent>(
    eventClass: new (eventType: string, data?: any, options?: any) => T
  ): T {
    if (!this.eventType) {
      throw new Error('Event type is required');
    }

    return new eventClass(this.eventType, this.data, this.options);
  }

  /**
   * 构建应用事件
   */
  buildApplication<T extends ApplicationEvent>(
    eventClass: new (eventType: string, data?: any, options?: any) => T
  ): T {
    if (!this.eventType) {
      throw new Error('Event type is required');
    }

    return new eventClass(this.eventType, this.data, this.options);
  }
}