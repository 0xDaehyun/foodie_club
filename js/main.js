// /js/main.js  (교체본)
import { initAuthAndStart, login, logout, verifyAutoLogin } from "./auth.js";
import { state } from "./state.js";
import { startPublicListeners, ensureAdminOptionals } from "./listeners.js";
import { startPresence, bindPresenceToggles } from "./presence.js";
import { renderBlocks, renderRoadmap } from "./prelogin.js";
import { updateSignupUI, openSignupModal, confirmSignup } from "./signup.js";
import { registerRenderer, closeModal, showAlert } from "./utils.js";
import { renderAll } from "./tabs.js";
import { addEmergencyAdmin } from "./system.js";
import { USE_DEMO_OFFLINE } from "./firebase.js"; // ✅ 추가

// 렌더러 등록
registerRenderer(() => {
  const isLoggedIn = !!state.currentUser;
  if (!isLoggedIn) {
    renderRoadmap();
    renderBlocks();
    updateSignupUI();
  } else {
    renderAll();
  }
});

async function main() {
  try {
    await initAuthAndStart();
  } catch {}
  // ✅ 로컬(file://)이면 데모 데이터 허용
  startPublicListeners(USE_DEMO_OFFLINE);

  const saved = JSON.parse(localStorage.getItem("foodieUser") || "null");
  if (saved) {
    state.currentUser = saved;
    verifyAutoLogin(saved).catch(() => {});
    startPresence();
  }

  setTimeout(
    () => document.getElementById("loading-screen")?.classList.add("hidden"),
    700
  );

  // 로그인/회원가입 버튼
  document.getElementById("login-button")?.addEventListener("click", login);
  document
    .getElementById("signup-button")
    ?.addEventListener("click", openSignupModal);
  document
    .getElementById("signup-cancel-button")
    ?.addEventListener("click", () =>
      document.getElementById("signup-modal").classList.add("hidden")
    );
  document
    .getElementById("signup-confirm-button")
    ?.addEventListener("click", () => confirmSignup(false));
  document
    .getElementById("dues-proceed-button")
    ?.addEventListener("click", () => {
      document.getElementById("dues-modal").classList.add("hidden");
      confirmSignup(true);
    });
  document
    .getElementById("dues-cancel-button")
    ?.addEventListener("click", () =>
      document.getElementById("dues-modal").classList.add("hidden")
    );
  document.getElementById("dues-copy-button")?.addEventListener("click", () => {
    const d = state.duesSettings || {};
    const text = [d.bank, d.number].filter(Boolean).join(" ");
    navigator.clipboard
      ?.writeText(text)
      .then(() => showAlert("✅", "계좌번호가 복사되었습니다."));
  });

  // 모달 공용
  document
    .getElementById("modal-close-button")
    ?.addEventListener("click", closeModal);

  // 비상 복구
  document
    .getElementById("emergency-cancel-button")
    ?.addEventListener("click", () =>
      document.getElementById("emergency-modal").classList.add("hidden")
    );
  document
    .getElementById("emergency-add-button")
    ?.addEventListener("click", addEmergencyAdmin);

  // 프레즌스 토글
  bindPresenceToggles();

  // 최초 렌더
  renderRoadmap();
  renderBlocks();
  updateSignupUI();
}
main();

// 로그아웃 버튼은 로그인 후 동적으로 생김 — 위임 방식으로 처리
document.addEventListener("click", (e) => {
  const btn = e.target.closest("#logout-button");
  if (btn) logout();
});

// 앱 부트 성공 플래그 (로더 안전장치용)
window.__FOODIE_BOOT_OK__ = true;
