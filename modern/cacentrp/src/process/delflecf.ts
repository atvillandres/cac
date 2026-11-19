/**
 * Port of DOSBAT/DELFLECF.BAT — delete old FOCUS/CDR compressed attachments:
 *   C:
 *   CD \WINDOWS\TEMP
 *   DEL *.FC?
 *   DEL *.CDR
 *
 * Used at app open (cac.sra) and optionally at start of unload.
 */
import { existsSync, readdirSync, unlinkSync, statSync } from "node:fs";
import { join } from "node:path";

export interface DelflecfResult {
  ok: boolean;
  detail: string;
  deleted: string[];
}

function isFocusOrCdrTemp(name: string): boolean {
  const u = name.toUpperCase();
  // *.FC? — FCS/FCH/FCP/FC anything one char after FC
  if (/^.*\.FC.$/i.test(u)) return true;
  if (u.endsWith(".CDR")) return true;
  return false;
}

/**
 * Delete `*.FC?` and `*.CDR` in `tempDir` (legacy WINDOWS\TEMP).
 * Missing dir → soft skip (ok:true).
 */
export function deleteOldFocusCdrFiles(tempDir: string): DelflecfResult {
  if (!tempDir?.trim()) {
    return { ok: true, detail: "No temp dir; skip DELFLECF", deleted: [] };
  }
  if (!existsSync(tempDir)) {
    return {
      ok: true,
      detail: `Temp dir missing (${tempDir}); skip DELFLECF`,
      deleted: [],
    };
  }
  try {
    if (!statSync(tempDir).isDirectory()) {
      return { ok: false, detail: `Not a directory: ${tempDir}`, deleted: [] };
    }
  } catch (e) {
    return {
      ok: false,
      detail: `Cannot stat ${tempDir}: ${e instanceof Error ? e.message : String(e)}`,
      deleted: [],
    };
  }

  const deleted: string[] = [];
  let entries: string[];
  try {
    entries = readdirSync(tempDir);
  } catch (e) {
    return {
      ok: false,
      detail: `Cannot list ${tempDir}: ${e instanceof Error ? e.message : String(e)}`,
      deleted: [],
    };
  }

  for (const name of entries) {
    if (!isFocusOrCdrTemp(name)) continue;
    const path = join(tempDir, name);
    try {
      unlinkSync(path);
      deleted.push(path);
    } catch (e) {
      return {
        ok: false,
        detail: `DELFLECF failed on ${name}: ${e instanceof Error ? e.message : String(e)}`,
        deleted,
      };
    }
  }

  return {
    ok: true,
    detail:
      deleted.length === 0
        ? `DELFLECF: no *.FC?/*.CDR in ${tempDir}`
        : `DELFLECF: deleted ${deleted.length} file(s)`,
    deleted,
  };
}
