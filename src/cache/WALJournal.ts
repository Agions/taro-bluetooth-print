/**
 * Write-Ahead Log (WAL) Journal Engine
 * 预写日志容灾与幂等恢复引擎
 *
 * 核心机制：
 * 1. 内存优先调度 + 本地统一存储原子追加 (WAL 镜像)。
 * 2. 状态生命周期追踪：QUEUED -> IN_PROGRESS -> COMPLETED / FAILED。
 * 3. 基于 CRC32 校验码的窗口期幂等去重（防重打）。
 * 4. 崩溃闪退重启后的自动自愈恢复与未决任务重播 (Crash Recovery)。
 */

import { EventEmitter } from '@/core/EventEmitter';
import { Logger } from '@/utils/logger';
import { crc32 } from '@/utils/checksum';
import { createUniversalStorage, type IStorageAdapter } from '@/storage';

/**
 * 任务在日志中的状态
 */
export type WALJobStatus = 'QUEUED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';

/**
 * 预写日志单条记录
 */
export interface WALEntry {
  /** 单调递增序号 */
  seq: number;
  /** 任务唯一标识符 */
  jobId: string;
  /** 打印指令二进制 CRC32 校验哈希 */
  checksum: string;
  /** 任务当前生命周期状态 */
  status: WALJobStatus;
  /** Base64 序列化存储的指令数据 */
  dataBase64: string;
  /** 字节大小 */
  byteLength: number;
  /** 优先级 */
  priority: number;
  /** 创建时间戳 */
  createdAt: number;
  /** 最后更新时间戳 */
  updatedAt: number;
  /** 已重试次数 */
  retryCount: number;
  /** 错误摘要（若有） */
  lastError?: string;
  /** 自定义业务元数据 */
  metadata?: Record<string, unknown>;
}

/**
 * WAL 配置项
 */
export interface WALConfig {
  /** 存储键名前缀 (默认: 'taro_bt_wal_') */
  storagePrefix?: string;
  /** 最大保留日志条目上限 (默认: 200) */
  maxEntries?: number;
  /** 幂等去重检测时间窗口 (ms，默认 10 分钟) */
  dedupWindowMs?: number;
  /** 已完成/失败日志保留时长 (ms，默认 2 小时) */
  retentionMs?: number;
  /** 是否自动在启动时进行日志整理压缩 (默认: true) */
  autoCompact?: boolean;
}

/**
 * WAL 状态统计
 */
export interface WALStats {
  total: number;
  queued: number;
  inProgress: number;
  completed: number;
  failed: number;
}

export interface WALEvents {
  'entry-logged': WALEntry;
  'entry-updated': WALEntry;
  'recovered': WALEntry[];
  'compacted': number;
}

// ─── Base64 编解码辅助 ────────────────────────────────────────────────────────
const B64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function bytesToBase64(bytes: Uint8Array): string {
  const len = bytes.length;
  let result = '';
  for (let i = 0; i < len; i += 3) {
    const b1 = bytes[i] ?? 0;
    const b2 = i + 1 < len ? (bytes[i + 1] ?? 0) : 0;
    const b3 = i + 2 < len ? (bytes[i + 2] ?? 0) : 0;
    result += B64_CHARS[b1 >> 2];
    result += B64_CHARS[((b1 & 3) << 4) | (b2 >> 4)];
    result += i + 1 < len ? B64_CHARS[((b2 & 15) << 2) | (b3 >> 6)] : '=';
    result += i + 2 < len ? B64_CHARS[b3 & 63] : '=';
  }
  return result;
}

function base64ToBytes(b64: string): Uint8Array {
  const padLen = b64.endsWith('==') ? 2 : b64.endsWith('=') ? 1 : 0;
  const outLen = ((b64.length + 3) >> 2) * 3 - padLen;
  const result = new Uint8Array(outLen);
  let idx = 0;
  for (let i = 0; i < b64.length; i += 4) {
    const c1 = B64_CHARS.indexOf(b64[i]!);
    const c2 = i + 1 < b64.length ? B64_CHARS.indexOf(b64[i + 1]!) : 0;
    const c3 = i + 2 < b64.length ? B64_CHARS.indexOf(b64[i + 2]!) : 0;
    const c4 = i + 3 < b64.length ? B64_CHARS.indexOf(b64[i + 3]!) : 0;

    const b1 = (c1 << 2) | (c2 >> 4);
    const b2 = ((c2 & 15) << 4) | (c3 >> 2);
    const b3 = ((c3 & 3) << 6) | c4;

    if (idx < outLen) result[idx++] = b1;
    if (idx < outLen && b64[i + 2] !== '=') result[idx++] = b2;
    if (idx < outLen && b64[i + 3] !== '=') result[idx++] = b3;
  }
  return result;
}

/**
 * 预写日志管理器
 */
export class WALJournal extends EventEmitter<WALEvents> {
  private readonly logger = Logger.scope('WALJournal');
  private readonly storage: IStorageAdapter;
  private readonly config: Required<WALConfig>;
  private readonly storageKey: string;

  private entries: Map<string, WALEntry> = new Map();
  private seqCounter = 0;

  constructor(storage?: IStorageAdapter, config?: WALConfig) {
    super();
    this.config = {
      storagePrefix: config?.storagePrefix ?? 'taro_bt_wal_',
      maxEntries: config?.maxEntries ?? 200,
      dedupWindowMs: config?.dedupWindowMs ?? 10 * 60 * 1000, // 10分钟
      retentionMs: config?.retentionMs ?? 2 * 60 * 60 * 1000,  // 2小时
      autoCompact: config?.autoCompact ?? true,
    };
    this.storage = storage ?? createUniversalStorage(this.config.storagePrefix);
    this.storageKey = 'journal_records';

    this.loadFromStorage();
    if (this.config.autoCompact) {
      this.compact();
    }
  }

  /**
   * 从底层持久化介质加载已有日志
   */
  private loadFromStorage(): void {
    try {
      const raw = this.storage.getItem(this.storageKey);
      if (!raw) return;
      const parsed: WALEntry[] = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          this.entries.set(item.jobId, item);
          if (item.seq > this.seqCounter) {
            this.seqCounter = item.seq;
          }
        }
        this.logger.info(`Loaded ${this.entries.size} WAL entries from storage`);
      }
    } catch (err) {
      this.logger.error('Failed to load WAL entries from storage', err);
    }
  }

  /**
   * 刷新同步到物理存储
   */
  private flush(): void {
    try {
      const records = Array.from(this.entries.values());
      this.storage.setItem(this.storageKey, JSON.stringify(records));
    } catch (err) {
      this.logger.error('Failed to flush WAL to storage', err);
    }
  }

  /**
   * 记录新增待执行任务（QUEUED）
   */
  recordQueued(job: {
    id: string;
    data: Uint8Array;
    priority?: number;
    metadata?: Record<string, unknown>;
  }): WALEntry {
    const now = Date.now();
    const entry: WALEntry = {
      seq: ++this.seqCounter,
      jobId: job.id,
      checksum: crc32(job.data),
      status: 'QUEUED',
      dataBase64: bytesToBase64(job.data),
      byteLength: job.data.length,
      priority: job.priority ?? 1,
      createdAt: now,
      updatedAt: now,
      retryCount: 0,
      metadata: job.metadata,
    };

    this.entries.set(job.id, entry);
    this.flush();
    this.emit('entry-logged', entry);
    this.logger.debug(`WAL [QUEUED] seq=${entry.seq} job=${job.id} crc32=${entry.checksum}`);
    return entry;
  }

  /**
   * 记录任务开始传输（IN_PROGRESS）
   */
  recordStarted(jobId: string): boolean {
    const entry = this.entries.get(jobId);
    if (!entry) return false;

    entry.status = 'IN_PROGRESS';
    entry.updatedAt = Date.now();
    this.flush();
    this.emit('entry-updated', entry);
    this.logger.debug(`WAL [IN_PROGRESS] job=${jobId}`);
    return true;
  }

  /**
   * 记录任务成功完成（COMPLETED）
   */
  recordCompleted(jobId: string): boolean {
    const entry = this.entries.get(jobId);
    if (!entry) return false;

    entry.status = 'COMPLETED';
    entry.updatedAt = Date.now();
    this.flush();
    this.emit('entry-updated', entry);
    this.logger.info(`WAL [COMPLETED] job=${jobId}`);
    return true;
  }

  /**
   * 记录任务执行失败（FAILED）
   */
  recordFailed(jobId: string, error?: string): boolean {
    const entry = this.entries.get(jobId);
    if (!entry) return false;

    entry.status = 'FAILED';
    entry.retryCount += 1;
    entry.lastError = error;
    entry.updatedAt = Date.now();
    this.flush();
    this.emit('entry-updated', entry);
    this.logger.warn(`WAL [FAILED] job=${jobId} error=${error}`);
    return true;
  }

  /**
   * 幂等检测：在去重时间窗口内，是否已成功打印过完全相同的数据
   */
  isDuplicate(data: Uint8Array, windowMs = this.config.dedupWindowMs): boolean {
    const hash = crc32(data);
    const threshold = Date.now() - windowMs;

    for (const entry of this.entries.values()) {
      if (
        entry.checksum === hash &&
        (entry.status === 'COMPLETED' || entry.status === 'IN_PROGRESS') &&
        entry.updatedAt >= threshold
      ) {
        this.logger.warn(`Duplicate print job detected: crc32=${hash} originalJob=${entry.jobId}`);
        return true;
      }
    }
    return false;
  }

  /**
   * 故障恢复自愈查询：获取所有在崩溃或闪退前处于未决状态（QUEUED 或 IN_PROGRESS）的任务
   */
  getUnfinishedJobs(): Array<{
    id: string;
    data: Uint8Array;
    priority: number;
    retryCount: number;
    metadata?: Record<string, unknown>;
  }> {
    const unfinished: Array<{
      id: string;
      data: Uint8Array;
      priority: number;
      retryCount: number;
      metadata?: Record<string, unknown>;
    }> = [];

    const sorted = Array.from(this.entries.values())
      .filter(e => e.status === 'QUEUED' || e.status === 'IN_PROGRESS')
      .sort((a, b) => b.priority - a.priority || a.seq - b.seq);

    for (const item of sorted) {
      try {
        const data = base64ToBytes(item.dataBase64);
        unfinished.push({
          id: item.jobId,
          data,
          priority: item.priority,
          retryCount: item.retryCount,
          metadata: item.metadata,
        });
      } catch (err) {
        this.logger.error(`Failed to deserialize WAL entry data for job=${item.jobId}`, err);
      }
    }

    if (unfinished.length > 0) {
      this.logger.info(`WAL Recovery: Identified ${unfinished.length} unfinished jobs to replay`);
      this.emit('recovered', Array.from(this.entries.values()).filter(e => e.status === 'QUEUED' || e.status === 'IN_PROGRESS'));
    }
    return unfinished;
  }

  /**
   * 压缩清理已过期的完成或失败日志
   */
  compact(retentionMs = this.config.retentionMs): number {
    const threshold = Date.now() - retentionMs;
    let removedCount = 0;

    for (const [id, entry] of this.entries.entries()) {
      if (
        (entry.status === 'COMPLETED' || entry.status === 'FAILED') &&
        entry.updatedAt < threshold
      ) {
        this.entries.delete(id);
        removedCount++;
      }
    }

    // 若依然超过最大限制，按 LRU 剔除最旧的已完成/已失败项
    if (this.entries.size > this.config.maxEntries) {
      const excess = this.entries.size - this.config.maxEntries;
      const finished = Array.from(this.entries.values())
        .filter(e => e.status === 'COMPLETED' || e.status === 'FAILED')
        .sort((a, b) => a.updatedAt - b.updatedAt)
        .slice(0, excess);

      for (const item of finished) {
        this.entries.delete(item.jobId);
        removedCount++;
      }
    }

    if (removedCount > 0) {
      this.flush();
      this.emit('compacted', removedCount);
      this.logger.debug(`WAL compacted: purged ${removedCount} stale entries`);
    }
    return removedCount;
  }

  /**
   * 清空所有预写日志
   */
  clear(): void {
    this.entries.clear();
    this.seqCounter = 0;
    this.storage.removeItem(this.storageKey);
    this.logger.info('WAL Journal completely cleared');
  }

  /**
   * 获取当前日志状态概览
   */
  getStats(): WALStats {
    let queued = 0;
    let inProgress = 0;
    let completed = 0;
    let failed = 0;

    for (const entry of this.entries.values()) {
      switch (entry.status) {
        case 'QUEUED':
          queued++;
          break;
        case 'IN_PROGRESS':
          inProgress++;
          break;
        case 'COMPLETED':
          completed++;
          break;
        case 'FAILED':
          failed++;
          break;
      }
    }

    return {
      total: this.entries.size,
      queued,
      inProgress,
      completed,
      failed,
    };
  }
}
