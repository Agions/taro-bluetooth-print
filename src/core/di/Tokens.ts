/**
 * 服务标识符（Tokens）
 * 用于依赖注入的常量定义
 */

// 适配器相关
export const ADAPTER_TOKEN = Symbol.for('Adapter');
export const ADAPTER_FACTORY_TOKEN = Symbol.for('AdapterFactory');

// 驱动相关
export const DRIVER_TOKEN = Symbol.for('Driver');
export const DRIVER_FACTORY_TOKEN = Symbol.for('DriverFactory');

// 服务相关
export const DEVICE_MANAGER_TOKEN = Symbol.for('DeviceManager');
export const CONNECTION_MANAGER_TOKEN = Symbol.for('ConnectionManager');
export const PRINT_JOB_MANAGER_TOKEN = Symbol.for('PrintJobManager');
export const PRINT_QUEUE_TOKEN = Symbol.for('PrintQueue');
export const OFFLINE_CACHE_TOKEN = Symbol.for('OfflineCache');
export const CONFIG_MANAGER_TOKEN = Symbol.for('ConfigManager');

// 新增服务令牌
export const COMMAND_BUILDER_TOKEN = Symbol.for('CommandBuilder');
export const PRINTER_STATUS_TOKEN = Symbol.for('PrinterStatus');
export const PRINT_HISTORY_TOKEN = Symbol.for('PrintHistory');
export const PRINT_STATISTICS_TOKEN = Symbol.for('PrintStatistics');
export const CLOUD_PRINT_MANAGER_TOKEN = Symbol.for('CloudPrintManager');
export const SCHEDULED_RETRY_MANAGER_TOKEN = Symbol.for('ScheduledRetryManager');
export const BATCH_PRINT_MANAGER_TOKEN = Symbol.for('BatchPrintManager');

// 工具服务
export const LOGGER_TOKEN = Symbol.for('Logger');
export const ENCODING_SERVICE_TOKEN = Symbol.for('EncodingService');
export const IMAGE_PROCESSING_TOKEN = Symbol.for('ImageProcessing');
export const BARCODE_GENERATOR_TOKEN = Symbol.for('BarcodeGenerator');
export const TEMPLATE_ENGINE_TOKEN = Symbol.for('TemplateEngine');

// 事件系统
export const EVENT_BUS_TOKEN = Symbol.for('EventBus');

// 插件系统
export const PLUGIN_MANAGER_TOKEN = Symbol.for('PluginManager');

// 性能监控
export const PERFORMANCE_MONITOR_TOKEN = Symbol.for('PerformanceMonitor');
