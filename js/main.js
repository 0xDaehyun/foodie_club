// /js/main.js
import { state } from "./state.js";
import { registerRenderer, scheduleRender, saf } from "./utils.js";
import { loginWithStudent, verifyAutoLogin, logoutUser } from "./auth.js";
import {
  renderReservationTab,
  renderHistoryTab,
  renderSuggestionsTab,
  renderDashboardTab,
} from "./tabs.js";

/**
 * 렌더러
 * - state.currentUser 유무로 로그인 전/후 화면 토글
 */
function renderAll() {
  const pre = document.getElementById("pre-login-info");
  const main = document.getElementById("main-content");

  const user = state.currentUser;
  const isAdmin = !!(user && state.adminList?.includes(user.studentId));

  if (!pre || !main) return;

  if (user) {
    // 로그인 후
    pre.classList.add("hidden");
    main.classList.remove("hidden");

    // 상단 레이아웃 + 탭 셸 생성
    main.innerHTML = `
      <div class="flex items-center justify-between mb-4 md:mb-6">
        <p class="text-gray-700 text-base md:text-lg">
          <b id="userNameDisplay">${saf(user.name)}</b>님, 환영합니다!
        </p>
        <button id="logout-button" type="button" class="text-sm md:text-base text-gray-500 hover:text-red-500">로그아웃</button>
      </div>

      <div class="mb-6 md:mb-8 bg-gray-200 rounded-lg p-1 sm:p-2 flex flex-wrap justify-center gap-2" id="tab-buttons">
        <button type="button" data-tab="reservation" class="tab-btn flex-1 py-2 px-3 sm:px-4 rounded-md font-semibold text-gray-700 active">
          <i class="fas fa-plane-departure mr-2"></i>신청하기
        </button>
        <button type="button" data-tab="history" class="tab-btn flex-1 py-2 px-3 sm:px-4 rounded-md font-semibold text-gray-700">
          <i class="fas fa-box-archive mr-2"></i>보관(명예의 전당)
        </button>
        <button type="button" data-tab="suggestions" class="tab-btn flex-1 py-2 px-3 sm:px-4 rounded-md font-semibold text-gray-700">
          <i class="fas fa-lightbulb mr-2"></i>아이디어 건의
        </button>
        <button type="button" data-tab="dashboard" class="tab-btn flex-1 py-2 px-3 sm:px-4 rounded-md font-semibold text-gray-700 ${
          isAdmin ? "" : "hidden"
        }">
          <i class="fas fa-crown mr-2"></i>관리자 대시보드
        </button>
      </div>

      <div id="tab-content-container">
        <div id="reservation-tab" class="tab-content active"></div>
        <div id="history-tab" class="tab-content"></div>
        <div id="suggestions-tab" class="tab-content"></div>
        <div id="dashboard-tab" class="tab-content"></div>
      </div>
    `;

    // 탭 전환 핸들러
    const tabHost = document.getElementById("tab-buttons");
    tabHost?.addEventListener("click", (e) => {
      const btn = e.target.closest(".tab-btn");
      if (!btn) return;
      const name = btn.dataset.tab;
      // 버튼 스타일
      document
        .querySelectorAll(".tab-btn")
        .forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      // 콘텐츠 토글
      document
        .querySelectorAll(".tab-content")
        .forEach((t) => t.classList.remove("active"));
      document.getElementById(`${name}-tab`)?.classList.add("active");
    });

    // 탭 렌더
    renderReservationTab(isAdmin);
    renderHistoryTab(isAdmin);
    renderSuggestionsTab(isAdmin);
    if (isAdmin) renderDashboardTab();

    // 로그아웃
    document
      .getElementById("logout-button")
      ?.addEventListener("click", logoutUser);
  } else {
    // 로그인 전
    main.classList.add("hidden");
    pre.classList.remove("hidden");
  }
}

/**
 * 부팅
 */
async function boot() {
  // 렌더러 등록
  registerRenderer(renderAll);

  // 로그인 버튼
  document
    .getElementById("login-button")
    ?.addEventListener("click", async () => {
      const sid = document.getElementById("studentId")?.value || "";
      const nm = document.getElementById("studentName")?.value || "";
      const ok = await loginWithStudent(sid, nm);
      if (ok) {
        // ✅ 로그인 성공 → 화면 갱신
        scheduleRender();
      }
    });

  // 자동 로그인 시도
  const saved = JSON.parse(localStorage.getItem("foodieUser") || "null");
  if (saved) {
    await verifyAutoLogin(saved);
  }

  // 최초 렌더
  scheduleRender();
}

// 즉시 실행
boot();
