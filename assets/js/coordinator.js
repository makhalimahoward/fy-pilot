// ========== 1.0 Test Data ==========
// Static placeholder data for the coordinator. It is replaced by the database later
const TODAY = new Date("2026-11-01");
const RULE_DAYS = 14; // no session for this many days needs attention
const CAPACITY = 8; // maximum students per supervisor
const TOTAL_MILESTONES = 6;

const supervisors = [
  "Dr. A. Ndlovu",
  "Dr. B. Moyo",
  "Mr. C. Dube",
  "Mrs. D. Khumalo",
];

// name, project, supervisor index, milestones done, overdue milestones, last session, next deadline
const students = [
  [
    "Howard Makhalima",
    "Web Based Final Year Project Supervision System",
    0,
    2,
    1,
    "2026-10-28",
    "3 Nov 2026",
  ],
  [
    "Tendai Moyo",
    "Mobile Attendance Tracking for Lecture Halls",
    0,
    3,
    0,
    "2026-10-26",
    "10 Nov 2026",
  ],
  [
    "Ruvimbo Chari",
    "Smart Irrigation Monitoring with IoT",
    0,
    2,
    0,
    "2026-10-12",
    "3 Nov 2026",
  ],
  [
    "Kudzai Ncube",
    "Online Exam Seating Allocation",
    0,
    4,
    0,
    "2026-10-30",
    "30 Nov 2026",
  ],
  [
    "Nyasha Sithole",
    "Bus Route Tracking for Campus Shuttles",
    0,
    1,
    1,
    "2026-09-29",
    "3 Nov 2026",
  ],
  [
    "Lindiwe Moyo",
    "Hospital Queue Management System",
    1,
    5,
    0,
    "2026-10-29",
    "30 Nov 2026",
  ],
  [
    "Farai Dlamini",
    "E-Voting for Student Elections",
    1,
    3,
    0,
    "2026-10-20",
    "3 Nov 2026",
  ],
  [
    "Thando Mpofu",
    "Library Book Recommendation Engine",
    1,
    2,
    2,
    "2026-10-05",
    "3 Nov 2026",
  ],
  [
    "Blessing Nkomo",
    "Crop Disease Detection with Image Analysis",
    2,
    4,
    0,
    "2026-10-27",
    "30 Nov 2026",
  ],
  [
    "Prince Mlilo",
    "Church Giving and Records App",
    2,
    3,
    0,
    "2026-10-24",
    "10 Nov 2026",
  ],
  ["Rudo Banda", "Alumni Tracer Portal", 2, 1, 1, "2026-10-01", "3 Nov 2026"],
  [
    "Tafadzwa Zulu",
    "Fuel Queue Notification App",
    3,
    5,
    0,
    "2026-10-31",
    "30 Nov 2026",
  ],
  [
    "Anesu Ndebele",
    "Peer Tutoring Matching Platform",
    3,
    3,
    0,
    "2026-10-22",
    "10 Nov 2026",
  ],
].map(([name, project, sup, done, overdue, last, next], i) => ({
  id: "s" + (i + 1),
  name,
  project,
  sup,
  done,
  overdue,
  last,
  next,
  // Progress is completed milestones divided by total milestones
  pct: Math.round((done / TOTAL_MILESTONES) * 100),
}));

// ========== 2.0 Elements ==========
const root = document.documentElement;
const themeToggle = document.getElementById("themeToggle");
const navButtons = document.querySelectorAll(".nav-btn[data-section]");
const views = document.querySelectorAll(".view");
const pageTitle = document.getElementById("pageTitle");
const toast = document.getElementById("toast");
const projectRows = document.getElementById("projectRows");
const projectSearch = document.getElementById("projectSearch");
const reportOut = document.getElementById("reportOut");

const TITLES = {
  overview: "Overview",
  projects: "All projects",
  supervisors: "Supervisors",
  reports: "Reports",
};

let projectFilter = "all";
let reportType = "progress";

// ========== 3.0 Helpers ==========
// Escapes text before it goes into innerHTML, so names and titles can never inject markup
function esc(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function daysSince(iso) {
  return Math.floor((TODAY - new Date(iso)) / 86400000);
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// Returns the reason a student needs attention, or an empty string
function attentionReason(s) {
  if (s.overdue > 0)
    return s.overdue === 1
      ? "1 overdue milestone"
      : `${s.overdue} overdue milestones`;
  if (daysSince(s.last) > RULE_DAYS)
    return `No session in ${daysSince(s.last)} days`;
  return "";
}

function supervisorCount(index) {
  return students.filter((s) => s.sup === index).length;
}

let toastTimer;
function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2400);
}

function toggleTheme() {
  const isDark = root.getAttribute("data-theme") === "dark";
  root.setAttribute("data-theme", isDark ? "light" : "dark");
  themeToggle.querySelector("i").className = isDark
    ? "ri-moon-line"
    : "ri-sun-line";
}

// ========== 4.0 Section Switching ==========
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

// ========== 5.0 Overview ==========
function studentRow(s, withSupervisor = true) {
  const reason = attentionReason(s);
  return `
    <li class="row" style="cursor: default;">
      <span class="progress-ring" style="--pct: ${s.pct}; --ring-c: var(--primary); --ink: var(--primary);"><span>${s.pct}%</span></span>
      <div class="main">
        <strong>${esc(s.name)}</strong>
        <small>${esc(s.project)}${withSupervisor ? " · " + esc(supervisors[s.sup]) : ""}</small>
      </div>
      ${reason ? `<span class="tag attention">${esc(reason)}</span>` : `<span class="tag ontrack">On track</span>`}
    </li>`;
}

function renderOverview() {
  const behind = students.filter((s) => attentionReason(s));
  const avg = Math.round(
    students.reduce((sum, s) => sum + s.pct, 0) / students.length,
  );

  document.getElementById("statStudents").textContent = students.length;
  document.getElementById("statSupervisors").textContent = supervisors.length;
  document.getElementById("statAvg").textContent = avg + "%";
  document.getElementById("statAttention").textContent = behind.length;

  document.getElementById("behindRows").innerHTML = behind.length
    ? behind
        .sort((a, b) => a.pct - b.pct)
        .map((s) => studentRow(s))
        .join("")
    : `<li class="row"><div class="main"><small>Every project is on track.</small></div></li>`;
}

// ========== 6.0 Projects ==========
function renderProjects() {
  const q = projectSearch.value.trim().toLowerCase();
  const list = students.filter((s) => {
    const flagged = !!attentionReason(s);
    if (projectFilter === "attention" && !flagged) return false;
    if (projectFilter === "ontrack" && flagged) return false;
    return `${s.name} ${s.project} ${supervisors[s.sup]}`
      .toLowerCase()
      .includes(q);
  });

  projectRows.innerHTML = list.length
    ? list.map((s) => studentRow(s)).join("")
    : `<li class="row"><div class="main"><small>No projects match.</small></div></li>`;
}

// ========== 7.0 Supervisors ==========
function renderSupervisors() {
  document.getElementById("supervisorRows").innerHTML = supervisors
    .map((name, i) => {
      const count = supervisorCount(i);
      const over = count > CAPACITY;
      const flagged = students.filter(
        (s) => s.sup === i && attentionReason(s),
      ).length;
      return `
        <li class="row" style="cursor: default;">
          <span class="progress-ring" style="--pct: 100; --ring-c: var(--accent); --ink: var(--text);"><i class="ri-user-star-line"></i></span>
          <div class="main">
            <strong>${esc(name)}</strong>
            <small>${count} of ${CAPACITY} students · ${flagged} need attention</small>
          </div>
          <div class="load ${over ? "over" : ""}"><span style="width: ${Math.min(100, (count / CAPACITY) * 100)}%"></span></div>
          ${over ? `<span class="tag attention">Over capacity</span>` : `<span class="tag ontrack">Within limit</span>`}
        </li>`;
    })
    .join("");
}

// ========== 8.0 Reports ==========
// Each report is a title, column headings and rows, used for the preview, the CSV and the PDF
function buildReport(type) {
  if (type === "overdue") {
    return {
      title: "Overdue and inactive projects",
      head: ["Student", "Supervisor", "Issue", "Last session"],
      rows: students
        .filter((s) => attentionReason(s))
        .map((s) => [
          s.name,
          supervisors[s.sup],
          attentionReason(s),
          formatDate(s.last),
        ]),
    };
  }
  if (type === "workload") {
    return {
      title: "Supervisor workload",
      head: ["Supervisor", "Students", "Capacity", "Need attention"],
      rows: supervisors.map((name, i) => [
        name,
        supervisorCount(i),
        CAPACITY,
        students.filter((s) => s.sup === i && attentionReason(s)).length,
      ]),
    };
  }
  return {
    title: "Project progress",
    head: ["Student", "Project", "Supervisor", "Progress", "Next deadline"],
    rows: students.map((s) => [
      s.name,
      s.project,
      supervisors[s.sup],
      s.pct + "%",
      s.next,
    ]),
  };
}

function renderReport() {
  const r = buildReport(reportType);
  reportOut.innerHTML = `
    <h3>${esc(r.title)}</h3>
    <small>Generated ${formatDate(TODAY.toISOString())} · ${r.rows.length} rows</small>
    <table>
      <thead><tr>${r.head.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead>
      <tbody>${
        r.rows.length
          ? r.rows
              .map(
                (row) =>
                  `<tr>${row.map((c) => `<td>${esc(String(c))}</td>`).join("")}</tr>`,
              )
              .join("")
          : `<tr><td colspan="${r.head.length}">Nothing to report.</td></tr>`
      }</tbody>
    </table>`;
}

// Downloads the open report as a CSV file
function exportCsv() {
  const r = buildReport(reportType);
  const cell = (v) => `"${String(v).replace(/"/g, '""')}"`;
  const csv = [r.head, ...r.rows]
    .map((row) => row.map(cell).join(","))
    .join("\n");
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  link.download = `fypilot-${reportType}-report.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
  showToast("CSV downloaded");
}

// ========== 9.0 Event Wiring ==========
themeToggle.addEventListener("click", toggleTheme);

navButtons.forEach((btn) =>
  btn.addEventListener("click", () => showSection(btn.dataset.section)),
);

document.getElementById("projectChips").addEventListener("click", (e) => {
  const chip = e.target.closest(".chip");
  if (!chip) return;
  projectFilter = chip.dataset.filter;
  document
    .querySelectorAll("#projectChips .chip")
    .forEach((c) => c.classList.toggle("active", c === chip));
  renderProjects();
});

projectSearch.addEventListener("input", renderProjects);

document.getElementById("reportChips").addEventListener("click", (e) => {
  const chip = e.target.closest(".chip");
  if (!chip) return;
  reportType = chip.dataset.report;
  document
    .querySelectorAll("#reportChips .chip")
    .forEach((c) => c.classList.toggle("active", c === chip));
  renderReport();
});

document.getElementById("exportCsv").addEventListener("click", exportCsv);
document
  .getElementById("exportPdf")
  .addEventListener("click", () => window.print());

// Log out returns to the landing page (no session until the backend is connected)
document.getElementById("logoutBtn").addEventListener("click", () => {
  window.location.href = "index.html";
});

// ========== 10.0 Start ==========
renderOverview();
renderProjects();
renderSupervisors();
renderReport();
showSection(location.hash.replace("#", "") || "overview");
