/**
 * React Native 蓝牙打印示例
 * 
 * 使用方法：
 * 1. 安装: npm install taro-bluetooth-print
 * 2. 复制此组件到你的 React Native 项目
 * 3. 确保 iOS/Android 原生模块已配置
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Button,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { createBluetoothPrinter, DeviceManager, TsplDriver } from 'taro-bluetooth-print';
// ⚠️ 注意: v2.15.x 未导出 ReactNativeAdapter,需用平台原生 BLE 模块
// (iOS: react-native-ble-plx / Android: react-native-ble-manager) 实现 IPrinterAdapter
// 本文件演示业务流,具体 adapter 接入需自行封装
//
// 真实集成步骤:
//   1. npm install react-native-ble-plx
//   2. 实现 ReactNativeAdapter implements IPrinterAdapter
//   3. const printer = createBluetoothPrinter({ adapter: new ReactNativeAdapter() });

// 设备类型
interface BluetoothDevice {
  deviceId: string;
  name?: string;
  RSSI?: number;
}

const PrinterScreen: React.FC = () => {
  // 状态
  const [scanning, setScanning] = useState(false);
  const [devices, setDevices] = useState<BluetoothDevice[]>([]);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<BluetoothDevice | null>(null);
  const [printing, setPrinting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  
  // 打印机实例 (实际接入需先实现 RN adapter,见顶部 import 注释)
  // 下面这行 placeholder 仅用于展示代码结构;真实场景必须传入 RN adapter:
  //   const [printer] = useState(() => createBluetoothPrinter({ adapter: new ReactNativeAdapter() }));
  const [printer] = useState(() => createBluetoothPrinter({} as any));
  const [deviceManager] = useState(() => new DeviceManager());

  // 初始化
  useEffect(() => {
    initPrinter();
    return () => {
      printer.disconnect();
    };
  }, []);

  /**
   * 初始化打印机事件
   */
  const initPrinter = () => {
    printer.on('progress', ({ sent, total }) => {
      const percent = ((sent / total) * 100).toFixed(1);
      setProgress(parseFloat(percent));
      addLog(`进度: ${percent}%`);
    });

    printer.on('error', (error) => {
      addLog(`错误: ${error.code} - ${error.message}`, 'error');
      Alert.alert('打印错误', error.message);
    });

    printer.on('print-complete', () => {
      setPrinting(false);
      setProgress(0);
      addLog('打印完成', 'success');
      Alert.alert('提示', '打印完成');
    });

    deviceManager.on('device-found', (device: BluetoothDevice) => {
      setDevices(prev => {
        if (prev.find(d => d.deviceId === device.deviceId)) return prev;
        return [...prev, device];
      });
      addLog(`发现设备: ${device.name || '未知'}`);
    });

    deviceManager.on('scan-started', () => {
      setScanning(true);
      setDevices([]);
      addLog('开始扫描...');
    });

    deviceManager.on('scan-stopped', () => {
      setScanning(false);
      addLog('扫描结束');
    });
  };

  /**
   * 添加日志
   */
  const addLog = (message: string, type: 'info' | 'error' | 'success' = 'info') => {
    const time = new Date().toLocaleTimeString();
    const log = `[${time}] ${message}`;
    setLogs(prev => [log, ...prev.slice(0, 49)]);
  };

  /**
   * 扫描设备
   */
  const handleScan = async () => {
    try {
      await deviceManager.startScan({ timeout: 10000 });
    } catch (error: any) {
      addLog(`扫描失败: ${error.message}`, 'error');
    }
  };

  /**
   * 选择设备
   */
  const handleSelectDevice = async (device: BluetoothDevice) => {
    setSelectedDevice(device);
    setConnecting(true);
    addLog(`正在连接: ${device.name || '未知设备'}...`);

    try {
      await printer.connect(device.deviceId);
      setConnected(true);
      addLog('连接成功', 'success');
    } catch (error: any) {
      addLog(`连接失败: ${error.message}`, 'error');
      Alert.alert('连接失败', error.message);
    } finally {
      setConnecting(false);
    }
  };

  /**
   * 断开连接
   */
  const handleDisconnect = async () => {
    try {
      await printer.disconnect();
      setConnected(false);
      setSelectedDevice(null);
      addLog('已断开');
    } catch (error: any) {
      addLog(`断开失败: ${error.message}`, 'error');
    }
  };

  /**
   * 打印测试页
   */
  const handlePrintTest = async () => {
    if (!connected) {
      Alert.alert('提示', '请先连接打印机');
      return;
    }

    setPrinting(true);
    addLog('开始打印...');

    try {
      await printer
        .text('=== React Native 测试 ===', 'GBK')
        .feed()
        .text(`时间: ${new Date().toLocaleString()}`, 'GBK')
        .feed(2)
        .qr('https://reactnative.dev', { size: 6 })
        .feed(2)
        .cut()
        .print();
    } catch (error: any) {
      addLog(`打印失败: ${error.message}`, 'error');
      setPrinting(false);
    }
  };

  /**
   * 打印收据
   */
  const handlePrintReceipt = async () => {
    if (!connected) {
      Alert.alert('提示', '请先连接打印机');
      return;
    }

    const items = [
      { name: '咖啡', price: 25, qty: 2 },
      { name: '蛋糕', price: 18, qty: 1 },
    ];
    const total = 68;

    setPrinting(true);

    try {
      await printer
        .align('center')
        .setSize(2, 2)
        .text('咖啡店', 'GBK')
        .resetStyle()
        .feed()
        .text('------------------------', 'GBK')
        .feed();

      items.forEach(item => {
        const line = `${item.name} x${item.qty}`.padEnd(15) + `¥${item.price * item.qty}`;
        printer.text(line, 'GBK');
      });

      await printer
        .feed()
        .text('------------------------', 'GBK')
        .feed()
        .setBold(true)
        .text(`合计: ¥${total}`, 'GBK')
        .resetStyle()
        .feed(3)
        .cut()
        .print();
    } catch (error: any) {
      addLog(`打印失败: ${error.message}`, 'error');
      setPrinting(false);
    }
  };

  /**
   * 打印标签 (TSPL)
   *
   * ⚠️ v2.15.x TSPL 集成说明:
   * TsplDriver 不实现 IPrinterDriver (没有 init() 方法),
   * 不能直接喂给 CommandBuilder。
   * 正确流程: TsplDriver 链式构造 → getBuffer() → 通过 adapter.write() 发送
   * 此示例展示到 getBuffer() 这一步
   */
  const handlePrintLabel = async () => {
    if (!connected) {
      Alert.alert('提示', '请先连接打印机');
      return;
    }

    try {
      // 1. 构建 TSPL driver (链式 API)
      const driver = new TsplDriver();
      driver
        .size(60, 40)
        .gap(3)
        .clear()
        .text('商品名称', { x: 20, y: 20, font: 3 })
        .text('¥99.00', { x: 20, y: 80, font: 4 })
        .barcode('6901234567890', { x: 20, y: 160, type: 'EAN13', height: 60 })
        .qrcode('https://example.com', { x: 250, y: 20, cellWidth: 4 })
        .print(1, 1);

      // 2. 取 ASCII 字节流
      const bytes = driver.getBuffer();

      // 3. 真实发送 (RN adapter 需用户实现, 此处仅演示):
      //    await yourRnAdapter.write(bytes);
      addLog(
        `✅ TSPL 指令流: ${bytes.length} bytes (已构造,待通过 adapter.write 发送)`,
        'success'
      );
    } catch (error: any) {
      addLog(`失败: ${error.message}`, 'error');
    } finally {
      setPrinting(false);
    }
  };

  /**
   * 渲染设备项
   */
  const renderDevice = ({ item }: { item: BluetoothDevice }) => (
    <TouchableOpacity
      style={styles.deviceItem}
      onPress={() => handleSelectDevice(item)}
      disabled={connecting || connected}
    >
      <Text style={styles.deviceName}>{item.name || '未知设备'}</Text>
      <Text style={styles.deviceId}>{item.deviceId}</Text>
      {item.RSSI && <Text style={styles.rssi}>信号: {item.RSSI}</Text>}
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>蓝牙打印机</Text>

      {/* 状态 */}
      <View style={styles.status}>
        <Text>状态: {connected ? '已连接' : scanning ? '扫描中' : '未连接'}</Text>
        {selectedDevice && <Text>设备: {selectedDevice.name}</Text>}
      </View>

      {/* 扫描 */}
      {!connected && (
        <View style={styles.section}>
          <Button
            title={scanning ? '扫描中...' : '扫描打印机'}
            onPress={handleScan}
            disabled={scanning}
          />
          {scanning && <ActivityIndicator style={styles.loader} />}

          <FlatList
            data={devices}
            renderItem={renderDevice}
            keyExtractor={item => item.deviceId}
            style={styles.deviceList}
            ListEmptyComponent={
              <Text style={styles.emptyText}>
                {scanning ? '正在搜索设备...' : '点击上方按钮扫描'}
              </Text>
            }
          />
        </View>
      )}

      {/* 已连接 */}
      {connected && (
        <View style={styles.section}>
          <Button
            title="断开连接"
            onPress={handleDisconnect}
            color="#ff3b30"
          />

          <View style={styles.buttons}>
            <Button
              title="打印测试页"
              onPress={handlePrintTest}
              disabled={printing}
            />
            <Button
              title="打印收据"
              onPress={handlePrintReceipt}
              disabled={printing}
            />
            <Button
              title="打印标签"
              onPress={handlePrintLabel}
              disabled={printing}
            />
          </View>

          {/* 进度 */}
          {printing && (
            <View style={styles.progress}>
              <Text>打印进度: {progress}%</Text>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${progress}%` }]} />
              </View>
            </View>
          )}
        </View>
      )}

      {/* 日志 */}
      <View style={styles.logs}>
        <Text style={styles.logsTitle}>日志</Text>
        {logs.map((log, index) => (
          <Text key={index} style={styles.logItem}>{log}</Text>
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  status: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  section: {
    marginBottom: 16,
  },
  deviceList: {
    maxHeight: 200,
    marginTop: 12,
  },
  deviceItem: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: '500',
  },
  deviceId: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  rssi: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    marginTop: 20,
  },
  loader: {
    marginTop: 12,
  },
  buttons: {
    marginTop: 16,
    gap: 8,
  },
  progress: {
    marginTop: 16,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e5e5e5',
    borderRadius: 4,
    marginTop: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007aff',
    borderRadius: 4,
  },
  logs: {
    backgroundColor: '#1e1e1e',
    padding: 12,
    borderRadius: 8,
    maxHeight: 200,
  },
  logsTitle: {
    color: '#fff',
    fontWeight: 'bold',
    marginBottom: 8,
  },
  logItem: {
    color: '#d4d4d4',
    fontSize: 12,
    fontFamily: 'monospace',
    marginBottom: 4,
  },
});

export default PrinterScreen;
