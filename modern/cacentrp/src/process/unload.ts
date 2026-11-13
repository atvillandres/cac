/**
 * Skeleton port of w_unload daily unload orchestration.
 * Full FOCUS/CDR mapping lives in w_focusinterfaceprocess / w_cdrinterfaceprocess
 * and will be ported in later slices; this captures control flow + status tracking.
 */
import type { DailyStore } from "./store.js";

export type AttachmentKind = "FOCUS" | "CDR" | "UNKNOWN";

export interface MailAttachment {
  filename: string;
  pathname: string;
}

export interface MailMessage {
  id: string;
  subject: string;
  senderEmail: string;
  dateReceived: string; // YYYY-MM-DD
  attachments: MailAttachment[];
}

export interface InboundDbf {
  path: string;
  /** BRS if name contains BPY, SSI if GRP — legacy LEFT(RIGHT(path,7),3) */
  kind: "BRS" | "SSI" | "OTHER";
  rows?: Record<string, unknown>[];
}

export interface UnloadInput {
  messages: MailMessage[];
  inbound: InboundDbf[];
  /** SYRPARAM-style extension → company map */
  fcsExtensions?: {
    ap?: string;
    alai?: string;
    ahci?: string;
    apCompany?: string;
    alaiCompany?: string;
    ahciCompany?: string;
  };
  userId: string;
}

export interface UnloadStepLog {
  step: string;
  detail: string;
  ok: boolean;
}

export interface UnloadResult {
  logs: UnloadStepLog[];
  focusFiles: number;
  cdrFiles: number;
  brsFiles: number;
  ssiFiles: number;
}

function classifyAttachment(
  filename: string,
  extMap: NonNullable<UnloadInput["fcsExtensions"]>,
): { kind: AttachmentKind; company?: string; appsrce: "1" | "2"; ext: string } {
  const upper = filename.toUpperCase();
  const ext = upper.includes(".") ? upper.slice(upper.lastIndexOf(".") + 1) : "";
  if (ext === "CDR") {
    return { kind: "CDR", company: extMap.apCompany ?? "AP", appsrce: "2", ext };
  }
  if (ext === (extMap.ap?.toUpperCase() ?? "FCP") || ext === "FCP") {
    return { kind: "FOCUS", company: extMap.apCompany ?? "AP", appsrce: "1", ext };
  }
  if (ext === (extMap.alai?.toUpperCase() ?? "FCS") || ext === "FCS") {
    return { kind: "FOCUS", company: extMap.alaiCompany ?? "ALAI", appsrce: "1", ext };
  }
  if (ext === (extMap.ahci?.toUpperCase() ?? "FCH") || ext === "FCH") {
    return { kind: "FOCUS", company: extMap.ahciCompany ?? "AHCI", appsrce: "1", ext };
  }
  return { kind: "UNKNOWN", appsrce: "1", ext };
}

function bdoFromFilename(filename: string): string {
  // Legacy: RIGHT(filename,7) then LEFT(...,3) — BDO embedded before extension
  const base = filename.includes(".") ? filename.slice(0, filename.lastIndexOf(".")) : filename;
  const tail = base.slice(-7);
  return tail.slice(0, 3).trim();
}

export function runUnload(store: DailyStore, input: UnloadInput): UnloadResult {
  const logs: UnloadStepLog[] = [];
  const today = new Date().toISOString().slice(0, 10);
  const extMap = input.fcsExtensions ?? {
    ap: "FCP",
    alai: "FCS",
    ahci: "FCH",
    apCompany: "AP",
    alaiCompany: "ALAI",
    ahciCompany: "AHCI",
  };

  logs.push({
    step: "miscrenm",
    detail: "Would RUN MISCRENM.BAT (rename BRS/SSI → DBF)",
    ok: true,
  });

  const candidates = input.messages.filter((m) => {
    const s = m.subject.trim().toUpperCase();
    return s.startsWith("CAC-LSP FILE") || s.startsWith("NO CAC-LSP FILE");
  });

  if (candidates.length === 0) {
    logs.push({ step: "mail", detail: "No New Messages Received", ok: true });
  }

  let focusFiles = 0;
  let cdrFiles = 0;

  for (const msg of candidates) {
    if (msg.attachments.length < 1 || msg.subject.trim().toUpperCase().startsWith("NO")) {
      store.bdoApMst.push({
        company: "ALAI",
        bdoCode: "???",
        source: "2",
        processDate: today,
        status: msg.subject.trim().toUpperCase().startsWith("NO") ? "*" : "C",
        subFile: "",
        userId: input.userId,
      });
      logs.push({
        step: "mail-no-attach",
        detail: `${msg.id}: tagged no-transaction/no-attachment`,
        ok: true,
      });
      continue;
    }

    for (const att of msg.attachments) {
      const cls = classifyAttachment(att.filename, extMap);
      if (cls.kind === "UNKNOWN") {
        logs.push({
          step: "attach-skip",
          detail: `${att.filename}: invalid extension ${cls.ext}`,
          ok: false,
        });
        continue;
      }
      const bdo = bdoFromFilename(att.filename);
      const subFile = att.filename.replace(/\.[^.]+$/, "").slice(0, 8).toUpperCase();
      store.bdoApMst.push({
        company: cls.company ?? "ALAI",
        bdoCode: bdo,
        source: cls.appsrce,
        processDate: today,
        status: "Y",
        subFile,
        userId: input.userId,
      });
      if (cls.kind === "FOCUS") {
        focusFiles++;
        logs.push({
          step: "focus",
          detail: `${att.filename} → wf_procfocusfiles / w_focusinterfaceprocess (${cls.company}/${bdo})`,
          ok: true,
        });
      } else {
        cdrFiles++;
        logs.push({
          step: "cdr",
          detail: `${att.filename} → wf_proccdrfiles / w_cdrinterfaceprocess (${cls.company}/${bdo})`,
          ok: true,
        });
      }
    }
  }

  let brsFiles = 0;
  let ssiFiles = 0;
  for (const file of input.inbound) {
    if (file.kind === "BRS") {
      store.bpyFile = file.rows ? [...file.rows] : [{ importedFrom: file.path }];
      store.bdoApMst.push({
        company: "ALAI",
        bdoCode: "BRS",
        source: "1",
        processDate: today,
        status: "Y",
        subFile: file.path.split(/[/\\]/).pop()?.replace(/\.[^.]+$/, "").slice(0, 8).toUpperCase() ?? "BRS",
        userId: input.userId,
      });
      brsFiles++;
      logs.push({
        step: "brs",
        detail: `${file.path} → BPYFILE → w_bpyinterfaceprocess`,
        ok: true,
      });
    } else if (file.kind === "SSI") {
      store.grpFile = file.rows ? [...file.rows] : [{ importedFrom: file.path }];
      store.bdoApMst.push({
        company: "ALAI",
        bdoCode: "SSI",
        source: "1",
        processDate: today,
        status: "Y",
        subFile: file.path.split(/[/\\]/).pop()?.replace(/\.[^.]+$/, "").slice(0, 8).toUpperCase() ?? "SSI",
        userId: input.userId,
      });
      ssiFiles++;
      logs.push({
        step: "ssi",
        detail: `${file.path} → GRPFILE → w_grpinterfaceprocess`,
        ok: true,
      });
    } else {
      logs.push({ step: "inbound-skip", detail: `${file.path}: not BPY/GRP`, ok: false });
    }
  }

  if (input.inbound.length === 0) {
    logs.push({ step: "inbound", detail: "No BRS/SSI Files To Process", ok: true });
  }

  return { logs, focusFiles, cdrFiles, brsFiles, ssiFiles };
}

export function detectInboundKind(filename: string): InboundDbf["kind"] {
  const upper = filename.toUpperCase();
  // Legacy checks LEFT(RIGHT(pathname,7),3) for BPY/GRP before .DBF
  const noExt = upper.replace(/\.DBF$/, "");
  const marker = noExt.slice(-7, -4);
  if (marker === "BPY" || upper.includes("BPY")) return "BRS";
  if (marker === "GRP" || upper.includes("GRP")) return "SSI";
  return "OTHER";
}
