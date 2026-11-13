/**
 * TRANEXT extract file types + wf_write2* DBF→working-table loaders (w_unload).
 *
 * Legacy: ImportFile `C:\CAC ENTRP\ALAI\ALAI\TRANEXT\{code}.DBF` then wf_write2*.
 */
import { readdirSync, readFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readDbfBuffer, readDbfFile } from "./dbf.js";
import type {
  DailyStore,
  DepositSlipRow,
  DisAddCurrRow,
  DisCashCurrRow,
  DisCheckCurrRow,
  DisDedCurrRow,
  DisItemCurrRow,
  DisItemDtlCurrRow,
  DisMainCurrRow,
  DisPlanCurrRow,
  DisWtaxRow,
  FoControlRow,
  HsDlpOrRow,
  LAmendRow,
  LApplNoHistRow,
  OrAprCurrRow,
  OrCashCurrRow,
  OrCheckCurrRow,
  OrItemCurrRow,
  OrItemDtlCurrRow,
  OrMainCurrRow,
  OrRtrnCurrRow,
} from "./store.js";
import type {
  DepositRow,
  DisCashRow,
  DisItemRow,
  FocusInput,
  OrCashRow,
  OrItemRow,
} from "./focus.js";

export type TranextCode =
  | "RA"
  | "RB"
  | "RC"
  | "RC1"
  | "RD"
  | "RE"
  | "RF"
  | "VA"
  | "VB"
  | "VC"
  | "VD"
  | "VE"
  | "VF"
  | "VG"
  | "VH"
  | "CS"
  | "DA"
  | "APDEP"
  | "APTRANS"
  | "HA"
  | "OA"
  | "OB"
  | "VI"
  | "FO_TCDBF";

export interface FieldDef {
  name: string;
  type: string;
  length: number;
}

export interface TranextSchema {
  fields: FieldDef[];
  recordLength: number;
}

const DOMAIN: Record<string, string> = {
  RA: "OR header",
  RB: "OR group/policy item",
  RC: "OR item detail",
  RC1: "OR check return",
  RD: "OR cash",
  RE: "OR check",
  RF: "OR APR / withheld",
  VA: "DIS header",
  VB: "DIS group/policy item",
  VC: "DIS item detail",
  VD: "DIS addition",
  VE: "DIS deduction",
  VF: "DIS cash",
  VG: "DIS check",
  VH: "DIS plan premium",
  VI: "DIS withholding tax",
  HA: "HS DLP / OR adjust",
  OA: "Life amendment",
  OB: "Application no history",
  CS: "Cash balance",
  DA: "Deposit slip",
  FO_TCDBF: "FOCUS extract control",
  APDEP: "AP deposit",
  APTRANS: "AP transaction",
};

/** FOCUS path writers invoked after wf_procfocusfiles. */
export const FOCUS_TRANEXT_FILES = [
  "RA",
  "RB",
  "RC",
  "RD",
  "RE",
  "RF",
  "VA",
  "VB",
  "VC",
  "VD",
  "VE",
  "VF",
  "VG",
  "VH",
  "VI",
  "HA",
  "DA",
  "OA",
  "RC1",
  "OB",
  "CS",
] as const;

export function loadTranextSchemas(): Record<string, TranextSchema> {
  const here = dirname(fileURLToPath(import.meta.url));
  const path = resolve(here, "tranext-schemas.json");
  return JSON.parse(readFileSync(path, "utf8")) as Record<string, TranextSchema>;
}

export function describeTranext(): string {
  const schemas = loadTranextSchemas();
  const lines = ["TRANEXT / writer file types:"];
  for (const [code, schema] of Object.entries(schemas)) {
    const domain = DOMAIN[code] ?? "(see process.pbl)";
    const cols = schema.fields.map((f) => f.name).join(", ");
    lines.push(`  ${code.padEnd(8)} ${domain}`);
    lines.push(`           fields: ${cols}`);
  }
  return lines.join("\n");
}

export function detectTranextCode(filename: string): string | null {
  const base = basename(filename).toUpperCase().replace(/\.DBF$/, "");
  if (base === "FO_TCDBF" || base === "FO-TCDBF") return "FO_TCDBF";
  if (/^[A-Z0-9]+$/.test(base)) return base;
  return null;
}

function str(row: Record<string, string | number>, key: string): string {
  const v = row[key] ?? row[key.toUpperCase()] ?? row[key.toLowerCase()];
  return v == null ? "" : String(v).trim();
}

function num(row: Record<string, string | number>, key: string): number {
  const v = row[key] ?? row[key.toUpperCase()] ?? row[key.toLowerCase()];
  if (typeof v === "number") return v;
  const n = Number(String(v ?? "").trim());
  return Number.isFinite(n) ? n : 0;
}

export interface Write2Context {
  company: string;
  foCode: string;
  userId: string;
  processDate?: string;
}

export interface Write2Result {
  code: string;
  ok: boolean;
  read: number;
  written: number;
  rejected: number;
  detail: string;
}

/** Port of wf_write2cs → CASHBALANCE. */
export function write2Cs(
  store: DailyStore,
  rows: Record<string, string | number>[],
  ctx: Write2Context,
): Write2Result {
  const today = ctx.processDate ?? new Date().toISOString().slice(0, 10);
  let written = 0;
  for (const row of rows) {
    store.cashBalance.push({
      company: ctx.company,
      foCode: str(row, "FO_NO") || ctx.foCode,
      cashBal: num(row, "CASHBAL"),
      tranDate: str(row, "TRAN_DATE") || today,
      currency: "PHP",
    });
    written++;
  }
  return {
    code: "CS",
    ok: true,
    read: rows.length,
    written,
    rejected: 0,
    detail: `CASHBALANCE +${written}`,
  };
}

/** Port of wf_write2da → deposit-slip working table (+ apDeposits-shaped bank keys). */
export function write2Da(
  store: DailyStore,
  rows: Record<string, string | number>[],
  ctx: Write2Context,
): Write2Result {
  const today = ctx.processDate ?? new Date().toISOString().slice(0, 10);
  let written = 0;
  for (const row of rows) {
    const slip: DepositSlipRow = {
      company: ctx.company,
      foCode: str(row, "FOCODE") || ctx.foCode,
      dsSeqNo: str(row, "DSSEQNO"),
      dateDep: str(row, "DATEDEP") || today,
      dsType: str(row, "DSTYPE"),
      bankAcctNo: str(row, "BANKACCTNO"),
      bankCode: str(row, "BANKCODE"),
      bankBranch: str(row, "BANKBRANCH"),
      acctCode: str(row, "ACCTCODE"),
      currency: str(row, "CURNCYCODE") || "PHP",
      amount: num(row, "DSAMT"),
      dsDeposito: str(row, "DSDEPOSITO"),
      userId: str(row, "USERID") || ctx.userId,
      dateStamp: str(row, "DATESTAMP") || today,
      processDate: today,
    };
    store.depositSlip.push(slip);
    // FOCUS deposit stage keys off ACCTENT.TRANTYPE — prefer ACCTCODE
    store.apDeposits.push({
      bankAcct: slip.acctCode || slip.bankAcctNo,
      tranDate: slip.dateDep,
      amount: slip.amount,
    });
    written++;
  }
  return {
    code: "DA",
    ok: true,
    read: rows.length,
    written,
    rejected: 0,
    detail: `DEPOSITSLIP +${written}`,
  };
}

/** Port of wf_write2ra → ORMAINCURR (skips cancelled ORSTATCODE='C' for active count). */
export function write2Ra(
  store: DailyStore,
  rows: Record<string, string | number>[],
  ctx: Write2Context,
): Write2Result {
  const today = ctx.processDate ?? new Date().toISOString().slice(0, 10);
  let written = 0;
  let rejected = 0;
  for (const row of rows) {
    const orStat = str(row, "ORSTATCODE");
    const rec: OrMainCurrRow = {
      company: ctx.company,
      orNo: str(row, "ORNO"),
      orDate: str(row, "ORDATE") || today,
      foCode: str(row, "FOCODE") || ctx.foCode,
      orStatCode: orStat,
      orStatDate: str(row, "ORSTATDATE") || today,
      processTyp: str(row, "PROCESSTYP"),
      recvName: str(row, "RECVNAME"),
      recvAddr1: str(row, "RECVADDR1"),
      recvAddr2: str(row, "RECVADDR2"),
      recvAddr3: str(row, "RECVADDR3"),
      userId: str(row, "USERID") || ctx.userId,
      dateStamp: str(row, "DATESTAMP") || today,
      varPol: str(row, "VARPOL"),
      processDate: today,
      userIdCac: ctx.userId,
    };
    if (!rec.orNo) {
      rejected++;
      continue;
    }
    store.orMainCurr.push(rec);
    written++;
  }
  return {
    code: "RA",
    ok: true,
    read: rows.length,
    written,
    rejected,
    detail: `ORMAINCURR +${written}`,
  };
}

function write2FoControl(
  store: DailyStore,
  rows: Record<string, string | number>[],
): Write2Result {
  let written = 0;
  for (const row of rows) {
    const rec: FoControlRow = {
      tcName: str(row, "TC_NAME"),
      tcSize: num(row, "TC_SIZE"),
      tcDate: str(row, "TC_DATE"),
      tcTime: str(row, "TC_TIME"),
      tcCount: num(row, "TC_COUNT"),
      tcStatus: str(row, "TC_STATUS"),
      tcModet: str(row, "TC_MODET"),
      tcTrnDate: str(row, "TC_TRNDATE"),
      tcControl: num(row, "TC_CONTROL"),
      tcHash: num(row, "TC_HASH"),
      tcFile: num(row, "TC_FILE"),
    };
    store.foControl.push(rec);
    written++;
  }
  return {
    code: "FO_TCDBF",
    ok: true,
    read: rows.length,
    written,
    rejected: 0,
    detail: `FO_TCDBF +${written}`,
  };
}

function todayOf(ctx: Write2Context): string {
  return ctx.processDate ?? new Date().toISOString().slice(0, 10);
}

function cur(row: Record<string, string | number>, key = "CURNCYCODE"): string {
  return (str(row, key) || "PHP").toUpperCase();
}

/** Port of wf_write2rb → ORITEMCURR. */
export function write2Rb(
  store: DailyStore,
  rows: Record<string, string | number>[],
  ctx: Write2Context,
): Write2Result {
  const today = todayOf(ctx);
  let written = 0;
  for (const row of rows) {
    const rec: OrItemCurrRow = {
      company: ctx.company,
      foCode: str(row, "FOCODE") || ctx.foCode,
      orNo: str(row, "ORNO"),
      orDate: str(row, "ORDATE") || today,
      grpItemNo: num(row, "GRPITEMNO"),
      prodCode: str(row, "PRODCODE"),
      polNo: str(row, "POLNO"),
      ptd: str(row, "PTD"),
      applNo: str(row, "APPLNO"),
      entNo: str(row, "ENTNO"),
      clientName: str(row, "CLIENTNAME"),
      agtNo: str(row, "AGTNO"),
      srvFoCode: str(row, "SRVFOCODE"),
      payMode: str(row, "PAYMODE"),
      planCode: str(row, "PLANCODE"),
      agcyCode: str(row, "AGCYCODE"),
      modalPrem: num(row, "MODALPREM"),
      payCode: str(row, "PAYCODE"),
      dueDate: str(row, "DUEDATE"),
      currency: cur(row),
      issueDate: str(row, "ISSUEDATE"),
      agtName: str(row, "AGTNAME"),
      processDate: today,
    };
    store.orItemCurr.push(rec);
    written++;
  }
  return { code: "RB", ok: true, read: rows.length, written, rejected: 0, detail: `ORITEMCURR +${written}` };
}

/** Port of wf_write2rc → OR item detail. */
export function write2Rc(
  store: DailyStore,
  rows: Record<string, string | number>[],
  ctx: Write2Context,
): Write2Result {
  const today = todayOf(ctx);
  let written = 0;
  for (const row of rows) {
    const rec: OrItemDtlCurrRow = {
      company: ctx.company,
      foCode: str(row, "FOCODE") || ctx.foCode,
      orNo: str(row, "ORNO"),
      orDate: str(row, "ORDATE") || today,
      grpItemNo: num(row, "GRPITEMNO"),
      itemNo: num(row, "ITEMNO"),
      payType: str(row, "PAYTYPE"),
      orItemAmt: num(row, "ORITEMAMT"),
      dueDate: str(row, "DUEDATE"),
      ssiYrMm: str(row, "SSIYRMM"),
      remarks: str(row, "REMARKS"),
      postTag: str(row, "POSTTAG"),
      orItemDtlT: str(row, "ORITEMDTLT"),
      processDate: today,
    };
    store.orItemDtlCurr.push(rec);
    written++;
  }
  return { code: "RC", ok: true, read: rows.length, written, rejected: 0, detail: `ORITEMDTLCURR +${written}` };
}

/** Port of wf_write2rd → OR cash. */
export function write2Rd(
  store: DailyStore,
  rows: Record<string, string | number>[],
  ctx: Write2Context,
): Write2Result {
  const today = todayOf(ctx);
  let written = 0;
  for (const row of rows) {
    const rec: OrCashCurrRow = {
      company: ctx.company,
      foCode: str(row, "FOCODE") || ctx.foCode,
      orNo: str(row, "ORNO"),
      orDate: str(row, "ORDATE") || today,
      currency: cur(row),
      cashAmt: num(row, "CASHAMT"),
      dsSeqNo: str(row, "DSSEQNO"),
      processDate: today,
    };
    store.orCashCurr.push(rec);
    written++;
  }
  return { code: "RD", ok: true, read: rows.length, written, rejected: 0, detail: `ORCASHCURR +${written}` };
}

/** Port of wf_write2re → OR check. */
export function write2Re(
  store: DailyStore,
  rows: Record<string, string | number>[],
  ctx: Write2Context,
): Write2Result {
  const today = todayOf(ctx);
  let written = 0;
  for (const row of rows) {
    const rec: OrCheckCurrRow = {
      company: ctx.company,
      foCode: str(row, "FOCODE") || ctx.foCode,
      orNo: str(row, "ORNO"),
      orDate: str(row, "ORDATE") || today,
      checkItemNo: num(row, "CHECKITEMN"),
      checkNo: str(row, "CHECKNO"),
      checkDate: str(row, "CHECKDATE") || today,
      currency: cur(row),
      checkAmt: num(row, "CHECKAMT"),
      checkClrTy: str(row, "CHECKCLRTY"),
      dsSeqNo: str(row, "DSSEQNO"),
      checkType: str(row, "CHECKTYPE"),
      checkTypeD: str(row, "CHECKTYPED"),
      bankBranch: str(row, "BANKBRANCH"),
      processDate: today,
    };
    store.orCheckCurr.push(rec);
    written++;
  }
  return { code: "RE", ok: true, read: rows.length, written, rejected: 0, detail: `ORCHECKCURR +${written}` };
}

/** Port of wf_write2rf → OR APR. */
export function write2Rf(
  store: DailyStore,
  rows: Record<string, string | number>[],
  ctx: Write2Context,
): Write2Result {
  const today = todayOf(ctx);
  let written = 0;
  for (const row of rows) {
    const rec: OrAprCurrRow = {
      company: ctx.company,
      foCode: str(row, "FOCODE") || ctx.foCode,
      orNo: str(row, "ORNO"),
      orDate: str(row, "ORDATE") || today,
      aprNo: str(row, "APRNO"),
      aprDate: str(row, "APRDATE") || today,
      aprAmt: num(row, "APRAMT"),
      withheldTa: str(row, "WITHHELDTA"),
      processDate: today,
    };
    store.orAprCurr.push(rec);
    written++;
  }
  return { code: "RF", ok: true, read: rows.length, written, rejected: 0, detail: `ORAPRCURR +${written}` };
}

/** Port of wf_write2va → DISMAINCURR. */
export function write2Va(
  store: DailyStore,
  rows: Record<string, string | number>[],
  ctx: Write2Context,
): Write2Result {
  const today = todayOf(ctx);
  let written = 0;
  for (const row of rows) {
    const rec: DisMainCurrRow = {
      company: ctx.company,
      foCode: str(row, "FOCODE") || ctx.foCode,
      disForm: str(row, "DISFORM"),
      disNo: str(row, "DISNO"),
      disDate: str(row, "DISDATE") || today,
      disStatCode: str(row, "DISSTATCOD"),
      disStatDate: str(row, "DISSTATDAT") || today,
      userId: str(row, "USERID") || ctx.userId,
      dateStamp: str(row, "DATESTAMP") || today,
      orNo: str(row, "ORNO"),
      processDate: today,
    };
    store.disMainCurr.push(rec);
    written++;
  }
  return { code: "VA", ok: true, read: rows.length, written, rejected: 0, detail: `DISMAINCURR +${written}` };
}

/** Port of wf_write2vb → DIS item / policy. */
export function write2Vb(
  store: DailyStore,
  rows: Record<string, string | number>[],
  ctx: Write2Context,
): Write2Result {
  const today = todayOf(ctx);
  let written = 0;
  for (const row of rows) {
    const rec: DisItemCurrRow = {
      company: ctx.company,
      foCode: str(row, "FOCODE") || ctx.foCode,
      disForm: str(row, "DISFORM"),
      disNo: str(row, "DISNO"),
      disDate: str(row, "DISDATE") || today,
      grpItemNo: num(row, "GRPITEMNO"),
      prodCode: str(row, "PRODCODE"),
      agtNo: str(row, "AGTNO"),
      polNo: str(row, "POLNO"),
      clientName: str(row, "CLIENTNAME"),
      unitCode: str(row, "UNITCODE"),
      entNo: str(row, "ENTNO"),
      ptd: str(row, "PTD"),
      srvFoCode: str(row, "SRVFOCODE"),
      tin: str(row, "TIN"),
      agcyCode: str(row, "AGCYCODE"),
      issueDate: str(row, "ISSUEDATE"),
      agtName: str(row, "AGTNAME"),
      planCode: str(row, "PLANCODE"),
      payMode: str(row, "PAYMODE"),
      payCode: str(row, "PAYCODE"),
      sitCode: str(row, "SITCODE"),
      orNo: str(row, "ORNO"),
      processDate: today,
    };
    store.disItemCurr.push(rec);
    written++;
  }
  return { code: "VB", ok: true, read: rows.length, written, rejected: 0, detail: `DISITEMCURR +${written}` };
}

/** Port of wf_write2vc → DIS item detail. */
export function write2Vc(
  store: DailyStore,
  rows: Record<string, string | number>[],
  ctx: Write2Context,
): Write2Result {
  const today = todayOf(ctx);
  let written = 0;
  for (const row of rows) {
    const rec: DisItemDtlCurrRow = {
      company: ctx.company,
      foCode: str(row, "FOCODE") || ctx.foCode,
      disForm: str(row, "DISFORM"),
      disNo: str(row, "DISNO"),
      disDate: str(row, "DISDATE") || today,
      grpItemNo: num(row, "GRPITEMNO"),
      itemNo: num(row, "ITEMNO"),
      disType: str(row, "DISTYPE"),
      disAmt: num(row, "DISAMT"),
      disNetAmt: num(row, "DISNETAMT"),
      disRecapTa: str(row, "DISRECAPTA"),
      disCommRat: num(row, "DISCOMMRAT"),
      disCommTyp: str(row, "DISCOMMTYP"),
      disSaleCom: str(row, "DISSALECOM"),
      disExpl: str(row, "DISEXPL"),
      itemDtlDat: str(row, "ITEMDTLDAT"),
      disItemDtl: str(row, "DISITEMDTL"),
      chkClrDays: num(row, "CHKCLRDAYS"),
      unitCode: str(row, "UNITCODE"),
      processDate: today,
    };
    store.disItemDtlCurr.push(rec);
    written++;
  }
  return { code: "VC", ok: true, read: rows.length, written, rejected: 0, detail: `DISITEMDTLCURR +${written}` };
}

/** Port of wf_write2vd → DIS addition. */
export function write2Vd(
  store: DailyStore,
  rows: Record<string, string | number>[],
  ctx: Write2Context,
): Write2Result {
  const today = todayOf(ctx);
  let written = 0;
  for (const row of rows) {
    const rec: DisAddCurrRow = {
      company: ctx.company,
      foCode: str(row, "FOCODE") || ctx.foCode,
      disForm: str(row, "DISFORM"),
      disNo: str(row, "DISNO"),
      disDate: str(row, "DISDATE") || today,
      grpItemNo: num(row, "GRPITEMNO"),
      itemNo: num(row, "ITEMNO"),
      disType: str(row, "DISTYPE"),
      addCode: str(row, "ADDCODE"),
      disAddAmt: num(row, "DISADDAMT"),
      processDate: today,
    };
    store.disAddCurr.push(rec);
    written++;
  }
  return { code: "VD", ok: true, read: rows.length, written, rejected: 0, detail: `DISADDCURR +${written}` };
}

/** Port of wf_write2ve → DIS deduction. */
export function write2Ve(
  store: DailyStore,
  rows: Record<string, string | number>[],
  ctx: Write2Context,
): Write2Result {
  const today = todayOf(ctx);
  let written = 0;
  for (const row of rows) {
    const rec: DisDedCurrRow = {
      company: ctx.company,
      foCode: str(row, "FOCODE") || ctx.foCode,
      disForm: str(row, "DISFORM"),
      disNo: str(row, "DISNO"),
      disDate: str(row, "DISDATE") || today,
      grpItemNo: num(row, "GRPITEMNO"),
      itemNo: num(row, "ITEMNO"),
      disType: str(row, "DISTYPE"),
      dedCode: str(row, "DEDCODE"),
      disDedAmt: num(row, "DISDEDAMT"),
      processDate: today,
    };
    store.disDedCurr.push(rec);
    written++;
  }
  return { code: "VE", ok: true, read: rows.length, written, rejected: 0, detail: `DISDEDCURR +${written}` };
}

/** Port of wf_write2vf → DIS cash. */
export function write2Vf(
  store: DailyStore,
  rows: Record<string, string | number>[],
  ctx: Write2Context,
): Write2Result {
  const today = todayOf(ctx);
  let written = 0;
  for (const row of rows) {
    const rec: DisCashCurrRow = {
      company: ctx.company,
      foCode: str(row, "FOCODE") || ctx.foCode,
      disForm: str(row, "DISFORM"),
      disNo: str(row, "DISNO"),
      disDate: str(row, "DISDATE") || today,
      seqNo: num(row, "SEQNO"),
      currency: cur(row),
      cashAmt: num(row, "CASHAMT"),
      payee: str(row, "PAYEE"),
      processDate: today,
    };
    store.disCashCurr.push(rec);
    written++;
  }
  return { code: "VF", ok: true, read: rows.length, written, rejected: 0, detail: `DISCASHCURR +${written}` };
}

/** Port of wf_write2vg → DIS check. */
export function write2Vg(
  store: DailyStore,
  rows: Record<string, string | number>[],
  ctx: Write2Context,
): Write2Result {
  const today = todayOf(ctx);
  let written = 0;
  for (const row of rows) {
    const rec: DisCheckCurrRow = {
      company: ctx.company,
      foCode: str(row, "FOCODE") || ctx.foCode,
      disForm: str(row, "DISFORM"),
      disNo: str(row, "DISNO"),
      disDate: str(row, "DISDATE") || today,
      checkItemNo: num(row, "CHECKITEMN"),
      checkNo: str(row, "CHECKNO"),
      checkDate: str(row, "CHECKDATE") || today,
      bankCode: str(row, "BANKCODE"),
      bankBranch: str(row, "BANKBRANCH"),
      currency: cur(row),
      checkAmt: num(row, "CHECKAMT"),
      payee: str(row, "PAYEE"),
      processDate: today,
    };
    store.disCheckCurr.push(rec);
    written++;
  }
  return { code: "VG", ok: true, read: rows.length, written, rejected: 0, detail: `DISCHECKCURR +${written}` };
}

/** Port of wf_write2vh → DIS plan premium. */
export function write2Vh(
  store: DailyStore,
  rows: Record<string, string | number>[],
  ctx: Write2Context,
): Write2Result {
  const today = todayOf(ctx);
  let written = 0;
  for (const row of rows) {
    const rec: DisPlanCurrRow = {
      company: ctx.company,
      foCode: str(row, "FOCODE") || ctx.foCode,
      disForm: str(row, "DISFORM"),
      disNo: str(row, "DISNO"),
      disDate: str(row, "DISDATE") || today,
      grpItemNo: num(row, "GRPITEMNO"),
      baseRiderC: str(row, "BASERIDERC"),
      planCode: str(row, "PLANCODE"),
      totModPrem: num(row, "TOTMODPREM"),
      comRate: str(row, "COMRATE"),
      processDate: today,
    };
    store.disPlanCurr.push(rec);
    written++;
  }
  return { code: "VH", ok: true, read: rows.length, written, rejected: 0, detail: `DISPLANCURR +${written}` };
}

/** Port of wf_write2rc1 → ORRTRNCURR. */
export function write2Rc1(
  store: DailyStore,
  rows: Record<string, string | number>[],
  ctx: Write2Context,
): Write2Result {
  const today = todayOf(ctx);
  let written = 0;
  for (const row of rows) {
    const rec: OrRtrnCurrRow = {
      company: ctx.company,
      orNo: str(row, "ORNO"),
      orDate: str(row, "ORDATE") || today,
      foCode: str(row, "FOCODE") || ctx.foCode,
      checkItemNo: num(row, "CHECKITEMN"),
      dateDep: str(row, "DATEDEP"),
      dateRtrn: str(row, "DATERTRN"),
      rtrnRsn: str(row, "RTRNRSN"),
      userId: str(row, "USERID") || ctx.userId,
      dateStamp: str(row, "DATESTAMP") || today,
      processDate: today,
      userIdCac: ctx.userId,
    };
    store.orRtrnCurr.push(rec);
    written++;
  }
  return { code: "RC1", ok: true, read: rows.length, written, rejected: 0, detail: `ORRTRNCURR +${written}` };
}

/** Port of wf_write2vi → DISWTAX. */
export function write2Vi(
  store: DailyStore,
  rows: Record<string, string | number>[],
  ctx: Write2Context,
): Write2Result {
  const today = todayOf(ctx);
  let written = 0;
  for (const row of rows) {
    const rec: DisWtaxRow = {
      company: ctx.company,
      foCode: str(row, "FOCODE") || ctx.foCode,
      disForm: str(row, "DISFORM"),
      disNo: str(row, "DISNO"),
      disDate: str(row, "DISDATE") || today,
      grpItemNo: num(row, "GRPITEMNO"),
      itemNo: num(row, "ITEMNO"),
      disTaxCode: str(row, "DISTAXCODE"),
      disAmt: num(row, "DISAMT"),
      disTaxRate: num(row, "DISTAXRATE"),
      disTaxWhel: num(row, "DISTAXWHEL"),
      disTaxDesc: str(row, "DISTAXDESC"),
      venCode: str(row, "VENCODE"),
      processDate: today,
      userId: ctx.userId,
    };
    store.disWtax.push(rec);
    written++;
  }
  return { code: "VI", ok: true, read: rows.length, written, rejected: 0, detail: `DISWTAX +${written}` };
}

/** Port of wf_write2ha → HSDLPOR. */
export function write2Ha(
  store: DailyStore,
  rows: Record<string, string | number>[],
  ctx: Write2Context,
): Write2Result {
  const today = todayOf(ctx);
  let written = 0;
  for (const row of rows) {
    const rec: HsDlpOrRow = {
      company: ctx.company,
      foCode: str(row, "FOCODE") || ctx.foCode,
      tranDate: str(row, "TRANDATE") || num(row, "TRANDATE") || today,
      polNo: str(row, "POLNO"),
      oldDlp: num(row, "OLDDLP"),
      adjDlp: num(row, "ADJDLP"),
      orNo: str(row, "ORNO"),
      orDate: str(row, "ORDATE") || today,
      orAmt: num(row, "ORAMT"),
      userId: str(row, "USERID") || ctx.userId,
      dateStamp: str(row, "DATESTAMP") || today,
      processDate: today,
      userIdCac: ctx.userId,
    };
    store.hsDlpOr.push(rec);
    written++;
  }
  return { code: "HA", ok: true, read: rows.length, written, rejected: 0, detail: `HSDLPOR +${written}` };
}

/** Port of wf_write2oa → LAMEND. */
export function write2Oa(
  store: DailyStore,
  rows: Record<string, string | number>[],
  ctx: Write2Context,
): Write2Result {
  const today = todayOf(ctx);
  let written = 0;
  for (const row of rows) {
    const rec: LAmendRow = {
      company: ctx.company,
      foCode: str(row, "FOCODE") || ctx.foCode,
      amendType: str(row, "AMENDTYPE"),
      polNo: str(row, "POLNO"),
      effectDate: str(row, "EFFECTDATE") || today,
      oldPayMode: str(row, "OLDPAYMODE"),
      newPayMode: str(row, "NEWPAYMODE"),
      oldModPrem: num(row, "OLDMODPREM"),
      newModPrem: num(row, "NEWMODPREM"),
      oldAgtNo: str(row, "OLDAGTNO"),
      newAgtNo: str(row, "NEWAGTNO"),
      oldPtd: str(row, "OLDPTD"),
      newPtd: str(row, "NEWPTD"),
      userId: str(row, "USERID") || ctx.userId,
      dateStamp: str(row, "DATESTAMP") || today,
      remarks: str(row, "REMARKS"),
      processDate: today,
      userIdCac: ctx.userId,
    };
    store.lAmend.push(rec);
    written++;
  }
  return { code: "OA", ok: true, read: rows.length, written, rejected: 0, detail: `LAMEND +${written}` };
}

/** Port of wf_write2ob → LAPPLNOHIST. */
export function write2Ob(
  store: DailyStore,
  rows: Record<string, string | number>[],
  ctx: Write2Context,
): Write2Result {
  const today = todayOf(ctx);
  let written = 0;
  for (const row of rows) {
    const rec: LApplNoHistRow = {
      company: ctx.company,
      applNo: str(row, "APPLNO"),
      seqNo: num(row, "SEQNO"),
      effectDate: str(row, "EFFECTDATE") || today,
      newApplNo: str(row, "NEWAPPLNO"),
      userId: str(row, "USERID") || ctx.userId,
      dateStamp: str(row, "DATESTAMP") || today,
      processDate: today,
      userIdCac: ctx.userId,
    };
    store.lApplNoHist.push(rec);
    written++;
  }
  return { code: "OB", ok: true, read: rows.length, written, rejected: 0, detail: `LAPPLNOHIST +${written}` };
}

/** ImportFile + wf_write2* for one TRANEXT code. */
export function write2TranextCode(
  store: DailyStore,
  code: string,
  rows: Record<string, string | number>[],
  ctx: Write2Context,
): Write2Result {
  const upper = code.toUpperCase();
  store.tranextRaw[upper] = [...(store.tranextRaw[upper] ?? []), ...rows];

  switch (upper) {
    case "CS":
      return write2Cs(store, rows, ctx);
    case "DA":
      return write2Da(store, rows, ctx);
    case "RA":
      return write2Ra(store, rows, ctx);
    case "RB":
      return write2Rb(store, rows, ctx);
    case "RC":
      return write2Rc(store, rows, ctx);
    case "RD":
      return write2Rd(store, rows, ctx);
    case "RE":
      return write2Re(store, rows, ctx);
    case "RF":
      return write2Rf(store, rows, ctx);
    case "VA":
      return write2Va(store, rows, ctx);
    case "VB":
      return write2Vb(store, rows, ctx);
    case "VC":
      return write2Vc(store, rows, ctx);
    case "VD":
      return write2Vd(store, rows, ctx);
    case "VE":
      return write2Ve(store, rows, ctx);
    case "VF":
      return write2Vf(store, rows, ctx);
    case "VG":
      return write2Vg(store, rows, ctx);
    case "VH":
      return write2Vh(store, rows, ctx);
    case "RC1":
      return write2Rc1(store, rows, ctx);
    case "VI":
      return write2Vi(store, rows, ctx);
    case "HA":
      return write2Ha(store, rows, ctx);
    case "OA":
      return write2Oa(store, rows, ctx);
    case "OB":
      return write2Ob(store, rows, ctx);
    case "FO_TCDBF":
      return write2FoControl(store, rows);
    default:
      return {
        code: upper,
        ok: true,
        read: rows.length,
        written: rows.length,
        rejected: 0,
        detail: `tranextRaw[${upper}] +${rows.length} (typed writer pending)`,
      };
  }
}

/**
 * Build FOCUS working sets from typed TRANEXT tables (RC/RD/RE/VC/VF/DA).
 * PAYTYPE / DISTYPE become ACCTENT.TRANTYPE keys.
 */
export function focusWorkingFromStore(store: DailyStore): Pick<
  FocusInput,
  "orCash" | "orItems" | "disCash" | "disItems" | "deposits"
> {
  const orCash: OrCashRow[] = [
    ...store.orCashCurr.map((r) => ({
      orNo: r.orNo,
      orDate: r.orDate,
      currency: r.currency || "PHP",
      cashAmt: r.cashAmt,
      payType: "CSH",
      acctType: "ORCASH",
    })),
    ...store.orCheckCurr.map((r) => ({
      orNo: r.orNo,
      orDate: r.orDate,
      currency: r.currency || "PHP",
      cashAmt: r.checkAmt,
      payType: "CHK",
      acctType: "ORCASH",
    })),
  ];
  const orItems: OrItemRow[] = store.orItemDtlCurr.map((r) => ({
    orNo: r.orNo,
    orDate: r.orDate,
    itemNo: r.itemNo,
    payType: r.payType,
    orItemAmt: r.orItemAmt,
    acctType: r.payType || "ORPREM",
  }));
  const disCash: DisCashRow[] = [
    ...store.disCashCurr.map((r) => ({
      disNo: r.disNo,
      disDate: r.disDate,
      currency: r.currency || "PHP",
      cashAmt: r.cashAmt,
      payType: "CSH",
      acctType: "DISCASH",
    })),
    ...store.disCheckCurr.map((r) => ({
      disNo: r.disNo,
      disDate: r.disDate,
      currency: r.currency || "PHP",
      cashAmt: r.checkAmt,
      payType: "CHK",
      acctType: "DISCASH",
    })),
  ];
  const disItems: DisItemRow[] = store.disItemDtlCurr.map((r) => ({
    disNo: r.disNo,
    disDate: r.disDate,
    itemNo: r.itemNo,
    disAmt: r.disAmt,
    payType: r.disType,
    acctType: r.disType || "DISPREM",
  }));
  const deposits: DepositRow[] = store.depositSlip.map((r) => ({
    dsSeqNo: r.dsSeqNo,
    dateDep: r.dateDep,
    amount: r.amount,
    bankAcct: r.acctCode || r.bankAcctNo,
    currency: r.currency,
  }));
  return { orCash, orItems, disCash, disItems, deposits };
}

export interface TranextLoadInput {
  dir: string;
  company: string;
  foCode: string;
  userId: string;
  processDate?: string;
  /** Limit to these codes (basename without .DBF). Default: all *.DBF in dir. */
  codes?: string[];
}

export interface TranextLoadResult {
  ok: boolean;
  results: Write2Result[];
  detail: string;
}

/** Port of FOCUS TRANEXT loop: ImportFile each {code}.DBF then wf_write2*. */
export function runTranextLoad(store: DailyStore, input: TranextLoadInput): TranextLoadResult {
  const ctx: Write2Context = {
    company: input.company,
    foCode: input.foCode,
    userId: input.userId,
    processDate: input.processDate,
  };
  const results: Write2Result[] = [];

  let files: string[];
  try {
    files = readdirSync(input.dir).filter((f) => f.toUpperCase().endsWith(".DBF"));
  } catch (e) {
    return {
      ok: false,
      results: [],
      detail: `Cannot read TRANEXT dir ${input.dir}: ${e instanceof Error ? e.message : String(e)}`,
    };
  }

  const wanted = input.codes?.map((c) => c.toUpperCase());
  // Process FO_TCDBF first when present, then alphabetical
  files.sort((a, b) => {
    const ac = detectTranextCode(a) ?? a;
    const bc = detectTranextCode(b) ?? b;
    if (ac === "FO_TCDBF") return -1;
    if (bc === "FO_TCDBF") return 1;
    return ac.localeCompare(bc);
  });

  for (const file of files) {
    const code = detectTranextCode(file);
    if (!code) continue;
    if (wanted && !wanted.includes(code)) continue;
    const path = join(input.dir, file);
    try {
      const table = readDbfFile(path);
      results.push(write2TranextCode(store, code, table.records, ctx));
    } catch (e) {
      results.push({
        code,
        ok: false,
        read: 0,
        written: 0,
        rejected: 0,
        detail: `ImportFile failed: ${e instanceof Error ? e.message : String(e)}`,
      });
    }
  }

  const failed = results.filter((r) => !r.ok);
  const written = results.reduce((s, r) => s + r.written, 0);
  return {
    ok: failed.length === 0,
    results,
    detail: `TRANEXT ${results.length} file(s), ${written} row(s) written` +
      (failed.length ? `; ${failed.length} failed` : ""),
  };
}

export function loadTranextRowsFromBuffer(
  buf: Buffer,
): Record<string, string | number>[] {
  return readDbfBuffer(buf).records;
}
