// ========== 1.0 Elements ==========
const root = document.documentElement;
const themeToggle = document.getElementById("themeToggle");

const auth = document.getElementById("auth");
const modal = document.getElementById("modal");
const googleLogin = document.getElementById("googleLogin");
const googleSignup = document.getElementById("googleSignup");
const msgs = [
  document.getElementById("authMsgLogin"),
  document.getElementById("authMsgSignup"),
];

// ========== 2.0 Theme Toggle ==========
themeToggle.addEventListener("click", () => FYP.toggleTheme(root, themeToggle));
if (root.getAttribute("data-theme") === "dark")
  themeToggle.querySelector("i").className = "ri-sun-line";

// ========== 3.0 Auth Open and Close ==========
function openAuth(mode) {
  setMode(mode);
  auth.classList.add("open");
}
function closeAuth() {
  auth.classList.remove("open");
}
function setMode(mode) {
  modal.classList.toggle("signup", mode === "signup");
}
function say(text, isError = false) {
  msgs.forEach((m) => {
    m.textContent = text;
    m.classList.toggle("error", isError);
  });
}

// ========== 4.0 Event Wiring ==========
document.querySelectorAll("[data-open]").forEach((btn) => {
  btn.addEventListener("click", async () => {
    // Someone already signed in goes straight to their dashboard
    const {
      data: { session },
    } = await FYP.sb.auth.getSession();
    if (session) return routeByRole();
    openAuth(btn.dataset.open);
  });
});
document
  .querySelectorAll(".side-btn")
  .forEach((btn) =>
    btn.addEventListener("click", () => setMode(btn.dataset.mode)),
  );
document.getElementById("closeAuth").addEventListener("click", closeAuth);
auth.addEventListener("click", (e) => {
  if (e.target === auth) closeAuth();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeAuth();
});

// ========== 5.0 Google Sign-in ==========
// Login and sign-up are the same Google step. The database creates the profile on first sign-in
// and decides the role from the email address
async function googleSignIn(button) {
  say("Opening Google…");
  button.disabled = true;
  sessionStorage.setItem("fypilot-signing-in", "1");
  const { error } = await FYP.sb.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: window.location.origin + window.location.pathname,
      queryParams: { prompt: "select_account" },
    },
  });
  if (error) {
    sessionStorage.removeItem("fypilot-signing-in");
    button.disabled = false;
    say(FYP.errText(error), true);
  }
}
googleLogin.addEventListener("click", () => googleSignIn(googleLogin));
googleSignup.addEventListener("click", () => googleSignIn(googleSignup));

// ========== 6.0 Routing After Sign-in ==========
// Sends the person to the page for the role stored in their profile
async function routeByRole() {
  const {
    data: { session },
  } = await FYP.sb.auth.getSession();
  if (!session) return;
  const { data: profile } = await FYP.sb
    .from("profiles")
    .select("role, status")
    .eq("id", session.user.id)
    .maybeSingle();
  // Pending and rejected people still land on their page, which explains their status
  window.location.href = FYP.ROLE_PAGE[(profile && profile.role) || "student"];
}

// Returning from Google: wait for the session, then route
(async function afterRedirect() {
  const params = new URLSearchParams(window.location.search);
  const failed =
    params.get("error_description") ||
    new URLSearchParams(window.location.hash.slice(1)).get("error_description");
  if (failed) {
    openAuth("login");
    say(failed.replace(/\+/g, " "), true);
    sessionStorage.removeItem("fypilot-signing-in");
    return;
  }
  if (!sessionStorage.getItem("fypilot-signing-in")) return;

  FYP.sb.auth.onAuthStateChange((event, session) => {
    if (event === "SIGNED_IN" && session) {
      sessionStorage.removeItem("fypilot-signing-in");
      routeByRole();
    }
  });
  const {
    data: { session },
  } = await FYP.sb.auth.getSession();
  if (session) {
    sessionStorage.removeItem("fypilot-signing-in");
    routeByRole();
  }
})();
