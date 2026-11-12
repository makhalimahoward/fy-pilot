// ========== 1.0 Elements ==========
const root = document.documentElement;
const themeToggle = document.getElementById("themeToggle");
const navButtons = document.querySelectorAll(".nav-btn[data-section]");
const views = document.querySelectorAll(".view");
const pageTitle = document.getElementById("pageTitle");
const todayLine = document.getElementById("todayLine");
const pendingRows = document.getElementById("pendingRows");
const supervisorRows = document.getElementById("supervisorRows");
const logoutBtn = document.getElementById("logoutBtn");

const TITLES = {
  approvals: "Approvals",
  supervisors: "Supervisors",
  projects: "Projects",
};

const ROLE_LABEL = {
  supervisor: "Supervisor",
  coordinator: "Coordinator",
  student: "Student",
};

let profile = null; // the signed-in coordinator

// ========== 2.0 Start ==========
// requireProfile sends anyone who is not an approved coordinator to their own page
async function init() {
  profile = await FYP.requireProfile("coordinator");
  if (!profile) return;

  todayLine.textContent = `${profile.full_name} · ${FYP.longToday()}`;
  await Promise.all([loadPending(), loadSupervisors()]);
  showSection(location.hash.replace("#", "") || "approvals");
}

// ========== 3.0 Approvals ==========
// Accounts still waiting. Their role is the one they chose at sign-up
async function loadPending() {
  try {
    const rows = await FYP.run(
      FYP.sb
        .from("profiles")
        .select("id, email, full_name, role, created_at")
        .eq("status", "pending")
        .order("created_at", { ascending: true }),
    );
    renderPending(rows);
  } catch (e) {
    FYP.showToast(FYP.errText(e));
    renderPending([]);
  }
}

function renderPending(rows) {
  if (!rows.length) {
    pendingRows.innerHTML = `
      <li class="row" style="cursor: default;">
        <div class="main"><small>Nobody is waiting for approval.</small></div>
      </li>`;
    return;
  }

  pendingRows.innerHTML = rows
    .map(
      (p) => `
      <li class="row" style="cursor: default;">
        <span class="progress-ring" style="--pct: 100; --ring-c: var(--accent); --ink: var(--text);">
          <i class="ri-user-line"></i>
        </span>
        <div class="main">
          <strong>${FYP.esc(p.full_name)}</strong>
          <small>${FYP.esc(p.email)} · Requested: ${FYP.esc(ROLE_LABEL[p.role] || p.role)}</small>
        </div>
        <button class="btn btn-primary btn-small" data-approve="${p.id}" data-role="${p.role}">Approve</button>
        <button class="link-btn danger" data-reject="${p.id}">Reject</button>
      </li>`,
    )
    .join("");

  pendingRows.querySelectorAll("[data-approve]").forEach((btn) => {
    btn.addEventListener("click", () =>
      approve(btn.dataset.approve, btn.dataset.role),
    );
  });
  pendingRows.querySelectorAll("[data-reject]").forEach((btn) => {
    btn.addEventListener("click", () => reject(btn.dataset.reject));
  });
}

// Approving runs approve_user, which checks in the database that the caller is a coordinator
async function approve(id, role) {
  try {
    await FYP.run(FYP.sb.rpc("approve_user", { p_user: id, p_role: role }));
    FYP.showToast("Account approved");
    await Promise.all([loadPending(), loadSupervisors()]);
  } catch (e) {
    FYP.showToast(FYP.errText(e));
  }
}

async function reject(id) {
  if (
    !confirm("Reject this account? The person will not be able to use FYPilot.")
  )
    return;
  try {
    await FYP.run(FYP.sb.rpc("reject_user", { p_user: id }));
    FYP.showToast("Account rejected");
    await loadPending();
  } catch (e) {
    FYP.showToast(FYP.errText(e));
  }
}

// ========== 4.0 Supervisors ==========
// Workload comes from the supervisor_workload view, which counts each supervisor's projects
async function loadSupervisors() {
  try {
    const rows = await FYP.run(
      FYP.sb
        .from("supervisor_workload")
        .select("supervisor_id, full_name, students, capacity, over_capacity"),
    );
    renderSupervisors(rows);
  } catch (e) {
    FYP.showToast(FYP.errText(e));
    renderSupervisors([]);
  }
}

function renderSupervisors(rows) {
  if (!rows.length) {
    supervisorRows.innerHTML = `
      <li class="row" style="cursor: default;">
        <div class="main"><small>No approved supervisors yet.</small></div>
      </li>`;
    return;
  }

  supervisorRows.innerHTML = rows
    .map((s) => {
      const pct = Math.min(100, Math.round((s.students / s.capacity) * 100));
      return `
        <li class="row" style="cursor: default;">
          <span class="progress-ring" style="--pct: ${pct}; --ring-c: var(--primary); --ink: var(--primary);">
            <span>${s.students}</span>
          </span>
          <div class="main">
            <strong>${FYP.esc(s.full_name)}</strong>
            <small>${s.students} of ${s.capacity} students</small>
          </div>
          <span class="tag ${s.over_capacity ? "attention" : "ontrack"}">
            ${s.over_capacity ? "Over capacity" : "Within limit"}
          </span>
        </li>`;
    })
    .join("");
}

// ========== 5.0 Sections ==========
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

// ========== 6.0 Event Wiring ==========
themeToggle.addEventListener("click", () => FYP.toggleTheme(root, themeToggle));

navButtons.forEach((btn) => {
  btn.addEventListener("click", () => showSection(btn.dataset.section));
});

logoutBtn.addEventListener("click", () => FYP.signOut());

// ========== 7.0 Start ==========
init();
