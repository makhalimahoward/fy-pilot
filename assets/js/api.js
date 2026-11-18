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

// ========== 10.0 Document Reader and Comments ==========
// Shared by the student and supervisor pages. Shows a document's text with its comments attached,
// and runs the back and forth between the two people. Needs the reader panel on the page
FYP.reader = (() => {
  let current = null; // { docId, role } while the reader is open
  let bound = false;
  let changed = null; // called after any comment action, so the page can refresh its lists
  let myId = null; // the signed-in person, so their own messages sit on the right

  const $ = (id) => document.getElementById(id);

  const STATUS = {
    open: ["overdue", "Open"],
    addressed: ["soon", "Addressed"],
    resolved: ["done", "Resolved"],
  };

  // The document text, its comments, and the replies to each comment
  async function load(docId) {
    const doc = await run(
      sb
        .from("documents")
        .select("id, name, version, text_content")
        .eq("id", docId)
        .single(),
    );
    const comments = await run(
      sb
        .from("document_comments")
        .select(
          "id, quote, body, status, created_at, author_id, author:profiles!author_id(full_name), replies:comment_replies(id, body, created_at, author_id, author:profiles!author_id(full_name))",
        )
        .eq("document_id", docId)
        .order("created_at", { ascending: true }),
    );
    return { doc, comments };
  }

  // A short line is a heading when it is numbered (such as "3. Problem Statement"),
  // starts with a usual section word, or is written in capitals
  function isHeading(block) {
    if (block.includes("\n") || block.length > 90) return false;
    if (/^\d+(\.\d+)*\.?\s+\S/.test(block)) return true;
    if (
      /^(abstract|introduction|conclusion|references|bibliography|appendix|acknowledgements?|chapter\s+\d+)\b/i.test(
        block,
      )
    )
      return true;
    return (
      block === block.toUpperCase() &&
      /[A-Z]/.test(block) &&
      block.split(" ").length <= 8
    );
  }

  // Groups the text into sections under its headings, and marks the quoted words of each comment
  function paragraphs(text, comments, role) {
    const items = text
      .split(/\n\s*\n/)
      .map((b) => b.trim())
      .filter(Boolean)
      .map((b) => ({ heading: isHeading(b), html: esc(b), raw: b }));

    comments.forEach((c) => {
      if (!c.quote) return;
      const quote = esc(c.quote);
      const item = items.find((it) => it.html.includes(quote));
      if (item) {
        item.html = item.html.replace(
          quote,
          `<mark class="cmt cmt-${c.status}" data-mark="${c.id}">${quote}</mark>`,
        );
      }
    });

    let out = "";
    let open = false;
    items.forEach((it) => {
      if (it.heading) {
        if (open) out += "</details>";
        const sectionBtn =
          role === "supervisor"
            ? `<button type="button" class="sec-comment" data-quote="${it.raw.replace(/"/g, "&quot;")}">Comment on section</button>`
            : "";
        out += `<details class="sec" open><summary>${it.html}${sectionBtn}</summary>`;
        open = true;
      } else {
        out += `<p>${it.html}</p>`;
      }
    });
    if (open) out += "</details>";
    return out;
  }

  // One message in the conversation. Your own messages sit on the right, the other person's on the left
  function bubble(name, body, time, mine) {
    return `<div class="chat-row ${mine ? "mine" : "theirs"}">
      <div class="chat-msg">
        <small class="chat-name">${esc(name)}</small>
        <p>${esc(body)}</p>
        <small class="chat-time">${formatDate(time.slice(0, 10))}</small>
      </div>
    </div>`;
  }

  function card(c, role) {
    const [cls, label] = STATUS[c.status] || STATUS.open;
    const replies = (c.replies || [])
      .slice()
      .sort((a, b) => a.created_at.localeCompare(b.created_at));
    const canAddress = role === "student" && c.status === "open";
    const canResolve = role === "supervisor" && c.status === "addressed";
    const thread = [
      bubble(
        c.author ? c.author.full_name : "Unknown",
        c.body,
        c.created_at,
        c.author_id === myId,
      ),
      ...replies.map((r) =>
        bubble(
          r.author ? r.author.full_name : "Unknown",
          r.body,
          r.created_at,
          r.author_id === myId,
        ),
      ),
    ].join("");
    return `<article class="cm" id="cm-${c.id}">
      <header class="cm-head">
        <strong>${esc(c.quote ? "On this section" : "Comment")}</strong>
        <span class="tag ${cls}">${label}</span>
      </header>
      ${c.quote ? `<blockquote class="cm-quote">${esc(c.quote)}</blockquote>` : ""}
      <div class="chat">${thread}</div>
      <div class="cm-actions">
        ${canAddress ? `<button class="btn btn-small ghost" data-addressed="${c.id}">Mark as addressed</button>` : ""}
        ${canResolve ? `<button class="btn btn-small ghost" data-resolve="${c.id}">Resolve</button>` : ""}
      </div>
      ${
        c.status !== "resolved"
          ? `<form class="cm-reply-form" data-reply="${c.id}">
            <input type="text" placeholder="Reply…" required>
            <button type="submit" class="btn btn-primary btn-small">Send</button>
          </form>`
          : ""
      }
    </article>`;
  }

  function render(data, role) {
    $("readerKicker").textContent =
      role === "supervisor" ? "Review" : "Your document";
    $("readerTitle").textContent =
      `${data.doc.name} · version ${data.doc.version}`;
    $("readerText").innerHTML = data.doc.text_content
      ? paragraphs(data.doc.text_content, data.comments, role)
      : `<p class="cm-empty">This file has no readable text. Open the file to read it.</p>`;
    $("readerSide").innerHTML = data.comments.length
      ? data.comments.map((c) => card(c, role)).join("")
      : `<p class="cm-empty">No comments yet.</p>`;
    $("addComment").hidden = true;
  }

  async function refresh() {
    if (current) render(await load(current.docId), current.role);
  }

  // Puts the reader below the list on the current page, so the list stays in view above it
  function place() {
    const view = document.querySelector(".view.active");
    if (view) view.appendChild($("readerPanel"));
  }

  async function open(docId, role) {
    current = { docId, role };
    const {
      data: { session },
    } = await sb.auth.getSession();
    myId = session ? session.user.id : null;
    place();
    $("readerPanel").hidden = false;
    try {
      render(await load(docId), role);
    } catch (e) {
      showToast(errText(e));
    }
    $("readerPanel").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function close() {
    $("readerPanel").hidden = true;
    current = null;
  }

  // Runs a database action, then reloads the reader so both sides see the change
  async function act(fn, params, done) {
    try {
      await run(sb.rpc(fn, params));
      showToast(done);
      await refresh();
      if (changed) changed();
    } catch (e) {
      showToast(errText(e));
    }
  }

  function init() {
    sb.auth.getSession().then(({ data: { session } }) => {
      myId = session ? session.user.id : null;
    });
    if (bound || !$("readerPanel")) return;
    bound = true;

    $("readerClose").addEventListener("click", close);

    // The Comment on section button opens the comment box for that whole section
    $("readerText").addEventListener("click", (e) => {
      const btn = e.target.closest(".sec-comment");
      if (!btn) return;
      e.preventDefault();
      $("composer").dataset.quote = btn.dataset.quote;
      $("composerQuote").textContent = `On section "${btn.dataset.quote}"`;
      $("composer").hidden = false;
      $("composerBody").focus();
    });

    // Supervisors select words in the text, then can comment on them
    $("readerText").addEventListener("mouseup", () => {
      const sel = window.getSelection();
      const quote = sel ? sel.toString().trim() : "";
      const inside =
        sel && sel.anchorNode && $("readerText").contains(sel.anchorNode);
      const show =
        current && current.role === "supervisor" && inside && quote.length > 2;
      $("addComment").hidden = !show;
      if (show) $("addComment").dataset.quote = quote;
    });

    $("addComment").addEventListener("click", () => {
      $("composer").dataset.quote = $("addComment").dataset.quote;
      $("composerQuote").textContent = `On "${$("addComment").dataset.quote}"`;
      $("composer").hidden = false;
      $("addComment").hidden = true;
      $("composerBody").focus();
    });

    $("composer").addEventListener("submit", async (e) => {
      e.preventDefault();
      const body = $("composerBody").value.trim();
      if (!body) return showToast("Write the comment first");
      await act(
        "add_comment",
        {
          p_doc: current.docId,
          p_quote: $("composer").dataset.quote || null,
          p_body: body,
        },
        "Comment posted",
      );
      $("composerBody").value = "";
      $("composer").hidden = true;
    });

    // Clicking highlighted words jumps to their comment. Buttons on comments do their action
    $("readerPanel").addEventListener("click", (e) => {
      const mark = e.target.closest("mark[data-mark]");
      if (mark) {
        const card = document.getElementById(`cm-${mark.dataset.mark}`);
        if (card) card.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }
      const addressed = e.target.closest("[data-addressed]");
      if (addressed) {
        return act(
          "mark_comment_addressed",
          { p_comment: addressed.dataset.addressed },
          "Marked as addressed",
        );
      }
      const resolve = e.target.closest("[data-resolve]");
      if (resolve) {
        return act(
          "resolve_comment",
          { p_comment: resolve.dataset.resolve },
          "Comment resolved",
        );
      }
    });

    $("readerPanel").addEventListener("submit", (e) => {
      const form = e.target.closest("[data-reply]");
      if (!form) return;
      e.preventDefault();
      const body = form.querySelector("input").value.trim();
      if (!body) return;
      act(
        "reply_comment",
        { p_comment: form.dataset.reply, p_body: body },
        "Reply sent",
      );
    });
  }

  function onChange(fn) {
    changed = fn;
  }

  return { open, close, init, onChange, card };
})();
