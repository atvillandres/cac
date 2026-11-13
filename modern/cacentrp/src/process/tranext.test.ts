/**
 *   npx tsx src/process/tranext.test.ts
 */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readDbfFile } from "./dbf.js";
import { createStore } from "./store.js";
import {
  detectTranextCode,
  runTranextLoad,
  write2Cs,
  write2Da,
  write2Ra,
} from "./tranext.js";

function check(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURES = resolve(HERE, "../../fixtures/tranext");

check(detectTranextCode("RA.DBF") === "RA", "detect RA");
check(detectTranextCode("FO_TCDBF.DBF") === "FO_TCDBF", "detect FO_TCDBF");

const ra = readDbfFile(resolve(FIXTURES, "RA.DBF"));
check(ra.records.length === 1, `RA rows ${ra.records.length}`);
check(String(ra.records[0]!.ORNO) === "0026441", "RA ORNO");

const store = createStore();
const ctx = { company: "ALAI", foCode: "106", userId: "DEMO" };

const cs = write2Cs(
  store,
  readDbfFile(resolve(FIXTURES, "CS.DBF")).records,
  ctx,
);
check(cs.written === 1 && store.cashBalance[0]!.foCode === "106", "CS write");

const da = write2Da(
  store,
  readDbfFile(resolve(FIXTURES, "DA.DBF")).records,
  ctx,
);
check(da.written === 1 && store.depositSlip[0]!.dsSeqNo === "2225", "DA write");
check(store.apDeposits.length === 1 && store.apDeposits[0]!.amount === 444000, "DA→apDeposits");

const raW = write2Ra(store, ra.records, ctx);
check(raW.written === 1 && store.orMainCurr[0]!.orNo === "0026441", "RA write");
check(store.orMainCurr[0]!.recvName.includes("PHIL"), "RA name");

const pack = runTranextLoad(createStore(), {
  dir: FIXTURES,
  company: "ALAI",
  foCode: "106",
  userId: "DEMO",
});
check(pack.ok, pack.detail);
check(pack.results.some((r) => r.code === "FO_TCDBF" && r.written > 0), "FO_TCDBF loaded");
check(pack.results.some((r) => r.code === "RA" && r.written === 1), "pack RA");
check(pack.results.some((r) => r.code === "RB" && r.written >= 1), "pack RB raw");
check(pack.results.every((r) => r.ok), "all ok");

console.log("tranext.test.ts: OK");
