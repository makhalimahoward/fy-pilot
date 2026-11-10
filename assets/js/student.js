// ========== 1.0 Elements and State ==========
const {
  sb,
  esc,
  run,
  formatDate,
  todayISO,
  daysBetween,
  milestoneStatus,
  statusStyle,
  progressOf,
  showToast,
  errText,
} = FYP;

const root = document.documentElement;
const themeToggle = document.getElementById("themeToggle");
const navButtons = document.querySelectorAll(".nav-btn[data-section]");
const views = document.querySelectorAll(".view");
const pageTitle = document.getElementById("pageTitle");
const fabBtn = document.getElementById("fabBtn");
const fabPanel = document.getElementById("fabPanel");
const fileInput = document.getElementById("fileInput");

const TITLES = {
  dashboard: "Dashboard",
  topics: "Topics",
  project: "Project",
  milestones: "Milestones",
  feedback: "Feedback",
  documents: "Documents",
};

const state = {
  me: null,
  project: null,
  milestones: [],
  sessions: [],
  docs: [],
  topics: [],
  picks: [],
};
let reloadBell = null;

// ========== 2.0 Section Switching ==========
function showSection(name) {
  if (!document.getElementById(name)) name = "dashboard";
  views.forEach((v) => v.classList.toggle("active", v.id === name));
  navButtons.forEach((b) =>
    b.classList.toggle("active", b.dataset.section === name),
  );
  pageTitle.textContent = TITLES[name];
  document.getElementById("notifPanel").classList.remove("open");
  window.scrollTo({ top: 0, behavior: "smooth" });
  history.replaceState(null, "", "#" + name);
}

// ========== 3.0 Loading ==========
async function loadAll() {
  const project = await run(
    sb
      .from("projects")
      .select(
        "id, title, description, allocated_at, supervisor_id, supervisor:profiles!projects_supervisor_id_fkey(full_name)",
      )
      .eq("student_id", state.me.id)
      .maybeSingle(),
  );
  state.project = project;

  if (project) {
    const [milestones, sessions, docs] = await Promise.all([
      run(
        sb
          .from("milestones")
          .select("id, position, title, due_date, status, completed_at")
          .eq("project_id", project.id)
          .order("position"),
      ),
      run(
        sb
          .from("sessions")
          .select(
            "id, session_date, notes, feedback, action_items(id, text, due_date, done)",
          )
          .eq("project_id", project.id)
          .order("session_date", { ascending: false }),
      ),
      run(
        sb
          .from("documents")
          .select(
            "id, name, version, storage_path, status, reviewer_comment, created_at",
          )
          .eq("project_id", project.id)
          .order("created_at", { ascending: false }),
      ),
    ]);
    state.milestones = milestones;
    state.sessions = sessions;
    state.docs = docs;
    state.topics = [];
    state.picks = [];
  } else {
    state.milestones = [];
    state.sessions = [];
    state.docs = [];
    const [topics, picks] = await Promise.all([
      run(
        sb
          .from("topics")
          .select(
            "id, title, description, supervisor:profiles!topics_supervisor_id_fkey(full_name)",
          )
          .eq("status", "open")
          .order("created_at", { ascending: false }),
      ),
      run(
        sb
          .from("topic_picks")
          .select(
            "id, topic_id, status, note, picked_at, topic:topics!topic_picks_topic_id_fkey(title)",
          )
          .eq("student_id", state.me.id)
          .order("picked_at", { ascending: false }),
      ),
    ]);
    state.topics = topics;
    state.picks = picks;
  }
  renderAll();
}

function renderAll() {
  renderHome();
  renderTopics();
  renderProject();
  renderMilestones();
  renderFeedback();
  renderDocuments();
}

// Message shown on pages that need a project when the student has none yet
function noProject(
  text = "You do not have a project yet. Pick a topic and the coordinator will allocate it.",
) {
  return `<p class="empty-note">${esc(text)} <button class="link-btn" data-go="topics">Open topics</button></p>`;
}

// ========== 4.0 Home ==========
function nextMilestone() {
  return state.milestones.find((m) => m.status !== "done") || null;
}

function dueText(m) {
  const left = daysBetween(todayISO(), m.due_date);
  if (left < 0)
    return `Due ${formatDate(m.due_date)} · ${-left} day${left === -1 ? "" : "s"} overdue`;
  if (left === 0) return `Due today · ${formatDate(m.due_date)}`;
  return `Due ${formatDate(m.due_date)} · ${left} day${left === 1 ? "" : "s"} left`;
}

function openActions() {
  return state.sessions.flatMap((s) =>
    s.action_items
      .filter((a) => !a.done)
      .map((a) => ({ ...a, session_date: s.session_date })),
  );
}

function renderHome() {
  const first = (state.me.full_name || "").split(/\s+/)[0] || "there";
  const banner = document.getElementById("banner");
  const stats = document.getElementById("homeStats");
  const work = document.getElementById("workList");
  const latest = document.getElementById("latestFeedback");

  if (!state.project) {
    const pending = state.picks.find((p) => p.status === "pending");
    banner.innerHTML = `
      <div class="slide active">
        <div class="slide-text">
          <p class="eyebrow">Hi, ${esc(first)}</p>
          <h3>${pending ? "Your topic pick is waiting" : "Choose your project topic"}</h3>
          <p>${pending ? "The coordinator allocates picks in the order they came in." : "Pick one of the topics your supervisors have posted."}</p>
          <button class="banner-btn" data-go="topics">Open topics <i class="ri-arrow-right-line"></i></button>
        </div>
        <div class="slide-visual"><i class="ri-lightbulb-line"></i></div>
      </div>`;
    stats.innerHTML = "";
    work.innerHTML = "";
    latest.innerHTML = "";
    stopSlides();
    return;
  }

  const next = nextMilestone();
  const done = state.milestones.filter((m) => m.status === "done").length;
  const pct = progressOf(state.milestones);
  const overdue = state.milestones.filter(
    (m) => milestoneStatus(m) === "overdue",
  );
  const lastNote = state.sessions.find((s) => s.feedback || s.notes);
  const sup = state.project.supervisor
    ? state.project.supervisor.full_name
    : "Your supervisor";

  banner.innerHTML = `
    <div class="slide active">
      <div class="slide-text">
        <p class="eyebrow">Hi, ${esc(first)}</p>
        <h3>${next ? "Next up: " + esc(next.title) : "Every milestone is complete"}</h3>
        <p>${next ? esc(dueText(next)) : "Well done. Your supervisor will confirm the final submission."}</p>
        <button class="banner-btn" data-go="milestones">View milestones <i class="ri-arrow-right-line"></i></button>
      </div>
      <div class="slide-visual"><i class="ri-time-line"></i></div>
    </div>
    <div class="slide">
      <div class="slide-text">
        <p class="eyebrow">Your progress</p>
        <h3>${pct}% complete</h3>
        <p>${done} of ${state.milestones.length} milestones are done.</p>
        <button class="banner-btn" data-go="milestones">See milestones <i class="ri-arrow-right-line"></i></button>
      </div>
      <div class="slide-visual"><i class="ri-line-chart-line"></i></div>
    </div>
    <div class="slide">
      <div class="slide-text">
        <p class="eyebrow">${lastNote ? "New feedback" : "Feedback"}</p>
        <h3>${lastNote ? esc(sup) + " left a note" : "No feedback yet"}</h3>
        <p>${lastNote ? esc((lastNote.feedback || lastNote.notes).slice(0, 110)) : "Feedback from your sessions will appear here."}</p>
        <button class="banner-btn" data-go="feedback">Read feedback <i class="ri-arrow-right-line"></i></button>
      </div>
      <div class="slide-visual"><i class="ri-chat-quote-line"></i></div>
    </div>
    <div class="dots">
      <button class="dot-btn active" data-slide="0" aria-label="Slide 1"></button>
      <button class="dot-btn" data-slide="1" aria-label="Slide 2"></button>
      <button class="dot-btn" data-slide="2" aria-label="Slide 3"></button>
    </div>`;
  startSlides();

  stats.innerHTML = `
    <div class="stat primary"><i class="ri-line-chart-line neu neu-circle"></i><div><strong>${pct}%</strong><span>Progress · ${done} of ${state.milestones.length}</span></div></div>
    <div class="stat accent"><i class="ri-calendar-event-line neu neu-circle"></i><div><strong>${next ? esc(formatDate(next.due_date).replace(/ \d{4}$/, "")) : "None"}</strong><span>Next deadline</span></div></div>
    <div class="stat light"><i class="ri-error-warning-line neu neu-circle"></i><div><strong>${overdue.length}</strong><span>Overdue milestone${overdue.length === 1 ? "" : "s"}</span></div></div>
    <div class="stat glass"><i class="ri-user-star-line neu neu-circle"></i><div><strong>${esc(sup)}</strong><span>Supervisor</span></div></div>`;

  // Work list: overdue and soon milestones first, then open actions
  const items = [];
  state.milestones.forEach((m) => {
    const st = milestoneStatus(m);
    if (st === "overdue" || st === "soon")
      items.push({
        icon: "ri-flag-line",
        primary: st === "overdue",
        title: m.title,
        note: `Due ${formatDate(m.due_date)}`,
        tag: st,
        label: st === "overdue" ? "Overdue" : "Due soon",
        go: "milestones",
      });
  });
  openActions().forEach((a) =>
    items.push({
      icon: "ri-checkbox-circle-line",
      title: a.text,
      note: `Action from ${formatDate(a.session_date)}${a.due_date ? " · due " + formatDate(a.due_date) : ""}`,
      tag: "soon",
      label: "Action",
      go: "feedback",
    }),
  );
  work.innerHTML = items.length
    ? items
        .slice(0, 6)
        .map(
          (i) => `
      <li class="work-card">
        <span class="thumb ${i.primary ? "primary" : ""}"><i class="${i.icon}"></i></span>
        <div class="work-main"><a class="work-title">${esc(i.title)}</a><small>${esc(i.note)}</small></div>
        <span class="tag ${i.tag}">${i.label}</span>
        <button class="link-btn" data-go="${i.go}">Open</button>
      </li>`,
        )
        .join("")
    : `<li class="work-card"><div class="work-main"><small>Nothing needs your attention right now.</small></div></li>`;

  latest.innerHTML = lastNote
    ? `<div class="feedback-card"><p>${esc(lastNote.feedback || lastNote.notes)}</p><footer>${esc(sup)} · ${esc(formatDate(lastNote.session_date))}</footer><button class="link-btn" data-go="feedback">Read all feedback</button></div>`
    : `<p class="empty-note">No feedback yet.</p>`;
}

// ========== 5.0 Topics ==========
function renderTopics() {
  const lead = document.getElementById("topicsLead");
  const picksBox = document.getElementById("myPicks");
  const rows = document.getElementById("topicRows");

  if (state.project) {
    lead.textContent =
      "You already have a project, so topic picking is closed.";
    picksBox.innerHTML = `<p class="empty-note"><strong>${esc(state.project.title)}</strong></p>`;
    rows.innerHTML = "";
    return;
  }

  const pending = state.picks.find((p) => p.status === "pending");
  lead.textContent = pending
    ? "You have one pick waiting. Withdraw it if you want to choose a different topic."
    : "Pick one topic. Picks are allocated in the order they are made, and a supervisor can take only 8 students.";

  const history = state.picks.filter((p) => p.status !== "allocated");
  picksBox.innerHTML = history.length
    ? `<p class="section-label">Your picks</p><ul class="rows">${history
        .map(
          (p) => `
        <li class="row static">
          <div class="main"><strong>${esc(p.topic ? p.topic.title : "Topic pick")}</strong>
            <small>Picked ${esc(formatDate(p.picked_at))}${p.note ? " · " + esc(p.note) : ""}</small></div>
          ${
            p.status === "pending"
              ? `<span class="tag soon">Waiting</span><button class="link-btn danger" data-withdraw="${p.id}">Withdraw</button>`
              : `<span class="tag attention">Not allocated</span>`
          }
        </li>`,
        )
        .join("")}</ul>`
    : "";

  rows.innerHTML = state.topics.length
    ? state.topics
        .map(
          (t) => `
      <li class="row static">
        <div class="main topic-card"><strong>${esc(t.title)}</strong>
          <small>${esc(t.supervisor ? t.supervisor.full_name : "Supervisor")}${t.description ? " · " + esc(t.description) : ""}</small></div>
        <button class="btn btn-primary btn-small" data-pick="${t.id}" ${pending ? "disabled" : ""}>Pick</button>
      </li>`,
        )
        .join("")
    : `<li class="row static"><div class="main"><small>No topics are open yet. Check back soon.</small></div></li>`;
}

async function pickTopic(topicId, button) {
  button.disabled = true;
  try {
    await run(
      sb
        .from("topic_picks")
        .insert({
          student_id: state.me.id,
          topic_id: topicId,
          status: "pending",
        }),
    );
    showToast("Topic picked. You are in the queue");
    await loadAll();
  } catch (e) {
    showToast(errText(e));
    button.disabled = false;
  }
}

async function withdrawPick(id) {
  try {
    await run(sb.from("topic_picks").delete().eq("id", id));
    showToast("Pick withdrawn");
    await loadAll();
  } catch (e) {
    showToast(errText(e));
  }
}

// ========== 6.0 Project ==========
function renderProject() {
  const box = document.getElementById("projectBody");
  if (!state.project) return void (box.innerHTML = noProject());
  const p = state.project;
  const next = nextMilestone();
  const last = state.milestones[state.milestones.length - 1];
  let currentSet = false;

  const steps = state.milestones
    .map((m) => {
      let cls = "";
      let icon = "";
      if (m.status === "done") {
        cls = "done";
        icon = `<i class="ri-check-line"></i>`;
      } else if (!currentSet) {
        cls = "current";
        icon = `<i class="ri-time-line"></i>`;
        currentSet = true;
      }
      return `<li class="step ${cls}"><span class="node">${icon}</span><span class="step-label">${esc(m.title)}</span></li>`;
    })
    .join("");

  box.innerHTML = `
    <div class="project-head">
      <h3 class="page-title">${esc(p.title)}</h3>
      <p class="lead">${esc(p.description || "No description yet.")}</p>
    </div>
    <div class="facts">
      <div><span>Supervisor</span><strong>${esc(p.supervisor ? p.supervisor.full_name : "")}</strong></div>
      <div><span>Started</span><strong>${esc(formatDate(p.allocated_at))}</strong></div>
      <div><span>Final submission</span><strong>${last ? esc(formatDate(last.due_date)) : ""}</strong></div>
    </div>
    <h4 class="block-title">Stage</h4>
    <ol class="stepper">${steps}</ol>`;
}

// ========== 7.0 Milestones ==========
function renderMilestones() {
  const box = document.getElementById("milestoneBody");
  if (!state.project) return void (box.innerHTML = noProject());
  const done = state.milestones.filter((m) => m.status === "done").length;
  const next = nextMilestone();

  box.innerHTML = `
    <div class="milestone-summary">
      <div class="ring" style="--glow: 0 153 230;"><span class="ring-value">${progressOf(state.milestones)}<small>%</small></span></div>
      <div class="summary-text">
        <h3 class="page-title">Milestones</h3>
        <p class="lead">${done} of ${state.milestones.length} complete${next ? " · next due " + esc(formatDate(next.due_date)) : ""}</p>
      </div>
    </div>
    <ul class="milestone-list">${state.milestones
      .map((m) => {
        const st = statusStyle(milestoneStatus(m));
        return `
      <li class="mrow">
        <span class="progress-ring" style="--pct: ${st.pct}; --ring-c: ${st.ring}; --ink: ${st.ink};"><i class="${st.icon}"></i></span>
        <div class="main"><strong>${esc(m.title)}</strong><small>Due ${esc(formatDate(m.due_date))}</small></div>
        <span class="tag ${st.tag}">${st.label}</span>
        ${m.status === "done" ? "" : `<button class="link-btn" data-go="documents">Upload</button>`}
      </li>`;
      })
      .join("")}</ul>`;
}

// ========== 8.0 Feedback ==========
function renderFeedback() {
  const box = document.getElementById("feedbackBody");
  if (!state.project) return void (box.innerHTML = noProject());
  const open = openActions().length;
  const sup = state.project.supervisor
    ? state.project.supervisor.full_name
    : "Supervisor";

  box.innerHTML = `
    <div class="thread-head">
      <h3 class="page-title">Feedback</h3>
      <p class="lead">${esc(sup)} · <span id="openCount">${open === 1 ? "1 open action" : open + " open actions"}</span></p>
    </div>
    <div class="thread">${
      state.sessions.length
        ? state.sessions
            .map(
              (s) => `
      <div class="day-divider"><span>${esc(formatDate(s.session_date))}</span></div>
      <div class="msg">
        <div class="msg-avatar">${esc(FYP.initials(sup))}</div>
        <div class="msg-body">
          ${s.notes ? `<div class="bubble">${esc(s.notes)}</div>` : ""}
          ${s.feedback ? `<div class="bubble">${esc(s.feedback)}</div>` : ""}
          ${
            s.action_items.length
              ? `<div class="actions-card">${s.action_items
                  .map(
                    (a) => `
            <button class="act ${a.done ? "done" : "open"}" type="button" aria-pressed="${a.done}" data-act="${a.id}" data-due="${a.due_date ? "Due " + esc(formatDate(a.due_date)) : "No due date"}">
              <i class="${a.done ? "ri-checkbox-circle-fill" : "ri-checkbox-blank-circle-line"}"></i>
              <span class="act-text">${esc(a.text)}</span>
              <small>${a.done ? "Done" : a.due_date ? "Due " + esc(formatDate(a.due_date)) : "No due date"}</small>
            </button>`,
                  )
                  .join("")}</div>`
              : ""
          }
        </div>
      </div>`,
            )
            .join("")
        : `<p class="empty-note">No feedback yet. Your supervisor's notes appear here after each session.</p>`
    }
    </div>
    <p class="thread-note"><i class="ri-lock-line"></i> Supervisor notes are read-only. Tick an action when it is done.</p>`;
}

async function toggleAction(btn) {
  const wasDone = btn.classList.contains("done");
  btn.disabled = true;
  try {
    await run(
      sb.rpc("toggle_action_item", {
        p_item: btn.dataset.act,
        p_done: !wasDone,
      }),
    );
    state.sessions.forEach((s) =>
      s.action_items.forEach((a) => {
        if (a.id === btn.dataset.act) a.done = !wasDone;
      }),
    );
    renderFeedback();
    renderHome();
  } catch (e) {
    btn.disabled = false;
    showToast(errText(e));
  }
}

// ========== 9.0 Documents ==========
function docTag(status) {
  if (status === "approved") return `<span class="tag done">Approved</span>`;
  if (status === "changes")
    return `<span class="tag soon">Changes requested</span>`;
  return `<span class="tag upcoming">Pending review</span>`;
}

function renderDocuments() {
  const grid = document.getElementById("docGrid");
  if (!state.project) return void (grid.innerHTML = noProject());

  grid.innerHTML =
    `
    <button class="doc-new" id="uploadBtn">
      <span class="doc-new-plus neu neu-circle"><i class="ri-add-line"></i></span>
      <span class="doc-new-text">Upload new version</span>
    </button>` +
    state.docs
      .map((d) => {
        const ext = (d.name.split(".").pop() || "FILE")
          .slice(0, 4)
          .toUpperCase();
        return `
      <article class="doc-card" data-open-file="${esc(d.storage_path)}">
        <div class="doc-thumb">
          <span class="type-badge">${esc(ext)}</span>
          <div class="page"><span class="line w80"></span><span class="line w60"></span><span class="line w90"></span><span class="line w70"></span></div>
        </div>
        <div class="doc-meta">
          <div class="doc-text"><strong>${esc(d.name)}</strong><small>Version ${d.version} · ${esc(formatDate(d.created_at))}</small></div>
        </div>
        <div class="doc-foot">${docTag(d.status)}</div>
        ${d.status === "changes" && d.reviewer_comment ? `<div class="reviewer-note">${esc(d.reviewer_comment)}</div>` : ""}
      </article>`;
      })
      .join("");
}

async function uploadFile(file) {
  if (!file || !state.project) return;
  if (file.size > 20 * 1024 * 1024)
    return showToast("Files can be at most 20 MB");
  const safe = file.name.replace(/[^\w.\-]+/g, "_");
  const path = `${state.project.id}/${Date.now()}-${safe}`;
  showToast("Uploading…");
  try {
    const up = await sb.storage
      .from("documents")
      .upload(path, file, {
        upsert: false,
        contentType: file.type || undefined,
      });
    if (up.error) throw up.error;
    const { error } = await sb
      .from("documents")
      .insert({
        project_id: state.project.id,
        name: file.name,
        storage_path: path,
      });
    if (error) {
      await sb.storage.from("documents").remove([path]);
      throw error;
    }
    showToast("Uploaded. Your supervisor has been notified");
    await loadAll();
  } catch (e) {
    showToast(errText(e));
  }
}

// ========== 10.0 Banner Carousel ==========
let slideIndex = 0;
let slideTimer;

function showSlide(index) {
  const slides = document.querySelectorAll("#banner .slide");
  const dots = document.querySelectorAll("#banner .dot-btn");
  if (!slides.length) return;
  slideIndex = (index + slides.length) % slides.length;
  slides.forEach((s, i) => s.classList.toggle("active", i === slideIndex));
  dots.forEach((d, i) => d.classList.toggle("active", i === slideIndex));
}
function startSlides() {
  clearInterval(slideTimer);
  slideIndex = 0;
  slideTimer = setInterval(() => showSlide(slideIndex + 1), 6000);
}
function stopSlides() {
  clearInterval(slideTimer);
}

// ========== 11.0 Event Wiring ==========
// One listener handles every button the pages render
document.addEventListener("click", (e) => {
  const go = e.target.closest("[data-go]");
  if (go) return showSection(go.dataset.go);
  const dot = e.target.closest(".dot-btn");
  if (dot) {
    showSlide(Number(dot.dataset.slide));
    return startSlides();
  }
  const pick = e.target.closest("[data-pick]");
  if (pick) return pickTopic(pick.dataset.pick, pick);
  const wd = e.target.closest("[data-withdraw]");
  if (wd) return withdrawPick(wd.dataset.withdraw);
  const act = e.target.closest("[data-act]");
  if (act) return toggleAction(act);
  if (e.target.closest("#uploadBtn")) return fileInput.click();
  const doc = e.target.closest("[data-open-file]");
  if (doc) return FYP.openStoredFile(doc.dataset.openFile);
});

themeToggle.addEventListener("click", () => FYP.toggleTheme(root, themeToggle));
if (root.getAttribute("data-theme") === "dark")
  themeToggle.querySelector("i").className = "ri-sun-line";
navButtons.forEach((btn) =>
  btn.addEventListener("click", () => showSection(btn.dataset.section)),
);
fabBtn.addEventListener("click", () => fabPanel.classList.toggle("open"));
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    document.getElementById("notifPanel").classList.remove("open");
    fabPanel.classList.remove("open");
  }
});
fileInput.addEventListener("change", () => {
  uploadFile(fileInput.files[0]);
  fileInput.value = "";
});
document.getElementById("logoutBtn").addEventListener("click", FYP.signOut);

// ========== 12.0 Start ==========
(async function start() {
  const me = await FYP.requireProfile("student");
  if (!me) return;
  state.me = me;
  document.getElementById("todayLine").textContent =
    `${me.full_name} · ${FYP.longToday()}`;
  reloadBell = await FYP.setupBell({
    bellBtn: document.getElementById("bellBtn"),
    panel: document.getElementById("notifPanel"),
    badge: document.getElementById("bellBadge"),
  });
  try {
    await loadAll();
  } catch (e) {
    showToast(errText(e));
  }
  const hash = location.hash.replace("#", "");
  showSection(hash || (state.project ? "dashboard" : "topics"));
})();
