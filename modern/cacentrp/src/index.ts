#!/usr/bin/env node
/**
 * Modern entry point replacing PowerBuilder 7 stub `cacentrp.exe`.
 *
 * Commands:
 *   cacentrp [login options]           App open → login → frame
 *   cacentrp daily list|inspect|run|unload|tranext|endofday|focus|cdr|glwalker|lspupload|brs|bpy|grp
 */
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadIni, summarizeIni } from "./config/ini.js";
import { describeManifest, detectVariant, loadManifest } from "./exe/manifest.js";
import { MockDbAdapter } from "./db/adapter.js";
import { onApplicationOpen, APP_META } from "./app/cac.js";
import { login } from "./app/login.js";
import { renderFrame } from "./app/frame.js";
import {
  formatStages,
  inspectProcess,
  runDailyPipeline,
} from "./process/pipeline.js";
import { createStore, seedDemoLedger } from "./process/store.js";
import { runEndOfDay } from "./process/endofday.js";
import { runUnload, detectInboundKind } from "./process/unload.js";
import { runFocusMapping } from "./process/focus.js";
import { runCdrMapping } from "./process/cdr.js";
import { demoCdrInput, demoFocusInput } from "./process/fixtures.js";
import { runGlWalkerAllCompanies } from "./process/glwalker.js";
import { runLspUpload, seedDemoLspLedger } from "./process/lspupload.js";
import { buildDemoAliContent, runBrsUpload } from "./process/brs.js";
import { demoBpyRows, runBpyMapping } from "./process/bpy.js";
import { demoGrpRows, runGrpMapping } from "./process/grp.js";
import { DEMO_ACCTENT } from "./process/fixtures.js";
import { runTranextLoad } from "./process/tranext.js";
import type { AppContext, Variant } from "./types.js";
import { mkdirSync, writeFileSync, statSync } from "node:fs";
import { join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const PKG_ROOT = resolve(HERE, "..");

function usage(): never {
  console.log(`Usage:
  cacentrp [options]
  cacentrp daily <list|inspect|run|unload|tranext|endofday|focus|cdr|glwalker|lspupload|brs|bpy|grp> [daily-options]

Login options:
  --variant ALAI|AP|PBL   Deployment flavor (default: ALAI)
  --ini <path>            Path to cac.ini / alaicac.ini
  --exe <path>            Optional legacy cacentrp.exe to scrape library list
  --user <id>             Non-interactive login user
  --password <pwd>        Non-interactive login password
  --inspect               Print manifest + INI summary and exit
  --skip-cleanup          Do not attempt DELFLECF.BAT

Daily options:
  --user <id>             Operator user id (default: DEMO)
  --seed-ledger           Seed demo CURRLEDGE rows before run/endofday
  --inbound <path>        Inbound BPY/GRP DBF or BRS .ALI file/dir (repeatable)
  --message-subject <s>   Synthetic mail subject (with --message-file)
  --message-file <path>   Synthetic mail attachment path
  --map                  Invoke FOCUS/CDR/BPY/GRP after unload (default)
  --no-map               Classify/load only; skip downstream mappers
  --tranext <dir>         TRANEXT *.DBF directory (ImportFile + wf_write2*)
  --no-glwalker           End-of-day refuses unless GL Walker confirmed
  --no-archive            End-of-day cancel confirm
  --out <dir>             Output directory for glwalker .GLW / lspupload .lsp trees
`);
  process.exit(0);
}

function parseLoginArgs(argv: string[]) {
  const opts: {
    variant?: Variant;
    ini?: string;
    exe?: string;
    user?: string;
    password?: string;
    inspect?: boolean;
    skipCleanup?: boolean;
  } = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--help" || a === "-h") usage();
    if (a === "--inspect") opts.inspect = true;
    else if (a === "--skip-cleanup") opts.skipCleanup = true;
    else if (a === "--variant") opts.variant = detectVariant(argv[++i]);
    else if (a === "--ini") opts.ini = argv[++i];
    else if (a === "--exe") opts.exe = argv[++i];
    else if (a === "--user") opts.user = argv[++i];
    else if (a === "--password") opts.password = argv[++i];
    else throw new Error(`Unknown argument: ${a}`);
  }
  return opts;
}

function parseDailyArgs(argv: string[]) {
  const cmd = argv[0] ?? "list";
  const opts: {
    cmd: string;
    userId: string;
    seedLedger: boolean;
    inbound: string[];
    messageSubject?: string;
    messageFiles: string[];
    mapDownstream: boolean;
    tranextDir?: string;
    glWalkerDone: boolean;
    confirmArchive: boolean;
    outDir?: string;
  } = {
    cmd,
    userId: "DEMO",
    seedLedger: false,
    inbound: [],
    messageFiles: [],
    mapDownstream: true,
    glWalkerDone: true,
    confirmArchive: true,
  };
  for (let i = 1; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--help" || a === "-h") usage();
    else if (a === "--user") opts.userId = argv[++i] ?? "DEMO";
    else if (a === "--seed-ledger") opts.seedLedger = true;
    else if (a === "--inbound") opts.inbound.push(argv[++i]!);
    else if (a === "--message-subject") opts.messageSubject = argv[++i];
    else if (a === "--message-file") opts.messageFiles.push(argv[++i]!);
    else if (a === "--map") opts.mapDownstream = true;
    else if (a === "--no-map") opts.mapDownstream = false;
    else if (a === "--tranext") opts.tranextDir = resolve(argv[++i]!);
    else if (a === "--no-glwalker") opts.glWalkerDone = false;
    else if (a === "--no-archive") opts.confirmArchive = false;
    else if (a === "--out") opts.outDir = resolve(argv[++i]!);
    else throw new Error(`Unknown daily argument: ${a}`);
  }
  return opts;
}

async function promptLogin(): Promise<{ userId: string; password: string }> {
  const rl = createInterface({ input, output });
  try {
    const userId = await rl.question("User ID : ");
    const password = await rl.question("Password: ");
    return { userId, password };
  } finally {
    rl.close();
  }
}

async function runLoginShell(argv: string[]) {
  const opts = parseLoginArgs(argv);
  const variant: Variant = opts.variant ?? "ALAI";
  const defaultIni =
    variant === "ALAI"
      ? resolve(PKG_ROOT, "config/alaicac.ini")
      : resolve(PKG_ROOT, "config/cac.ini");
  const iniPath = resolve(opts.ini ?? defaultIni);

  const manifest = loadManifest(variant, opts.exe);
  let config;
  try {
    config = loadIni(iniPath);
  } catch {
    console.warn(`INI not loaded (${iniPath}); continuing with empty profiles (mock DB).`);
    config = { profiles: {}, regions: [], raw: {} };
  }

  const ctx: AppContext = { variant, config, manifest };

  console.log(`=== ${APP_META.displayName} (modern cacentrp) ===\n`);
  console.log(describeManifest(manifest));
  console.log("");
  console.log(summarizeIni(config));
  console.log("");

  if (opts.inspect) {
    process.exit(0);
  }

  await onApplicationOpen(ctx, { skipCleanup: opts.skipCleanup ?? true });

  const creds =
    opts.user != null
      ? { userId: opts.user, password: opts.password ?? "" }
      : await promptLogin();

  const db = new MockDbAdapter();
  const result = await login(ctx, db, creds);
  ctx.session = result.session;

  console.log("\nOpening CAC Enterprise...\n");
  console.log(renderFrame(result.session));
  console.log("\nDaily processing: cacentrp daily list | run | endofday | inspect");
}

function runDailyCommand(argv: string[]) {
  const opts = parseDailyArgs(argv);
  if (opts.cmd === "list") {
    console.log("=== Daily Processing stages ===\n");
    console.log(formatStages());
    return;
  }
  if (opts.cmd === "inspect") {
    console.log(inspectProcess());
    return;
  }

  const messages =
    opts.messageFiles.length > 0
      ? [
          {
            id: "msg-1",
            subject: opts.messageSubject ?? "CAC-LSP File 0806",
            senderEmail: "fo@example.com",
            dateReceived: new Date().toISOString().slice(0, 10),
            attachments: opts.messageFiles.map((pathname) => ({
              filename: pathname.split(/[/\\]/).pop() ?? pathname,
              pathname,
            })),
          },
        ]
      : [
          {
            id: "msg-demo",
            subject: "CAC-LSP File 0806",
            senderEmail: "fo001@example.com",
            dateReceived: new Date().toISOString().slice(0, 10),
            attachments: [
              { filename: "0806XXX.FCS", pathname: "C:\\INBOUND\\0806XXX.FCS" },
              { filename: "0806YYY.CDR", pathname: "C:\\INBOUND\\0806YYY.CDR" },
            ],
          },
        ];

  if (opts.cmd === "endofday") {
    const store = createStore();
    if (opts.seedLedger) seedDemoLedger(store);
    const result = runEndOfDay(store, {
      glWalkerDone: opts.glWalkerDone,
      confirmArchive: opts.confirmArchive,
    });
    console.log(result.message);
    console.log(`CURRLEDGE=${store.currLedge.length} CURRLEDGEX=${store.currLedgeX.length}`);
    return;
  }

  if (opts.cmd === "run") {
    const result = runDailyPipeline({
      userId: opts.userId,
      seedLedger: opts.seedLedger,
      messages,
      inboundPaths:
        opts.inbound.length > 0
          ? opts.inbound
          : ["C:\\tci\\inbound\\0806BPY.DBF", "C:\\tci\\inbound\\0806GRP.DBF"],
      mapDownstream: opts.mapDownstream,
      tranextDir: opts.tranextDir,
      endOfDay: {
        glWalkerDone: opts.glWalkerDone,
        confirmArchive: opts.confirmArchive,
      },
    });

    console.log("=== Unload (w_unload) ===");
    for (const log of result.unload?.logs ?? []) {
      console.log(`${log.ok ? "OK" : "!!"} [${log.step}] ${log.detail}`);
    }
    console.log(
      `focus=${result.unload?.focusFiles} cdr=${result.unload?.cdrFiles} brs=${result.unload?.brsFiles} ssi=${result.unload?.ssiFiles}`,
    );
    const m = result.unload?.mapped;
    if (m) {
      console.log(
        `mapped focus=${m.focusRows} cdr=${m.cdrRows} bpy=${m.bpyRows} grp=${m.grpRows}`,
      );
    }
    console.log(`BDOAPMST rows=${result.store.bdoApMst.length}`);
    console.log("\n=== End of Day ===");
    console.log(result.endOfDay?.message);
    console.log(
      `CURRLEDGE=${result.store.currLedge.length} CURRLEDGEX=${result.store.currLedgeX.length}`,
    );
    return;
  }

  if (opts.cmd === "unload") {
    const store = createStore();
    const inbound =
      opts.inbound.length > 0
        ? opts.inbound.map((path) => ({ path, kind: detectInboundKind(path) }))
        : [
            { path: "C:\\tci\\inbound\\0806BPY.DBF", kind: detectInboundKind("0806BPY.DBF") },
            { path: "C:\\tci\\inbound\\0806GRP.DBF", kind: detectInboundKind("0806GRP.DBF") },
          ];
    const unload = runUnload(store, {
      userId: opts.userId,
      messages,
      inbound,
      mapDownstream: opts.mapDownstream,
      tranextDir: opts.tranextDir,
    });
    for (const log of unload.logs) {
      console.log(`${log.ok ? "OK" : "!!"} [${log.step}] ${log.detail}`);
    }
    console.log(
      `focus=${unload.focusFiles} cdr=${unload.cdrFiles} brs=${unload.brsFiles} ssi=${unload.ssiFiles}`,
    );
    console.log(
      `mapped focus=${unload.mapped.focusRows} cdr=${unload.mapped.cdrRows} bpy=${unload.mapped.bpyRows} grp=${unload.mapped.grpRows}`,
    );
    if (unload.tranextPlan.length) {
      console.log(`tranext plan: ${unload.tranextPlan.join(",")}`);
    }
    console.log(
      `ORMAINCURR=${store.orMainCurr.length} DEPOSITSLIP=${store.depositSlip.length} CASHBAL=${store.cashBalance.length}`,
    );
    console.log(`CURRLEDGE=${store.currLedge.length}`);
    return;
  }

  if (opts.cmd === "tranext") {
    const store = createStore();
    const dir = opts.tranextDir ?? resolve(PKG_ROOT, "fixtures/tranext");
    const result = runTranextLoad(store, {
      dir,
      company: "ALAI",
      foCode: "106",
      userId: opts.userId,
    });
    for (const r of result.results) {
      console.log(
        `${r.ok ? "OK" : "!!"} [${r.code}] ${r.detail} read=${r.read} write=${r.written} reject=${r.rejected}`,
      );
    }
    console.log(result.detail);
    console.log(
      `ORMAINCURR=${store.orMainCurr.length} ORITEM=${store.orItemCurr.length} ORDtl=${store.orItemDtlCurr.length} ORCASH=${store.orCashCurr.length} ORCHK=${store.orCheckCurr.length}`,
    );
    console.log(
      `DISMAIN=${store.disMainCurr.length} DISITEM=${store.disItemCurr.length} DISDtl=${store.disItemDtlCurr.length} DISCASH=${store.disCashCurr.length}`,
    );
    console.log(
      `DEPOSITSLIP=${store.depositSlip.length} CASHBAL=${store.cashBalance.length} FO_CTRL=${store.foControl.length}`,
    );
    return;
  }

  if (opts.cmd === "focus") {
    const store = createStore();
    store.bdoApMst.push({
      company: "ALAI",
      bdoCode: "001",
      source: "1",
      processDate: new Date().toISOString().slice(0, 10),
      status: "Y",
      subFile: "0806XXX",
      userId: opts.userId,
    });
    const result = runFocusMapping(store, demoFocusInput(opts.userId));
    for (const s of result.stages) {
      console.log(`${s.ok ? "OK" : "!!"} [${s.stage}] ${s.detail}`);
    }
    console.log(`batch=${result.batchFile} currledge=${store.currLedge.length} ok=${result.ok}`);
    return;
  }

  if (opts.cmd === "cdr") {
    const store = createStore();
    const input = demoCdrInput(opts.userId);
    store.apTrans = (input.apTrans ?? []).map((t) => ({ ...t }));
    store.apDeposits = (input.apDeposits ?? []).map((d) => ({ ...d }));
    store.bdoApMst.push({
      company: "AP",
      bdoCode: "080",
      source: "2",
      processDate: new Date().toISOString().slice(0, 10),
      status: "Y",
      subFile: "0806YYY",
      userId: opts.userId,
    });
    const result = runCdrMapping(store, input);
    console.log(`${result.ok ? "OK" : "!!"} ${result.detail}`);
    console.log(
      `batch=${result.batchFile} currledge=${store.currLedge.length} DR=${result.totals.debit} CR=${result.totals.credit}`,
    );
    return;
  }

  if (opts.cmd === "glwalker") {
    const store = createStore();
    seedDemoLedger(store);
    const outDir = opts.outDir ?? resolve(PKG_ROOT, "out/glwalker");
    const results = runGlWalkerAllCompanies(store.currLedge, outDir, {
      glwDtl: store.glwDtl,
    });
    for (const r of results) {
      console.log(`${r.ok ? "OK" : "!!"} [${r.company}] ${r.detail}${r.path ? ` (${r.path})` : ""}`);
    }
    return;
  }

  if (opts.cmd === "lspupload") {
    const store = createStore();
    seedDemoLspLedger(store);
    const outDir = opts.outDir ?? resolve(PKG_ROOT, "out/lsp");
    const result = runLspUpload(store, {
      userId: opts.userId,
      outDir,
    });
    console.log(`${result.ok ? "OK" : "!!"} ${result.detail}`);
    for (const f of result.files) {
      if (f.lineCount > 0) {
        console.log(`  ${f.company} ${f.filename} lines=${f.lineCount}${f.path ? ` (${f.path})` : ""}`);
      }
    }
    return;
  }

  if (opts.cmd === "brs") {
    const store = createStore();
    const files: string[] = [];
    let inboundDir: string | undefined;
    for (const p of opts.inbound) {
      try {
        const st = statSync(p);
        if (st.isDirectory()) inboundDir = p;
        else files.push(p);
      } catch {
        files.push(p);
      }
    }
    if (files.length === 0 && !inboundDir) {
      inboundDir = resolve(PKG_ROOT, "out/bis");
      mkdirSync(inboundDir, { recursive: true });
      const demo = join(inboundDir, "26k13FO1.ALI");
      writeFileSync(demo, buildDemoAliContent({ amount: 100, processYmd: "20261113" }), "latin1");
      console.log(`(seeded demo ${demo})`);
    }
    const result = runBrsUpload(store, {
      userId: opts.userId,
      files: files.length > 0 ? files : undefined,
      inboundDir,
    });
    console.log(`${result.ok ? "OK" : "!!"} ${result.detail}`);
    for (const f of result.files) {
      console.log(`  ${f.ok ? "OK" : "!!"} ${f.filename}: ${f.detail}${f.batchFile ? ` [${f.batchFile}]` : ""}`);
    }
    console.log(
      `currledge=+${result.currLedgeAdded} brsfilex=+${result.brsFileXAdded} bdoapmst=${store.bdoApMst.length}`,
    );
    return;
  }

  if (opts.cmd === "bpy") {
    const store = createStore();
    store.bpyFile = demoBpyRows();
    store.bdoApMst.push({
      company: "ALAI",
      bdoCode: "BRS",
      source: "1",
      processDate: new Date().toISOString().slice(0, 10),
      status: "Y",
      subFile: "61113BPY",
      userId: opts.userId,
    });
    const result = runBpyMapping(store, {
      proc: {
        compCode: "ALAI",
        foCode: "BRS",
        dateRec: "2026-11-13",
        fileName: "61113BPY",
        batchFile: "Error.bat",
      },
      acctEnt: DEMO_ACCTENT,
      userId: opts.userId,
      buffAmt: 0,
      units: { syrUnit: { "ALAI|001": "M001" } },
    });
    console.log(`${result.ok ? "OK" : "!!"} ${result.detail}`);
    console.log(
      `batch=${result.batchFile} currledge=${store.currLedge.length} bpyfilex=${store.bpyFileX.length} DR=${result.totals.debit} CR=${result.totals.credit}`,
    );
    return;
  }

  if (opts.cmd === "grp" || opts.cmd === "ssi") {
    const store = createStore();
    store.grpFile = demoGrpRows();
    store.bdoApMst.push({
      company: "ALAI",
      bdoCode: "SSI",
      source: "1",
      processDate: new Date().toISOString().slice(0, 10),
      status: "Y",
      subFile: "61113GRP",
      userId: opts.userId,
    });
    const result = runGrpMapping(store, {
      proc: {
        compCode: "ALAI",
        foCode: "SSI",
        dateRec: "2026-11-13",
        fileName: "61113GRP",
        batchFile: "Error.bat",
      },
      acctEnt: DEMO_ACCTENT,
      userId: opts.userId,
      units: { syrUnit: { "ALAI|001": "M001" } },
    });
    console.log(`${result.ok ? "OK" : "!!"} ${result.detail}`);
    console.log(
      `batch=${result.batchFile} currledge=${store.currLedge.length} grpfilex=${store.grpFileX.length} DR=${result.totals.debit} CR=${result.totals.credit}`,
    );
    return;
  }

  throw new Error(
    `Unknown daily command: ${opts.cmd} (use list|inspect|run|unload|tranext|endofday|focus|cdr|glwalker|lspupload|brs|bpy|grp)`,
  );
}

async function main() {
  const argv = process.argv.slice(2);
  if (argv[0] === "daily") {
    runDailyCommand(argv.slice(1));
    return;
  }
  if (argv[0] === "--help" || argv[0] === "-h") usage();
  await runLoginShell(argv);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
