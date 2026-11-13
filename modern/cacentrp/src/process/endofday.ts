/**
 * Port of w_endofday cb_start — archive today's CURRLEDGE into CURRLEDGEX.
 */
import type { DailyStore } from "./store.js";

export interface EndOfDayOptions {
  /** Legacy prompts: confirm GL Walker already run. */
  glWalkerDone: boolean;
  /** Legacy prompts: confirm archive. */
  confirmArchive: boolean;
}

export interface EndOfDayResult {
  archived: number;
  message: string;
}

export function runEndOfDay(store: DailyStore, opts: EndOfDayOptions): EndOfDayResult {
  const total = store.currLedge.length;
  if (total <= 0) {
    return { archived: 0, message: "No transactions to process" };
  }
  if (!opts.glWalkerDone) {
    return {
      archived: 0,
      message: "Please run the GL Walker Interface first before proceeding!",
    };
  }
  if (!opts.confirmArchive) {
    return { archived: 0, message: "End of day cancelled" };
  }

  // INSERT INTO CURRLEDGEX SELECT * FROM CURRLEDGE;
  store.currLedgeX.push(...store.currLedge.map((r) => ({ ...r })));
  // DELETE FROM CURRLEDGE;
  const archived = store.currLedge.length;
  store.currLedge.length = 0;
  // COMMIT;
  return {
    archived,
    message: `Archived ${archived} CURRLEDGE row(s) into CURRLEDGEX`,
  };
}
