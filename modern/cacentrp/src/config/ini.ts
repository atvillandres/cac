/**
 * INI reader for cac.ini / alaicac.ini / caclocal.ini (PowerBuilder ProfileString).
 */
import { readFileSync, existsSync } from "node:fs";
import type { DbProfile, IniConfig } from "../types.js";

function parseIniText(text: string): Record<string, Record<string, string>> {
  const sections: Record<string, Record<string, string>> = {};
  let current = "";
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith(";") || line.startsWith("#")) continue;
    const sec = line.match(/^\[(.+)]$/);
    if (sec) {
      current = sec[1].trim();
      sections[current] ??= {};
      continue;
    }
    if (!current) continue;
    const eq = line.indexOf("=");
    if (eq < 0) continue;
    const key = line.slice(0, eq).trim();
    const value = line.slice(eq + 1).trim();
    sections[current][key] = value;
  }
  return sections;
}

function profileFromSection(name: string, sec: Record<string, string>): DbProfile {
  return {
    name,
    dbms: sec.DBMS ?? "",
    database: sec.Database ?? "",
    userId: sec.UserId,
    databasePassword: sec.DatabasePassword,
    logId: sec.LogId,
    logPassword: sec.LogPassword,
    serverName: sec.ServerName,
    lock: sec.Lock,
    dbParm: sec.DbParm ?? sec.DBParm,
    prompt: sec.Prompt,
    autoCommit: sec.AutoCommit,
  };
}

export function loadIni(path: string): IniConfig {
  if (!existsSync(path)) {
    throw new Error(`INI not found: ${path}`);
  }
  const raw = parseIniText(readFileSync(path, "utf8"));
  const profiles: Record<string, DbProfile> = {};
  for (const [section, values] of Object.entries(raw)) {
    if (section.toLowerCase().startsWith("profile ")) {
      const name = section.slice("profile ".length).trim();
      profiles[name] = profileFromSection(name, values);
    }
  }

  const regions: { code: string; desc: string }[] = [];
  const regionSec = raw.Region ?? {};
  for (let i = 1; i <= 9; i++) {
    const code = regionSec[`RegionCode${i}`];
    const desc = regionSec[`RegionDesc${i}`];
    if (code || desc) regions.push({ code: code ?? "", desc: desc ?? "" });
  }

  return {
    profiles,
    appsPath: raw.APPSPATH?.Appspath ?? raw.EXTRACT?.Appspath,
    extractPath: raw.EXTRACT?.Appspath,
    regions,
    raw,
  };
}

/** Safe summary — never prints passwords. */
export function summarizeIni(cfg: IniConfig): string {
  const lines = [
    `Profiles (${Object.keys(cfg.profiles).length}):`,
    ...Object.values(cfg.profiles).map(
      (p) => `  - ${p.name}: DBMS=${p.dbms || "?"} DB=${p.database || "?"} parm=${p.dbParm ? "set" : "default"}`,
    ),
    `Apps path : ${cfg.appsPath ?? "(none)"}`,
    `Regions   : ${cfg.regions.map((r) => `${r.code}=${r.desc}`).join(", ") || "(none)"}`,
  ];
  return lines.join("\n");
}
