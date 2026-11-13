#!/usr/bin/env node
/**
 * Modern entry point replacing PowerBuilder 7 stub `cacentrp.exe`.
 *
 * Commands:
 *   cacentrp [login options]           App open → login → frame
 *   cacentrp daily list|inspect|run|endofday
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
import type { AppContext, Variant } from "./types.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const PKG_ROOT = resolve(HERE, "..");

function usage(): never {
  console.log(`Usage:
  cacentrp [options]
  cacentrp daily <list|inspect|run|endofday> [daily-options]

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
  --inbound <path>        Inbound BPY/GRP DBF path (repeatable)
  --message-subject <s>   Synthetic mail subject (with --message-file)
  --message-file <path>   Synthetic mail attachment path
  --no-glwalker           End-of-day refuses unless GL Walker confirmed
  --no-archive            End-of-day cancel confirm
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
    glWalkerDone: boolean;
    confirmArchive: boolean;
  } = {
    cmd,
    userId: "DEMO",
    seedLedger: false,
    inbound: [],
    messageFiles: [],
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
    else if (a === "--no-glwalker") opts.glWalkerDone = false;
    else if (a === "--no-archive") opts.confirmArchive = false;
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
    console.log(`BDOAPMST rows=${result.store.bdoApMst.length}`);
    console.log("\n=== End of Day ===");
    console.log(result.endOfDay?.message);
    console.log(
      `CURRLEDGE=${result.store.currLedge.length} CURRLEDGEX=${result.store.currLedgeX.length}`,
    );
    return;
  }

  // also support a bare unload demo via detectInboundKind for clarity
  if (opts.cmd === "unload") {
    const store = createStore();
    const unload = runUnload(store, {
      userId: opts.userId,
      messages,
      inbound: opts.inbound.map((path) => ({ path, kind: detectInboundKind(path) })),
    });
    for (const log of unload.logs) {
      console.log(`${log.ok ? "OK" : "!!"} [${log.step}] ${log.detail}`);
    }
    return;
  }

  throw new Error(`Unknown daily command: ${opts.cmd} (use list|inspect|run|endofday)`);
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
