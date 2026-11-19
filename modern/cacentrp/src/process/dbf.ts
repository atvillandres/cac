/**
 * Minimal dBase III (.DBF) reader/writer for TRANEXT FO extract packs
 * and inbound BPY/GRP misc files.
 * Supports character / numeric / date fields used by CAC sample DBFs.
 */
import { readFileSync, writeFileSync } from "node:fs";

export interface DbfField {
  name: string;
  type: string;
  length: number;
  decimals: number;
}

export interface DbfTable {
  fields: DbfField[];
  records: Record<string, string | number>[];
  headerLength: number;
  recordLength: number;
}

function parseDate(raw: string): string {
  const s = raw.trim();
  if (/^\d{8}$/.test(s)) return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
  return s;
}

function parseNumber(raw: string): number {
  const s = raw.trim();
  if (!s) return 0;
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

export function readDbfBuffer(buf: Buffer): DbfTable {
  if (buf.length < 32) throw new Error("DBF too short");
  const nrec = buf.readUInt32LE(4);
  const headerLength = buf.readUInt16LE(8);
  const recordLength = buf.readUInt16LE(10);

  const fields: DbfField[] = [];
  let off = 32;
  while (off < headerLength && buf[off] !== 0x0d) {
    const name = buf
      .subarray(off, off + 11)
      .toString("ascii")
      .split("\0")[0]!
      .trim();
    const type = String.fromCharCode(buf[off + 11]!);
    const length = buf[off + 16]!;
    const decimals = buf[off + 17]!;
    if (name) fields.push({ name, type, length, decimals });
    off += 32;
  }

  const records: Record<string, string | number>[] = [];
  for (let i = 0; i < nrec; i++) {
    const start = headerLength + i * recordLength;
    if (start + recordLength > buf.length) break;
    const rec = buf.subarray(start, start + recordLength);
    if (rec[0] === 0x2a /* deleted */) continue;
    let pos = 1;
    const row: Record<string, string | number> = {};
    for (const f of fields) {
      const raw = rec.subarray(pos, pos + f.length).toString("latin1");
      pos += f.length;
      if (f.type === "N" || f.type === "F") row[f.name] = parseNumber(raw);
      else if (f.type === "D") row[f.name] = parseDate(raw);
      else row[f.name] = raw.replace(/\0/g, "").trim();
    }
    records.push(row);
  }

  return { fields, records, headerLength, recordLength };
}

export function readDbfFile(path: string): DbfTable {
  return readDbfBuffer(readFileSync(path));
}

export interface WriteDbfField {
  name: string;
  length: number;
  /** Default 'C' (character). */
  type?: "C" | "N" | "D";
  decimals?: number;
}

/** Write a minimal dBase III table (character-oriented; for fixtures/tests). */
export function writeDbfFile(
  path: string,
  fields: WriteDbfField[],
  records: Record<string, string | number>[],
): void {
  if (!fields.length) throw new Error("writeDbfFile: no fields");
  const headerLength = 32 + fields.length * 32 + 1;
  const recordLength = 1 + fields.reduce((s, f) => s + f.length, 0);
  const buf = Buffer.alloc(headerLength + records.length * recordLength + 1, 0);
  buf[0] = 0x03; // dBase III
  const now = new Date();
  buf[1] = now.getFullYear() - 1900;
  buf[2] = now.getMonth() + 1;
  buf[3] = now.getDate();
  buf.writeUInt32LE(records.length, 4);
  buf.writeUInt16LE(headerLength, 8);
  buf.writeUInt16LE(recordLength, 10);
  let off = 32;
  for (const f of fields) {
    const name = f.name.toUpperCase().slice(0, 11);
    buf.write(name, off, "ascii");
    buf[off + 11] = (f.type ?? "C").charCodeAt(0);
    buf[off + 16] = f.length;
    buf[off + 17] = f.decimals ?? 0;
    off += 32;
  }
  buf[off] = 0x0d; // header terminator

  let recOff = headerLength;
  for (const row of records) {
    buf[recOff] = 0x20; // not deleted
    let pos = recOff + 1;
    for (const f of fields) {
      const key = Object.keys(row).find((k) => k.toUpperCase() === f.name.toUpperCase());
      let raw = key !== undefined ? String(row[key] ?? "") : "";
      if ((f.type ?? "C") === "N") {
        raw = raw.slice(0, f.length).padStart(f.length, " ");
      } else {
        raw = raw.slice(0, f.length).padEnd(f.length, " ");
      }
      buf.write(raw, pos, f.length, "latin1");
      pos += f.length;
    }
    recOff += recordLength;
  }
  buf[recOff] = 0x1a; // EOF
  writeFileSync(path, buf.subarray(0, recOff + 1));
}
