/**
 * Port of w_grpinterfaceprocess ue_createacctent.
 *
 * GRPFILE ⋈ ACCTENT on TRANTYPE = DTLTYPE, FOCODE forced to 'SSI'.
 * Ref no = IPOLNO + INPENT. On balance → CURRLEDGE + archive GRPFILEX.
 * Unbalanced → unbalCurrLedge + BDOAPMST='H'.
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
import type { DailyStore, GrpFileRow } from "./store.js";
import type { BpyUnitMaps } from "./bpy.js";

export interface GrpInput {
  proc: ProcCdrVar;
  acctEnt: AcctEntRule[];
  userId: string;
  units?: BpyUnitMaps;
}

export interface GrpResult {
  ok: boolean;
  detail: string;
  rows: CurrLedgeRow[];
  batchFile: string;
  totals: { debit: number; credit: number };
  balanced: boolean;
}

function parseAmount(inpamt: string | number): number {
  if (typeof inpamt === "number") return Math.round(inpamt * 100) / 100;
  const s = String(inpamt).trim();
  if (!s) return 0;
  if (/^\d+$/.test(s)) return Number(s) / 100;
  return Number(s);
}

function parseDate(indate: string): string {
  const s = (indate || "").trim();
  if (/^\d{8}$/.test(s)) return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  return s;
}

function resolveUnit(
  row: CurrLedgeRow,
  grp: GrpFileRow,
  maps: BpyUnitMaps,
  compCode: string,
): string {
  let unit = (row.unit || "").trim();
  const origFo = (grp.icdrcd || "").trim();
  const transFoUnit = maps.syrUnit?.[`${compCode}|${origFo}`] ?? "";
  if (transFoUnit) unit = transFoUnit;

  const spc = maps.spcUnit?.[`${row.coCode}|${row.acctCode}`];
  if (spc && spc !== "TRAN" && spc !== "ORIG") unit = spc;
  else if (spc === "TRAN" && transFoUnit) unit = transFoUnit;

  if (spc === "ORIG" || !unit) {
    const agt = (grp.iagtcd || "").trim();
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

function dtlTypeOf(row: GrpFileRow): string {
  const d = (row.dtlType || "").trim();
  if (d) return d;
  return `${row.iactType || ""}${row.inorType || ""}`.trim();
}

export function runGrpMapping(store: DailyStore, input: GrpInput): GrpResult {
  const grpRows = store.grpFile.filter((r) => r && typeof r === "object");
  if (grpRows.length === 0) {
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

  const sorted = [...grpRows].sort((a, b) =>
    `${a.ipolno}|${dtlTypeOf(a)}`.localeCompare(`${b.ipolno}|${dtlTypeOf(b)}`),
  );

  for (const grp of sorted) {
    const tranType = dtlTypeOf(grp);
    if (!tranType) continue;
    const rule =
      matchAcctEnt(input.acctEnt, input.proc.compCode, tranType, grp.inpsrc) ??
      matchAcctEnt(input.acctEnt, input.proc.compCode, tranType);
    if (!rule) continue;

    const amount = parseAmount(grp.inpamt);
    const { drCr, amount: amt } = normalizeDrCrAmount(rule.drCr, amount);
    const baseRef = (grp.ipolno || "").trim();
    if (baseRef === memDoc) {
      if (rule.tranType !== memTran) itemNo += 1;
    } else {
      itemNo = 1;
    }
    memDoc = baseRef;
    memTran = rule.tranType;

    const refDate = parseDate(grp.indate) || fileDate;
    const refNo = baseRef + (grp.inpent || "").trim();
    const row = applyAcctEnt(
      {
        foCode: "SSI",
        refNo,
        refDate,
        payType: grp.inpsrc,
        controlNo: rule.controlNo ?? "",
        unit: rule.unit ?? "",
      },
      rule,
      amt,
      { sourceType: grp.inpstp || "SS", userId: input.userId, tranDate: refDate },
    );
    row.drCr = drCr;
    row.amount = amt;
    row.itemNo = itemNo;
    row.foCode = "SSI";
    row.effectDate = today;
    row.processDate = today;
    row.unit = resolveUnit(row, grp, units, input.proc.compCode);
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
        (row.bdoCode === input.proc.foCode || row.bdoCode === "SSI") &&
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
      detail: `Unbalanced SSI CURRLEDGE DR=${totals.debit} CR=${totals.credit}; BDOAPMST=H`,
      rows,
      batchFile: "Error.bat",
      totals,
      balanced: false,
    };
  }

  store.currLedge.push(...rows.map((r) => ({ ...r })));
  store.grpFileX.push(...grpRows.map((r) => ({ ...r })));
  store.grpFile = [];
  touchBdo("L");

  return {
    ok: true,
    detail: `Mapped ${rows.length} SSI/GRP CURRLEDGE row(s); DR=${totals.debit} CR=${totals.credit}`,
    rows,
    batchFile: "Success.bat",
    totals,
    balanced: true,
  };
}

export function demoGrpRows(): GrpFileRow[] {
  const today = "20261113";
  return [
    {
      icdrcd: "001",
      ipolno: "POLSSI01",
      inpln: "CLIENT",
      inpfn: "A",
      inpmi: "B",
      iactType: "OR",
      inorType: "CASH",
      iactcd: "",
      inpsgn: " ",
      inpamt: "10000",
      inorno: "",
      indate: today,
      inpsrc: "CSH",
      inpent: "E1",
      inpstp: "SS",
      iagtcd: "000000001",
      incvno: "",
      inckno: "",
      inprdate: today,
      dtlType: "ORCASH",
    },
    {
      icdrcd: "001",
      ipolno: "POLSSI01",
      inpln: "CLIENT",
      inpfn: "A",
      inpmi: "B",
      iactType: "OR",
      inorType: "PREM",
      iactcd: "",
      inpsgn: " ",
      inpamt: "10000",
      inorno: "",
      indate: today,
      inpsrc: "",
      inpent: "E1",
      inpstp: "SS",
      iagtcd: "000000001",
      incvno: "",
      inckno: "",
      inprdate: today,
      dtlType: "ORPREM",
    },
  ];
}
