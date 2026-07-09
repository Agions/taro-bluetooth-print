/**
 * 离线缓存页 - 演示 OfflineCache
 *
 * 场景: 网络不稳定 / 蓝牙断连时,任务先存本地,恢复后自动重发
 *
 * 演示:
 * - 添加任务到离线队列
 * - 查看队列状态
 * - 手动触发 sync
 * - 模拟断网/重连
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import Taro from '@tarojs/taro';
import { View, Text, Button } from '@tarojs/components';
import { OfflineCache } from 'taro-bluetooth-print';

import './index.less';

type LogType = 'info' | 'success' | 'error';

const MAX_LOG = 20;
const MAX_ENTRIES = 50;
const TTL_MS = 24 * 3600 * 1000;
const SYNC_DELAY_MS = 500;
// ✅ 修复 P2: 失败率从 30% 降到 20% (70% → 80% 成功率,避免 sync 频繁失败)
const SYNC_FAIL_RATE = 0.2;

export default function OfflinePage() {
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    syncing: 0,
    failed: 0,
    size: 0
  });
  const [online, setOnline] = useState(true);
  const [log, setLog] = useState<string[]>([]);
  const cacheRef = useRef<OfflineCache | null>(null);
  // ✅ 修复 P1: 用 ref 持有 unmounted 标志,避免 setState on unmounted component
  const mountedRef = useRef(true);

  const addLog = useCallback((msg: string, _type: LogType = 'info') => {
    setLog((prev) => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, MAX_LOG));
  }, []);

  const refresh = useCallback(() => {
    const cache = cacheRef.current;
    if (!cache) return;
    const s = cache.getStats() as any;
    setStats({
      total: s.total ?? 0,
      pending: s.pending ?? 0,
      syncing: s.syncing ?? 0,
      failed: s.failed ?? 0,
      size: s.size ?? 0
    });
  }, []);

  useEffect(() => {
    const cache = new OfflineCache({ maxJobs: MAX_ENTRIES, expiryTime: TTL_MS });
    cacheRef.current = cache;

    const onSaved = (job: any) => {
      addLog(`任务入队: ${job.id.slice(0, 8)}...`);
      refresh();
    };
    const onSynced = (job: any) => {
      addLog(`✅ 任务已同步: ${job.id.slice(0, 8)}...`, 'success');
      refresh();
    };
    const onError = (err: Error) => {
      addLog(`❌ 错误: ${err?.message ?? err}`, 'error');
    };
    const onSyncStart = () => addLog('🔄 开始批量同步...');
    const onSyncDone = (r: { success: number; failed: number }) =>
      addLog(`✨ 同步完成 (成功 ${r.success} / 失败 ${r.failed})`, 'success');

    cache.on('job-saved', onSaved as any);
    cache.on('job-synced', onSynced as any);
    cache.on('error', onError as any);
    cache.on('sync-started', onSyncStart as any);
    cache.on('sync-completed', onSyncDone as any);

    // 设置 sync executor — 读最新 online 状态
    cache.setSyncExecutor(async () => {
      // ✅ 修复 P2: 组件 unmount 后停止 fake work
      if (!mountedRef.current) throw new Error('组件已卸载');
      if (!online) throw new Error('当前离线');
      await new Promise<void>((resolve) => {
        const t = setTimeout(resolve, SYNC_DELAY_MS);
        // (生产代码应该把 t 保存到 ref 在 cleanup clear;这里 mock 任务不致命)
        return () => clearTimeout(t);
      });
      if (!mountedRef.current) throw new Error('组件已卸载');
      if (Math.random() < SYNC_FAIL_RATE) throw new Error('模拟失败');
    });

    refresh();

    return () => {
      mountedRef.current = false;
      cache.off('job-saved', onSaved as any);
      cache.off('job-synced', onSynced as any);
      cache.off('error', onError as any);
      cache.off('sync-started', onSyncStart as any);
      cache.off('sync-completed', onSyncDone as any);
    };
  }, [addLog, refresh, online]); // ✅ online 进依赖,executor 闭包能拿到最新值

  const handleAddJob = () => {
    const cache = cacheRef.current;
    if (!cache) return;
    const id = `job-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const data = new TextEncoder().encode(`print-job-${id}`);
    cache.save({
      id,
      data,
      createdAt: Date.now(),
      expiresAt: Date.now() + TTL_MS,
      retryCount: 0
    });
  };

  const handleAddBatch = () => {
    for (let i = 0; i < 5; i++) handleAddJob();
  };

  const handleSync = async () => {
    const cache = cacheRef.current;
    if (!cache) return;
    if (!online) {
      Taro.showToast({ title: '当前离线,无法同步', icon: 'none' });
      return;
    }
    try {
      await cache.sync();
    } catch (err: any) {
      addLog(`同步异常: ${err?.message ?? err}`, 'error');
    }
  };

  const handleClear = () => {
    const cache = cacheRef.current;
    if (!cache) return;
    Taro.showModal({
      title: '确认清空',
      content: `清空 ${stats.total} 个缓存任务?`,
      success: (res) => {
        if (res.confirm) {
          cache.clear();
          addLog('🗑️ 缓存已清空');
          refresh();
        }
      }
    });
  };

  return (
    <View className="offline-page">
      {/* 网络状态 */}
      <View className="status-card">
        <View className="status-row">
          <Text>网络状态</Text>
          <View className={`status-dot ${online ? 'on' : 'off'}`}>
            <Text>{online ? '🟢 在线' : '🔴 离线'}</Text>
          </View>
          <Button size="mini" onClick={() => setOnline(!online)}>
            切换
          </Button>
        </View>
      </View>

      {/* 统计 */}
      <View className="stats-card">
        <Text className="stats-title">📊 队列统计</Text>
        <View className="stats-grid">
          <View className="stat">
            <Text className="stat-num">{stats.total}</Text>
            <Text className="stat-label">总任务</Text>
          </View>
          <View className="stat">
            <Text className="stat-num">{stats.pending}</Text>
            <Text className="stat-label">待同步</Text>
          </View>
          <View className="stat">
            <Text className="stat-num">{stats.failed}</Text>
            <Text className="stat-label">失败</Text>
          </View>
          <View className="stat">
            <Text className="stat-num">{(stats.size / 1024).toFixed(1)}</Text>
            <Text className="stat-label">KB</Text>
          </View>
        </View>
      </View>

      {/* 操作 */}
      <View className="actions">
        <Button onClick={handleAddJob} type="primary" size="mini">
          ➕ 添加 1 个
        </Button>
        <Button onClick={handleAddBatch} type="primary" size="mini">
          ➕➕ 批量 5 个
        </Button>
        <Button onClick={handleSync} size="mini" disabled={stats.pending === 0}>
          🔄 立即同步
        </Button>
        <Button onClick={handleClear} size="mini" disabled={stats.total === 0}>
          🗑️ 清空
        </Button>
      </View>

      {/* 日志 */}
      <View className="logs-card">
        <Text className="logs-title">📋 事件日志</Text>
        <View className="logs-content">
          {log.length === 0 ? (
            <Text className="empty">暂无日志,点击上方按钮试试</Text>
          ) : (
            log.map((l, i) => (
              <Text key={`${i}-${l.slice(0, 12)}`} className="log-line">
                {l}
              </Text>
            ))
          )}
        </View>
      </View>

      <View className="tip">
        <Text>📌 OfflineCache 解决断网/断连场景</Text>
        <Text>📌 任务先入队,网络恢复后批量同步</Text>
        <Text>📌 LRU 淘汰 + TTL 过期自动清理</Text>
        <Text>📌 setSyncExecutor 自定义同步逻辑</Text>
      </View>
    </View>
  );
}