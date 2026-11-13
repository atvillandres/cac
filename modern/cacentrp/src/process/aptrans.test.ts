/**
 *   npx tsx src/process/aptrans.test.ts
 */
import { createStore } from "./store.js";
import { runCdrMapping } from "./cdr.js";
import { DEMO_ACCTENT, DEMO_PARAMS, demoCdrInput } from "./fixtures.js";
import {
  demoApDepRows,
  demoApTransRows,
  remapApTransAcctType,
  write2Apdep,
  write2Aptrans,
} from "./tranext.js";

function check(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

check(remapApTransAcctType("10009", { payPyTyp: "" }) === "10003", "10009→10003");
check(remapApTransAcctType("10009", { payPyTyp: "NB" }) === "10009", "10009 NB keep");
check(remapApTransAcctType("10021", { payPyTyp: "" }) === "10084", "10021→10084");
check(
  remapApTransAcctType("10019", { payPyTyp: "", refDoc: "S123" }) === "100GS",
  "10019→100GS",
);
check(remapApTransAcctType("20023", { foCode: "BRS" }) === "20029", "BRS commission");
check(remapApTransAcctType("10082", {}) === null, "skip RGI");
check(remapApTransAcctType("10076", {}) === null, "skip old CAC");

const store = createStore();
const ctx = {
  company: "AP",
  foCode: "080",
  userId: "DEMO",
  units: { "AP|080": "M001" },
  acctEntTypes: new Set(["AP|CASH", "AP|PREM", "AP|BNK001"]),
};
const t = write2Aptrans(store, demoApTransRows(), ctx);
const d = write2Apdep(store, demoApDepRows(), ctx);
check(t.written === 2 && t.rejected === 0, `aptrans ${t.detail}`);
check(d.written === 1 && store.apDeposits[0]!.payType === "CSH", `apdep ${d.detail}`);
check(store.apTrans[0]!.unit === "M001", "unit from SYRUNIT map");

// Date reject
const bad = write2Apdep(
  store,
  [{ BANKACCT: "BNK001", DEPDATE: "2099-01-02", TRANDATE: "2099-01-01", DEPCHKNO: "", AMOUNT: 1 }],
  { ...ctx, fileDate: "2020-01-01" },
);
check(bad.rejected === 1 && bad.written === 0, "apdep date reject");

// Remap + reject unknown ACCTENT
const brsStore = createStore();
const brs = write2Aptrans(
  brsStore,
  [
    {
      COUNTER: 1,
      ACCTTYPE: "20023",
      REGION: "BRS",
      LOB: "01",
      DOCNUM: "B1",
      DOCDATE: "2020-01-01",
      DOCTYPE: "OR",
      REFDOC: "",
      PAYOR: "",
      AMOUNT: 10,
      PAYTYPE: "",
      PAYPYTYP: "",
    },
  ],
  {
    company: "AP",
    foCode: "BRS",
    userId: "DEMO",
    fileDate: "2020-01-01",
    acctEntTypes: new Set(["AP|20029"]),
    units: {},
  },
);
check(brs.written === 1 && brsStore.apTrans[0]!.acctType === "20029", "BRS remap write");
check(brsStore.apTrans[0]!.unit === "A000", "BRS default unit");

const cdrStore = createStore();
write2Aptrans(cdrStore, demoApTransRows(), ctx);
write2Apdep(cdrStore, demoApDepRows(), ctx);
const input = demoCdrInput("DEMO");
input.apTrans = cdrStore.apTrans.map((r) => ({ ...r }));
input.apDeposits = cdrStore.apDeposits.map((r) => ({ ...r }));
input.acctEnt = DEMO_ACCTENT;
input.params = DEMO_PARAMS;
const mapped = runCdrMapping(cdrStore, input);
check(mapped.ok, mapped.detail);
check(mapped.totals.debit === mapped.totals.credit, "balanced");

console.log("aptrans.test.ts: OK");
