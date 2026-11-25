/** CAC UI — login → APLN *P.GLW only (concept UI for Java/ODBC runtime). */

const GLWALKER = "C:\\CACENT~~1\\GLWALKER";
const ADHOC = "I:\\adhoc";

const STAGES = [
  {
    id: "odbc-login",
    title: "ODBC connect",
    eyebrow: "Login",
    desc: "Connect CACDB / APMODDTA / RAWDATA and validate SYRUSERID (Java --db odbc).",
    run: (s) => {
      log(s, "ok", "odbc", `Connected profiles for ${s.variant}; user ${s.userId}`);
      log(s, "ok", "syruserid", "USERID validated");
      return { ok: true };
    },
  },
  {
    id: "prep-apln",
    title: "Prepare APLN CURRLEDGE",
    eyebrow: "Ledger",
    desc: "Stage NLSP CURRLEDGE rows for company APLN (feeds *P.GLW only).",
    run: (s) => {
      s.ledge = 8;
      log(s, "ok", "currledge", "APLN NLSP rows ready · 8 lines");
      return { ok: true };
    },
  },
  {
    id: "gen-pglw",
    title: "Generate *P.GLW",
    eyebrow: "w_glwalker",
    desc: "Write fixed-width mmddyyP.GLW (company APLANS) to GLWALKER folder.",
    run: (s) => {
      const stamp = mmddyy(new Date());
      const name = `${stamp}P.GLW`;
      s.pGlw = {
        company: "APLN",
        name,
        path: `${GLWALKER}\\${name}`,
        headers: 1,
        details: s.ledge || 8,
      };
      s.glwDone = true;
      log(s, "ok", "glwalker", `Wrote ${name} → ${GLWALKER}`);
      return { ok: true };
    },
  },
  {
    id: "publish",
    title: "Publish *P.GLW",
    eyebrow: "adhoc + backup",
    desc: `Copy *P.GLW to ${ADHOC}, then move original into GLWALKER\\backup_yyyymmdd\\.`,
    run: (s) => {
      if (!s.pGlw) {
        log(s, "bad", "publish", "Generate *P.GLW first");
        return { ok: false };
      }
      const ymd = yyyymmdd(new Date());
      const backupDir = `${GLWALKER}\\backup_${ymd}`;
      s.published = {
        copyTo: `${ADHOC}\\${s.pGlw.name}`,
        backupTo: `${backupDir}\\${s.pGlw.name}`,
      };
      log(s, "ok", "copy", `Copied → ${s.published.copyTo}`);
      log(s, "ok", "move", `Moved → ${s.published.backupTo}`);
      return { ok: true };
    },
  },
];

const state = {
  variant: "AP",
  dbMode: "odbc",
  userId: "DEMO",
  cursor: 0,
  done: new Set(),
  running: null,
  ledge: 0,
  pGlw: null,
  glwDone: false,
  published: null,
  logs: [],
};

function mmddyy(d) {
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(-2);
  return `${mm}${dd}${yy}`;
}

function yyyymmdd(d) {
  const y = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}${mm}${dd}`;
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

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("cac-theme", theme);
  $("btn-theme").textContent = theme === "dark" ? "Light" : "Dark";
  $("btn-theme").setAttribute("aria-label", theme === "dark" ? "Switch to light mode" : "Switch to dark mode");
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
  $("session-meta").textContent = `${state.variant} · ${state.userId} · ${state.dbMode.toUpperCase()}`;
  $("stat-ledge").textContent = String(state.ledge);
  $("stat-pglw").textContent = state.pGlw ? state.pGlw.name : "—";
  $("stat-pub").textContent = state.published ? "done" : "—";

  const logEl = $("activity-log");
  logEl.innerHTML = "";
  for (const row of state.logs.slice(0, 40)) {
    const li = document.createElement("li");
    li.innerHTML = `<span class="${row.tone}">${row.tone.toUpperCase()}</span><div><strong>[${row.step}]</strong> ${row.detail}<div class="muted" style="font-size:0.75rem;margin-top:2px">${row.at}</div></div>`;
    logEl.appendChild(li);
  }
  if (!state.logs.length) {
    logEl.innerHTML = `<li><span class="info">READY</span><div>Run steps from ODBC login through *P.GLW publish.</div></li>`;
  }

  const box = $("glw-box");
  const navGlw = document.querySelector('[data-panel="glw"]');
  if (state.pGlw) {
    box.hidden = false;
    navGlw.disabled = false;
    $("glw-files").innerHTML = `<li><span>${state.pGlw.name}</span><em>APLN · ${state.pGlw.details} dtl</em></li>`;
  } else {
    box.hidden = true;
    navGlw.disabled = true;
  }

  $("btn-run-step").disabled = state.cursor >= STAGES.length || state.running !== null;
  $("btn-run-all").disabled = state.glwDone || state.running !== null;
}

function renderGlwView() {
  const f = state.pGlw;
  $("glw-day-title").textContent = f ? f.name : "*P.GLW";
  $("glw-src-path").textContent = `${GLWALKER}\\`;
  const cards = $("glw-cards");
  if (!f) {
    cards.innerHTML = "";
    $("glw-snippet").textContent = "";
    return;
  }
  const stamp = mmddyy(new Date());
  cards.innerHTML = `
    <article class="glw-card">
      <div class="co">APLN</div>
      <h3>${f.name}</h3>
      <p>${f.headers} header(s) · ${f.details} detail line(s)<br/>company code APLANS · 00 → 01 → 02</p>
    </article>
    <article class="glw-card">
      <div class="co">Publish</div>
      <h3>I:\\adhoc</h3>
      <p>Copy file, then move source into<br/><code>backup_${yyyymmdd(new Date())}</code></p>
    </article>`;
  $("glw-snippet").textContent = [
    `00${pad("1", 12)}${pad(String(f.details), 12)}…`,
    `01CAC1${stamp}… APLANS …`,
    `02CAC1${stamp}CAC${stamp}0001 APLANS 101001…`,
    `02CAC1${stamp}CAC${stamp}0002 APLANS 401001…`,
    "…",
  ].join("\n");
  $("publish-msg").textContent = state.published
    ? `Copied to ${state.published.copyTo}; archived ${state.published.backupTo}`
    : "";
  $("btn-publish").disabled = !f;
}

function pad(s, n) {
  return String(s).padStart(n, "0");
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
  await sleep(380);
  const result = stage.run(state);
  state.running = null;
  if (result.ok) {
    state.done.add(stage.id);
    if (state.cursor < STAGES.length - 1) state.cursor += 1;
  }
  renderStages();
  renderWorkspace();
}

async function runThroughPglw() {
  while (state.cursor < STAGES.length) {
    const before = state.cursor;
    const id = STAGES[before].id;
    await runCurrentStep();
    if (state.cursor === before && !state.done.has(id)) break;
    if (id === "gen-pglw") break;
  }
}

function resetState() {
  Object.assign(state, {
    cursor: 0,
    done: new Set(),
    running: null,
    ledge: 0,
    pGlw: null,
    glwDone: false,
    published: null,
    logs: [],
  });
}

function bind() {
  const saved = localStorage.getItem("cac-theme") || "dark";
  applyTheme(saved);
  $("btn-theme").addEventListener("click", () => {
    const next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
    applyTheme(next);
  });

  $("login-form").addEventListener("submit", (e) => {
    e.preventDefault();
    state.variant = $("variant").value;
    state.dbMode = $("dbMode").value;
    state.userId = $("userId").value.trim() || "DEMO";
    resetState();
    show("view-app");
    renderStages();
    renderWorkspace();
  });

  $("btn-signout").addEventListener("click", () => {
    resetState();
    show("view-login");
  });

  $("btn-run-step").addEventListener("click", () => runCurrentStep());
  $("btn-run-all").addEventListener("click", () => runThroughPglw());
  $("btn-view-glw").addEventListener("click", () => {
    show("view-glw");
    renderGlwView();
  });
  document.querySelector('[data-panel="glw"]').addEventListener("click", () => {
    if (!state.glwDone) return;
    show("view-glw");
    renderGlwView();
  });
  document.querySelector('[data-panel="flow"]').addEventListener("click", () => {
    show("view-app");
    renderWorkspace();
  });
  $("btn-back-flow").addEventListener("click", () => {
    show("view-app");
    renderWorkspace();
  });
  $("btn-publish").addEventListener("click", async () => {
    state.cursor = STAGES.findIndex((s) => s.id === "publish");
    await runCurrentStep();
    renderGlwView();
  });
}

bind();
