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
let toastTimer;
function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2400);
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
