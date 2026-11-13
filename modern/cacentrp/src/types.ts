/** Shared types mirroring PowerBuilder CAC Enterprise globals / config. */

export type Variant = "ALAI" | "AP" | "PBL";

export interface DbProfile {
  name: string;
  dbms: string;
  database: string;
  userId?: string;
  databasePassword?: string;
  logId?: string;
  logPassword?: string;
  serverName?: string;
  lock?: string;
  dbParm?: string;
  prompt?: string;
  autoCommit?: string;
}

export interface IniConfig {
  profiles: Record<string, DbProfile>;
  appsPath?: string;
  extractPath?: string;
  regions: { code: string; desc: string }[];
  raw: Record<string, Record<string, string>>;
}

export interface LibraryManifest {
  application: string;
  libraries: string[];
  objects: { name: string; kind: string }[];
  variant: Variant;
}

export interface Session {
  userId: string;
  userName: string;
  sessionId: string;
  variant: Variant;
  loginAt: Date;
}

export interface MenuItem {
  id: string;
  text: string;
  children?: MenuItem[];
}

export interface AppContext {
  variant: Variant;
  config: IniConfig;
  manifest: LibraryManifest;
  session?: Session;
}
