// ========== 1.0 Elements ==========
const root = document.documentElement;
const themeToggle = document.getElementById("themeToggle");
const navButtons = document.querySelectorAll(".nav-btn[data-section]");
const views = document.querySelectorAll(".view");
const bellBtn = document.getElementById("bellBtn");
const notifPanel = document.getElementById("notifPanel");
const fabBtn = document.getElementById("fabBtn");
const fabPanel = document.getElementById("fabPanel");
const toast = document.getElementById("toast");
const logoutBtn = document.getElementById("logoutBtn");

// ========== 2.0 Theme Toggle ==========
// Universal: switches light and dark by changing data-theme on <html>
function toggleTheme() {
  const isDark = root.getAttribute("data-theme") === "dark";
  root.setAttribute("data-theme", isDark ? "light" : "dark");

  themeToggle.querySelector("i").className = isDark
    ? "ri-moon-line"
    : "ri-sun-line";
}

// ========== 3.0 Section Switching ==========
// Student only: shows one section at a time and keeps the sidebar highlight in step
function showSection(name) {
  if (!document.getElementById(name)) return;

  views.forEach((view) => view.classList.toggle("active", view.id === name));
  navButtons.forEach((btn) =>
    btn.classList.toggle("active", btn.dataset.section === name),
  );

  closeNotifications();
  window.scrollTo({ top: 0, behavior: "smooth" });
  history.replaceState(null, "", "#" + name);
}

// ========== 4.0 Notifications ==========
// Student only: the bell opens and closes a short list of notifications
function closeNotifications() {
  notifPanel.classList.remove("open");
}

// ========== 5.0 Assistant Panel ==========
// Student only: placeholder assistant panel
function toggleFab() {
  fabPanel.classList.toggle("open");
}

// ========== 6.0 Toast ==========
// Student only: short message for actions that need the backend
let pageToastTimer;
function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(pageToastTimer);
  pageToastTimer = setTimeout(() => toast.classList.remove("show"), 2400);
}

// ========== 7.0 Event Wiring ==========
// Universal: theme toggle
themeToggle.addEventListener("click", toggleTheme);

// Student only: sidebar navigation
navButtons.forEach((btn) => {
  btn.addEventListener("click", () => showSection(btn.dataset.section));
});

// Student only: links inside a page that jump to another section, such as See milestones or Upload
document.querySelectorAll("[data-go]").forEach((btn) => {
  btn.addEventListener("click", () => showSection(btn.dataset.go));
});

// Student only: buttons that show a message instead of acting yet
document.querySelectorAll("[data-toast]").forEach((btn) => {
  btn.addEventListener("click", () => showToast(btn.dataset.toast));
});

// Student only: bell opens and closes the notification list
bellBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  notifPanel.classList.toggle("open");
});

// Student only: a click anywhere else closes the notification list
document.addEventListener("click", (e) => {
  if (!notifPanel.contains(e.target) && e.target !== bellBtn) {
    closeNotifications();
  }
});

// Student only: assistant button
fabBtn.addEventListener("click", toggleFab);

// Student only: escape closes the open panels
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeNotifications();
    fabPanel.classList.remove("open");
  }
});

// Student only: log out returns to the landing page (no session until the backend is connected)
logoutBtn.addEventListener("click", () => {
  window.location.href = "index.html";
});

// ========== 7.5 Banner Carousel ==========
// Student only: rotates the three banner slides every few seconds, and the dots jump to a slide
const slides = document.querySelectorAll("#banner .slide");
const slideDots = document.querySelectorAll("#banner .dot-btn");
let slideIndex = 0;
let slideTimer;

function showSlide(index) {
  slideIndex = (index + slides.length) % slides.length;
  slides.forEach((slide, i) =>
    slide.classList.toggle("active", i === slideIndex),
  );
  slideDots.forEach((dot, i) =>
    dot.classList.toggle("active", i === slideIndex),
  );
}

function startSlides() {
  clearInterval(slideTimer);
  slideTimer = setInterval(() => showSlide(slideIndex + 1), 6000);
}

slideDots.forEach((dot) => {
  dot.addEventListener("click", () => {
    showSlide(Number(dot.dataset.slide));
    startSlides();
  });
});

startSlides();

// ========== 7.8 Feedback Checklist ==========
// Student only: ticking an action marks it done. The header count follows. The supervisor's note is not changed
const openCount = document.getElementById("openCount");
const actionButtons = document.querySelectorAll(".act");

function refreshOpenCount() {
  const open = document.querySelectorAll(".act.open").length;
  openCount.textContent = open === 1 ? "1 open action" : `${open} open actions`;
}

actionButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const isDone = btn.classList.toggle("done");
    btn.classList.toggle("open", !isDone);
    btn.setAttribute("aria-pressed", String(isDone));
    btn.querySelector("i").className = isDone
      ? "ri-checkbox-circle-fill"
      : "ri-checkbox-blank-circle-line";
    btn.querySelector("small").textContent = isDone ? "Done" : btn.dataset.due;
    refreshOpenCount();
  });
});

refreshOpenCount();

// ========== 8.0 Initial Section ==========
// Student only: opens the section named in the URL hash, or the home section
showSection(location.hash.replace("#", "") || "dashboard");

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
