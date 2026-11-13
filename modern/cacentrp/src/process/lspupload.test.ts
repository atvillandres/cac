/**
 *   npx tsx src/process/lspupload.test.ts
 */
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { amountToLspImplied13, padLeftSpace } from "./pad.js";
import {
  formatLspLine,
  runLspUpload,
  seedDemoLspLedger,
  currLedgeToLspCurrent,
} from "./lspupload.js";
import { createStore } from "./store.js";
import { emptyCurrLedge } from "./currledge.js";
import { runGlWalker } from "./glwalker.js";

function check(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

check(padLeftSpace("AB", 4) === "  AB", "padLeftSpace");
check(amountToLspImplied13(1000) === "0000000100000", `amt got ${amountToLspImplied13(1000)}`);
check(amountToLspImplied13(1500.5) === "0000000150050", `amt1500 got ${amountToLspImplied13(1500.5)}`);

const row = emptyCurrLedge();
row.coCode = "ALAI";
row.foCode = "001";
row.refNo = "OR0001";
row.refDate = "2026-11-13";
row.sourceType = "FC";
row.acctCode = "101001";
row.drCr = "DR";
row.amount = 100;
row.recDest = "lsp";
row.payType = "CSH";
const rec = currLedgeToLspCurrent(row, {
  processDate: new Date("2026-11-13T00:00:00"),
  userId: "DEMO",
});
const line = formatLspLine(rec);
check(line.startsWith("ALAI001"), `prefix ${line.slice(0, 10)}`);
check(line.length >= 120, `line len ${line.length}`);

const dir = mkdtempSync(join(tmpdir(), "lsp-"));
try {
  const store = createStore();
  seedDemoLspLedger(store);
  const result = runLspUpload(store, {
    processDate: new Date("2026-11-13T00:00:00"),
    outDir: dir,
    userId: "DEMO",
  });
  check(result.ok, result.detail);
  check(result.processed === 3, `processed ${result.processed}`);
  check(result.intInpFlCount === 3, `intinpfl ${result.intInpFlCount}`);
  const alai = result.files.find((f) => f.company === "ALAI");
  const apln = result.files.find((f) => f.company === "APLN");
  check(!!alai && alai.lineCount === 2, `alai lines ${alai?.lineCount}`);
  check(!!apln && apln.lineCount === 1, `apln lines ${apln?.lineCount}`);
  check(!!alai?.path, "alai path");
  const text = readFileSync(alai!.path!, "latin1");
  check(text.split(/\r?\n/).filter(Boolean).length === 2, "file lines");
  check(alai!.filename === "UN_1113.lsp", alai!.filename);

  // GLWDTL merge into GLW
  store.glwDtl.push({
    gwctle: "CAC1",
    gwgrpn: "111326",
    gwgrpd: "11132026",
    gwjrnn: "LSP111326",
    gwjrnd: "11132026",
    gwcmpy: "ALAI",
    gwactc: "501001",
    gwdccd: "D",
    gwoamt: 99.99,
    gwlamt: 99.99,
    gwcntr: "M001",
  });
  // mark ledger rows as lsp so NLSP path skips them; only GLWDTL should write
  for (const r of store.currLedge) r.recDest = "lsp";
  const glw = runGlWalker([], {
    company: "ALAI",
    processDate: new Date("2026-11-13T00:00:00"),
    outDir: dir,
    glwDtl: store.glwDtl,
  });
  check(glw.ok && glw.detailCount === 1, glw.detail);
  check(glw.lines.some((l) => l.startsWith("02")), "detail line");
} finally {
  rmSync(dir, { recursive: true, force: true });
}

console.log("lspupload.test.ts: OK");
