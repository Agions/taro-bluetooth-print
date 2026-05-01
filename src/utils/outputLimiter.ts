/**
 * 输出限制工具 - 防止响应被截断
 * 用于处理大量数据输出时的截断问题
 */

/**
 * 截断配置选项
 */
export interface TruncateOptions {
  /** 最大长度限制 */
  maxLength?: number;
  /** 截断后添加的后缀 */
  suffix?: string;
  /** 是否保留开头部分 */
  preserveHead?: boolean;
  /** 保留开头的字符数（当 preserveHead 为 true 时有效） */
  headLength?: number;
  /** 保留结尾的字符数（当 preserveHead 为 true 时有效） */
  tailLength?: number;
}

/**
 * 默认截断配置
 */
const DEFAULT_OPTIONS: Required<TruncateOptions> = {
  maxLength: 10000,
  suffix: '... [truncated]',
  preserveHead: true,
  headLength: 5000,
  tailLength: 5000,
};

/**
 * 智能截断字符串，避免输出过长被截断
 *
 * @param str - 原始字符串
 * @param options - 截断选项
 * @returns 截断后的字符串
 *
 * @example
 * ```typescript
 * // 简单截断
 * const short = truncateString(longText, { maxLength: 1000 });
 *
 * // 保留首尾
 * const summary = truncateString(longText, {
 *   preserveHead: true,
 *   headLength: 500,
 *   tailLength: 500
 * });
 * ```
 */
export function truncateString(str: string, options: TruncateOptions = {}): string {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  if (str.length <= opts.maxLength) {
    return str;
  }

  if (opts.preserveHead) {
    const totalPreserve = opts.headLength + opts.tailLength + opts.suffix.length;
    if (totalPreserve < opts.maxLength) {
      const head = str.slice(0, opts.headLength);
      const tail = str.slice(-opts.tailLength);
      return `${head}${opts.suffix}${tail}`;
    }
  }

  return str.slice(0, opts.maxLength - opts.suffix.length) + opts.suffix;
}

/**
 * 截断对象/数组的字符串表示，用于日志输出
 *
 * @param data - 任意数据
 * @param maxLength - 最大长度
 * @returns 截断后的字符串
 */
export function truncateForLog(data: unknown, maxLength: number = 2000): string {
  if (data === null) return 'null';
  if (data === undefined) return 'undefined';

  let str: string;

  if (typeof data === 'string') {
    str = data;
  } else if (typeof data === 'number' || typeof data === 'boolean') {
    return String(data);
  } else if (data instanceof Error) {
    str = `${data.name}: ${data.message}`;
    if (data.stack) {
      str += `\n${truncateString(data.stack, { maxLength: 1000 })}`;
    }
    return str;
  } else if (data instanceof Uint8Array || data instanceof ArrayBuffer) {
    const bytes = data instanceof ArrayBuffer ? new Uint8Array(data) : data;
    str = `Uint8Array(${bytes.length}) [${truncateString(
      Array.from(bytes.slice(0, 100))
        .map(b => b.toString(16).padStart(2, '0'))
        .join(' '),
      { maxLength: 300 }
    )}]`;
    if (bytes.length > 100) {
      str += ` ... (${bytes.length} bytes total)`;
    }
    return str;
  } else {
    try {
      str = JSON.stringify(data);
    } catch {
      str = Object.prototype.toString.call(data);
    }
  }

  return truncateString(str, { maxLength });
}

/**
 * 分批处理大量数据，避免一次性输出过多
 *
 * @param items - 数据项数组
 * @param batchSize - 每批大小
 * @param processor - 处理函数
 * @returns 处理结果
 *
 * @example
 * ```typescript
 * const results = await batchProcess(
 *   largeArray,
 *   100,
 *   async (batch) => {
 *     console.log(`Processing batch of ${batch.length} items`);
 *     return batch.map(item => process(item));
 *   }
 * );
 * ```
 */
export async function batchProcess<T, R>(
  items: T[],
  batchSize: number,
  processor: (batch: T[], batchIndex: number) => Promise<R[]> | R[]
): Promise<R[]> {
  const results: R[] = [];
  const totalBatches = Math.ceil(items.length / batchSize);

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchIndex = Math.floor(i / batchSize) + 1;

    try {
      const batchResults = await processor(batch, batchIndex);
      results.push(...batchResults);
    } catch (error) {
      // Log the error and continue processing subsequent batches
      console.error(`[batchProcess] Error processing batch ${batchIndex}/${totalBatches}:`, error);
      // Re-throw so the caller can handle the failure
      throw error;
    }

    // 添加小延迟，避免阻塞
    if (batchIndex < totalBatches) {
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  }

  return results;
}

/**
 * 创建受限制的日志输出函数
 *
 * @param maxLength - 单条日志最大长度
 * @returns 受限的日志函数
 */
export function createLimitedLogger(maxLength: number = 5000) {
  return {
    log: (...args: unknown[]) => {
      const limited = args.map(arg => truncateForLog(arg, maxLength));
      // eslint-disable-next-line no-console
      console.log(...limited);
    },
    warn: (...args: unknown[]) => {
      const limited = args.map(arg => truncateForLog(arg, maxLength));
      // eslint-disable-next-line no-console
      console.warn(...limited);
    },
    error: (...args: unknown[]) => {
      const limited = args.map(arg => truncateForLog(arg, maxLength));
      // eslint-disable-next-line no-console
      console.error(...limited);
    },
  };
}

/**
 * 数据摘要生成器 - 用于生成数据的简短摘要
 *
 * @param data - 任意数据
 * @returns 数据摘要
 */
export function generateSummary(data: unknown): string {
  if (data === null) return 'null';
  if (data === undefined) return 'undefined';

  if (typeof data === 'string') {
    return `string(${data.length}): "${truncateString(data, { maxLength: 100 })}"`;
  }

  if (typeof data === 'number') return `number: ${data}`;
  if (typeof data === 'boolean') return `boolean: ${data}`;

  if (Array.isArray(data)) {
    return `array[${data.length}]`;
  }

  if (data instanceof Uint8Array) {
    return `Uint8Array(${data.length} bytes)`;
  }

  if (data instanceof ArrayBuffer) {
    return `ArrayBuffer(${data.byteLength} bytes)`;
  }

  if (data instanceof Error) {
    return `Error: ${data.name}: ${truncateString(data.message, { maxLength: 100 })}`;
  }

  if (typeof data === 'object') {
    const keys = Object.keys(data as Record<string, unknown>);
    return `object{${keys.length} keys: ${keys.slice(0, 5).join(', ')}${keys.length > 5 ? '...' : ''}}`;
  }

  return String(data as unknown);
}
