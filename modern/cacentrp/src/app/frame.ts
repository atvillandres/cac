/** Port of w_cac_frame metadata + ue_open session logging intent. */
import type { Session } from "../types.js";
import { formatMenu } from "./menu.js";

export function frameTitle(session: Session, version = "2.11"): string {
  // ALAI SOURCE: 'Centralized Accounting Channel - ALAI (' + userid + '), Version 2.11'
  const label = session.variant === "ALAI" ? "ALAI" : session.variant;
  return `Centralized Accounting Channel - ${label} (${session.userId}), Version ${version}`;
}

export function renderFrame(session: Session): string {
  return [
    "╔══════════════════════════════════════════════════════════════╗",
    `║ ${frameTitle(session).padEnd(60).slice(0, 60)} ║`,
    "╠══════════════════════════════════════════════════════════════╣",
    "║  MDI shell (legacy w_cac_frame) — menu recovered from        ║",
    "║  cac_menu.srm. Feature windows will be ported next.          ║",
    "╚══════════════════════════════════════════════════════════════╝",
    "",
    "Menu:",
    formatMenu(),
    "",
    `Session : ${session.sessionId}`,
    `Login   : ${session.loginAt.toISOString()}`,
  ].join("\n");
}
