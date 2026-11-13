/**
 * TRANEXT extract file types used by w_unload writers (wf_write2*).
 */
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export type TranextCode =
  | "RA"
  | "RB"
  | "RC"
  | "RC1"
  | "RD"
  | "RE"
  | "RF"
  | "VA"
  | "VB"
  | "VC"
  | "VD"
  | "VE"
  | "VF"
  | "VG"
  | "VH"
  | "CS"
  | "DA"
  | "APDEP"
  | "APTRANS"
  | "HA"
  | "OA"
  | "OB"
  | "VI";

export interface FieldDef {
  name: string;
  type: string;
  length: number;
}

export interface TranextSchema {
  fields: FieldDef[];
  recordLength: number;
}

const DOMAIN: Record<string, string> = {
  RA: "OR header",
  RB: "OR group/policy item",
  RC: "OR item detail",
  RC1: "OR item detail (variant)",
  RD: "OR cash",
  RE: "OR check",
  RF: "OR APR / withheld",
  VA: "DIS header",
  VB: "DIS group/policy item",
  VC: "DIS item detail",
  VD: "DIS addition",
  VE: "DIS deduction",
  VF: "DIS cash",
  VG: "DIS check",
  VH: "DIS plan premium",
  CS: "Cash balance",
  DA: "Deposit slip",
  FO_TCDBF: "FOCUS extract control",
  APDEP: "AP deposit",
  APTRANS: "AP transaction",
};

export function loadTranextSchemas(): Record<string, TranextSchema> {
  const here = dirname(fileURLToPath(import.meta.url));
  const path = resolve(here, "tranext-schemas.json");
  return JSON.parse(readFileSync(path, "utf8")) as Record<string, TranextSchema>;
}

export function describeTranext(): string {
  const schemas = loadTranextSchemas();
  const lines = ["TRANEXT / writer file types:"];
  for (const [code, schema] of Object.entries(schemas)) {
    const domain = DOMAIN[code] ?? "(see process.pbl)";
    const cols = schema.fields.map((f) => f.name).join(", ");
    lines.push(`  ${code.padEnd(8)} ${domain}`);
    lines.push(`           fields: ${cols}`);
  }
  return lines.join("\n");
}
