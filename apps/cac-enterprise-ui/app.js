const STAGES = [
  {
    id: "delflecf",
    title: "DELFLECF cleanup",
    eyebrow: "App open",
    desc: "Delete stale *.FC? / *.CDR temp attachments before mail unload.",
    run: (s) => {
      log(s, "info", "DELFLECF", "No matching temp files (sample)");
      return { ok: true };
    },
  },
  {
    id: "unload",
    title: "Auto Email Detach",
    eyebrow: "w_unload",
    desc: "MISCRENM, BDOXPMST resolve, classify FCS/CDR, plan TRANEXT writers.",
    run: (s) => {
      s.focusJobs = 1;
      s.cdrJobs = 1;
      s.bdo += 3;
      log(s, "ok", "mail", "CAC-LSP File → FOCUS 080 / CDR 080 (snt=ALAI/080)");
      log(s, "ok", "miscrenm", "renamed 1 *.TRN → *.DBF");
      log(s, "ok", "fo-control", "FO_TCDBF OK (ΣTC_COUNT=6)");
      return { ok: true };
    },
  },
  {
    id: "tranext",
    title: "TRANEXT load",
    eyebrow: "wf_write2*",
    desc: "ImportFile CS/DA/RA–VH into OR/DIS working tables; VD/VE → add/ded.",
    run: (s) => {
      log(s, "ok", "tranext", "Loaded RA/RB/RC/RE/CS/DA (+ VD/VE add-ded bridge)");
      return { ok: true };
    },
  },
  {
    id: "map",
    title: "Map to CURRLEDGE",
    eyebrow: "FOCUS · CDR · BPY · GRP",
    desc: "Stage pipelines write balanced CURRLEDGE rows for NLSP GLW.",
    run: (s) => {
      s.ledge += 48;
      s.bdo += 2;
      log(s, "ok", "map-focus", "Success.bat · 24 rows · BDO L");
      log(s, "ok", "map-cdr", "CACPAR01 balanced · 8 rows");
      log(s, "ok", "map-bpy", "BPYFILE → 8 rows");
      log(s, "ok", "map-grp", "GRPFILE → 8 rows");
      return { ok: true };
    },
  },
  {
    id: "lsp",
    title: "LSP upload",
    eyebrow: "optional",
    desc: "CURRLEDGE recDest=lsp → UN_mmdd.lsp. LSP merge into GLW uses GLWDTL.",
    run: (s) => {
      log(s, "info", "lspupload", "Sample: skipped (no lsp-dest rows)");
      return { ok: true };
    },
  },
  {
    id: "glwalker",
    title: "Create GLW File",
    eyebrow: "w_glwalker",
    desc: "Merge NLSP CURRLEDGE + LSP GLWDTL into mmddyy{H,A,P}.GLW.",
    run: (s) => {
      const stamp = mmddyy(new Date());
      s.glwFiles = [
        { company: "AHCI", name: `${stamp}H.GLW`, details: 12, headers: 2 },
        { company: "ALAI", name: `${stamp}A.GLW`, details: 28, headers: 3 },
        { company: "APLN", name: `${stamp}P.GLW`, details: 8, headers: 1 },
      ];
      s.glwDone = true;
      log(s, "ok", "glwalker", `Wrote ${s.glwFiles.map((f) => f.name).join(", ")}`);
      return { ok: true };
    },
  },
  {
    id: "eod",
    title: "End of Day",
    eyebrow: "w_endofday",
    desc: "Archive CURRLEDGE → CURRLEDGEX after GL Walker is confirmed.",
    run: (s) => {
      if (!s.glwDone) {
        log(s, "bad", "endofday", "Refused — run Create GLW File first");
        return { ok: false };
      }
      const archived = s.ledge;
      s.ledge = 0;
      log(s, "ok", "endofday", `Archived ${archived} CURRLEDGE row(s) → CURRLEDGEX`);
      return { ok: true };
    },
  },
];

const state = {
  variant: "ALAI",
  userId: "DEMO",
  cursor: 0,
  done: new Set(),
  running: null,
  ledge: 0,
  bdo: 0,
  focusJobs: 0,
  cdrJobs: 0,
  glwFiles: [],
  glwDone: false,
  logs: [],
};

function mmddyy(d) {
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(-2);
  return `${mm}${dd}${yy}`;
}

function $(id) {
  return document.getElementById(id);
}

function log(s, tone, step, detail) {
  s.logs.unshift({ tone, step, detail, at: new Date().toLocaleTimeString() });
}

function show(viewId) {
  for (const el of document.querySelectorAll(".view")) {
    el.hidden = el.id !== viewId;
    el.classList.toggle("is-active", el.id === viewId);
  }
}

function renderStages() {
  const list = $("stage-list");
  list.innerHTML = "";
  STAGES.forEach((stage, i) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "stage-item";
    if (state.done.has(stage.id)) btn.classList.add("is-done");
    if (i === state.cursor) btn.classList.add("is-current");
    if (state.running === stage.id) btn.classList.add("is-running");
    btn.innerHTML = `<span class="dot"></span><span><strong>${stage.title}</strong><span>${stage.eyebrow}</span></span>`;
    btn.addEventListener("click", () => {
      state.cursor = i;
      renderWorkspace();
      renderStages();
    });
    list.appendChild(btn);
  });
}

function renderWorkspace() {
  const stage = STAGES[state.cursor];
  $("ws-eyebrow").textContent = stage.eyebrow;
  $("ws-title").textContent = stage.title;
  $("ws-desc").textContent = stage.desc;
  $("session-meta").textContent = `${state.variant} · ${state.userId}`;
  $("stat-ledge").textContent = String(state.ledge);
  $("stat-bdo").textContent = String(state.bdo);
  $("stat-focus").textContent = String(state.focusJobs);
  $("stat-cdr").textContent = String(state.cdrJobs);

  const logEl = $("activity-log");
  logEl.innerHTML = "";
  for (const row of state.logs.slice(0, 40)) {
    const li = document.createElement("li");
    li.innerHTML = `<span class="${row.tone}">${row.tone.toUpperCase()}</span><div><strong>[${row.step}]</strong> ${row.detail}<div class="muted" style="font-size:0.75rem;margin-top:2px">${row.at}</div></div>`;
    logEl.appendChild(li);
  }
  if (!state.logs.length) {
    logEl.innerHTML = `<li><span class="info">READY</span><div>Run a pipeline step to simulate daily processing.</div></li>`;
  }

  const box = $("glw-box");
  const navGlw = document.querySelector('[data-panel="glw"]');
  if (state.glwFiles.length) {
    box.hidden = false;
    navGlw.disabled = false;
    $("glw-files").innerHTML = state.glwFiles
      .map(
        (f) =>
          `<li><span>${f.name}</span><em>${f.company} · ${f.details} dtl</em></li>`,
      )
      .join("");
  } else {
    box.hidden = true;
    navGlw.disabled = true;
  }

  const atEnd = state.cursor >= STAGES.length;
  $("btn-run-step").disabled = atEnd || state.running !== null;
  $("btn-run-all").disabled = state.glwDone || state.running !== null;
}

function renderGlwView() {
  const stamp = mmddyy(new Date());
  $("glw-day-title").textContent = `GLW pack · ${stamp}`;
  const cards = $("glw-cards");
  cards.innerHTML = state.glwFiles
    .map(
      (f) => `
      <article class="glw-card">
        <div class="co">${f.company}</div>
        <h3>${f.name}</h3>
        <p>${f.headers} header(s) · ${f.details} detail line(s)<br/>rectypes 00 → 01 → 02</p>
      </article>`,
    )
    .join("");
  $("glw-snippet").textContent = [
    "00CAC1" + stamp + "00030028...",
    "01CAC1" + stamp + "CAC" + stamp + "...",
    "02CAC1" + stamp + "CAC" + stamp + "0001 ALAI  101001...",
    "02CAC1" + stamp + "CAC" + stamp + "0002 ALAI  401001...",
    "…",
  ].join("\n");
  $("eod-msg").textContent = "";
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function runCurrentStep() {
  if (state.cursor >= STAGES.length || state.running) return;
  const stage = STAGES[state.cursor];
  state.running = stage.id;
  renderStages();
  renderWorkspace();
  await sleep(420);
  const result = stage.run(state);
  state.running = null;
  if (result.ok) {
    state.done.add(stage.id);
    if (state.cursor < STAGES.length - 1) state.cursor += 1;
  }
  renderStages();
  renderWorkspace();
  if (stage.id === "glwalker" && state.glwDone) {
    // soft prompt toward GLW console
  }
}

async function runThroughGlw() {
  while (state.cursor < STAGES.length && STAGES[state.cursor].id !== "eod") {
    const before = state.cursor;
    await runCurrentStep();
    if (state.cursor === before && !state.done.has(STAGES[before].id)) break;
    if (STAGES[before].id === "glwalker") break;
  }
}

function bind() {
  $("login-form").addEventListener("submit", (e) => {
    e.preventDefault();
    state.variant = $("variant").value;
    state.userId = $("userId").value.trim() || "DEMO";
    show("view-app");
    renderStages();
    renderWorkspace();
  });

  $("btn-signout").addEventListener("click", () => {
    Object.assign(state, {
      cursor: 0,
      done: new Set(),
      running: null,
      ledge: 0,
      bdo: 0,
      focusJobs: 0,
      cdrJobs: 0,
      glwFiles: [],
      glwDone: false,
      logs: [],
    });
    show("view-login");
  });

  $("btn-run-step").addEventListener("click", () => runCurrentStep());
  $("btn-run-all").addEventListener("click", () => runThroughGlw());
  $("btn-view-glw").addEventListener("click", () => {
    show("view-glw");
    renderGlwView();
  });
  document.querySelector('[data-panel="glw"]').addEventListener("click", () => {
    if (!state.glwDone) return;
    show("view-glw");
    renderGlwView();
  });
  document.querySelector('[data-panel="daily"]').addEventListener("click", () => {
    show("view-app");
    renderWorkspace();
  });
  $("btn-back-daily").addEventListener("click", () => {
    show("view-app");
    renderWorkspace();
  });
  $("btn-eod").addEventListener("click", async () => {
    state.cursor = STAGES.findIndex((s) => s.id === "eod");
    await runCurrentStep();
    $("eod-msg").textContent = state.done.has("eod")
      ? "End of day complete — ledger archived."
      : "End of day did not complete.";
    renderGlwView();
  });
}

bind();
