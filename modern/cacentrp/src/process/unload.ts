/**
 * Port of w_unload daily unload orchestration (ue_process / wf_procmail / wf_procmiscfiles).
 *
 * Control flow:
 *   1. MISCRENM.BAT (logged)
 *   2. Mail subjects CAC-LSP File / NO CAC-LSP File → FOCUS/CDR attachments
 *   3. Inbound *.dbf → BPYFILE (BRS) / GRPFILE (SSI)
 *   4. Optional mapDownstream → call ported FOCUS/CDR/BPY/GRP mappers
 *
 * TRANEXT: optional tranextDir → ImportFile + wf_write2* (typed CS/DA/RA/FO_TCDBF).
 */
import { readdirSync } from "node:fs";
import { basename, join } from "node:path";
import { runBpyMapping } from "./bpy.js";
import { runCdrMapping, type CdrInput } from "./cdr.js";
import { DEMO_ACCTENT, DEMO_PARAMS, demoCdrInput, demoFocusInput } from "./fixtures.js";
import { runFocusMapping, type FocusInput } from "./focus.js";
import { runGrpMapping } from "./grp.js";
import type { BpyFileRow, DailyStore, GrpFileRow } from "./store.js";
import {
  FOCUS_TRANEXT_FILES,
  runTranextLoad,
  type TranextCode,
  type TranextLoadResult,
} from "./tranext.js";

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
  /** When true, invoke ported FOCUS/CDR/BPY/GRP mappers after classify/load */
  mapDownstream?: boolean;
  focusInput?: FocusInput;
  cdrInput?: CdrInput;
  /** Directory of TRANEXT *.DBF (legacy `...\ALAI\TRANEXT\`) — ImportFile + wf_write2* */
  tranextDir?: string;
  tranextCompany?: string;
  tranextFoCode?: string;
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
  mapped: {
    focusRows: number;
    cdrRows: number;
    bpyRows: number;
    grpRows: number;
  };
  /** Planned TRANEXT writers for FOCUS path */
  tranextPlan: TranextCode[];
  /** Result of runTranextLoad when tranextDir was supplied */
  tranextLoad?: TranextLoadResult;
}

/** FOCUS extract typically drives these writers after wf_procfocusfiles. */
export const FOCUS_TRANEXT_WRITERS: TranextCode[] = [
  ...(FOCUS_TRANEXT_FILES as readonly TranextCode[]),
];

/** CDR path writers. */
export const CDR_TRANEXT_WRITERS: TranextCode[] = ["APTRANS", "APDEP"];

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
  return (tail.slice(0, 3).trim() || "000").toUpperCase();
}

export function detectInboundKind(filename: string): InboundDbf["kind"] {
  const upper = filename.toUpperCase();
  const noExt = upper.replace(/\.DBF$/, "");
  const marker = noExt.slice(-7, -4);
  if (marker === "BPY" || upper.includes("BPY")) return "BRS";
  if (marker === "GRP" || upper.includes("GRP")) return "SSI";
  return "OTHER";
}

/** Scan a directory for *.dbf / *.DBF and classify BPY/GRP. */
export function scanInboundDir(dir: string): InboundDbf[] {
  try {
    return readdirSync(dir)
      .filter((f) => f.toUpperCase().endsWith(".DBF"))
      .map((f) => {
        const path = join(dir, f);
        return { path, kind: detectInboundKind(f) };
      });
  } catch {
    return [];
  }
}

function shortSubFile(name: string): string {
  return basename(name).replace(/\.[^.]+$/, "").slice(0, 8).toUpperCase();
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
  const mapDown = input.mapDownstream ?? false;
  const mapped = { focusRows: 0, cdrRows: 0, bpyRows: 0, grpRows: 0 };
  const tranextPlan = new Set<TranextCode>();

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
  const focusJobs: Array<{ company: string; foCode: string; subFile: string }> = [];
  const cdrJobs: Array<{ company: string; foCode: string; subFile: string }> = [];

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
      const subFile = shortSubFile(att.filename);
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
        focusJobs.push({ company: cls.company ?? "ALAI", foCode: bdo, subFile });
        for (const w of FOCUS_TRANEXT_WRITERS) tranextPlan.add(w);
        logs.push({
          step: "focus",
          detail: `${att.filename} → wf_procfocusfiles / w_focusinterfaceprocess (${cls.company}/${bdo})`,
          ok: true,
        });
      } else {
        cdrFiles++;
        cdrJobs.push({ company: cls.company ?? "AP", foCode: bdo, subFile });
        for (const w of CDR_TRANEXT_WRITERS) tranextPlan.add(w);
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
      const rows = file.rows ? (file.rows as unknown as BpyFileRow[]) : [];
      store.bpyFile.push(...rows);
      store.bdoApMst.push({
        company: "ALAI",
        bdoCode: "BRS",
        source: "1",
        processDate: today,
        status: "Y",
        subFile: shortSubFile(file.path),
        userId: input.userId,
      });
      brsFiles++;
      logs.push({
        step: "brs",
        detail:
          `${file.path} → BPYFILE → w_bpyinterfaceprocess` +
          (rows.length ? ` (${rows.length} rows)` : " (empty — supply rows or run daily bpy)"),
        ok: true,
      });
    } else if (file.kind === "SSI") {
      const rows = file.rows ? (file.rows as unknown as GrpFileRow[]) : [];
      store.grpFile.push(...rows);
      store.bdoApMst.push({
        company: "ALAI",
        bdoCode: "SSI",
        source: "1",
        processDate: today,
        status: "Y",
        subFile: shortSubFile(file.path),
        userId: input.userId,
      });
      ssiFiles++;
      logs.push({
        step: "ssi",
        detail:
          `${file.path} → GRPFILE → w_grpinterfaceprocess` +
          (rows.length ? ` (${rows.length} rows)` : " (empty — supply rows or run daily grp)"),
        ok: true,
      });
    } else {
      logs.push({ step: "inbound-skip", detail: `${file.path}: not BPY/GRP`, ok: false });
    }
  }

  if (input.inbound.length === 0) {
    logs.push({ step: "inbound", detail: "No BRS/SSI Files To Process", ok: true });
  }

  if (tranextPlan.size > 0) {
    logs.push({
      step: "tranext-plan",
      detail: `Planned writers: ${[...tranextPlan].join(",")}`,
      ok: true,
    });
  }

  let tranextLoad: TranextLoadResult | undefined;
  if (input.tranextDir) {
    const company =
      input.tranextCompany ??
      focusJobs[0]?.company ??
      "ALAI";
    const foCode =
      input.tranextFoCode ??
      focusJobs[0]?.foCode ??
      "000";
    tranextLoad = runTranextLoad(store, {
      dir: input.tranextDir,
      company,
      foCode,
      userId: input.userId,
    });
    for (const r of tranextLoad.results) {
      logs.push({
        step: `tranext-${r.code.toLowerCase()}`,
        detail: `${r.detail} (read=${r.read} write=${r.written} reject=${r.rejected})`,
        ok: r.ok,
      });
    }
    logs.push({
      step: "tranext-load",
      detail: tranextLoad.detail,
      ok: tranextLoad.ok,
    });
  }

  if (mapDown) {
    // FOCUS — one demo/map call per job (payload tables not yet parsed from FCS)
    for (const job of focusJobs) {
      const base = input.focusInput ?? demoFocusInput(input.userId);
      const focusIn: FocusInput = {
        ...base,
        userId: input.userId,
        acctEnt: base.acctEnt?.length ? base.acctEnt : DEMO_ACCTENT,
        params: base.params ?? DEMO_PARAMS,
        proc: {
          ...base.proc,
          compCode: job.company,
          foCode: job.foCode,
          fileName: job.subFile,
        },
      };
      const before = store.currLedge.length;
      const result = runFocusMapping(store, focusIn);
      const added = store.currLedge.length - before;
      mapped.focusRows += added;
      logs.push({
        step: "map-focus",
        detail: `${job.subFile}: ${result.ok ? "OK" : "!!"} ${result.stages.map((s) => s.stage).join("→")} (+${added} CURRLEDGE)`,
        ok: result.ok,
      });
    }

    for (const job of cdrJobs) {
      const base = input.cdrInput ?? demoCdrInput(input.userId);
      const cdrIn: CdrInput = {
        ...base,
        userId: input.userId,
        acctEnt: base.acctEnt?.length ? base.acctEnt : DEMO_ACCTENT,
        params: base.params ?? DEMO_PARAMS,
        proc: {
          ...base.proc,
          compCode: job.company,
          foCode: job.foCode,
          fileName: job.subFile,
        },
      };
      if (cdrIn.apTrans) store.apTrans = cdrIn.apTrans.map((t) => ({ ...t }));
      if (cdrIn.apDeposits) store.apDeposits = cdrIn.apDeposits.map((d) => ({ ...d }));
      const before = store.currLedge.length;
      const result = runCdrMapping(store, cdrIn);
      const added = store.currLedge.length - before;
      mapped.cdrRows += added;
      logs.push({
        step: "map-cdr",
        detail: `${job.subFile}: ${result.ok ? "OK" : "!!"} ${result.detail} (+${added})`,
        ok: result.ok,
      });
    }

    if (store.bpyFile.length > 0) {
      const before = store.currLedge.length;
      const result = runBpyMapping(store, {
        proc: {
          compCode: "ALAI",
          foCode: "BRS",
          dateRec: today,
          fileName: store.bdoApMst.find((b) => b.bdoCode === "BRS")?.subFile ?? "BPY",
          batchFile: "Error.bat",
        },
        acctEnt: DEMO_ACCTENT,
        userId: input.userId,
        buffAmt: 0,
        units: { syrUnit: { "ALAI|001": "M001" } },
      });
      mapped.bpyRows = store.currLedge.length - before;
      logs.push({
        step: "map-bpy",
        detail: `${result.ok ? "OK" : "!!"} ${result.detail}`,
        ok: result.ok,
      });
    }

    if (store.grpFile.length > 0) {
      const before = store.currLedge.length;
      const result = runGrpMapping(store, {
        proc: {
          compCode: "ALAI",
          foCode: "SSI",
          dateRec: today,
          fileName: store.bdoApMst.find((b) => b.bdoCode === "SSI")?.subFile ?? "GRP",
          batchFile: "Error.bat",
        },
        acctEnt: DEMO_ACCTENT,
        userId: input.userId,
        units: { syrUnit: { "ALAI|001": "M001" } },
      });
      mapped.grpRows = store.currLedge.length - before;
      logs.push({
        step: "map-grp",
        detail: `${result.ok ? "OK" : "!!"} ${result.detail}`,
        ok: result.ok,
      });
    }
  }

  return {
    logs,
    focusFiles,
    cdrFiles,
    brsFiles,
    ssiFiles,
    mapped,
    tranextPlan: [...tranextPlan],
    tranextLoad,
  };
}
