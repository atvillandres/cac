/**
 *   npx tsx src/process/focus-cdr.test.ts
 */
import { createStore } from "./store.js";
import { runFocusMapping } from "./focus.js";
import { runCdrMapping } from "./cdr.js";
import { debitCreditTotals } from "./currledge.js";
import { demoCdrInput, demoFocusInput } from "./fixtures.js";

function check(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

// FOCUS happy path
{
  const store = createStore();
  store.bdoApMst.push({
    company: "ALAI",
    bdoCode: "001",
    source: "1",
    processDate: new Date().toISOString().slice(0, 10),
    status: "Y",
    subFile: "0806XXX",
    userId: "DEMO",
  });
  const result = runFocusMapping(store, demoFocusInput());
  check(result.ok, `focus failed: ${result.stages.map((s) => s.detail).join("; ")}`);
  check(result.batchFile === "Success.bat", "expected Success.bat");
  check(result.stages.map((s) => s.stage).join(",") === "collection,disbursement,deposit,balance,complete", "stage order");
  const totals = debitCreditTotals(result.mapFocus);
  check(totals.debit === totals.credit, `FOCUS imbalance DR=${totals.debit} CR=${totals.credit}`);
  check(store.currLedge.length === result.mapFocus.length, "currledge not persisted");
  check(store.bdoApMst[0].status === "L", "BDOAPMST should be L");
}

// FOCUS missing param
{
  const store = createStore();
  const input = demoFocusInput();
  input.params = { ...input.params, excessCashAcct: "" };
  const result = runFocusMapping(store, input);
  check(!result.ok, "should fail without param 101");
  check(result.batchFile === "Error.bat", "Error.bat expected");
}

// CDR happy path
{
  const store = createStore();
  store.apTrans = [
    { docNum: "AP000001", docDate: "2026-11-13", acctType: "CASH", amount: 2500, payType: "CSH" },
    { docNum: "AP000001", docDate: "2026-11-13", acctType: "PREM", amount: 2500 },
  ];
  store.apDeposits = [{ bankAcct: "BNK001", tranDate: "2026-11-13", amount: 2500 }];
  store.bdoApMst.push({
    company: "AP",
    bdoCode: "080",
    source: "2",
    processDate: new Date().toISOString().slice(0, 10),
    status: "Y",
    subFile: "0806YYY",
    userId: "DEMO",
  });
  const result = runCdrMapping(store, demoCdrInput());
  check(result.ok, `cdr failed: ${result.detail}`);
  check(result.totals.debit === result.totals.credit, `CDR imbalance ${JSON.stringify(result.totals)}`);
  check(store.currLedge.length === result.rows.length, "cdr currledge");
  check(store.apTransX.length === 2, "APTRANS archived");
  check(store.bdoApMst[0].status === "L", "CDR BDOAPMST L");
}

console.log("focus-cdr.test.ts: OK");
