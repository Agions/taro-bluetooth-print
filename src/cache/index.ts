/**
 * Offline Cache Module
 * 离线缓存模块 - 负责任务持久化存储
 */

export { OfflineCache, offlineCache } from './OfflineCache';

export type {
  CachedJob,
  CacheConfig,
  CacheStats,
  OfflineCacheEvents,
  IOfflineCache,
  SyncExecutor,
} from './OfflineCache';
