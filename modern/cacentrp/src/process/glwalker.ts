/**
 * Port of w_glwalker — Create GL Walker Text File.
 *
 * Pipeline per company (AHCI→H.GLW, ALAI→A.GLW, APLN→P.GLW):
 *   1. Build detail (rectype 02) rows from CURRLEDGE (NLSP) [+ optional LSP GLWDTL]
 *   2. Aggregate header (rectype 01) per control/group/date
 *   3. Emit control (rectype 00) with header/detail counts
 *   4. Write fixed-width concatenated lines
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import type { CurrLedgeRow } from "./currledge.js";
import {
  amountToImplied2,
  formatMmDdYy,
  formatMmDdYyyy,
  padLeftZero,
  padRightSpace,
  padRightZero,
} from "./pad.js";

export type GlwCompany = "AHCI" | "ALAI" | "APLN";

export interface GlwDetail {
  gwrect: string; // 02
  gwctle: string; // 4
  gwgrpn: string; // 10
  gwgrpd: string; // 8 mmddyyyy
  gwjrnn: string; // 20
  gwjrnd: string; // 8
  gwseqn: string; // 4
  gwfil1: string; // 1
  gwcmpy: string; // 7
  gwactc: string; // 10
  gwcurr: string; // 3
  gwcntr: string; // 7 unit
  gwlobc: string; // 4
  gwdccd: string; // 1 D/C
  gwoamt: string; // 16 implied cents
  gwlamt: string; // 16 local
  gwtrnc: string; // 3
  gwref1: string; // 12 doc
  gwref2: string; // 12 policy/agent
  gwref3: string; // 20 payor
  gwref4: string; // 13 field/BDO
  gwencs: string;
  gwrtts: string;
  gwstaa: string;
  gwstav: string;
  gwadbs: string;
  gwdocr: string; // 10
  gwrevd: string;
  gwreva: string;
  gwreve: string;
  gwrtty: string;
  gwxchr: string;
  gwrted: string;
  gwsacc: string;
  gwfil2: string;
}

export interface GlwHeader {
  gwrect: string; // 01
  gwctle: string;
  gwgrpn: string;
  gwgrpd: string;
  filler: string;
  gwgrps: string; // seq
  filler1: string;
  gwmbar: string;
  gwvers: string;
  gwcloa: string;
  gwclop: string;
  gwcloy: string;
  gwtotd: string; // detail count
  gwtota: string; // hash of account codes
  gwtotod: string; // orig debit
  gwtotoc: string; // orig credit
  gwtotld: string; // local debit
  gwtotlc: string; // local credit
  filler2: string;
  gwrecs: string;
  gwrecj: string;
  gwjoub: string;
  gwcurc: string;
  gwauto: string;
  gwauta: string;
  gwbegb: string;
  gwsack: string;
  gwsackb: string;
  gwratt: string;
  gwexcr: string;
  gwicoc: string;
  gwicos: string;
  gwacc: string;
  gwrevd: string;
  gwconi: string;
  gwdesc: string;
  gwbalsw: string;
}

export interface GlwControl {
  gwrect: string; // 00
  gwtoth: string; // header count
  gwtotd: string; // detail count
  filler: string;
}

export interface GlwOptions {
  company: GlwCompany;
  processDate?: Date;
  /** SYRCACPARAM C50 control ledger code */
  controlCode?: string;
  groupNumber?: string;
  journalNumber?: string;
  bookingRate?: number;
  outDir?: string;
}

const COMPANY_SUFFIX: Record<GlwCompany, string> = {
  AHCI: "H",
  ALAI: "A",
  APLN: "P",
};

function companyCodeForFile(company: GlwCompany): string {
  return company === "APLN" ? "APLANS" : company;
}

function drCrToDc(drCr: string): string {
  return drCr.trim().toUpperCase() === "CR" ? "C" : "D";
}

export function detailLine(d: GlwDetail): string {
  return (
    d.gwrect +
    d.gwctle +
    d.gwgrpn +
    d.gwgrpd +
    d.gwjrnn +
    d.gwjrnd +
    d.gwseqn +
    d.gwfil1 +
    d.gwcmpy +
    d.gwactc +
    d.gwcurr +
    d.gwcntr +
    d.gwlobc +
    d.gwdccd +
    d.gwoamt +
    d.gwlamt +
    d.gwtrnc +
    d.gwref1 +
    d.gwref2 +
    d.gwref3 +
    d.gwref4 +
    d.gwencs +
    d.gwrtts +
    d.gwstaa +
    d.gwstav +
    d.gwadbs +
    d.gwdocr +
    d.gwrevd +
    d.gwreva +
    d.gwreve +
    d.gwrtty +
    d.gwxchr +
    d.gwrted +
    d.gwsacc +
    d.gwfil2
  );
}

export function headerLine(h: GlwHeader): string {
  return (
    h.gwrect +
    h.gwctle +
    h.gwgrpn +
    h.gwgrpd +
    h.filler +
    h.gwgrps +
    h.filler1 +
    h.gwmbar +
    h.gwvers +
    h.gwcloa +
    h.gwclop +
    h.gwcloy +
    h.gwtotd +
    h.gwtota +
    h.gwtotod +
    h.gwtotoc +
    h.gwtotld +
    h.gwtotlc +
    h.filler2 +
    h.gwrecs +
    h.gwrecj +
    h.gwjoub +
    h.gwcurc +
    h.gwauto +
    h.gwauta +
    h.gwbegb +
    h.gwsack +
    h.gwsackb +
    h.gwratt +
    h.gwexcr +
    h.gwicoc +
    h.gwicos +
    h.gwacc +
    h.gwrevd +
    h.gwconi +
    h.gwdesc +
    h.gwbalsw
  );
}

export function controlLine(c: GlwControl): string {
  return c.gwrect + c.gwtoth + c.gwtotd + c.filler;
}

export function currLedgeToDetails(
  rows: CurrLedgeRow[],
  opts: {
    company: GlwCompany;
    controlCode: string;
    groupNumber: string;
    journalNumber: string;
    processDate: Date;
    bookingRate?: number;
  },
): GlwDetail[] {
  const details: GlwDetail[] = [];
  const gwgrpd = formatMmDdYyyy(opts.processDate);
  const blank = "";
  let seq = 0;
  const rate = opts.bookingRate ?? 1;

  for (const row of rows) {
    if (row.coCode && row.coCode !== opts.company && !(opts.company === "ALAI" && row.coCode === "ALDC")) {
      // allow unmatched empty coCode through for demos keyed by company filter upstream
      if (row.coCode !== opts.company) continue;
    }
    seq += 1;
    const unit = (row.unit || "").trim() || "X001";
    const orig = row.amount;
    const local = row.origCy && row.origCy !== "PHP" ? orig * rate : orig;
    const detail: GlwDetail = {
      gwrect: "02",
      gwctle: padRightSpace(opts.controlCode, 4),
      gwgrpn: padRightSpace(opts.groupNumber, 10),
      gwgrpd,
      gwjrnn: padRightSpace(opts.journalNumber, 20),
      gwjrnd: gwgrpd,
      gwseqn: padLeftZero(seq, 4),
      gwfil1: " ",
      gwcmpy: padRightSpace(companyCodeForFile(opts.company), 7),
      gwactc: padRightSpace(row.acctCode, 10),
      gwcurr: padRightSpace(row.origCy || "PHP", 3),
      gwcntr: padRightSpace(unit, 7),
      gwlobc: padRightSpace(row.lob || "01", 4),
      gwdccd: drCrToDc(row.drCr),
      gwoamt: amountToImplied2(orig, 16),
      gwlamt: amountToImplied2(local, 16),
      gwtrnc: padRightSpace(blank, 3),
      gwref1: padRightSpace((row.refNo || "").slice(0, 12), 12),
      gwref2: padRightSpace(blank, 12),
      gwref3: padRightSpace(blank, 20),
      gwref4: padRightSpace(row.foCode || blank, 13),
      gwencs: "N",
      gwrtts: padRightSpace(blank, 1),
      gwstaa: padRightZero(blank, 16),
      gwstav: padRightSpace(blank, 2),
      gwadbs: "N",
      gwdocr: padRightSpace(formatMmDdYyyy(row.refDate || opts.processDate), 10),
      gwrevd: padRightSpace(blank, 8),
      gwreva: padRightSpace(blank, 34),
      gwreve: padRightSpace(blank, 4),
      gwrtty: padRightSpace(blank, 4),
      gwxchr: padRightSpace(blank, 15),
      gwrted: padRightSpace(blank, 8),
      gwsacc: padRightSpace(blank, 34),
      gwfil2: padRightSpace(blank, 1),
    };
    details.push(detail);
  }
  return details;
}

function parseImplied2(s: string): number {
  const n = Number(s);
  if (Number.isNaN(n)) return 0;
  return n / 100;
}

export function buildHeaders(details: GlwDetail[]): GlwHeader[] {
  const groups = new Map<string, GlwDetail[]>();
  for (const d of details) {
    const key = `${d.gwctle}|${d.gwgrpn}|${d.gwgrpd}`;
    const list = groups.get(key) ?? [];
    list.push(d);
    groups.set(key, list);
  }

  const headers: GlwHeader[] = [];
  let seq = 0;
  const blank = "";
  for (const [, rows] of groups) {
    seq += 1;
    let hash = 0;
    let origDr = 0;
    let origCr = 0;
    let locDr = 0;
    let locCr = 0;
    for (const r of rows) {
      hash += Number(r.gwactc.trim()) || 0;
      const o = parseImplied2(r.gwoamt);
      const l = parseImplied2(r.gwlamt);
      if (r.gwdccd === "D") {
        origDr += o;
        locDr += l;
      } else {
        origCr += o;
        locCr += l;
      }
    }
    const first = rows[0]!;
    headers.push({
      gwrect: "01",
      gwctle: first.gwctle,
      gwgrpn: first.gwgrpn,
      gwgrpd: first.gwgrpd,
      filler: padRightSpace(blank, 28),
      gwgrps: padLeftZero(seq, 4),
      filler1: padRightSpace(blank, 1),
      gwmbar: "P",
      gwvers: padRightZero("0", 2),
      gwcloa: "N",
      gwclop: padRightSpace(blank, 2),
      gwcloy: padRightSpace(blank, 4),
      gwtotd: padLeftZero(rows.length, 12),
      gwtota: padLeftZero(hash, 12),
      gwtotod: amountToImplied2(origDr, 16),
      gwtotoc: amountToImplied2(origCr, 16),
      gwtotld: amountToImplied2(locDr, 16),
      gwtotlc: amountToImplied2(locCr, 16),
      filler2: padRightSpace(blank, 8),
      gwrecs: padRightSpace(blank, 1),
      gwrecj: padRightSpace(blank, 1),
      gwjoub: padRightSpace(blank, 1),
      gwcurc: padRightSpace(blank, 3),
      gwauto: padRightSpace(blank, 1),
      gwauta: padRightSpace(blank, 1),
      gwbegb: padRightSpace(blank, 1),
      gwsack: padRightSpace(blank, 1),
      gwsackb: padRightSpace(blank, 1),
      gwratt: padRightSpace(blank, 1),
      gwexcr: padRightSpace(blank, 1),
      gwicoc: padRightSpace(blank, 1),
      gwicos: padRightSpace(blank, 1),
      gwacc: padRightSpace(blank, 1),
      gwrevd: padRightSpace(blank, 8),
      gwconi: padRightSpace(blank, 1),
      gwdesc: padRightSpace(blank, 30),
      gwbalsw: padRightSpace(blank, 1),
    });
  }
  return headers;
}

export function buildControl(headers: GlwHeader[], details: GlwDetail[]): GlwControl {
  return {
    gwrect: "00",
    gwtoth: padLeftZero(headers.length, 12),
    gwtotd: padLeftZero(details.length, 12),
    filler: padRightSpace("", 100),
  };
}

export interface GlwResult {
  ok: boolean;
  company: GlwCompany;
  filename: string;
  path?: string;
  controlCount: number;
  headerCount: number;
  detailCount: number;
  lines: string[];
  detail: string;
}

export function runGlWalker(
  currLedge: CurrLedgeRow[],
  options: GlwOptions,
): GlwResult {
  const processDate = options.processDate ?? new Date();
  const controlCode = options.controlCode ?? "CAC1";
  const groupNumber = options.groupNumber ?? formatMmDdYy(processDate);
  const journalNumber = options.journalNumber ?? `CAC${formatMmDdYy(processDate)}`;

  const filtered = currLedge.filter(
    (r) => !r.coCode || r.coCode === options.company || (options.company === "ALAI" && r.coCode === "ALDC"),
  );

  const details = currLedgeToDetails(filtered, {
    company: options.company,
    controlCode,
    groupNumber,
    journalNumber,
    processDate,
    bookingRate: options.bookingRate,
  });

  if (details.length === 0) {
    return {
      ok: true,
      company: options.company,
      filename: `${formatMmDdYy(processDate)}${COMPANY_SUFFIX[options.company]}.GLW`,
      controlCount: 0,
      headerCount: 0,
      detailCount: 0,
      lines: [],
      detail: `No CURRLEDGE rows for ${options.company}`,
    };
  }

  const headers = buildHeaders(details);
  const control = buildControl(headers, details);

  // Legacy write order: for each control, write control then each header then matching details
  const lines: string[] = [];
  lines.push(controlLine(control));
  for (const h of headers) {
    lines.push(headerLine(h));
    for (const d of details) {
      if (d.gwctle.trim() === h.gwctle.trim() && d.gwgrpn.trim() === h.gwgrpn.trim() && d.gwgrpd === h.gwgrpd) {
        lines.push(detailLine(d));
      }
    }
  }

  const filename = `${formatMmDdYy(processDate)}${COMPANY_SUFFIX[options.company]}.GLW`;
  let path: string | undefined;
  if (options.outDir) {
    mkdirSync(options.outDir, { recursive: true });
    path = join(options.outDir, filename);
    writeFileSync(path, lines.join("\r\n") + "\r\n", "latin1");
  }

  return {
    ok: true,
    company: options.company,
    filename,
    path,
    controlCount: 1,
    headerCount: headers.length,
    detailCount: details.length,
    lines,
    detail: `Wrote ${headers.length} header(s), ${details.length} detail(s) → ${filename}`,
  };
}

export function runGlWalkerAllCompanies(
  currLedge: CurrLedgeRow[],
  outDir: string,
  opts: Omit<GlwOptions, "company" | "outDir"> = {},
): GlwResult[] {
  return (["AHCI", "ALAI", "APLN"] as GlwCompany[]).map((company) =>
    runGlWalker(currLedge, { ...opts, company, outDir }),
  );
}
