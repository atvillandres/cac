/**
 * Build ODBC connection strings from PowerBuilder-style DbParm / DSN profiles.
 */
import type { ConnectParams } from "./adapter.js";

/** Pull DSN=… from PB DbParm like ConnectString='DSN=CACDB;UID=x;PWD=y',StaticBind=0 */
export function extractDsn(dbParm?: string): string | undefined {
  if (!dbParm) return undefined;
  const m = dbParm.match(/DSN\s*=\s*([^;'"}\s]+)/i);
  return m?.[1]?.trim() || undefined;
}

/**
 * Prefer an explicit connection string (CAC_ODBC_* / DbParm without PB wrapper),
 * else DSN=profile with UID/PWD from login.
 */
export function buildConnectString(params: ConnectParams): string {
  const uid = params.userId.trim();
  const pwd = params.password;
  const raw = (params.dbParm ?? "").trim();

  // Full connection string already (driver=… or DSN=… without PB ConnectString wrapper)
  if (raw && !/ConnectString\s*=/i.test(raw) && /^(DSN=|DRIVER=)/i.test(raw)) {
    let cs = raw;
    if (uid && !/;UID=/i.test(cs)) cs += `;UID=${uid}`;
    if (pwd !== undefined && pwd !== "" && !/;PWD=/i.test(cs)) cs += `;PWD=${pwd}`;
    return cs;
  }

  const dsn = extractDsn(raw) || params.database?.trim() || params.profileName;
  if (!dsn) {
    throw new Error(`No DSN for profile ${params.profileName}`);
  }
  return `DSN=${dsn};UID=${uid};PWD=${pwd}`;
}
