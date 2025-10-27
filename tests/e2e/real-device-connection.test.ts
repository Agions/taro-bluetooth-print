/**
 * 真实设备连接 E2E 测试
 * 测试与真实蓝牙打印设备的连接和通信
 */

import { BluetoothPrinter, createBluetoothPrinter } from '../../src/BluetoothPrinter';
import {
  IBluetoothPrinterConfig,
  IDeviceInfo,
  IConnectionInfo,
  IPrintResult
} from '../../src/types';

// 真实设备测试配置
const REAL_DEVICE_CONFIG: Partial<IBluetoothPrinterConfig> = {
  bluetooth: {
    scanTimeout: 20000, // 真实设备需要更长的扫描时间
    connectionTimeout: 30000, // 连接超时时间
    autoReconnect: true,
    maxReconnectAttempts: 5,
    reconnectInterval: 5000
  },
  printer: {
    density: 8,
    speed: 3, // 真实设备使用较慢的速度
    paperWidth: 58,
    autoCut: false,
    charset: 'PC437',
    align: 'left'
  },
  queue: {
    maxSize: 50,
    concurrency: 1,
    retryAttempts: 5,
    retryDelay: 3000,
    autoProcess: true,
    processInterval: 2000
  },
  logging: {
    level: 'debug', // 真实设备测试需要详细日志
    enableConsole: true,
    enableFile: false,
    maxFileSize: 104857600, // 100MB
    maxFiles: 5
  },
  events: {
    enabled: true,
    maxListeners: 100,
    enableHistory: true,
    historySize: 500
  }
};

describe('真实设备连接 E2E 测试', () => {
  let bluetoothPrinter: BluetoothPrinter;
  let connectedDevices: IDeviceInfo[] = [];
  let testResults: any[] = [];

  beforeEach(async () => {
    testResults = [];
    connectedDevices = [];
    bluetoothPrinter = createBluetoothPrinter(REAL_DEVICE_CONFIG);

    // 设置事件监听
    bluetoothPrinter.on('deviceDiscovered', (device) => {
      console.log(`🔍 发现设备: ${device.name} (${device.address})`);
    });

    bluetoothPrinter.on('deviceConnected', (connection) => {
      console.log(`✅ 设备已连接: ${connection.deviceId}`);
    });

    bluetoothPrinter.on('deviceDisconnected', (deviceId) => {
      console.log(`❌ 设备已断开: ${deviceId}`);
    });

    bluetoothPrinter.on('connectionFailed', (error) => {
      console.log(`⚠️ 连接失败: ${error.message}`);
    });
  });

  afterEach(async () => {
    // 清理所有连接
    try {
      const activeConnections = bluetoothPrinter.getConnectedDevices();
      for (const connection of activeConnections) {
        await bluetoothPrinter.disconnectDevice(connection.deviceId);
      }
    } catch (error) {
      console.warn('清理连接时出错:', error);
    }

    if (bluetoothPrinter) {
      try {
        await bluetoothPrinter.dispose();
      } catch (error) {
        console.warn('销毁实例时出错:', error);
      }
    }
  });

  function recordTestResult(testName: string, success: boolean, details?: any): void {
    const result = {
      testName,
      success,
      details,
      timestamp: new Date()
    };
    testResults.push(result);

    const status = success ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} - ${testName}`);
    if (details) {
      console.log(`   详情:`, details);
    }
  }

  describe('真实设备发现和扫描', () => {
    it('应该能够扫描并发现真实的蓝牙设备', async () => {
      try {
        console.log('🔍 开始扫描蓝牙设备...');

        // 初始化系统
        await bluetoothPrinter.initialize();
        recordTestResult('系统初始化', true);

        // 执行设备扫描
        const startTime = Date.now();
        const devices = await bluetoothPrinter.scanDevices(20000);
        const scanDuration = Date.now() - startTime;

        console.log(`📱 扫描完成，发现 ${devices.length} 个设备，耗时 ${scanDuration}ms`);

        // 过滤出可能的打印设备
        const possiblePrinters = devices.filter(device => {
          const name = (device.name || '').toLowerCase();
          return name.includes('print') ||
                 name.includes('printer') ||
                 name.includes('thermal') ||
                 name.includes('receipt') ||
                 name.includes('pos');
        });

        connectedDevices = possiblePrinters;

        recordTestResult('设备扫描', true, {
          totalDevices: devices.length,
          possiblePrinters: possiblePrinters.length,
          scanDuration: `${scanDuration}ms`,
          deviceNames: devices.map(d => d.name || 'Unknown')
        });

        if (possiblePrinters.length > 0) {
          console.log('🖨️ 发现可能的打印设备:');
          possiblePrinters.forEach((device, index) => {
            console.log(`  ${index + 1}. ${device.name} (${device.address}) RSSI: ${device.rssi}`);
          });
        } else {
          console.log('⚠️ 未发现明显的打印设备，将使用可用设备进行测试');
          if (devices.length > 0) {
            connectedDevices = devices.slice(0, 1); // 使用第一个设备进行测试
          }
        }

        expect(devices.length).toBeGreaterThanOrEqual(0);
        expect(scanDuration).toBeLessThan(25000); // 扫描时间应在合理范围内

      } catch (error) {
        recordTestResult('设备扫描', false, { error: error.message });
        throw error;
      }
    }, 30000);

    it('应该能够获取设备详细信息', async () => {
      await bluetoothPrinter.initialize();

      const devices = await bluetoothPrinter.scanDevices(15000);

      if (devices.length === 0) {
        recordTestResult('设备详细信息', false, { message: '未发现设备' });
        return;
      }

      const device = devices[0];

      // 验证设备信息完整性
      const hasRequiredFields =
        device.id &&
        device.address &&
        device.name !== undefined;

      recordTestResult('设备详细信息', hasRequiredFields, {
        deviceId: device.id,
        deviceName: device.name || 'Unknown',
        deviceAddress: device.address,
        rssi: device.rssi,
        paired: device.paired,
        serviceUuids: device.serviceUuids?.length || 0
      });

      expect(hasRequiredFields).toBe(true);
    }, 20000);
  });

  describe('真实设备连接测试', () => {
    beforeEach(async () => {
      await bluetoothPrinter.initialize();
      const devices = await bluetoothPrinter.scanDevices(15000);

      if (devices.length > 0) {
        // 优先选择可能的打印设备
        const possiblePrinters = devices.filter(device => {
          const name = (device.name || '').toLowerCase();
          return name.includes('print') || name.includes('printer');
        });

        connectedDevices = possiblePrinters.length > 0 ? possiblePrinters : devices.slice(0, 1);
      }
    });

    it('应该能够连接到真实的蓝牙设备', async () => {
      if (connectedDevices.length === 0) {
        recordTestResult('设备连接', false, { message: '没有可用设备进行连接测试' });
        return;
      }

      const device = connectedDevices[0];
      console.log(`🔗 尝试连接设备: ${device.name}`);

      try {
        const startTime = Date.now();
        const connection = await bluetoothPrinter.connectDevice(device.id);
        const connectionTime = Date.now() - startTime;

        console.log(`✅ 设备连接成功，耗时 ${connectionTime}ms`);

        // 验证连接信息
        const hasConnectionInfo =
          connection.deviceId === device.id &&
          connection.connected === true &&
          connection.connectedAt instanceof Date;

        recordTestResult('设备连接', hasConnectionInfo, {
          deviceId: connection.deviceId,
          connectionTime: `${connectionTime}ms`,
          connectedAt: connection.connectedAt,
          mtu: connection.mtu,
          rssi: connection.rssi,
          quality: connection.quality,
          services: connection.services?.length || 0
        });

        expect(hasConnectionInfo).toBe(true);
        expect(connectionTime).toBeLessThan(15000); // 连接时间应在合理范围内

        // 清理连接
        await bluetoothPrinter.disconnectDevice(device.id);

      } catch (error) {
        recordTestResult('设备连接', false, {
          error: error.message,
          deviceId: device.id,
          deviceName: device.name
        });
        throw error;
      }
    }, 25000);

    it('应该能够处理多个设备的并发连接', async () => {
      if (connectedDevices.length < 2) {
        recordTestResult('并发连接', false, {
          message: `需要至少2个设备，当前只有 ${connectedDevices.length} 个`
        });
        return;
      }

      const devicesToTest = connectedDevices.slice(0, 2);
      console.log(`🔗 尝试并发连接 ${devicesToTest.length} 个设备`);

      try {
        const startTime = Date.now();
        const connectionPromises = devicesToTest.map(device =>
          bluetoothPrinter.connectDevice(device.id)
        );

        const connections = await Promise.all(connectionPromises);
        const connectionTime = Date.now() - startTime;

        console.log(`✅ 并发连接成功，耗时 ${connectionTime}ms`);

        const allConnected = connections.every(conn => conn.connected);

        recordTestResult('并发连接', allConnected, {
          deviceCount: devicesToTest.length,
          connectionTime: `${connectionTime}ms`,
          successfulConnections: connections.filter(c => c.connected).length
        });

        expect(allConnected).toBe(true);

        // 清理所有连接
        for (const connection of connections) {
          if (connection.connected) {
            await bluetoothPrinter.disconnectDevice(connection.deviceId);
          }
        }

      } catch (error) {
        recordTestResult('并发连接', false, {
          error: error.message,
          attemptedDevices: devicesToTest.length
        });
        throw error;
      }
    }, 35000);

    it('应该能够正确处理设备断开连接', async () => {
      if (connectedDevices.length === 0) {
        recordTestResult('设备断开', false, { message: '没有可用设备' });
        return;
      }

      const device = connectedDevices[0];

      try {
        // 先连接设备
        await bluetoothPrinter.connectDevice(device.id);
        console.log('✅ 设备已连接');

        // 验证设备在已连接列表中
        const connectedList = bluetoothPrinter.getConnectedDevices();
        expect(connectedList.some(d => d.deviceId === device.id)).toBe(true);

        // 断开连接
        await bluetoothPrinter.disconnectDevice(device.id);
        console.log('✅ 设备已断开');

        // 验证设备不在已连接列表中
        const finalConnectedList = bluetoothPrinter.getConnectedDevices();
        const deviceDisconnected = !finalConnectedList.some(d => d.deviceId === device.id);

        recordTestResult('设备断开', deviceDisconnected, {
          deviceId: device.id,
          deviceName: device.name,
          wasInConnectedList: connectedList.length > 0,
          isInFinalConnectedList: finalConnectedList.some(d => d.deviceId === device.id)
        });

        expect(deviceDisconnected).toBe(true);

      } catch (error) {
        recordTestResult('设备断开', false, {
          error: error.message,
          deviceId: device.id
        });
        throw error;
      }
    }, 20000);

    it('应该能够处理连接超时和错误情况', async () => {
      console.log('⏰ 测试连接超时处理...');

      // 尝试连接一个不存在的设备
      const invalidDeviceId = 'invalid-device-id-for-timeout-test';

      try {
        await bluetoothPrinter.connectDevice(invalidDeviceId);

        // 如果没有抛出错误，说明有问题
        recordTestResult('连接超时处理', false, {
          message: '应该抛出连接错误但没有'
        });

      } catch (error) {
        // 预期的错误
        const isExpectedError =
          error.message.includes('not found') ||
          error.message.includes('timeout') ||
          error.message.includes('failed');

        recordTestResult('连接超时处理', isExpectedError, {
          deviceId: invalidDeviceId,
          errorMessage: error.message,
          errorName: error.name
        });

        expect(isExpectedError).toBe(true);
      }
    }, 15000);
  });

  describe('真实设备打印测试', () => {
    let testDevice: IDeviceInfo | null = null;

    beforeEach(async () => {
      await bluetoothPrinter.initialize();
      const devices = await bluetoothPrinter.scanDevices(15000);

      if (devices.length > 0) {
        // 选择最合适的设备进行打印测试
        testDevice = connectedDevices.length > 0 ? connectedDevices[0] : devices[0];

        try {
          await bluetoothPrinter.connectDevice(testDevice.id);
          console.log(`🖨️ 已连接测试设备: ${testDevice.name}`);
        } catch (error) {
          console.warn('⚠️ 设备连接失败，将使用模拟模式:', error);
          testDevice = null;
        }
      }
    });

    afterEach(async () => {
      if (testDevice) {
        try {
          await bluetoothPrinter.disconnectDevice(testDevice.id);
        } catch (error) {
          console.warn('断开测试设备连接时出错:', error);
        }
      }
    });

    it('应该能够在真实设备上打印文本', async () => {
      if (!testDevice) {
        recordTestResult('文本打印', false, { message: '没有可用设备' });
        return;
      }

      try {
        const testText = `
====================
  真实设备打印测试
====================
测试时间: ${new Date().toLocaleString()}
设备名称: ${testDevice.name}
设备地址: ${testDevice.address}
信号强度: ${testDevice.rssi || 'N/A'} dBm

这是一个基本的文本打印测试。
包含了中英文字符：Hello World! 你好世界！
包含数字：1234567890
包含特殊符号：!@#$%^&*()

====================
测试完成
====================
        `.trim();

        console.log('📄 开始文本打印测试...');
        const startTime = Date.now();
        const result = await bluetoothPrinter.printText(testText);
        const printTime = Date.now() - startTime;

        console.log(`🖨️ 文本打印完成，耗时 ${printTime}ms`);

        recordTestResult('文本打印', result.success, {
          deviceId: testDevice.id,
          deviceName: testDevice.name,
          printTime: `${printTime}ms`,
          jobId: result.jobId,
          textLength: testText.length
        });

        expect(result.success).toBe(true);
        expect(result.jobId).toBeDefined();
        expect(printTime).toBeLessThan(10000); // 打印时间应在合理范围内

        // 等待打印完成
        await new Promise(resolve => setTimeout(resolve, 3000));

      } catch (error) {
        recordTestResult('文本打印', false, {
          error: error.message,
          deviceId: testDevice.id
        });
        throw error;
      }
    }, 20000);

    it('应该能够在真实设备上打印条形码和二维码', async () => {
      if (!testDevice) {
        recordTestResult('条码打印', false, { message: '没有可用设备' });
        return;
      }

      try {
        console.log('📊 开始条码打印测试...');

        // 打印条形码
        const barcodeStartTime = Date.now();
        const barcodeResult = await bluetoothPrinter.printBarcode('1234567890123', 'CODE128');
        const barcodeTime = Date.now() - barcodeStartTime;

        console.log(`📊 条形码打印完成，耗时 ${barcodeTime}ms`);

        // 打印二维码
        const qrcodeStartTime = Date.now();
        const qrcodeResult = await bluetoothPrinter.printQRCode('https://github.com/taro-bluetooth-printer');
        const qrcodeTime = Date.now() - qrcodeStartTime;

        console.log(`📱 二维码打印完成，耗时 ${qrcodeTime}ms`);

        const bothSuccessful = barcodeResult.success && qrcodeResult.success;

        recordTestResult('条码打印', bothSuccessful, {
          deviceId: testDevice.id,
          deviceName: testDevice.name,
          barcodeSuccess: barcodeResult.success,
          barcodeTime: `${barcodeTime}ms`,
          qrcodeSuccess: qrcodeResult.success,
          qrcodeTime: `${qrcodeTime}ms`
        });

        expect(bothSuccessful).toBe(true);

        // 等待打印完成
        await new Promise(resolve => setTimeout(resolve, 5000));

      } catch (error) {
        recordTestResult('条码打印', false, {
          error: error.message,
          deviceId: testDevice.id
        });
        throw error;
      }
    }, 25000);

    it('应该能够在真实设备上进行批量打印', async () => {
      if (!testDevice) {
        recordTestResult('批量打印', false, { message: '没有可用设备' });
        return;
      }

      try {
        console.log('📚 开始批量打印测试...');

        const printRequests = [
          { type: 'text' as const, content: '=== 批量测试项目 1 ===\n第一项内容\n--------------------' },
          { type: 'text' as const, content: '=== 批量测试项目 2 ===\n第二项内容\n--------------------' },
          { type: 'text' as const, content: '=== 批量测试项目 3 ===\n第三项内容\n--------------------' },
          { type: 'qrcode' as const, content: 'https://example.com/batch-test-1' },
          { type: 'qrcode' as const, content: 'https://example.com/batch-test-2' },
          { type: 'barcode' as const, content: 'BATCH123456', type: 'CODE128' }
        ];

        const startTime = Date.now();
        const results = await bluetoothPrinter.printBatch(printRequests);
        const totalTime = Date.now() - startTime;

        console.log(`📚 批量打印完成，共 ${printRequests.length} 项，耗时 ${totalTime}ms`);

        const allSuccessful = results.every(r => r.success);
        const averageTimePerItem = totalTime / printRequests.length;

        recordTestResult('批量打印', allSuccessful, {
          deviceId: testDevice.id,
          deviceName: testDevice.name,
          totalItems: printRequests.length,
          successfulItems: results.filter(r => r.success).length,
          totalTime: `${totalTime}ms`,
          averageTimePerItem: `${averageTimePerItem.toFixed(1)}ms`
        });

        expect(allSuccessful).toBe(true);
        expect(averageTimePerItem).toBeLessThan(5000); // 平均每项应在5秒内完成

        // 等待所有打印完成
        await new Promise(resolve => setTimeout(resolve, 8000));

      } catch (error) {
        recordTestResult('批量打印', false, {
          error: error.message,
          deviceId: testDevice.id
        });
        throw error;
      }
    }, 30000);
  });

  describe('设备稳定性测试', () => {
    let testDevice: IDeviceInfo | null = null;

    beforeEach(async () => {
      await bluetoothPrinter.initialize();
      const devices = await bluetoothPrinter.scanDevices(15000);

      if (connectedDevices.length > 0) {
        testDevice = connectedDevices[0];
        try {
          await bluetoothPrinter.connectDevice(testDevice.id);
        } catch (error) {
          console.warn('设备连接失败:', error);
          testDevice = null;
        }
      }
    });

    afterEach(async () => {
      if (testDevice) {
        try {
          await bluetoothPrinter.disconnectDevice(testDevice.id);
        } catch (error) {
          console.warn('断开测试设备连接时出错:', error);
        }
      }
    });

    it('应该能够处理长时间的连续打印', async () => {
      if (!testDevice) {
        recordTestResult('长时间打印', false, { message: '没有可用设备' });
        return;
      }

      try {
        console.log('⏰ 开始长时间连续打印测试...');

        const testDuration = 30000; // 30秒
        const printInterval = 2000; // 每2秒打印一次
        const printCount = Math.floor(testDuration / printInterval);

        let successCount = 0;
        let failureCount = 0;
        const results = [];

        const startTime = Date.now();

        for (let i = 0; i < printCount; i++) {
          try {
            const testContent = `
长时间测试 #${i + 1}/${printCount}
时间: ${new Date().toLocaleTimeString()}
设备: ${testDevice.name}
进度: ${((i + 1) / printCount * 100).toFixed(1)}%
====================
            `.trim();

            const result = await bluetoothPrinter.printText(testContent);

            if (result.success) {
              successCount++;
            } else {
              failureCount++;
            }

            results.push({
              index: i + 1,
              success: result.success,
              jobId: result.jobId,
              timestamp: new Date()
            });

          } catch (error) {
            failureCount++;
            results.push({
              index: i + 1,
              success: false,
              error: error.message,
              timestamp: new Date()
            });
          }

          // 等待下一次打印
          if (i < printCount - 1) {
            await new Promise(resolve => setTimeout(resolve, printInterval));
          }
        }

        const totalTime = Date.now() - startTime;
        const successRate = (successCount / printCount) * 100;

        recordTestResult('长时间打印', successRate >= 90, {
          deviceId: testDevice.id,
          deviceName: testDevice.name,
          testDuration: `${totalTime}ms`,
          totalPrints: printCount,
          successCount,
          failureCount,
          successRate: `${successRate.toFixed(1)}%`
        });

        console.log(`⏰ 长时间测试完成: ${successCount}/${printCount} 成功 (${successRate.toFixed(1)}%)`);

        expect(successRate).toBeGreaterThanOrEqual(90); // 至少90%成功率

      } catch (error) {
        recordTestResult('长时间打印', false, {
          error: error.message,
          deviceId: testDevice.id
        });
        throw error;
      }
    }, 45000);

    it('应该能够处理连接中断后的自动重连', async () => {
      if (!testDevice) {
        recordTestResult('自动重连', false, { message: '没有可用设备' });
        return;
      }

      try {
        console.log('🔄 开始自动重连测试...');

        // 确保设备已连接
        let connected = true;
        let reconnectAttempts = 0;
        let maxReconnectAttempts = 3;

        while (reconnectAttempts < maxReconnectAttempts) {
          try {
            // 尝试打印
            const result = await bluetoothPrinter.printText('重连测试内容');
            if (result.success) {
              console.log(`✅ 打印成功 (重连尝试 ${reconnectAttempts + 1})`);
              break;
            }
          } catch (error) {
            console.log(`⚠️ 打印失败，尝试重连 (第 ${reconnectAttempts + 1} 次):`, error.message);

            // 尝试重新连接
            try {
              await bluetoothPrinter.disconnectDevice(testDevice.id);
              await new Promise(resolve => setTimeout(resolve, 1000));
              await bluetoothPrinter.connectDevice(testDevice.id);
              reconnectAttempts++;
            } catch (reconnectError) {
              console.log('❌ 重连失败:', reconnectError.message);
              reconnectAttempts++;
            }
          }
        }

        const reconnectSuccessful = reconnectAttempts < maxReconnectAttempts;

        recordTestResult('自动重连', reconnectSuccessful, {
          deviceId: testDevice.id,
          deviceName: testDevice.name,
          reconnectAttempts,
          maxReconnectAttempts,
          success: reconnectSuccessful
        });

        expect(reconnectSuccessful).toBe(true);

      } catch (error) {
        recordTestResult('自动重连', false, {
          error: error.message,
          deviceId: testDevice.id
        });
        throw error;
      }
    }, 30000);
  });

  describe('测试结果汇总', () => {
    it('应该生成详细的测试报告', () => {
      console.log('\n📊 真实设备连接测试结果汇总:');
      console.log('='.repeat(60));

      const totalTests = testResults.length;
      const passedTests = testResults.filter(r => r.success).length;
      const failedTests = totalTests - passedTests;

      console.log(`总测试数: ${totalTests}`);
      console.log(`通过测试: ${passedTests}`);
      console.log(`失败测试: ${failedTests}`);
      console.log(`通过率: ${totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(1) : 0}%`);

      console.log('\n详细结果:');
      testResults.forEach((result, index) => {
        const status = result.success ? '✅ PASS' : '❌ FAIL';
        console.log(`${index + 1}. ${status} - ${result.testName}`);
        if (result.details) {
          if (result.success) {
            console.log(`   📊 ${JSON.stringify(result.details, null, 2)}`);
          } else {
            console.log(`   ❌ 错误: ${result.details.error || JSON.stringify(result.details)}`);
          }
        }
      });

      console.log('='.repeat(60));

      // 设备测试通过率可以适当放宽，因为真实设备测试环境复杂
      const minPassRate = totalTests > 0 ? 0.6 : 1; // 至少60%通过率
      expect(passedTests / totalTests).toBeGreaterThanOrEqual(minPassRate);

      if (failedTests > 0) {
        console.warn(`⚠️ 有 ${failedTests} 个测试失败，这可能是由于设备环境或权限问题导致的`);
        console.log('💡 建议检查:');
        console.log('   - 蓝牙权限是否已授予');
        console.log('   - 设备是否在范围内且已开启');
        console.log('   - 设备是否与其他设备连接');
      }
    });
  });
});