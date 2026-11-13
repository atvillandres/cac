/**
 * Database adapter boundary.
 * Legacy PowerBuilder used ODBC DSNs (ALAICAC, ALMODDATA, GISDATA / APMODDTA, CACDB, RAWDATA).
 * Default implementation is an in-memory mock so the modern shell can run without ASA/ODBC.
 */
export interface ConnectParams {
  profileName: string;
  userId: string;
  password: string;
  dbms?: string;
  database?: string;
  dbParm?: string;
}

export interface DbAdapter {
  connect(params: ConnectParams): Promise<void>;
  disconnect(profileName: string): Promise<void>;
  validateUser(userId: string, password: string): Promise<boolean>;
}

export class MockDbAdapter implements DbAdapter {
  private open = new Set<string>();
  /** Accept any non-empty credentials in mock mode. */
  async connect(params: ConnectParams): Promise<void> {
    if (!params.userId.trim() || !params.password.trim()) {
      throw new Error(`Cannot connect to ${params.profileName}: missing credentials`);
    }
    this.open.add(params.profileName);
  }
  async disconnect(profileName: string): Promise<void> {
    this.open.delete(profileName);
  }
  async validateUser(userId: string, _password: string): Promise<boolean> {
    // Legacy: SELECT USERID, PASSWORD FROM SYRUSERID WHERE USERID = :ls_userid
    // Mock: treat DEMO / any password as valid when mock auth is enabled.
    return userId.trim().length > 0;
  }
  isConnected(profileName: string): boolean {
    return this.open.has(profileName);
  }
}
