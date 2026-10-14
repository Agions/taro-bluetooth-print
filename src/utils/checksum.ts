/**
 * CRC32 Checksum Utility
 *
 * 计算字节序列的 CRC32 校验码，用于打印任务幂等去重与数据完整性校验。
 */

let crcTable: Uint32Array | null = null;

function getCrcTable(): Uint32Array {
  if (crcTable) return crcTable;
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  crcTable = table;
  return table;
}

/**
 * 计算 Uint8Array 的 32 位循环冗余校验码 (CRC-32)
 *
 * @param data - 二进制字节流
 * @returns 8 字符的十六进制小写校验字符串 (如 'a1b2c3d4')
 */
export function crc32(data: Uint8Array): string {
  const table = getCrcTable();
  let crc = 0 ^ -1;
  for (let i = 0; i < data.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ data[i]!) & 0xff]!;
  }
  return ((crc ^ -1) >>> 0).toString(16).padStart(8, '0');
}
