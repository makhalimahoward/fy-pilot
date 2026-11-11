// ========== 1.0 Elements ==========
const root = document.documentElement;
const themeToggle = document.getElementById("themeToggle");

const auth = document.getElementById("auth");
const modal = document.getElementById("modal");
const loginForm = document.getElementById("loginForm");
const loginEmail = document.getElementById("loginEmail");
const loginPassword = document.getElementById("loginPassword");
const signupForm = document.getElementById("signupForm");
const signupName = document.getElementById("signupName");
const signupEmail = document.getElementById("signupEmail");
const signupPassword = document.getElementById("signupPassword");
const signupRole = document.getElementById("signupRole");
const msgLogin = document.getElementById("authMsgLogin");
const msgSignup = document.getElementById("authMsgSignup");

// ========== 2.0 Theme Toggle ==========
themeToggle.addEventListener("click", () => FYP.toggleTheme(root, themeToggle));
if (root.getAttribute("data-theme") === "dark")
  themeToggle.querySelector("i").className = "ri-sun-line";

// ========== 3.0 Modal Open and Close ==========
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

// Shows a message under the chosen form
function say(box, text, isError = false) {
  box.textContent = text;
  box.classList.toggle("error", isError);
}

// ========== 4.0 Event Wiring ==========
// The buttons always open the form. An existing session never skips it,
// so anyone can log in as someone else after logging out
document.querySelectorAll("[data-open]").forEach((btn) => {
  btn.addEventListener("click", () => openAuth(btn.dataset.open));
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

// ========== 5.0 Friendly Errors ==========
// Turns Supabase's messages into short ones people can act on
function friendly(error) {
  const m = (error && error.message) || "Something went wrong";
  if (/Invalid login credentials/i.test(m)) return "Email or password is wrong";
  if (/Email not confirmed/i.test(m))
    return "Confirm your email first. Check your inbox for the link";
  if (/already registered|already been registered/i.test(m))
    return "An account with this email already exists. Log in instead";
  if (/Password should be at least/i.test(m))
    return "Use a password of at least 6 characters";
  return FYP.errText(error);
}

// ========== 6.0 Log In ==========
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  say(msgLogin, "Logging in…");

  const { error } = await FYP.sb.auth.signInWithPassword({
    email: loginEmail.value.trim().toLowerCase(),
    password: loginPassword.value,
  });
  if (error) {
    say(msgLogin, friendly(error), true);
    return;
  }
  routeByRole();
});

// ========== 7.0 Sign Up ==========
// Test mode: any email is accepted. The role picker decides the role, and the database
// trigger applies it. Students are approved at once, staff and coordinators wait for approval
signupForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  say(msgSignup, "Creating your account…");

  const { data, error } = await FYP.sb.auth.signUp({
    email: signupEmail.value.trim().toLowerCase(),
    password: signupPassword.value,
    options: {
      data: {
        full_name: signupName.value.trim(),
        requested_role: signupRole.value,
      },
      emailRedirectTo: returnAddress(),
    },
  });
  if (error) {
    say(msgSignup, friendly(error), true);
    return;
  }

  // With email confirmation on, there is no session until the link is opened
  if (data.session) {
    routeByRole();
  } else {
    say(
      msgSignup,
      "Check your inbox and open the confirmation link, then log in.",
    );
  }
});

// The page the confirmation link returns to
function returnAddress() {
  return window.location.origin + window.location.pathname;
}

// ========== 8.0 Routing by Role ==========
// Sends the person to the page for the role stored in their profile.
// Pending accounts still go to their page, which explains the wait. Rejected accounts are signed out
let routing = false;
async function routeByRole() {
  if (routing) return;
  routing = true;

  const {
    data: { session },
  } = await FYP.sb.auth.getSession();
  if (!session) {
    routing = false;
    return;
  }

  const { data: profile, error } = await FYP.sb
    .from("profiles")
    .select("role, status")
    .eq("id", session.user.id)
    .maybeSingle();

  if (error) {
    routing = false;
    say(msgLogin, FYP.errText(error), true);
    return;
  }
  if (!profile) {
    routing = false;
    say(
      msgLogin,
      "Your account is still being set up. Try again in a moment.",
      true,
    );
    return;
  }
  if (profile.status === "rejected") {
    routing = false;
    say(msgLogin, "This account is not allowed to use FYPilot.", true);
    await FYP.sb.auth.signOut();
    return;
  }

  window.location.replace(FYP.ROLE_PAGE[profile.role] || "student.html");
}

// ========== 9.0 Confirmation Links ==========
// When someone opens the confirmation link, Supabase puts the session in the address.
// Pick it up, then route them to their dashboard
if (window.location.hash.includes("access_token")) {
  openAuth("login");
  say(msgLogin, "Finishing sign-in…");
  FYP.sb.auth.onAuthStateChange((event, session) => {
    if (session && (event === "SIGNED_IN" || event === "INITIAL_SESSION")) {
      routeByRole();
    }
  });
}
