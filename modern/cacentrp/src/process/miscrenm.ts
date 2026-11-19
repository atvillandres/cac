/**
 * Port of DOSBAT/MISCRENM.BAT — rename inbound BRS/SSI transfer files:
 *   C:\tci\inbound
 *   RENAME *.TRN *.DBF
 *
 * Naming convention (from the bat header):
 *   ymmddBPY.TRN → ymmddBPY.DBF
 *   ymmddGRP.TRN → ymmddGRP.DBF
 */
import { existsSync, readdirSync, renameSync, statSync } from "node:fs";
import { join } from "node:path";

export interface MiscRenmRename {
  from: string;
  to: string;
}

export interface MiscRenmResult {
  ok: boolean;
  detail: string;
  renames: MiscRenmRename[];
}

/**
 * Rename every `*.TRN` / `*.trn` in `inboundDir` to `*.DBF` / `*.dbf`
 * (preserves the casing of the destination extension as `.DBF`).
 * Missing or non-directory paths are a soft no-op (ok:true).
 */
export function renameTrnToDbf(inboundDir: string): MiscRenmResult {
  if (!inboundDir?.trim()) {
    return { ok: true, detail: "No inbound dir; skip MISCRENM", renames: [] };
  }
  if (!existsSync(inboundDir)) {
    return {
      ok: true,
      detail: `Inbound dir missing (${inboundDir}); skip MISCRENM`,
      renames: [],
    };
  }
  let st;
  try {
    st = statSync(inboundDir);
  } catch (e) {
    return {
      ok: false,
      detail: `Cannot stat inbound dir ${inboundDir}: ${e instanceof Error ? e.message : String(e)}`,
      renames: [],
    };
  }
  if (!st.isDirectory()) {
    return {
      ok: false,
      detail: `Inbound path is not a directory: ${inboundDir}`,
      renames: [],
    };
  }

  const renames: MiscRenmRename[] = [];
  let entries: string[];
  try {
    entries = readdirSync(inboundDir);
  } catch (e) {
    return {
      ok: false,
      detail: `Cannot list inbound dir ${inboundDir}: ${e instanceof Error ? e.message : String(e)}`,
      renames: [],
    };
  }

  for (const name of entries) {
    if (!name.toUpperCase().endsWith(".TRN")) continue;
    const from = join(inboundDir, name);
    const base = name.slice(0, -4);
    const toName = `${base}.DBF`;
    const to = join(inboundDir, toName);
    try {
      if (existsSync(to)) {
        // Already present — skip to avoid clobber (legacy RENAME would fail)
        continue;
      }
      renameSync(from, to);
      renames.push({ from, to });
    } catch (e) {
      return {
        ok: false,
        detail: `Rename failed ${name} → ${toName}: ${e instanceof Error ? e.message : String(e)}`,
        renames,
      };
    }
  }

  return {
    ok: true,
    detail:
      renames.length === 0
        ? `MISCRENM: no *.TRN in ${inboundDir}`
        : `MISCRENM: renamed ${renames.length} *.TRN → *.DBF`,
    renames,
  };
}
