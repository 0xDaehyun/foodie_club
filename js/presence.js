import { db, doc, setDoc, serverTimestamp } from "./firebase.js";
import { state } from "./state.js";
import { timeAgo, mask, saf } from "./utils.js";
import { el } from "./elements.js";

export function startPresence() {
  if (!state.currentUser) return;
  try {
    const ref = doc(db, "presence", state.currentUser.studentId);
    const ping = () =>
      setDoc(
        ref,
        {
          studentId: state.currentUser.studentId,
          name: state.currentUser.name,
          ua: navigator.userAgent,
          lastActiveMs: Date.now(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    ping();
    if (state.presenceTimer) clearInterval(state.presenceTimer);
    state.presenceTimer = setInterval(ping, 25000);
    const end = () => ping();
    window.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") end();
      else ping();
    });
    window.addEventListener("pagehide", end);
    window.addEventListener("beforeunload", end);
  } catch (e) {
    console.warn("presence start err", e);
  }
}

export function stopPresence() {
  if (state.presenceTimer) {
    clearInterval(state.presenceTimer);
    state.presenceTimer = null;
  }
}

export function computeOnline() {
  const threshold = Date.now() - 60 * 1000;
  state.onlineUsers = state.presenceData
    .filter((p) => (p.lastActiveMs || 0) >= threshold)
    .sort((a, b) => b.lastActiveMs - a.lastActiveMs);
}

export function renderPresenceUI() {
  const isAdmin =
    state.currentUser && state.adminList.includes(state.currentUser.studentId);
  if (!isAdmin) {
    el.presenceBadge.classList.add("hidden");
    el.presencePop.classList.add("hidden");
    return;
  }
  el.presenceBadge.classList.remove("hidden");
  el.presenceCount.textContent = state.onlineUsers.length;
  el.presenceList.innerHTML = state.onlineUsers.length
    ? state.onlineUsers
        .map(
          (u) =>
            `<div class="flex items-center justify-between py-1"><div class="truncate"><b>${saf(
              u.name || ""
            )}</b> <span class="text-xs text-gray-500 font-mono">${mask(
              u.studentId
            )}</span></div><div class="text-xs text-gray-500 ml-2">${timeAgo(
              u.lastActiveMs || 0
            )}</div></div>`
        )
        .join("")
    : `<div class="text-gray-400">지금은 접속자가 없습니다.</div>`;
}

export function bindPresenceToggles() {
  document.addEventListener("click", (e) => {
    if (
      !e.target.closest("#presence-badge") &&
      !e.target.closest("#presence-pop")
    )
      el.presencePop.classList.add("hidden");
  });
  document
    .getElementById("presence-badge")
    ?.addEventListener("click", () =>
      el.presencePop.classList.toggle("hidden")
    );
}
