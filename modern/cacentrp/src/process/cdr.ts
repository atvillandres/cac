/**
 * Port of w_cdrinterfaceprocess ue_createacctent control flow.
 *
 * Legacy joins APTRANS/APDEPOSIT to ACCTENT by TRANTYPE (+ optional PAYTYPE),
 * builds STR_CURRLEDGE rows (sourcetype='CD'), then writes CURRLEDGE and archives
 * APTRANS/APDEPOSIT/CASHBALANCE working tables to *X on success.
 */
import {
  applyAcctEnt,
  debitCreditTotals,
  matchAcctEnt,
  type AcctEntRule,
  type CacParams,
  type CurrLedgeRow,
  type ProcCdrVar,
} from "./currledge.js";
import type { DailyStore } from "./store.js";

export interface ApTransRow {
  docNum: string;
  docDate: string;
  docType?: string;
  acctType: string;
  amount: number;
  payType?: string;
  unit?: string;
  status?: string;
}

export interface ApDepositRow {
  bankAcct: string;
  tranDate: string;
  amount: number;
  status?: string;
}

export interface CdrInput {
  proc: ProcCdrVar;
  params: CacParams;
  acctEnt: AcctEntRule[];
  userId: string;
  apTrans?: ApTransRow[];
  apDeposits?: ApDepositRow[];
}

export interface CdrResult {
  ok: boolean;
  detail: string;
  rows: CurrLedgeRow[];
  batchFile: string;
  totals: { debit: number; credit: number };
}

export function runCdrMapping(store: DailyStore, input: CdrInput): CdrResult {
  if (!input.params.excessCashAcct || !input.params.cashClearingAcct) {
    return {
      ok: false,
      detail: "Missing SYRCACPARAM 101/102 (excess cash / cash clearing)",
      rows: [],
      batchFile: "Error.bat",
      totals: { debit: 0, credit: 0 },
    };
  }

  const rows: CurrLedgeRow[] = [];
  const openTrans = (input.apTrans ?? []).filter((r) => !r.status || r.status.trim() === "");
  const openDeps = (input.apDeposits ?? []).filter((r) => !r.status || r.status.trim() === "");

  for (const t of openTrans) {
    const rule = matchAcctEnt(input.acctEnt, input.proc.compCode, t.acctType, t.payType);
    if (!rule) {
      return {
        ok: false,
        detail: `No ACCTENT for APTRANS acctType=${t.acctType} payType=${t.payType ?? ""}`,
        rows,
        batchFile: "Error.bat",
        totals: debitCreditTotals(rows),
      };
    }
    rows.push(
      applyAcctEnt(
        {
          foCode: input.proc.foCode,
          refNo: t.docNum,
          refDate: t.docDate,
          payType: t.payType,
          unit: t.unit ?? input.params.foUnit ?? "",
        },
        rule,
        t.amount,
        {
          sourceType: "CD",
          userId: input.userId,
          tranDate: t.docDate,
        },
      ),
    );
  }

  for (const d of openDeps) {
    const rule = matchAcctEnt(input.acctEnt, input.proc.compCode, d.bankAcct);
    if (!rule) {
      return {
        ok: false,
        detail: `No ACCTENT for APDEPOSIT bankAcct=${d.bankAcct}`,
        rows,
        batchFile: "Error.bat",
        totals: debitCreditTotals(rows),
      };
    }
    rows.push(
      applyAcctEnt(
        {
          foCode: input.proc.foCode,
          refNo: "",
          refDate: d.tranDate,
          unit: input.params.foUnit ?? "",
        },
        rule,
        d.amount,
        {
          sourceType: "CD",
          userId: input.userId,
          tranDate: d.tranDate,
        },
      ),
    );
  }

  // FO excess cash balancing (simplified from c_mapfoexcess)
  const { debit, credit } = debitCreditTotals(rows);
  const diff = Math.round((debit - credit) * 100) / 100;
  if (diff !== 0) {
    rows.push({
      coCode: input.proc.compCode,
      foCode: input.proc.foCode,
      refNo: "",
      refDate: input.proc.dateRec,
      sourceType: "CD",
      acctCode: input.params.excessCashAcct,
      drCr: diff > 0 ? "CR" : "DR",
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
  }

  // Persist
  store.currLedge.push(...rows.map((r) => ({ ...r })));
  if (store.apTrans.length) {
    store.apTransX.push(...store.apTrans.map((r) => ({ ...r })));
    for (const t of store.apTrans) t.status = "P";
  }
  if (store.apDeposits.length) {
    store.apDepositX.push(...store.apDeposits.map((r) => ({ ...r })));
    for (const d of store.apDeposits) d.status = "P";
  }
  if (store.cashBalance.length) {
    store.cashBalanceX.push(...store.cashBalance.map((r) => ({ ...r })));
  }

  const today = new Date().toISOString().slice(0, 10);
  for (const row of store.bdoApMst) {
    if (
      row.company === input.proc.compCode &&
      row.bdoCode === input.proc.foCode &&
      row.processDate === today &&
      row.source === "2"
    ) {
      row.status = "L";
    }
  }

  const totals = debitCreditTotals(rows);
  return {
    ok: true,
    detail: `Mapped ${rows.length} CDR CURRLEDGE row(s); DR=${totals.debit} CR=${totals.credit}`,
    rows,
    batchFile: "Success.bat",
    totals,
  };
}
