// ========== 1.0 Supabase Client ==========
// Shared by every page. The anon key is public by design: row-level security in the database
// decides what each signed-in user can read or change. Never put the service_role key here
const SUPABASE_URL = "https://pnkkijuoebgbnaipvpom.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBua2tpanVvZWJnYm5haXB2cG9tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM3OTMwMjYsImV4cCI6MjEwOTM2OTAyNn0.i1Jr3KgIAX4L12L6coTzJ8PiKpZQzbgEpygzAqRhLvE";

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

const ROLE_PAGE = {
  student: "student.html",
  supervisor: "supervisor.html",
  coordinator: "coordinator.html",
};

// ========== 2.0 Helpers ==========
// Escapes text before it goes into innerHTML, so database text can never inject markup
function esc(text) {
  const div = document.createElement("div");
  div.textContent = text == null ? "" : String(text);
  return div.innerHTML;
}

// Today as YYYY-MM-DD in the browser's own time zone
function todayISO() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

// Date-only strings are read as local dates so they never shift by a day
function toDate(iso) {
  return new Date(String(iso).length === 10 ? iso + "T00:00:00" : iso);
}

function formatDate(iso) {
  if (!iso) return "";
  return toDate(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function longToday() {
  return new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function daysBetween(fromISO, toISO) {
  return Math.round((toDate(toISO) - toDate(fromISO)) / 86400000);
}

function daysSince(iso) {
  return daysBetween(iso, todayISO());
}

function initials(name) {
  return (name || "?")
    .replace(/^(Dr|Prof|Mr|Mrs|Ms)\.?\s+/i, "")
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

// Milestone status shown to people. It follows the due date, so a late milestone is overdue
// the moment its date passes, without waiting for the nightly job
function milestoneStatus(m) {
  if (m.status === "done") return "done";
  const left = daysBetween(todayISO(), m.due_date);
  if (left < 0) return "overdue";
  if (left <= 7) return "soon";
  return "upcoming";
}

// Colour, icon and label for a milestone status, using the NUST palette
function statusStyle(status) {
  const map = {
    done: {
      icon: "ri-check-line",
      pct: 100,
      ring: "var(--primary)",
      ink: "var(--primary)",
      tag: "done",
      label: "Complete",
    },
    overdue: {
      icon: "ri-error-warning-line",
      pct: 100,
      ring: "var(--accent)",
      ink: "var(--text)",
      tag: "overdue",
      label: "Overdue",
    },
    soon: {
      icon: "ri-time-line",
      pct: 50,
      ring: "var(--accent)",
      ink: "var(--text)",
      tag: "soon",
      label: "Due soon",
    },
    upcoming: {
      icon: "ri-circle-line",
      pct: 0,
      ring: "var(--text-muted)",
      ink: "var(--text-muted)",
      tag: "upcoming",
      label: "Upcoming",
    },
  };
  return map[status];
}

// Progress is completed milestones divided by total milestones
function progressOf(milestones) {
  if (!milestones.length) return 0;
  return Math.round(
    (100 * milestones.filter((m) => m.status === "done").length) /
      milestones.length,
  );
}

let toastTimer;
function showToast(message) {
  const el = document.getElementById("toast");
  if (!el) return;
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 3200);
}

// Turns a Supabase error into a short message people can act on
function errText(error) {
  const m =
    (error && (error.message || error.error_description)) ||
    "Something went wrong";
  if (/row-level security/i.test(m)) return "You are not allowed to do that";
  if (/Failed to fetch|NetworkError/i.test(m))
    return "No connection. Check your internet and try again";
  return m;
}

// Runs a Supabase query and throws on error, so pages can use try/catch
async function run(query) {
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

function toggleTheme(root, button) {
  const isDark = root.getAttribute("data-theme") === "dark";
  root.setAttribute("data-theme", isDark ? "light" : "dark");
  button.querySelector("i").className = isDark ? "ri-moon-line" : "ri-sun-line";
  try {
    localStorage.setItem("fypilot-theme", isDark ? "light" : "dark");
  } catch (e) {}
}

// Restores the saved theme as early as possible
(function restoreTheme() {
  try {
    const t = localStorage.getItem("fypilot-theme");
    if (t) document.documentElement.setAttribute("data-theme", t);
  } catch (e) {}
})();

// ========== 3.0 Auth Guard ==========
// Every dashboard calls this first. It returns the signed-in profile, or sends the person away.
// The role is read from the database, never from the browser
function gateScreen(icon, title, text) {
  document.body.innerHTML = `
    <div class="gate">
      <div class="gate-card glass">
        <i class="${icon}"></i>
        <h2>${esc(title)}</h2>
        <p>${esc(text)}</p>
        <button class="btn btn-primary" id="gateOut">Log out</button>
      </div>
    </div>`;
  document.getElementById("gateOut").addEventListener("click", signOut);
}

async function requireProfile(expectedRole) {
  const {
    data: { session },
  } = await sb.auth.getSession();
  if (!session) {
    window.location.replace("index.html");
    return null;
  }
  const { data: profile, error } = await sb
    .from("profiles")
    .select("id, email, full_name, role, status, reg_number")
    .eq("id", session.user.id)
    .maybeSingle();

  if (error || !profile) {
    gateScreen(
      "ri-error-warning-line",
      "Could not load your account",
      "Please log out and sign in again. If it keeps happening, contact the coordinator.",
    );
    return null;
  }
  if (profile.status === "pending") {
    gateScreen(
      "ri-hourglass-line",
      "Waiting for approval",
      `${profile.email} is registered as staff. The coordinator has to approve your account before you can continue.`,
    );
    return null;
  }
  if (profile.status === "rejected") {
    gateScreen(
      "ri-forbid-line",
      "This email is not allowed",
      "FYPilot accepts NUST accounts only. Students sign in with their NUST number, e.g. N0245678T@students.nust.ac.zw.",
    );
    return null;
  }
  if (profile.role !== expectedRole) {
    window.location.replace(ROLE_PAGE[profile.role]);
    return null;
  }
  return profile;
}

async function signOut() {
  await sb.auth.signOut();
  window.location.replace("index.html");
}

// ========== 4.0 Notifications ==========
// Loads the person's notifications into the bell. Opening the panel marks them as read
async function setupBell({ bellBtn, panel, badge }) {
  if (!bellBtn || !panel) return;
  let items = [];

  async function load() {
    try {
      items = await run(
        sb
          .from("notifications")
          .select("id, title, body, read, created_at")
          .order("created_at", { ascending: false })
          .limit(15),
      );
    } catch (e) {
      items = [];
    }
    const unread = items.filter((n) => !n.read).length;
    if (badge) {
      badge.textContent = unread;
      badge.style.display = unread ? "" : "none";
    }
    panel.innerHTML =
      "<h4>Notifications</h4>" +
      (items.length
        ? items
            .map(
              (n) =>
                `<div class="notif-item"><strong>${esc(n.title)}</strong><small>${esc(n.body || "")}${n.body ? " · " : ""}${esc(formatDate(n.created_at))}</small></div>`,
            )
            .join("")
        : `<div class="notif-item"><small>No notifications yet.</small></div>`);
  }

  bellBtn.addEventListener("click", async (e) => {
    e.stopPropagation();
    const opening = !panel.classList.contains("open");
    panel.classList.toggle("open");
    if (opening && items.some((n) => !n.read)) {
      await sb.rpc("mark_notifications_read");
      if (badge) badge.style.display = "none";
      items = items.map((n) => ({ ...n, read: true }));
    }
  });
  document.addEventListener("click", (e) => {
    if (!panel.contains(e.target) && !bellBtn.contains(e.target))
      panel.classList.remove("open");
  });
  await load();
  return load;
}

// Opens a private file from Storage for a short time
async function openStoredFile(path) {
  const { data, error } = await sb.storage
    .from("documents")
    .createSignedUrl(path, 120);
  if (error) {
    showToast(errText(error));
    return;
  }
  window.open(data.signedUrl, "_blank", "noopener");
}

window.FYP = {
  sb,
  esc,
  todayISO,
  toDate,
  formatDate,
  longToday,
  daysBetween,
  daysSince,
  initials,
  milestoneStatus,
  statusStyle,
  progressOf,
  showToast,
  errText,
  run,
  toggleTheme,
  requireProfile,
  signOut,
  setupBell,
  openStoredFile,
  ROLE_PAGE,
};
