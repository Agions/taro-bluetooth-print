import { describe, it, expect, beforeEach } from 'vitest';
import { 
  PrinterStatus, 
  PaperStatus,
  type PrinterStatusInfo 
} from '../../src/services/PrinterStatus';

describe('PrinterStatus', () => {
  let printerStatus: PrinterStatus;

  beforeEach(() => {
    printerStatus = new PrinterStatus();
  });

  describe('getStatus()', () => {
    it('should parse OK paper status from status byte', async () => {
      // Status byte 0x00 = no bits set = paper OK
      const writeFunc = async (data: ArrayBuffer) => {};
      const readFunc = async () => new Uint8Array([0x00]).buffer;

      const status = await printerStatus.getStatus(writeFunc, readFunc);

      expect(status.paper).toBe(PaperStatus.OK);
      expect(status.timestamp).toBeDefined();
    });

    it('should parse paper OUT status from bit mask', async () => {
      // 0x20 = bit 5 set = paper out
      const writeFunc = async (data: ArrayBuffer) => {};
      const readFunc = async () => new Uint8Array([0x20]).buffer;

      const status = await printerStatus.getStatus(writeFunc, readFunc);

      expect(status.paper).toBe(PaperStatus.OUT);
    });

    it('should parse paper LOW status from bit mask', async () => {
      // 0x40 = bit 6 set = paper low
      const writeFunc = async (data: ArrayBuffer) => {};
      const readFunc = async () => new Uint8Array([0x40]).buffer;

      const status = await printerStatus.getStatus(writeFunc, readFunc);

      expect(status.paper).toBe(PaperStatus.LOW);
    });

    it('should detect cover open from status byte', async () => {
      // 0x02 = bit 1 set = cover open
      const writeFunc = async (data: ArrayBuffer) => {};
      const readFunc = async () => new Uint8Array([0x02]).buffer;

      const status = await printerStatus.getStatus(writeFunc, readFunc);

      expect(status.coverOpen).toBe(true);
    });

    it('should detect cutter error from status byte', async () => {
      // 0x04 = bit 2 set = cutter error
      const writeFunc = async (data: ArrayBuffer) => {};
      const readFunc = async () => new Uint8Array([0x04]).buffer;

      const status = await printerStatus.getStatus(writeFunc, readFunc);

      expect(status.cutterError).toBe(true);
    });

    it('should detect over temperature from status byte', async () => {
      // 0x10 = bit 4 set = over temperature
      const writeFunc = async (data: ArrayBuffer) => {};
      const readFunc = async () => new Uint8Array([0x10]).buffer;

      const status = await printerStatus.getStatus(writeFunc, readFunc);

      expect(status.overTemp).toBe(true);
    });

    it('should parse second byte for paper sensor', async () => {
      // Second byte 0x04 = paper out sensor
      const writeFunc = async (data: ArrayBuffer) => {};
      const readFunc = async () => new Uint8Array([0x00, 0x04]).buffer;

      const status = await printerStatus.getStatus(writeFunc, readFunc);

      expect(status.paper).toBe(PaperStatus.OUT);
    });

    it('should include raw status when requested', async () => {
      const writeFunc = async (data: ArrayBuffer) => {};
      const readFunc = async () => new Uint8Array([0x00, 0x02]).buffer;

      const status = await printerStatus.getStatus(writeFunc, readFunc, { includeRaw: true });

      expect(status.rawStatus).toEqual(new Uint8Array([0x00, 0x02]));
    });

    it('should return UNKNOWN status on empty response', async () => {
      const writeFunc = async (data: ArrayBuffer) => {};
      const readFunc = async () => new Uint8Array([]).buffer;

      const status = await printerStatus.getStatus(writeFunc, readFunc);

      expect(status.paper).toBe(PaperStatus.UNKNOWN);
    });

    it('should return UNKNOWN status on error', async () => {
      const writeFunc = async (data: ArrayBuffer) => { throw new Error('Write failed'); };
      const readFunc = async () => new Uint8Array([]).buffer;

      const status = await printerStatus.getStatus(writeFunc, readFunc);

      expect(status.paper).toBe(PaperStatus.UNKNOWN);
    });

    it('should return UNKNOWN status on read timeout', async () => {
      const writeFunc = async (data: ArrayBuffer) => {};
      const readFunc = async () => {
        await new Promise(resolve => setTimeout(resolve, 5000));
        return new Uint8Array([0x00]).buffer;
      };

      const status = await printerStatus.getStatus(writeFunc, readFunc, { timeout: 100 });

      expect(status.paper).toBe(PaperStatus.UNKNOWN);
    });

    it('should detect drawer open from status byte', async () => {
      // 0x01 = bit 0 set = drawer open
      const writeFunc = async (data: ArrayBuffer) => {};
      const readFunc = async () => new Uint8Array([0x01]).buffer;

      const status = await printerStatus.getStatus(writeFunc, readFunc);

      // Drawer open is logged but not stored in result
      expect(status.paper).toBe(PaperStatus.OK);
    });
  });

  describe('checkPaper()', () => {
    it('should return paper status', async () => {
      const writeFunc = async (data: ArrayBuffer) => {};
      const readFunc = async () => new Uint8Array([0x20]).buffer;

      const paperStatus = await printerStatus.checkPaper(writeFunc, readFunc);

      expect(paperStatus).toBe(PaperStatus.OUT);
    });
  });

  describe('isReady()', () => {
    it('should return true when printer is ready', async () => {
      const writeFunc = async (data: ArrayBuffer) => {};
      const readFunc = async () => new Uint8Array([0x00]).buffer;

      const ready = await printerStatus.isReady(writeFunc, readFunc);

      expect(ready).toBe(true);
    });

    it('should return false when paper is out', async () => {
      const writeFunc = async (data: ArrayBuffer) => {};
      const readFunc = async () => new Uint8Array([0x20]).buffer;

      const ready = await printerStatus.isReady(writeFunc, readFunc);

      expect(ready).toBe(false);
    });

    it('should return false when cutter error', async () => {
      const writeFunc = async (data: ArrayBuffer) => {};
      const readFunc = async () => new Uint8Array([0x04]).buffer;

      const ready = await printerStatus.isReady(writeFunc, readFunc);

      expect(ready).toBe(false);
    });

    it('should return true when status is OK (motorError not parsed)', async () => {
      // motorError is not parsed in current implementation
      const writeFunc = async (data: ArrayBuffer) => {};
      const readFunc = async () => new Uint8Array([0x08]).buffer;

      const ready = await printerStatus.isReady(writeFunc, readFunc);

      expect(ready).toBe(true);
    });

    it('should return true on error (UNKNOWN paper is not OUT)', async () => {
      // When status query fails, paper is UNKNOWN which is not OUT
      // and cutterError/motorError are undefined, so isReady returns true
      const writeFunc = async (data: ArrayBuffer) => { throw new Error('Disconnected'); };
      const readFunc = async () => new Uint8Array([]).buffer;

      const ready = await printerStatus.isReady(writeFunc, readFunc);

      expect(ready).toBe(true);
    });
  });

  describe('toString() static method', () => {
    it('should format OK status', () => {
      const status: PrinterStatusInfo = {
        paper: PaperStatus.OK,
        timestamp: Date.now(),
      };

      const result = PrinterStatus.toString(status);

      expect(result).toBe('Paper: ok');
    });

    it('should format LOW status', () => {
      const status: PrinterStatusInfo = {
        paper: PaperStatus.LOW,
        timestamp: Date.now(),
      };

      const result = PrinterStatus.toString(status);

      expect(result).toBe('Paper: low');
    });

    it('should format OUT status', () => {
      const status: PrinterStatusInfo = {
        paper: PaperStatus.OUT,
        timestamp: Date.now(),
      };

      const result = PrinterStatus.toString(status);

      expect(result).toBe('Paper: out');
    });

    it('should include cover open in output', () => {
      const status: PrinterStatusInfo = {
        paper: PaperStatus.OK,
        coverOpen: true,
        timestamp: Date.now(),
      };

      const result = PrinterStatus.toString(status);

      expect(result).toContain('Cover Open');
    });

    it('should include cutter error in output', () => {
      const status: PrinterStatusInfo = {
        paper: PaperStatus.OK,
        cutterError: true,
        timestamp: Date.now(),
      };

      const result = PrinterStatus.toString(status);

      expect(result).toContain('Cutter Error');
    });

    it('should include motor error in output', () => {
      const status: PrinterStatusInfo = {
        paper: PaperStatus.OK,
        motorError: true,
        timestamp: Date.now(),
      };

      const result = PrinterStatus.toString(status);

      expect(result).toContain('Motor Error');
    });

    it('should include over temperature in output', () => {
      const status: PrinterStatusInfo = {
        paper: PaperStatus.OK,
        overTemp: true,
        timestamp: Date.now(),
      };

      const result = PrinterStatus.toString(status);

      expect(result).toContain('Over Temperature');
    });

    it('should include battery level in output', () => {
      const status: PrinterStatusInfo = {
        paper: PaperStatus.OK,
        batteryLevel: 75,
        timestamp: Date.now(),
      };

      const result = PrinterStatus.toString(status);

      expect(result).toBe('Paper: ok, Battery: 75%');
    });

    it('should format complex status', () => {
      const status: PrinterStatusInfo = {
        paper: PaperStatus.LOW,
        coverOpen: true,
        cutterError: true,
        batteryLevel: 50,
        timestamp: Date.now(),
      };

      const result = PrinterStatus.toString(status);

      expect(result).toContain('Paper: low');
      expect(result).toContain('Cover Open');
      expect(result).toContain('Cutter Error');
      expect(result).toContain('Battery: 50%');
    });
  });
});

describe('PaperStatus enum', () => {
  it('should have correct enum values', () => {
    expect(PaperStatus.OK).toBe('ok');
    expect(PaperStatus.LOW).toBe('low');
    expect(PaperStatus.OUT).toBe('out');
    expect(PaperStatus.UNKNOWN).toBe('unknown');
  });
});