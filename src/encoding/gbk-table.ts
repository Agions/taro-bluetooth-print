/**
 * GBK Encoding Table
 *
 * This module provides character mapping tables for GBK, GB2312, and Big5 encodings.
 * GBK is a superset of GB2312 and covers most Chinese characters used in simplified Chinese.
 * Big5 is used for traditional Chinese characters.
 *
 * GBK encoding uses double-byte encoding for Chinese characters:
 * - First byte: 0x81-0xFE
 * - Second byte: 0x40-0xFE (excluding 0x7F)
 */

/**
 * Unicode to GBK mapping table
 * Maps Unicode code points to GBK byte pairs
 */
export const unicodeToGbk: Map<number, number> = new Map();

/**
 * GBK to Unicode mapping table
 * Maps GBK byte pairs to Unicode code points
 */
export const gbkToUnicode: Map<number, number> = new Map();

/**
 * Unicode to Big5 mapping table
 */
export const unicodeToBig5: Map<number, number> = new Map();

/**
 * Big5 to Unicode mapping table
 */
export const big5ToUnicode: Map<number, number> = new Map();

/**
 * Common Chinese punctuation and symbols mapping (GBK)
 * These are frequently used and included directly for performance
 */
const commonGbkMappings: Array<[number, number]> = [
  // Punctuation
  [0x3002, 0xa1a3], // 。
  [0xff0c, 0xa3ac], // ，
  [0x3001, 0xa1a2], // 、
  [0xff1b, 0xa3bb], // ；
  [0xff1a, 0xa3ba], // ：
  [0xff1f, 0xa3bf], // ？
  [0xff01, 0xa3a1], // ！
  [0x2026, 0xa1ad], // …
  [0x2014, 0xa1aa], // —
  [0x2018, 0xa1ae], // '
  [0x2019, 0xa1af], // '
  [0x201c, 0xa1b0], // "
  [0x201d, 0xa1b1], // "
  [0xff08, 0xa3a8], // （
  [0xff09, 0xa3a9], // ）
  [0x3010, 0xa1be], // 【
  [0x3011, 0xa1bf], // 】
  [0x300a, 0xa1b6], // 《
  [0x300b, 0xa1b7], // 》
  // Common symbols
  [0xffe5, 0xa3a4], // ￥
  [0x00b7, 0xa1a4], // ·
];

// Initialize common mappings
for (const [unicode, gbk] of commonGbkMappings) {
  unicodeToGbk.set(unicode, gbk);
  gbkToUnicode.set(gbk, unicode);
}

/**
 * Generate GBK mappings for GB2312 Level 1 Chinese characters (3755 characters)
 * These are the most commonly used simplified Chinese characters
 * Range: 0xB0A1-0xF7FE
 */
function initializeGb2312Level1(): void {
  // GB2312 Level 1 starts at Unicode 0x4E00 region
  // This is a simplified mapping - in production, use a complete table

  // Common characters mapping (subset for demonstration)
  // In a real implementation, this would be a complete 3755+ character table
  const gb2312Level1: Array<[string, number]> = [
    ['啊', 0xb0a1],
    ['阿', 0xb0a2],
    ['埃', 0xb0a3],
    ['挨', 0xb0a4],
    ['哎', 0xb0a5],
    ['唉', 0xb0a6],
    ['哀', 0xb0a7],
    ['皑', 0xb0a8],
    ['癌', 0xb0a9],
    ['蔼', 0xb0aa],
    ['矮', 0xb0ab],
    ['艾', 0xb0ac],
    ['碍', 0xb0ad],
    ['爱', 0xb0ae],
    ['隘', 0xb0af],
    ['鞍', 0xb0b0],
    ['氨', 0xb0b1],
    ['安', 0xb0b2],
    ['俺', 0xb0b3],
    ['按', 0xb0b4],
    ['暗', 0xb0b5],
    ['岸', 0xb0b6],
    ['胺', 0xb0b7],
    ['案', 0xb0b8],
    ['肮', 0xb0b9],
    ['昂', 0xb0ba],
    ['盎', 0xb0bb],
    ['凹', 0xb0bc],
    ['敖', 0xb0bd],
    ['熬', 0xb0be],
    ['翱', 0xb0bf],
    ['袄', 0xb0c0],
    ['傲', 0xb0c1],
    ['奥', 0xb0c2],
    ['懊', 0xb0c3],
    ['澳', 0xb0c4],
    ['芭', 0xb0c5],
    ['捌', 0xb0c6],
    ['扒', 0xb0c7],
    ['叭', 0xb0c8],
    ['吧', 0xb0c9],
    ['笆', 0xb0ca],
    ['八', 0xb0cb],
    ['疤', 0xb0cc],
    ['巴', 0xb0cd],
    ['拔', 0xb0ce],
    ['跋', 0xb0cf],
    ['靶', 0xb0d0],
    ['把', 0xb0d1],
    ['耙', 0xb0d2],
    ['坝', 0xb0d3],
    ['霸', 0xb0d4],
    ['罢', 0xb0d5],
    ['爸', 0xb0d6],
    ['白', 0xb0d7],
    ['柏', 0xb0d8],
    ['百', 0xb0d9],
    ['摆', 0xb0da],
    ['佰', 0xb0db],
    ['败', 0xb0dc],
    ['拜', 0xb0dd],
    ['稗', 0xb0de],
    ['斑', 0xb0df],
    ['班', 0xb0e0],
    ['搬', 0xb0e1],
    ['扳', 0xb0e2],
    ['般', 0xb0e3],
    ['颁', 0xb0e4],
    ['板', 0xb0e5],
    ['版', 0xb0e6],
    ['扮', 0xb0e7],
    ['拌', 0xb0e8],
    ['伴', 0xb0e9],
    ['瓣', 0xb0ea],
    ['半', 0xb0eb],
    ['办', 0xb0ec],
    ['绊', 0xb0ed],
    ['邦', 0xb0ee],
    ['帮', 0xb0ef],
    ['梆', 0xb0f0],
    ['榜', 0xb0f1],
    ['膀', 0xb0f2],
    ['绑', 0xb0f3],
    ['棒', 0xb0f4],
    ['磅', 0xb0f5],
    ['蚌', 0xb0f6],
    ['镑', 0xb0f7],
    ['傍', 0xb0f8],
    ['谤', 0xb0f9],
    ['苞', 0xb0fa],
    ['胞', 0xb0fb],
    ['包', 0xb0fc],
    ['褒', 0xb0fd],
    ['剥', 0xb0fe],
    // B1 section
    ['薄', 0xb1a1],
    ['雹', 0xb1a2],
    ['保', 0xb1a3],
    ['堡', 0xb1a4],
    ['饱', 0xb1a5],
    ['宝', 0xb1a6],
    ['抱', 0xb1a7],
    ['报', 0xb1a8],
    ['暴', 0xb1a9],
    ['豹', 0xb1aa],
    ['鲍', 0xb1ab],
    ['爆', 0xb1ac],
    ['杯', 0xb1ad],
    ['碑', 0xb1ae],
    ['悲', 0xb1af],
    ['卑', 0xb1b0],
    ['北', 0xb1b1],
    ['辈', 0xb1b2],
    ['背', 0xb1b3],
    ['贝', 0xb1b4],
    ['钡', 0xb1b5],
    ['倍', 0xb1b6],
    ['狈', 0xb1b7],
    ['备', 0xb1b8],
    ['惫', 0xb1b9],
    ['焙', 0xb1ba],
    ['被', 0xb1bb],
    ['奔', 0xb1bc],
    ['苯', 0xb1bd],
    ['本', 0xb1be],
    ['笨', 0xb1bf],
    ['崩', 0xb1c0],
    ['绑', 0xb1c1],
    ['甭', 0xb1c2],
    ['泵', 0xb1c3],
    ['蹦', 0xb1c4],
    ['迸', 0xb1c5],
    ['逼', 0xb1c6],
    ['鼻', 0xb1c7],
    ['比', 0xb1c8],
    ['鄙', 0xb1c9],
    ['笔', 0xb1ca],
    ['彼', 0xb1cb],
    ['碧', 0xb1cc],
    ['蓖', 0xb1cd],
    ['蔽', 0xb1ce],
    ['毕', 0xb1cf],
    ['毙', 0xb1d0],
    ['毖', 0xb1d1],
    ['币', 0xb1d2],
    ['庇', 0xb1d3],
    ['痹', 0xb1d4],
    ['闭', 0xb1d5],
    ['敝', 0xb1d6],
    ['弊', 0xb1d7],
    ['必', 0xb1d8],
    ['辟', 0xb1d9],
    ['壁', 0xb1da],
    ['臂', 0xb1db],
    ['避', 0xb1dc],
    ['陛', 0xb1dd],
    ['鞭', 0xb1de],
    ['边', 0xb1df],
    ['编', 0xb1e0],
    ['贬', 0xb1e1],
    ['扁', 0xb1e2],
    ['便', 0xb1e3],
    ['变', 0xb1e4],
    ['卞', 0xb1e5],
    ['辨', 0xb1e6],
    ['辩', 0xb1e7],
    ['辫', 0xb1e8],
    ['遍', 0xb1e9],
    ['标', 0xb1ea],
    ['彪', 0xb1eb],
    ['膘', 0xb1ec],
    ['表', 0xb1ed],
    ['鳖', 0xb1ee],
    ['憋', 0xb1ef],
    ['别', 0xb1f0],
    ['瘪', 0xb1f1],
    ['彬', 0xb1f2],
    ['斌', 0xb1f3],
    ['濒', 0xb1f4],
    ['滨', 0xb1f5],
    ['宾', 0xb1f6],
    ['摈', 0xb1f7],
    ['兵', 0xb1f8],
    ['冰', 0xb1f9],
    ['柄', 0xb1fa],
    ['丙', 0xb1fb],
    ['秉', 0xb1fc],
    ['饼', 0xb1fd],
    ['炳', 0xb1fe],
  ];

  for (const [char, gbk] of gb2312Level1) {
    const unicode = char.charCodeAt(0);
    unicodeToGbk.set(unicode, gbk);
    gbkToUnicode.set(gbk, unicode);
  }
}

/**
 * Initialize additional common characters
 */
function initializeCommonCharacters(): void {
  // Very common characters that might not be in the basic table
  const commonChars: Array<[string, number]> = [
    // Numbers and basic punctuation in full-width
    ['０', 0xa3b0],
    ['１', 0xa3b1],
    ['２', 0xa3b2],
    ['３', 0xa3b3],
    ['４', 0xa3b4],
    ['５', 0xa3b5],
    ['６', 0xa3b6],
    ['７', 0xa3b7],
    ['８', 0xa3b8],
    ['９', 0xa3b9],
    // Common words
    ['的', 0xb5c4],
    ['一', 0xd2bb],
    ['是', 0xcac7],
    ['不', 0xb2bb],
    ['了', 0xc1cb],
    ['在', 0xd4da],
    ['人', 0xc8cb],
    ['有', 0xd3d0],
    ['我', 0xced2],
    ['他', 0xcbfb],
    ['这', 0xd5e2],
    ['个', 0xb8f6],
    ['们', 0xc3c7],
    ['中', 0xd6d0],
    ['来', 0xc0b4],
    ['上', 0xc9cf],
    ['大', 0xb4f3],
    ['为', 0xceaa],
    ['和', 0xbacd],
    ['国', 0xb9fa],
    ['地', 0xb5d8],
    ['到', 0xb5bd],
    ['以', 0xd2d4],
    ['说', 0xcbb5],
    ['时', 0xcab1],
    ['要', 0xd2aa],
    ['就', 0xbecd],
    ['出', 0xb3f6],
    ['会', 0xbbe1],
    ['可', 0xbfc9],
    ['也', 0xd2b2],
    ['你', 0xc4e3],
    ['对', 0xb6d4],
    ['生', 0xc9fa],
    ['能', 0xc4dc],
    ['而', 0xb6f8],
    ['子', 0xd7d3],
    ['那', 0xc4c7],
    ['得', 0xb5c3],
    ['于', 0xd3da],
    ['着', 0xd7c5],
    ['下', 0xcfc2],
    ['自', 0xd7d4],
    ['之', 0xd6ae],
    ['年', 0xc4ea],
    ['过', 0xb9fd],
    ['发', 0xb7a2],
    ['后', 0xbaf3],
    ['作', 0xd7f7],
    ['里', 0xc0ef],
    ['用', 0xd3c3],
    ['道', 0xb5c0],
    ['行', 0xd0d0],
    ['所', 0xcbf9],
    ['然', 0xc8bb],
    ['家', 0xbcd2],
    ['种', 0xd6d6],
    ['事', 0xcac2],
    ['成', 0xb3c9],
    ['方', 0xb7bd],
    ['多', 0xb6e0],
    ['经', 0xbead],
    ['么', 0xc3b4],
    ['去', 0xc8a5],
    ['法', 0xb7a8],
    ['学', 0xd1a7],
    ['如', 0xc8e7],
    ['都', 0xb6bc],
    ['同', 0xcdac],
    ['现', 0xcfd6],
    ['当', 0xb5b1],
    ['没', 0xc3bb],
    ['动', 0xb6af],
    ['面', 0xc3e6],
    ['起', 0xc6f0],
    ['看', 0xbfb4],
    ['定', 0xb6a8],
    ['天', 0xccec],
    ['分', 0xb7d6],
    ['还', 0xbbb9],
    ['进', 0xbdf8],
    ['好', 0xbac3],
    ['小', 0xd0a1],
    ['部', 0xb2bf],
    ['其', 0xc6e4],
    ['些', 0xd0a9],
    ['主', 0xd6f7],
    ['样', 0xd1f9],
    ['理', 0xc0ed],
    ['心', 0xd0c4],
    ['她', 0xcbfd],
    ['本', 0xb1be],
    ['前', 0xc7b0],
    ['开', 0xbfaa],
    ['但', 0xb5ab],
    ['因', 0xd2f2],
    ['只', 0xd6bb],
    ['从', 0xb4d3],
    ['想', 0xcfeb],
    ['实', 0xcab5],
    // Receipt/label common words
    ['店', 0xb5ea],
    ['铺', 0xc6cc],
    ['商', 0xc9cc],
    ['品', 0xc6b7],
    ['价', 0xbcdb],
    ['格', 0xb8f1],
    ['数', 0xcafd],
    ['量', 0xc1bf],
    ['合', 0xbacd],
    ['计', 0xbcc6],
    ['总', 0xd7dc],
    ['金', 0xbdf0],
    ['额', 0xb6ee],
    ['订', 0xb6a9],
    ['单', 0xb5a5],
    ['号', 0xbac5],
    ['日', 0xc8d5],
    ['期', 0xc6da],
    ['收', 0xcad5],
    ['银', 0xd2f8],
    ['员', 0xd4b1],
    ['找', 0xd5d2],
    ['零', 0xc1e3],
    ['付', 0xb8b6],
    ['款', 0xbfee],
    ['现', 0xcfd6],
    ['支', 0xd6a7],
    ['微', 0xcea2],
    ['信', 0xd0c5],
    ['宝', 0xb1a6],
    ['谢', 0xd0bb],
    ['光', 0xb9e2],
    ['临', 0xc1d9],
    ['欢', 0xbbb6],
    ['迎', 0xd3ad],
    ['再', 0xd4d9],
    ['次', 0xb4ce],
    ['惠', 0xbbdd],
    ['顾', 0xb9cb],
    // Food/product related
    ['食', 0xcab3],
    ['物', 0xceef],
    ['饮', 0xd2fb],
    ['料', 0xc1cf],
    ['水', 0xcbae],
    ['果', 0xb9fb],
    ['蔬', 0xcadf],
    ['菜', 0xb2cb],
    ['肉', 0xc8e2],
    ['鱼', 0xd3e3],
    ['米', 0xc3d7],
    ['面', 0xc3e6],
    ['油', 0xd3cd],
    ['盐', 0xd1ce],
    ['糖', 0xccc7],
    // Units
    ['元', 0xd4aa],
    ['角', 0xbdc7],
    ['分', 0xb7d6],
    ['斤', 0xbdef],
    ['克', 0xbfcb],
    ['千', 0xc7a7],
    ['万', 0xcdf2],
    ['亿', 0xd2da],
    ['个', 0xb8f6],
    ['件', 0xbcfe],
    ['份', 0xb7dd],
    ['包', 0xb0fc],
    ['袋', 0xb4fc],
    ['盒', 0xbad0],
    ['瓶', 0xc6bf],
    ['杯', 0xb1ad],
    ['碗', 0xcdeb],
    ['盘', 0xc5cc],
  ];

  for (const [char, gbk] of commonChars) {
    const unicode = char.charCodeAt(0);
    if (!unicodeToGbk.has(unicode)) {
      unicodeToGbk.set(unicode, gbk);
      gbkToUnicode.set(gbk, unicode);
    }
  }
}

/**
 * Initialize Big5 common characters for traditional Chinese
 */
function initializeBig5Common(): void {
  const big5Chars: Array<[string, number]> = [
    // Common traditional Chinese characters
    ['的', 0xa4de],
    ['一', 0xa440],
    ['是', 0xac4f],
    ['不', 0xa4a3],
    ['了', 0xa4f4],
    ['在', 0xa658],
    ['人', 0xa4a8],
    ['有', 0xa6b3],
    ['我', 0xa7da],
    ['他', 0xa5b0],
    ['這', 0xb3e4],
    ['個', 0xad50],
    ['們', 0xadcc],
    ['中', 0xa4a4],
    ['來', 0xa8d3],
    ['上', 0xa4f8],
    ['大', 0xa4a6],
    ['為', 0xac50],
    ['和', 0xa940],
    ['國', 0xb0f8],
    // Traditional specific
    ['臺', 0xbbcf],
    ['灣', 0xc6fa],
    ['學', 0xbe78],
    ['電', 0xb9f6],
    ['腦', 0xb8a6],
    ['網', 0xba59],
    ['際', 0xbf50],
    ['機', 0xbf5a],
    ['關', 0xc340],
    ['開', 0xb6aa],
  ];

  for (const [char, big5] of big5Chars) {
    const unicode = char.charCodeAt(0);
    if (!unicodeToBig5.has(unicode)) {
      unicodeToBig5.set(unicode, big5);
      big5ToUnicode.set(big5, unicode);
    }
  }
}

// Initialize all tables
initializeGb2312Level1();
initializeCommonCharacters();
initializeBig5Common();

/**
 * Get GBK bytes for a Unicode character
 * @param unicode - Unicode code point
 * @returns GBK byte pair or null if not found
 */
export function getGbkBytes(unicode: number): [number, number] | null {
  const gbk = unicodeToGbk.get(unicode);
  if (gbk !== undefined) {
    return [(gbk >> 8) & 0xff, gbk & 0xff];
  }
  return null;
}

/**
 * Get Unicode character from GBK bytes
 * @param high - High byte
 * @param low - Low byte
 * @returns Unicode code point or null if not found
 */
export function getUnicodeFromGbk(high: number, low: number): number | null {
  const gbk = (high << 8) | low;
  return gbkToUnicode.get(gbk) ?? null;
}

/**
 * Get Big5 bytes for a Unicode character
 * @param unicode - Unicode code point
 * @returns Big5 byte pair or null if not found
 */
export function getBig5Bytes(unicode: number): [number, number] | null {
  const big5 = unicodeToBig5.get(unicode);
  if (big5 !== undefined) {
    return [(big5 >> 8) & 0xff, big5 & 0xff];
  }
  return null;
}

/**
 * Check if a character is in the ASCII range
 * @param code - Unicode code point
 * @returns true if ASCII
 */
export function isAscii(code: number): boolean {
  return code >= 0x00 && code <= 0x7f;
}

/**
 * Check if a character is a CJK character
 * @param code - Unicode code point
 * @returns true if CJK
 */
export function isCjk(code: number): boolean {
  return (
    (code >= 0x4e00 && code <= 0x9fff) || // CJK Unified Ideographs
    (code >= 0x3400 && code <= 0x4dbf) || // CJK Unified Ideographs Extension A
    (code >= 0x20000 && code <= 0x2a6df) || // CJK Unified Ideographs Extension B
    (code >= 0x2a700 && code <= 0x2b73f) || // CJK Unified Ideographs Extension C
    (code >= 0x2b740 && code <= 0x2b81f) || // CJK Unified Ideographs Extension D
    (code >= 0xf900 && code <= 0xfaff) || // CJK Compatibility Ideographs
    (code >= 0x2f800 && code <= 0x2fa1f) // CJK Compatibility Ideographs Supplement
  );
}

/**
 * Check if a character is a Chinese punctuation mark
 * @param code - Unicode code point
 * @returns true if Chinese punctuation
 */
export function isChinesePunctuation(code: number): boolean {
  return (
    (code >= 0x3000 && code <= 0x303f) || // CJK Symbols and Punctuation
    (code >= 0xff00 && code <= 0xffef) // Halfwidth and Fullwidth Forms
  );
}
