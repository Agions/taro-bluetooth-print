/**
 * Printer Drivers Module
 * 打印机驱动模块 - 支持多种打印机协议
 */

export { EscPos, type EscPosOptions } from './EscPos';

export { GPrinterDriver, type GPrinterOptions } from './GPrinterDriver';

export {
  TsplDriver,
  type LabelSize,
  type TextOptions,
  type BarcodeOptions,
  type QRCodeOptions,
  type BoxOptions,
  type LineOptions,
} from './TsplDriver';

export {
  ZplDriver,
  type ZplLabelSize,
  type ZplTextOptions,
  type ZplBarcodeOptions,
  type ZplQRCodeOptions,
  type ZplBoxOptions,
} from './ZplDriver';

export {
  CpclDriver,
  type CPCLPageSize,
  type CpclTextOptions,
  type CpclBarcodeOptions,
  type CpclQRCodeOptions,
  type CpclLineOptions,
  type CpclBoxOptions,
} from './CpclDriver';
