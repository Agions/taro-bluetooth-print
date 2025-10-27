/**
 * 打印机测试
 */

import { Printer } from '../Printer';
import { PrinterState, PrinterType } from '../types';

describe('Printer', () => {
  let printer: Printer;

  beforeEach(() => {
    printer = new Printer(
      'test-printer',
      'Test Printer',
      PrinterType.THERMAL,
      'device-123'
    );
  });

  describe('基本属性', () => {
    it('应该初始化基本属性', () => {
      expect(printer.id).toBe('test-printer');
      expect(printer.name).toBe('Test Printer');
      expect(printer.type).toBe(PrinterType.THERMAL);
      expect(printer.deviceId).toBe('device-123');
      expect(printer.state).toBe(PrinterState.DISCONNECTED);
      expect(printer.enabled).toBe(true);
    });

    it('应该支持更新名称', () => {
      printer.name = 'Updated Printer';
      expect(printer.name).toBe('Updated Printer');
    });

    it('应该支持启用/禁用', () => {
      printer.setEnabled(false);
      expect(printer.enabled).toBe(false);

      printer.setEnabled(true);
      expect(printer.enabled).toBe(true);
    });
  });

  describe('连接状态管理', () => {
    it('应该正确报告连接状态', () => {
      expect(printer.isConnected()).toBe(false);

      printer.updateState(PrinterState.CONNECTED);
      expect(printer.isConnected()).toBe(true);

      printer.updateState(PrinterState.DISCONNECTED);
      expect(printer.isConnected()).toBe(false);
    });

    it('应该正确报告可用状态', () => {
      expect(printer.isAvailable()).toBe(false);

      printer.updateState(PrinterState.CONNECTED);
      printer.updateStatus({ hasError: false });
      expect(printer.isAvailable()).toBe(true);

      printer.updateStatus({ hasError: true });
      expect(printer.isAvailable()).toBe(false);
    });

    it('应该正确报告忙碌状态', () => {
      expect(printer.isBusy()).toBe(false);

      printer.updateState(PrinterState.PRINTING);
      expect(printer.isBusy()).toBe(true);

      printer.updateState(PrinterState.CONNECTED);
      expect(printer.isBusy()).toBe(false);
    });

    it('应该正确报告错误状态', () => {
      expect(printer.hasError()).toBe(false);

      printer.updateState(PrinterState.ERROR);
      expect(printer.hasError()).toBe(true);

      printer.updateState(PrinterState.CONNECTED);
      printer.updateStatus({ hasError: false });
      expect(printer.hasError()).toBe(false);
    });
  });

  describe('状态更新', () => {
    it('应该更新状态时触发事件', () => {
      const stateChangeSpy = jest.fn();
      printer.on('stateChanged', stateChangeSpy);

      printer.updateState(PrinterState.CONNECTED);

      expect(stateChangeSpy).toHaveBeenCalledWith(PrinterState.CONNECTED);
    });

    it('应该记录连接时间', () => {
      const beforeConnect = new Date();
      printer.updateState(PrinterState.CONNECTED);
      const afterConnect = new Date();

      expect(printer.lastConnected).toBeDefined();
      expect(printer.lastConnected!.getTime()).toBeGreaterThanOrEqual(beforeConnect.getTime());
      expect(printer.lastConnected!.getTime()).toBeLessThanOrEqual(afterConnect.getTime());
    });

    it('应该记录断开时间', () => {
      printer.updateState(PrinterState.CONNECTED);
      printer.updateState(PrinterState.DISCONNECTED);

      expect(printer.lastDisconnected).toBeDefined();
    });

    it('应该触发状态更新事件', () => {
      const statusUpdateSpy = jest.fn();
      printer.on('statusUpdate', statusUpdateSpy);

      printer.updateState(PrinterState.CONNECTED);

      expect(statusUpdateSpy).toHaveBeenCalled();
      const status = statusUpdateSpy.mock.calls[0][0];
      expect(status.state).toBe(PrinterState.CONNECTED);
    });
  });

  describe('打印操作', () => {
    it('应该开始打印', () => {
      const printStartedSpy = jest.fn();
      printer.on('printStarted', printStartedSpy);

      printer.startPrint();

      expect(printer.state).toBe(PrinterState.PRINTING);
      expect(printer.status.isPrinting).toBe(true);
      expect(printer.status.currentJobStartTime).toBeDefined();
      expect(printStartedSpy).toHaveBeenCalled();
    });

    it('应该完成打印', () => {
      printer.startPrint();

      const printCompletedSpy = jest.fn();
      printer.on('printCompleted', printCompletedSpy);

      printer.completePrint(true);

      expect(printer.state).toBe(PrinterState.CONNECTED);
      expect(printer.status.isPrinting).toBe(false);
      expect(printer.totalPrintCount).toBe(1);
      expect(printer.successPrintCount).toBe(1);
      expect(printer.lastPrintTime).toBeDefined();
      expect(printCompletedSpy).toHaveBeenCalled();

      const eventArg = printCompletedSpy.mock.calls[0][0];
      expect(eventArg.success).toBe(true);
      expect(eventArg.timestamp).toBe(printer.lastPrintTime);
    });

    it('应该处理打印失败', () => {
      printer.startPrint();

      printer.completePrint(false);

      expect(printer.totalPrintCount).toBe(1);
      expect(printer.failedPrintCount).toBe(1);
    });
  });

  describe('错误处理', () => {
    it('应该设置错误状态', () => {
      const errorSpy = jest.fn();
      printer.on('error', errorSpy);

      const errorMessage = 'Printer out of paper';
      printer.setError(errorMessage, { code: 'PAPER_OUT' });

      expect(printer.state).toBe(PrinterState.ERROR);
      expect(printer.status.hasError).toBe(true);
      expect(printer.status.errorMessage).toBe(errorMessage);
      expect(printer.status.errorDetails).toEqual({ code: 'PAPER_OUT' });
      expect(printer.status.lastErrorTime).toBeDefined();
      expect(errorSpy).toHaveBeenCalled();
    });

    it('应该清除错误状态', () => {
      printer.setError('Test error');
      printer.clearError();

      expect(printer.state).toBe(PrinterState.CONNECTED);
      expect(printer.status.hasError).toBe(false);
      expect(printer.status.errorMessage).toBeUndefined();
      expect(printer.status.errorDetails).toBeUndefined();
    });
  });

  describe('耗材状态', () => {
    it('应该设置纸张状态', () => {
      const paperOutSpy = jest.fn();
      const paperStatusSpy = jest.fn();
      printer.on('paperOut', paperOutSpy);
      printer.on('paperStatusChanged', paperStatusSpy);

      printer.setPaperStatus(false);

      expect(printer.status.hasPaper).toBe(false);
      expect(printer.status.paperLevel).toBe(0);
      expect(paperOutSpy).toHaveBeenCalled();
      expect(paperStatusSpy).toHaveBeenCalledWith({ hasPaper: false, paperLevel: undefined });
    });

    it('应该设置纸张级别', () => {
      printer.setPaperStatus(true, 75);

      expect(printer.status.hasPaper).toBe(true);
      expect(printer.status.paperLevel).toBe(75);
    });

    it('应该设置墨水状态', () => {
      const inkOutSpy = jest.fn();
      printer.on('inkOut', inkOutSpy);

      printer.setInkStatus(false);

      expect(printer.status.hasInk).toBe(false);
      expect(printer.status.inkLevel).toBe(0);
      expect(inkOutSpy).toHaveBeenCalled();
    });

    it('应该设置墨水级别', () => {
      printer.setInkStatus(true, 50);

      expect(printer.status.hasInk).toBe(true);
      expect(printer.status.inkLevel).toBe(50);
    });

    it('应该设置盖子状态', () => {
      const coverOpenedSpy = jest.fn();
      const coverClosedSpy = jest.fn();
      printer.on('coverOpened', coverOpenedSpy);
      printer.on('coverClosed', coverClosedSpy);

      printer.setCoverStatus(true);
      expect(printer.status.coverOpen).toBe(true);
      expect(coverOpenedSpy).toHaveBeenCalled();

      printer.setCoverStatus(false);
      expect(printer.status.coverOpen).toBe(false);
      expect(coverClosedSpy).toHaveBeenCalled();
    });
  });

  describe('属性管理', () => {
    it('应该支持设置和获取属性', () => {
      printer.setProperty('location', 'Office');
      printer.setProperty('model', 'TP-58');

      expect(printer.getProperty('location')).toBe('Office');
      expect(printer.getProperty('model')).toBe('TP-58');
    });

    it('应该触发属性更新事件', () => {
      const propertyChangedSpy = jest.fn();
      printer.on('propertyChanged', propertyChangedSpy);

      printer.setProperty('test', 'value');

      expect(propertyChangedSpy).toHaveBeenCalledWith({ key: 'test', value: 'value' });
    });

    it('应该支持批量更新属性', () => {
      const propertiesUpdatedSpy = jest.fn();
      printer.on('propertiesUpdated', propertiesUpdatedSpy);

      printer.updateProperties({ location: 'Office', model: 'TP-58' });

      expect(printer.properties.location).toBe('Office');
      expect(printer.properties.model).toBe('TP-58');
      expect(propertiesUpdatedSpy).toHaveBeenCalled();
    });
  });

  describe('统计信息', () => {
    it('应该正确统计打印次数', () => {
      printer.startPrint();
      printer.completePrint(true);
      printer.startPrint();
      printer.completePrint(false);
      printer.startPrint();
      printer.completePrint(true);

      expect(printer.totalPrintCount).toBe(3);
      expect(printer.successPrintCount).toBe(2);
      expect(printer.failedPrintCount).toBe(1);
    });

    it('应该重置统计信息', () => {
      printer.startPrint();
      printer.completePrint(true);

      const statisticsResetSpy = jest.fn();
      printer.on('statisticsReset', statisticsResetSpy);

      printer.resetStatistics();

      expect(printer.totalPrintCount).toBe(0);
      expect(printer.successPrintCount).toBe(0);
      expect(printer.failedPrintCount).toBe(0);
      expect(printer.lastPrintTime).toBeUndefined();
      expect(statisticsResetSpy).toHaveBeenCalled();
    });
  });

  describe('设备信息摘要', () => {
    it('应该提供完整的设备摘要', () => {
      printer.updateState(PrinterState.CONNECTED);
      printer.startPrint();
      printer.completePrint(true);

      const summary = printer.getSummary();

      expect(summary.id).toBe('test-printer');
      expect(summary.name).toBe('Test Printer');
      expect(summary.type).toBe(PrinterType.THERMAL);
      expect(summary.deviceId).toBe('device-123');
      expect(summary.state).toBe(PrinterState.CONNECTED);
      expect(summary.isConnected).toBe(true);
      expect(summary.isAvailable).toBe(true);
      expect(summary.isBusy).toBe(false);
      expect(summary.hasError).toBe(false);
      expect(summary.enabled).toBe(true);
      expect(summary.totalPrintCount).toBe(1);
      expect(summary.successPrintCount).toBe(1);
      expect(summary.failedPrintCount).toBe(0);
      expect(summary.lastPrintTime).toBeDefined();
    });
  });

  describe('JSON序列化', () => {
    it('应该正确序列化为JSON', () => {
      printer.updateState(PrinterState.CONNECTED);
      printer.setProperty('location', 'Office');

      const json = printer.toJSON();

      expect(json.id).toBe('test-printer');
      expect(json.name).toBe('Test Printer');
      expect(json.type).toBe(PrinterType.THERMAL);
      expect(json.deviceId).toBe('device-123');
      expect(json.state).toBe(PrinterState.CONNECTED);
      expect(json.enabled).toBe(true);
      expect(json.properties).toEqual({ location: 'Office' });
    });

    it('应该支持从JSON创建打印机', () => {
      const json = {
        id: 'json-printer',
        name: 'JSON Printer',
        type: PrinterType.THERMAL,
        deviceId: 'device-456',
        state: PrinterState.CONNECTED,
        capabilities: {
          supportsColor: false,
          supportsDuplex: false,
          maxPaperWidth: 58,
          maxPaperHeight: 200,
          supportedMediaTypes: ['thermal'],
          maxResolution: { width: 203, height: 203 },
          supportedCommands: ['print', 'cut', 'feed'],
          features: []
        },
        status: {
          state: PrinterState.CONNECTED,
          isConnected: true,
          isAvailable: true,
          isPrinting: false,
          hasError: false,
          hasPaper: true,
          hasInk: true,
          coverOpen: false,
          paperLevel: 100,
          inkLevel: 100,
          temperature: 25,
          signalStrength: -50
        },
        enabled: true,
        properties: { location: 'Office' },
        lastConnected: new Date().toISOString(),
        totalPrintCount: 5,
        successPrintCount: 4,
        failedPrintCount: 1
      };

      const printer = Printer.fromJSON(json);

      expect(printer.id).toBe('json-printer');
      expect(printer.name).toBe('JSON Printer');
      expect(printer.type).toBe(PrinterType.THERMAL);
      expect(printer.deviceId).toBe('device-456');
      expect(printer.state).toBe(PrinterState.CONNECTED);
      expect(printer.enabled).toBe(true);
      expect(printer.properties.location).toBe('Office');
      expect(printer.totalPrintCount).toBe(5);
      expect(printer.lastConnected).toBeDefined();
    });
  });

  describe('事件发射', () => {
    it('应该发射正确的事件', () => {
      const events = jest.fn();
      printer.on('printStarted', events);
      printer.on('printCompleted', events);
      printer.on('error', events);
      printer.on('paperOut', events);
      printer.on('inkOut', events);
      printer.on('coverOpened', events);
      printer.on('coverClosed', events);

      printer.startPrint();
      printer.completePrint(true);
      printer.setError('Test error');
      printer.clearError();
      printer.setPaperStatus(false);
      printer.setInkStatus(false);
      printer.setCoverStatus(true);
      printer.setCoverStatus(false);

      expect(events).toHaveBeenCalledTimes(9);
    });
  });

  describe('边界情况', () => {
    it('应该处理空设备名称', () => {
      const printer = new Printer('test', '', PrinterType.THERMAL, 'device');
      expect(printer.name).toBe('');
    });

    it('应该处理多次完成打印', () => {
      printer.startPrint();
      printer.completePrint(true);
      printer.startPrint();
      printer.completePrint(true);

      expect(printer.totalPrintCount).toBe(2);
      expect(printer.successPrintCount).toBe(2);
    });

    it('应该处理重复状态更新', () => {
      const stateChangeSpy = jest.fn();
      printer.on('stateChanged', stateChangeSpy);

      printer.updateState(PrinterState.CONNECTED);
      printer.updateState(PrinterState.CONNECTED);

      expect(stateChangeSpy).toHaveBeenCalledTimes(2);
    });

    it('应该处理重复错误设置', () => {
      printer.setError('Error 1');
      printer.setError('Error 2');

      expect(printer.status.errorMessage).toBe('Error 2');
    });
  });
});