/**
 * Port of w_focusinterfaceprocess / w_alaifocusproc ue_process orchestration.
 *
 * Stages (legacy order):
 *   collection → collPdr → disbursement → fundTransfer → deposit →
 *   balentries → processcomplete('L')
 *
 * Full DataWindow SQL mapping is enormous; this slice implements the control
 * flow, CURRLEDGE row assembly from simplified OR/DIS/PDR/fund-transfer
 * working sets + ACCTENT, UNBALDOC (f_write2unbaldoc), and archive/commit
 * semantics of wf_processcomplete / reject.
 */
import {
  applyAcctEnt,
  debitCreditTotals,
  matchAcctEnt,
  normalizeDrCrAmount,
  normalizePayType,
  round2,
  type AcctEntRule,
  type CacParams,
  type CurrLedgeRow,
  type ProcCdrVar,
} from "./currledge.js";
import type { DailyStore, UnbalDocRow } from "./store.js";

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

/** PDR collection detail (wf_proccollpdr) — ORITEMDTLCURR rows gated by SYRPDRPARM. */
export interface PdrItemRow {
  orNo: string;
  orDate: string;
  itemNo: number;
  /** ORITEMDTLCURR.PAYTYPE — must appear in FocusInput.pdrTranTypes */
  payType: string;
  /**
   * ACCTENT.TRANTYPE. Legacy builds `{fn concat(PAYTYPE, ORITEMDTLT)}`;
   * modern callers pass the resolved key.
   */
  acctType: string;
  orItemAmt: number;
  currency?: string;
  agtNo?: string;
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

/**
 * Pre-joined fund-transfer ledger line (dw_fundtransferdebit / credit).
 * Debits use DISAMT + DRCR; credits use CHECKAMT + NORMALACCT.
 */
export interface FundTransferLine {
  disNo: string;
  disDate: string;
  currency: string;
  acctCode: string;
  drCr: "DR" | "CR";
  amount: number;
  itemNo?: number;
  payType?: string;
  unit?: string;
  origCy?: string;
  locCy?: string;
  lob?: string;
  agtNo?: string;
  recDest?: string;
  controlNo?: string;
  lspAccType?: string;
  lspOrType?: string;
}

export interface FocusInput {
  proc: ProcCdrVar;
  params: CacParams;
  acctEnt: AcctEntRule[];
  userId: string;
  orCash?: OrCashRow[];
  orItems?: OrItemRow[];
  /** SYRPDRPARM.TRANTYPE list for the company — gates PDR mapping. */
  pdrTranTypes?: string[];
  pdrItems?: PdrItemRow[];
  disCash?: DisCashRow[];
  disItems?: DisItemRow[];
  fundTransferDebits?: FundTransferLine[];
  fundTransferCredits?: FundTransferLine[];
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
  unbalDocs?: UnbalDocRow[];
}

/** Accounts that get mapfocus.numbersign = '*' on DR (legacy hard-codes). */
const NUMBER_SIGN_ACCTS = new Set(["214000", "205002"]);

export function numberSignFor(drCr: string, acctCode: string): string {
  if (drCr.trim().toUpperCase() === "DR" && NUMBER_SIGN_ACCTS.has(acctCode.trim())) {
    return "*";
  }
  return " ";
}

export function writeUnbalDoc(
  store: DailyStore,
  input: FocusInput,
  docNum: string,
  totalDebit: number,
  totalCredit: number,
  processDate?: string,
): UnbalDocRow {
  const row: UnbalDocRow = {
    compCode: input.proc.compCode,
    foCode: input.proc.foCode,
    sourceType: "FC",
    docNum,
    totalDebit: round2(totalDebit),
    totalCredit: round2(totalCredit),
    fileName: input.proc.fileName,
    processDate: processDate ?? new Date().toISOString().slice(0, 10),
    userId: input.userId,
  };
  store.unbalDocs.push(row);
  return row;
}

function pushMapped(
  out: CurrLedgeRow[],
  rule: AcctEntRule | undefined,
  partial: Partial<CurrLedgeRow>,
  amount: number,
  ctx: { sourceType: string; userId: string; tranDate: string },
): string | null {
  if (!rule) return `No ACCTENT rule for ${partial.tranType ?? partial.acctCode}`;
  const row = applyAcctEnt(partial, rule, amount, {
    sourceType: ctx.sourceType,
    userId: ctx.userId,
    tranDate: ctx.tranDate,
  });
  row.numberSign = numberSignFor(row.drCr, row.acctCode);
  out.push(row);
  return null;
}

function pushFundLine(
  out: CurrLedgeRow[],
  input: FocusInput,
  line: FundTransferLine,
  today: string,
): CurrLedgeRow {
  const { drCr, amount } = normalizeDrCrAmount(line.drCr, line.amount);
  const row: CurrLedgeRow = {
    coCode: input.proc.compCode,
    foCode: input.proc.foCode,
    refNo: line.disNo,
    refDate: input.proc.dateRec,
    sourceType: "FC",
    acctCode: line.acctCode.trim(),
    drCr,
    amount,
    unit: line.unit ?? input.params.foUnit ?? "",
    origCy: line.origCy ?? line.currency,
    locCy: line.locCy ?? "PHP",
    lob: line.lob ?? "01",
    processDate: today,
    itemNo: line.itemNo,
    recDest: line.recDest ?? "",
    controlNo: line.controlNo ?? "",
    lspAccType: line.lspAccType ?? "",
    lspOrType: line.lspOrType ?? "",
    payType: normalizePayType(line.payType),
    effectDate: today,
    userId: input.userId,
    numberSign: numberSignFor(drCr, line.acctCode),
  };
  out.push(row);
  return row;
}

function updateBdoStatus(store: DailyStore, input: FocusInput, status: string): number {
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
  return updated;
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

/**
 * Port of wf_proccollpdr — map OR items whose PAYTYPE is in SYRPDRPARM.
 */
export function processCollPdr(input: FocusInput, out: CurrLedgeRow[]): FocusStageResult {
  const allowed = new Set((input.pdrTranTypes ?? []).map((t) => t.trim().toUpperCase()));
  const items = (input.pdrItems ?? []).filter((r) =>
    allowed.size === 0 ? false : allowed.has(r.payType.trim().toUpperCase()),
  );
  let added = 0;
  const ctx = {
    sourceType: "FC",
    userId: input.userId,
    tranDate: input.proc.dateRec,
  };
  for (const row of items) {
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
        tranType: row.acctType,
      },
      row.orItemAmt,
      ctx,
    );
    if (err) return { stage: "collPdr", ok: false, detail: err, rowsAdded: added };
    added++;
  }
  return {
    stage: "collPdr",
    ok: true,
    detail:
      allowed.size === 0 && (input.pdrItems?.length ?? 0) > 0
        ? `Skipped ${(input.pdrItems ?? []).length} PDR candidate(s) (no SYRPDRPARM)`
        : `Mapped ${added} PDR collection line(s)`,
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

/**
 * Port of wf_fundtransfer — debit/credit pairs per DISNO+currency; imbalance → UNBALDOC.
 * Returns ok:false with BDO status 'Q' when any document is unbalanced.
 */
export function processFundTransfer(
  store: DailyStore,
  input: FocusInput,
  out: CurrLedgeRow[],
): FocusStageResult {
  const debits = input.fundTransferDebits ?? [];
  const credits = input.fundTransferCredits ?? [];
  if (debits.length === 0 && credits.length === 0) {
    return {
      stage: "fundTransfer",
      ok: true,
      detail: "No fund-transfer documents",
      rowsAdded: 0,
    };
  }

  const today = new Date().toISOString().slice(0, 10);
  const keys: string[] = [];
  const seen = new Set<string>();
  for (const d of debits) {
    const k = `${d.disNo}\0${d.currency}`;
    if (!seen.has(k)) {
      seen.add(k);
      keys.push(k);
    }
  }
  for (const c of credits) {
    const k = `${c.disNo}\0${c.currency}`;
    if (!seen.has(k)) {
      seen.add(k);
      keys.push(k);
    }
  }

  let added = 0;
  let unbalCount = 0;
  let gtDebit = 0;
  let gtCredit = 0;

  for (const key of keys) {
    const [disNo, currency] = key.split("\0");
    let docDebit = 0;
    let docCredit = 0;
    let wrote = false;

    for (const line of debits.filter((d) => d.disNo === disNo && d.currency === currency)) {
      const row = pushFundLine(out, input, line, today);
      wrote = true;
      added++;
      if (row.drCr === "DR") {
        docDebit = round2(docDebit + row.amount);
        gtDebit = round2(gtDebit + row.amount);
      } else {
        docCredit = round2(docCredit + row.amount);
        gtCredit = round2(gtCredit + row.amount);
      }
    }

    // Credits once per DISNO (legacy skips when prevdisno === svdisno across debit loop)
    for (const line of credits.filter((c) => c.disNo === disNo && c.currency === currency)) {
      const row = pushFundLine(out, input, line, today);
      wrote = true;
      added++;
      if (row.drCr === "DR") {
        docDebit = round2(docDebit + row.amount);
        gtDebit = round2(gtDebit + row.amount);
      } else {
        docCredit = round2(docCredit + row.amount);
        gtCredit = round2(gtCredit + row.amount);
      }
    }

    if (docDebit !== docCredit || !wrote) {
      writeUnbalDoc(store, input, disNo, docDebit, docCredit, today);
      unbalCount++;
    }
  }

  if (unbalCount > 0) {
    updateBdoStatus(store, input, "Q");
    return {
      stage: "fundTransfer",
      ok: false,
      detail: `${unbalCount} unbalanced fund-transfer doc(s); BDOAPMST=Q; mapped ${added}`,
      rowsAdded: added,
    };
  }

  if (gtDebit !== gtCredit) {
    updateBdoStatus(store, input, "H");
    return {
      stage: "fundTransfer",
      ok: false,
      detail: `Fund-transfer grand total imbalance DR=${gtDebit} CR=${gtCredit}; BDOAPMST=H`,
      rowsAdded: added,
    };
  }

  return {
    stage: "fundTransfer",
    ok: true,
    detail: `Mapped ${added} fund-transfer line(s) across ${keys.length} doc(s)`,
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
  const acct = input.params.excessCashAcct;
  out.push({
    coCode: input.proc.compCode,
    foCode: input.proc.foCode,
    refNo: "",
    refDate: input.proc.dateRec,
    sourceType: "FC",
    acctCode: acct,
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
    numberSign: numberSignFor(side, acct),
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

  const updated = updateBdoStatus(store, input, status);

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
  if (!input.params.realizedGainLossAcct) {
    return {
      ok: false,
      stages: [
        {
          stage: "params",
          ok: false,
          detail: "Not found paramtype 106 for Realized Gain/Loss Account No",
          rowsAdded: 0,
        },
      ],
      mapFocus: [],
      batchFile: "Error.bat",
    };
  }

  const mapFocus: CurrLedgeRow[] = [];
  const stages: FocusStageResult[] = [];

  const early: Array<(i: FocusInput, o: CurrLedgeRow[]) => FocusStageResult> = [
    processCollection,
    processCollPdr,
    processDisbursement,
  ];
  for (const step of early) {
    const result = step(input, mapFocus);
    stages.push(result);
    if (!result.ok) {
      return { ok: false, stages, mapFocus, batchFile: "Error.bat", unbalDocs: [...store.unbalDocs] };
    }
  }

  const ft = processFundTransfer(store, input, mapFocus);
  stages.push(ft);
  if (!ft.ok) {
    return { ok: false, stages, mapFocus, batchFile: "Error.bat", unbalDocs: [...store.unbalDocs] };
  }

  for (const step of [processDeposit, balanceEntries]) {
    const result = step(input, mapFocus);
    stages.push(result);
    if (!result.ok) {
      return { ok: false, stages, mapFocus, batchFile: "Error.bat", unbalDocs: [...store.unbalDocs] };
    }
  }

  const complete = processComplete(store, input, mapFocus, "L");
  stages.push(complete);
  return {
    ok: complete.ok,
    stages,
    mapFocus,
    batchFile: complete.ok ? "Success.bat" : "Error.bat",
    unbalDocs: [...store.unbalDocs],
  };
}
