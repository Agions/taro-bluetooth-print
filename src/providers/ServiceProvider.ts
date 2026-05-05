/**
 * Service Provider Module
 *
 * 将现有服务层注册到 DI 容器
 */

import {
  rootContainer,
  CONNECTION_MANAGER_TOKEN,
  PRINT_JOB_MANAGER_TOKEN,
  COMMAND_BUILDER_TOKEN,
  DEVICE_MANAGER_TOKEN,
  PRINT_QUEUE_TOKEN,
  OFFLINE_CACHE_TOKEN,
  CONFIG_MANAGER_TOKEN,
  PRINTER_STATUS_TOKEN,
  PRINT_HISTORY_TOKEN,
  PRINT_STATISTICS_TOKEN,
  CLOUD_PRINT_MANAGER_TOKEN,
  SCHEDULED_RETRY_MANAGER_TOKEN,
  BATCH_PRINT_MANAGER_TOKEN,
  EVENT_BUS_TOKEN,
  PLUGIN_MANAGER_TOKEN,
  ADAPTER_TOKEN,
} from '@/core';

import { ConnectionManager } from '@/services/ConnectionManager';
import { PrintJobManager } from '@/services/PrintJobManager';
import { CommandBuilder } from '@/services/CommandBuilder';
import { DeviceManager } from '@/device/DeviceManager';
import { PrintQueue } from '@/queue/PrintQueue';
import { OfflineCache } from '@/cache/OfflineCache';
import { PrinterConfigManager } from '@/config/PrinterConfigManager';
import { PrinterStatus } from '@/services/PrinterStatus';
import { PrintHistory } from '@/services/PrintHistory';
import { PrintStatistics } from '@/services/PrintStatistics';
import { CloudPrintManager } from '@/services/CloudPrintManager';
import { ScheduledRetryManager } from '@/services/ScheduledRetryManager';
import { BatchPrintManager } from '@/services/BatchPrintManager';
import { globalEventBus, EventBus } from '@/core/event/EventBus';
import { PluginManager } from '@/core/plugin/PluginManager';
import { AdapterFactory } from '@/adapters/AdapterFactory';
import type { Container } from '@/core/di/Container';

/**
 * 服务提供者配置选项
 */
export interface ServiceProviderOptions {
  /** 是否启用全局事件总线 */
  useGlobalEventBus?: boolean;
  /** 自定义配置 */
  config?: Record<string, unknown>;
}

/**
 * 注册所有服务到 DI 容器
 */
export function registerServices(options: ServiceProviderOptions = {}): void {
  const { useGlobalEventBus = true } = options;

  // 1. 注册事件总线（全局或新建）
  rootContainer.register(EVENT_BUS_TOKEN, {
    useValue: useGlobalEventBus ? globalEventBus : new EventBus(),
    lifecycle: 'singleton',
  });

  // 2. 注册适配器（工厂模式）
  rootContainer.register(ADAPTER_TOKEN, {
    useFactory: _container => AdapterFactory.create(),
    lifecycle: 'singleton',
  });

  // 3. 注册连接管理器
  rootContainer.register(CONNECTION_MANAGER_TOKEN, {
    useClass: ConnectionManager,
    lifecycle: 'singleton',
  });

  // 4. 注册打印任务管理器
  rootContainer.register(PRINT_JOB_MANAGER_TOKEN, {
    useClass: PrintJobManager,
    lifecycle: 'singleton',
  });

  // 5. 注册命令构建器
  rootContainer.register(COMMAND_BUILDER_TOKEN, {
    useClass: CommandBuilder,
    lifecycle: 'transient',
  });

  // 6. 注册设备管理器
  rootContainer.register(DEVICE_MANAGER_TOKEN, {
    useClass: DeviceManager,
    lifecycle: 'singleton',
  });

  // 7. 注册打印队列
  rootContainer.register(PRINT_QUEUE_TOKEN, {
    useClass: PrintQueue,
    lifecycle: 'singleton',
  });

  // 8. 注册离线缓存
  rootContainer.register(OFFLINE_CACHE_TOKEN, {
    useClass: OfflineCache,
    lifecycle: 'singleton',
  });

  // 9. 注册配置管理器
  rootContainer.register(CONFIG_MANAGER_TOKEN, {
    useClass: PrinterConfigManager,
    lifecycle: 'singleton',
  });

  // 10. 注册打印机状态服务
  rootContainer.register(PRINTER_STATUS_TOKEN, {
    useClass: PrinterStatus,
    lifecycle: 'singleton',
  });

  // 11. 注册打印历史服务
  rootContainer.register(PRINT_HISTORY_TOKEN, {
    useClass: PrintHistory,
    lifecycle: 'singleton',
  });

  // 12. 注册打印统计服务
  rootContainer.register(PRINT_STATISTICS_TOKEN, {
    useClass: PrintStatistics,
    lifecycle: 'singleton',
  });

  // 13. 注册云打印管理器
  rootContainer.register(CLOUD_PRINT_MANAGER_TOKEN, {
    useClass: CloudPrintManager,
    lifecycle: 'singleton',
  });

  // 14. 注册定时重试管理器
  rootContainer.register(SCHEDULED_RETRY_MANAGER_TOKEN, {
    useClass: ScheduledRetryManager,
    lifecycle: 'singleton',
  });

  // 15. 注册批量打印管理器
  rootContainer.register(BATCH_PRINT_MANAGER_TOKEN, {
    useClass: BatchPrintManager,
    lifecycle: 'singleton',
  });

  // 16. 注册插件管理器
  rootContainer.register(PLUGIN_MANAGER_TOKEN, {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    useFactory: (container: Container) => {
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
      const eventBus = container.resolve(EVENT_BUS_TOKEN) as EventBus;
      return new PluginManager({
        eventBus,
        container,
        config: options.config || {},
      });
    },
    lifecycle: 'singleton',
  });
}

/**
 * 创建配置好的服务提供者
 */
export function createServiceProvider(options: ServiceProviderOptions = {}) {
  registerServices(options);

  return {
    /** 获取连接管理器 */
    getConnectionManager: () => rootContainer.resolve(CONNECTION_MANAGER_TOKEN),
    /** 获取打印任务管理器 */
    getPrintJobManager: () => rootContainer.resolve(PRINT_JOB_MANAGER_TOKEN),
    /** 获取命令构建器 */
    getCommandBuilder: () => rootContainer.resolve(COMMAND_BUILDER_TOKEN),
    /** 获取设备管理器 */
    getDeviceManager: () => rootContainer.resolve(DEVICE_MANAGER_TOKEN),
    /** 获取打印队列 */
    getPrintQueue: () => rootContainer.resolve(PRINT_QUEUE_TOKEN),
    /** 获取离线缓存 */
    getOfflineCache: () => rootContainer.resolve(OFFLINE_CACHE_TOKEN),
    /** 获取配置管理器 */
    getConfigManager: () => rootContainer.resolve(CONFIG_MANAGER_TOKEN),
    /** 获取打印机状态服务 */
    getPrinterStatus: () => rootContainer.resolve(PRINTER_STATUS_TOKEN),
    /** 获取打印历史服务 */
    getPrintHistory: () => rootContainer.resolve(PRINT_HISTORY_TOKEN),
    /** 获取打印统计服务 */
    getPrintStatistics: () => rootContainer.resolve(PRINT_STATISTICS_TOKEN),
    /** 获取云打印管理器 */
    getCloudPrintManager: () => rootContainer.resolve(CLOUD_PRINT_MANAGER_TOKEN),
    /** 获取定时重试管理器 */
    getScheduledRetryManager: () => rootContainer.resolve(SCHEDULED_RETRY_MANAGER_TOKEN),
    /** 获取批量打印管理器 */
    getBatchPrintManager: () => rootContainer.resolve(BATCH_PRINT_MANAGER_TOKEN),
    /** 获取事件总线 */
    getEventBus: () => rootContainer.resolve(EVENT_BUS_TOKEN),
    /** 获取插件管理器 */
    getPluginManager: () => rootContainer.resolve(PLUGIN_MANAGER_TOKEN),
    /** 获取适配器 */
    getAdapter: () => rootContainer.resolve(ADAPTER_TOKEN),
  };
}

export type ServiceProvider = ReturnType<typeof createServiceProvider>;
