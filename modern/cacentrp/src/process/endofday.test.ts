/**
 * Lightweight assertion script (no test runner required):
 *   npx tsx src/process/endofday.test.ts
 */
import { createStore, seedDemoLedger } from "./store.js";
import { runEndOfDay } from "./endofday.js";

function check(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

const store = createStore();
seedDemoLedger(store, 5);
check(store.currLedge.length === 5, "seed failed");

let r = runEndOfDay(store, { glWalkerDone: false, confirmArchive: true });
check(r.archived === 0, "should refuse without GL Walker");
check(store.currLedge.length === 5, "ledger should be untouched");

r = runEndOfDay(store, { glWalkerDone: true, confirmArchive: false });
check(r.archived === 0, "should cancel without confirm");

r = runEndOfDay(store, { glWalkerDone: true, confirmArchive: true });
check(r.archived === 5, `expected 5 archived, got ${r.archived}`);
check(store.currLedge.length === 0, "CURRLEDGE should be empty");
check(store.currLedgeX.length === 5, "CURRLEDGEX should hold archive");

const empty = runEndOfDay(store, { glWalkerDone: true, confirmArchive: true });
check(empty.message.includes("No transactions"), "empty ledger message");

console.log("endofday.test.ts: OK");
