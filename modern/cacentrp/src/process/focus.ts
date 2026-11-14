/**
 * Port of w_focusinterfaceprocess / w_alaifocusproc ue_process orchestration.
 *
 * Stages (legacy order):
 *   collection → collPdr → disbursement → disAddDed → fundTransfer →
 *   disbNet → deposit → balentries → processcomplete('L')
 *
 * Full DataWindow SQL mapping is enormous; this slice implements the control
 * flow, CURRLEDGE row assembly from simplified OR/DIS/PDR/add-ded/
 * fund-transfer/net-disbursement working sets + ACCTENT, UNBALDOC,
 * ERRCASHBAL, and archive/commit semantics of wf_processcomplete / reject.
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
import type { DailyStore, FocusWorkingSnapshot, UnbalDocRow } from "./store.js";

export interface OrCashRow {
  orNo: string;
  orDate: string;
  currency: string;
  cashAmt: number;
  payType?: string;
  acctType: string; // maps to ACCTENT.TRANTYPE
}

/** Explicit OR check tender (ORCHECKCURR / dw_maporcheckcurr). */
export interface OrCheckRow {
  orNo: string;
  orDate: string;
  currency: string;
  checkAmt: number;
  acctType: string;
  payType?: string;
  checkItemNo?: number;
  checkNo?: string;
  checkDate?: string;
  /** ORCHECKCURR.CHECKCLRTY */
  checkClrTy?: string;
  checkType?: string;
  checkTypeD?: string;
  bankBranch?: string;
  dsSeqNo?: string;
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

/** Explicit DIS check tender (DISCHECKCURR). */
export interface DisCheckRow {
  disNo: string;
  disDate: string;
  currency: string;
  checkAmt: number;
  acctType: string;
  payType?: string;
  checkItemNo?: number;
  checkNo?: string;
  checkDate?: string;
  /** DISCHECKCURR.BANKCODE — joins ACCTENT.BANKCODE on d_dismapcheck2. */
  bankCode?: string;
  bankBranch?: string;
  payee?: string;
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

/**
 * Pre-joined net disbursement line (dw_disbmapcashnet / dw_dismapchecknet).
 * Amount is already netted (`disnetamt`). Bank accounts (SYRBANK) are skipped
 * on the non-bank pass; check path then posts bank lines as CR.
 */
export interface DisNetLine {
  disNo: string;
  disDate: string;
  currency: string;
  /** CSH = cash-net path; CHK = check-net path */
  payMode: "CSH" | "CHK";
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
  /** When true (or acct in bankAcctCodes), treated as SYRBANK account. */
  isBank?: boolean;
}

/**
 * Pre-joined DIS add/ded line (dw_disbmapdisadd / disbmapdisded ± cash).
 * Amounts are DISADDAMT / DISDEDAMT from the legacy DataWindows.
 */
export interface DisAddDedLine {
  disNo: string;
  disDate: string;
  currency: string;
  payMode: "CSH" | "CHK";
  kind: "ADD" | "DED";
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
  isBank?: boolean;
}

export interface FocusInput {
  proc: ProcCdrVar;
  params: CacParams;
  acctEnt: AcctEntRule[];
  userId: string;
  orCash?: OrCashRow[];
  /** Explicit OR checks (also accept payType=CHK folded into orCash). */
  orCheck?: OrCheckRow[];
  orItems?: OrItemRow[];
  /**
   * When true (default), validate each OR has cash and/or check coverage and
   * |paid − items| ≤ param 105 before mapping (legacy collection gate).
   */
  validateOrPayments?: boolean;
  /**
   * Within-tol short/over handling (legacy after param-105 gate):
   * - `adjust` (default) — add exeShort to lowest itemNo (ALAI when no LSP COLL hit)
   * - `insert` — new OR item with param 103/104 PAYTYPE (ALAI when LSP COLL items exist)
   */
  orShortOverMode?: "adjust" | "insert";
  /** SYRPDRPARM.TRANTYPE list for the company — gates PDR mapping. */
  pdrTranTypes?: string[];
  pdrItems?: PdrItemRow[];
  disCash?: DisCashRow[];
  /** Explicit DIS checks (also accept payType=CHK folded into disCash). */
  disCheck?: DisCheckRow[];
  disItems?: DisItemRow[];
  /** DIS add/ded mapped lines (inside wf_processdisbursement in legacy). */
  disAddDedLines?: DisAddDedLine[];
  /**
   * SYRSPCEXCESS.EXCSCODE list for wf_spcexcsh — when `spcExcessCount` is 0,
   * matching accounts are skipped; when > 0, the FO excess-cash acct is skipped.
   */
  spcExcessAccts?: string[];
  /** Count of special excess rows retrieved for the FO (li_arg_spcexcess). */
  spcExcessCount?: number;
  fundTransferDebits?: FundTransferLine[];
  fundTransferCredits?: FundTransferLine[];
  /**
   * SYRNETPARM product gate — when empty/absent, disbNet is a no-op unless
   * `disNetLines` is provided (caller already filtered). When set with no
   * lines, stage reports skipped.
   */
  netProdCodes?: string[];
  /** SYRBANK.ACCTCODE list — marks bank lines when `isBank` not set. */
  bankAcctCodes?: string[];
  disNetLines?: DisNetLine[];
  deposits?: DepositRow[];
  /**
   * When true, post imbalance to excess cash (older modern shortcut).
   * Default false — matches legacy wf_balentries (fail H on trial imbalance).
   */
  autoBalanceExcessCash?: boolean;
}

export interface FocusStageResult {
  stage: string;
  ok: boolean;
  detail: string;
  rowsAdded: number;
  /** BDOAPMST status to apply on failure (e.g. J / K from collection). */
  rejectStatus?: string;
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

type LedgerLineIn = {
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
  recDest?: string;
  controlNo?: string;
  lspAccType?: string;
  lspOrType?: string;
};

function applyUsdGainLoss(input: FocusInput, row: CurrLedgeRow): void {
  const gainAcct = (input.params.realizedGainLossAcct ?? "").trim();
  if (!gainAcct) return;
  if (row.acctCode.trim() !== gainAcct) return;
  if ((row.origCy ?? "").trim().toUpperCase() !== "USD") return;
  const rate = input.params.bookingRate ?? 1;
  row.amount = round2(row.amount * rate);
  row.origCy = "PHP";
}

function pushFundLine(
  out: CurrLedgeRow[],
  input: FocusInput,
  line: LedgerLineIn,
  today: string,
  opts?: { forceDrCr?: "DR" | "CR" },
): CurrLedgeRow {
  const side = opts?.forceDrCr ?? line.drCr;
  const { drCr, amount } = normalizeDrCrAmount(side, line.amount);
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
  applyUsdGainLoss(input, row);
  row.numberSign = numberSignFor(row.drCr, row.acctCode);
  out.push(row);
  return row;
}

function isBankLine(
  line: { acctCode: string; isBank?: boolean },
  bankAccts: Set<string>,
): boolean {
  if (line.isBank) return true;
  return bankAccts.has(line.acctCode.trim().toUpperCase());
}

/**
 * Port of wf_spcexcsh — skip special excess-cash accounts during DIS mapping.
 * Returns true when the line should be skipped (CONTINUE in legacy).
 */
export function shouldSkipSpcExcsh(
  acctCode: string,
  input: FocusInput,
): boolean {
  const acct = acctCode.trim();
  const excess = (input.params.excessCashAcct ?? "").trim();
  const spc = (input.spcExcessAccts ?? []).map((a) => a.trim());
  const count = input.spcExcessCount ?? 0;
  const inSpc = spc.some((a) => a === acct);
  if (inSpc && count === 0) return true;
  if (excess !== "" && acct === excess && count > 0) return true;
  return false;
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

function orPaymentTotals(
  input: FocusInput,
  orNo: string,
): { cash: number; check: number } {
  let cash = 0;
  let check = 0;
  for (const row of input.orCash ?? []) {
    if (row.orNo !== orNo) continue;
    if ((row.payType ?? "CSH").trim().toUpperCase() === "CHK") {
      check = round2(check + row.cashAmt);
    } else {
      cash = round2(cash + row.cashAmt);
    }
  }
  for (const row of input.orCheck ?? []) {
    if (row.orNo !== orNo) continue;
    check = round2(check + row.checkAmt);
  }
  return { cash, check };
}

/**
 * Legacy collection gate: each OR must appear in cash and/or check;
 * |paid − item total| must be within SYRCACPARAM 105.
 */
export function validateOrCashCheckPayments(
  store: DailyStore,
  input: FocusInput,
): FocusStageResult | null {
  if (input.validateOrPayments === false) return null;

  const orNos = new Set<string>();
  for (const r of input.orItems ?? []) orNos.add(r.orNo);
  for (const r of input.orCash ?? []) orNos.add(r.orNo);
  for (const r of input.orCheck ?? []) orNos.add(r.orNo);
  if (orNos.size === 0) return null;

  if (input.params.orExcessShortTol == null) {
    return {
      stage: "collection",
      ok: false,
      detail: "PARAMCHAR for PARAMTYPE 105 not found",
      rowsAdded: 0,
      rejectStatus: "K",
    };
  }

  const today = new Date().toISOString().slice(0, 10);
  const tol = input.params.orExcessShortTol;

  for (const orNo of orNos) {
    const { cash, check } = orPaymentTotals(input, orNo);
    if (cash === 0 && check === 0) {
      store.orAmtPdFail.push({
        compCode: input.proc.compCode,
        foCode: input.proc.foCode,
        tranDate: input.proc.dateRec,
        refNo: orNo,
        processDate: today,
        userId: input.userId,
      });
      return {
        stage: "collection",
        ok: false,
        detail: `OR ${orNo} not found in ORCASHCURR/ORCHECKCURR; ORAMTPDFAIL`,
        rowsAdded: 0,
        rejectStatus: "J",
      };
    }

    const itemTotal = round2(
      (input.orItems ?? [])
        .filter((r) => r.orNo === orNo)
        .reduce((s, r) => s + r.orItemAmt, 0),
    );
    if ((input.orItems ?? []).some((r) => r.orNo === orNo)) {
      const exeShort = round2(cash + check - itemTotal);
      if (Math.abs(exeShort) > tol) {
        store.orShrtExeFail.push({
          compCode: input.proc.compCode,
          foCode: input.proc.foCode,
          tranDate: input.proc.dateRec,
          refNo: orNo,
          exeShrtAmt: exeShort,
          processDate: today,
          userId: input.userId,
        });
        return {
          stage: "collection",
          ok: false,
          detail: `OR ${orNo} excess/short ${exeShort} exceeds param 105 (${tol}); ORSHRTEXEFAIL`,
          rowsAdded: 0,
          rejectStatus: "K",
        };
      }
    }
  }
  return null;
}

/**
 * Port of ALAI within-tol short/over: adjust first item or insert param 103/104
 * line, and write ORSHORTOVER. Mutates `input.orItems` / store.orItemDtlCurr.
 */
export function applyOrShortOver(store: DailyStore, input: FocusInput): string | null {
  if (input.validateOrPayments === false) return null;
  if (input.params.orExcessShortTol == null) return null;

  const today = new Date().toISOString().slice(0, 10);
  const mode = input.orShortOverMode ?? "adjust";
  const items = input.orItems ?? [];

  const orNos = new Set<string>();
  for (const r of items) orNos.add(r.orNo);
  for (const r of input.orCash ?? []) orNos.add(r.orNo);
  for (const r of input.orCheck ?? []) orNos.add(r.orNo);

  for (const orNo of orNos) {
    const orItems = items.filter((r) => r.orNo === orNo);
    if (orItems.length === 0) continue;

    const { cash, check } = orPaymentTotals(input, orNo);
    const itemTotal = round2(orItems.reduce((s, r) => s + r.orItemAmt, 0));
    const exeShort = round2(cash + check - itemTotal);
    if (exeShort === 0) continue;

    if (mode === "insert") {
      const payType =
        exeShort > 0 ? input.params.orExcessPayType : input.params.orShortPayType;
      if (!payType?.trim()) {
        return `PARAMTYPE ${exeShort > 0 ? "103" : "104"} not found for OR short/over insert`;
      }
      const maxItem = Math.max(...orItems.map((r) => r.itemNo), 0);
      const newItemNo = maxItem + 1;
      const sample = orItems[0]!;
      const newRow: OrItemRow = {
        orNo,
        orDate: sample.orDate,
        itemNo: newItemNo,
        payType: payType.trim(),
        orItemAmt: exeShort,
        acctType: payType.trim(),
        currency: sample.currency,
      };
      items.push(newRow);
      input.orItems = items;
      store.orItemDtlCurr.push({
        company: input.proc.compCode,
        foCode: input.proc.foCode,
        orNo,
        orDate: sample.orDate,
        grpItemNo: 1,
        itemNo: newItemNo,
        payType: payType.trim(),
        orItemAmt: exeShort,
        dueDate: "",
        ssiYrMm: "",
        remarks: exeShort > 0 ? "Excess Amount Received" : "Short Amount Received",
        postTag: "",
        orItemDtlT: "",
        processDate: today,
      });
      store.orShortOver.push({
        coCode: input.proc.compCode,
        foCode: input.proc.foCode,
        orNo,
        itemNo: newItemNo,
        statAg: "H",
        newAmt: exeShort,
        oldAmt: 0,
        processDate: today,
        userId: input.userId,
      });
      continue;
    }

    // adjust — lowest itemNo (legacy min ITEMNO / item 1 path)
    const target = [...orItems].sort((a, b) => a.itemNo - b.itemNo)[0]!;
    const oldAmt = target.orItemAmt;
    const newAmt = round2(oldAmt + exeShort);
    target.orItemAmt = newAmt;

    for (const dtl of store.orItemDtlCurr) {
      if (
        dtl.orNo === orNo &&
        dtl.itemNo === target.itemNo &&
        dtl.company === input.proc.compCode &&
        dtl.foCode === input.proc.foCode
      ) {
        dtl.orItemAmt = newAmt;
      }
    }

    store.orShortOver.push({
      coCode: input.proc.compCode,
      foCode: input.proc.foCode,
      orNo,
      itemNo: target.itemNo,
      statAg: "H",
      newAmt,
      oldAmt,
      processDate: today,
      userId: input.userId,
    });
  }

  return null;
}

export function processCollection(
  store: DailyStore,
  input: FocusInput,
  out: CurrLedgeRow[],
): FocusStageResult {
  const gate = validateOrCashCheckPayments(store, input);
  if (gate) return gate;

  const shortOverErr = applyOrShortOver(store, input);
  if (shortOverErr) {
    return {
      stage: "collection",
      ok: false,
      detail: shortOverErr,
      rowsAdded: 0,
      rejectStatus: "K",
    };
  }

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
    if (err) return { stage: "collection", ok: false, detail: err, rowsAdded: added, rejectStatus: "J" };
    added++;
  }
  for (const row of input.orCheck ?? []) {
    const payType = row.payType ?? "CHK";
    const rule = matchAcctEnt(input.acctEnt, input.proc.compCode, row.acctType, payType);
    const err = pushMapped(
      out,
      rule,
      {
        foCode: input.proc.foCode,
        refNo: row.orNo,
        refDate: row.orDate,
        itemNo: row.checkItemNo,
        origCy: row.currency,
        locCy: "PHP",
        payType: normalizePayType(payType),
        unit: input.params.foUnit ?? "",
        controlNo: row.checkNo ?? "",
      },
      row.checkAmt,
      ctx,
    );
    if (err) return { stage: "collection", ok: false, detail: err, rowsAdded: added, rejectStatus: "J" };
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
    if (err) return { stage: "collection", ok: false, detail: err, rowsAdded: added, rejectStatus: "J" };
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
  for (const row of input.disCheck ?? []) {
    const payType = row.payType ?? "CHK";
    const rule = matchAcctEnt(input.acctEnt, input.proc.compCode, row.acctType, payType);
    const err = pushMapped(
      out,
      rule,
      {
        foCode: input.proc.foCode,
        refNo: row.disNo,
        refDate: row.disDate,
        itemNo: row.checkItemNo,
        origCy: row.currency,
        payType: normalizePayType(payType),
        unit: input.params.foUnit ?? "",
        controlNo: row.checkNo ?? row.bankCode ?? "",
      },
      row.checkAmt,
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
 * Port of DIS add/ded mapping inside wf_processdisbursement
 * (dw_disbmapdisadd / disbmapdisded ± cash). Skips SYRBANK + wf_spcexcsh hits.
 */
export function processDisAddDed(
  input: FocusInput,
  out: CurrLedgeRow[],
): FocusStageResult {
  const lines = input.disAddDedLines ?? [];
  if (lines.length === 0) {
    return {
      stage: "disAddDed",
      ok: true,
      detail: "No DIS add/ded lines",
      rowsAdded: 0,
    };
  }

  const bankAccts = new Set(
    (input.bankAcctCodes ?? []).map((a) => a.trim().toUpperCase()).filter(Boolean),
  );
  const today = new Date().toISOString().slice(0, 10);
  let added = 0;
  let skipped = 0;

  for (const line of lines) {
    if (isBankLine(line, bankAccts) || shouldSkipSpcExcsh(line.acctCode, input)) {
      skipped++;
      continue;
    }
    pushFundLine(out, input, line, today);
    added++;
  }

  return {
    stage: "disAddDed",
    ok: true,
    detail: `Mapped ${added} DIS add/ded line(s)` + (skipped ? `; skipped ${skipped}` : ""),
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

/**
 * Port of wf_procdisbnet — map netted DIS cash/check lines (SYRNETPARM products).
 * Bank-only check docs are skipped (deferred to fund transfer in legacy).
 * Per-doc imbalance → UNBALDOC + BDOAPMST Q; grand-total imbalance → H.
 */
export function processDisbNet(
  store: DailyStore,
  input: FocusInput,
  out: CurrLedgeRow[],
): FocusStageResult {
  const lines = input.disNetLines ?? [];
  if (lines.length === 0) {
    return {
      stage: "disbNet",
      ok: true,
      detail:
        (input.netProdCodes?.length ?? 0) > 0
          ? "No net-disbursement lines for SYRNETPARM products"
          : "No net-disbursement documents",
      rowsAdded: 0,
    };
  }

  const bankAccts = new Set(
    (input.bankAcctCodes ?? []).map((a) => a.trim().toUpperCase()).filter(Boolean),
  );
  const today = new Date().toISOString().slice(0, 10);

  type Key = string;
  const keys: Key[] = [];
  const seen = new Set<Key>();
  for (const line of lines) {
    const k = `${line.payMode}\0${line.disNo}\0${line.currency}`;
    if (!seen.has(k)) {
      seen.add(k);
      keys.push(k);
    }
  }

  let added = 0;
  let skippedFt = 0;
  let unbalCount = 0;
  let gtDebit = 0;
  let gtCredit = 0;

  for (const key of keys) {
    const [payMode, disNo, currency] = key.split("\0") as ["CSH" | "CHK", string, string];
    const docLines = lines.filter(
      (l) => l.payMode === payMode && l.disNo === disNo && l.currency === currency,
    );
    const banks = docLines.filter((l) => isBankLine(l, bankAccts));
    const nonBanks = docLines.filter((l) => !isBankLine(l, bankAccts));

    // Legacy: when every DISITEMDTL line is a bank acct, defer to fund transfer
    if (payMode === "CHK" && docLines.length > 0 && nonBanks.length === 0) {
      skippedFt++;
      continue;
    }

    let docDebit = 0;
    let docCredit = 0;
    let wrote = false;

    const accumulate = (row: CurrLedgeRow) => {
      wrote = true;
      added++;
      if (row.drCr === "DR") {
        docDebit = round2(docDebit + row.amount);
        gtDebit = round2(gtDebit + row.amount);
      } else {
        docCredit = round2(docCredit + row.amount);
        gtCredit = round2(gtCredit + row.amount);
      }
    };

    // Non-bank pass (cash and check)
    for (const line of nonBanks) {
      accumulate(pushFundLine(out, input, line, today));
    }

    // Check path: bank entries forced CR (dw_dismapdischeck2)
    if (payMode === "CHK") {
      for (const line of banks) {
        accumulate(pushFundLine(out, input, line, today, { forceDrCr: "CR" }));
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
      stage: "disbNet",
      ok: false,
      detail: `${unbalCount} unbalanced net-DIS doc(s); BDOAPMST=Q; mapped ${added}` +
        (skippedFt ? `; skipped ${skippedFt} fund-transfer deferral(s)` : ""),
      rowsAdded: added,
    };
  }

  if (gtDebit !== gtCredit) {
    updateBdoStatus(store, input, "H");
    return {
      stage: "disbNet",
      ok: false,
      detail: `Net-DIS grand total imbalance DR=${gtDebit} CR=${gtCredit}; BDOAPMST=H`,
      rowsAdded: added,
    };
  }

  return {
    stage: "disbNet",
    ok: true,
    detail:
      `Mapped ${added} net-DIS line(s) across ${keys.length - skippedFt} doc(s)` +
      (skippedFt ? `; deferred ${skippedFt} to fund transfer` : ""),
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
 * Port of wf_balentries:
 * - Trial imbalance → BDOAPMST 'H' (unless autoBalanceExcessCash)
 * - When balanced, compare excess-cash PHP/USD nets to CASHBALANCE → ERRCASHBAL + 'I'
 */
export function balanceEntries(
  store: DailyStore,
  input: FocusInput,
  out: CurrLedgeRow[],
): FocusStageResult {
  const { debit, credit } = debitCreditTotals(out);
  const diff = round2(debit - credit);

  if (diff !== 0) {
    if (input.autoBalanceExcessCash) {
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
        detail: `Imbalanced by ${diff}; posted ${side} ${Math.abs(diff)} to excess cash ${acct}`,
        rowsAdded: 1,
      };
    }
    updateBdoStatus(store, input, "H");
    return {
      stage: "balance",
      ok: false,
      detail: `Trial imbalance DR=${debit} CR=${credit}; BDOAPMST=H`,
      rowsAdded: 0,
    };
  }

  // Excess-cash account nets by currency (FO bal proxy from mapfocus)
  const excess = (input.params.excessCashAcct ?? "").trim();
  let phpDr = 0;
  let phpCr = 0;
  let usdDr = 0;
  let usdCr = 0;
  for (const row of out) {
    if (row.acctCode.trim() !== excess) continue;
    const cy = (row.origCy ?? "PHP").trim().toUpperCase();
    if (cy === "PHP") {
      if (row.drCr === "DR") phpDr = round2(phpDr + row.amount);
      else phpCr = round2(phpCr + row.amount);
    } else if (cy === "USD") {
      if (row.drCr === "DR") usdDr = round2(usdDr + row.amount);
      else usdCr = round2(usdCr + row.amount);
    }
  }
  const phpFoBal = round2(phpDr - phpCr);
  const usdFoBal = round2(usdDr - usdCr);

  const cashRows = store.cashBalance.filter(
    (c) =>
      c.company === input.proc.compCode &&
      c.foCode === input.proc.foCode &&
      c.tranDate === input.proc.dateRec,
  );
  if (cashRows.length === 0) {
    return {
      stage: "balance",
      ok: true,
      detail: `Balanced DR=${debit} CR=${credit}`,
      rowsAdded: 0,
    };
  }

  const today = new Date().toISOString().slice(0, 10);
  let mismatch = false;
  for (const cy of ["PHP", "USD"] as const) {
    const cac = cashRows.find((c) => c.currency.trim().toUpperCase() === cy);
    if (!cac) continue;
    const foBal = cy === "PHP" ? phpFoBal : usdFoBal;
    if (foBal !== round2(cac.cashBal)) {
      store.errCashBal.push({
        compCode: input.proc.compCode,
        foCode: input.proc.foCode,
        tranDate: input.proc.dateRec,
        foBal,
        cacBal: round2(cac.cashBal),
        currency: cy,
        processDate: today,
        userId: input.userId,
      });
      mismatch = true;
    }
  }

  if (mismatch) {
    updateBdoStatus(store, input, "I");
    return {
      stage: "balance",
      ok: false,
      detail: `Excess-cash vs CASHBALANCE mismatch; ERRCASHBAL + BDOAPMST=I`,
      rowsAdded: 0,
    };
  }

  return {
    stage: "balance",
    ok: true,
    detail: `Balanced DR=${debit} CR=${credit}; cash bal OK`,
    rowsAdded: 0,
  };
}

function snapshotFocusWorking(store: DailyStore): FocusWorkingSnapshot {
  const copy = <T,>(rows: T[]): T[] => rows.map((r) => ({ ...r }));
  return {
    cashBalance: copy(store.cashBalance),
    orMainCurr: copy(store.orMainCurr),
    orItemCurr: copy(store.orItemCurr),
    orItemDtlCurr: copy(store.orItemDtlCurr),
    orCashCurr: copy(store.orCashCurr),
    orCheckCurr: copy(store.orCheckCurr),
    orAprCurr: copy(store.orAprCurr),
    disMainCurr: copy(store.disMainCurr),
    disItemCurr: copy(store.disItemCurr),
    disItemDtlCurr: copy(store.disItemDtlCurr),
    disAddCurr: copy(store.disAddCurr),
    disDedCurr: copy(store.disDedCurr),
    disCashCurr: copy(store.disCashCurr),
    disCheckCurr: copy(store.disCheckCurr),
    disPlanCurr: copy(store.disPlanCurr),
    depositSlip: copy(store.depositSlip),
  };
}

function clearFocusWorking(store: DailyStore): void {
  store.cashBalance = [];
  store.orMainCurr = [];
  store.orItemCurr = [];
  store.orItemDtlCurr = [];
  store.orCashCurr = [];
  store.orCheckCurr = [];
  store.orAprCurr = [];
  store.disMainCurr = [];
  store.disItemCurr = [];
  store.disItemDtlCurr = [];
  store.disAddCurr = [];
  store.disDedCurr = [];
  store.disCashCurr = [];
  store.disCheckCurr = [];
  store.disPlanCurr = [];
  store.depositSlip = [];
}

function countWorkingRows(snap: FocusWorkingSnapshot): number {
  return (
    snap.cashBalance.length +
    snap.orMainCurr.length +
    snap.orItemCurr.length +
    snap.orItemDtlCurr.length +
    snap.orCashCurr.length +
    snap.orCheckCurr.length +
    snap.orAprCurr.length +
    snap.disMainCurr.length +
    snap.disItemCurr.length +
    snap.disItemDtlCurr.length +
    snap.disAddCurr.length +
    snap.disDedCurr.length +
    snap.disCashCurr.length +
    snap.disCheckCurr.length +
    snap.disPlanCurr.length +
    snap.depositSlip.length
  );
}

/**
 * Port of wf_processreject — BDO status, mapfocus → unbalCurrLedge,
 * archive OR/DIS/cash/deposit working tables to `*U`, then clear live tables.
 */
export function processReject(
  store: DailyStore,
  input: FocusInput,
  mapFocus: CurrLedgeRow[],
  status: string,
): FocusStageResult {
  const updated = updateBdoStatus(store, input, status);
  if (mapFocus.length) {
    store.unbalCurrLedge.push(...mapFocus.map((r) => ({ ...r })));
  }
  const snap = snapshotFocusWorking(store);
  const archived = countWorkingRows(snap);
  store.focusWorkingU.push(snap);
  clearFocusWorking(store);
  return {
    stage: "reject",
    ok: true,
    detail: `Reject archive *U (${archived} working row(s)); mapfocus→unbalCurrLedge ${mapFocus.length}; BDOAPMST=${status} (${updated} updated)`,
    rowsAdded: 0,
  };
}

export function processComplete(
  store: DailyStore,
  input: FocusInput,
  mapFocus: CurrLedgeRow[],
  status: string,
): FocusStageResult {
  // Legacy: default empty LOB → CORP
  for (const row of mapFocus) {
    if (!row.lob || !row.lob.trim()) row.lob = "CORP";
  }

  // Archive working tables → *X (cashBalanceX kept for CDR/compat)
  if (store.cashBalance.length) {
    store.cashBalanceX.push(...store.cashBalance.map((r) => ({ ...r })));
  }
  const snap = snapshotFocusWorking(store);
  const archived = countWorkingRows(snap);
  store.focusWorkingX.push(snap);
  clearFocusWorking(store);

  // Commit mapfocus → CURRLEDGE
  store.currLedge.push(...mapFocus.map((r) => ({ ...r })));

  const updated = updateBdoStatus(store, input, status);

  return {
    stage: "complete",
    ok: true,
    detail: `Wrote ${mapFocus.length} CURRLEDGE row(s); archived *X (${archived} working); BDOAPMST status=${status} (${updated} updated)`,
    rowsAdded: mapFocus.length,
  };
}

function failFocus(
  store: DailyStore,
  input: FocusInput,
  stages: FocusStageResult[],
  mapFocus: CurrLedgeRow[],
  status: string,
): FocusResult {
  stages.push(processReject(store, input, mapFocus, status));
  return {
    ok: false,
    stages,
    mapFocus,
    batchFile: "Error.bat",
    unbalDocs: [...store.unbalDocs],
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

  const collection = processCollection(store, input, mapFocus);
  stages.push(collection);
  if (!collection.ok) {
    return failFocus(store, input, stages, mapFocus, collection.rejectStatus ?? "J");
  }

  const early: Array<(i: FocusInput, o: CurrLedgeRow[]) => FocusStageResult> = [
    processCollPdr,
    processDisbursement,
    processDisAddDed,
  ];
  for (const step of early) {
    const result = step(input, mapFocus);
    stages.push(result);
    if (!result.ok) {
      return failFocus(store, input, stages, mapFocus, result.rejectStatus ?? "J");
    }
  }

  const ft = processFundTransfer(store, input, mapFocus);
  stages.push(ft);
  if (!ft.ok) {
    const status = store.bdoApMst.find(
      (b) => b.company === input.proc.compCode && b.bdoCode === input.proc.foCode,
    )?.status;
    return failFocus(store, input, stages, mapFocus, status === "H" ? "H" : "Q");
  }

  // Legacy: wf_procdisbnet runs at end of wf_processdisbursement after fund transfer
  const net = processDisbNet(store, input, mapFocus);
  stages.push(net);
  if (!net.ok) {
    const status = store.bdoApMst.find(
      (b) => b.company === input.proc.compCode && b.bdoCode === input.proc.foCode,
    )?.status;
    return failFocus(store, input, stages, mapFocus, status === "H" ? "H" : "Q");
  }

  const dep = processDeposit(input, mapFocus);
  stages.push(dep);
  if (!dep.ok) {
    return failFocus(store, input, stages, mapFocus, "H");
  }

  const bal = balanceEntries(store, input, mapFocus);
  stages.push(bal);
  if (!bal.ok) {
    const status = store.bdoApMst.find(
      (b) => b.company === input.proc.compCode && b.bdoCode === input.proc.foCode,
    )?.status;
    return failFocus(store, input, stages, mapFocus, status === "I" ? "I" : "H");
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
