/**
 *   npx tsx src/process/tranext.test.ts
 */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readDbfFile } from "./dbf.js";
import { createStore } from "./store.js";
import {
  detectTranextCode,
  focusWorkingFromStore,
  runTranextLoad,
  write2Cs,
  write2Da,
  write2Ra,
  write2Rb,
  write2Rc,
  write2Re,
  write2Va,
  write2Vc,
  write2Vf,
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

const rb = write2Rb(store, readDbfFile(resolve(FIXTURES, "RB.DBF")).records, ctx);
check(rb.written === 1 && store.orItemCurr[0]!.clientName.includes("PHIL"), "RB write");

const rc = write2Rc(store, readDbfFile(resolve(FIXTURES, "RC.DBF")).records, ctx);
check(rc.written === 1 && store.orItemDtlCurr[0]!.orItemAmt === 444000, "RC write");

const re = write2Re(store, readDbfFile(resolve(FIXTURES, "RE.DBF")).records, ctx);
check(re.written === 1 && store.orCheckCurr[0]!.checkAmt === 444000, "RE write");

// Synthetic DIS rows (fixture VA–VH are empty shells)
write2Va(
  store,
  [
    {
      FOCODE: "106",
      DISFORM: "D",
      DISNO: "DS000001",
      DISDATE: "2006-08-04",
      DISSTATCOD: "P",
      DISSTATDAT: "2006-08-04",
      USERID: "DEMO",
      DATESTAMP: "2006-08-04",
      ORNO: "",
    },
  ],
  ctx,
);
write2Vc(
  store,
  [
    {
      FOCODE: "106",
      DISFORM: "D",
      DISNO: "DS000001",
      DISDATE: "2006-08-04",
      GRPITEMNO: 1,
      ITEMNO: 1,
      DISTYPE: "DISPREM",
      DISAMT: 1000,
      DISNETAMT: 1000,
      DISRECAPTA: "",
      DISCOMMRAT: 0,
      DISCOMMTYP: "",
      DISSALECOM: "",
      DISEXPL: "",
      ITEMDTLDAT: "",
      DISITEMDTL: "",
      CHKCLRDAYS: 0,
      UNITCODE: "",
    },
  ],
  ctx,
);
write2Vf(
  store,
  [
    {
      FOCODE: "106",
      DISFORM: "D",
      DISNO: "DS000001",
      DISDATE: "2006-08-04",
      SEQNO: 1,
      CURNCYCODE: "PHP",
      CASHAMT: 1000,
      PAYEE: "TEST",
    },
  ],
  ctx,
);
check(store.disMainCurr.length === 1, "VA");
check(store.disItemDtlCurr[0]!.disAmt === 1000, "VC");
check(store.disCashCurr[0]!.cashAmt === 1000, "VF");

const focusSets = focusWorkingFromStore(store);
check(focusSets.orItems!.length === 1, "focus orItems from RC");
check(focusSets.orCheck!.length === 1 && focusSets.orCheck![0]!.checkAmt === 444000, "focus orCheck from RE");
check(!!focusSets.orCheck![0]!.checkClrTy || focusSets.orCheck![0]!.checkNo !== undefined, "orCheck richer fields");
check(focusSets.orCash!.every((r) => r.payType === "CSH"), "focus orCash cash-only");
check(focusSets.disItems!.length === 1, "focus disItems from VC");
check(focusSets.disCash!.length === 1, "focus disCash from VF");
check(focusSets.deposits!.length === 1, "focus deposits from DA");

// Cancelled ORMAINCURR (ORSTATCODE=C) excluded from FOCUS working sets
{
  const cancelled = createStore();
  cancelled.orMainCurr.push({
    company: "ALAI",
    orNo: "ORCXL",
    orDate: "2026-01-01",
    foCode: "106",
    orStatCode: "C",
    orStatDate: "2026-01-01",
    processTyp: "",
    recvName: "",
    recvAddr1: "",
    recvAddr2: "",
    recvAddr3: "",
    userId: "DEMO",
    dateStamp: "",
    varPol: "",
    processDate: "2026-01-01",
    userIdCac: "DEMO",
  });
  cancelled.orCheckCurr.push({
    company: "ALAI",
    foCode: "106",
    orNo: "ORCXL",
    orDate: "2026-01-01",
    checkItemNo: 1,
    checkNo: "X1",
    checkDate: "2026-01-01",
    currency: "PHP",
    checkAmt: 99,
    checkClrTy: "L",
    dsSeqNo: "",
    checkType: "M",
    checkTypeD: "",
    bankBranch: "BR1",
    processDate: "2026-01-01",
  });
  const sets = focusWorkingFromStore(cancelled);
  check((sets.orCheck ?? []).length === 0, "cancelled OR check excluded");
}

const pack = runTranextLoad(createStore(), {
  dir: FIXTURES,
  company: "ALAI",
  foCode: "106",
  userId: "DEMO",
});
check(pack.ok, pack.detail);
check(pack.results.some((r) => r.code === "FO_TCDBF" && r.written > 0), "FO_TCDBF loaded");
check(pack.results.some((r) => r.code === "RA" && r.written === 1), "pack RA");
check(pack.results.some((r) => r.code === "RB" && r.detail.includes("ORITEMCURR")), "pack RB typed");
check(pack.results.some((r) => r.code === "RC" && r.detail.includes("ORITEMDTLCURR")), "pack RC typed");
check(pack.results.every((r) => r.ok), "all ok");
check(!pack.results.some((r) => r.detail.includes("typed writer pending")), "no pending RB–VH");

console.log("tranext.test.ts: OK");
