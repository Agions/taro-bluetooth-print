/**
 * Encoding Service Module
 * 编码服务模块 - 负责字符集转换 (GBK, GB2312, Big5, UTF-8)
 */

export {
  EncodingService,
  encodingService,
  type EncodingConfig,
  type EncodingResult,
  type SupportedEncoding,
} from './EncodingService';

export {
  unicodeToGbk,
  gbkToUnicode,
  unicodeToBig5,
  big5ToUnicode,
  getGbkBytes,
  getUnicodeFromGbk,
  getBig5Bytes,
  isAscii,
  isCjk,
  isChinesePunctuation,
} from './gbk-table';
