import Taro from '@tarojs/taro';
import TaroBluePrint from '../src';
import { logger, setLogLevel, LogLevel } from '../src/utils/logger';

// 设置日志级别
setLogLevel(LogLevel.DEBUG);

// 初始化打印库
const printer = new TaroBluePrint();

/**
 * 注意：要正确使用该库，请确保：
 * 1. 已安装所有必要依赖，特别是 @tarojs/plugin-platform-* 系列插件
 * 2. 已正确配置 tsconfig.json 中的 esModuleInterop: true
 * 3. 在实际项目中使用时，导入路径应为 'taro-bluetooth-print'，而不是相对路径
 */

/**
 * 扫描并连接打印机
 */
async function scanAndConnect(): Promise<string | null> {
  try {
    await printer.bluetooth.init();
    await printer.bluetooth.startDiscovery();
    
    Taro.showLoading({ title: '搜索打印机...' });
    
    // 等待2秒钟搜索设备
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const devices = await printer.bluetooth.getDiscoveredDevices();
    await printer.bluetooth.stopDiscovery();
    
    Taro.hideLoading();
    
    if (devices.length === 0) {
      Taro.showToast({ title: '未找到打印机', icon: 'none' });
      return null;
    }
    
    // 显示设备列表让用户选择
    const list = devices.map(device => ({
      text: device.name || '未知设备',
      value: device.deviceId
    }));
    
    return new Promise((resolve) => {
      Taro.showActionSheet({
        itemList: list.map(item => item.text),
        success: async (res) => {
          const deviceId = list[res.tapIndex].value;
          
          Taro.showLoading({ title: '连接中...' });
          const connected = await printer.bluetooth.connect(deviceId);
          Taro.hideLoading();
          
          if (connected) {
            Taro.showToast({ title: '连接成功' });
            resolve(deviceId);
          } else {
            Taro.showToast({ title: '连接失败', icon: 'none' });
            resolve(null);
          }
        },
        fail: () => {
          resolve(null);
        }
      });
    });
  } catch (error) {
    logger.error('扫描连接出错', error);
    Taro.hideLoading();
    Taro.showToast({ title: '扫描连接失败', icon: 'none' });
    return null;
  }
}

/**
 * 打印测试页
 */
async function printTestPage() {
  const deviceId = await scanAndConnect();
  if (!deviceId) return;
  
  try {
    Taro.showLoading({ title: '打印中...' });
    
    const result = await printer.printer.printTestPage();
    
    Taro.hideLoading();
    
    if (result) {
      Taro.showToast({ title: '打印成功' });
    } else {
      Taro.showToast({ title: '打印失败', icon: 'none' });
    }
  } catch (error) {
    logger.error('打印测试页失败', error);
    Taro.hideLoading();
    Taro.showToast({ title: '打印失败', icon: 'none' });
  } finally {
    await printer.bluetooth.disconnect();
  }
}

/**
 * 打印收据示例
 */
async function printReceipt() {
  const deviceId = await scanAndConnect();
  if (!deviceId) return;
  
  try {
    Taro.showLoading({ title: '打印中...' });
    
    const result = await printer.printer.printReceipt({
      title: '收据',
      merchant: '示例商店',
      items: [
        { name: '商品1', price: 10.5, quantity: 2 },
        { name: '商品2', price: 5.0, quantity: 1 },
        { name: '商品3', price: 8.0, quantity: 3 }
      ],
      total: 56.0,
      date: new Date().toLocaleString(),
      footer: '感谢您的惠顾，欢迎再次光临！'
    });
    
    Taro.hideLoading();
    
    if (result) {
      Taro.showToast({ title: '打印成功' });
    } else {
      Taro.showToast({ title: '打印失败', icon: 'none' });
    }
  } catch (error) {
    logger.error('打印收据失败', error);
    Taro.hideLoading();
    Taro.showToast({ title: '打印失败', icon: 'none' });
  } finally {
    await printer.bluetooth.disconnect();
  }
}

// 导出示例函数
export {
  scanAndConnect,
  printTestPage,
  printReceipt
};

// 默认导出
export default {
  scanAndConnect,
  printTestPage,
  printReceipt
}; 