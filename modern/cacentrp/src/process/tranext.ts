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
  FoControlRow,
  OrMainCurrRow,
} from "./store.js";

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
  RC1: "OR item detail (variant)",
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
