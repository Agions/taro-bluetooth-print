/**
 * Offline Cache Module
 * 离线缓存模块 - 负责任务持久化存储
 */

export { OfflineCache, offlineCache } from './OfflineCache';
export { WALJournal } from './WALJournal';

export type {
  CachedJob,
  CacheConfig,
  CacheStats,
  OfflineCacheEvents,
  IOfflineCache,
  SyncExecutor,
} from './OfflineCache';

export type {
  WALEntry,
  WALConfig,
  WALStats,
  WALJobStatus,
  WALEvents,
} from './WALJournal';

