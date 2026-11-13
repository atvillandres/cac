/**
 * In-memory stand-in for CAC working tables used by daily process.
 * Replace with real SQL adapters when ODBC/Postgres is wired.
 */
import type { CurrLedgeRow } from "./currledge.js";
import { emptyCurrLedge } from "./currledge.js";

export type { CurrLedgeRow } from "./currledge.js";

export interface BdoApMstRow {
  company: string;
  bdoCode: string;
  source: string; // appsrce 1=FOCUS 2=CDR
  processDate: string;
  status: string;
  subFile: string;
  userId: string;
}

export interface CashBalanceRow {
  company: string;
  foCode: string;
  cashBal: number;
  tranDate: string;
  currency: string;
}

export interface ApTransStoreRow {
  docNum: string;
  docDate: string;
  acctType: string;
  amount: number;
  payType?: string;
  status?: string;
}

export interface ApDepositStoreRow {
  bankAcct: string;
  tranDate: string;
  amount: number;
  status?: string;
}

/** Port of INTINPFL row written by w_lspupload. */
export interface IntInpFlRow {
  icomp: string;
  icdrcd: string;
  ipolno: string;
  inpln: string;
  inpfn: string;
  inpmi: string;
  inpact: string;
  inpopt: string;
  iactcd: number;
  inpsgn: string;
  inpamt: number;
  iornum: string;
  iordtc: number;
  iordty: number;
  iordtm: number;
  iordtd: number;
  inpsrc: string;
  inpent: string;
  inpstp: string;
  iagtcd: string;
  incvno: string;
  inckno: string;
  inprdt: string;
  iclrdt: string;
}

/** Port of BRSFILEX row written by w_brsinterfaceprocess. */
export interface BrsFileXRow {
  coCode: string;
  refNo: string;
  refDate: string;
  itemNo: number;
  clientName: string;
  agentCode: string;
  polNo: string;
  chkClrNo: number;
  sourceFl: string;
  procDate: string;
}

/** Port of GLWDTL / d_glwlspdtl — decimal amounts (pre fixed-width). */
export interface GlwDtlStoreRow {
  gwrect?: string;
  gwctle: string;
  gwgrpn: string;
  gwgrpd: string | number;
  gwjrnn: string;
  gwjrnd: string | number;
  gwseqn?: number;
  gwfil1?: string;
  gwcmpy: string;
  gwactc: string;
  gwcurr?: string;
  gwcntr?: string;
  gwlobc?: string;
  gwdccd: string;
  gwoamt: number;
  gwlamt: number;
  gwtrnc?: string;
  gwref1?: string;
  gwref2?: string;
  gwref3?: string;
  gwref4?: string;
  gwencs?: string;
  gwrtts?: string;
  gwstaa?: number;
  gwstav?: string;
  gwadbs?: string;
  gwdocr?: string;
  gwrevd?: number;
  gwreva?: string;
  gwreve?: string;
  gwrtty?: string;
  gwxchr?: number;
  gwrted?: number;
  gwsacc?: string;
  gwfil2?: string;
}

/** Port of BPYFILE / BPYFILEX working table (unload → w_bpyinterfaceprocess). */
export interface BpyFileRow {
  icdrcd: string;
  ipolno: string;
  inpln: string;
  inpfn: string;
  inpmi: string;
  iactType: string;
  inorType: string;
  iactcd: string;
  inpsgn: string;
  inpamt: string | number;
  inorno: string;
  indate: string;
  inpsrc: string;
  inpent: string;
  inpstp: string;
  iagtcd: string;
  incvno: string;
  inckno: string;
  inprdate: string;
  dtlType: string;
}

/** Port of GRPFILE / GRPFILEX (unload SSI → w_grpinterfaceprocess). */
export type GrpFileRow = BpyFileRow;

/** Port of ORMAINCURR from wf_write2ra (TRANEXT RA.DBF). */
export interface OrMainCurrRow {
  company: string;
  orNo: string;
  orDate: string;
  foCode: string;
  orStatCode: string;
  orStatDate: string;
  processTyp: string;
  recvName: string;
  recvAddr1: string;
  recvAddr2: string;
  recvAddr3: string;
  userId: string;
  dateStamp: string;
  varPol: string;
  processDate: string;
  userIdCac: string;
}

/** Port of deposit-slip working rows from wf_write2da (TRANEXT DA.DBF). */
export interface DepositSlipRow {
  company: string;
  foCode: string;
  dsSeqNo: string;
  dateDep: string;
  dsType: string;
  bankAcctNo: string;
  bankCode: string;
  bankBranch: string;
  acctCode: string;
  currency: string;
  amount: number;
  dsDeposito: string;
  userId: string;
  dateStamp: string;
  processDate: string;
}

/** Port of FO_TCDBF control rows. */
export interface FoControlRow {
  tcName: string;
  tcSize: number;
  tcDate: string;
  tcTime: string;
  tcCount: number;
  tcStatus: string;
  tcModet: string;
  tcTrnDate: string;
  tcControl: number;
  tcHash: number;
  tcFile: number;
}

export interface DailyStore {
  currLedge: CurrLedgeRow[];
  currLedgeX: CurrLedgeRow[];
  unbalCurrLedge: CurrLedgeRow[];
  bdoApMst: BdoApMstRow[];
  bpyFile: BpyFileRow[];
  bpyFileX: BpyFileRow[];
  grpFile: GrpFileRow[];
  grpFileX: GrpFileRow[];
  cashBalance: CashBalanceRow[];
  cashBalanceX: CashBalanceRow[];
  apTrans: ApTransStoreRow[];
  apTransX: ApTransStoreRow[];
  apDeposits: ApDepositStoreRow[];
  apDepositX: ApDepositStoreRow[];
  orMainCurr: OrMainCurrRow[];
  depositSlip: DepositSlipRow[];
  foControl: FoControlRow[];
  /** Raw TRANEXT rows by code (RB–RF, VA–VH, …) after ImportFile. */
  tranextRaw: Record<string, Record<string, string | number>[]>;
  intInpFl: IntInpFlRow[];
  glwDtl: GlwDtlStoreRow[];
  brsFileX: BrsFileXRow[];
}

export function createStore(seed?: Partial<DailyStore>): DailyStore {
  return {
    currLedge: seed?.currLedge ? [...seed.currLedge] : [],
    currLedgeX: seed?.currLedgeX ? [...seed.currLedgeX] : [],
    unbalCurrLedge: seed?.unbalCurrLedge ? [...seed.unbalCurrLedge] : [],
    bdoApMst: seed?.bdoApMst ? [...seed.bdoApMst] : [],
    bpyFile: seed?.bpyFile ? [...seed.bpyFile] : [],
    bpyFileX: seed?.bpyFileX ? [...seed.bpyFileX] : [],
    grpFile: seed?.grpFile ? [...seed.grpFile] : [],
    grpFileX: seed?.grpFileX ? [...seed.grpFileX] : [],
    cashBalance: seed?.cashBalance ? [...seed.cashBalance] : [],
    cashBalanceX: seed?.cashBalanceX ? [...seed.cashBalanceX] : [],
    apTrans: seed?.apTrans ? [...seed.apTrans] : [],
    apTransX: seed?.apTransX ? [...seed.apTransX] : [],
    apDeposits: seed?.apDeposits ? [...seed.apDeposits] : [],
    apDepositX: seed?.apDepositX ? [...seed.apDepositX] : [],
    orMainCurr: seed?.orMainCurr ? [...seed.orMainCurr] : [],
    depositSlip: seed?.depositSlip ? [...seed.depositSlip] : [],
    foControl: seed?.foControl ? [...seed.foControl] : [],
    tranextRaw: seed?.tranextRaw ? { ...seed.tranextRaw } : {},
    intInpFl: seed?.intInpFl ? [...seed.intInpFl] : [],
    glwDtl: seed?.glwDtl ? [...seed.glwDtl] : [],
    brsFileX: seed?.brsFileX ? [...seed.brsFileX] : [],
  };
}

export function seedDemoLedger(store: DailyStore, count = 3): void {
  const today = new Date().toISOString().slice(0, 10);
  for (let i = 1; i <= count; i++) {
    const row = emptyCurrLedge();
    row.coCode = "ALAI";
    row.foCode = "001";
    row.refNo = `OR${String(i).padStart(6, "0")}`;
    row.refDate = today;
    row.sourceType = "DEMO";
    row.acctCode = "100001";
    row.drCr = i % 2 === 0 ? "CR" : "DR";
    row.amount = 1000 * i;
    row.userId = "DEMO";
    store.currLedge.push(row);
  }
}
