/**
 * 微信小程序示例 - 完整蓝牙打印应用
 * 
 * 使用方法：
 * 1. 将此文件复制到小程序 pages 目录
 * 2. 在 app.json 中配置页面路径
 * 3. 确保有蓝牙权限
 */

import { BluetoothPrinter, DeviceManager, PrintQueue } from 'taro-bluetooth-print';
import Taro from '@tarojs/taro';
import { View, Text, Button, ScrollView } from '@tarojs/components';
import { AtActivityIndicator, AtList, AtListItem } from 'taro-ui';
import './index.less';

interface PrinterPageState {
  // 扫描状态
  scanning: boolean;
  devices: BluetoothDevice[];
  selectedDevice: BluetoothDevice | null;
  
  // 连接状态
  connected: boolean;
  connecting: boolean;
  printerState: string;
  
  // 打印状态
  printing: boolean;
  progress: number;
  
  // 队列
  queueLength: number;
  
  // 日志
  logs: string[];
}

export default class PrinterPage extends Taro.Component<any, PrinterPageState> {
  private printer: BluetoothPrinter;
  private deviceManager: DeviceManager;
  private printQueue: PrintQueue;

  constructor(props) {
    super(props);
    this.state = {
      scanning: false,
      devices: [],
      selectedDevice: null,
      connected: false,
      connecting: false,
      printerState: 'disconnected',
      printing: false,
      progress: 0,
      queueLength: 0,
      logs: [],
    };
    
    // 初始化
    this.printer = new BluetoothPrinter();
    this.deviceManager = new DeviceManager();
    this.printQueue = new PrintQueue({ maxSize: 50 });
    
    this.initPrinter();
    this.initDeviceManager();
    this.initQueue();
  }

  /**
   * 初始化打印机事件
   */
  private initPrinter() {
    // 打印进度
    this.printer.on('progress', ({ sent, total }) => {
      const percent = ((sent / total) * 100).toFixed(1);
      this.setState({ progress: parseFloat(percent) });
      this.addLog(`打印进度: ${percent}%`);
    });
    
    // 错误
    this.printer.on('error', (error) => {
      this.addLog(`错误: ${error.code} - ${error.message}`);
      Taro.showToast({
        title: error.message,
        icon: 'none'
      });
    });
    
    // 完成
    this.printer.on('print-complete', () => {
      this.setState({ printing: false, progress: 0 });
      this.addLog('打印完成');
      Taro.showToast({ title: '打印完成', icon: 'success' });
    });
    
    // 状态变化
    this.printer.on('state-change', (state) => {
      this.setState({ printerState: state });
      this.addLog(`状态: ${state}`);
    });
  }

  /**
   * 初始化设备管理器
   */
  private initDeviceManager() {
    this.deviceManager.on('device-found', (device) => {
      const devices = this.state.devices;
      // 去重
      if (!devices.find(d => d.deviceId === device.deviceId)) {
        this.setState({
          devices: [...devices, device]
        });
      }
    });
    
    this.deviceManager.on('scan-started', () => {
      this.setState({ scanning: true, devices: [] });
      this.addLog('开始扫描设备...');
    });
    
    this.deviceManager.on('scan-stopped', () => {
      this.setState({ scanning: false });
      this.addLog('扫描结束');
    });
  }

  /**
   * 初始化打印队列
   */
  private initQueue() {
    this.printQueue.on('job-added', (job) => {
      this.setState({ queueLength: this.printQueue.getPendingCount() });
      this.addLog(`任务入队: ${job.id}`);
    });
    
    this.printQueue.on('job-completed', (job) => {
      this.setState({ queueLength: this.printQueue.getPendingCount() });
      this.addLog(`任务完成: ${job.id}`);
    });
    
    this.printQueue.on('job-failed', (job, error) => {
      this.addLog(`任务失败: ${job.id} - ${error.message}`);
    });
  }

  /**
   * 添加日志
   */
  private addLog(message: string) {
    const time = new Date().toLocaleTimeString();
    const log = `[${time}] ${message}`;
    this.setState(prev => ({
      logs: [log, ...prev.slice(0, 49)] // 保留最近50条
    }));
  }

  /**
   * 扫描设备
   */
  async handleScan() {
    try {
      // 检查蓝牙
      const { [0]: adapter } = await Taro.getBluetoothAdapterState();
      if (!adapter.available) {
        Taro.showToast({ title: '请开启蓝牙', icon: 'none' });
        return;
      }
      
      // 开始扫描
      await this.deviceManager.startScan({ timeout: 10000 });
    } catch (error) {
      this.addLog(`扫描失败: ${error.message}`);
    }
  }

  /**
   * 选择设备
   */
  async handleSelectDevice(device: BluetoothDevice) {
    this.setState({ selectedDevice: device, connecting: true });
    this.addLog(`正在连接: ${device.name}...`);
    
    try {
      await this.printer.connect(device.deviceId);
      this.setState({ connected: true });
      this.addLog(`已连接: ${device.name}`);
    } catch (error) {
      this.addLog(`连接失败: ${error.message}`);
      Taro.showToast({ title: '连接失败', icon: 'none' });
    } finally {
      this.setState({ connecting: false });
    }
  }

  /**
   * 断开连接
   */
  async handleDisconnect() {
    try {
      await this.printer.disconnect();
      this.setState({ connected: false, selectedDevice: null });
      this.addLog('已断开连接');
    } catch (error) {
      this.addLog(`断开失败: ${error.message}`);
    }
  }

  /**
   * 打印测试页
   */
  async handlePrintTest() {
    if (!this.state.connected) {
      Taro.showToast({ title: '请先连接打印机', icon: 'none' });
      return;
    }
    
    this.setState({ printing: true });
    this.addLog('开始打印...');
    
    try {
      await this.printer
        .text('=== 测试打印 ===', 'GBK')
        .feed()
        .text('时间: ' + new Date().toLocaleString(), 'GBK')
        .feed(2)
        .qr('https://example.com', { size: 6 })
        .feed(2)
        .cut()
        .print();
    } catch (error) {
      this.addLog(`打印失败: ${error.message}`);
    }
  }

  /**
   * 打印收据
   */
  async handlePrintReceipt() {
    if (!this.state.connected) {
      Taro.showToast({ title: '请先连接打印机', icon: 'none' });
      return;
    }
    
    const items = [
      { name: '可口可乐', price: 5, qty: 2 },
      { name: '薯条', price: 12, qty: 1 },
      { name: '汉堡', price: 25, qty: 1 },
    ];
    const total = items.reduce((sum, item) => sum + item.price * item.qty, 0);
    
    this.setState({ printing: true });
    
    try {
      await this.printer
        .align('center')
        .setSize(2, 2)
        .text('快餐店', 'GBK')
        .feed()
        .resetStyle()
        .text('地址: XX市XX区XX路', 'GBK')
        .text('电话: 12345678900', 'GBK')
        .feed()
        .text('------------------------', 'GBK')
        .feed();
      
      // 商品明细
      items.forEach(item => {
        const line = `${item.name} x${item.qty}`.padEnd(15) + `¥${item.price * item.qty}`;
        this.printer.text(line, 'GBK');
      });
      
      await this.printer
        .feed()
        .text('------------------------', 'GBK')
        .feed()
        .setBold(true)
        .text(`合计: ¥${total}`, 'GBK')
        .resetStyle()
        .feed(2)
        .align('center')
        .text('谢谢惠顾，欢迎下次光临!', 'GBK')
        .feed(2)
        .qr(`https://example.com/order/${Date.now()}`, { size: 5 })
        .feed(3)
        .cut()
        .print();
    } catch (error) {
      this.addLog(`打印失败: ${error.message}`);
    }
  }

  /**
   * 打印标签
   */
  async handlePrintLabel() {
    if (!this.state.connected) {
      Taro.showToast({ title: '请先连接打印机', icon: 'none' });
      return;
    }
    
    // 这里需要使用 TsplDriver
    // 详见 examples/weapp/label-print
    Taro.showToast({ title: '请使用标签打印示例', icon: 'none' });
  }

  render() {
    const { 
      scanning, devices, selectedDevice, 
      connected, connecting, printerState,
      printing, progress, queueLength, logs 
    } = this.state;
    
    return (
      <View className="printer-page">
        {/* 头部状态 */}
        <View className="header">
          <Text className="title">蓝牙打印</Text>
          <View className="status">
            <Text>状态: {printerState}</Text>
            {connected && <Text> | 队列: {queueLength}</Text>}
          </View>
        </View>
        
        {/* 扫描区域 */}
        {!connected && (
          <View className="scan-section">
            <Button 
              onClick={this.handleScan}
              disabled={scanning}
              type="primary"
            >
              {scanning ? '扫描中...' : '扫描打印机'}
            </Button>
            
            {scanning && <AtActivityIndicator mode="center" content="扫描中..." />}
            
            <ScrollView className="device-list" scrollY>
              <AtList>
                {devices.map(device => (
                  <AtListItem
                    key={device.deviceId}
                    title={device.name || '未知设备'}
                    note={device.deviceId}
                    arrow="right"
                    onClick={() => this.handleSelectDevice(device)}
                  />
                ))}
              </AtList>
            </ScrollView>
          </View>
        )}
        
        {/* 连接状态 */}
        {connected && (
          <View className="connected-section">
            <View className="device-info">
              <Text>已连接: {selectedDevice?.name}</Text>
              <Button size="small" onClick={this.handleDisconnect}>断开</Button>
            </View>
            
            {/* 打印按钮 */}
            <View className="print-buttons">
              <Button onClick={this.handlePrintTest} disabled={printing}>
                打印测试页
              </Button>
              <Button onClick={this.handlePrintReceipt} disabled={printing}>
                打印收据
              </Button>
              <Button onClick={this.handlePrintLabel} disabled={printing}>
                打印标签
              </Button>
            </View>
            
            {/* 进度条 */}
            {printing && (
              <View className="progress">
                <Text>打印进度: {progress}%</Text>
                <View className="progress-bar">
                  <View className="progress-fill" style={{ width: `${progress}%` }} />
                </View>
              </View>
            )}
          </View>
        )}
        
        {/* 日志区域 */}
        <View className="logs">
          <Text className="logs-title">日志</Text>
          <ScrollView className="logs-content" scrollY>
            {logs.map((log, index) => (
              <Text key={index} className="log-item">{log}</Text>
            ))}
          </ScrollView>
        </View>
      </View>
    );
  }
}
