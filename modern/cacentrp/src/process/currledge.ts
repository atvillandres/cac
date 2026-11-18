/**
 * Port of libraries.pbl `str_currledge` + shared mapping helpers
 * used by w_focusinterfaceprocess / w_cdrinterfaceprocess.
 */

export interface CurrLedgeRow {
  coCode: string;
  foCode: string;
  refNo: string;
  refDate: string; // YYYY-MM-DD
  sourceType: string; // FC = FOCUS, CD = CDR
  acctCode: string;
  drCr: "DR" | "CR";
  amount: number;
  unit: string;
  origCy: string;
  locCy: string;
  lob: string;
  processDate: string;
  itemNo?: number;
  recDest: string;
  controlNo: string;
  lspAccType: string;
  lspOrType: string;
  payType: string;
  effectDate: string;
  userId: string;
  tranType?: string;
  /** Legacy mapfocus.numbersign — '*' for DR on 214000 / 205002 */
  numberSign?: string;
}

export interface AcctEntRule {
  coCode: string;
  tranType: string;
  acctCode: string;
  drCr: "DR" | "CR";
  unit?: string;
  origCy?: string;
  locCy?: string;
  lob?: string;
  recDest?: string;
  controlNo?: string;
  lspAccType?: string;
  lspOrType?: string;
  payType?: string; // optional filter; empty = any
}

export interface ProcCdrVar {
  compCode: string;
  foCode: string;
  dateRec: string;
  fileName: string;
  batchFile: string;
}

export interface CacParams {
  /** PARAMTYPE 101 — FO excess cash account */
  excessCashAcct: string;
  /** PARAMTYPE 102 — FO cash clearing account */
  cashClearingAcct: string;
  /**
   * PARAMTYPE 105 — OR excess/short tolerance (legacy PARAMCHAR as decimal).
   * When |cash+check − item total| exceeds this, collection rejects with BDO `K`.
   */
  orExcessShortTol?: number;
  /**
   * PARAMTYPE 103 — PAYTYPE for excess-amount ORITEMDTL line (ALAI insert path).
   */
  orExcessPayType?: string;
  /**
   * PARAMTYPE 104 — PAYTYPE for short-amount ORITEMDTL line (ALAI insert path).
   */
  orShortPayType?: string;
  /** PARAMTYPE 106 — realized gain/loss */
  realizedGainLossAcct?: string;
  foUnit?: string;
  bookingRate?: number;
}

/** Legacy: CHK→Q, CSH→C */
export function normalizePayType(payType: string | undefined): string {
  const p = (payType ?? "").trim().toUpperCase();
  if (p === "CHK") return "Q";
  if (p === "CSH") return "C";
  return p;
}

/** Flip DR/CR when amount is negative; absolute the amount (FOCUS/CDR pattern). */
export function normalizeDrCrAmount(
  drCr: string,
  amount: number,
): { drCr: "DR" | "CR"; amount: number } {
  let side: "DR" | "CR" = drCr.trim().toUpperCase() === "CR" ? "CR" : "DR";
  let amt = amount;
  if (amt < 0) {
    side = side === "DR" ? "CR" : "DR";
    amt = Math.abs(amt);
  }
  return { drCr: side, amount: round2(amt) };
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function emptyCurrLedge(): CurrLedgeRow {
  const today = new Date().toISOString().slice(0, 10);
  return {
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
    lob: "01",
    processDate: today,
    recDest: "",
    controlNo: "",
    lspAccType: "",
    lspOrType: "",
    payType: "",
    effectDate: today,
    userId: "",
  };
}

export function applyAcctEnt(
  base: Partial<CurrLedgeRow>,
  rule: AcctEntRule,
  amount: number,
  opts: { sourceType: string; userId: string; today?: string; tranDate?: string },
): CurrLedgeRow {
  const today = opts.today ?? new Date().toISOString().slice(0, 10);
  const { drCr, amount: amt } = normalizeDrCrAmount(rule.drCr, amount);
  return {
    ...emptyCurrLedge(),
    ...base,
    coCode: rule.coCode,
    acctCode: rule.acctCode,
    drCr,
    amount: amt,
    unit: rule.unit ?? base.unit ?? "",
    origCy: rule.origCy ?? base.origCy ?? "PHP",
    locCy: rule.locCy ?? base.locCy ?? "PHP",
    lob: rule.lob ?? base.lob ?? "01",
    recDest: rule.recDest ?? base.recDest ?? "",
    controlNo: rule.controlNo ?? base.controlNo ?? "",
    lspAccType: rule.lspAccType ?? base.lspAccType ?? "",
    lspOrType: rule.lspOrType ?? base.lspOrType ?? "",
    payType: normalizePayType(rule.payType || base.payType),
    sourceType: opts.sourceType,
    userId: opts.userId,
    effectDate: today,
    processDate: today,
    refDate: opts.tranDate ?? base.refDate ?? today,
    tranType: rule.tranType,
  };
}

export function matchAcctEnt(
  rules: AcctEntRule[],
  coCode: string,
  tranType: string,
  payType?: string,
): AcctEntRule | undefined {
  const pay = (payType ?? "").trim().toUpperCase();
  return rules.find((r) => {
    if (r.coCode.trim() !== coCode.trim()) return false;
    if (r.tranType.trim() !== tranType.trim()) return false;
    const rp = (r.payType ?? "").trim();
    if (!rp) return true;
    return rp.toUpperCase() === pay;
  });
}

export function debitCreditTotals(rows: CurrLedgeRow[]): { debit: number; credit: number } {
  let debit = 0;
  let credit = 0;
  for (const r of rows) {
    if (r.drCr === "DR") debit = round2(debit + r.amount);
    else credit = round2(credit + r.amount);
  }
  return { debit, credit };
}
