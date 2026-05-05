/**
 * 统一错误处理工具函数
 *
 * Phase 7+ 优化：合并相似的 catch 空块为统一错误处理
 * 提供一致的错误处理模式，减少代码重复
 */

import { Logger } from '@/utils/logger';

const logger = Logger.scope('ErrorHandler');

// ==========================================================================
// 错误类型定义
// ==========================================================================

export type ErrorSeverity = 'log' | 'warn' | 'error' | 'silent';

export interface ErrorHandlerOptions {
  /** 错误严重程度 */
  severity?: ErrorSeverity;
  /** 是否重新抛出错误 */
  rethrow?: boolean;
  /** 默认错误消息 */
  defaultMessage?: string;
  /** 错误上下文信息 */
  context?: Record<string, unknown>;
}

// ==========================================================================
// 核心错误处理函数
// ==========================================================================

/**
 * 处理异步操作中的错误
 *
 * @param error - 捕获的错误
 * @param options - 错误处理选项
 * @returns 处理后的错误（如果 rethrow 为 true）
 */
export function handleError(error: unknown, options: ErrorHandlerOptions = {}): Error | undefined {
  const {
    severity = 'warn',
    rethrow = false,
    defaultMessage = 'An error occurred',
    context = {},
  } = options;

  // 标准化错误对象
  const standardizedError = normalizeError(error, defaultMessage);

  // 根据严重程度记录日志
  switch (severity) {
    case 'log':
      logger.debug('Handled error:', standardizedError, context);
      break;
    case 'warn':
      logger.warn('Handled error:', standardizedError, context);
      break;
    case 'error':
      logger.error('Handled error:', standardizedError, context);
      break;
    case 'silent':
      // 静默处理，不记录日志
      break;
  }

  // 如果需要重新抛出
  if (rethrow) {
    throw standardizedError;
  }

  return standardizedError;
}

/**
 * 创建错误处理包装器，用于 Promise.catch()
 *
 * @param options - 错误处理选项
 * @returns Promise 错误处理函数
 */
export function createErrorHandler(options: ErrorHandlerOptions = {}) {
  return (error: unknown): Promise<void> => {
    handleError(error, options);
    return Promise.resolve();
  };
}

/**
 * 静默处理错误（不记录日志）
 *
 * @param error - 捕获的错误
 * @returns 标准化的错误对象
 */
export function silentHandle(error: unknown): Error {
  return normalizeError(error, 'Silently handled error');
}

/**
 * 标准化错误对象
 *
 * @param error - 原始错误
 * @param defaultMessage - 默认错误消息
 * @returns 标准化的 Error 对象
 */
export function normalizeError(
  error: unknown,
  defaultMessage: string = 'An error occurred'
): Error {
  if (error instanceof Error) {
    return error;
  }

  if (typeof error === 'string') {
    return new Error(error);
  }

  if (error && typeof error === 'object' && 'message' in error) {
    return new Error(String((error as { message: unknown }).message));
  }

  return new Error(defaultMessage);
}

// ==========================================================================
// 特定场景的错误处理
// ==========================================================================

/**
 * 处理连接相关的错误
 */
export function handleConnectionError(error: unknown, deviceId?: string): Error {
  const context = deviceId ? { deviceId } : {};
  return handleError(error, {
    severity: 'error',
    defaultMessage: `Connection error${deviceId ? ` for device ${deviceId}` : ''}`,
    context,
  })!;
}

/**
 * 处理打印相关的错误
 */
export function handlePrintError(error: unknown, jobId?: string): Error {
  const context = jobId ? { jobId } : {};
  return handleError(error, {
    severity: 'error',
    defaultMessage: `Print error${jobId ? ` for job ${jobId}` : ''}`,
    context,
  })!;
}

/**
 * 处理队列相关的错误
 */
export function handleQueueError(error: unknown, queueName?: string): Error {
  const context = queueName ? { queueName } : {};
  return handleError(error, {
    severity: 'warn',
    defaultMessage: `Queue error${queueName ? ` in ${queueName}` : ''}`,
    context,
  })!;
}

/**
 * 处理缓存相关的错误
 */
export function handleCacheError(error: unknown, cacheName?: string): Error {
  const context = cacheName ? { cacheName } : {};
  return handleError(error, {
    severity: 'warn',
    defaultMessage: `Cache error${cacheName ? ` in ${cacheName}` : ''}`,
    context,
  })!;
}

// ==========================================================================
// 空 catch 块替换工具
// ==========================================================================

/**
 * 用于替换空 catch 块的辅助函数
 * 用法：.catch(silentHandle)
 */
export const silentCatch = silentHandle;

/**
 * 用于替换带注释的 catch 块的辅助函数
 * 用法：.catch(createErrorHandler({ severity: 'log' }))
 */
export const logCatch = createErrorHandler({ severity: 'log' });

/**
 * 用于替换带注释的 catch 块的辅助函数
 * 用法：.catch(createErrorHandler({ severity: 'warn' }))
 */
export const warnCatch = createErrorHandler({ severity: 'warn' });
