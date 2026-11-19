/**
 * Real ODBC DbAdapter — connects like PowerBuilder SQLCA profiles and
 * validates USERID against SYRUSERID (legacy w_user_login).
 *
 * Requires a working ODBC driver manager + DSNs (IBM i Access / ACS on Windows,
 * or unixODBC + IBM i driver on Linux).
 */
import type { ConnectParams, DbAdapter } from "./adapter.js";
import { buildConnectString } from "./connect-string.js";

type OdbcPool = {
  query: (sql: string, binds?: unknown[]) => Promise<unknown[]>;
  close: () => Promise<void>;
};

type OdbcModule = {
  connect: (connectionString: string) => Promise<OdbcPool>;
};

async function loadOdbc(): Promise<OdbcModule> {
  try {
    return (await import("odbc")) as unknown as OdbcModule;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(
      `ODBC driver not available (${msg}). Install unixODBC + IBM i ODBC (or Windows IBM i Access), ` +
        `create DSNs, then retry with --db odbc. See docs/deploy-odbc.md.`,
    );
  }
}

export class OdbcDbAdapter implements DbAdapter {
  private readonly pools = new Map<string, OdbcPool>();
  /** Profile used for SYRUSERID (legacy SQLCA / main CAC DB). */
  private authProfile?: string;

  constructor(private readonly preferredAuthProfiles: string[] = ["CACDB", "ALAICAC", "APMODDTA"]) {}

  async connect(params: ConnectParams): Promise<void> {
    if (!params.userId.trim() || !params.password) {
      throw new Error(`Cannot connect to ${params.profileName}: missing credentials`);
    }
    const odbc = await loadOdbc();
    const cs = buildConnectString(params);
    process.stdout.write(`  ODBC → ${params.profileName} (${cs.replace(/PWD=[^;]*/i, "PWD=***")})\n`);
    try {
      const pool = await odbc.connect(cs);
      this.pools.set(params.profileName, pool);
      if (!this.authProfile) {
        const pref = this.preferredAuthProfiles.find((p) => p === params.profileName);
        this.authProfile = pref ?? params.profileName;
      } else if (this.preferredAuthProfiles.includes(params.profileName)) {
        const curIdx = this.preferredAuthProfiles.indexOf(this.authProfile);
        const nextIdx = this.preferredAuthProfiles.indexOf(params.profileName);
        if (nextIdx >= 0 && (curIdx < 0 || nextIdx < curIdx)) {
          this.authProfile = params.profileName;
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`Cannot connect to Database ${params.profileName}: ${msg}`);
    }
  }

  async disconnect(profileName: string): Promise<void> {
    const pool = this.pools.get(profileName);
    if (!pool) return;
    await pool.close();
    this.pools.delete(profileName);
    if (this.authProfile === profileName) this.authProfile = undefined;
  }

  async disconnectAll(): Promise<void> {
    for (const name of [...this.pools.keys()].reverse()) {
      await this.disconnect(name);
    }
  }

  /**
   * Legacy: SELECT USERID, PASSWORD FROM SYRUSERID WHERE USERID = :id
   * Password column is selected but not compared — ODBC UID/PWD already authenticated.
   */
  async validateUser(userId: string, _password: string): Promise<boolean> {
    const uid = userId.trim().toUpperCase();
    const profile =
      this.authProfile ??
      this.preferredAuthProfiles.find((p) => this.pools.has(p)) ??
      [...this.pools.keys()][0];
    if (!profile) throw new Error("validateUser: no open ODBC connection");
    const pool = this.pools.get(profile)!;
    const rows = (await pool.query(
      `SELECT USERID, PASSWORD FROM SYRUSERID WHERE TRIM(USERID) = ?`,
      [uid],
    )) as Array<{ USERID?: string; userid?: string }>;
    if (!rows.length) return false;
    const found = String(rows[0]!.USERID ?? rows[0]!.userid ?? "").trim();
    return found.length > 0;
  }

  isConnected(profileName: string): boolean {
    return this.pools.has(profileName);
  }
}
