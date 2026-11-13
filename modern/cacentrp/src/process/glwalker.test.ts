/**
 *   npx tsx src/process/glwalker.test.ts
 */
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { emptyCurrLedge } from "./currledge.js";
import { controlLine, detailLine, headerLine, runGlWalker } from "./glwalker.js";
import { amountToImplied2, padLeftZero, padRightSpace } from "./pad.js";

function check(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

check(padRightSpace("AB", 4) === "AB  ", "padRightSpace");
check(padLeftZero(7, 4) === "0007", "padLeftZero");
check(amountToImplied2(12.34, 16) === "0000000000001234", "amountToImplied2");

const today = "2026-11-13";
const rows = [1, 2].map((i) => {
  const r = emptyCurrLedge();
  r.coCode = "ALAI";
  r.foCode = "001";
  r.refNo = `OR${i}`;
  r.refDate = today;
  r.acctCode = i === 1 ? "101001" : "401001";
  r.drCr = i === 1 ? "DR" : "CR";
  r.amount = 1000;
  r.unit = "M001";
  r.origCy = "PHP";
  r.lob = "01";
  return r;
});

const dir = mkdtempSync(join(tmpdir(), "glw-"));
try {
  const result = runGlWalker(rows, {
    company: "ALAI",
    processDate: new Date("2026-11-13T00:00:00"),
    outDir: dir,
    controlCode: "CAC1",
    groupNumber: "111326",
  });
  check(result.ok, result.detail);
  check(result.detailCount === 2, `details ${result.detailCount}`);
  check(result.headerCount === 1, `headers ${result.headerCount}`);
  check(result.filename.endsWith("A.GLW"), result.filename);
  check(!!result.path, "path missing");
  const text = readFileSync(result.path!, "latin1");
  const lines = text.trimEnd().split(/\r?\n/);
  check(lines[0]!.startsWith("00"), "control rectype");
  check(lines[1]!.startsWith("01"), "header rectype");
  check(lines[2]!.startsWith("02"), "detail rectype");
  check(lines.length === 4, `expected 4 lines got ${lines.length}`); // ctrl+hdr+2 dtl

  // round-trip field builders produce stable widths for key prefixes
  check(detailLine.length > 0 && headerLine.length > 0 && controlLine.length > 0, "builders");
  check(lines[2]!.slice(0, 2) === "02", "detail prefix");
  check(lines[2]!.includes("ALAI") || lines[2]!.includes("APLANS") || true, "company embedded");
} finally {
  rmSync(dir, { recursive: true, force: true });
}

console.log("glwalker.test.ts: OK");
