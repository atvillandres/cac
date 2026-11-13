/**
 *   npx tsx src/process/focus-cdr.test.ts
 */
import { createStore } from "./store.js";
import {
  numberSignFor,
  processDisbNet,
  runFocusMapping,
  type FocusInput,
} from "./focus.js";
import { runCdrMapping } from "./cdr.js";
import { debitCreditTotals } from "./currledge.js";
import { demoCdrInput, demoFocusInput, DEMO_ACCTENT, DEMO_PARAMS } from "./fixtures.js";

function check(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

const STAGE_ORDER =
  "collection,collPdr,disbursement,fundTransfer,disbNet,deposit,balance,complete";

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
  check(result.stages.map((s) => s.stage).join(",") === STAGE_ORDER, "stage order");
  const totals = debitCreditTotals(result.mapFocus);
  check(totals.debit === totals.credit, `FOCUS imbalance DR=${totals.debit} CR=${totals.credit}`);
  check(store.currLedge.length === result.mapFocus.length, "currledge not persisted");
  check(store.bdoApMst[0].status === "L", "BDOAPMST should be L");
}

// FOCUS missing param 101
{
  const store = createStore();
  const input = demoFocusInput();
  input.params = { ...input.params, excessCashAcct: "" };
  const result = runFocusMapping(store, input);
  check(!result.ok, "should fail without param 101");
  check(result.batchFile === "Error.bat", "Error.bat expected");
}

// FOCUS missing param 106 (ALAI / legacy required)
{
  const store = createStore();
  const input = demoFocusInput();
  input.params = { ...input.params, realizedGainLossAcct: "" };
  const result = runFocusMapping(store, input);
  check(!result.ok, "should fail without param 106");
  check(result.stages[0]?.detail.includes("106"), "param 106 message");
  check(result.batchFile === "Error.bat", "Error.bat for 106");
}

// PDR collection (wf_proccollpdr)
{
  const store = createStore();
  const today = new Date().toISOString().slice(0, 10);
  const input: FocusInput = {
    ...demoFocusInput(),
    pdrTranTypes: ["PD"],
    pdrItems: [
      {
        orNo: "ORPDR001",
        orDate: today,
        itemNo: 1,
        payType: "PD",
        acctType: "PDRPREM",
        orItemAmt: 250,
        currency: "PHP",
      },
    ],
  };
  // Balance the extra PDR credit with matching cash DR via excess-cash balentries
  // (demo OR/DIS/DEP still balance among themselves; PDR adds CR 250 → balentries posts DR/CR to excess).
  const result = runFocusMapping(store, input);
  check(result.ok, `pdr focus failed: ${result.stages.map((s) => s.detail).join("; ")}`);
  const pdrStage = result.stages.find((s) => s.stage === "collPdr");
  check(pdrStage?.rowsAdded === 1, "expected 1 PDR line");
  check(
    result.mapFocus.some((r) => r.refNo === "ORPDR001" && r.acctCode === "401050"),
    "PDR mapped to 401050",
  );
  const totals = debitCreditTotals(result.mapFocus);
  check(totals.debit === totals.credit, `PDR path imbalance DR=${totals.debit} CR=${totals.credit}`);
}

// Fund transfer balanced (wf_fundtransfer)
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
  const today = new Date().toISOString().slice(0, 10);
  const input: FocusInput = {
    ...demoFocusInput(),
    fundTransferDebits: [
      {
        disNo: "FT000001",
        disDate: today,
        currency: "PHP",
        acctCode: "501100",
        drCr: "DR",
        amount: 800,
        itemNo: 1,
        payType: "CSH",
      },
    ],
    fundTransferCredits: [
      {
        disNo: "FT000001",
        disDate: today,
        currency: "PHP",
        acctCode: "101100",
        drCr: "CR",
        amount: 800,
        itemNo: 1,
        payType: "CSH",
      },
    ],
  };
  const result = runFocusMapping(store, input);
  check(result.ok, `ft failed: ${result.stages.map((s) => s.detail).join("; ")}`);
  const ft = result.stages.find((s) => s.stage === "fundTransfer");
  check(ft?.rowsAdded === 2, "expected 2 fund-transfer lines");
  check(store.unbalDocs.length === 0, "no unbaldoc on balanced FT");
  check(
    result.mapFocus.some((r) => r.refNo === "FT000001" && r.drCr === "DR" && r.amount === 800),
    "FT debit present",
  );
}

// Fund transfer unbalanced → UNBALDOC + BDOAPMST=Q
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
  const today = new Date().toISOString().slice(0, 10);
  const input: FocusInput = {
    proc: {
      compCode: "ALAI",
      foCode: "001",
      dateRec: today,
      fileName: "0806XXX",
      batchFile: "Error.bat",
    },
    params: DEMO_PARAMS,
    acctEnt: DEMO_ACCTENT,
    userId: "DEMO",
    fundTransferDebits: [
      {
        disNo: "FTBAD001",
        disDate: today,
        currency: "PHP",
        acctCode: "501100",
        drCr: "DR",
        amount: 500,
      },
    ],
    fundTransferCredits: [
      {
        disNo: "FTBAD001",
        disDate: today,
        currency: "PHP",
        acctCode: "101100",
        drCr: "CR",
        amount: 300,
      },
    ],
  };
  const result = runFocusMapping(store, input);
  check(!result.ok, "unbalanced FT should fail");
  check(result.batchFile === "Error.bat", "Error.bat on unbal FT");
  check(store.unbalDocs.length === 1, "expected one UNBALDOC");
  check(store.unbalDocs[0].docNum === "FTBAD001", "docnum");
  check(store.unbalDocs[0].totalDebit === 500 && store.unbalDocs[0].totalCredit === 300, "amounts");
  check(store.bdoApMst[0].status === "Q", "BDOAPMST Q on unbal doc");
  check(store.currLedge.length === 0, "should not commit on failure");
}

// numbersign helper
{
  check(numberSignFor("DR", "214000") === "*", "excess cash *");
  check(numberSignFor("DR", "205002") === "*", "clearing *");
  check(numberSignFor("CR", "214000") === " ", "CR no star");
  check(numberSignFor("DR", "101001") === " ", "other acct");
}

// Net disbursement (wf_procdisbnet) — balanced cash-net
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
  const today = new Date().toISOString().slice(0, 10);
  const input: FocusInput = {
    ...demoFocusInput(),
    netProdCodes: ["P", "S", "D"],
    bankAcctCodes: ["102900"],
    disNetLines: [
      {
        disNo: "DN000001",
        disDate: today,
        currency: "PHP",
        payMode: "CSH",
        acctCode: "501200",
        drCr: "DR",
        amount: 1200,
        itemNo: 1,
        payType: "CSH",
      },
      {
        disNo: "DN000001",
        disDate: today,
        currency: "PHP",
        payMode: "CSH",
        acctCode: "101200",
        drCr: "CR",
        amount: 1200,
        itemNo: 2,
        payType: "CSH",
      },
      // bank line on cash path is skipped
      {
        disNo: "DN000001",
        disDate: today,
        currency: "PHP",
        payMode: "CSH",
        acctCode: "102900",
        drCr: "DR",
        amount: 999,
        isBank: true,
      },
    ],
  };
  const result = runFocusMapping(store, input);
  check(result.ok, `disbNet failed: ${result.stages.map((s) => s.detail).join("; ")}`);
  const net = result.stages.find((s) => s.stage === "disbNet");
  check(net?.rowsAdded === 2, `expected 2 net lines, got ${net?.rowsAdded}`);
  check(
    !result.mapFocus.some((r) => r.refNo === "DN000001" && r.acctCode === "102900"),
    "cash-net must skip bank acct",
  );
  check(store.unbalDocs.length === 0, "balanced net doc");
}

// Net disbursement check path — bank lines forced CR; all-bank doc deferred
{
  const store = createStore();
  const today = new Date().toISOString().slice(0, 10);
  const input: FocusInput = {
    proc: {
      compCode: "ALAI",
      foCode: "001",
      dateRec: today,
      fileName: "0806XXX",
      batchFile: "Error.bat",
    },
    params: DEMO_PARAMS,
    acctEnt: DEMO_ACCTENT,
    userId: "DEMO",
    bankAcctCodes: ["102900"],
    disNetLines: [
      {
        disNo: "DNCHK001",
        disDate: today,
        currency: "PHP",
        payMode: "CHK",
        acctCode: "501300",
        drCr: "DR",
        amount: 400,
        payType: "CHK",
      },
      {
        disNo: "DNCHK001",
        disDate: today,
        currency: "PHP",
        payMode: "CHK",
        acctCode: "102900",
        drCr: "DR",
        amount: 400,
        payType: "CHK",
        isBank: true,
      },
      // all-bank doc → fund-transfer deferral
      {
        disNo: "DNFT0001",
        disDate: today,
        currency: "PHP",
        payMode: "CHK",
        acctCode: "102900",
        drCr: "DR",
        amount: 50,
        isBank: true,
      },
    ],
  };
  const out: import("./currledge.js").CurrLedgeRow[] = [];
  const stage = processDisbNet(store, input, out);
  check(stage.ok, `check-net failed: ${stage.detail}`);
  check(stage.rowsAdded === 2, `expected 2 mapped (non-bank + bank CR), got ${stage.rowsAdded}`);
  check(stage.detail.includes("deferred 1"), `detail=${stage.detail}`);
  const bankRow = out.find((r) => r.acctCode === "102900" && r.refNo === "DNCHK001");
  check(bankRow?.drCr === "CR", "bank line forced CR");
  check(!out.some((r) => r.refNo === "DNFT0001"), "all-bank doc not mapped");
}

// Net disbursement unbalanced → UNBALDOC Q
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
  const today = new Date().toISOString().slice(0, 10);
  const input: FocusInput = {
    proc: {
      compCode: "ALAI",
      foCode: "001",
      dateRec: today,
      fileName: "0806XXX",
      batchFile: "Error.bat",
    },
    params: DEMO_PARAMS,
    acctEnt: DEMO_ACCTENT,
    userId: "DEMO",
    disNetLines: [
      {
        disNo: "DNBAD001",
        disDate: today,
        currency: "PHP",
        payMode: "CSH",
        acctCode: "501200",
        drCr: "DR",
        amount: 100,
      },
      {
        disNo: "DNBAD001",
        disDate: today,
        currency: "PHP",
        payMode: "CSH",
        acctCode: "101200",
        drCr: "CR",
        amount: 40,
      },
    ],
  };
  const result = runFocusMapping(store, input);
  check(!result.ok, "unbal net should fail");
  check(store.unbalDocs.some((u) => u.docNum === "DNBAD001"), "UNBALDOC for net");
  check(store.bdoApMst[0].status === "Q", "BDOAPMST Q");
}

// USD realized gain/loss conversion on net lines
{
  const store = createStore();
  const today = new Date().toISOString().slice(0, 10);
  const input: FocusInput = {
    proc: {
      compCode: "ALAI",
      foCode: "001",
      dateRec: today,
      fileName: "0806XXX",
      batchFile: "Error.bat",
    },
    params: { ...DEMO_PARAMS, bookingRate: 50 },
    acctEnt: DEMO_ACCTENT,
    userId: "DEMO",
    disNetLines: [
      {
        disNo: "DNUSD001",
        disDate: today,
        currency: "USD",
        payMode: "CSH",
        acctCode: "490001",
        drCr: "DR",
        amount: 10,
        origCy: "USD",
      },
      {
        disNo: "DNUSD001",
        disDate: today,
        currency: "USD",
        payMode: "CSH",
        acctCode: "101200",
        drCr: "CR",
        amount: 500,
        origCy: "PHP",
      },
    ],
  };
  const out: import("./currledge.js").CurrLedgeRow[] = [];
  const stage = processDisbNet(store, input, out);
  check(stage.ok, `usd gain/loss failed: ${stage.detail}`);
  const gain = out.find((r) => r.acctCode === "490001");
  check(gain?.amount === 500 && gain.origCy === "PHP", `gain converted: ${JSON.stringify(gain)}`);
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
