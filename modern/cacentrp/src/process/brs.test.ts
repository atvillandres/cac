/**
 *   npx tsx src/process/brs.test.ts
 */
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseFileDate } from "./filedate.js";
import { buildDemoAliContent, runBrsUpload, summarizeBrsFile } from "./brs.js";
import { createStore } from "./store.js";

function check(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

check(parseFileDate("26k13FO1") === "2026-11-13", `filedate ${parseFileDate("26k13FO1")}`);
check(parseFileDate("xxz99") === "1901-01-01", "bad filedate");

const content = buildDemoAliContent({ amount: 100, processYmd: "20261113" });
const totals = summarizeBrsFile(content);
check(totals.alaiDtlRec === 1, `dtlrec ${totals.alaiDtlRec}`);
check(totals.alaiCtrlRec === 1, `ctrlrec ${totals.alaiCtrlRec}`);
check(Math.round(totals.alaiDtlAmt * 100) === 10000, `dtlamt ${totals.alaiDtlAmt}`);
check(Math.round(totals.alaiCtrlAmt * 100) === 20000, `ctrlamt ${totals.alaiCtrlAmt}`);

const dir = mkdtempSync(join(tmpdir(), "brs-"));
try {
  const path = join(dir, "26k13FO1.ALI");
  writeFileSync(path, content, "latin1");
  const store = createStore();
  const result = runBrsUpload(store, {
    files: [path],
    userId: "DEMO",
    processDate: new Date("2026-11-13T00:00:00"),
  });
  check(result.ok, result.detail);
  check(result.currLedgeAdded === 1, `ledge ${result.currLedgeAdded}`);
  check(result.brsFileXAdded === 1, `brsx ${result.brsFileXAdded}`);
  check(store.currLedge[0]!.sourceType === "BR", "sourcetype");
  check(store.currLedge[0]!.effectDate === "2026-11-13", store.currLedge[0]!.effectDate);
  check(store.brsFileX[0]!.clientName.includes("DEMO"), "client");
  check(store.bdoApMst[0]!.subFile === "26k13FO1", "bdo subfile");
  check(store.bdoApMst[0]!.status === "L", "bdo status");

  // duplicate rejected
  const again = runBrsUpload(store, { files: [path], userId: "DEMO" });
  check(!again.files[0]!.ok, "dup should fail");
  check(again.files[0]!.detail.includes("Duplicate"), again.files[0]!.detail);
} finally {
  rmSync(dir, { recursive: true, force: true });
}

console.log("brs.test.ts: OK");
