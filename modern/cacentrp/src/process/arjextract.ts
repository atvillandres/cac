/**
 * Port of FOCUSXTR.BAT / APCDRXTR.BAT — ARJ extract into TRANEXT dir.
 *
 * Legacy:
 *   CD …\TRANEXT
 *   [APCDRXTR: DEL *.DBF]
 *   ARJ E -y %1
 *
 * Without an `arj` binary this records a planned extract (ok:true, extracted=false).
 * When `arj` is on PATH (or `arjBin` set), runs a real extract.
 */
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, unlinkSync } from "node:fs";
import { join } from "node:path";

export type ArjExtractKind = "FOCUSXTR" | "APCDRXTR";

export interface ArjExtractInput {
  /** Destination TRANEXT directory */
  tranextDir: string;
  /** Archive path passed as %1 to the bat */
  archivePath: string;
  kind?: ArjExtractKind;
  /** Override ARJ executable (default: look for `arj` on PATH) */
  arjBin?: string;
  /** When true, do not spawn even if arj exists */
  dryRun?: boolean;
}

export interface ArjExtractResult {
  ok: boolean;
  detail: string;
  kind: ArjExtractKind;
  extracted: boolean;
  clearedDbf: number;
}

function findArj(explicit?: string): string | undefined {
  if (explicit && existsSync(explicit)) return explicit;
  const which = spawnSync("which", ["arj"], { encoding: "utf8" });
  if (which.status === 0) {
    const p = which.stdout.trim();
    if (p) return p;
  }
  return undefined;
}

/**
 * Plan / run ARJ extract for a FOCUS or CDR pack into `tranextDir`.
 */
export function runArjExtract(input: ArjExtractInput): ArjExtractResult {
  const kind = input.kind ?? "FOCUSXTR";
  if (!input.tranextDir?.trim()) {
    return {
      ok: false,
      detail: "No TRANEXT dir for ARJ extract",
      kind,
      extracted: false,
      clearedDbf: 0,
    };
  }
  if (!existsSync(input.tranextDir)) {
    return {
      ok: false,
      detail: `TRANEXT dir missing: ${input.tranextDir}`,
      kind,
      extracted: false,
      clearedDbf: 0,
    };
  }
  if (!input.archivePath?.trim() || !existsSync(input.archivePath)) {
    return {
      ok: false,
      detail: `Archive missing: ${input.archivePath || "(empty)"}`,
      kind,
      extracted: false,
      clearedDbf: 0,
    };
  }

  let clearedDbf = 0;
  if (kind === "APCDRXTR") {
    try {
      for (const f of readdirSync(input.tranextDir)) {
        if (!f.toUpperCase().endsWith(".DBF")) continue;
        unlinkSync(join(input.tranextDir, f));
        clearedDbf++;
      }
    } catch (e) {
      return {
        ok: false,
        detail: `APCDRXTR DEL *.DBF failed: ${e instanceof Error ? e.message : String(e)}`,
        kind,
        extracted: false,
        clearedDbf,
      };
    }
  }

  const arj = input.dryRun ? undefined : findArj(input.arjBin);
  if (!arj) {
    return {
      ok: true,
      detail: `${kind}: would ARJ E -y ${input.archivePath} → ${input.tranextDir}` +
        (clearedDbf ? ` (cleared ${clearedDbf} DBF)` : "") +
        " (arj not available; plan only)",
      kind,
      extracted: false,
      clearedDbf,
    };
  }

  const run = spawnSync(arj, ["E", "-y", input.archivePath], {
    cwd: input.tranextDir,
    encoding: "utf8",
  });
  if (run.status !== 0) {
    return {
      ok: false,
      detail: `${kind}: arj failed (status=${run.status}): ${(run.stderr || run.stdout || "").trim()}`,
      kind,
      extracted: false,
      clearedDbf,
    };
  }
  return {
    ok: true,
    detail: `${kind}: extracted ${input.archivePath} → ${input.tranextDir}`,
    kind,
    extracted: true,
    clearedDbf,
  };
}
