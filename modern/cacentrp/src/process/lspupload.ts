/**
 * Port of w_lspupload — Load LSP records.
 *
 * CURRLEDGE (RECDEST='lsp', amount>0) → fixed-width .lsp files + INTINPFL rows.
 * Optional NLSP account list (SYRNLSPUPLD) appends matching RECDEST='nlsp' rows.
 *
 * Output files (legacy):
 *   c:\cacent~~1\lspapln\UN_{mm}{dd}.lsp
 *   c:\cacent~~1\lspalai\UN_{mm}{dd}.lsp
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { CurrLedgeRow } from "./currledge.js";
import type { DailyStore, IntInpFlRow } from "./store.js";
import {
  amountToLspImplied13,
  formatMmDdYy,
  padLeftSpace,
  padLeftZero,
  padRightSpace,
} from "./pad.js";

export type LspCompany = "APLN" | "ALAI";

export interface LspCurrent {
  icdrcd: string;
  ipolno: string;
  inpln: string;
  inpfn: string;
  inpmi: string;
  iacttype: string;
  inortype: string;
  iactcd: string;
  inpsgn: string;
  inpamt: string;
  inorno: string;
  indate: string; // mm/dd/yyyy
  inpsrc: string;
  inpent: string;
  inpstp: string;
  iagtcd: string;
  incvno: string;
  inckno: string;
  inprdate: string; // mmddyyyy
  inpclrdt: string; // yyyymmdd
  compcode: string;
  procdte: string;
  userid: string;
}

export interface LspEnrichment {
  policyNo?: string;
  lastName?: string;
  firstInitial?: string;
  middleInitial?: string;
  orNo?: string;
  agentCode?: string;
  cvNo?: string;
  checkNo?: string;
  entryNo?: string;
}

export interface LspUploadOptions {
  processDate?: Date;
  userId?: string;
  outDir?: string;
  /** SYRNLSPUPLD account codes — NLSP rows with these accounts are also uploaded */
  nlspAcctCodes?: string[];
  /** Optional lookup: (row) → enrichment for policy/payor/agent fields */
  enrich?: (row: CurrLedgeRow) => LspEnrichment | undefined;
  clearIntInpFl?: boolean;
}

export interface LspFileResult {
  company: LspCompany;
  filename: string;
  path?: string;
  lineCount: number;
  lines: string[];
}

export interface LspUploadResult {
  ok: boolean;
  detail: string;
  files: LspFileResult[];
  intInpFlCount: number;
  processed: number;
}

const COMPANY_DIRS: Record<LspCompany, string> = {
  APLN: "lspapln",
  ALAI: "lspalai",
};

function emptyLsp(): LspCurrent {
  return {
    icdrcd: "",
    ipolno: "",
    inpln: "",
    inpfn: "",
    inpmi: "",
    iacttype: "",
    inortype: "",
    iactcd: "",
    inpsgn: "",
    inpamt: "",
    inorno: "",
    indate: "",
    inpsrc: "",
    inpent: "",
    inpstp: "",
    iagtcd: "",
    incvno: "",
    inckno: "",
    inprdate: "",
    inpclrdt: "00000000",
    compcode: "",
    procdte: "",
    userid: "",
  };
}

function formatRefMmDdYyyy(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (m) return `${m[2]}${m[3]}${m[1]}`;
  return padRightSpace(iso.replace(/-/g, ""), 8).slice(0, 8);
}

function formatRefSlash(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (m) return `${m[2]}/${m[3]}/${m[1]}`;
  return iso;
}

function addDaysYyyymmdd(iso: string, days: number): string {
  const dt = new Date(iso + (iso.length === 10 ? "T00:00:00" : ""));
  dt.setDate(dt.getDate() + days);
  const y = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${y}${mm}${dd}`;
}

function pbStringAt(value: string, width: number): string {
  // PowerBuilder STRING(x, "@@@@...") pads/truncates to width with spaces on the right.
  return padRightSpace(value ?? "", width);
}

export function formatLspLine(rec: LspCurrent): string {
  const iornum = (rec.inorno || "").trim();
  let indateYmd = "";
  const slash = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(rec.indate);
  if (slash) indateYmd = `${slash[3]}${slash[1]}${slash[2]}`;
  else indateYmd = (rec.indate || "").replace(/\D/g, "").slice(0, 8);

  let clr = (rec.inpclrdt || "00000000").replace(/\D/g, "");
  if (clr.length === 8 && clr.includes("/")) {
    // already cleaned
  }
  if (clr.length !== 8) clr = "00000000";

  return (
    pbStringAt(rec.compcode, 4) +
    pbStringAt(rec.icdrcd, 3) +
    pbStringAt(rec.ipolno, 10) +
    pbStringAt(rec.inpln, 15) +
    pbStringAt(rec.inpfn, 1) +
    pbStringAt(rec.inpmi, 1) +
    pbStringAt(rec.iacttype, 1) +
    pbStringAt(rec.inortype, 1) +
    pbStringAt(rec.iactcd, 6) +
    pbStringAt(rec.inpsgn, 1) +
    pbStringAt(rec.inpamt, 13) +
    pbStringAt(iornum, 7) +
    pbStringAt(indateYmd, 8) +
    pbStringAt(rec.inpsrc, 1) +
    pbStringAt(rec.inpent, 10) +
    pbStringAt(rec.inpstp, 2) +
    pbStringAt(rec.iagtcd, 9) +
    pbStringAt(rec.incvno, 10) +
    pbStringAt(rec.inckno, 6) +
    pbStringAt(rec.inprdate, 8) +
    pbStringAt(clr, 8)
  );
}

export function currLedgeToLspCurrent(
  row: CurrLedgeRow,
  opts: { processDate: Date; userId: string; enrich?: LspEnrichment },
): LspCurrent {
  const e = opts.enrich ?? {};
  const pay = (row.payType || "").trim().toUpperCase();
  const isCheck = pay === "Q" || pay === "CHK";

  const rec = emptyLsp();
  rec.icdrcd = row.foCode || "";
  rec.iacttype = row.lspAccType || "";
  rec.inortype = row.lspOrType || "";
  rec.iactcd = row.acctCode || "";
  rec.inpamt = amountToLspImplied13(row.amount);
  rec.indate = formatRefSlash(row.refDate);
  rec.inpsrc = pay === "CHK" ? "Q" : pay.slice(0, 1);
  rec.inpent = e.entryNo || "";
  rec.inpstp = (row.sourceType || "").slice(0, 2);
  rec.inprdate = formatRefMmDdYyyy(row.refDate);
  rec.compcode = row.coCode || "";
  rec.procdte = formatMmDdYy(opts.processDate);
  rec.userid = opts.userId;
  rec.inpsgn = row.drCr === "CR" ? "-" : " ";

  rec.ipolno = e.policyNo || (row.refNo || "").slice(0, 10);
  rec.inpln = e.lastName || "";
  rec.inpfn = e.firstInitial || " ";
  rec.inpmi = e.middleInitial || " ";
  rec.inorno = e.orNo || (row.sourceType === "FC" ? row.refNo : " ");
  rec.iagtcd = e.agentCode || "";
  if (rec.iagtcd && rec.iagtcd.trim().length > 0 && rec.iagtcd.trim().length < 9) {
    rec.iagtcd = padLeftZero(rec.iagtcd.trim(), 9);
  }
  rec.incvno = e.cvNo || "";
  rec.inckno = e.checkNo || "";
  rec.inpclrdt = isCheck ? addDaysYyyymmdd(row.refDate, 5) : "00000000";

  // ALDC → file under ALAI company loop (legacy remaps)
  if (rec.compcode === "ALDC") rec.compcode = "ALDC";

  return rec;
}

function toIntInpFl(rec: LspCurrent, amount: number, processDate: Date): IntInpFlRow | null {
  const iactcd = Number(rec.iactcd) || 0;
  if (iactcd === 450001) return null; // Agent Balances SOA skipped

  const slash = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(rec.indate);
  const iordtm = slash ? Number(slash[1]) : 0;
  const iordtd = slash ? Number(slash[2]) : 0;
  const iordtc = slash ? Number(slash[3].slice(0, 2)) : 0;
  const iordty = slash ? Number(slash[3].slice(2)) : 0;

  let iornum = (rec.inorno || "").trim();
  if (iornum.length > 7) iornum = iornum.slice(3);

  let incvno = rec.incvno || "";
  // legacy formats as @@@-@@@@@@@ then trims lone '-'
  if (incvno.replace(/\s/g, "") === "-") incvno = "";

  return {
    icomp: pbStringAt(rec.compcode, 4).trimEnd(),
    icdrcd: pbStringAt(rec.icdrcd, 3).trimEnd(),
    ipolno: padLeftSpace((rec.ipolno || "").trim(), 10),
    inpln: pbStringAt(rec.inpln, 15).trimEnd(),
    inpfn: rec.inpfn || "",
    inpmi: rec.inpmi || "",
    inpact: rec.iacttype || "",
    inpopt: rec.inortype || "",
    iactcd,
    inpsgn: (rec.inpsgn || "").trim(),
    inpamt: amount,
    iornum,
    iordtc,
    iordty,
    iordtm,
    iordtd,
    inpsrc: rec.inpsrc || "",
    inpent: rec.inpent || "",
    inpstp: rec.inpstp || "",
    iagtcd: rec.iagtcd || "",
    incvno,
    inckno: rec.inckno || "",
    inprdt: `${processDate.getFullYear()}${String(processDate.getMonth() + 1).padStart(2, "0")}${String(processDate.getDate()).padStart(2, "0")}`,
    iclrdt: rec.inpclrdt || "00000000",
  };
}

function selectRows(
  currLedge: CurrLedgeRow[],
  company: LspCompany,
  nlspAcctCodes: string[],
): CurrLedgeRow[] {
  const nlspSet = new Set(nlspAcctCodes.map((a) => a.trim()));
  return currLedge.filter((r) => {
    if (!(r.amount > 0)) return false;
    const co = r.coCode;
    const companyOk =
      co === company || (company === "ALAI" && (co === "ALAI" || co === "ALDC"));
    if (!companyOk) return false;
    const dest = (r.recDest || "").toLowerCase();
    if (dest === "lsp") return true;
    if (dest === "nlsp" && nlspSet.size > 0 && nlspSet.has((r.acctCode || "").trim())) {
      return true;
    }
    return false;
  });
}

export function runLspUpload(store: DailyStore, options: LspUploadOptions = {}): LspUploadResult {
  const processDate = options.processDate ?? new Date();
  const userId = options.userId ?? "DEMO";
  const nlspAcctCodes = options.nlspAcctCodes ?? [];
  const mmdd = `${String(processDate.getMonth() + 1).padStart(2, "0")}${String(processDate.getDate()).padStart(2, "0")}`;
  const filename = `UN_${mmdd}.lsp`;

  if (options.clearIntInpFl !== false) {
    store.intInpFl = [];
  }

  const files: LspFileResult[] = [];
  let processed = 0;

  for (const company of ["APLN", "ALAI"] as LspCompany[]) {
    const rows = selectRows(store.currLedge, company, nlspAcctCodes);
    if (rows.length === 0) {
      files.push({ company, filename, lineCount: 0, lines: [] });
      continue;
    }

    const lines: string[] = [];
    for (const row of rows) {
      const enrich = options.enrich?.(row);
      const rec = currLedgeToLspCurrent(row, { processDate, userId, enrich });
      // File write uses original company code (incl. ALDC under ALAI file)
      if (company === "ALAI" && row.coCode === "ALDC") {
        rec.compcode = "ALDC";
      }
      lines.push(formatLspLine(rec));
      const inp = toIntInpFl(rec, row.amount, processDate);
      if (inp) store.intInpFl.push(inp);
      processed += 1;
    }

    let path: string | undefined;
    if (options.outDir) {
      const dir = join(options.outDir, COMPANY_DIRS[company]);
      mkdirSync(dir, { recursive: true });
      path = join(dir, filename);
      writeFileSync(path, lines.join("\r\n") + "\r\n", "latin1");
    }

    files.push({ company, filename, path, lineCount: lines.length, lines });
  }

  const written = files.filter((f) => f.lineCount > 0);
  if (written.length === 0) {
    return {
      ok: true,
      detail: "No LSP/NLSP CURRLEDGE rows to process",
      files,
      intInpFlCount: store.intInpFl.length,
      processed: 0,
    };
  }

  return {
    ok: true,
    detail: `Wrote ${written.map((f) => `${f.company}:${f.lineCount}`).join(", ")} → ${filename}; INTINPFL=${store.intInpFl.length}`,
    files,
    intInpFlCount: store.intInpFl.length,
    processed,
  };
}

export function seedDemoLspLedger(store: DailyStore): void {
  const today = new Date().toISOString().slice(0, 10);
  const base = (): CurrLedgeRow => ({
    coCode: "",
    foCode: "",
    refNo: "",
    refDate: today,
    sourceType: "",
    acctCode: "",
    drCr: "DR",
    amount: 0,
    unit: "",
    origCy: "PHP",
    locCy: "PHP",
    lob: "",
    processDate: today,
    recDest: "lsp",
    controlNo: "",
    lspAccType: "",
    lspOrType: "",
    payType: "",
    effectDate: "",
    userId: "DEMO",
  });

  const a = base();
  a.coCode = "ALAI";
  a.foCode = "001";
  a.refNo = "OR000101";
  a.sourceType = "FC";
  a.acctCode = "101001";
  a.drCr = "DR";
  a.amount = 1500.5;
  a.unit = "M001";
  a.lob = "01";
  a.lspAccType = "R";
  a.lspOrType = "1";
  a.payType = "CSH";
  store.currLedge.push(a);

  const b = base();
  b.coCode = "ALAI";
  b.foCode = "001";
  b.refNo = "OR000102";
  b.sourceType = "FC";
  b.acctCode = "401001";
  b.drCr = "CR";
  b.amount = 1500.5;
  b.unit = "M001";
  b.lob = "01";
  b.lspAccType = "R";
  b.lspOrType = "1";
  b.payType = "CHK";
  store.currLedge.push(b);

  const c = base();
  c.coCode = "APLN";
  c.foCode = "080";
  c.refNo = "CD000201";
  c.sourceType = "CD";
  c.acctCode = "201001";
  c.drCr = "DR";
  c.amount = 250;
  c.unit = "X001";
  c.lob = "01";
  c.lspAccType = "C";
  c.lspOrType = "2";
  c.payType = "C";
  store.currLedge.push(c);
}
