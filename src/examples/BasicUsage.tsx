/**
 * 基本使用示例
 * 展示如何使用蓝牙打印库的Hooks和状态管理
 */

import React, { useEffect } from 'react';
import { View, Text, Button, ScrollView, Alert } from '@tarojs/components';
import { useBluetooth, usePrinter } from '../hooks';
import { useBluetoothWithStore } from '../hooks/useBluetoothWithStore';
import { useStore } from '../store';

/**
 * 基础使用示例组件
 */
const BasicUsageExample: React.FC = () => {
  // 使用基础Hooks
  const bluetooth = useBluetooth({
    autoInitialize: true,
    scanTimeout: 10000,
    autoReconnect: true
  });

  const printer = usePrinter({
    autoInitialize: true,
    printTimeout: 30000
  });

  // 使用集成状态管理的Hooks
  const bluetoothWithStore = useBluetoothWithStore({
    autoInitialize: true,
    scanTimeout: 15000
  });

  // 使用全局状态
  const { bluetooth: bluetoothState, printer: printerState, app } = useStore();

  // 事件监听
  useEffect(() => {
    // 监听设备发现
    const unsubscribeDeviceDiscovered = bluetooth.onDeviceDiscovered((device) => {
      console.log('发现设备:', device);
    });

    // 监听设备连接
    const unsubscribeDeviceConnected = bluetooth.onDeviceConnected((connection) => {
      console.log('设备已连接:', connection);
      Alert.alert('连接成功', `设备 ${connection.deviceId} 已连接`);
    });

    // 监听设备断开
    const unsubscribeDeviceDisconnected = bluetooth.onDeviceDisconnected((deviceId) => {
      console.log('设备已断开:', deviceId);
      Alert.alert('连接断开', `设备 ${deviceId} 已断开连接`);
    });

    // 监听打印任务
    const unsubscribeJobCompleted = printer.onJobCompleted((job) => {
      console.log('打印完成:', job);
      Alert.alert('打印成功', '打印任务已完成');
    });

    const unsubscribeJobFailed = printer.onJobFailed((job, error) => {
      console.log('打印失败:', job, error);
      Alert.alert('打印失败', error);
    });

    // 清理函数
    return () => {
      unsubscribeDeviceDiscovered();
      unsubscribeDeviceConnected();
      unsubscribeDeviceDisconnected();
      unsubscribeJobCompleted();
      unsubscribeJobFailed();
    };
  }, [bluetooth, printer]);

  // 处理方法
  const handleScanDevices = async () => {
    try {
      const devices = await bluetooth.scanDevices(10000);
      console.log('扫描到的设备:', devices);
    } catch (error) {
      console.error('扫描失败:', error);
    }
  };

  const handleConnectDevice = async (deviceId: string) => {
    try {
      const connection = await bluetooth.connectDevice(deviceId);
      console.log('连接成功:', connection);
    } catch (error) {
      console.error('连接失败:', error);
    }
  };

  const handleDisconnectDevice = async (deviceId: string) => {
    try {
      await bluetooth.disconnectDevice(deviceId);
      console.log('断开连接成功');
    } catch (error) {
      console.error('断开连接失败:', error);
    }
  };

  const handlePrintText = async () => {
    try {
      const result = await printer.printText('Hello, Bluetooth Printer!', {
        copies: 1,
        density: 8,
        speed: 4
      });
      console.log('打印结果:', result);
    } catch (error) {
      console.error('打印失败:', error);
    }
  };

  const handlePrintTemplate = async () => {
    try {
      const result = await printer.printTemplate('receipt', {
        storeName: '测试商店',
        items: [
          { name: '商品A', price: 10.00, quantity: 2 },
          { name: '商品B', price: 5.50, quantity: 1 }
        ],
        total: 25.50
      });
      console.log('模板打印结果:', result);
    } catch (error) {
      console.error('模板打印失败:', error);
    }
  };

  return (
    <ScrollView className="container" style={{ padding: 20 }}>
      <Text className="title" style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 20 }}>
        蓝牙打印库使用示例
      </Text>

      {/* 状态显示 */}
      <View style={{ marginBottom: 20, padding: 15, backgroundColor: '#f5f5f5', borderRadius: 8 }}>
        <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 10 }}>状态信息</Text>
        <Text>蓝牙初始化: {bluetooth.isInitialized ? '✓' : '✗'}</Text>
        <Text>打印机初始化: {printer.isInitialized ? '✓' : '✗'}</Text>
        <Text>扫描中: {bluetooth.isScanning ? '是' : '否'}</Text>
        <Text>连接中: {bluetooth.isConnecting ? '是' : '否'}</Text>
        <Text>设备数量: {bluetooth.devices.length}</Text>
        <Text>已连接设备: {bluetooth.connectedDevices.length}</Text>
        <Text>当前设备: {bluetooth.currentDevice?.deviceId || '无'}</Text>
        {bluetooth.error && (
          <Text style={{ color: 'red' }}>错误: {bluetooth.error}</Text>
        )}
      </View>

      {/* 全局状态显示 */}
      <View style={{ marginBottom: 20, padding: 15, backgroundColor: '#e8f4fd', borderRadius: 8 }}>
        <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 10 }}>全局状态</Text>
        <Text>主题: {app.theme}</Text>
        <Text>语言: {app.language}</Text>
        <Text>自动连接: {app.preferences.autoConnect ? '是' : '否'}</Text>
        <Text>扫描超时: {app.preferences.scanTimeout}ms</Text>
        <Text>打印超时: {app.preferences.printTimeout}ms</Text>
      </View>

      {/* 蓝牙操作按钮 */}
      <View style={{ marginBottom: 20 }}>
        <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 10 }}>蓝牙操作</Text>

        <Button
          onClick={handleScanDevices}
          disabled={bluetooth.isScanning}
          style={{ marginBottom: 10 }}
        >
          {bluetooth.isScanning ? '扫描中...' : '扫描设备'}
        </Button>

        <Button
          onClick={() => bluetooth.clearDevices()}
          disabled={bluetooth.devices.length === 0}
          style={{ marginBottom: 10 }}
        >
          清空设备列表
        </Button>

        <Button
          onClick={() => bluetooth.clearError()}
          disabled={!bluetooth.error}
          style={{ marginBottom: 10 }}
        >
          清空错误
        </Button>
      </View>

      {/* 设备列表 */}
      {bluetooth.devices.length > 0 && (
        <View style={{ marginBottom: 20 }}>
          <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 10 }}>
            发现的设备
          </Text>
          {bluetooth.devices.map((device) => (
            <View key={device.id} style={{
              padding: 10,
              marginBottom: 5,
              backgroundColor: '#fff',
              borderRadius: 4,
              border: '1px solid #ddd'
            }}>
              <Text style={{ fontWeight: 'bold' }}>{device.name}</Text>
              <Text>ID: {device.deviceId}</Text>
              <Text>信号强度: {device.rssi}</Text>
              <View style={{ flexDirection: 'row', marginTop: 10 }}>
                <Button
                  size="mini"
                  onClick={() => handleConnectDevice(device.deviceId)}
                  disabled={bluetooth.isConnecting}
                  style={{ marginRight: 10 }}
                >
                  连接
                </Button>
                <Button
                  size="mini"
                  type="warn"
                  onClick={() => handleDisconnectDevice(device.deviceId)}
                >
                  断开
                </Button>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* 打印操作按钮 */}
      <View style={{ marginBottom: 20 }}>
        <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 10 }}>打印操作</Text>

        <Button
          onClick={handlePrintText}
          disabled={!bluetooth.currentDevice || printer.isPrinting}
          style={{ marginBottom: 10 }}
        >
          {printer.isPrinting ? '打印中...' : '打印文本'}
        </Button>

        <Button
          onClick={handlePrintTemplate}
          disabled={!bluetooth.currentDevice || printer.isPrinting}
          style={{ marginBottom: 10 }}
        >
          {printer.isPrinting ? '打印中...' : '打印模板'}
        </Button>

        <Button
          onClick={() => printer.clearQueue()}
          disabled={printer.queueStatus.size === 0}
          style={{ marginBottom: 10 }}
        >
          清空打印队列
        </Button>
      </View>

      {/* 队列状态 */}
      <View style={{ marginBottom: 20, padding: 15, backgroundColor: '#f0f8ff', borderRadius: 8 }}>
        <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 10 }}>队列状态</Text>
        <Text>队列大小: {printer.queueStatus.size}</Text>
        <Text>处理中: {printer.queueStatus.processing}</Text>
        <Text>已完成: {printer.queueStatus.completed}</Text>
        <Text>失败: {printer.queueStatus.failed}</Text>
        <Text>队列状态: {printer.queueStatus.paused ? '暂停' : '运行中'}</Text>
      </View>
    </ScrollView>
  );
};

export default BasicUsageExample;