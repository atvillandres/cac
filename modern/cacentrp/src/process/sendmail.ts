/**
 * Port of w_unload.wf_sendmail — FO submission feedback (log/HTML, no MAPI).
 *
 * Legacy: distinct today's BDOAPMST → SaveAs HTML feedback → BDOXPMST recipient
 * → mailSend only when SYRCACPARAM XT7 = 'Y' for that company.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type {
  BdoApMstRow,
  BdoErrorRow,
  BdoErrRefRow,
  BdoXpMstRow,
  DailyStore,
} from "./store.js";

export interface SendmailInput {
  processDate: string; // YYYY-MM-DD
  /** SYRCACPARAM R01 PARAMDESC (ALAI) — mail subject */
  subjectR01?: string;
  /** SYRCACPARAM XT7 PARAMCHAR by company — 'Y' enables send */
  xt7ByCompany?: Record<string, string>;
  /** Optional directory for .HTM feedback files */
  outDir?: string;
  /** SYRFILEPROCSTAT-like status → description */
  statusLetters?: Record<string, string>;
}

export interface SendmailPlan {
  company: string;
  bdoCode: string;
  source: string;
  recipient: string;
  subject: string;
  formFile: string;
  htmlPath?: string;
  /** Optional …ERR.HTM from BDOERROR / BDOERRREF */
  errorHtmlPath?: string;
  statusLines: string[];
  errorLines: string[];
  /** True only when XT7=Y and recipient resolved */
  sent: boolean;
  detail: string;
}

export interface SendmailResult {
  ok: boolean;
  detail: string;
  plans: SendmailPlan[];
}

const DEFAULT_STATUS: Record<string, string> = {
  Y: "Received / pending map",
  L: "Loaded to CURRLEDGE",
  C: "No attachment",
  "*": "No transaction",
  J: "Rejected",
  K: "OR short/excess fail",
  H: "Unbalanced",
  I: "Cash balance error",
  Q: "Document imbalance",
};

/** f_get_lettermonth — Jan=A … Dec=L */
export function letterMonth(isoDate: string): string {
  const m = Number(isoDate.slice(5, 7));
  if (m >= 1 && m <= 12) return String.fromCharCode(64 + m); // A=65
  return "A";
}

/** yy + letterMonth + dd (e.g. 26K19) */
export function feedbackFormName(isoDate: string): string {
  const yy = isoDate.slice(2, 4);
  const dd = isoDate.slice(8, 10);
  return `${yy}${letterMonth(isoDate)}${dd}`;
}

export function resolveXpByEmail(
  xp: BdoXpMstRow[],
  email: string,
): BdoXpMstRow | undefined {
  const key = email.trim().toLowerCase();
  if (!key) return undefined;
  return xp.find((r) => r.email.trim().toLowerCase() === key);
}

export function resolveXpRecipient(
  xp: BdoXpMstRow[],
  company: string,
  bdoCode: string,
  source: string,
): BdoXpMstRow | undefined {
  const c = company.trim().toUpperCase();
  const b = bdoCode.trim().toUpperCase();
  const s = source.trim();
  return (
    xp.find(
      (r) =>
        r.company.trim().toUpperCase() === c &&
        r.bdoCode.trim().toUpperCase() === b &&
        (r.source === undefined || r.source.trim() === s),
    ) ??
    xp.find(
      (r) =>
        r.company.trim().toUpperCase() === c &&
        r.bdoCode.trim().toUpperCase() === b,
    )
  );
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildFeedbackHtml(
  rows: BdoApMstRow[],
  plan: Pick<SendmailPlan, "company" | "bdoCode" | "source" | "subject">,
  statusLetters: Record<string, string>,
): string {
  const lines = rows
    .map((r) => {
      const desc = statusLetters[r.status] ?? r.status;
      return `<tr><td>${escapeHtml(r.subFile)}</td><td>${escapeHtml(r.status)}</td><td>${escapeHtml(desc)}</td><td>${escapeHtml(r.userId)}</td></tr>`;
    })
    .join("\n");
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escapeHtml(plan.subject)}</title></head>
<body>
<h1>${escapeHtml(plan.subject)}</h1>
<p>${escapeHtml(plan.company)} / ${escapeHtml(plan.bdoCode)} / srce=${escapeHtml(plan.source)}</p>
<table border="1" cellpadding="4" cellspacing="0">
<tr><th>Subfile</th><th>Status</th><th>Description</th><th>User</th></tr>
${lines}
</table>
</body></html>
`;
}

function lookupErrRef(
  refs: BdoErrRefRow[],
  errCode: string,
): BdoErrRefRow | undefined {
  return refs.find((r) => r.errCode.trim().toUpperCase() === errCode.trim().toUpperCase());
}

function buildErrorHtml(
  errors: BdoErrorRow[],
  refs: BdoErrRefRow[],
  plan: Pick<SendmailPlan, "company" | "bdoCode" | "source" | "subject">,
): string {
  const lines = errors
    .map((e) => {
      const ref = lookupErrRef(refs, e.errCode);
      return `<tr><td>${escapeHtml(e.xFiles ?? "")}</td><td>${escapeHtml(e.docType ?? "")}</td><td>${escapeHtml(e.docNum ?? "")}</td><td>${escapeHtml(e.errCode)}</td><td>${escapeHtml(ref?.errProc ?? "")}</td><td>${escapeHtml(ref?.errDesc ?? "")}</td></tr>`;
    })
    .join("\n");
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escapeHtml(plan.subject)} — Errors</title></head>
<body>
<h1>${escapeHtml(plan.subject)} — Errors</h1>
<p>${escapeHtml(plan.company)} / ${escapeHtml(plan.bdoCode)} / srce=${escapeHtml(plan.source)}</p>
<table border="1" cellpadding="4" cellspacing="0">
<tr><th>File</th><th>DocType</th><th>DocNum</th><th>Code</th><th>Proc</th><th>Description</th></tr>
${lines}
</table>
</body></html>
`;
}

/**
 * Plan (and optionally write) FO feedback mail for today's BDOAPMST submissions.
 * Transport is log-only: `sent=true` means XT7 gate passed (legacy would mailSend).
 */
export function runSendmail(store: DailyStore, input: SendmailInput): SendmailResult {
  const subject =
    (input.subjectR01 ?? "CAC Enterprise — FO submission feedback").trim() ||
    "CAC Enterprise — FO submission feedback";
  const statusLetters = { ...DEFAULT_STATUS, ...(input.statusLetters ?? {}) };
  const xt7 = input.xt7ByCompany ?? {};
  const formFile = feedbackFormName(input.processDate);

  const todayRows = store.bdoApMst.filter((r) => r.processDate === input.processDate);
  if (todayRows.length === 0) {
    return { ok: true, detail: "No submission to process", plans: [] };
  }

  const keys = new Map<string, { company: string; bdoCode: string; source: string }>();
  for (const r of todayRows) {
    const k = `${r.company}|${r.bdoCode}|${r.source}`;
    if (!keys.has(k)) {
      keys.set(k, { company: r.company, bdoCode: r.bdoCode, source: r.source });
    }
  }

  if (input.outDir) {
    mkdirSync(input.outDir, { recursive: true });
  }

  const plans: SendmailPlan[] = [];
  for (const trio of keys.values()) {
    const feedbackRows = todayRows.filter(
      (r) =>
        r.company === trio.company &&
        r.bdoCode === trio.bdoCode &&
        r.source === trio.source &&
        r.status !== "*",
    );
    if (feedbackRows.length === 0) {
      plans.push({
        ...trio,
        recipient: "",
        subject,
        formFile,
        statusLines: [],
        errorLines: [],
        sent: false,
        detail: `No Data for Email Feedback - ${trio.company} ${trio.bdoCode}`,
      });
      continue;
    }

    const xp = resolveXpRecipient(
      store.bdoXpMst,
      trio.company,
      trio.bdoCode,
      trio.source,
    );
    const recipient = xp?.email?.trim() ?? "";
    const statusLines = feedbackRows.map((r) => {
      const desc = statusLetters[r.status] ?? r.status;
      return `${r.subFile || "(none)"} status=${r.status} (${desc})`;
    });

    const errorRows = store.bdoError.filter(
      (e) =>
        e.company === trio.company &&
        e.bdoCode === trio.bdoCode &&
        e.source === trio.source &&
        e.processDate === input.processDate,
    );
    const errorLines = errorRows.map((e) => {
      const ref = lookupErrRef(store.bdoErrRef, e.errCode);
      return `${e.errCode} ${e.docNum ?? ""} ${ref?.errDesc ?? ""}`.trim();
    });

    let htmlPath: string | undefined;
    let errorHtmlPath: string | undefined;
    if (input.outDir && recipient) {
      htmlPath = join(input.outDir, `${formFile}${trio.bdoCode}.HTM`);
      writeFileSync(
        htmlPath,
        buildFeedbackHtml(feedbackRows, { ...trio, subject }, statusLetters),
        "utf8",
      );
      if (errorRows.length > 0) {
        errorHtmlPath = join(input.outDir, `${formFile}${trio.bdoCode}ERR.HTM`);
        writeFileSync(
          errorHtmlPath,
          buildErrorHtml(errorRows, store.bdoErrRef, { ...trio, subject }),
          "utf8",
        );
      }
    }

    const xt7On = (xt7[trio.company] ?? xt7[trio.company.toUpperCase()] ?? "")
      .trim()
      .toUpperCase() === "Y";
    let sent = false;
    let detail: string;
    if (!recipient) {
      detail = `No BDOXPMST email for ${trio.company}/${trio.bdoCode}/${trio.source}`;
    } else if (!xt7On) {
      detail = `XT7≠Y; feedback planned for ${recipient}` + (htmlPath ? ` (${htmlPath})` : "");
    } else {
      sent = true;
      detail =
        `Would mailSend → ${recipient}` +
        (htmlPath ? ` attach=${htmlPath}` : "") +
        (errorHtmlPath ? ` err=${errorHtmlPath}` : "");
    }

    plans.push({
      ...trio,
      recipient,
      subject,
      formFile,
      htmlPath,
      errorHtmlPath,
      statusLines,
      errorLines,
      sent,
      detail,
    });
  }

  const sentCount = plans.filter((p) => p.sent).length;
  return {
    ok: true,
    detail: `wf_sendmail: ${plans.length} plan(s), ${sentCount} gated send(s)`,
    plans,
  };
}
