/**
 * Korean & Japanese Encoding Tables
 *
 * Provides character mapping support for:
 * - EUC-KR (Korean) - KS X 1001/1003 encoding
 * - Shift-JIS (Japanese) - JIS X 0201/0208 encoding
 * - ISO-2022-JP (Japanese) - JIS encoding with escape sequences
 *
 * Note: For full coverage, these use TextEncoder/TextDecoder as the primary
 * implementation since they provide native support in modern environments.
 * The mapping tables here serve as reference and fallback.
 */

// ============================================================================
// EUC-KR (Korean) Constants
// ============================================================================

/**
 * KS X 1001 (Hangul) code range in EUC-KR:
 * First byte: 0xB0-0xC8 (128-200)
 * Second byte: 0xA1-0xFE (161-254)
 *
 * KS X 1003 (Hanja) code range in EUC-KR:
 * First byte: 0xCA-0xFD
 * Second byte: 0xA1-0xFE
 */

// Korean Hangul Syllables (U+AC00 - U+D7AF)
// These are composed syllables that map to EUC-KR precomposed forms
export const HANGUL_SYLLABLE_OFFSET = 0xac00;
export const HANGUL_INITIAL_COUNT = 21; // 19 initials × 21 vowels
export const HANGUL_MEDIAL_COUNT = 21;
export const HANGUL_FINAL_COUNT = 28;

// ============================================================================
// Shift-JIS (Japanese) Constants
// ============================================================================

/**
 * JIS X 0201 (Half-width Katakana):
 * First byte: 0xA1-0xDF (single-byte)
 *
 * JIS X 0208 (Kanji):
 * First byte: 0x81-0x9F (low) or 0xE0-0xEF (high)
 * Second byte: 0x40-0x7E (low) or 0x80-0xFC (high)
 *
 * JIS X 0212 (Supplementary Kanji):
 * First byte: 0xE0-0xEA
 * Second byte: 0x40-0x7E or 0x80-0xFC
 */

// JIS X 0201 Katakana range
export const SHIFT_JIS_KATAKANA_START = 0xa1;
export const SHIFT_JIS_KATAKANA_END = 0xdf;

// JIS X 0208 Kanji regions
export const SHIFT_JIS_KANJI_LOW_START = 0x81;
export const SHIFT_JIS_KANJI_LOW_END = 0x9f;
export const SHIFT_JIS_KANJI_HIGH_START = 0xe0;
export const SHIFT_JIS_KANJI_HIGH_END = 0xef;

// JIS non-pictorial (Kanji) area
export const SHIFT_JIS_KANJI_SECOND_MIN = 0x40;
export const SHIFT_JIS_KANJI_SECOND_MAX = 0xfc;

// ============================================================================
// Character Classification Helpers
// ============================================================================

/**
 * Check if a Unicode code point is a Korean Hangul syllable
 */
export function isKoreanHangul(code: number): boolean {
  return code >= 0xac00 && code <= 0xd7af;
}

/**
 * Check if a Unicode code point is a Korean Hanja (Hanja)
 */
export function isKoreanHanja(code: number): boolean {
  return (
    (code >= 0x4e00 && code <= 0x9fff) ||
    (code >= 0xf900 && code <= 0xfaff) ||
    (code >= 0x3400 && code <= 0x4dbf)
  );
}

/**
 * Check if a Unicode code point is basic Korean (Hangul Jamo)
 */
export function isKoreanJamo(code: number): boolean {
  return (
    (code >= 0x1100 && code <= 0x11ff) ||
    (code >= 0x3130 && code <= 0x318f) ||
    (code >= 0xffa0 && code <= 0xffdf)
  );
}

/**
 * Check if a code point is Japanese Hiragana
 */
export function isJapaneseHiragana(code: number): boolean {
  return code >= 0x3040 && code <= 0x309f;
}

/**
 * Check if a code point is Japanese Katakana (full-width)
 */
export function isJapaneseKatakana(code: number): boolean {
  return code >= 0x30a0 && code <= 0x30ff;
}

/**
 * Check if a code point is Japanese Kanji (CJK Unified Ideographs in Japanese range)
 */
export function isJapaneseKanji(code: number): boolean {
  // JIS X 0208 Kanji coverage in Unicode
  // Common: U+4E00-U+9FFF (with many gaps)
  // Extended A: U+3400-U+4DBF
  // Extended B: U+20000-U+2A6DF (not supported)
  return (
    (code >= 0x4e00 && code <= 0x9fff) ||
    (code >= 0x3400 && code <= 0x4dbf) ||
    (code >= 0xf900 && code <= 0xfaff)
  );
}

// ============================================================================
// EUC-KR Encoding Functions
// ============================================================================

/**
 * Encode a Hangul syllable to EUC-KR bytes
 *
 * Hangul syllables in Unicode are algorithmically decomposable:
 * 1. Syllable = 0xAC00 + (initial × 21 + medial) × 28 + final
 * 2. We decompose to lead, vowel, trail
 * 3. Then convert to EUC-KR lead/trail bytes
 */
export function encodeHangulSyllable(code: number): [number, number] | null {
  if (!isKoreanHangul(code)) {
    return null;
  }

  // Decompose the syllable
  const syllableIndex = code - HANGUL_SYLLABLE_OFFSET;

  // Calculate leading consonant (initial), vowel (medial), trailing consonant (final)
  const leadingConsonant = Math.floor(syllableIndex / (HANGUL_MEDIAL_COUNT * HANGUL_FINAL_COUNT));
  const vowelIndex = Math.floor(
    (syllableIndex % (HANGUL_MEDIAL_COUNT * HANGUL_FINAL_COUNT)) / HANGUL_FINAL_COUNT
  );
  const trailingConsonant = syllableIndex % HANGUL_FINAL_COUNT;

  // Lead consonants: ㄱㄴㄷㄹㅁㅂㅅㅇㅈㅊㅋㅌㅍㅎ (14 consonants)
  const LEAD_CONSONANTS = [
    0x81, 0x82, 0x84, 0x85, 0x88, 0x8a, 0x8b, 0x8c, 0x8d, 0x8e, 0x8f, 0x90, 0x91, 0x92,
  ];
  // Vowels: ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ (21 vowels)
  const VOWELS = [
    0xa1, 0xa2, 0xa3, 0xa4, 0xa5, 0xa6, 0xa7, 0xa8, 0xa9, 0xaa, 0xab, 0xac, 0xad, 0xae, 0xaf, 0xb0,
    0xb1, 0xb2, 0xb3, 0xb4, 0xb5,
  ];
  // Trail consonants (finals): ㄱㄲㄳㄴㄵㄶㄷㄹㄺㄻㄼㄽㄾㄿㅀㅁㅂㅄㅅㅆㅇㅈㅊㅋㅌㅍㅎ (27 finals, 0=none)
  const TRAIL_CONSONANTS: number[] = [
    0x00, // No final
    0x81,
    0x82,
    0x83,
    0x84,
    0x85,
    0x86,
    0x87,
    0x88,
    0x89,
    0x8a,
    0x8b,
    0x8c,
    0x8d,
    0x8e,
    0x8f,
    0x90,
    0x91,
    0x92,
    0x93,
    0x94,
    0x95,
    0x96,
    0x97,
    0x98,
    0x99,
    0x9a,
    0x9b,
  ];

  if (leadingConsonant >= LEAD_CONSONANTS.length) return null;
  if (vowelIndex >= VOWELS.length) return null;

  const lead = LEAD_CONSONANTS[leadingConsonant]!;
  // medial is available but EUC-KR uses algorithmic mapping for syllables
  void VOWELS[vowelIndex];

  let trail = 0x00;
  if (trailingConsonant > 0 && trailingConsonant < TRAIL_CONSONANTS.length) {
    const trailVal = TRAIL_CONSONANTS[trailingConsonant];
    if (trailVal !== undefined) {
      trail = trailVal;
    }
  }

  // EUC-KR Hangul range: 0xB0A1-0xC8FE
  const leadByte = lead;
  const trailByte = trail !== 0x00 ? trail : 0x00;

  // For syllables without final, use simple lead+vowel encoding
  if (trail === 0x00) {
    // Map to EUC-KR compatible range
    const row = Math.floor((lead - 0x81) * 21 + vowelIndex);
    const eucLead = 0xb0 + Math.floor(row / 0x5e);
    const eucTrail = 0xa1 + (row % 0x5e);
    return [eucLead & 0xff, eucTrail & 0xff];
  }

  return [leadByte, trailByte];
}

// ============================================================================
// Shift-JIS Encoding Functions
// ============================================================================

/**
 * Convert Unicode Hiragana to Shift-JIS
 * U+3040-309F → 0x829F-0x82F1 (simplified mapping)
 */
export function unicodeToShiftJisHiragana(code: number): [number, number] | null {
  if (code >= 0x3040 && code <= 0x309f) {
    const offset = code - 0x3040;
    // JIS X 0201 Hiragana range
    const jisLead = 0x82;
    const jisTrail = 0x9f + offset;
    return [jisLead, jisTrail & 0xff];
  }
  return null;
}

/**
 * Convert Unicode Katakana to Shift-JIS
 * U+30A0-30FF → 0x8340-0x8396 (full-width Katakana)
 */
export function unicodeToShiftJisKatakana(code: number): [number, number] | null {
  if (code >= 0x30a0 && code <= 0x30ff) {
    const offset = code - 0x30a0;
    const jisLead = 0x83;
    const jisTrail = 0x40 + offset;
    return [jisLead, jisTrail & 0xff];
  }
  return null;
}

/**
 * Convert half-width Katakana to Shift-JIS
 * U+FF61-U+FF9F → 0xA1-0xDF
 */
export function unicodeToHalfWidthKatakana(code: number): number | null {
  if (code >= 0xff61 && code <= 0xff9f) {
    return code - 0xff61 + 0xa1;
  }
  return null;
}

/**
 * Check if a code point is in JIS X 0208 range and estimate its Shift-JIS position
 * This is a simplified heuristic - full conversion requires large tables
 */
export function isInJisX0208Range(code: number): boolean {
  // Level 1 and Level 2 Kanji
  return (code >= 0x4e00 && code <= 0x9fff) || (code >= 0x3400 && code <= 0x4dbf);
}

// ============================================================================
// ISO-2022-JP Constants
// ============================================================================

/**
 * ISO-2022-JP (JIS X 4081) escape sequences:
 * - ESC ( B - ASCII
 * - ESC ( J - JIS X 0201 Roman
 * - ESC $ B - JIS X 0208
 * - ESC $ @ - JIS X 0208:1983 (old)
 * - ESC $ D - JIS X 0208:1990 (new)
 * - ESC $ ( C - JIS X 0212 supplementary
 */

/**
 * ISO-2022-JP escape sequences
 */
export const ISO2022JP_ESC_ASCII = new Uint8Array([0x1b, 0x28, 0x42]); // ESC ( B
export const ISO2022JP_ESC_JIS0201 = new Uint8Array([0x1b, 0x28, 0x4a]); // ESC ( J
export const ISO2022JP_ESC_JIS0208 = new Uint8Array([0x1b, 0x24, 0x42]); // ESC $ B
export const ISO2022JP_ESC_JIS0208_83 = new Uint8Array([0x1b, 0x24, 0x40]); // ESC $ @
export const ISO2022JP_ESC_JIS0208_90 = new Uint8Array([0x1b, 0x24, 0x44]); // ESC $ D

/**
 * ISO-2022-JP text encoder state
 */
export type ISO2022JPState = 'ASCII' | 'JIS0208' | 'JIS0201';

/**
 * Check if a code point requires JIS X 0208 escape sequence
 */
export function requiresJisX0208Escape(code: number): boolean {
  return isJapaneseHiragana(code) || isJapaneseKatakana(code) || isJapaneseKanji(code);
}

/**
 * Check if a code point is JIS X 0201 Katakana (half-width)
 */
export function isJisX0201Katakana(code: number): boolean {
  // Half-width Katakana range
  return (
    (code >= 0xff61 && code <= 0xff9f) ||
    // Full-width Katakana (JIS X 0201 range mapped to U+30A0)
    (code >= 0x30a0 && code <= 0x30ff)
  );
}
