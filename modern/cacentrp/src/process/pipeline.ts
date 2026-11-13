/**
 * Daily Processing stage model — mirrors cac_menu Daily Processing order.
 */
import { runEndOfDay, type EndOfDayOptions } from "./endofday.js";
import { createStore, seedDemoLedger, type DailyStore } from "./store.js";
import {
  detectInboundKind,
  runUnload,
  type MailMessage,
  type UnloadInput,
} from "./unload.js";
import { describeTranext } from "./tranext.js";

export interface PipelineStage {
  id: string;
  menuId: string;
  title: string;
  window?: string;
  status: "ported" | "skeleton" | "external" | "pending";
  notes: string;
}

export const DAILY_STAGES: PipelineStage[] = [
  {
    id: "misc-files",
    menuId: "m_miscfilesprocess",
    title: "Misc. Files Process",
    status: "external",
    notes: "Legacy RUN HOTCI.EXE — out of band utility",
  },
  {
    id: "auto-email",
    menuId: "m_autoemaildetach",
    title: "Auto Email Detach",
    window: "w_unload",
    status: "skeleton",
    notes: "Mail → FOCUS/CDR + inbound BRS/SSI; mapping via daily focus|cdr",
  },
  {
    id: "focus-map",
    menuId: "(from w_unload)",
    title: "FOCUS transaction mapping",
    window: "w_focusinterfaceprocess",
    status: "ported",
    notes: "collection→disbursement→deposit→balance→complete → CURRLEDGE (FC)",
  },
  {
    id: "cdr-map",
    menuId: "(from w_unload)",
    title: "CDR accounting entry mapping",
    window: "w_cdrinterfaceprocess",
    status: "ported",
    notes: "APTRANS/APDEPOSIT ⋈ ACCTENT → CURRLEDGE (CD)",
  },
  {
    id: "manual-load",
    menuId: "m_manualloading",
    title: "Manual Loading",
    window: "w_user_unload",
    status: "skeleton",
    notes: "Same unload path without MAPI; shares writers with w_unload",
  },
  {
    id: "brs-upload",
    menuId: "m_brsupload",
    title: "BRS Upload",
    window: "w_brsinterfaceprocess",
    status: "pending",
    notes: "Interactive BRS interface window",
  },
  {
    id: "lsp-upload",
    menuId: "m_createlspupload",
    title: "Load LSP records to LSP",
    window: "w_lspupload",
    status: "pending",
    notes: "Builds LSP upload from CURRLEDGE / INTINPFL",
  },
  {
    id: "glwalker",
    menuId: "m_createglwfile",
    title: "Merge LSP and Non-LSP / Create GLW File",
    window: "w_glwalker",
    status: "ported",
    notes: "NLSP CURRLEDGE → fixed-width .GLW (H/A/P); LSP GLWDTL merge next",
  },
  {
    id: "endofday",
    menuId: "m_endofdayprocessing",
    title: "End of Day Processing",
    window: "w_endofday",
    status: "ported",
    notes: "CURRLEDGE → CURRLEDGEX archive",
  },
];

export function formatStages(): string {
  return DAILY_STAGES.map(
    (s) =>
      `- [${s.status.padEnd(8)}] ${s.title}\n    menu=${s.menuId}` +
      (s.window ? ` window=${s.window}` : "") +
      `\n    ${s.notes}`,
  ).join("\n");
}

export interface DailyRunOptions {
  userId: string;
  seedLedger?: boolean;
  messages?: MailMessage[];
  inboundPaths?: string[];
  endOfDay?: Partial<EndOfDayOptions>;
}

export interface DailyRunResult {
  store: DailyStore;
  unload?: ReturnType<typeof runUnload>;
  endOfDay?: ReturnType<typeof runEndOfDay>;
}

export function runDailyPipeline(opts: DailyRunOptions): DailyRunResult {
  const store = createStore();
  if (opts.seedLedger) seedDemoLedger(store);

  const unloadInput: UnloadInput = {
    userId: opts.userId,
    messages: opts.messages ?? [],
    inbound: (opts.inboundPaths ?? []).map((path) => ({
      path,
      kind: detectInboundKind(path),
    })),
  };
  const unload = runUnload(store, unloadInput);

  const endOfDay = runEndOfDay(store, {
    glWalkerDone: opts.endOfDay?.glWalkerDone ?? true,
    confirmArchive: opts.endOfDay?.confirmArchive ?? true,
  });

  return { store, unload, endOfDay };
}

export function inspectProcess(): string {
  return [
    "=== CAC Daily Processing (process.pbl) ===",
    "",
    formatStages(),
    "",
    describeTranext(),
  ].join("\n");
}
