/**
 * Pull video files out of a ZIP without loading it into memory.
 * Only works for "stored" (uncompressed) entries, which is how video ZIPs are
 * almost always made. Each video becomes a slice of the original file.
 */
import { isVideoFile, type PickedFile } from "@/lib/folder-files";

export function isZip(name: string) {
  return /\.zip$/i.test(name);
}

async function bytes(f: Blob, start: number, end: number) {
  return new DataView(await f.slice(start, end).arrayBuffer());
}

export async function videosFromZip(zip: File): Promise<{ files: PickedFile[]; compressed: number }> {
  const tailLen = Math.min(zip.size, 66000 + 22);
  const tail = await bytes(zip, zip.size - tailLen, zip.size);
  let eocd = -1;
  for (let i = tail.byteLength - 22; i >= 0; i--) if (tail.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  if (eocd < 0) throw new Error("This ZIP could not be read.");
  let count = tail.getUint16(eocd + 10, true);
  let cdSize = tail.getUint32(eocd + 12, true);
  let cdOff = tail.getUint32(eocd + 16, true);
  // ZIP64 for archives over 4 GB
  if (cdOff === 0xffffffff || count === 0xffff) {
    const loc = eocd - 20;
    if (loc < 0 || tail.getUint32(loc, true) !== 0x07064b50) throw new Error("This ZIP could not be read.");
    const z64 = Number(tail.getBigUint64(loc + 8, true));
    const rec = await bytes(zip, z64, z64 + 56);
    count = Number(rec.getBigUint64(32, true));
    cdSize = Number(rec.getBigUint64(40, true));
    cdOff = Number(rec.getBigUint64(48, true));
  }
  const cd = await bytes(zip, cdOff, cdOff + cdSize);
  const dec = new TextDecoder();
  const files: PickedFile[] = [];
  let compressed = 0;
  let p = 0;
  for (let n = 0; n < count && p + 46 <= cd.byteLength; n++) {
    if (cd.getUint32(p, true) !== 0x02014b50) break;
    const method = cd.getUint16(p + 10, true);
    let size = cd.getUint32(p + 24, true);
    const nameLen = cd.getUint16(p + 28, true);
    const extraLen = cd.getUint16(p + 30, true);
    const commentLen = cd.getUint16(p + 32, true);
    let local = cd.getUint32(p + 42, true);
    const name = dec.decode(new Uint8Array(cd.buffer, cd.byteOffset + p + 46, nameLen));
    // ZIP64 extra field
    let e = p + 46 + nameLen;
    const eEnd = e + extraLen;
    while (e + 4 <= eEnd) {
      const id = cd.getUint16(e, true);
      const len = cd.getUint16(e + 2, true);
      if (id === 1) {
        let q = e + 4;
        if (size === 0xffffffff) { size = Number(cd.getBigUint64(q, true)); q += 8; }
        if (cd.getUint32(p + 20, true) === 0xffffffff) q += 8;
        if (local === 0xffffffff) local = Number(cd.getBigUint64(q, true));
      }
      e += 4 + len;
    }
    p = eEnd + commentLen;
    if (name.endsWith("/") || !isVideoFile(name) || size === 0) continue;
    if (method !== 0) { compressed++; continue; }
    const lh = await bytes(zip, local, local + 30);
    const dataStart = local + 30 + lh.getUint16(26, true) + lh.getUint16(28, true);
    const base = name.split("/").pop() || name;
    const blob = zip.slice(dataStart, dataStart + size);
    files.push({ file: new File([blob], base, { type: "video/mp4" }), path: name });
  }
  return { files, compressed };
}
