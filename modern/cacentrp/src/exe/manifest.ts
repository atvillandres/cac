/**
 * Reconstruct what cacentrp.exe embeds: PowerBuilder library search path +
 * application object name (from the EXE's `ob.exe` DAT* payload / project .srj).
 */
import { readFileSync } from "node:fs";
import { basename } from "node:path";
import type { LibraryManifest, Variant } from "../types.js";

const BUILTIN: Record<Variant, LibraryManifest> = {
  PBL: {
    variant: "PBL",
    application: "cac",
    libraries: [
      "process.pbd",
      "AGT_PIPE.pbd",
      "ap_taxes.pbd",
      "cac.pbd",
      "extraction.pbd",
      "lextract.pbd",
      "libraries.pbd",
      "adhoc.pbd",
      "report.pbd",
      "special.pbd",
      "sysadm.pbd",
      "utilities.pbd",
    ],
    objects: [
      { name: "cac", kind: "application" },
      { name: "w_user_login", kind: "window" },
      { name: "w_cac_frame", kind: "window" },
      { name: "cac_menu", kind: "menu" },
      { name: "w_cac_logo", kind: "window" },
    ],
  },
  AP: {
    variant: "AP",
    application: "cac",
    libraries: [
      "cac.pbd",
      "utilities.pbd",
      "adhoc.pbd",
      "AGT_PIPE.pbd",
      "ap_taxes.pbd",
      "extraction.pbd",
      "lextract.pbd",
      "libraries.pbd",
      "process.pbd",
      "report.pbd",
      "special.pbd",
      "sysadm.pbd",
    ],
    objects: [
      { name: "cac", kind: "application" },
      { name: "w_user_login", kind: "window" },
      { name: "w_cac_frame", kind: "window" },
      { name: "cac_menu", kind: "menu" },
      { name: "w_cac_logo", kind: "window" },
    ],
  },
  ALAI: {
    variant: "ALAI",
    application: "cac",
    libraries: [
      "cac.pbd",
      "utilities.pbd",
      "alai_taxes.pbd",
      "lextract.pbd",
      "libraries.pbd",
      "process.pbd",
      "report.pbd",
      "special.pbd",
      "sysadm.pbd",
    ],
    objects: [
      { name: "cac", kind: "application" },
      { name: "w_user_login", kind: "window" },
      { name: "w_cac_frame", kind: "window" },
      { name: "cac_menu", kind: "menu" },
      { name: "w_cac_logo", kind: "window" },
    ],
  },
};

/** Pull ASCII .pbd / .apl names from a raw cacentrp.exe binary. */
export function parseExeLibraryList(exePath: string): string[] {
  const buf = readFileSync(exePath);
  const text = buf.toString("latin1");
  const libs: string[] = [];
  const re = /([A-Za-z0-9_]+\.pbd)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const name = m[1];
    if (!libs.some((x) => x.toLowerCase() === name.toLowerCase())) {
      libs.push(name);
    }
  }
  return libs;
}

export function detectVariant(hint?: string): Variant {
  const h = (hint ?? "").toUpperCase();
  if (h.includes("ALAI")) return "ALAI";
  if (h.includes("AP")) return "AP";
  if (h.includes("PBL")) return "PBL";
  return "ALAI";
}

export function loadManifest(variant: Variant, exePath?: string): LibraryManifest {
  const base = structuredClone(BUILTIN[variant]);
  if (exePath) {
    const fromExe = parseExeLibraryList(exePath);
    if (fromExe.length) {
      base.libraries = fromExe;
    }
    base.variant = detectVariant(basename(exePath) + " " + exePath);
    // keep explicit variant if caller chose one
    if (variant) base.variant = variant;
  }
  return base;
}

export function describeManifest(m: LibraryManifest): string {
  const lines = [
    `Application object : ${m.application}.apl / ${m.application}.sra`,
    `Variant            : ${m.variant}`,
    `Runtime libraries  :`,
    ...m.libraries.map((l) => `  - ${l}`),
    `Bootstrap objects  :`,
    ...m.objects.map((o) => `  - ${o.name} (${o.kind})`),
  ];
  return lines.join("\n");
}
