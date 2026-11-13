/**
 *   npx tsx src/process/unload.test.ts
 */
import { demoBpyRows } from "./bpy.js";
import { demoGrpRows } from "./grp.js";
import { createStore } from "./store.js";
import { detectInboundKind, runUnload } from "./unload.js";

function check(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

check(detectInboundKind("C:\\tci\\inbound\\0806BPY.DBF") === "BRS", "bpy kind");
check(detectInboundKind("0806GRP.DBF") === "SSI", "grp kind");

const store = createStore();
const result = runUnload(store, {
  userId: "DEMO",
  mapDownstream: true,
  messages: [
    {
      id: "1",
      subject: "CAC-LSP File 0806",
      senderEmail: "fo@example.com",
      dateReceived: "2026-11-13",
      attachments: [
        { filename: "0806XXX.FCS", pathname: "C:\\IN\\0806XXX.FCS" },
        { filename: "0806YYY.CDR", pathname: "C:\\IN\\0806YYY.CDR" },
      ],
    },
  ],
  inbound: [
    { path: "C:\\tci\\inbound\\0806BPY.DBF", kind: "BRS", rows: demoBpyRows() as unknown as Record<string, unknown>[] },
    { path: "C:\\tci\\inbound\\0806GRP.DBF", kind: "SSI", rows: demoGrpRows() as unknown as Record<string, unknown>[] },
  ],
});

check(result.focusFiles === 1, `focus ${result.focusFiles}`);
check(result.cdrFiles === 1, `cdr ${result.cdrFiles}`);
check(result.brsFiles === 1 && result.ssiFiles === 1, "inbound counts");
check(result.tranextPlan.includes("RA") && result.tranextPlan.includes("APTRANS"), "tranext plan");
check(result.mapped.focusRows > 0, `focus mapped ${result.mapped.focusRows}`);
check(result.mapped.cdrRows > 0, `cdr mapped ${result.mapped.cdrRows}`);
check(result.mapped.bpyRows > 0, `bpy mapped ${result.mapped.bpyRows}`);
check(result.mapped.grpRows > 0, `grp mapped ${result.mapped.grpRows}`);
check(store.currLedge.length > 0, "currledge filled");
check(result.logs.some((l) => l.step === "map-focus"), "map-focus log");
check(result.logs.some((l) => l.step === "tranext-plan"), "tranext log");

console.log("unload.test.ts: OK");
