#!/usr/bin/env node
/**
 * Modern entry point replacing PowerBuilder 7 stub `cacentrp.exe`.
 *
 * Legacy EXE:
 *   - PE32 GUI linking PBVM70.dll ordinal 137
 *   - Embeds library list (ob.exe) + starts application object `cac`
 *   - Real UI/business logic lives in .pbd/.pbl libraries
 *
 * This CLI:
 *   1. Loads the library manifest (what the EXE would hand to PBVM)
 *   2. Reads INI profiles (cac.ini / alaicac.ini)
 *   3. Runs application open → login → MDI frame bootstrap
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
import type { AppContext, Variant } from "./types.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const PKG_ROOT = resolve(HERE, "..");

function usage(): never {
  console.log(`Usage: cacentrp [options]

Options:
  --variant ALAI|AP|PBL   Deployment flavor (default: ALAI)
  --ini <path>            Path to cac.ini / alaicac.ini
  --exe <path>            Optional legacy cacentrp.exe to scrape library list
  --user <id>             Non-interactive login user
  --password <pwd>        Non-interactive login password
  --inspect               Print manifest + INI summary and exit
  --skip-cleanup          Do not attempt DELFLECF.BAT
  --help                  Show this help
`);
  process.exit(0);
}

function parseArgs(argv: string[]) {
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

async function main() {
  const opts = parseArgs(process.argv.slice(2));
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
  console.log(
    "\nNext ports: process.pbl daily pipeline, report.pbl extracts, sysadm user rights.",
  );
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
