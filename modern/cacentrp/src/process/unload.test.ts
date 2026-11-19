/**
 *   npx tsx src/process/unload.test.ts
 */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { demoBpyRows } from "./bpy.js";
import { demoGrpRows } from "./grp.js";
import { createStore } from "./store.js";
import { validateFoControl } from "./tranext.js";
import { detectInboundKind, runUnload } from "./unload.js";

function check(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

const HERE = dirname(fileURLToPath(import.meta.url));
const TRANEXT_FIXTURES = resolve(HERE, "../../fixtures/tranext");

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

// TRANEXT pack + FO_TCDBF control OK → FOCUS still maps
{
  const s = createStore();
  const r = runUnload(s, {
    userId: "DEMO",
    mapDownstream: true,
    tranextDir: TRANEXT_FIXTURES,
    tranextCompany: "ALAI",
    tranextFoCode: "106",
    messages: [
      {
        id: "t1",
        subject: "CAC-LSP File pack",
        senderEmail: "fo@example.com",
        dateReceived: "2026-11-13",
        attachments: [{ filename: "0806XXX.FCS", pathname: "C:\\IN\\0806XXX.FCS" }],
      },
    ],
    inbound: [],
  });
  check(r.tranextLoad?.ok === true, "tranext load ok");
  check(r.foControlOk === true, `foControlOk ${r.foControlOk}`);
  check(r.logs.some((l) => l.step === "fo-control" && l.ok), "fo-control log ok");
  check(r.mapped.focusRows > 0, "focus mapped after FO control OK");
}

// FO_TCDBF mismatch gates FOCUS mapping only (BPY still runs)
{
  const s = createStore();
  // Seed a bogus control row before unload so after real load ΣTC_COUNT is inflated
  s.foControl.push({
    tcName: "BOGUS",
    tcSize: 0,
    tcDate: "",
    tcTime: "",
    tcCount: 999,
    tcStatus: "X",
    tcModet: "",
    tcTrnDate: "",
    tcControl: 0,
    tcHash: 0,
    tcFile: 0,
  });
  const r = runUnload(s, {
    userId: "DEMO",
    mapDownstream: true,
    tranextDir: TRANEXT_FIXTURES,
    tranextCompany: "ALAI",
    tranextFoCode: "106",
    messages: [
      {
        id: "t2",
        subject: "CAC-LSP File pack",
        senderEmail: "fo@example.com",
        dateReceived: "2026-11-13",
        attachments: [{ filename: "0806XXX.FCS", pathname: "C:\\IN\\0806XXX.FCS" }],
      },
    ],
    inbound: [
      { path: "C:\\tci\\inbound\\0806BPY.DBF", kind: "BRS", rows: demoBpyRows() as unknown as Record<string, unknown>[] },
    ],
  });
  check(r.foControlOk === false, "foControlOk false on mismatch");
  check(r.logs.some((l) => l.step === "fo-control" && !l.ok), "fo-control fail log");
  check(r.mapped.focusRows === 0, "FOCUS gated on FO control fail");
  check(r.mapped.bpyRows > 0, "BPY still maps when FO control fails");
  check(!r.logs.some((l) => l.step === "map-focus"), "no map-focus when gated");
}

// Direct validateFoControl unit checks
{
  const s = createStore();
  const skip = validateFoControl(s, [{ code: "RA", ok: true, read: 1, written: 1, rejected: 0, detail: "x" }]);
  check(skip.ok && skip.detail.includes("skip"), "skip when no control");
  s.foControl.push({
    tcName: "RA",
    tcSize: 1,
    tcDate: "",
    tcTime: "",
    tcCount: 2,
    tcStatus: "",
    tcModet: "",
    tcTrnDate: "",
    tcControl: 0,
    tcHash: 7,
    tcFile: 0,
  });
  const bad = validateFoControl(s, [
    { code: "FO_TCDBF", ok: true, read: 1, written: 1, rejected: 0, detail: "c" },
    { code: "RA", ok: true, read: 1, written: 1, rejected: 0, detail: "r" },
  ]);
  check(!bad.ok && bad.expectedCount === 2 && bad.actualCount === 1, "Σ mismatch");
  const good = validateFoControl(s, [
    { code: "FO_TCDBF", ok: true, read: 1, written: 1, rejected: 0, detail: "c" },
    { code: "RA", ok: true, read: 2, written: 2, rejected: 0, detail: "r" },
  ]);
  check(good.ok && good.actualCount === 2, "Σ match");
}

console.log("unload.test.ts: OK");
