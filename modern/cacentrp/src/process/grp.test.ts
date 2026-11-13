/**
 *   npx tsx src/process/grp.test.ts
 */
import { demoGrpRows, runGrpMapping } from "./grp.js";
import { createStore } from "./store.js";
import { DEMO_ACCTENT } from "./fixtures.js";

function check(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

const store = createStore();
store.grpFile = demoGrpRows();
store.bdoApMst.push({
  company: "ALAI",
  bdoCode: "SSI",
  source: "1",
  processDate: new Date().toISOString().slice(0, 10),
  status: "Y",
  subFile: "61113GRP",
  userId: "DEMO",
});

const result = runGrpMapping(store, {
  proc: {
    compCode: "ALAI",
    foCode: "SSI",
    dateRec: "2026-11-13",
    fileName: "61113GRP",
    batchFile: "Error.bat",
  },
  acctEnt: DEMO_ACCTENT,
  userId: "DEMO",
  units: { syrUnit: { "ALAI|001": "M001" } },
});

check(result.ok, result.detail);
check(result.balanced, "balanced");
check(result.rows.length === 2, `rows ${result.rows.length}`);
check(store.currLedge.every((r) => r.foCode === "SSI"), "focode SSI");
check(store.currLedge[0]!.refNo === "POLSSI01E1", store.currLedge[0]!.refNo);
check(store.grpFile.length === 0, "grp cleared");
check(store.grpFileX.length === 2, "grp archived");
check(store.bdoApMst[0]!.status === "L", "bdo L");

const store2 = createStore();
store2.grpFile = [demoGrpRows()[0]!];
store2.bdoApMst.push({
  company: "ALAI",
  bdoCode: "SSI",
  source: "1",
  processDate: new Date().toISOString().slice(0, 10),
  status: "Y",
  subFile: "61113GRP",
  userId: "DEMO",
});
const bad = runGrpMapping(store2, {
  proc: {
    compCode: "ALAI",
    foCode: "SSI",
    dateRec: "2026-11-13",
    fileName: "61113GRP",
    batchFile: "Error.bat",
  },
  acctEnt: DEMO_ACCTENT,
  userId: "DEMO",
});
check(!bad.ok && store2.bdoApMst[0]!.status === "H", bad.detail);

console.log("grp.test.ts: OK");
