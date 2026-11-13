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

/** Port of UNBALDOC (f_write2unbaldoc) — per-document DR/CR mismatch. */
export interface UnbalDocRow {
  compCode: string;
  foCode: string;
  sourceType: string;
  docNum: string;
  totalDebit: number;
  totalCredit: number;
  fileName: string;
  processDate: string;
  userId: string;
}

export interface CashBalanceRow {
  company: string;
  foCode: string;
  cashBal: number;
  tranDate: string;
  currency: string;
}

/** Port of ERRCASHBAL — FO vs CAC excess-cash mismatch from wf_balentries. */
export interface ErrCashBalRow {
  compCode: string;
  foCode: string;
  tranDate: string;
  foBal: number;
  cacBal: number;
  currency: string;
  processDate: string;
  userId: string;
}

export interface ApTransStoreRow {
  counter?: number;
  company?: string;
  region?: string;
  lob?: string;
  docNum: string;
  docDate: string;
  docType?: string;
  refDoc?: string;
  payor?: string;
  acctType: string;
  amount: number;
  payType?: string;
  payPyTyp?: string;
  unit?: string;
  status?: string;
  processDate?: string;
}

export interface ApDepositStoreRow {
  company?: string;
  bdoCode?: string;
  bankAcct: string;
  depDate?: string;
  tranDate: string;
  amount: number;
  payType?: string;
  depChkNo?: string;
  status?: string;
  processDate?: string;
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

/** Port of ORITEMCURR (wf_write2rb / RB.DBF). */
export interface OrItemCurrRow {
  company: string;
  foCode: string;
  orNo: string;
  orDate: string;
  grpItemNo: number;
  prodCode: string;
  polNo: string;
  ptd: string;
  applNo: string;
  entNo: string;
  clientName: string;
  agtNo: string;
  srvFoCode: string;
  payMode: string;
  planCode: string;
  agcyCode: string;
  modalPrem: number;
  payCode: string;
  dueDate: string;
  currency: string;
  issueDate: string;
  agtName: string;
  processDate: string;
}

/** Port of OR item detail (wf_write2rc / RC.DBF). */
export interface OrItemDtlCurrRow {
  company: string;
  foCode: string;
  orNo: string;
  orDate: string;
  grpItemNo: number;
  itemNo: number;
  payType: string;
  orItemAmt: number;
  dueDate: string;
  ssiYrMm: string;
  remarks: string;
  postTag: string;
  orItemDtlT: string;
  processDate: string;
}

/** Port of OR cash (wf_write2rd / RD.DBF). */
export interface OrCashCurrRow {
  company: string;
  foCode: string;
  orNo: string;
  orDate: string;
  currency: string;
  cashAmt: number;
  dsSeqNo: string;
  processDate: string;
}

/** Port of OR check (wf_write2re / RE.DBF). */
export interface OrCheckCurrRow {
  company: string;
  foCode: string;
  orNo: string;
  orDate: string;
  checkItemNo: number;
  checkNo: string;
  checkDate: string;
  currency: string;
  checkAmt: number;
  checkClrTy: string;
  dsSeqNo: string;
  checkType: string;
  checkTypeD: string;
  bankBranch: string;
  processDate: string;
}

/** Port of OR APR (wf_write2rf / RF.DBF). */
export interface OrAprCurrRow {
  company: string;
  foCode: string;
  orNo: string;
  orDate: string;
  aprNo: string;
  aprDate: string;
  aprAmt: number;
  withheldTa: string;
  processDate: string;
}

/** Port of DISMAINCURR (wf_write2va / VA.DBF). */
export interface DisMainCurrRow {
  company: string;
  foCode: string;
  disForm: string;
  disNo: string;
  disDate: string;
  disStatCode: string;
  disStatDate: string;
  userId: string;
  dateStamp: string;
  orNo: string;
  processDate: string;
}

/** Port of DIS group/policy (wf_write2vb / VB.DBF). */
export interface DisItemCurrRow {
  company: string;
  foCode: string;
  disForm: string;
  disNo: string;
  disDate: string;
  grpItemNo: number;
  prodCode: string;
  agtNo: string;
  polNo: string;
  clientName: string;
  unitCode: string;
  entNo: string;
  ptd: string;
  srvFoCode: string;
  tin: string;
  agcyCode: string;
  issueDate: string;
  agtName: string;
  planCode: string;
  payMode: string;
  payCode: string;
  sitCode: string;
  orNo: string;
  processDate: string;
}

/** Port of DIS item detail (wf_write2vc / VC.DBF). */
export interface DisItemDtlCurrRow {
  company: string;
  foCode: string;
  disForm: string;
  disNo: string;
  disDate: string;
  grpItemNo: number;
  itemNo: number;
  disType: string;
  disAmt: number;
  disNetAmt: number;
  disRecapTa: string;
  disCommRat: number;
  disCommTyp: string;
  disSaleCom: string;
  disExpl: string;
  itemDtlDat: string;
  disItemDtl: string;
  chkClrDays: number;
  unitCode: string;
  processDate: string;
}

/** Port of DIS addition (wf_write2vd / VD.DBF). */
export interface DisAddCurrRow {
  company: string;
  foCode: string;
  disForm: string;
  disNo: string;
  disDate: string;
  grpItemNo: number;
  itemNo: number;
  disType: string;
  addCode: string;
  disAddAmt: number;
  processDate: string;
}

/** Port of DIS deduction (wf_write2ve / VE.DBF). */
export interface DisDedCurrRow {
  company: string;
  foCode: string;
  disForm: string;
  disNo: string;
  disDate: string;
  grpItemNo: number;
  itemNo: number;
  disType: string;
  dedCode: string;
  disDedAmt: number;
  processDate: string;
}

/** Port of DIS cash (wf_write2vf / VF.DBF). */
export interface DisCashCurrRow {
  company: string;
  foCode: string;
  disForm: string;
  disNo: string;
  disDate: string;
  seqNo: number;
  currency: string;
  cashAmt: number;
  payee: string;
  processDate: string;
}

/** Port of DIS check (wf_write2vg / VG.DBF). */
export interface DisCheckCurrRow {
  company: string;
  foCode: string;
  disForm: string;
  disNo: string;
  disDate: string;
  checkItemNo: number;
  checkNo: string;
  checkDate: string;
  bankCode: string;
  bankBranch: string;
  currency: string;
  checkAmt: number;
  payee: string;
  processDate: string;
}

/** Port of DIS plan premium (wf_write2vh / VH.DBF). */
export interface DisPlanCurrRow {
  company: string;
  foCode: string;
  disForm: string;
  disNo: string;
  disDate: string;
  grpItemNo: number;
  baseRiderC: string;
  planCode: string;
  totModPrem: number;
  comRate: string;
  processDate: string;
}

export interface DailyStore {
  currLedge: CurrLedgeRow[];
  currLedgeX: CurrLedgeRow[];
  unbalCurrLedge: CurrLedgeRow[];
  unbalDocs: UnbalDocRow[];
  errCashBal: ErrCashBalRow[];
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
  orItemCurr: OrItemCurrRow[];
  orItemDtlCurr: OrItemDtlCurrRow[];
  orCashCurr: OrCashCurrRow[];
  orCheckCurr: OrCheckCurrRow[];
  orAprCurr: OrAprCurrRow[];
  disMainCurr: DisMainCurrRow[];
  disItemCurr: DisItemCurrRow[];
  disItemDtlCurr: DisItemDtlCurrRow[];
  disAddCurr: DisAddCurrRow[];
  disDedCurr: DisDedCurrRow[];
  disCashCurr: DisCashCurrRow[];
  disCheckCurr: DisCheckCurrRow[];
  disPlanCurr: DisPlanCurrRow[];
  depositSlip: DepositSlipRow[];
  foControl: FoControlRow[];
  /** Raw TRANEXT rows by code after ImportFile (audit / unknown codes). */
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
    unbalDocs: seed?.unbalDocs ? [...seed.unbalDocs] : [],
    errCashBal: seed?.errCashBal ? [...seed.errCashBal] : [],
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
    orItemCurr: seed?.orItemCurr ? [...seed.orItemCurr] : [],
    orItemDtlCurr: seed?.orItemDtlCurr ? [...seed.orItemDtlCurr] : [],
    orCashCurr: seed?.orCashCurr ? [...seed.orCashCurr] : [],
    orCheckCurr: seed?.orCheckCurr ? [...seed.orCheckCurr] : [],
    orAprCurr: seed?.orAprCurr ? [...seed.orAprCurr] : [],
    disMainCurr: seed?.disMainCurr ? [...seed.disMainCurr] : [],
    disItemCurr: seed?.disItemCurr ? [...seed.disItemCurr] : [],
    disItemDtlCurr: seed?.disItemDtlCurr ? [...seed.disItemDtlCurr] : [],
    disAddCurr: seed?.disAddCurr ? [...seed.disAddCurr] : [],
    disDedCurr: seed?.disDedCurr ? [...seed.disDedCurr] : [],
    disCashCurr: seed?.disCashCurr ? [...seed.disCashCurr] : [],
    disCheckCurr: seed?.disCheckCurr ? [...seed.disCheckCurr] : [],
    disPlanCurr: seed?.disPlanCurr ? [...seed.disPlanCurr] : [],
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
