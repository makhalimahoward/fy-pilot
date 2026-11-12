// ========== 1.0 Elements ==========
const root = document.documentElement;
const themeToggle = document.getElementById("themeToggle");
const navButtons = document.querySelectorAll(".nav-btn[data-section]");
const views = document.querySelectorAll(".view");
const pageTitle = document.getElementById("pageTitle");
const todayLine = document.getElementById("todayLine");
const bellBtn = document.getElementById("bellBtn");
const notifPanel = document.getElementById("notifPanel");
const bellBadge = document.getElementById("bellBadge");
const fabBtn = document.getElementById("fabBtn");
const fabPanel = document.getElementById("fabPanel");
const logoutBtn = document.getElementById("logoutBtn");
const slides = document.querySelectorAll("#banner .slide");
const slideDots = document.querySelectorAll("#banner .dot-btn");
const overviewStats = document.getElementById("overviewStats");
const workList = document.getElementById("workList");
const latestFeedback = document.getElementById("latestFeedback");
const projectBody = document.getElementById("projectBody");
const milestoneBody = document.getElementById("milestoneBody");
const feedbackBody = document.getElementById("feedbackBody");
const docGrid = document.getElementById("docGrid");

const TITLES = {
  dashboard: "Dashboard",
  project: "Project",
  milestones: "Milestones",
  feedback: "Feedback",
  documents: "Documents",
};

let data = null; // this student's project, milestones, sessions and documents. Null until a project exists
let slideIndex = 0;
let slideTimer = null;

// ========== 2.0 Helpers ==========
function short(iso) {
  return FYP.formatDate(iso);
}

function plural(n, word) {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

function truncate(text, max) {
  return text.length > max ? text.slice(0, max).trimEnd() + "…" : text;
}

// Status comes from the due date, so a late milestone is overdue as soon as its date passes
function status(m) {
  return FYP.milestoneStatus(m);
}

// ========== 3.0 Loading ==========
// Reads everything for this student in one go. Row-level security limits it to their own records
async function loadData() {
  const profile = await FYP.requireProfile("student");
  if (!profile) return null;

  const project = (
    await FYP.run(
      FYP.sb
        .from("projects")
        .select(
          "id, title, description, allocated_at, supervisor:profiles!supervisor_id(full_name)",
        )
        .eq("student_id", profile.id)
        .limit(1),
    )
  )[0];
  if (!project) return null;

  const [milestones, sessions, documents] = await Promise.all([
    FYP.run(
      FYP.sb
        .from("milestones")
        .select("id, position, title, due_date, status, completed_at")
        .eq("project_id", project.id)
        .order("position"),
    ),
    FYP.run(
      FYP.sb
        .from("sessions")
        .select(
          "id, session_date, notes, feedback, action_items(id, text, due_date, done)",
        )
        .eq("project_id", project.id)
        .order("session_date", { ascending: false }),
    ),
    FYP.run(
      FYP.sb
        .from("documents")
        .select("id, name, version, status, reviewer_comment, created_at")
        .eq("project_id", project.id)
        .order("created_at", { ascending: false }),
    ),
  ]);

  return { profile, project, milestones, sessions, documents };
}

// Figures used across the page, worked out once from the loaded data
function summary() {
  const ms = data.milestones;
  const done = ms.filter((m) => status(m) === "done").length;
  const total = ms.length;
  const sessions = data.sessions;
  return {
    done,
    total,
    pct: total ? Math.round((100 * done) / total) : 0,
    overdue: ms.filter((m) => status(m) === "overdue"),
    next: ms.find((m) => status(m) !== "done") || null,
    latest: sessions[0] || null,
    openActions: sessions.flatMap((s) =>
      (s.action_items || [])
        .filter((a) => !a.done)
        .map((a) => ({ ...a, session: s })),
    ),
    supervisor: data.project.supervisor
      ? data.project.supervisor.full_name
      : "Not assigned yet",
  };
}

// ========== 4.0 Dashboard ==========
function renderBanner(s) {
  const daysLeft = s.next
    ? FYP.daysBetween(FYP.todayISO(), s.next.due_date)
    : 0;
  const latestFeedback = s.latest && s.latest.feedback;
  const cards = [
    {
      eyebrow: "Next up",
      title: s.next ? s.next.title : "All milestones complete",
      text: s.next
        ? `Due ${short(s.next.due_date)} · ${daysLeft} days left`
        : "Well done. Nothing is left to do.",
      btn: "View milestones",
      go: "milestones",
      icon: "ri-time-line",
    },
    {
      eyebrow: "Your progress",
      title: `${s.pct}% complete`,
      text: `${s.done} of ${s.total} milestones are done.`,
      btn: "See milestones",
      go: "milestones",
      icon: "ri-line-chart-line",
    },
    {
      eyebrow: "Feedback",
      title: latestFeedback ? "New feedback" : "No feedback yet",
      text: latestFeedback
        ? truncate(latestFeedback, 110)
        : "Your supervisor's notes appear here after your first session.",
      btn: "Read feedback",
      go: "feedback",
      icon: "ri-chat-quote-line",
    },
  ];

  slides.forEach((slide, i) => {
    const c = cards[i];
    slide.innerHTML = `
      <div class="slide-text">
        <p class="eyebrow">${FYP.esc(c.eyebrow)}</p>
        <h3>${FYP.esc(c.title)}</h3>
        <p>${FYP.esc(c.text)}</p>
        <button class="banner-btn" data-go="${c.go}">${c.btn} <i class="ri-arrow-right-line"></i></button>
      </div>
      <div class="slide-visual"><i class="${c.icon}"></i></div>`;
  });
}

function renderOverview(s) {
  overviewStats.innerHTML = `
    <div class="stat primary">
      <i class="ri-line-chart-line"></i>
      <div><strong>${s.pct}%</strong><span>Progress · ${s.done} of ${s.total}</span></div>
    </div>
    <div class="stat accent">
      <i class="ri-calendar-event-line"></i>
      <div><strong>${s.next ? short(s.next.due_date) : "Done"}</strong><span>${s.next ? "Next deadline" : "No deadlines left"}</span></div>
    </div>
    <div class="stat light">
      <i class="ri-error-warning-line"></i>
      <div><strong>${s.overdue.length}</strong><span>Overdue ${s.overdue.length === 1 ? "milestone" : "milestones"}</span></div>
    </div>
    <div class="stat glass">
      <i class="ri-user-star-line"></i>
      <div><strong>${FYP.esc(s.supervisor)}</strong><span>Supervisor</span></div>
    </div>`;
}

// Overdue and due-soon milestones first, then the open actions from supervision sessions
function renderWork(s) {
  const items = [];
  data.milestones
    .filter((m) => ["overdue", "soon"].includes(status(m)))
    .forEach((m) => {
      const overdue = status(m) === "overdue";
      items.push({
        icon: overdue ? "ri-error-warning-line" : "ri-time-line",
        title: m.title,
        meta: `Due ${short(m.due_date)}`,
        tag: overdue ? ["overdue", "Overdue"] : ["soon", "Due soon"],
        go: "milestones",
        primary: overdue,
      });
    });
  s.openActions.slice(0, 4).forEach((a) => {
    items.push({
      icon: "ri-checkbox-blank-circle-line",
      title: a.text,
      meta: a.due_date ? `Action · due ${short(a.due_date)}` : "Action",
      tag: ["soon", "Action"],
      go: "feedback",
      primary: false,
    });
  });

  workList.innerHTML = items.length
    ? items
        .map(
          (i) => `
      <li class="work-card">
        <span class="thumb ${i.primary ? "primary" : ""}"><i class="${i.icon}"></i></span>
        <div class="work-main"><span class="work-title">${FYP.esc(i.title)}</span><small>${FYP.esc(i.meta)}</small></div>
        <span class="tag ${i.tag[0]}">${i.tag[1]}</span>
        <button class="link-btn" data-go="${i.go}">Open</button>
      </li>`,
        )
        .join("")
    : `<li class="placeholder-card glass">
        <i class="ri-checkbox-circle-line"></i>
        <h3>Nothing needs you right now</h3>
        <p>Overdue milestones and open actions from your supervisor appear here.</p>
      </li>`;
}

function renderLatest(s) {
  latestFeedback.innerHTML =
    s.latest && s.latest.feedback
      ? `<div class="feedback-card">
        <p>${FYP.esc(s.latest.feedback)}</p>
        <footer>${FYP.esc(s.supervisor)} · ${short(s.latest.session_date)}</footer>
        <button class="link-btn" data-go="feedback">Read all feedback</button>
      </div>`
      : `<div class="placeholder-card glass">
        <i class="ri-chat-quote-line"></i>
        <h3>No feedback yet</h3>
        <p>Your supervisor's notes appear here after your first session.</p>
      </div>`;
}

// ========== 5.0 Project ==========
function renderProject(s) {
  const p = data.project;
  const ms = data.milestones;
  const current = ms.find((m) => status(m) !== "done");
  const steps = ms
    .map((m) => {
      const st = status(m);
      const cls =
        st === "done"
          ? "done"
          : current && current.id === m.id
            ? "current"
            : "";
      const icon =
        st === "done"
          ? "ri-check-line"
          : cls === "current"
            ? "ri-time-line"
            : "ri-circle-line";
      return `<li class="step ${cls}"><span class="node"><i class="${icon}"></i></span><span class="step-label">${FYP.esc(m.title)}</span></li>`;
    })
    .join("");

  projectBody.innerHTML = `
    <h3 class="page-title">${FYP.esc(p.title)}</h3>
    <p class="lead">${FYP.esc(p.description || "No description yet.")}</p>
    <div class="facts">
      <div><span>Supervisor</span><strong>${FYP.esc(s.supervisor)}</strong></div>
      <div><span>Started</span><strong>${short(p.allocated_at.slice(0, 10))}</strong></div>
      <div><span>Final submission</span><strong>${ms.length ? short(ms[ms.length - 1].due_date) : "Not set"}</strong></div>
    </div>
    <h4 class="block-title">Stage</h4>
    <ol class="stepper">${steps}</ol>`;
}

// ========== 6.0 Milestones ==========
const TAGS = {
  done: ["done", "Complete", "ri-check-line"],
  overdue: ["overdue", "Overdue", "ri-error-warning-line"],
  soon: ["soon", "Due soon", "ri-time-line"],
  upcoming: ["upcoming", "Upcoming", "ri-circle-line"],
  locked: ["upcoming", "Locked", "ri-lock-line"],
};

function renderMilestones() {
  milestoneBody.innerHTML = `
    <h3 class="page-title">Milestones</h3>
    <ul class="list">
      ${data.milestones
        .map((m) => {
          const key =
            isLocked(m) && status(m) !== "done" ? "locked" : status(m);
          const [cls, label, icon] = TAGS[key];
          return `<li class="item">
            <i class="${icon}"></i>
            <div class="main"><strong>${FYP.esc(m.title)}</strong><small>Due ${short(m.due_date)}</small></div>
            <span class="tag ${cls}">${label}</span>
            ${key === "locked" ? "" : `<button class="link-btn" data-go="documents">Upload</button>`}
          </li>`;
        })
        .join("")}
    </ul>`;
}

// ========== 7.0 Feedback ==========
function renderFeedback(s) {
  if (!data.sessions.length) {
    feedbackBody.innerHTML = `
      <h3 class="page-title">Feedback</h3>
      <p class="lead">No open actions</p>
      <div class="placeholder-card glass">
        <i class="ri-chat-quote-line"></i>
        <h3>No sessions logged yet</h3>
        <p>When your supervisor logs a session, the feedback and action items appear here, newest first. You tick off each action as you finish it.</p>
      </div>`;
    return;
  }

  const initials = FYP.initials(s.supervisor);
  const sessions = data.sessions
    .map(
      (sess) => `
      <div class="day-divider"><span>${short(sess.session_date)}</span></div>
      <div class="msg">
        <div class="msg-avatar">${FYP.esc(initials)}</div>
        <div class="msg-body">
          ${sess.notes ? `<div class="bubble">${FYP.esc(sess.notes)}</div>` : ""}
          ${sess.feedback ? `<div class="bubble">${FYP.esc(sess.feedback)}</div>` : ""}
          ${
            (sess.action_items || []).length
              ? `<div class="actions-card">
                ${sess.action_items
                  .map(
                    (
                      a,
                    ) => `<button class="act ${a.done ? "done" : "open"}" type="button" data-action="${a.id}" data-done="${a.done}">
                      <i class="${a.done ? "ri-checkbox-circle-fill" : "ri-checkbox-blank-circle-line"}"></i>
                      <span class="act-text">${FYP.esc(a.text)}</span>
                      <small>${a.done ? "Done" : a.due_date ? "Due " + short(a.due_date) : ""}</small>
                    </button>`,
                  )
                  .join("")}
              </div>`
              : ""
          }
        </div>
      </div>`,
    )
    .join("");

  feedbackBody.innerHTML = `
    <h3 class="page-title">Feedback</h3>
    <p class="lead">${FYP.esc(s.supervisor)} · ${plural(s.openActions.length, "open action")}</p>
    <div class="thread">${sessions}</div>
    <p class="thread-note"><i class="ri-lock-line"></i> Supervisor notes are read-only. Tick an action when it is done.</p>`;
}

// Ticking an action saves it to the database, then the page reloads its data
feedbackBody.addEventListener("click", async (e) => {
  const btn = e.target.closest("[data-action]");
  if (!btn) return;
  const done = btn.dataset.done === "true";
  try {
    await FYP.run(
      FYP.sb.rpc("toggle_action_item", {
        p_item: btn.dataset.action,
        p_done: !done,
      }),
    );
    await refresh();
  } catch (err) {
    FYP.showToast(FYP.errText(err));
  }
});

// ========== 9.0 Rendering ==========
function renderAll() {
  const s = summary();
  renderBanner(s);
  renderOverview(s);
  renderWork(s);
  renderLatest(s);
  renderProject(s);
  renderMilestones();
  renderFeedback(s);
  renderDocuments();
}

async function refresh() {
  const fresh = await loadData();
  if (fresh) {
    data = fresh;
    renderAll();
  }
}

// ========== 10.0 Banner Carousel ==========
function showSlide(i) {
  slideIndex = (i + slides.length) % slides.length;
  slides.forEach((s, k) => s.classList.toggle("active", k === slideIndex));
  slideDots.forEach((d, k) => d.classList.toggle("active", k === slideIndex));
}

function startSlides() {
  clearInterval(slideTimer);
  slideTimer = setInterval(() => showSlide(slideIndex + 1), 6000);
}

slideDots.forEach((dot, k) => {
  dot.addEventListener("click", () => {
    showSlide(k);
    startSlides();
  });
});

// ========== 11.0 Sections ==========
function showSection(name) {
  if (!document.getElementById(name)) return;
  views.forEach((v) => v.classList.toggle("active", v.id === name));
  navButtons.forEach((b) =>
    b.classList.toggle("active", b.dataset.section === name),
  );
  pageTitle.textContent = TITLES[name];
  window.scrollTo({ top: 0, behavior: "smooth" });
  history.replaceState(null, "", "#" + name);
}

// ========== 12.0 Event Wiring ==========
themeToggle.addEventListener("click", () => FYP.toggleTheme(root, themeToggle));
logoutBtn.addEventListener("click", () => FYP.signOut());

navButtons.forEach((btn) => {
  btn.addEventListener("click", () => showSection(btn.dataset.section));
});

// Any button with data-go moves to that section. data-toast shows a short message
document.addEventListener("click", (e) => {
  const go = e.target.closest("[data-go]");
  if (go) {
    showSection(go.dataset.go);
    return;
  }
  const note = e.target.closest("[data-toast]");
  if (note) FYP.showToast(note.dataset.toast);
});

fabBtn.addEventListener("click", () => fabPanel.classList.toggle("open"));
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") fabPanel.classList.remove("open");
});

// ========== 14.0 Documents: Locking and Upload ==========
// A milestone is locked until every milestone before it is complete
function isLocked(m) {
  return data.milestones.some(
    (x) => x.position < m.position && status(x) !== "done",
  );
}

// Labels shown for each document type. Chapter uses its number
function docLabel(type, chapterNo, fileName) {
  if (type === "proposal") return "Proposal";
  if (type === "chapter") return `Chapter ${chapterNo}`;
  if (type === "presentation") return "Presentation";
  return fileName;
}

function uploadFormHtml() {
  const open = data.milestones.filter(
    (m) => !isLocked(m) && status(m) !== "done",
  );
  if (!open.length) {
    return `<div class="placeholder-card glass">
      <i class="ri-lock-line"></i>
      <h3>No milestone is open for upload</h3>
      <p>Milestones open in order. Complete the current one to unlock the next.</p>
    </div>`;
  }
  return `<form id="uploadForm" class="upload-card glass">
    <h4>Upload a document</h4>
    <label>Milestone
      <select name="milestone" required>
        ${open.map((m) => `<option value="${m.id}">${FYP.esc(m.title)}</option>`).join("")}
      </select>
    </label>
    <label>Document type
      <select name="doc_type" required>
        <option value="proposal">Proposal</option>
        <option value="chapter">Chapter</option>
        <option value="presentation">Presentation</option>
        <option value="other">Other</option>
      </select>
    </label>
    <label class="chapter-field" hidden>Chapter number
      <input type="number" name="chapter_no" min="1" max="20" placeholder="1">
    </label>
    <label>File
      <input type="file" name="file" required accept=".pdf,.doc,.docx,.ppt,.pptx,.zip">
    </label>
    <button type="submit" class="btn btn-primary submit">Upload</button>
    <p class="thread-note">Each upload goes to your supervisor for review. Upload a new version to replace it.</p>
  </form>`;
}

function docRow(d) {
  const [cls, label] =
    d.status === "approved"
      ? ["done", "Approved"]
      : d.status === "changes"
        ? ["overdue", "Changes requested"]
        : ["soon", "Waiting for review"];
  return `<div class="doc-row glass">
    <div class="doc-row-main">
      <strong>${FYP.esc(d.name)}</strong>
      <small>Version ${d.version} · ${short(d.created_at.slice(0, 10))}</small>
    </div>
    <span class="tag ${cls}">${label}</span>
    ${d.reviewer_comment ? `<p class="thread-note">${FYP.esc(d.reviewer_comment)}</p>` : ""}
  </div>`;
}

// Documents grouped by milestone, in the order the milestones and uploads happened
function renderDocuments() {
  const position = (id) =>
    (data.milestones.find((m) => m.id === id) || { position: 0 }).position;
  const docs = [...data.documents].sort(
    (a, b) =>
      position(a.milestone_id) - position(b.milestone_id) ||
      a.created_at.localeCompare(b.created_at),
  );
  const groups = data.milestones
    .map((m) => ({ m, list: docs.filter((d) => d.milestone_id === m.id) }))
    .filter((g) => g.list.length);

  docGrid.innerHTML = `
    <div class="doc-layout">
      ${uploadFormHtml()}
      <div class="doc-list">
        ${
          groups.length
            ? groups
                .map(
                  (g) =>
                    `<div class="doc-group"><h4>${FYP.esc(g.m.title)}</h4>${g.list.map(docRow).join("")}</div>`,
                )
                .join("")
            : `<div class="placeholder-card glass">
              <i class="ri-file-text-line"></i>
              <h3>No documents yet</h3>
              <p>Uploads appear here, grouped by milestone, in the order you sent them.</p>
            </div>`
        }
      </div>
    </div>`;
}

// Show the chapter number only when the type is a chapter
docGrid.addEventListener("change", (e) => {
  if (e.target.name !== "doc_type") return;
  const field = docGrid.querySelector(".chapter-field");
  if (field) field.hidden = e.target.value !== "chapter";
});

// Uploads the file to storage, then records it against the milestone
docGrid.addEventListener("submit", async (e) => {
  if (e.target.id !== "uploadForm") return;
  e.preventDefault();
  const form = e.target;
  const file = form.file.files[0];
  if (!file) return FYP.showToast("Choose a file first");

  const milestoneId = form.milestone.value;
  const docType = form.doc_type.value;
  const chapterNo =
    docType === "chapter" ? Number(form.chapter_no.value) : null;
  if (docType === "chapter" && !chapterNo)
    return FYP.showToast("Enter the chapter number");

  const button = form.querySelector("button[type=submit]");
  button.disabled = true;
  button.textContent = "Uploading…";

  const path = `${data.project.id}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  try {
    const { error: storageError } = await FYP.sb.storage
      .from("documents")
      .upload(path, file);
    if (storageError) throw storageError;

    try {
      await FYP.run(
        FYP.sb.from("documents").insert({
          project_id: data.project.id,
          milestone_id: milestoneId,
          doc_type: docType,
          chapter_no: chapterNo,
          name: docLabel(docType, chapterNo, file.name),
          storage_path: path,
        }),
      );
    } catch (dbError) {
      // The record was refused, so remove the file that was just stored
      await FYP.sb.storage.from("documents").remove([path]);
      throw dbError;
    }

    FYP.showToast("Uploaded for review");
    await refresh();
  } catch (err) {
    FYP.showToast(FYP.errText(err));
    button.disabled = false;
    button.textContent = "Upload";
  }
});

// ========== 13.0 Start ==========
(async function start() {
  try {
    data = await loadData();
  } catch (e) {
    FYP.showToast(FYP.errText(e));
  }

  if (data) {
    todayLine.textContent = `${data.profile.full_name} · ${FYP.longToday()}`;
    renderAll();
    startSlides();
  }

  FYP.setupBell({ bellBtn, panel: notifPanel, badge: bellBadge });
  showSection(location.hash.replace("#", "") || "dashboard");
})();

// ========== 9.0 Topic Picker ==========
// Student only: shows open topics when the student has no project yet, and runs the choice
(() => {
  // ========== 1.0 Elements ==========
  const pickRoot = document.documentElement;
  const pickTheme = document.getElementById("pkTheme");
  const pickLogout = document.getElementById("pkLogout");
  const emptyState = document.getElementById("emptyState");
  const carousel = document.getElementById("carousel");
  const track = document.getElementById("track");
  const dotsRow = document.getElementById("dots");
  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");
  const confirmEl = document.getElementById("confirm");
  const confirmText = document.getElementById("confirmText");

  let profile = null; // the signed-in student
  let topics = []; // open topics, in code order
  let current = 0; // the card in view
  let busy = false; // true while a choice is being saved

  // ========== 2.0 Start ==========
  // A student who already has a project goes straight to the dashboard
  async function init() {
    profile = await FYP.requireProfile("student");
    if (!profile) return;

    try {
      const mine = await FYP.run(
        FYP.sb
          .from("projects")
          .select("id")
          .eq("student_id", profile.id)
          .limit(1),
      );
      document.body.classList.remove("loading");
      if (mine.length) return; // has a project: the dashboard shows
      document.body.classList.add("no-project");
      await loadTopics();
    } catch (e) {
      document.body.classList.remove("loading");
      FYP.showToast(FYP.errText(e));
    }
  }

  // Only open topics are shown. The supervisor's name comes from their profile
  async function loadTopics() {
    topics = await FYP.run(
      FYP.sb
        .from("topics")
        .select(
          "id, code, title, description, objectives, technologies, other_requirements, supervisor:profiles!supervisor_id(full_name)",
        )
        .eq("status", "open")
        .order("code", { ascending: true }),
    );
    render();
  }

  // ========== 3.0 Rendering ==========
  function render() {
    if (!topics.length) {
      emptyState.hidden = false;
      carousel.hidden = true;
      return;
    }

    emptyState.hidden = true;
    carousel.hidden = false;
    track.innerHTML = topics.map(cardHtml).join("");
    dotsRow.innerHTML = topics
      .map(
        (_, i) =>
          `<button class="dot-pick${i === 0 ? " active" : ""}" data-dot="${i}" aria-label="Topic ${i + 1}"></button>`,
      )
      .join("");

    current = 0;
    wireCards();
    updateControls();
  }

  function cardHtml(t) {
    const supervisor = t.supervisor ? t.supervisor.full_name : "Supervisor";
    const techs = splitList(t.technologies, ",");
    const objectives = splitList(t.objectives, "\n");

    return `
    <article class="tcard glass" data-index="${t.code}">
      <div class="tcard-head">
        <span class="code">${FYP.esc(t.code)}</span>
        <span class="tag ontrack">Open</span>
      </div>

      <h3>${FYP.esc(t.title)}</h3>
      <p class="sup"><i class="ri-user-star-line"></i> ${FYP.esc(supervisor)}</p>

      <div class="chips">
        ${techs.map((x) => `<span class="chip-tech">${FYP.esc(x)}</span>`).join("")}
      </div>

      <p class="more">Tap to read the full topic</p>

      <div class="details">
        <h4>About this project</h4>
        <p>${FYP.esc(t.description || "No description given yet.")}</p>

        <h4>Objectives</h4>
        ${
          objectives.length
            ? `<ol>${objectives.map((o) => `<li>${FYP.esc(o)}</li>`).join("")}</ol>`
            : `<p>No objectives listed.</p>`
        }

        <h4>Other requirements</h4>
        <p>${FYP.esc(t.other_requirements || "None listed.")}</p>

        <button class="btn btn-primary choose" data-choose="${t.id}">Choose this topic</button>
      </div>
    </article>`;
  }

  // Splits a comma or line separated field into clean items
  function splitList(text, separator) {
    if (!text) return [];
    return text
      .split(separator)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  // ========== 4.0 Cards ==========
  // Tapping a card opens it. Only one card is open at a time. The choose button never opens or closes a card
  function wireCards() {
    track.querySelectorAll(".tcard").forEach((card) => {
      card.addEventListener("click", (e) => {
        if (e.target.closest("[data-choose]")) return;
        toggleCard(card);
      });
    });

    track.querySelectorAll("[data-choose]").forEach((btn) => {
      btn.addEventListener("click", () => chooseTopic(btn.dataset.choose, btn));
    });
  }

  function toggleCard(card) {
    const opening = !card.classList.contains("expanded");
    track
      .querySelectorAll(".tcard.expanded")
      .forEach((c) => c.classList.remove("expanded"));
    if (opening) {
      card.classList.add("expanded");
      card.scrollIntoView({
        behavior: "smooth",
        inline: "start",
        block: "nearest",
      });
    }
  }

  // ========== 5.0 Carousel ==========
  function cards() {
    return track.querySelectorAll(".tcard");
  }

  function goTo(index) {
    const list = cards();
    if (!list.length) return;
    current = Math.max(0, Math.min(index, list.length - 1));
    list[current].scrollIntoView({
      behavior: "smooth",
      inline: "start",
      block: "nearest",
    });
    updateControls();
  }

  // Keeps the dots and arrows in step with the card in view
  function updateControls() {
    const total = cards().length;
    prevBtn.disabled = total <= 1 || current === 0;
    nextBtn.disabled = total <= 1 || current >= total - 1;
    dotsRow.querySelectorAll(".dot-pick").forEach((dot, i) => {
      dot.classList.toggle("active", i === current);
    });
  }

  // Works out which card is nearest the left edge while the track is scrolled
  track.addEventListener("scroll", () => {
    const list = cards();
    if (!list.length) return;
    let nearest = 0;
    let best = Infinity;
    list.forEach((card, i) => {
      const distance = Math.abs(
        card.offsetLeft - track.scrollLeft - track.offsetLeft,
      );
      if (distance < best) {
        best = distance;
        nearest = i;
      }
    });
    if (nearest !== current) {
      current = nearest;
      updateControls();
    }
  });

  prevBtn.addEventListener("click", () => goTo(current - 1));
  nextBtn.addEventListener("click", () => goTo(current + 1));
  dotsRow.addEventListener("click", (e) => {
    const dot = e.target.closest("[data-dot]");
    if (dot) goTo(Number(dot.dataset.dot));
  });

  // ========== 6.0 Choosing ==========
  // choose_topic checks in the database that the topic is still open, that the supervisor has
  // space, and that the student has no project. It then creates the project and its milestones
  async function chooseTopic(topicId, button) {
    if (busy) return;
    busy = true;
    button.disabled = true;
    button.textContent = "Choosing…";

    const topic = topics.find((t) => t.id === topicId);

    try {
      await FYP.run(FYP.sb.rpc("choose_topic", { p_topic: topicId }));
      showConfirmation(topic);
    } catch (e) {
      busy = false;
      button.disabled = false;
      button.textContent = "Choose this topic";
      FYP.showToast(FYP.errText(e));
      // The topic may have been taken by someone else, so refresh the list
      await loadTopics();
    }
  }

  // Shows the confirmation for a few seconds, then opens the dashboard
  function showConfirmation(topic) {
    const supervisor =
      topic && topic.supervisor
        ? topic.supervisor.full_name
        : "your supervisor";
    confirmText.textContent = `${topic ? topic.code + " · " + topic.title : "Your topic"} with ${supervisor}.`;
    confirmEl.hidden = false;
    confirmEl.style.display = "grid";
    setTimeout(() => {
      window.location.reload();
    }, 3000);
  }

  // ========== 7.0 Controls ==========
  pickTheme.addEventListener("click", () =>
    FYP.toggleTheme(pickRoot, pickTheme),
  );
  pickLogout.addEventListener("click", () => FYP.signOut());

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      track
        .querySelectorAll(".tcard.expanded")
        .forEach((c) => c.classList.remove("expanded"));
    }
  });

  // ========== 8.0 Start ==========

  init();
})();
