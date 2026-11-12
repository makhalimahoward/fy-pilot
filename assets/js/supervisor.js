// ========== 1.0 Elements ==========
const root = document.documentElement;
const themeToggle = document.getElementById("themeToggle");
const navButtons = document.querySelectorAll(".nav-btn[data-section]");
const views = document.querySelectorAll(".view");
const pageTitle = document.getElementById("pageTitle");
const todayLine = document.getElementById("todayLine");
const topicRows = document.getElementById("topicRows");
const newTopic = document.getElementById("newTopic");
const drawerWrap = document.getElementById("drawerWrap");
const closeTopic = document.getElementById("closeTopic");
const topicForm = document.getElementById("topicForm");
const topicTitle = document.getElementById("topicTitle");
const topicDesc = document.getElementById("topicDesc");
const topicObjectives = document.getElementById("topicObjectives");
const topicTech = document.getElementById("topicTech");
const topicReqs = document.getElementById("topicReqs");
const logoutBtn = document.getElementById("logoutBtn");

const TITLES = {
  topics: "My topics",
  students: "Students",
  reviews: "Reviews",
};

// How each topic status looks. Text always appears with the colour
const STATUS = {
  pending: { tag: "soon", label: "Awaiting approval" },
  open: { tag: "ontrack", label: "Open to students" },
  taken: { tag: "done", label: "Taken" },
  withdrawn: { tag: "upcoming", label: "Withdrawn" },
};

let profile = null; // the signed-in supervisor
let topics = []; // this supervisor's topics, newest first

// ========== 2.0 Start ==========
// requireProfile sends anyone who is not an approved supervisor to their own page
async function init() {
  profile = await FYP.requireProfile("supervisor");
  if (!profile) return;

  todayLine.textContent = `${profile.full_name} · ${FYP.longToday()}`;
  await loadTopics();
  showSection(location.hash.replace("#", "") || "topics");
}

// ========== 3.0 Topics ==========
// Loads only this supervisor's topics. Row-level security limits what the database returns
async function loadTopics() {
  try {
    topics = await FYP.run(
      FYP.sb
        .from("topics")
        .select("id, code, title, technologies, status, created_at")
        .eq("supervisor_id", profile.id)
        .order("created_at", { ascending: false }),
    );
  } catch (e) {
    FYP.showToast(FYP.errText(e));
    topics = [];
  }
  renderTopics();
}

function renderTopics() {
  if (!topics.length) {
    topicRows.innerHTML = `
      <li class="row" style="cursor: default;">
        <div class="main"><small>You haven't posted any topics yet. Use New topic to add one.</small></div>
      </li>`;
    return;
  }

  topicRows.innerHTML = topics
    .map((t) => {
      const s = STATUS[t.status] || STATUS.pending;
      // A topic can be withdrawn only while it is pending or open, not once a student has it
      const canWithdraw = t.status === "pending" || t.status === "open";
      return `
        <li class="row" style="cursor: default;">
          <div class="main">
            <strong>${FYP.esc(t.code)} · ${FYP.esc(t.title)}</strong>
            <small>${FYP.esc(t.technologies || "No technologies listed")}</small>
          </div>
          <span class="tag ${s.tag}">${s.label}</span>
          ${canWithdraw ? `<button class="link-btn danger" data-withdraw="${t.id}">Withdraw</button>` : ""}
        </li>`;
    })
    .join("");

  topicRows.querySelectorAll("[data-withdraw]").forEach((btn) => {
    btn.addEventListener("click", () => withdrawTopic(btn.dataset.withdraw));
  });
}

// Withdrawing sets the status to withdrawn. Students stop seeing the topic at once
async function withdrawTopic(id) {
  if (!confirm("Withdraw this topic? Students will no longer see it.")) return;
  try {
    await FYP.run(
      FYP.sb.from("topics").update({ status: "withdrawn" }).eq("id", id),
    );
    FYP.showToast("Topic withdrawn");
    await loadTopics();
  } catch (e) {
    FYP.showToast(FYP.errText(e));
  }
}

// ========== 4.0 New Topic Drawer ==========
function openTopic() {
  topicForm.reset();
  drawerWrap.classList.add("open");
  topicTitle.focus();
}

function closeTopicDrawer() {
  drawerWrap.classList.remove("open");
}

// Saves the topic as pending. The database gives it a code such as T001
topicForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const title = topicTitle.value.trim();
  if (!title) return;

  try {
    await FYP.run(
      FYP.sb.from("topics").insert({
        supervisor_id: profile.id,
        title,
        description: topicDesc.value.trim() || null,
        objectives: topicObjectives.value.trim() || null,
        technologies: topicTech.value.trim() || null,
        other_requirements: topicReqs.value.trim() || null,
        status: "pending",
      }),
    );
    closeTopicDrawer();
    FYP.showToast("Topic submitted for approval");
    await loadTopics();
  } catch (err) {
    FYP.showToast(FYP.errText(err));
  }
});

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
  if (name === "students") loadStudents();
  if (name === "reviews") loadReviews();
}

// ========== 6.0 Event Wiring ==========
themeToggle.addEventListener("click", () => FYP.toggleTheme(root, themeToggle));

navButtons.forEach((btn) => {
  btn.addEventListener("click", () => showSection(btn.dataset.section));
});

newTopic.addEventListener("click", openTopic);
closeTopic.addEventListener("click", closeTopicDrawer);
drawerWrap.addEventListener("click", (e) => {
  if (e.target === drawerWrap) closeTopicDrawer();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeTopicDrawer();
});

logoutBtn.addEventListener("click", () => FYP.signOut());

// ========== 7.0 Start ==========
init();

// ========== 8.0 Students and Reviews ==========
const studentsBody = document.getElementById("studentsBody");
const reviewsBody = document.getElementById("reviewsBody");

const MILESTONE_TAGS = {
  done: ["done", "Complete"],
  overdue: ["overdue", "Overdue"],
  soon: ["soon", "Due soon"],
  upcoming: ["upcoming", "Upcoming"],
};

// Every project this supervisor is responsible for, with its milestones and documents
async function loadProjects() {
  return FYP.run(
    FYP.sb
      .from("projects")
      .select(
        "id, title, allocated_at, student:profiles!student_id(full_name), milestones(id, position, title, due_date, status), documents(id, name, version, status, reviewer_comment, created_at, storage_path, milestone_id)",
      )
      .eq("supervisor_id", profile.id)
      .order("allocated_at", { ascending: false }),
  );
}

async function loadStudents() {
  try {
    const projects = await loadProjects();
    studentsBody.innerHTML = projects.length
      ? projects
          .map((p) => {
            const ms = p.milestones
              .slice()
              .sort((a, b) => a.position - b.position);
            return `<div class="student-block">
              <p class="section-label">${FYP.esc(p.student ? p.student.full_name : "Student")}</p>
              <p class="lead">${FYP.esc(p.title)}</p>
              <ul class="rows">
                ${ms
                  .map((m) => {
                    const st = FYP.milestoneStatus(m);
                    const [cls, label] = MILESTONE_TAGS[st];
                    const approved = p.documents.some(
                      (d) => d.milestone_id === m.id && d.status === "approved",
                    );
                    return `<li class="row" style="cursor: default;">
                      <div class="main">
                        <strong>${FYP.esc(m.title)}</strong>
                        <small>Due ${FYP.formatDate(m.due_date)}${approved ? " · has an approved document" : ""}</small>
                      </div>
                      <span class="tag ${cls}">${label}</span>
                      ${st === "done" ? "" : `<button class="btn btn-primary btn-small" data-complete="${m.id}">Mark complete</button>`}
                    </li>`;
                  })
                  .join("")}
              </ul>
            </div>`;
          })
          .join("")
      : `<p class="lead">No students have picked one of your topics yet.</p>`;
  } catch (e) {
    FYP.showToast(FYP.errText(e));
  }
}

// Marking complete needs an approved document in that milestone. The database checks it
studentsBody.addEventListener("click", async (e) => {
  const btn = e.target.closest("[data-complete]");
  if (!btn) return;
  try {
    await FYP.run(
      FYP.sb.rpc("complete_milestone", { p_milestone: btn.dataset.complete }),
    );
    FYP.showToast("Milestone complete");
    await loadStudents();
  } catch (err) {
    FYP.showToast(FYP.errText(err));
  }
});

async function loadReviews() {
  try {
    const projects = await loadProjects();
    const waiting = projects.flatMap((p) =>
      p.documents
        .filter((d) => d.status === "review")
        .map((d) => ({
          d,
          p,
          m: p.milestones.find((x) => x.id === d.milestone_id),
        })),
    );
    reviewsBody.innerHTML = waiting.length
      ? waiting
          .map(
            ({
              d,
              p,
              m,
            }) => `<div class="row" style="flex-wrap: wrap; cursor: default;">
              <div class="main">
                <strong>${FYP.esc(d.name)}</strong>
                <small>${FYP.esc(p.student ? p.student.full_name : "Student")} · ${FYP.esc(m ? m.title : "")} · version ${d.version}</small>
              </div>
              <button class="link-btn" data-open="${FYP.esc(d.storage_path)}">Open</button>
              <button class="btn btn-primary btn-small" data-approve="${d.id}">Approve</button>
              <button class="btn btn-small ghost" data-changes="${d.id}">Request changes</button>
              <div class="comment-box" id="comment-${d.id}" style="flex-basis: 100%;">
                <textarea rows="2" placeholder="What should the student change?"></textarea>
                <button class="btn btn-primary btn-small comment-send" data-send="${d.id}">Send</button>
              </div>
            </div>`,
          )
          .join("")
      : `<p class="lead">Nothing is waiting for review.</p>`;
  } catch (e) {
    FYP.showToast(FYP.errText(e));
  }
}

// Approve, request changes, open the file, or send the requested changes
reviewsBody.addEventListener("click", async (e) => {
  const open = e.target.closest("[data-open]");
  if (open) return FYP.openStoredFile(open.dataset.open);

  const approve = e.target.closest("[data-approve]");
  if (approve) {
    try {
      await FYP.run(
        FYP.sb.rpc("review_document", {
          p_doc: approve.dataset.approve,
          p_decision: "approved",
          p_comment: null,
        }),
      );
      FYP.showToast("Document approved");
      await loadReviews();
    } catch (err) {
      FYP.showToast(FYP.errText(err));
    }
    return;
  }

  const changes = e.target.closest("[data-changes]");
  if (changes) {
    document
      .getElementById(`comment-${changes.dataset.changes}`)
      .classList.toggle("open");
    return;
  }

  const send = e.target.closest("[data-send]");
  if (send) {
    const box = document.getElementById(`comment-${send.dataset.send}`);
    const comment = box.querySelector("textarea").value.trim();
    if (!comment) return FYP.showToast("Write what should change first");
    try {
      await FYP.run(
        FYP.sb.rpc("review_document", {
          p_doc: send.dataset.send,
          p_decision: "changes",
          p_comment: comment,
        }),
      );
      FYP.showToast("Changes requested");
      await loadReviews();
    } catch (err) {
      FYP.showToast(FYP.errText(err));
    }
  }
});
