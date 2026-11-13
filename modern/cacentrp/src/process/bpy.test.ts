/**
 *   npx tsx src/process/bpy.test.ts
 */
import { parseMiscFileDate } from "./miscfiledate.js";
import { demoBpyRows, runBpyMapping } from "./bpy.js";
import { createStore } from "./store.js";
import { DEMO_ACCTENT } from "./fixtures.js";

function check(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

check(parseMiscFileDate("61113BPY") === "2006-11-13", parseMiscFileDate("61113BPY"));
check(parseMiscFileDate("xx") === "1901-01-01", "bad misc date");

const store = createStore();
store.bpyFile = demoBpyRows();
store.bdoApMst.push({
  company: "ALAI",
  bdoCode: "BRS",
  source: "1",
  processDate: new Date().toISOString().slice(0, 10),
  status: "Y",
  subFile: "61113BPY",
  userId: "DEMO",
});

const result = runBpyMapping(store, {
  proc: {
    compCode: "ALAI",
    foCode: "BRS",
    dateRec: "2026-11-13",
    fileName: "61113BPY",
    batchFile: "Error.bat",
  },
  acctEnt: DEMO_ACCTENT,
  userId: "DEMO",
  buffAmt: 0,
  units: { syrUnit: { "ALAI|001": "M001" } },
});

check(result.ok, result.detail);
check(result.balanced, "balanced");
check(result.rows.length === 2, `rows ${result.rows.length}`);
check(result.batchFile === "Success.bat", result.batchFile);
check(store.currLedge.length === 2, "currledge");
check(store.bpyFile.length === 0, "bpy cleared");
check(store.bpyFileX.length === 2, "bpy archived");
check(store.bdoApMst[0]!.status === "L", "bdo L");
check(store.currLedge.every((r) => r.foCode === "BRS"), "focode BRS");

// unbalanced → H
const store2 = createStore();
store2.bpyFile = [demoBpyRows()[0]!];
store2.bdoApMst.push({
  company: "ALAI",
  bdoCode: "BRS",
  source: "1",
  processDate: new Date().toISOString().slice(0, 10),
  status: "Y",
  subFile: "61113BPY",
  userId: "DEMO",
});
const bad = runBpyMapping(store2, {
  proc: {
    compCode: "ALAI",
    foCode: "BRS",
    dateRec: "2026-11-13",
    fileName: "61113BPY",
    batchFile: "Error.bat",
  },
  acctEnt: DEMO_ACCTENT,
  userId: "DEMO",
  buffAmt: 0,
});
check(!bad.ok && !bad.balanced, bad.detail);
check(store2.unbalCurrLedge.length === 1, "unbal");
check(store2.bdoApMst[0]!.status === "H", "bdo H");
check(store2.bpyFile.length === 1, "bpy kept on unbal");

console.log("bpy.test.ts: OK");
