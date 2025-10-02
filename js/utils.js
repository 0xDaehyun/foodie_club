import { state } from "./state.js";

let __renderQueued = false;
let __renderer = null;

export const registerRenderer = (fn) => {
  __renderer = fn;
};
export const scheduleRender = () => {
  if (__renderQueued || !__renderer) return;
  __renderQueued = true;
  requestAnimationFrame(() => {
    __renderQueued = false;
    __renderer();
  });
};

export const showAlert = (icon, msg) => {
  const elIcon = document.getElementById("modal-icon");
  const elMsg = document.getElementById("alert-message");
  const modal = document.getElementById("alert-modal");
  if (elIcon) elIcon.innerHTML = icon || "ℹ️";
  if (elMsg) elMsg.innerHTML = msg || "";
  if (modal) modal.classList.remove("hidden");
};
export const closeModal = () =>
  document.getElementById("alert-modal")?.classList.add("hidden");
export const closeEmergencyModal = () =>
  document.getElementById("emergency-modal")?.classList.add("hidden");

export const mask = (sid) => (sid ? `${sid.slice(0, 4)}****` : "");
export const isWithin = (d, s, e) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const S = s ? new Date(s) : null,
    E = e ? new Date(e) : null;
  if (S) S.setHours(0, 0, 0, 0);
  if (E) E.setHours(23, 59, 59, 999);
  return (!S || x >= S) && (!E || x <= E);
};
export const isSignupOpen = () => {
  if (state.signupSettings.open) return true;
  const hasStart = !!(
    state.signupSettings.start && state.signupSettings.start.trim()
  );
  const hasEnd = !!(
    state.signupSettings.end && state.signupSettings.end.trim()
  );
  if (!hasStart && !hasEnd) return false;
  const today = new Date().toISOString().slice(0, 10);
  return isWithin(
    today,
    hasStart ? state.signupSettings.start : null,
    hasEnd ? state.signupSettings.end : null
  );
};
export const isUserIn = (arr = []) =>
  arr?.some((p) => p.studentId === state.currentUser?.studentId);
export const formatKRW = (n) => {
  const v = Number(n || 0);
  return isNaN(v) ? "" : v.toLocaleString("ko-KR") + "원";
};
export const timeAgo = (ms) => {
  const diff = (Date.now() - ms) / 1000;
  if (diff < 60) return `${Math.max(0, Math.floor(diff))}초 전`;
  const m = diff / 60;
  if (m < 60) return `${Math.floor(m)}분 전`;
  return `${Math.floor(m / 60)}시간 전`;
};

export const typeLabel = (t) =>
  ({ tasting: "미식회", general: "일반 이벤트", mt: "MT", assembly: "총회" }[
    t
  ] || t);
export const typeBadgeClass = (t) =>
  t === "tasting"
    ? "bg-purple-100 text-purple-700"
    : t === "mt"
    ? "bg-blue-100 text-blue-700"
    : t === "assembly"
    ? "bg-pink-100 text-pink-700"
    : "bg-emerald-100 text-emerald-700";
export const typeAccentClass = (t) =>
  t === "tasting"
    ? "accent-tasting"
    : t === "mt"
    ? "accent-mt"
    : t === "assembly"
    ? "accent-assembly"
    : "accent-general";
export const statusLabel = (s) => ({ open: "공개", archived: "숨김" }[s] || s);
export const saf = (x) =>
  window.DOMPurify ? DOMPurify.sanitize(String(x ?? "")) : String(x ?? "");
