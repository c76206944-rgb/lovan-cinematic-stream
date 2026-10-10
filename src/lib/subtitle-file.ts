import { unzipSync } from "fflate";

/** Turns raw subtitle bytes into text, handling UTF-8, UTF-16 and older Western encodings. */
export function decodeSubtitleBytes(bytes: Uint8Array): string {
  if (bytes[0] === 0xff && bytes[1] === 0xfe) return new TextDecoder("utf-16le").decode(bytes);
  if (bytes[0] === 0xfe && bytes[1] === 0xff) return new TextDecoder("utf-16be").decode(bytes);
  const utf8 = new TextDecoder("utf-8").decode(bytes);
  if (!utf8.includes("\uFFFD")) return utf8;
  return new TextDecoder("windows-1252").decode(bytes);
}

/** Reads an .srt, .vtt or a .zip holding one. Throws a plain message when nothing usable is found. */
export async function readSubtitleFile(file: File): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const isZip = bytes[0] === 0x50 && bytes[1] === 0x4b;
  if (!isZip) return decodeSubtitleBytes(bytes);
  const entries = unzipSync(bytes);
  const name = Object.keys(entries).find((n) => /\.(srt|vtt)$/i.test(n) && !n.startsWith("__MACOSX"));
  if (!name) throw new Error("This zip has no .srt or .vtt file inside.");
  return decodeSubtitleBytes(entries[name]!);
}
