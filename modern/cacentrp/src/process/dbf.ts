/**
 * Minimal dBase III (.DBF) reader for TRANEXT FO extract packs.
 * Supports character / numeric / date fields used by CAC sample DBFs.
 */
import { readFileSync } from "node:fs";

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
