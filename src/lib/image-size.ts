// Reads width and height from PNG, JPEG or WebP bytes without decoding the image.
export function readImageSize(bytes: Uint8Array): { width: number; height: number; type: string } | null {
  const b = bytes;
  const u16be = (i: number) => ((b[i] ?? 0) << 8) | (b[i + 1] ?? 0);
  const u16le = (i: number) => (b[i] ?? 0) | ((b[i + 1] ?? 0) << 8);
  const u32be = (i: number) => (((b[i] ?? 0) << 24) >>> 0) + ((b[i + 1] ?? 0) << 16) + ((b[i + 2] ?? 0) << 8) + (b[i + 3] ?? 0);

  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) {
    return { type: "image/png", width: u32be(16), height: u32be(20) };
  }
  if (b[0] === 0xff && b[1] === 0xd8) {
    let i = 2;
    while (i < b.length) {
      if (b[i] !== 0xff) return null;
      const marker = b[i + 1] ?? 0;
      const len = u16be(i + 2);
      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
        return { type: "image/jpeg", height: u16be(i + 5), width: u16be(i + 7) };
      }
      i += 2 + len;
    }
    return null;
  }
  const tag = String.fromCharCode(...b.slice(0, 4));
  const fmt = String.fromCharCode(...b.slice(8, 12));
  if (tag === "RIFF" && fmt === "WEBP") {
    const chunk = String.fromCharCode(...b.slice(12, 16));
    if (chunk === "VP8 ") return { type: "image/webp", width: u16le(26) & 0x3fff, height: u16le(28) & 0x3fff };
    if (chunk === "VP8L") {
      const b0 = b[21] ?? 0, b1 = b[22] ?? 0, b2 = b[23] ?? 0, b3 = b[24] ?? 0;
      return { type: "image/webp", width: 1 + (((b1 & 0x3f) << 8) | b0), height: 1 + (((b3 & 0xf) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6)) };
    }
    if (chunk === "VP8X") {
      const w = 1 + ((b[24] ?? 0) | ((b[25] ?? 0) << 8) | ((b[26] ?? 0) << 16));
      const h = 1 + ((b[27] ?? 0) | ((b[28] ?? 0) << 8) | ((b[29] ?? 0) << 16));
      return { type: "image/webp", width: w, height: h };
    }
  }
  return null;
}
