/**
 * 打印机管理页 - 完整示例
 *
 * 功能:
 * - 扫描附近 BLE 打印机
 * - 选择并连接设备
 * - 实时显示连接状态 + 打印进度
 * - 内置日志 (最近 50 条)
 * - 触发测试打印
 *
 * 设计要点:
 * - 使用 React 18 hooks 重写原 printer-page.tsx (原来用 class + taro-ui)
 * - 不依赖 taro-ui,纯 Taro 内置组件,降低体积
 * - 通过 getApp() 拿全局 printer/deviceManager/printQueue 单例
 */
import { useEffect, useRef, useState } from 'react';
import Taro from '@tarojs/taro';
import { View, Text, Button, ScrollView } from '@tarojs/components';
import type { BluetoothDevice, BluetoothPrinter, DeviceManager, PrintQueue } from 'taro-bluetooth-print';

import './index.less';

interface PageState {
  scanning: boolean;
  devices: BluetoothDevice[];
  selectedDevice: BluetoothDevice | null;
  connected: boolean;
  connecting: boolean;
  printerState: string;
  printing: boolean;
  progress: number;
  queueLength: number;
  logs: string[];
}

const INITIAL_STATE: PageState = {
  scanning: false,
  devices: [],
  selectedDevice: null,
  connected: false,
  connecting: false,
  printerState: 'disconnected',
  printing: false,
  progress: 0,
  queueLength: 0,
  logs: []
};

export default function PrinterPage() {
  const [state, setState] = useState<PageState>(INITIAL_STATE);

  // 用 ref 保存单例引用 + 日志缓冲
  const printerRef = useRef<BluetoothPrinter | null>(null);
  const dmRef = useRef<DeviceManager | null>(null);
  const queueRef = useRef<PrintQueue | null>(null);
  const logsRef = useRef<string[]>([]);

  // --- 工具函数 ---
  const addLog = (msg: string) => {
    const time = new Date().toLocaleTimeString();
    const log = `[${time}] ${msg}`;
    logsRef.current = [log, ...logsRef.current].slice(0, 50);
    setState((s) => ({ ...s, logs: logsRef.current }));
  };

  // --- 初始化 ---
  useEffect(() => {
    const app = Taro.getApp();
    const gd = (app as any)?.globalData ?? {};
    printerRef.current = gd.printer;
    dmRef.current = gd.deviceManager;
    queueRef.current = gd.printQueue;

    if (!printerRef.current) {
      Taro.showToast({ title: '打印机未初始化', icon: 'none' });
      return;
    }

    // 监听打印机事件
    const printer = printerRef.current;
    const onProgress = (p: { sent: number; total: number }) => {
      const percent = ((p.sent / p.total) * 100).toFixed(1);
      setState((s) => ({ ...s, progress: parseFloat(percent) }));
      addLog(`打印进度: ${percent}%`);
    };
    const onError = (err: any) => {
      addLog(`错误: ${err.code} - ${err.message}`);
      Taro.showToast({ title: err.message ?? '错误', icon: 'none' });
    };
    const onComplete = () => {
      setState((s) => ({ ...s, printing: false, progress: 0 }));
      addLog('打印完成');
      Taro.showToast({ title: '打印完成', icon: 'success' });
    };
    const onState = (newState: string) => {
      setState((s) => ({ ...s, printerState: newState }));
      addLog(`状态: ${newState}`);
    };

    printer.on('progress', onProgress as any);
    printer.on('error', onError as any);
    printer.on('print-complete', onComplete as any);
    printer.on('state-change', onState as any);

    // 监听设备管理器
    const dm = dmRef.current!;
    const onDevFound = (device: BluetoothDevice) => {
      setState((s) => {
        if (s.devices.find((d) => d.deviceId === device.deviceId)) return s;
        return { ...s, devices: [...s.devices, device] };
      });
    };
    const onScanStart = () => {
      setState((s) => ({ ...s, scanning: true, devices: [] }));
      addLog('开始扫描设备...');
    };
    const onScanStop = () => {
      setState((s) => ({ ...s, scanning: false }));
      addLog('扫描结束');
    };
    dm.on('device-found', onDevFound as any);
    dm.on('scan-started', onScanStart as any);
    dm.on('scan-stopped', onScanStop as any);

    // 监听队列
    const queue = queueRef.current!;
    const onJobAdded = () => {
      setState((s) => ({ ...s, queueLength: queue.getPendingCount() }));
    };
    const onJobDone = () => {
      setState((s) => ({ ...s, queueLength: queue.getPendingCount() }));
    };
    queue.on('job-added', onJobAdded as any);
    queue.on('job-completed', onJobDone as any);
    queue.on('job-failed', onJobDone as any);

    return () => {
      printer.off('progress', onProgress as any);
      printer.off('error', onError as any);
      printer.off('print-complete', onComplete as any);
      printer.off('state-change', onState as any);
      dm.off('device-found', onDevFound as any);
      dm.off('scan-started', onScanStart as any);
      dm.off('scan-stopped', onScanStop as any);
      queue.off('job-added', onJobAdded as any);
      queue.off('job-completed', onJobDone as any);
      queue.off('job-failed', onJobDone as any);
    };
  }, []);

  // --- 操作 handler ---
  const handleScan = async () => {
    try {
      // 检查蓝牙状态
      const res = await Taro.getBluetoothAdapterState();
      const adapter = (res as any)[0] ?? res;
      if (!adapter?.available) {
        Taro.showToast({ title: '请开启蓝牙', icon: 'none' });
        return;
      }
      await dmRef.current!.startScan({ timeout: 10000 });
    } catch (err: any) {
      addLog(`扫描失败: ${err?.message ?? err}`);
    }
  };

  const handleSelect = async (device: BluetoothDevice) => {
    setState((s) => ({ ...s, selectedDevice: device, connecting: true }));
    addLog(`正在连接: ${device.name}...`);
    try {
      await printerRef.current!.connect(device.deviceId);
      setState((s) => ({ ...s, connected: true }));
      addLog(`已连接: ${device.name}`);
      Taro.showToast({ title: '连接成功', icon: 'success' });
    } catch (err: any) {
      addLog(`连接失败: ${err?.message ?? err}`);
      Taro.showToast({ title: '连接失败', icon: 'none' });
    } finally {
      setState((s) => ({ ...s, connecting: false }));
    }
  };

  const handleDisconnect = async () => {
    try {
      await printerRef.current!.disconnect();
      setState((s) => ({ ...s, connected: false, selectedDevice: null }));
      addLog('已断开连接');
    } catch (err: any) {
      addLog(`断开失败: ${err?.message ?? err}`);
    }
  };

  const handlePrintTest = async () => {
    if (!state.connected) {
      Taro.showToast({ title: '请先连接打印机', icon: 'none' });
      return;
    }
    setState((s) => ({ ...s, printing: true }));
    addLog('开始打印测试页...');
    try {
      await printerRef.current!
        .text('=== 测试打印 ===', { encoding: 'GBK' })
        .feed()
        .text('时间: ' + new Date().toLocaleString(), { encoding: 'GBK' })
        .feed(2)
        .qrcode('https://example.com', { size: 6 })
        .feed(2)
        .cut()
        .print();
    } catch (err: any) {
      addLog(`打印失败: ${err?.message ?? err}`);
      setState((s) => ({ ...s, printing: false }));
    }
  };

  const handleGoReceipt = () => Taro.navigateTo({ url: '/pages/receipt/index' });
  const handleGoLabel = () => Taro.navigateTo({ url: '/pages/label/index' });

  return (
    <View className="printer-page">
      {/* 头部状态 */}
      <View className="header">
        <Text className="title">蓝牙打印</Text>
        <View className="status">
          <Text>状态: {state.printerState}</Text>
          {state.connected && <Text> | 队列: {state.queueLength}</Text>}
        </View>
      </View>

      {/* 扫描区 */}
      {!state.connected && (
        <View className="scan-section">
          <Button onClick={handleScan} disabled={state.scanning} type="primary">
            {state.scanning ? '扫描中...' : '扫描打印机'}
          </Button>

          {state.scanning && (
            <View className="loading">
              <Text>📡 扫描中...</Text>
            </View>
          )}

          <ScrollView className="device-list" scrollY>
            {state.devices.length === 0 && !state.scanning && (
              <View className="empty">
                <Text>暂无设备,请点击上方按钮扫描</Text>
              </View>
            )}
            {state.devices.map((device) => (
              <View
                key={device.deviceId}
                className="device-item"
                onClick={() => handleSelect(device)}
              >
                <Text className="device-name">{device.name || '未知设备'}</Text>
                <Text className="device-id">{device.deviceId}</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {/* 已连接区 */}
      {state.connected && (
        <View className="connected-section">
          <View className="device-info">
            <Text>已连接: {state.selectedDevice?.name}</Text>
            <Button size="mini" onClick={handleDisconnect}>断开</Button>
          </View>

          <View className="print-buttons">
            <Button onClick={handlePrintTest} disabled={state.printing}>
              打印测试页
            </Button>
            <Button onClick={handleGoReceipt} type="primary" disabled={state.printing}>
              打印收据 →
            </Button>
            <Button onClick={handleGoLabel} type="primary" disabled={state.printing}>
              打印标签 →
            </Button>
          </View>

          {state.printing && (
            <View className="progress">
              <Text>打印进度: {state.progress}%</Text>
              <View className="progress-bar">
                <View
                  className="progress-fill"
                  style={{ width: `${state.progress}%` }}
                />
              </View>
            </View>
          )}
        </View>
      )}

      {/* 日志 */}
      <View className="logs">
        <Text className="logs-title">📋 日志</Text>
        <ScrollView className="logs-content" scrollY>
          {state.logs.length === 0 ? (
            <Text className="logs-empty">暂无日志</Text>
          ) : (
            state.logs.map((log, i) => (
              <Text key={i} className="log-item">
                {log}
              </Text>
            ))
          )}
        </ScrollView>
      </View>
    </View>
  );
}
