/**
 * 字符串常量集中管理
 *
 * Phase 7+ 优化：提取重复字符串常量为命名常量
 * 减少代码中的硬编码字符串，提高可维护性和一致性
 */

// ==========================================================================
// 状态常量
// ==========================================================================

/** 作业状态 */
export const JOB_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
  PAUSED: 'paused',
} as const;

/** 连接状态 */
export const CONNECTION_STATUS = {
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected',
  CONNECTING: 'connecting',
  DISCONNECTING: 'disconnecting',
} as const;

/** 设备状态 */
export const DEVICE_STATUS = {
  IDLE: 'idle',
  BUSY: 'busy',
  ERROR: 'error',
} as const;

/** 生命周期模式 */
export const LIFECYCLE_MODE = {
  TRANSIENT: 'transient',
  SINGLETON: 'singleton',
  SCOPED: 'scoped',
} as const;

// ==========================================================================
// 事件名常量
// ==========================================================================

/** 打印机事件 */
export const PRINTER_EVENTS = {
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  STATUS_CHANGE: 'status-change',
  DATA: 'data',
  ERROR: 'error',
  READY: 'ready',
  COMPLETE: 'complete',
  FAIL: 'fail',
} as const;

/** 作业事件 */
export const JOB_EVENTS = {
  JOB_ADDED: 'job-added',
  JOB_REMOVED: 'job-removed',
  JOB_STARTED: 'job-started',
  JOB_COMPLETED: 'job-completed',
  JOB_FAILED: 'job-failed',
  JOB_CANCELLED: 'job-cancelled',
  BATCH_READY: 'batch-ready',
  AUTO_FLUSH: 'auto-flush',
  RETRY_EXECUTED: 'retry-executed',
} as const;

/** 连接事件 */
export const CONNECTION_EVENTS = {
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected',
  RECONNECTING: 'reconnecting',
  RECONNECTED: 'reconnected',
  DEVICE_FOUND: 'device-found',
  DEVICE_LOST: 'device-lost',
} as const;

/** 队列事件 */
export const QUEUE_EVENTS = {
  QUEUE_CHANGED: 'queue-changed',
  QUEUE_EMPTY: 'queue-empty',
  QUEUE_FULL: 'queue-full',
} as const;

// ==========================================================================
// 编码常量
// ==========================================================================

/** 支持的编码格式 */
export const SUPPORTED_ENCODINGS = {
  UTF8: 'UTF-8',
  GBK: 'GBK',
  GB2312: 'GB2312',
  BIG5: 'BIG5',
  EUC_KR: 'EUC-KR',
  SHIFT_JIS: 'SHIFT-JIS',
  ISO_2022_JP: 'ISO-2022-JP',
} as const;

// ==========================================================================
// 半调算法常量
// ==========================================================================

/** 支持的半调算法 */
export const HALFTONE_ALGORITHMS = {
  NONE: 'none',
  FloydSteinberg: 'floyd-steinberg',
  Atkinson: 'atkinson',
  Sierra: 'sierra',
  Stucki: 'stucki',
  Halftone: 'halftone',
  Nearest: 'nearest',
  Bilinear: 'bilinear',
  Diamond: 'diamond',
  Round: 'round',
  Ordered: 'ordered',
} as const;

// ==========================================================================
// 条码类型常量
// ==========================================================================

/** 支持的条码类型 */
export const BARCODE_TYPES = {
  EAN13: 'EAN13',
  EAN8: 'EAN8',
  CODE39: 'CODE39',
  CODE128: 'CODE128',
  UPCA: 'UPCA',
} as const;

// ==========================================================================
// 对齐方式常量
// ==========================================================================

/** 文本对齐方式 */
export const ALIGNMENT = {
  LEFT: 'left',
  CENTER: 'center',
  RIGHT: 'right',
} as const;

/** QR 码校正码位置 */
export const QR_CORRECTION_POSITIONS = {
  TOP_LEFT: 'topLeft',
  TOP_RIGHT: 'topRight',
  BOTTOM_LEFT: 'bottomLeft',
  BOTTOM_RIGHT: 'bottomRight',
  TOP: 'top',
  BOTTOM: 'bottom',
  LEFT: 'left',
  RIGHT: 'right',
  CROSS: 'cross',
} as const;

// ==========================================================================
// 测试数据常量
// ==========================================================================

/** 测试用文本 */
export const TEST_TEXT = {
  CHINESE: '你好世界',
  ENGLISH: 'Hello World',
  TEST_EAN13: '1234567890128',
} as const;

// ==========================================================================
// 其他常量
// ==========================================================================

/** 默认项目名称 */
export const PROJECT_NAME = 'taro-bluetooth-print';

/** 设备 ID 前缀 */
export const DEVICE_ID_PREFIX = 'device-id';

/** 插件名称占位符 */
export const PLUGIN_NAME_PLACEHOLDER = '${pluginName}';

/** 事件占位符 */
export const EVENT_PLACEHOLDER = '${String(event)}';
