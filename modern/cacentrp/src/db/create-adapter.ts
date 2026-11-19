import { MockDbAdapter, type DbAdapter } from "./adapter.js";
import { OdbcDbAdapter } from "./odbc-adapter.js";

export type DbMode = "mock" | "odbc";

export function parseDbMode(raw?: string): DbMode {
  const v = (raw ?? process.env.CAC_DB ?? "mock").trim().toLowerCase();
  if (v === "odbc" || v === "real") return "odbc";
  if (v === "mock" || v === "") return "mock";
  throw new Error(`Unknown --db mode '${raw}'. Use mock or odbc.`);
}

export function createDbAdapter(mode: DbMode): DbAdapter {
  if (mode === "odbc") return new OdbcDbAdapter();
  return new MockDbAdapter();
}
