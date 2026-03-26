/**
 * Encoding Service Module
 * 编码服务模块 - 负责字符集转换 (GBK, GB2312, Big5, EUC-KR, Shift-JIS, ISO-2022-JP, UTF-8)
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

export {
  encodeHangulSyllable,
  isKoreanHangul,
  isKoreanHanja,
  isKoreanJamo,
  unicodeToShiftJisHiragana,
  unicodeToShiftJisKatakana,
  isJapaneseHiragana,
  isJapaneseKatakana,
  isJapaneseKanji,
  ISO2022JP_ESC_ASCII,
  ISO2022JP_ESC_JIS0208,
  requiresJisX0208Escape,
  isJisX0201Katakana,
} from './korean-japanese';
