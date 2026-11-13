/**
 * Port of w_brsinterfaceprocess — BRS Interface Process.
 *
 * Reads `I:\BIS\*.ALI` fixed-width files:
 *   rectype 1 = control (ALAI/ALDC totals)
 *   rectype 2 = detail → CURRLEDGE + BRSFILEX
 * Validates control vs detail using SYRCACPARAM BI1 bank-account hash,
 * then records BDOAPMST and runs Success/Error.bat (logged only here).
 */
import { readdirSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";
import { emptyCurrLedge, type CurrLedgeRow } from "./currledge.js";
import { parseFileDate } from "./filedate.js";
import type { BrsFileXRow, DailyStore } from "./store.js";

export interface BrsBankParams {
  /** SYRCACPARAM BI1 for ALAI */
  alaiBankAcct: string;
  /** SYRCACPARAM BI1 for ALDC */
  aldcBankAcct: string;
}

export interface BrsUploadOptions {
  /** Directory containing *.ALI (legacy I:\BIS\) */
  inboundDir?: string;
  /** Explicit .ALI file paths (overrides dir listing when set) */
  files?: string[];
  userId?: string;
  processDate?: Date;
  bankParams?: BrsBankParams;
}

export interface BrsFileResult {
  filename: string;
  ok: boolean;
  detail: string;
  detailCount: number;
  batchFile: "Success.bat" | "Error.bat" | "";
}

export interface BrsUploadResult {
  ok: boolean;
  detail: string;
  files: BrsFileResult[];
  currLedgeAdded: number;
  brsFileXAdded: number;
}

const DEFAULT_BANK: BrsBankParams = {
  // mid(9,2)=01 mid(15,2)=01 → factor 2 (convenient for demos)
  alaiBankAcct: "XXXXXXXX01XXXX01XX",
  aldcBankAcct: "XXXXXXXX01XXXX01XX",
};

function mid(s: string, start1: number, len: number): string {
  return s.slice(start1 - 1, start1 - 1 + len);
}

function bankFactor(bankAcct: string): number {
  const a = Number(mid(bankAcct, 9, 2)) || 0;
  const b = Number(mid(bankAcct, 15, 2)) || 0;
  return a + b;
}

function implied2(field: string): number {
  const n = Number(field.trim());
  if (Number.isNaN(n)) return 0;
  return Math.round(n) / 100;
}

function yyyymmddToIso(raw: string): string {
  const s = raw.trim();
  if (/^\d{8}$/.test(s)) {
    return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
  }
  return s;
}

function shortName(filename: string): string {
  const base = basename(filename);
  const dot = base.lastIndexOf(".");
  return dot >= 0 ? base.slice(0, dot) : base;
}

function foFromFilename(filename: string): string {
  const base = basename(filename);
  const dot = base.lastIndexOf(".");
  if (dot >= 3) return base.slice(dot - 3, dot);
  return "000";
}

export interface BrsParseTotals {
  alaiCtrlAmt: number;
  aldcCtrlAmt: number;
  alaiCtrlRec: number;
  aldcCtrlRec: number;
  alaiDtlAmt: number;
  aldcDtlAmt: number;
  alaiDtlRec: number;
  aldcDtlRec: number;
  linesRead: number;
}

export function summarizeBrsFile(content: string): BrsParseTotals {
  const totals: BrsParseTotals = {
    alaiCtrlAmt: 0,
    aldcCtrlAmt: 0,
    alaiCtrlRec: 0,
    aldcCtrlRec: 0,
    alaiDtlAmt: 0,
    aldcDtlAmt: 0,
    alaiDtlRec: 0,
    aldcDtlRec: 0,
    linesRead: 0,
  };
  for (const raw of content.split(/\r?\n/)) {
    if (!raw) continue;
    const rectype = raw[0] ?? "";
    if (rectype === "1") {
      const co = mid(raw, 2, 4);
      const amt = implied2(mid(raw, 14, 16));
      const rec = Number(mid(raw, 30, 10).trim()) || 0;
      if (co === "ALAI") {
        totals.alaiCtrlAmt = amt;
        totals.alaiCtrlRec = rec;
      } else if (co === "ALDC") {
        totals.aldcCtrlAmt = amt;
        totals.aldcCtrlRec = rec;
      }
      totals.linesRead++;
    } else if (rectype === "2") {
      const co = mid(raw, 2, 4);
      const amt = implied2(mid(raw, 61, 14));
      if (co === "ALAI") {
        totals.alaiDtlAmt += amt;
        totals.alaiDtlRec++;
      } else if (co === "ALDC") {
        totals.aldcDtlAmt += amt;
        totals.aldcDtlRec++;
      }
      totals.linesRead++;
    }
  }
  return totals;
}

export function parseBrsDetailLine(
  line: string,
  opts: { processDate: string; effectDate: string; userId: string; itemNo: number },
): { ledge: CurrLedgeRow; brsX: BrsFileXRow } | null {
  const rectype = line[0] ?? "";
  if (rectype === "1" || rectype.charCodeAt(0) === 26) return null;
  if (!line.trim()) return null;

  let coCode = mid(line, 2, 4).trim();
  if (coCode === "ALDC") coCode = "ALAI";

  const amount = implied2(mid(line, 61, 14));
  if (!(amount > 0)) return null;

  const refDate = yyyymmddToIso(mid(line, 29, 8));
  const controlNo = mid(line, 108, 10).trim();
  const drCrRaw = mid(line, 59, 2).trim().toUpperCase();
  const drCr: "DR" | "CR" = drCrRaw === "CR" ? "CR" : "DR";

  const ledge = emptyCurrLedge();
  ledge.coCode = coCode;
  ledge.foCode = mid(line, 6, 3).trim();
  ledge.refNo = mid(line, 9, 20).trim();
  ledge.refDate = refDate;
  ledge.sourceType = mid(line, 37, 2).trim() || "BR";
  ledge.acctCode = mid(line, 39, 20).trim();
  ledge.drCr = drCr;
  ledge.amount = amount;
  ledge.unit = mid(line, 75, 7).trim();
  ledge.origCy = mid(line, 82, 4).trim() || "PHP";
  ledge.locCy = mid(line, 86, 4).trim() || "PHP";
  ledge.lob = mid(line, 90, 4).trim() || "01";
  ledge.processDate = opts.processDate;
  ledge.itemNo = opts.itemNo;
  ledge.recDest = mid(line, 104, 4).trim();
  ledge.controlNo = controlNo;
  ledge.lspAccType = mid(line, 118, 1);
  ledge.lspOrType = mid(line, 119, 1);
  ledge.payType = mid(line, 138, 4).trim();
  ledge.effectDate = opts.effectDate;
  ledge.userId = opts.userId;

  const brsX: BrsFileXRow = {
    coCode,
    refNo: ledge.refNo,
    refDate,
    itemNo: opts.itemNo,
    clientName: mid(line, 149, 30).trim(),
    agentCode: mid(line, 179, 9).trim(),
    polNo: controlNo,
    chkClrNo: Number(mid(line, 198, 9).trim()) || 0,
    sourceFl: "",
    procDate: opts.processDate,
  };

  return { ledge, brsX };
}

function validateTotals(
  totals: BrsParseTotals,
  bank: BrsBankParams,
): string | null {
  const alaiScaled = bankFactor(bank.alaiBankAcct) * totals.alaiDtlAmt;
  const aldcScaled = bankFactor(bank.aldcBankAcct) * totals.aldcDtlAmt;
  // compare to 2 decimals
  const eq = (a: number, b: number) => Math.round(a * 100) === Math.round(b * 100);

  if (!eq(totals.alaiCtrlAmt, alaiScaled)) {
    return "Mismatched Control vs Detail Amount (ALAI)";
  }
  if (!eq(totals.aldcCtrlAmt, aldcScaled)) {
    return "Mismatched Control vs Detail Amount (ALDC)";
  }
  if (totals.alaiCtrlRec !== totals.alaiDtlRec) {
    return "Mismatched Control vs Detail Record Count (ALAI)";
  }
  if (totals.aldcCtrlRec !== totals.aldcDtlRec) {
    return "Mismatched Control vs Detail Record Count (ALDC)";
  }
  if (totals.alaiDtlRec === 0 && totals.aldcDtlRec === 0) {
    return "No record(s) to process";
  }
  if (!bank.alaiBankAcct.trim()) return "BIS Bank Account Number is missing (ALAI)";
  if (!bank.aldcBankAcct.trim()) return "BIS Bank Account Number is missing (ALDC)";
  return null;
}

/** Build a demo .ALI file content (ALAI only, factor=2 with DEFAULT_BANK). */
export function buildDemoAliContent(opts?: {
  amount?: number;
  foCode?: string;
  refNo?: string;
  processYmd?: string;
}): string {
  const amount = opts?.amount ?? 100;
  const cents14 = String(Math.round(amount * 100)).padStart(14, "0");
  const factor = bankFactor(DEFAULT_BANK.alaiBankAcct);
  const ctrlCents16 = String(Math.round(amount * factor * 100)).padStart(16, "0");
  const ymd = (opts?.processYmd ?? "20261113").replace(/-/g, "");
  const fo = (opts?.foCode ?? "001").padEnd(3).slice(0, 3);
  const ref = (opts?.refNo ?? "BR0001").padEnd(20).slice(0, 20);

  const ctrl =
    "1" +
    "ALAI" +
    " ".repeat(8) +
    ctrlCents16 +
    String(1).padStart(10, "0");

  // detail positions through ~206
  const detail = [
    "2", // 1
    "ALAI", // 2-5
    fo, // 6-8
    ref, // 9-28
    ymd, // 29-36
    "BR", // 37-38
    "101001".padEnd(20), // 39-58
    "DR", // 59-60
    cents14, // 61-74
    "M001".padEnd(7), // 75-81
    "PHP ", // 82-85
    "PHP ", // 86-89
    "01  ", // 90-93
    " ".repeat(10), // 94-103
    "lsp ", // 104-107
    "POL0000001", // 108-117
    "R", // 118
    "1", // 119
    " ".repeat(8), // 120-127 effect unused
    "DEMO".padEnd(10), // 128-137
    "CSH ", // 138-141
    " ".repeat(7), // 142-148
    "DEMO CLIENT".padEnd(30), // 149-178
    "000000001", // 179-187
    " ".repeat(10), // 188-197
    "000000005", // 198-206
  ].join("");

  // ALDC empty controls so counts match 0=0
  const ctrlAldc =
    "1" + "ALDC" + " ".repeat(8) + "0".repeat(16) + "0".repeat(10);

  return [ctrl, ctrlAldc, detail].join("\r\n") + "\r\n";
}

export function processBrsFile(
  store: DailyStore,
  filePath: string,
  content: string,
  opts: {
    userId: string;
    processDate: string;
    bank: BrsBankParams;
  },
): BrsFileResult {
  const filename = basename(filePath);
  const short = shortName(filename);

  if (store.bdoApMst.some((r) => r.subFile === short)) {
    return {
      filename,
      ok: false,
      detail: `Duplicate File: already processed (${short})`,
      detailCount: 0,
      batchFile: "",
    };
  }

  const totals = summarizeBrsFile(content);
  const err = validateTotals(totals, opts.bank);
  if (err) {
    return {
      filename,
      ok: false,
      detail: err,
      detailCount: 0,
      batchFile: "Error.bat",
    };
  }

  const effectDate = parseFileDate(short);
  let itemNo = 0;
  let detailCount = 0;
  let lastCo = "ALAI";

  for (const raw of content.split(/\r?\n/)) {
    if (!raw) continue;
    if ((raw[0] ?? "") === "1") continue;
    itemNo += 1;
    const parsed = parseBrsDetailLine(raw, {
      processDate: opts.processDate,
      effectDate,
      userId: opts.userId,
      itemNo,
    });
    if (!parsed) {
      itemNo -= 1;
      continue;
    }
    parsed.brsX.sourceFl = short;
    store.currLedge.push(parsed.ledge);
    store.brsFileX.push(parsed.brsX);
    lastCo = parsed.ledge.coCode;
    detailCount += 1;
  }

  const foCode = foFromFilename(filename);
  store.bdoApMst.push({
    company: lastCo,
    bdoCode: foCode,
    source: "1",
    processDate: opts.processDate,
    status: "L",
    subFile: short,
    userId: opts.userId,
  });

  return {
    filename,
    ok: true,
    detail: `Uploaded ${detailCount} detail(s) → CURRLEDGE/BRSFILEX`,
    detailCount,
    batchFile: "Success.bat",
  };
}

export function runBrsUpload(store: DailyStore, options: BrsUploadOptions = {}): BrsUploadResult {
  const userId = options.userId ?? "DEMO";
  const processDate = (options.processDate ?? new Date()).toISOString().slice(0, 10);
  const bank = options.bankParams ?? DEFAULT_BANK;

  let paths = options.files ?? [];
  if (paths.length === 0 && options.inboundDir) {
    try {
      paths = readdirSync(options.inboundDir)
        .filter((f) => f.toUpperCase().endsWith(".ALI"))
        .map((f) => join(options.inboundDir!, f));
    } catch {
      return {
        ok: false,
        detail: `Cannot list BRS dir ${options.inboundDir}`,
        files: [],
        currLedgeAdded: 0,
        brsFileXAdded: 0,
      };
    }
  }

  if (paths.length === 0) {
    return {
      ok: true,
      detail: "No BRS Files to process or Drive I not correctly mapped",
      files: [],
      currLedgeAdded: 0,
      brsFileXAdded: 0,
    };
  }

  const beforeL = store.currLedge.length;
  const beforeX = store.brsFileX.length;
  const files: BrsFileResult[] = [];

  for (const path of paths) {
    const content = readFileSync(path, "latin1");
    files.push(processBrsFile(store, path, content, { userId, processDate, bank }));
  }

  const uploaded = files.filter((f) => f.ok).length;
  const hardFail = files.some((f) => !f.ok && f.batchFile === "Error.bat");
  return {
    ok: !hardFail && (uploaded > 0 || files.every((f) => f.batchFile === "")),
    detail: `BRS files=${files.length} uploaded=${uploaded}`,
    files,
    currLedgeAdded: store.currLedge.length - beforeL,
    brsFileXAdded: store.brsFileX.length - beforeX,
  };
}
