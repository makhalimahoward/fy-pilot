// ========== 1.0 Test Data ==========
// Static placeholder data for the supervisor. It is replaced by the database later
const TODAY = new Date("2026-11-01");
const RULE_DAYS = 14; // a student with no session for this many days needs attention
const CAPACITY = 8; // maximum students per supervisor

const students = [
  {
    id: "s1",
    name: "Howard Makhalima",
    project:
      "Web Based Final Year Project Supervision and Progress Monitoring System",
    pct: 33,
    lastSession: "2026-10-28",
    next: "3 Nov 2026",
    milestones: [
      { t: "Proposal submitted", d: "10 Sep 2026", s: "done" },
      { t: "Literature review", d: "1 Oct 2026", s: "done" },
      { t: "Prototype demo", d: "20 Oct 2026", s: "overdue" },
      { t: "Requirements and design", d: "3 Nov 2026", s: "soon" },
      { t: "Final report draft", d: "30 Nov 2026", s: "upcoming" },
      { t: "Final submission", d: "14 Dec 2026", s: "upcoming" },
    ],
    docs: [
      {
        name: "requirements_v1.pdf",
        ver: 1,
        date: "29 Oct 2026",
        status: "review",
      },
    ],
    sessions: [
      {
        date: "28 Oct 2026",
        notes: "Reviewed the requirements draft.",
        feedback:
          "Tighten the objectives so each one is measurable. Add a sequence diagram before the next review.",
        actions: [
          {
            t: "Make the objectives measurable",
            due: "4 Nov 2026",
            done: false,
          },
          {
            t: "Add a sequence diagram for the session flow",
            due: "7 Nov 2026",
            done: false,
          },
        ],
        locked: true,
      },
    ],
  },
  {
    id: "s2",
    name: "Tendai Moyo",
    project: "Mobile Attendance Tracking for Lecture Halls",
    pct: 62,
    lastSession: "2026-10-26",
    next: "10 Nov 2026",
    milestones: [
      { t: "Proposal submitted", d: "10 Sep 2026", s: "done" },
      { t: "Literature review", d: "1 Oct 2026", s: "done" },
      { t: "Prototype demo", d: "20 Oct 2026", s: "done" },
      { t: "Requirements and design", d: "3 Nov 2026", s: "soon" },
      { t: "Final report draft", d: "30 Nov 2026", s: "upcoming" },
      { t: "Final submission", d: "14 Dec 2026", s: "upcoming" },
    ],
    docs: [
      {
        name: "prototype_v2.zip",
        ver: 2,
        date: "30 Oct 2026",
        status: "review",
      },
    ],
    sessions: [],
  },
  {
    id: "s3",
    name: "Ruva Chikwanda",
    project: "Inventory Forecasting Dashboard for a Retail Chain",
    pct: 48,
    lastSession: "2026-10-12",
    next: "3 Nov 2026",
    milestones: [
      { t: "Proposal submitted", d: "10 Sep 2026", s: "done" },
      { t: "Literature review", d: "1 Oct 2026", s: "done" },
      { t: "Prototype demo", d: "20 Oct 2026", s: "overdue" },
      { t: "Requirements and design", d: "3 Nov 2026", s: "soon" },
      { t: "Final report draft", d: "30 Nov 2026", s: "upcoming" },
      { t: "Final submission", d: "14 Dec 2026", s: "upcoming" },
    ],
    docs: [],
    sessions: [],
  },
  {
    id: "s4",
    name: "Kudzai Mutasa",
    project: "Campus Parking Allocation Web App",
    pct: 80,
    lastSession: "2026-10-30",
    next: "20 Nov 2026",
    milestones: [
      { t: "Proposal submitted", d: "10 Sep 2026", s: "done" },
      { t: "Literature review", d: "1 Oct 2026", s: "done" },
      { t: "Prototype demo", d: "20 Oct 2026", s: "done" },
      { t: "Requirements and design", d: "3 Nov 2026", s: "done" },
      { t: "Final report draft", d: "30 Nov 2026", s: "soon" },
      { t: "Final submission", d: "14 Dec 2026", s: "upcoming" },
    ],
    docs: [
      { name: "design_v3.pdf", ver: 3, date: "31 Oct 2026", status: "review" },
    ],
    sessions: [],
  },
  {
    id: "s5",
    name: "Nyasha Dube",
    project: "Online Donation Platform for a Student Society",
    pct: 20,
    lastSession: "2026-10-22",
    next: "3 Nov 2026",
    milestones: [
      { t: "Proposal submitted", d: "10 Sep 2026", s: "done" },
      { t: "Literature review", d: "1 Oct 2026", s: "soon" },
      { t: "Prototype demo", d: "20 Oct 2026", s: "upcoming" },
      { t: "Requirements and design", d: "3 Nov 2026", s: "upcoming" },
      { t: "Final report draft", d: "30 Nov 2026", s: "upcoming" },
      { t: "Final submission", d: "14 Dec 2026", s: "upcoming" },
    ],
    docs: [],
    sessions: [],
  },
];

// ========== 2.0 Elements ==========
const root = document.documentElement;
const themeToggle = document.getElementById("themeToggle");
const navButtons = document.querySelectorAll(".nav-btn[data-section]");
const views = document.querySelectorAll(".view");
const pageTitle = document.getElementById("pageTitle");
const studentRows = document.getElementById("studentRows");
const reviewRows = document.getElementById("reviewRows");
const wsRing = document.getElementById("wsRing");
const wsPct = document.getElementById("wsPct");
const wsName = document.getElementById("wsName");
const wsProject = document.getElementById("wsProject");
const wsLast = document.getElementById("wsLast");
const wsNext = document.getElementById("wsNext");
const wsAttention = document.getElementById("wsAttention");
const wsMilestones = document.getElementById("wsMilestones");
const wsDocuments = document.getElementById("wsDocuments");
const wsThread = document.getElementById("wsThread");
const tabs = document.querySelectorAll(".tab");
const tabPanels = document.querySelectorAll(".tab-panel");
const drawerWrap = document.getElementById("drawerWrap");
const logForm = document.getElementById("logForm");
const logDate = document.getElementById("logDate");
const logNotes = document.getElementById("logNotes");
const logFeedback = document.getElementById("logFeedback");
const actText = document.getElementById("actText");
const actDue = document.getElementById("actDue");
const addAction = document.getElementById("addAction");
const actPreview = document.getElementById("actPreview");
const toast = document.getElementById("toast");
const logoutBtn = document.getElementById("logoutBtn");

let current = null; // the student open in the workspace
let draftActions = []; // actions added in the open log form

// ========== 3.0 Helpers ==========
// Days between the last session and today
function daysSince(dateStr) {
  const d = new Date(dateStr);
  return Math.floor((TODAY - d) / 86400000);
}

// Overdue milestones count as needing attention, as does a long gap without a session
function needsAttention(s) {
  const overdue = s.milestones.some((m) => m.s === "overdue");
  return overdue || daysSince(s.lastSession) > RULE_DAYS;
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("show"), 2400);
}

// Colour and icon for a milestone's status, using the NUST palette
function statusStyle(status) {
  const map = {
    done: {
      glow: "0 153 230",
      ink: "var(--primary)",
      icon: "ri-check-line",
      pct: 100,
      ring: "var(--primary)",
      tag: "done",
      label: "Complete",
    },
    overdue: {
      glow: "255 213 0",
      ink: "var(--text)",
      icon: "ri-error-warning-line",
      pct: 100,
      ring: "var(--accent)",
      tag: "overdue",
      label: "Overdue",
    },
    soon: {
      glow: "255 213 0",
      ink: "var(--text)",
      icon: "ri-time-line",
      pct: 50,
      ring: "var(--accent)",
      tag: "soon",
      label: "Due soon",
    },
    upcoming: {
      glow: "120 130 140",
      ink: "var(--text-muted)",
      icon: "ri-circle-line",
      pct: 0,
      ring: "var(--text-muted)",
      tag: "upcoming",
      label: "Upcoming",
    },
  };
  return map[status];
}

// ========== 4.0 Caseload and Reviews ==========
// Renders the list of students with a plain progress circle and a status tag
function renderStudents() {
  const capacityOver = students.length > CAPACITY;
  document.getElementById("statStudents").textContent = students.length;
  document.getElementById("capacityText").textContent =
    `${students.length} of ${CAPACITY}`;
  document.getElementById("capacityNote").textContent = capacityOver
    ? "Over capacity"
    : "Capacity";
  document
    .getElementById("statCapacity")
    .classList.toggle("over", capacityOver);

  studentRows.innerHTML = students
    .map((s) => {
      const attention = needsAttention(s);
      const reason = s.milestones.some((m) => m.s === "overdue")
        ? "Overdue milestone"
        : `No session for ${daysSince(s.lastSession)} days`;
      return `
      <li class="row" data-id="${s.id}" tabindex="0">
        <span class="progress-ring" style="--pct: ${s.pct}; --ring-c: var(--primary); --ink: var(--primary);"><span>${s.pct}%</span></span>
        <div class="main">
          <strong>${s.name}</strong>
          <small>${s.project}</small>
        </div>
        ${
          attention
            ? `<span class="tag attention">${reason}</span>`
            : `<span class="tag ontrack">On track</span>`
        }
        <i class="ri-arrow-right-s-line"></i>
      </li>`;
    })
    .join("");

  studentRows.querySelectorAll(".row").forEach((row) => {
    row.addEventListener("click", () => openWorkspace(row.dataset.id));
    row.addEventListener("keydown", (e) => {
      if (e.key === "Enter") openWorkspace(row.dataset.id);
    });
  });
}

// Renders every document waiting for review, across all students
function renderReviews() {
  const waiting = students.flatMap((s) =>
    s.docs
      .filter((d) => d.status === "review")
      .map((d) => ({ student: s, doc: d })),
  );
  document.getElementById("reviewCount").textContent = waiting.length;

  reviewRows.innerHTML = waiting.length
    ? waiting
        .map(
          ({ student, doc }) => `
      <li class="row" data-id="${student.id}" tabindex="0">
        <span class="progress-ring" style="--pct: 100; --ring-c: var(--accent); --ink: var(--text);"><i class="ri-file-search-line"></i></span>
        <div class="main">
          <strong>${doc.name}</strong>
          <small>${student.name} · version ${doc.ver} · ${doc.date}</small>
        </div>
        <span class="tag soon">Waiting</span>
        <button class="link-btn" data-open-doc="${student.id}">Review</button>
      </li>`,
        )
        .join("")
    : `<li class="row"><div class="main"><small>Nothing is waiting for review.</small></div></li>`;

  reviewRows.querySelectorAll("[data-open-doc]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      openWorkspace(btn.dataset.openDoc, "documents");
    });
  });
  reviewRows.querySelectorAll(".row[data-id]").forEach((row) => {
    row.addEventListener("click", () =>
      openWorkspace(row.dataset.id, "documents"),
    );
  });
}

// ========== 5.0 Student Workspace ==========
// Opens one student and fills every tab from their record
function openWorkspace(id, tab = "overview") {
  current = students.find((s) => s.id === id);
  if (!current) return;

  pageTitle.textContent = "Student";
  showView("workspace");
  setTab(tab);

  wsRing.style.setProperty("--glow", "0 153 230");
  wsPct.innerHTML = `${current.pct}<small>%</small>`;
  wsName.textContent = current.name;
  wsProject.textContent = current.project;
  wsLast.textContent = formatDate(current.lastSession);
  wsNext.textContent = current.next;

  renderAttention();
  renderMilestones();
  renderDocuments();
  renderThread();
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function renderAttention() {
  const items = [];
  current.milestones
    .filter((m) => m.s === "overdue")
    .forEach((m) =>
      items.push({
        t: m.t,
        note: `Overdue · due ${m.d}`,
        tag: "overdue",
        label: "Overdue",
      }),
    );
  if (daysSince(current.lastSession) > RULE_DAYS)
    items.push({
      t: "No recent session",
      note: `Last session ${formatDate(current.lastSession)}`,
      tag: "attention",
      label: "Follow up",
    });
  current.docs
    .filter((d) => d.status === "review")
    .forEach((d) =>
      items.push({
        t: d.name,
        note: `Waiting for review · version ${d.ver}`,
        tag: "soon",
        label: "Review",
      }),
    );

  wsAttention.innerHTML = items.length
    ? items
        .map(
          (i) => `
      <li class="row">
        <div class="main"><strong>${i.t}</strong><small>${i.note}</small></div>
        <span class="tag ${i.tag}">${i.label}</span>
      </li>`,
        )
        .join("")
    : `<li class="row"><div class="main"><small>Nothing needs attention right now.</small></div></li>`;
}

function renderMilestones() {
  wsMilestones.innerHTML = current.milestones
    .map((m) => {
      const st = statusStyle(m.s);
      return `
      <li class="row">
        <span class="progress-ring" style="--pct: ${st.pct}; --ring-c: ${st.ring}; --ink: ${st.ink};"><i class="${st.icon}"></i></span>
        <div class="main"><strong>${m.t}</strong><small>Due ${m.d}</small></div>
        <span class="tag ${st.tag}">${st.label}</span>
      </li>`;
    })
    .join("");
}

// Each document shows Approve and Request changes. Request changes opens a comment box
function renderDocuments() {
  if (!current.docs.length) {
    wsDocuments.innerHTML = `<li class="row"><div class="main"><small>No documents uploaded yet.</small></div></li>`;
    return;
  }

  wsDocuments.innerHTML = current.docs
    .map((d, i) => {
      const tagHtml =
        d.status === "review"
          ? `<span class="tag soon">Waiting for review</span>`
          : d.status === "approved"
            ? `<span class="tag done">Approved</span>`
            : `<span class="tag attention">Changes requested</span>`;
      const actions =
        d.status === "review"
          ? `<div class="review-actions">
           <button class="btn btn-primary btn-small" data-approve="${i}">Approve</button>
           <button class="btn btn-small ghost" data-changes="${i}">Request changes</button>
         </div>`
          : "";
      return `
      <li class="row doc" style="cursor: default;">
        <i class="ri-file-text-line doc-icon"></i>
        <div class="main"><strong>${d.name}</strong><small>Version ${d.ver} · ${d.date}</small></div>
        ${tagHtml}
        <div class="comment-box" id="comment-${i}">
          <textarea rows="2" placeholder="What should the student change?"></textarea>
          <button class="btn btn-primary btn-small comment-send" data-send="${i}">Send</button>
        </div>
        ${actions}
      </li>`;
    })
    .join("");

  wsDocuments.querySelectorAll("[data-approve]").forEach((btn) => {
    btn.addEventListener("click", () => {
      current.docs[btn.dataset.approve].status = "approved";
      renderDocuments();
      renderAttention();
      showToast("Document approved");
    });
  });

  wsDocuments.querySelectorAll("[data-changes]").forEach((btn) => {
    btn.addEventListener("click", () => {
      document
        .getElementById(`comment-${btn.dataset.changes}`)
        .classList.toggle("open");
    });
  });

  wsDocuments.querySelectorAll("[data-send]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const i = btn.dataset.send;
      const text = document
        .querySelector(`#comment-${i} textarea`)
        .value.trim();
      if (!text) {
        showToast("Add a comment first");
        return;
      }
      current.docs[i].status = "changes";
      renderDocuments();
      renderAttention();
      showToast("Changes requested");
    });
  });
}

// The session thread: each saved session is a message with its actions attached
function renderThread() {
  if (!current.sessions.length) {
    wsThread.innerHTML = `<p class="lead">No sessions logged yet. Use Log session to add the first one.</p>`;
    return;
  }

  wsThread.innerHTML = current.sessions
    .map(
      (s, si) => `
    <div class="day-divider"><span>${s.date}</span></div>
    <div class="msg">
      <div class="msg-avatar">AN</div>
      <div class="msg-body">
        ${s.notes ? `<div class="bubble">${s.notes}</div>` : ""}
        ${s.feedback ? `<div class="bubble">${s.feedback}</div>` : ""}
        ${
          s.actions.length
            ? `
          <div class="actions-card">
            ${s.actions
              .map(
                (a, ai) => `
              <div class="act ${a.done ? "done" : "open"}">
                <i class="${a.done ? "ri-checkbox-circle-fill" : "ri-checkbox-blank-circle-line"}"></i>
                <span class="act-text">${a.t}</span>
                <small>${a.done ? "Done" : "Due " + a.due}</small>
              </div>`,
              )
              .join("")}
          </div>`
            : ""
        }
      </div>
    </div>`,
    )
    .join("");
}

// ========== 6.0 Log Session Drawer ==========
function openLog() {
  draftActions = [];
  logNotes.value = "";
  logFeedback.value = "";
  logDate.value = "2026-11-01";
  renderDraftActions();
  drawerWrap.classList.add("open");
}

function closeLog() {
  drawerWrap.classList.remove("open");
}

function renderDraftActions() {
  actPreview.innerHTML = draftActions
    .map(
      (a, i) => `
    <li><span>${a.t}</span><small>${a.due || "No due date"}</small></li>`,
    )
    .join("");
}

// Saves the session into the thread. A saved session is locked and cannot be edited
function saveSession(e) {
  e.preventDefault();
  const notes = logNotes.value.trim();
  const feedback = logFeedback.value.trim();
  if (!notes && !feedback && !draftActions.length) {
    showToast("Add notes, feedback or an action first");
    return;
  }
  current.sessions.unshift({
    date: formatDate(logDate.value),
    notes,
    feedback,
    actions: draftActions.map((a) => ({
      t: a.t,
      due: a.due ? formatDate(a.due) : "",
      done: false,
    })),
    locked: true,
  });
  current.lastSession = logDate.value;
  closeLog();
  wsLast.textContent = formatDate(current.lastSession);
  renderAttention();
  renderThread();
  renderStudents();
  showToast("Session saved and locked");
}

// ========== 7.0 Views and Tabs ==========
function showView(name) {
  views.forEach((v) => v.classList.toggle("active", v.id === name));
  navButtons.forEach((b) =>
    b.classList.toggle("active", b.dataset.section === name),
  );
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function setTab(name) {
  tabs.forEach((t) => t.classList.toggle("active", t.dataset.tab === name));
  tabPanels.forEach((p) =>
    p.classList.toggle("active", p.id === `tab-${name}`),
  );
}

// ========== 8.0 Event Wiring ==========
themeToggle.addEventListener("click", () => {
  const isDark = root.getAttribute("data-theme") === "dark";
  root.setAttribute("data-theme", isDark ? "light" : "dark");
  themeToggle.querySelector("i").className = isDark
    ? "ri-moon-line"
    : "ri-sun-line";
});

navButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const name = btn.dataset.section;
    if (name === "reviews") renderReviews();
    pageTitle.textContent = name === "reviews" ? "Reviews" : "Your students";
    showView(name);
  });
});

document.querySelectorAll(".back-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    pageTitle.textContent = "Your students";
    showView("home");
  });
});

tabs.forEach((t) => t.addEventListener("click", () => setTab(t.dataset.tab)));

document.getElementById("openLog").addEventListener("click", openLog);
document.getElementById("closeLog").addEventListener("click", closeLog);
drawerWrap.addEventListener("click", (e) => {
  if (e.target === drawerWrap) closeLog();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeLog();
});

addAction.addEventListener("click", () => {
  const t = actText.value.trim();
  if (!t) {
    showToast("Write the action first");
    return;
  }
  draftActions.push({ t, due: actDue.value });
  actText.value = "";
  actDue.value = "";
  renderDraftActions();
});

logForm.addEventListener("submit", saveSession);

logoutBtn.addEventListener("click", () => {
  window.location.href = "index.html";
});

// ========== 9.0 Start ==========
renderStudents();
renderReviews();
