/**
 * Port of application object `cac` (cac.sra) open event.
 * Legacy: OPEN(w_user_login) then RUN cleanup batch for CDR/FCS files.
 */
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import type { AppContext } from "../types.js";

export const APP_META = {
  appName: "cac",
  displayName: "CAC Enterprise",
  frameWindow: "w_cac_frame",
  loginWindow: "w_user_login",
  logoWindow: "w_cac_logo",
} as const;

export async function onApplicationOpen(
  ctx: AppContext,
  options: { cleanupScript?: string; skipCleanup?: boolean } = {},
): Promise<void> {
  console.log(`[${APP_META.displayName}] open`);
  console.log(`  variant   : ${ctx.variant}`);
  console.log(`  app object: ${APP_META.appName}`);
  console.log(`  next      : ${APP_META.loginWindow}`);

  if (options.skipCleanup) return;

  const script = options.cleanupScript;
  if (!script) {
    console.log("  cleanup  : skipped (no DELFLECF.BAT path configured)");
    return;
  }
  if (!existsSync(script)) {
    console.warn(`  cleanup  : missing ${script}`);
    return;
  }

  // Legacy: RUN("command.com /c ...\\DELFLECF.BAT", Minimized!)
  await new Promise<void>((resolve) => {
    const child = spawn(script, { shell: true, stdio: "ignore" });
    child.on("exit", (code) => {
      if (code !== 0) {
        console.warn("Warning!!! Couldn't Delete Old CDR/FCS Files");
      } else {
        console.log("  cleanup  : DELFLECF completed");
      }
      resolve();
    });
    child.on("error", () => {
      console.warn("Warning!!! Couldn't Delete Old CDR/FCS Files");
      resolve();
    });
  });
}
