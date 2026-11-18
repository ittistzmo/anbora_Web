export function showToast(message, type = "info") {
  const container = document.getElementById("toast-container");
  if (!container) return;
  const toast = document.createElement("div");
  toast.className = `toast ${type === "error" ? "error" : ""}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transition = "opacity 0.25s ease";
    setTimeout(() => toast.remove(), 260);
  }, 3600);
}

export function formatTimestamp(ts) {
  if (!ts) return "Not yet recorded";
  const date = typeof ts === "number" ? new Date(ts) : (ts.toDate ? ts.toDate() : new Date(ts));
  if (Number.isNaN(date.getTime())) return "Invalid date";
  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export function formatCountdown(msRemaining) {
  if (msRemaining <= 0) return "00h 00m (Escalating)";
  const totalMinutes = Math.floor(msRemaining / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}h ${String(minutes).padStart(2, "0")}m`;
}

export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());
}

export function isValidPhone(phone) {
  return /^\+?[0-9\s\-()]{8,18}$/.test(String(phone || "").trim());
}

export function generateIdempotencyKey(uid, windowBucket) {
  return `${uid}_${windowBucket}`;
}

export function getCurrentHourBucket(nowMs = Date.now()) {
  return Math.floor(nowMs / (60 * 60 * 1000));
}
