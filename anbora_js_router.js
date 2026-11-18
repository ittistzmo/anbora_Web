const PUBLIC_ROUTES = ["/welcome", "/register", "/login", "/forgot-password"];
const NAV_ROUTES = ["/dashboard", "/checkin", "/sos", "/companion", "/contacts"];

let currentUser = null;
let onRouteChangeCallback = null;

export function setRouterUser(user) {
  currentUser = user;
}

export function onRouteChange(cb) {
  onRouteChangeCallback = cb;
}

export function navigate(path) {
  if (!path.startsWith("/")) path = "/" + path;
  window.location.hash = "#" + path;
}

export function renderRoute() {
  let rawHash = window.location.hash.replace(/^#/, "");
  if (!rawHash || rawHash === "/") {
    rawHash = currentUser ? "/dashboard" : "/welcome";
  }

  // Auth guard
  if (!currentUser && !PUBLIC_ROUTES.includes(rawHash)) {
    rawHash = "/welcome";
  }
  if (currentUser && PUBLIC_ROUTES.includes(rawHash)) {
    rawHash = "/dashboard";
  }

  const screens = document.querySelectorAll(".screen");
  let matched = false;
  screens.forEach((screen) => {
    const target = screen.getAttribute("data-screen");
    if (target === rawHash) {
      screen.classList.add("active");
      matched = true;
    } else {
      screen.classList.remove("active");
    }
  });

  if (!matched) {
    const fallback = document.getElementById(currentUser ? "screen-dashboard" : "screen-welcome");
    if (fallback) fallback.classList.add("active");
  }

  // Toggle header and bottom nav visibility
  const header = document.getElementById("app-header");
  const bottomNav = document.getElementById("bottom-nav");
  if (currentUser) {
    header?.classList.remove("hidden");
    bottomNav?.classList.remove("hidden");
  } else {
    header?.classList.add("hidden");
    bottomNav?.classList.add("hidden");
  }

  // Highlight active bottom nav tab
  document.querySelectorAll(".bottom-nav .nav-item").forEach((btn) => {
    const route = btn.getAttribute("data-route");
    if (route === rawHash || (!NAV_ROUTES.includes(rawHash) && route === "/dashboard")) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });

  if (typeof onRouteChangeCallback === "function") {
    onRouteChangeCallback(rawHash);
  }
}

export function initRouter() {
  window.addEventListener("hashchange", renderRoute);
  document.addEventListener("click", (e) => {
    const trigger = e.target.closest("[data-route]");
    if (trigger) {
      e.preventDefault();
      navigate(trigger.getAttribute("data-route"));
    }
  });
}
