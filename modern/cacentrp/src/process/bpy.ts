/**
 * Port of w_bpyinterfaceprocess ue_createacctent.
 *
 * BPYFILE ⋈ ACCTENT:
 *   - trans: TRANTYPE = DTLTYPE (FOCODE forced to 'BRS')
 *   - dep:   TRANTYPE = INCKNO
 * → CURRLEDGE; on balance archive BPYFILE → BPYFILEX and set BDOAPMST='L'.
 * Unbalanced → BDOAPMST='H' + copy to unbalCurrLedge (no archive).
 */
import {
  applyAcctEnt,
  debitCreditTotals,
  matchAcctEnt,
  normalizeDrCrAmount,
  type AcctEntRule,
  type CurrLedgeRow,
  type ProcCdrVar,
} from "./currledge.js";
import { parseMiscFileDate } from "./miscfiledate.js";
import type { BpyFileRow, DailyStore } from "./store.js";

export interface BpyUnitMaps {
  /** SYRUNIT: cocode|rocode → unit */
  syrUnit?: Record<string, string>;
  /** SYRSPCUNIT: cocode|acctcode → unitcode (literal, TRAN, ORIG) */
  spcUnit?: Record<string, string>;
  /** COMAIN: cocode|agtno → origin FO (CIOC) */
  coMain?: Record<string, string>;
}

export interface BpyInput {
  proc: ProcCdrVar;
  acctEnt: AcctEntRule[];
  userId: string;
  /** Cash balance buffer param B01 (required by legacy) */
  buffAmt: number;
  units?: BpyUnitMaps;
}

export interface BpyResult {
  ok: boolean;
  detail: string;
  rows: CurrLedgeRow[];
  batchFile: string;
  totals: { debit: number; credit: number };
  balanced: boolean;
}

function parseBpyAmount(inpamt: string | number): number {
  if (typeof inpamt === "number") return Math.round(inpamt * 100) / 100;
  const s = String(inpamt).trim();
  if (!s) return 0;
  // Implied cents integer string (legacy INPAMT)
  if (/^\d+$/.test(s)) return Number(s) / 100;
  return Number(s);
}

function parseBpyDate(indate: string): string {
  const s = (indate || "").trim();
  if (/^\d{8}$/.test(s)) {
    return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  return s;
}

function resolveUnit(
  row: CurrLedgeRow,
  bpy: BpyFileRow,
  maps: BpyUnitMaps,
  compCode: string,
  forDeposit: boolean,
): string {
  let unit = (row.unit || "").trim();
  const origFo = (bpy.icdrcd || "").trim();
  const transFoUnit = maps.syrUnit?.[`${compCode}|${origFo}`] ?? "";

  if (!forDeposit && transFoUnit) unit = transFoUnit;

  const spc = maps.spcUnit?.[`${row.coCode}|${row.acctCode}`];
  if (spc && spc !== "TRAN" && spc !== "ORIG") unit = spc;
  else if ((spc === "TRAN" || (forDeposit && (spc === "TRAN" || spc === "ORIG"))) && transFoUnit) {
    unit = transFoUnit;
  }

  if (!forDeposit && (spc === "ORIG" || !unit)) {
    const agt = (bpy.iagtcd || "").trim();
    if (agt) {
      const fo = maps.coMain?.[`${row.coCode}|${agt}`];
      if (fo) {
        const u = maps.syrUnit?.[`${row.coCode}|${fo}`];
        if (u) unit = u;
      }
    }
  }

  return unit;
}

function dtlTypeOf(row: BpyFileRow): string {
  const d = (row.dtlType || "").trim();
  if (d) return d;
  return `${row.iactType || ""}${row.inorType || ""}`.trim();
}

export function runBpyMapping(store: DailyStore, input: BpyInput): BpyResult {
  const bpyRows = (store.bpyFile as BpyFileRow[]).filter((r) => r && typeof r === "object");
  if (bpyRows.length === 0) {
    return {
      ok: false,
      detail: "No record(s) to process",
      rows: [],
      batchFile: "Error.bat",
      totals: { debit: 0, credit: 0 },
      balanced: false,
    };
  }

  const today = new Date().toISOString().slice(0, 10);
  const fileDate = parseMiscFileDate(input.proc.fileName);
  const units = input.units ?? {};
  const rows: CurrLedgeRow[] = [];

  let memDoc = "";
  let memTran = "";
  let itemNo = 0;

  const sorted = [...bpyRows].sort((a, b) =>
    `${a.inorno}|${dtlTypeOf(a)}`.localeCompare(`${b.inorno}|${dtlTypeOf(b)}`),
  );

  for (const bpy of sorted) {
    const tranType = dtlTypeOf(bpy);
    if (!tranType) continue;
    const rule =
      matchAcctEnt(input.acctEnt, input.proc.compCode, tranType, bpy.inpsrc) ??
      matchAcctEnt(input.acctEnt, input.proc.compCode, tranType);
    if (!rule) continue;

    const amount = parseBpyAmount(bpy.inpamt);
    const { drCr, amount: amt } = normalizeDrCrAmount(rule.drCr, amount);
    if (bpy.inorno === memDoc) {
      if (rule.tranType !== memTran) itemNo += 1;
    } else {
      itemNo = 1;
    }
    memDoc = bpy.inorno;
    memTran = rule.tranType;

    const refDate = parseBpyDate(bpy.indate) || fileDate;
    const row = applyAcctEnt(
      {
        foCode: "BRS",
        refNo: bpy.inorno || "",
        refDate,
        payType: bpy.inpsrc,
        controlNo: bpy.iagtcd,
        unit: rule.unit ?? "",
      },
      rule,
      amt,
      { sourceType: bpy.inpstp || "BR", userId: input.userId, tranDate: refDate },
    );
    row.drCr = drCr;
    row.amount = amt;
    row.itemNo = itemNo;
    row.foCode = "BRS";
    row.effectDate = today;
    row.processDate = today;
    row.unit = resolveUnit(row, bpy, units, input.proc.compCode, false);
    rows.push(row);
  }

  for (const bpy of bpyRows) {
    const bankKey = (bpy.inckno || "").trim();
    if (!bankKey) continue;
    const rule = matchAcctEnt(input.acctEnt, input.proc.compCode, bankKey);
    if (!rule) continue;
    const amount = parseBpyAmount(bpy.inpamt);
    const { drCr, amount: amt } = normalizeDrCrAmount(rule.drCr, amount);
    const refDate = parseBpyDate(bpy.indate) || fileDate;
    const row = applyAcctEnt(
      {
        foCode: "BRS",
        refNo: bpy.inorno || "",
        refDate,
        controlNo: bpy.iagtcd,
        unit: rule.unit ?? "",
      },
      rule,
      amt,
      { sourceType: bpy.inpstp || "BR", userId: input.userId, tranDate: refDate },
    );
    row.drCr = drCr;
    row.amount = amt;
    row.foCode = "BRS";
    row.effectDate = today;
    row.processDate = today;
    row.unit = resolveUnit(row, bpy, units, input.proc.compCode, true);
    rows.push(row);
  }

  if (rows.length === 0) {
    return {
      ok: false,
      detail: "No record(s) to process",
      rows: [],
      batchFile: "Error.bat",
      totals: { debit: 0, credit: 0 },
      balanced: false,
    };
  }

  const totals = debitCreditTotals(rows);
  const balanced = totals.debit === totals.credit;

  const touchBdo = (status: string) => {
    for (const row of store.bdoApMst) {
      if (
        row.company === input.proc.compCode &&
        (row.bdoCode === input.proc.foCode || row.bdoCode === "BRS") &&
        row.subFile === input.proc.fileName
      ) {
        row.status = status;
      }
    }
  };

  if (!balanced) {
    store.unbalCurrLedge.push(...rows.map((r) => ({ ...r })));
    touchBdo("H");
    return {
      ok: false,
      detail: `Unbalanced BPY CURRLEDGE DR=${totals.debit} CR=${totals.credit}; BDOAPMST=H`,
      rows,
      batchFile: "Error.bat",
      totals,
      balanced: false,
    };
  }

  store.currLedge.push(...rows.map((r) => ({ ...r })));
  store.bpyFileX.push(...bpyRows.map((r) => ({ ...r })));
  store.bpyFile = [];
  touchBdo("L");

  return {
    ok: true,
    detail: `Mapped ${rows.length} BPY CURRLEDGE row(s); DR=${totals.debit} CR=${totals.credit}`,
    rows,
    batchFile: "Success.bat",
    totals,
    balanced: true,
  };
}

export function demoBpyRows(): BpyFileRow[] {
  const today = "20261113";
  return [
    {
      icdrcd: "001",
      ipolno: "POL1",
      inpln: "CLIENT",
      inpfn: "A",
      inpmi: "B",
      iactType: "OR",
      inorType: "CASH",
      iactcd: "",
      inpsgn: " ",
      inpamt: "10000",
      inorno: "ORBPY001",
      indate: today,
      inpsrc: "CSH",
      inpent: "",
      inpstp: "BR",
      iagtcd: "000000001",
      incvno: "",
      inckno: "",
      inprdate: today,
      dtlType: "ORCASH",
    },
    {
      icdrcd: "001",
      ipolno: "POL1",
      inpln: "CLIENT",
      inpfn: "A",
      inpmi: "B",
      iactType: "OR",
      inorType: "PREM",
      iactcd: "",
      inpsgn: " ",
      inpamt: "10000",
      inorno: "ORBPY001",
      indate: today,
      inpsrc: "",
      inpent: "",
      inpstp: "BR",
      iagtcd: "000000001",
      incvno: "",
      inckno: "",
      inprdate: today,
      dtlType: "ORPREM",
    },
  ];
}
