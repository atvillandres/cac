/**
 * Port of w_focusinterfaceprocess ue_process orchestration.
 *
 * Stages (legacy order):
 *   collection → disbursement → deposit → balentries → processcomplete('L')
 *
 * Full DataWindow SQL mapping is enormous; this slice implements the control
 * flow, CURRLEDGE row assembly from simplified OR/DIS working sets + ACCTENT,
 * and the archive/commit semantics of wf_processcomplete / reject.
 */
import {
  applyAcctEnt,
  debitCreditTotals,
  matchAcctEnt,
  normalizePayType,
  type AcctEntRule,
  type CacParams,
  type CurrLedgeRow,
  type ProcCdrVar,
} from "./currledge.js";
import type { DailyStore } from "./store.js";

export interface OrCashRow {
  orNo: string;
  orDate: string;
  currency: string;
  cashAmt: number;
  payType?: string;
  acctType: string; // maps to ACCTENT.TRANTYPE
}

export interface OrItemRow {
  orNo: string;
  orDate: string;
  itemNo: number;
  payType: string;
  orItemAmt: number;
  acctType: string;
  currency?: string;
}

export interface DisCashRow {
  disNo: string;
  disDate: string;
  currency: string;
  cashAmt: number;
  payType?: string;
  acctType: string;
}

export interface DisItemRow {
  disNo: string;
  disDate: string;
  itemNo: number;
  disAmt: number;
  payType?: string;
  acctType: string;
  currency?: string;
}

export interface DepositRow {
  dsSeqNo: string;
  dateDep: string;
  amount: number;
  bankAcct: string; // ACCTENT.TRANTYPE for deposits
  currency?: string;
}

export interface FocusInput {
  proc: ProcCdrVar;
  params: CacParams;
  acctEnt: AcctEntRule[];
  userId: string;
  orCash?: OrCashRow[];
  orItems?: OrItemRow[];
  disCash?: DisCashRow[];
  disItems?: DisItemRow[];
  deposits?: DepositRow[];
}

export interface FocusStageResult {
  stage: string;
  ok: boolean;
  detail: string;
  rowsAdded: number;
}

export interface FocusResult {
  ok: boolean;
  stages: FocusStageResult[];
  mapFocus: CurrLedgeRow[];
  batchFile: string;
}

function pushMapped(
  out: CurrLedgeRow[],
  rule: AcctEntRule | undefined,
  partial: Partial<CurrLedgeRow>,
  amount: number,
  ctx: { sourceType: string; userId: string; tranDate: string },
): string | null {
  if (!rule) return `No ACCTENT rule for ${partial.tranType ?? partial.acctCode}`;
  out.push(
    applyAcctEnt(partial, rule, amount, {
      sourceType: ctx.sourceType,
      userId: ctx.userId,
      tranDate: ctx.tranDate,
    }),
  );
  return null;
}

export function processCollection(input: FocusInput, out: CurrLedgeRow[]): FocusStageResult {
  let added = 0;
  const ctx = {
    sourceType: "FC",
    userId: input.userId,
    tranDate: input.proc.dateRec,
  };
  for (const row of input.orCash ?? []) {
    const rule = matchAcctEnt(input.acctEnt, input.proc.compCode, row.acctType, row.payType);
    const err = pushMapped(
      out,
      rule,
      {
        foCode: input.proc.foCode,
        refNo: row.orNo,
        refDate: row.orDate,
        origCy: row.currency,
        locCy: "PHP",
        payType: normalizePayType(row.payType ?? "CSH"),
        unit: input.params.foUnit ?? "",
      },
      row.cashAmt,
      ctx,
    );
    if (err) return { stage: "collection", ok: false, detail: err, rowsAdded: added };
    added++;
  }
  for (const row of input.orItems ?? []) {
    const rule = matchAcctEnt(input.acctEnt, input.proc.compCode, row.acctType, row.payType);
    const err = pushMapped(
      out,
      rule,
      {
        foCode: input.proc.foCode,
        refNo: row.orNo,
        refDate: row.orDate,
        itemNo: row.itemNo,
        origCy: row.currency ?? "PHP",
        payType: normalizePayType(row.payType),
        unit: input.params.foUnit ?? "",
      },
      row.orItemAmt,
      ctx,
    );
    if (err) return { stage: "collection", ok: false, detail: err, rowsAdded: added };
    added++;
  }
  return {
    stage: "collection",
    ok: true,
    detail: `Mapped ${added} OR collection line(s)`,
    rowsAdded: added,
  };
}

export function processDisbursement(input: FocusInput, out: CurrLedgeRow[]): FocusStageResult {
  let added = 0;
  const ctx = {
    sourceType: "FC",
    userId: input.userId,
    tranDate: input.proc.dateRec,
  };
  for (const row of input.disCash ?? []) {
    const rule = matchAcctEnt(input.acctEnt, input.proc.compCode, row.acctType, row.payType);
    const err = pushMapped(
      out,
      rule,
      {
        foCode: input.proc.foCode,
        refNo: row.disNo,
        refDate: row.disDate,
        origCy: row.currency,
        payType: normalizePayType(row.payType ?? "CSH"),
        unit: input.params.foUnit ?? "",
      },
      row.cashAmt,
      ctx,
    );
    if (err) return { stage: "disbursement", ok: false, detail: err, rowsAdded: added };
    added++;
  }
  for (const row of input.disItems ?? []) {
    const rule = matchAcctEnt(input.acctEnt, input.proc.compCode, row.acctType, row.payType);
    const err = pushMapped(
      out,
      rule,
      {
        foCode: input.proc.foCode,
        refNo: row.disNo,
        refDate: row.disDate,
        itemNo: row.itemNo,
        origCy: row.currency ?? "PHP",
        payType: normalizePayType(row.payType ?? ""),
        unit: input.params.foUnit ?? "",
      },
      row.disAmt,
      ctx,
    );
    if (err) return { stage: "disbursement", ok: false, detail: err, rowsAdded: added };
    added++;
  }
  return {
    stage: "disbursement",
    ok: true,
    detail: `Mapped ${added} DIS line(s)`,
    rowsAdded: added,
  };
}

export function processDeposit(input: FocusInput, out: CurrLedgeRow[]): FocusStageResult {
  let added = 0;
  const ctx = {
    sourceType: "FC",
    userId: input.userId,
    tranDate: input.proc.dateRec,
  };
  for (const row of input.deposits ?? []) {
    const rule = matchAcctEnt(input.acctEnt, input.proc.compCode, row.bankAcct);
    const err = pushMapped(
      out,
      rule,
      {
        foCode: input.proc.foCode,
        refNo: row.dsSeqNo,
        refDate: row.dateDep,
        origCy: row.currency ?? "PHP",
        unit: input.params.foUnit ?? "",
      },
      row.amount,
      ctx,
    );
    if (err) return { stage: "deposit", ok: false, detail: err, rowsAdded: added };
    added++;
  }
  return {
    stage: "deposit",
    ok: true,
    detail: `Mapped ${added} deposit line(s)`,
    rowsAdded: added,
  };
}

/**
 * Simplified balentries: ensure mapped rows balance; if not, post difference
 * to FO excess cash account (param 101) — mirrors FO excess cash intent.
 */
export function balanceEntries(
  input: FocusInput,
  out: CurrLedgeRow[],
): FocusStageResult {
  const { debit, credit } = debitCreditTotals(out);
  const diff = Math.round((debit - credit) * 100) / 100;
  if (diff === 0) {
    return {
      stage: "balance",
      ok: true,
      detail: `Balanced DR=${debit} CR=${credit}`,
      rowsAdded: 0,
    };
  }
  // Post balancing entry to excess cash account
  const side = diff > 0 ? "CR" : "DR";
  out.push({
    coCode: input.proc.compCode,
    foCode: input.proc.foCode,
    refNo: "",
    refDate: input.proc.dateRec,
    sourceType: "FC",
    acctCode: input.params.excessCashAcct,
    drCr: side,
    amount: Math.abs(diff),
    unit: input.params.foUnit ?? "",
    origCy: "PHP",
    locCy: "PHP",
    lob: "01",
    processDate: new Date().toISOString().slice(0, 10),
    recDest: "",
    controlNo: "",
    lspAccType: "",
    lspOrType: "",
    payType: "",
    effectDate: new Date().toISOString().slice(0, 10),
    userId: input.userId,
    tranType: "CACPAR01",
  });
  return {
    stage: "balance",
    ok: true,
    detail: `Imbalanced by ${diff}; posted ${side} ${Math.abs(diff)} to excess cash ${input.params.excessCashAcct}`,
    rowsAdded: 1,
  };
}

export function processComplete(
  store: DailyStore,
  input: FocusInput,
  mapFocus: CurrLedgeRow[],
  status: string,
): FocusStageResult {
  // Archive working cash balance snapshot if present
  if (store.cashBalance.length) {
    store.cashBalanceX.push(...store.cashBalance.map((r) => ({ ...r })));
  }
  // Commit mapfocus → CURRLEDGE
  store.currLedge.push(...mapFocus.map((r) => ({ ...r })));

  // Update today's BDOAPMST rows for this submission
  const today = new Date().toISOString().slice(0, 10);
  let updated = 0;
  for (const row of store.bdoApMst) {
    if (
      row.company === input.proc.compCode &&
      row.bdoCode === input.proc.foCode &&
      row.processDate === today &&
      (row.subFile === input.proc.fileName || row.subFile === input.proc.fileName.slice(0, 8))
    ) {
      row.status = status;
      updated++;
    }
  }

  return {
    stage: "complete",
    ok: true,
    detail: `Wrote ${mapFocus.length} CURRLEDGE row(s); BDOAPMST status=${status} (${updated} updated)`,
    rowsAdded: mapFocus.length,
  };
}

export function runFocusMapping(store: DailyStore, input: FocusInput): FocusResult {
  if (!input.params.excessCashAcct) {
    return {
      ok: false,
      stages: [
        {
          stage: "params",
          ok: false,
          detail: "Not found paramtype 101 for FO Excess Cash Account No",
          rowsAdded: 0,
        },
      ],
      mapFocus: [],
      batchFile: "Error.bat",
    };
  }
  if (!input.params.cashClearingAcct) {
    return {
      ok: false,
      stages: [
        {
          stage: "params",
          ok: false,
          detail: "Not found paramtype 102 for FO Cash Clearing Account No",
          rowsAdded: 0,
        },
      ],
      mapFocus: [],
      batchFile: "Error.bat",
    };
  }

  const mapFocus: CurrLedgeRow[] = [];
  const stages: FocusStageResult[] = [];

  const pipeline = [processCollection, processDisbursement, processDeposit, balanceEntries];
  for (const step of pipeline) {
    const result = step(input, mapFocus);
    stages.push(result);
    if (!result.ok) {
      return { ok: false, stages, mapFocus, batchFile: "Error.bat" };
    }
  }

  const complete = processComplete(store, input, mapFocus, "L");
  stages.push(complete);
  return {
    ok: complete.ok,
    stages,
    mapFocus,
    batchFile: complete.ok ? "Success.bat" : "Error.bat",
  };
}
