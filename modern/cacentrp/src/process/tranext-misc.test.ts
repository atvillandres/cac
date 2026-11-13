/**
 *   npx tsx src/process/tranext-misc.test.ts
 */
import { createStore } from "./store.js";
import { write2Ha, write2Oa, write2Ob, write2Rc1, write2Vi } from "./tranext.js";

function check(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

const ctx = { company: "ALAI", foCode: "106", userId: "DEMO" };
const store = createStore();

const rc1 = write2Rc1(
  store,
  [
    {
      ORNO: "0026441",
      ORDATE: "2006-08-04",
      FOCODE: "106",
      CHECKITEMN: 1,
      DATEDEP: "2006-08-01",
      DATERTRN: "2006-08-05",
      RTRNRSN: "NSF",
      USERID: "DEMO",
      DATESTAMP: "2006-08-05",
    },
  ],
  ctx,
);
check(rc1.written === 1 && store.orRtrnCurr[0]!.rtrnRsn === "NSF", "RC1");

const vi = write2Vi(
  store,
  [
    {
      FOCODE: "106",
      DISFORM: "D",
      DISNO: "DS1",
      DISDATE: "2006-08-04",
      GRPITEMNO: 1,
      ITEMNO: 1,
      DISTAXCODE: "WT01",
      DISAMT: 1000,
      DISTAXRATE: 0.1,
      DISTAXWHEL: 100,
      DISTAXDESC: "WTAX",
      VENCODE: "V1",
    },
  ],
  ctx,
);
check(vi.written === 1 && store.disWtax[0]!.disTaxWhel === 100, "VI");

const ha = write2Ha(
  store,
  [
    {
      FOCODE: "106",
      TRANDATE: 20060804,
      POLNO: "P1",
      OLDDLP: 1,
      ADJDLP: 2,
      ORNO: "0026441",
      ORDATE: "2006-08-04",
      ORAMT: 500,
      USERID: "DEMO",
      DATESTAMP: "2006-08-04",
    },
  ],
  ctx,
);
check(ha.written === 1 && store.hsDlpOr[0]!.adjDlp === 2, "HA");

const oa = write2Oa(
  store,
  [
    {
      FOCODE: "106",
      AMENDTYPE: "PM",
      POLNO: "P1",
      EFFECTDATE: "2006-08-04",
      OLDPAYMODE: "A",
      NEWPAYMODE: "M",
      OLDMODPREM: 100,
      NEWMODPREM: 120,
      OLDAGTNO: "A1",
      NEWAGTNO: "A2",
      OLDPTD: "2006-01-01",
      NEWPTD: "2006-07-01",
      USERID: "DEMO",
      DATESTAMP: "2006-08-04",
      REMARKS: "mode chg",
    },
  ],
  ctx,
);
check(oa.written === 1 && store.lAmend[0]!.newPayMode === "M", "OA");

const ob = write2Ob(
  store,
  [
    {
      APPLNO: "APP001",
      SEQNO: 1,
      EFFECTDATE: "2006-08-04",
      NEWAPPLNO: "APP002",
      USERID: "DEMO",
      DATESTAMP: "2006-08-04",
    },
  ],
  ctx,
);
check(ob.written === 1 && store.lApplNoHist[0]!.newApplNo === "APP002", "OB");

console.log("tranext-misc.test.ts: OK");
