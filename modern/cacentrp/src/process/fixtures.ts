/** Demo ACCTENT + sample FO/CDR payloads for CLI / tests. */
import type { AcctEntRule, CacParams } from "./currledge.js";
import type { FocusInput } from "./focus.js";
import type { CdrInput } from "./cdr.js";

export const DEMO_PARAMS: CacParams = {
  excessCashAcct: "214000",
  cashClearingAcct: "205002",
  realizedGainLossAcct: "490001",
  foUnit: "M001",
  bookingRate: 56.5,
};

/** Minimal chart: OR cash, OR premium, DIS cash, bank deposit. */
export const DEMO_ACCTENT: AcctEntRule[] = [
  {
    coCode: "ALAI",
    tranType: "ORCASH",
    acctCode: "101001",
    drCr: "DR",
    lob: "01",
    payType: "CSH",
  },
  {
    coCode: "ALAI",
    tranType: "ORPREM",
    acctCode: "401001",
    drCr: "CR",
    lob: "01",
  },
  {
    coCode: "ALAI",
    tranType: "DISCASH",
    acctCode: "101001",
    drCr: "CR",
    lob: "01",
    payType: "CSH",
  },
  {
    coCode: "ALAI",
    tranType: "DISPREM",
    acctCode: "501001",
    drCr: "DR",
    lob: "01",
  },
  {
    coCode: "ALAI",
    tranType: "BNK001",
    acctCode: "102001",
    drCr: "DR",
    lob: "01",
  },
  {
    coCode: "ALAI",
    tranType: "PDRPREM",
    acctCode: "401050",
    drCr: "CR",
    lob: "01",
    payType: "PD",
  },
  {
    coCode: "AP",
    tranType: "PREM",
    acctCode: "401001",
    drCr: "CR",
    lob: "01",
  },
  {
    coCode: "AP",
    tranType: "CASH",
    acctCode: "101001",
    drCr: "DR",
    lob: "01",
    payType: "CSH",
  },
  {
    coCode: "AP",
    tranType: "BNK001",
    acctCode: "102001",
    drCr: "DR",
    lob: "01",
  },
];

export function demoFocusInput(userId = "DEMO"): FocusInput {
  const today = new Date().toISOString().slice(0, 10);
  return {
    proc: {
      compCode: "ALAI",
      foCode: "001",
      dateRec: today,
      fileName: "0806XXX",
      batchFile: "Error.bat",
    },
    params: DEMO_PARAMS,
    acctEnt: DEMO_ACCTENT,
    userId,
    orCash: [{ orNo: "OR000001", orDate: today, currency: "PHP", cashAmt: 5000, payType: "CSH", acctType: "ORCASH" }],
    orItems: [
      {
        orNo: "OR000001",
        orDate: today,
        itemNo: 1,
        payType: "CSH",
        orItemAmt: 5000,
        acctType: "ORPREM",
      },
    ],
    disCash: [
      {
        disNo: "DS000001",
        disDate: today,
        currency: "PHP",
        cashAmt: 1000,
        payType: "CSH",
        acctType: "DISCASH",
      },
    ],
    disItems: [
      {
        disNo: "DS000001",
        disDate: today,
        itemNo: 1,
        disAmt: 1000,
        acctType: "DISPREM",
      },
    ],
    // Deposits omitted so OR+DIS trial balances without auto excess-cash post.
    // Use disAddDedLines / deposits in dedicated tests.
    deposits: [],
  };
}

export function demoCdrInput(userId = "DEMO"): CdrInput {
  const today = new Date().toISOString().slice(0, 10);
  return {
    proc: {
      compCode: "AP",
      foCode: "080",
      dateRec: today,
      fileName: "0806YYY",
      batchFile: "Error.bat",
    },
    params: { ...DEMO_PARAMS },
    acctEnt: DEMO_ACCTENT,
    userId,
    apTrans: [
      {
        docNum: "AP000001",
        docDate: today,
        acctType: "CASH",
        amount: 2500,
        payType: "CSH",
      },
      {
        docNum: "AP000001",
        docDate: today,
        acctType: "PREM",
        amount: 2500,
      },
    ],
    apDeposits: [
      {
        bankAcct: "BNK001",
        tranDate: today,
        amount: 2500,
      },
    ],
  };
}
