const ONE_BYTE_MAX = 0x7f;
const TWO_BYTE_MAX = 0x7ff;
const THREE_BYTE_MAX = 0xffff;

/** UTF-8 bytes of `text`. Core targets ES2023 without DOM, which has no TextEncoder. */
export const utf8Bytes = (text: string): Uint8Array => {
  const bytes: number[] = [];
  for (const char of text) {
    const code = char.codePointAt(0) ?? 0;
    if (code <= ONE_BYTE_MAX) {
      bytes.push(code);
    } else if (code <= TWO_BYTE_MAX) {
      bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
    } else if (code <= THREE_BYTE_MAX) {
      bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
    } else {
      bytes.push(
        0xf0 | (code >> 18),
        0x80 | ((code >> 12) & 0x3f),
        0x80 | ((code >> 6) & 0x3f),
        0x80 | (code & 0x3f),
      );
    }
  }
  return Uint8Array.from(bytes);
};
