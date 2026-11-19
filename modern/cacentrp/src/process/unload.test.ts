/**
 *   npx tsx src/process/unload.test.ts
 */
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { demoBpyRows } from "./bpy.js";
import { writeDbfFile } from "./dbf.js";
import { DEMO_BDOXPMST } from "./fixtures.js";
import { demoGrpRows } from "./grp.js";
import { renameTrnToDbf } from "./miscrenm.js";
import {
  feedbackFormName,
  letterMonth,
  runSendmail,
} from "./sendmail.js";
import { createStore } from "./store.js";
import { validateFoControl } from "./tranext.js";
import { detectInboundKind, mapMiscFileRow, runUnload } from "./unload.js";
import { readFileSync } from "node:fs";

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
check(result.logs.some((l) => l.step === "miscrenm" && l.detail.includes("skip")), "miscrenm skip without dir");

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

// mapMiscFileRow dtltype = iacttype + inortype
{
  const row = mapMiscFileRow(
    { IACTTYPE: "OR", INORTYPE: "CASH", INORNO: "X1", INPAMT: "50" },
    "20261119",
  );
  check(row.dtlType === "ORCASH", `dtl ${row.dtlType}`);
  check(row.inprdate === "20261119", "inprdate default");
}

// MISCRENM rename + inboundDir ImportFile → BPY map
{
  const dir = mkdtempSync(join(tmpdir(), "miscrenm-"));
  try {
    const fields = [
      { name: "ICDRCD", length: 3 },
      { name: "IPOLNO", length: 10 },
      { name: "INPLN", length: 15 },
      { name: "INPFN", length: 1 },
      { name: "INPMI", length: 1 },
      { name: "IACTTYPE", length: 2 },
      { name: "INORTYPE", length: 4 },
      { name: "IACTCD", length: 6 },
      { name: "INPSGN", length: 1 },
      { name: "INPAMT", length: 13 },
      { name: "INORNO", length: 7 },
      { name: "INDATE", length: 8 },
      { name: "INPSRC", length: 3 },
      { name: "INPENT", length: 10 },
      { name: "INPSTP", length: 2 },
      { name: "IAGTCD", length: 9 },
      { name: "INCVNO", length: 10 },
      { name: "INCKNO", length: 6 },
      { name: "DTLTYPE", length: 8 },
      { name: "INPRDATE", length: 8 },
    ];
    const bpyRecs = demoBpyRows().map((r) => ({
      ICDRCD: r.icdrcd,
      IPOLNO: r.ipolno,
      INPLN: r.inpln,
      INPFN: r.inpfn,
      INPMI: r.inpmi,
      IACTTYPE: r.iactType,
      INORTYPE: r.inorType,
      IACTCD: r.iactcd,
      INPSGN: r.inpsgn,
      INPAMT: String(r.inpamt),
      INORNO: r.inorno,
      INDATE: r.indate,
      INPSRC: r.inpsrc,
      INPENT: r.inpent,
      INPSTP: r.inpstp,
      IAGTCD: r.iagtcd,
      INCVNO: r.incvno,
      INCKNO: r.inckno,
      DTLTYPE: "", // force iact+inor rebuild
      INPRDATE: "",
    }));
    const trnPath = join(dir, "0806BPY.TRN");
    writeDbfFile(trnPath, fields, bpyRecs);
    check(existsSync(trnPath), "wrote TRN");

    const s = createStore();
    const r = runUnload(s, {
      userId: "DEMO",
      mapDownstream: true,
      inboundDir: dir,
      messages: [],
      inbound: [],
    });
    check(r.logs.some((l) => l.step === "miscrenm" && l.ok && l.detail.includes("renamed")), "miscrenm renamed");
    check(existsSync(join(dir, "0806BPY.DBF")), "DBF after unload MISCRENM");
    check(!existsSync(trnPath), "TRN removed by unload");
    check(r.brsFiles === 1, `brs ${r.brsFiles}`);
    check(s.bpyFileX.length === 2, `bpy archived ${s.bpyFileX.length}`);
    check(s.bpyFileX[0]!.dtlType === "ORCASH", `dtl from import ${s.bpyFileX[0]?.dtlType}`);
    check(r.mapped.bpyRows > 0, `bpy mapped from DBF ${r.mapped.bpyRows}`);
    check(r.logs.some((l) => l.step === "brs" && l.detail.includes("ImportFile")), "brs ImportFile log");

    // Direct rename helper still works on a fresh TRN
    writeDbfFile(join(dir, "0806GRP.TRN"), fields, bpyRecs);
    const ren = renameTrnToDbf(dir);
    check(ren.ok && ren.renames.some((x) => x.to.endsWith("0806GRP.DBF")), `direct rename ${ren.detail}`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

// Missing inbound dir is soft-ok
{
  const ren = renameTrnToDbf("/tmp/does-not-exist-miscrenm-xyz");
  check(ren.ok && ren.renames.length === 0, "missing dir skip");
}

// BDOXPMST resolve + wf_sendmail XT7 gate
{
  check(letterMonth("2026-11-19") === "K", "letter Nov=K");
  const form = feedbackFormName("2026-11-19");
  check(form === "26K19", `form ${form}`);

  const s = createStore({ bdoXpMst: DEMO_BDOXPMST });
  const out = mkdtempSync(join(tmpdir(), "sendmail-"));
  try {
    const r = runUnload(s, {
      userId: "DEMO",
      mapDownstream: false,
      sendFeedback: true,
      sendmail: {
        subjectR01: "CAC FO Feedback",
        xt7ByCompany: { ALAI: "Y", AP: "N" },
        outDir: out,
      },
      messages: [
        {
          id: "ok",
          subject: "CAC-LSP File 0806",
          senderEmail: "fo@example.com",
          dateReceived: "2026-11-13",
          attachments: [{ filename: "0806XXX.FCS", pathname: "C:\\IN\\0806XXX.FCS" }],
        },
        {
          id: "unknown",
          subject: "CAC-LSP File 0806",
          senderEmail: "stranger@example.com",
          dateReceived: "2026-11-13",
          attachments: [{ filename: "0806ZZZ.FCS", pathname: "C:\\IN\\0806ZZZ.FCS" }],
        },
        {
          id: "noatt",
          subject: "NO CAC-LSP File 11/13/2026",
          senderEmail: "fo@example.com",
          dateReceived: "2026-11-13",
          attachments: [],
        },
      ],
      inbound: [],
    });
    check(r.logs.some((l) => l.step === "mail-xp-skip"), "unknown email skipped");
    check(r.focusFiles === 1, "only known sender FOCUS");
    const noAtt = s.bdoApMst.find((b) => b.status === "*");
    check(!!noAtt && noAtt.company === "ALAI" && noAtt.bdoCode === "080", "no-att from XP");
    check(!!noAtt?.sntComp && noAtt.sntBdo === "080", "sntComp/sntBdo set");
    check(
      !!(r.sendmail && r.sendmail.plans.some((p) => p.sent && p.recipient === "fo@example.com")),
      "XT7 send planned",
    );
    const htm = r.sendmail?.plans.find((p) => p.htmlPath)?.htmlPath;
    check(!!htm && readFileSync(htm, "utf8").includes("CAC FO Feedback"), "HTML written");
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
}

// runSendmail excludes status=* and respects XT7≠Y
{
  const today = new Date().toISOString().slice(0, 10);
  const s = createStore({
    bdoXpMst: DEMO_BDOXPMST,
    bdoApMst: [
      {
        company: "ALAI",
        bdoCode: "080",
        source: "1",
        processDate: today,
        status: "*",
        subFile: "X",
        userId: "DEMO",
      },
      {
        company: "ALAI",
        bdoCode: "080",
        source: "1",
        processDate: today,
        status: "L",
        subFile: "0806XXX",
        userId: "DEMO",
      },
    ],
  });
  const blocked = runSendmail(s, {
    processDate: today,
    xt7ByCompany: { ALAI: "N" },
  });
  check(blocked.plans.length === 1, "one trio");
  check(!blocked.plans[0]!.sent, "XT7 N blocks send");
  check(blocked.plans[0]!.statusLines.length === 1, "excludes *");
}

console.log("unload.test.ts: OK");
