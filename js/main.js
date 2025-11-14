// /js/main.js
import { state } from "./state.js";
// state를 전역으로 노출 (index.html에서 사용하기 위해)
if (typeof window !== 'undefined') {
  window.state = state;
}
import { registerRenderer, scheduleRender, saf, showAlert } from "./utils.js";
import {
  loginWithStudent,
  verifyAutoLogin,
  logoutUser,
  loginWithKakao,
} from "./auth.js";
import {
  renderReservationTab,
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
        <div class="flex items-center gap-3">
          ${user.kakaoProfileImage 
            ? `<img src="${user.kakaoProfileImage}" alt="프로필" class="w-10 h-10 rounded-full border-2 border-orange-300" />`
            : `<div class="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-yellow-400 flex items-center justify-center text-white font-bold text-lg">${user.name?.charAt(0) || "U"}</div>`
          }
          <div>
        <p class="text-gray-700 text-base md:text-lg">
          <b id="userNameDisplay">${saf(user.name)}</b>님, 환영합니다!
        </p>
            ${user.kakaoUserId 
              ? `<p class="text-xs text-gray-500 flex items-center gap-1"><i class="fas fa-comment-dots text-yellow-500"></i>카카오 계정 연동됨</p>`
              : ""
            }
          </div>
        </div>
        <button id="logout-button" type="button" class="text-sm md:text-base text-gray-500 hover:text-red-500">로그아웃</button>
      </div>

      <div class="mb-6 md:mb-8 bg-gray-200 rounded-lg p-1 sm:p-2 flex flex-wrap justify-center gap-2" id="tab-buttons">
        <button type="button" data-tab="reservation" class="tab-btn flex-1 py-2 px-3 sm:px-4 rounded-md font-semibold text-gray-700 active">
          <i class="fas fa-plane-departure mr-2"></i>신청하기
        </button>
        <button type="button" data-tab="suggestions" class="tab-btn flex-1 py-2 px-3 sm:px-4 rounded-md font-semibold text-gray-700">
          <i class="fas fa-lightbulb mr-2"></i>아이디어 건의
        </button>
        <button type="button" data-tab="mypage" class="tab-btn flex-1 py-2 px-3 sm:px-4 rounded-md font-semibold text-gray-700">
          <i class="fas fa-user mr-2"></i>마이페이지
        </button>
        <button type="button" data-tab="dashboard" class="tab-btn flex-1 py-2 px-3 sm:px-4 rounded-md font-semibold text-gray-700 ${
          isAdmin ? "" : "hidden"
        }">
          <i class="fas fa-crown mr-2"></i>관리자 대시보드
        </button>
      </div>

      <div id="tab-content-container">
        <div id="reservation-tab" class="tab-content active"></div>
        <div id="suggestions-tab" class="tab-content"></div>
        <div id="mypage-tab" class="tab-content"></div>
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

      // 신청하기 탭이 활성화될 때 renderReservationTab 호출
      if (name === "reservation") {
        renderReservationTab(isAdmin);
      }
      // 마이페이지 탭이 활성화될 때 renderMyPageTab 호출
      if (name === "mypage") {
        import("./mypage.js").then((module) => {
          module.renderMyPageTab();
        });
      }
      // 관리자 대시보드 탭이 활성화될 때 renderDashboardTab 호출
      if (name === "dashboard" && isAdmin) {
        renderDashboardTab();
      }
    });

    // 탭 렌더
    console.log("js/main.js에서 renderReservationTab 호출");
    console.log("state.currentUser:", state.currentUser);
    console.log("state.currentUser?.kakaoUserId:", state.currentUser?.kakaoUserId);

    // 즉시 호출 (초기 렌더링)
    renderReservationTab(isAdmin);
    
    // state.currentUser가 업데이트될 수 있으므로 약간의 지연 후 재호출
    setTimeout(() => {
      console.log("setTimeout으로 renderReservationTab 재호출 (kakaoUserId 확인용)");
      console.log("state.currentUser?.kakaoUserId:", state.currentUser?.kakaoUserId);
      renderReservationTab(isAdmin);
    }, 2000);
    renderSuggestionsTab(isAdmin);
    // 마이페이지 탭 초기 렌더
    import("./mypage.js").then((module) => {
      module.renderMyPageTab();
    });
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

  // 카카오 로그인 버튼 핸들러 (전역 함수로 등록)
  window.handleKakaoLogin = async function(e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    console.log("카카오 로그인 버튼 클릭됨");
    
    // 카카오 SDK 초기화 확인
    if (typeof Kakao === "undefined") {
      showAlert("😥", "카카오 SDK가 로드되지 않았습니다.");
      return;
    }
    
      // 전역 초기화 함수 사용 (중복 초기화 방지)
      if (Kakao.isInitialized()) {
        console.log("카카오 SDK는 이미 초기화되어 있습니다.");
      } else if (typeof window.initKakaoSDK === "function") {
        window.initKakaoSDK();
      } else {
        const KAKAO_JS_KEY = "28869968a8cfea9a996172c117d64eb2";
        if (KAKAO_JS_KEY) {
          try {
            Kakao.init(KAKAO_JS_KEY);
            console.log("카카오 SDK 초기화 완료");
          } catch (error) {
            console.error("카카오 SDK 초기화 오류:", error);
          }
        }
      }
    
    if (!Kakao.isInitialized()) {
      showAlert("😥", "카카오 SDK 초기화에 실패했습니다.");
      return;
    }
    
    try {
      const ok = await loginWithKakao();
      if (ok) {
        // ✅ 로그인 성공 → 화면 갱신
        scheduleRender();
      }
    } catch (error) {
      console.error("카카오 로그인 오류:", error);
      showAlert("😥", "카카오 로그인 중 오류가 발생했습니다.");
    }
  };
  
  // 이벤트 리스너도 추가 (onclick과 함께 작동)
  function setupKakaoLoginButton() {
    const attachButton = () => {
      const btn = document.getElementById("kakao-login-button");
      if (btn && !btn.dataset.listenerAttached) {
        btn.dataset.listenerAttached = "true";
        btn.addEventListener("click", window.handleKakaoLogin);
        console.log("카카오 로그인 버튼 이벤트 리스너 연결 완료");
      }
    };
    
    // 즉시 실행
    attachButton();
    // DOMContentLoaded 후에도 실행
    document.addEventListener("DOMContentLoaded", attachButton);
    // 렌더링 후에도 실행
    const originalScheduleRender = scheduleRender;
    window.scheduleRender = function() {
      originalScheduleRender();
      setTimeout(attachButton, 100);
    };
  }
  
  // 즉시 실행
  setupKakaoLoginButton();

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
