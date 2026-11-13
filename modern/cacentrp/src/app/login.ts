/**
 * Port of w_user_login OK-click flow (ALAI SOURCE).
 * Legacy connects ODBC profiles then validates SYRUSERID.
 */
import type { DbAdapter } from "../db/adapter.js";
import type { AppContext, Session, Variant } from "../types.js";

export interface LoginInput {
  userId: string;
  password: string;
}

export interface LoginResult {
  ok: true;
  session: Session;
}

function requiredProfiles(variant: Variant): string[] {
  if (variant === "ALAI") return ["ALAICAC", "ALMODDATA", "GISDATA"];
  // AP / PBL builds used APMODDTA + related CACDB profiles via cac.ini
  return ["APMODDTA", "CACDB", "RAWDATA"];
}

function profileLookupKeys(name: string): string[] {
  // INI may store "Profile ALAICAC" keys already stripped by loader
  return [name, name.toUpperCase(), name.toLowerCase()];
}

export async function login(
  ctx: AppContext,
  db: DbAdapter,
  input: LoginInput,
): Promise<LoginResult> {
  const userId = input.userId.trim().toUpperCase();
  const password = input.password.trim();
  if (!userId) throw new Error("Missing Information: You have not supplied a User ID");
  if (!password) throw new Error("Missing Information: You have not supplied a Password");

  const profiles = requiredProfiles(ctx.variant);
  for (const name of profiles) {
    const profile =
      profileLookupKeys(name)
        .map((k) => ctx.config.profiles[k])
        .find(Boolean) ?? { name, dbms: "ODBC", database: name };

    process.stdout.write(`Connecting to ${profile.name || name}...\n`);
    await db.connect({
      profileName: name,
      userId,
      password,
      dbms: profile.dbms,
      database: profile.database,
      dbParm: profile.dbParm,
    });
  }

  process.stdout.write("Validating the user profile...\n");
  const valid = await db.validateUser(userId, password);
  if (!valid) {
    for (const name of profiles.slice().reverse()) {
      await db.disconnect(name);
    }
    throw new Error(`User ID '${input.userId}' is invalid`);
  }

  const now = new Date();
  const stamp =
    String(now.getMonth() + 1).padStart(2, "0") +
    String(now.getDate()).padStart(2, "0") +
    String(now.getFullYear()) +
    String(now.getHours()).padStart(2, "0") +
    String(now.getMinutes()).padStart(2, "0") +
    String(now.getSeconds()).padStart(2, "0");

  const session: Session = {
    userId,
    userName: userId,
    sessionId: `${userId}${stamp}`,
    variant: ctx.variant,
    loginAt: now,
  };
  return { ok: true, session };
}
