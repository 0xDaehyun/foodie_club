// /js/tabs.js
import { state } from "./state.js";
import { saf, typeLabel, typeBadgeClass } from "./utils.js";
import { renderPresenceUI, computeOnline } from "./presence.js";
import {
  adminEventsPanelHTML,
  bindAdminEventsPanel,
  eventCardHTML,
  reserveGeneral,
  cancelGeneral,
  reserveTasting,
  cancelTasting,
  loadEventToForm,
  archiveEvent,
  unarchiveEvent,
  deleteEvent,
  exportApplicantsXLSX,
} from "./events.js";
// 필요 함수만 임포트 (미사용이던 renderHomeBlocksAdmin 제거)
import { renderDashboardTab } from "./dashboard.js";
import { renderSuggestionsTab as renderSuggestionsTabImpl } from "./suggestions.js";

/* 로그인 후 전체 렌더 */
export function renderAll() {
  const isAdmin =
    state.currentUser && state.adminList.includes(state.currentUser.studentId);
  if (state.currentUser) {
    document.getElementById("pre-login-info").classList.add("hidden");
    const main = document.getElementById("main-content");
    main.innerHTML = `
      <div class="flex items-center justify-between mb-4 md:mb-6">
        <p class="text-gray-700 text-base md:text-lg"><b id="userNameDisplay">${saf(
          state.currentUser.name
        )}</b>님, 환영합니다!</p>
        <button id="logout-button" type="button" class="text-sm md:text-base text-gray-500 hover:text-red-500">로그아웃</button>
      </div>
      <div class="mb-6 md:mb-8 bg-gray-200 rounded-lg p-1 sm:p-2 flex flex-wrap justify-center gap-2" id="tab-buttons">
        <button type="button" data-tab="reservation" class="tab-btn flex-1 py-2 px-3 sm:px-4 rounded-md font-semibold text-gray-700 active"><i class="fas fa-plane-departure mr-2"></i>신청하기</button>
        <button type="button" data-tab="suggestions" class="tab-btn flex-1 py-2 px-3 sm:px-4 rounded-md font-semibold text-gray-700"><i class="fas fa-lightbulb mr-2"></i>아이디어 건의</button>
        <button type="button" data-tab="dashboard" class="tab-btn flex-1 py-2 px-3 sm:px-4 rounded-md font-semibold text-gray-700 ${
          isAdmin ? "" : "hidden"
        }"><i class="fas fa-crown mr-2"></i>관리자 대시보드</button>
      </div>
      <div id="tab-content-container">
        <div id="reservation-tab" class="tab-content active"></div>
        <div id="suggestions-tab" class="tab-content"></div>
        <div id="dashboard-tab" class="tab-content"></div>
      </div>`;
    main.classList.remove("hidden");

    document.getElementById("tab-buttons").addEventListener("click", (e) => {
      const btn = e.target.closest(".tab-btn");
      if (btn) showTab(btn.dataset.tab);
    });

    // 신청하기 탭
    renderReservationTab(isAdmin);

    document.getElementById(
      "suggestions-tab"
    ).innerHTML = `<div class="section text-gray-500">아이디어 건의 탭은 이후 코드에 맞춰 채워 넣으세요.</div>`;

    // 관리자 전용 탭
    if (isAdmin) renderDashboardTab();

    computeOnline();
    renderPresenceUI();
  } else {
    document.getElementById("pre-login-info").classList.remove("hidden");
    document.getElementById("main-content").classList.add("hidden");
  }
}

function showTab(name) {
  document
    .querySelectorAll(".tab-content")
    .forEach((t) => t.classList.remove("active"));
  document
    .querySelectorAll(".tab-btn")
    .forEach((b) => b.classList.remove("active"));
  document.getElementById(`${name}-tab`)?.classList.add("active");
  document
    .querySelector(`.tab-btn[data-tab='${name}']`)
    ?.classList.add("active");
}

function renderReservationTab(isAdmin) {
  console.log("=== renderReservationTab 함수 시작 ===");
  console.log("renderReservationTab 함수가 호출되었습니다!", isAdmin);
  console.log("state.currentUser:", state.currentUser);
  console.log(
    "state.currentUser?.kakaoUserId:",
    state.currentUser?.kakaoUserId
  );
  const c = document.getElementById("reservation-tab");
  console.log("reservation-tab 요소:", c);
  if (!c) {
    console.error("reservation-tab 요소를 찾을 수 없습니다!");
    return;
  }
  console.log("reservation-tab 요소를 찾았습니다:", c);

  const runningList =
    state.eventsData.filter(
      (e) => e.status !== "archived" && e.status !== "deleted"
    ).length === 0
      ? `<div class="text-center py-12"><i class="fas fa-calendar-xmark text-4xl text-gray-300"></i><p class="mt-3 text-gray-500">진행 중인 이벤트/미식회가 없습니다.</p></div>`
      : `<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          ${state.eventsData
            .filter((e) => e.status !== "archived" && e.status !== "deleted")
            .map(eventCardHTML)
            .join("")}
        </div>`;

  // 보관된 이벤트 목록 (관리자만)
  const archivedEvents = isAdmin
    ? state.eventsData.filter((e) => e.status === "archived")
    : [];

  // 내 활동 섹션 - 새로 재구성
  const participatedEvents = state.eventsData.filter((ev) => {
    if (!state.currentUser) return false;
    if (ev.status === "deleted") return false;

    const isApplicant = ev.applicants?.some(
      (a) => a.studentId === state.currentUser.studentId
    );

    let isRestaurantApplicant = false;
    if (ev.type === "tasting" && ev.restaurants) {
      isRestaurantApplicant = ev.restaurants.some((r) =>
        r.reservations?.some(
          (res) => res.studentId === state.currentUser.studentId
        )
      );
    }

    return isApplicant || isRestaurantApplicant;
  });

  // 카카오 연동 상태 확인
  const kakaoUserId = state.currentUser?.kakaoUserId;
  const hasKakaoAccount =
    kakaoUserId !== undefined &&
    kakaoUserId !== null &&
    kakaoUserId !== "" &&
    kakaoUserId !== 0 &&
    !(typeof kakaoUserId === "string" && kakaoUserId.trim() === "");

  const myActivityHTML = `
    <div class="section mt-6">
      <div class="bg-gradient-to-r from-orange-50 to-yellow-50 border-2 border-orange-200 rounded-xl overflow-hidden shadow-lg">
        <!-- 헤더 섹션 -->
        <div class="px-6 py-5 bg-gradient-to-r from-orange-500 to-yellow-500">
          <div class="flex items-center justify-between flex-wrap gap-4">
            <div class="flex items-center gap-4">
              <div class="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                <i class="fas fa-history text-white text-2xl"></i>
              </div>
              <div>
                <h4 class="text-xl font-bold text-white mb-1">내 활동</h4>
                <p class="text-orange-100 text-sm">참가했던 이벤트와 미식회를 확인하세요</p>
              </div>
            </div>
            ${
              !hasKakaoAccount
                ? `
            <button
              id="activity-kakao-link-btn"
              type="button"
              class="px-5 py-2.5 bg-[#FEE500] hover:bg-[#FDD835] text-gray-900 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center text-sm shadow-md hover:shadow-lg transform hover:scale-105"
            >
              <svg
                class="w-5 h-5 mr-2"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path
                  d="M12 3c5.799 0 10.5 3.664 10.5 8.185 0 4.52-4.701 8.184-10.5 8.184a13.5 13.5 0 0 1-1.727-.11l-4.408 2.883c-.501.265-.678.236-.472-.413l.892-3.678c-2.88-1.46-4.785-3.99-4.785-6.866C1.5 6.665 6.201 3 12 3z"
                />
              </svg>
              카카오 계정 연동하기
            </button>
            `
                : `
            <div class="px-4 py-2 bg-white/20 rounded-lg backdrop-blur-sm flex items-center gap-2">
              <i class="fas fa-check-circle text-white"></i>
              <span class="text-white text-sm font-medium">카카오 계정 연동됨</span>
            </div>
            `
            }
          </div>
        </div>
        
        <!-- 콘텐츠 섹션 -->
        <div class="pt-4 pb-6 px-4 sm:px-6">
          ${
            participatedEvents.length > 0
              ? `
          <div class="flex flex-col gap-4">
            ${participatedEvents
              .map((ev) => {
                const eventDate = new Date(ev.datetime);
                const dateStr = eventDate.toLocaleDateString("ko-KR", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                });
                const timeStr = eventDate.toLocaleTimeString("ko-KR", {
                  hour: "2-digit",
                  minute: "2-digit",
                });
                const hasReview = ev.reviews?.find(
                  (r) => r.studentId === state.currentUser.studentId
                );

                let restaurantName = "";
                if (
                  ev.type === "tasting" &&
                  ev.restaurants &&
                  state.currentUser
                ) {
                  for (const restaurant of ev.restaurants) {
                    if (
                      restaurant.reservations?.some(
                        (res) => res.studentId === state.currentUser.studentId
                      )
                    ) {
                      restaurantName = restaurant.name;
                      break;
                    }
                  }
                }

                const typeIcon =
                  ev.type === "tasting"
                    ? "🍽️"
                    : ev.type === "mt"
                    ? "🏕️"
                    : ev.type === "assembly"
                    ? "🎤"
                    : "📅";

                const typeLabel =
                  ev.type === "tasting"
                    ? "미식회"
                    : ev.type === "mt"
                    ? "MT"
                    : ev.type === "assembly"
                    ? "총회"
                    : "이벤트";

                return `
                <div class="w-full bg-white rounded-xl p-4 sm:p-5 border-2 border-orange-100 shadow-md hover:shadow-xl transition-all duration-200 hover:border-orange-300">
                  <div class="flex items-start gap-4 mb-4">
                    <div class="text-3xl">${typeIcon}</div>
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center gap-2 mb-2">
                        <span class="px-2 py-1 bg-orange-100 text-orange-700 text-xs font-semibold rounded">
                          ${typeLabel}
                        </span>
                      </div>
                      <h5 class="font-bold text-gray-800 text-lg mb-2 line-clamp-2">
                        ${ev.title || ev.activityName || "제목 없음"}
                      </h5>
                      <div class="space-y-1">
                        <p class="text-sm text-gray-600">
                          <i class="far fa-calendar mr-2 text-orange-500"></i>
                          ${dateStr}
                        </p>
                        <p class="text-sm text-gray-600">
                          <i class="far fa-clock mr-2 text-orange-500"></i>
                          ${timeStr}
                        </p>
                        ${
                          restaurantName
                            ? `
                        <p class="text-sm text-orange-600 font-semibold mt-2">
                          <i class="fas fa-utensils mr-2"></i>${restaurantName}
                        </p>
                        `
                            : ""
                        }
                      </div>
                    </div>
                  </div>
                  
                  <div class="flex items-center justify-between pt-4 border-t border-gray-100">
                    <div class="flex items-center gap-2 text-sm text-gray-600">
                      <i class="fas fa-users text-orange-500"></i>
                      <span class="font-medium">${
                        ev.applicants?.length || 0
                      }명 참가</span>
                    </div>
                    ${
                      hasReview
                        ? `
                    <span class="px-3 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full flex items-center gap-1">
                      <i class="fas fa-check-circle"></i>
                      후기 작성됨
                    </span>
                    `
                        : `
                    <button
                      onclick="openReviewModal('${ev.id}', '${ev.title || ""}')"
                      class="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1"
                    >
                      <i class="fas fa-star"></i>
                      후기 작성
                    </button>
                    `
                    }
                  </div>
                </div>
                `;
              })
              .join("")}
          </div>
          `
              : `
          <div class="text-center py-12">
            <div class="w-20 h-20 bg-gradient-to-br from-orange-100 to-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
              <i class="fas fa-calendar-check text-3xl text-orange-500"></i>
            </div>
            <h5 class="text-xl font-bold text-gray-800 mb-2">아직 참가한 활동이 없습니다</h5>
            <p class="text-gray-500 mb-6">이벤트나 미식회에 참가하면 여기에 표시됩니다</p>
            ${
              !hasKakaoAccount
                ? `
            <div class="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4 max-w-md mx-auto">
              <p class="text-sm text-gray-700 mb-3">
                <i class="fas fa-info-circle text-yellow-600 mr-2"></i>
                카카오 계정을 연동하면 더 편리하게 이용할 수 있습니다
              </p>
              <button
                id="activity-kakao-link-btn-empty"
                type="button"
                class="w-full px-4 py-2.5 bg-[#FEE500] hover:bg-[#FDD835] text-gray-900 rounded-lg font-semibold transition-colors flex items-center justify-center"
              >
                <svg
                  class="w-5 h-5 mr-2"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path
                    d="M12 3c5.799 0 10.5 3.664 10.5 8.185 0 4.52-4.701 8.184-10.5 8.184a13.5 13.5 0 0 1-1.727-.11l-4.408 2.883c-.501.265-.678.236-.472-.413l.892-3.678c-2.88-1.46-4.785-3.99-4.785-6.866C1.5 6.665 6.201 3 12 3z"
                  />
                </svg>
                카카오 계정 연동하기
              </button>
            </div>
            `
                : ""
            }
          </div>
          `
          }
        </div>
      </div>
    </div>
  `;

  // 보관된 이벤트 섹션 HTML 생성 (관리자만)
  const archivedEventsHTML = isAdmin
    ? `
    <div class="section mt-6">
      <div class="bg-yellow-50 border-2 border-yellow-200 rounded-xl overflow-hidden">
        <button 
          type="button" 
          id="archived-events-toggle"
          class="w-full px-6 py-4 flex items-center justify-between hover:bg-yellow-100 transition-colors"
        >
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-yellow-200 rounded-full flex items-center justify-center">
              <i class="fas fa-archive text-yellow-700"></i>
            </div>
            <div class="text-left">
              <h4 class="text-lg font-bold text-yellow-900">보관된 이벤트</h4>
              <p class="text-sm text-yellow-700">회장단만 볼 수 있는 숨김 처리된 ${
                archivedEvents.length
              }개의 이벤트</p>
            </div>
          </div>
          <i class="fas fa-chevron-down text-yellow-700 text-xl transition-transform" id="archived-toggle-icon"></i>
        </button>
        <div id="archived-events-content" class="hidden px-6 pb-6">
          ${
            archivedEvents.length > 0
              ? `<div class="bg-white rounded-lg p-4 border-2 border-yellow-200">
                <div class="space-y-3">
                  ${archivedEvents
                    .sort((a, b) => (a.order || 999) - (b.order || 999))
                    .map((ev) => {
                      const typeIcon =
                        ev.type === "tasting"
                          ? "🍽️"
                          : ev.type === "mt"
                          ? "🏕️"
                          : ev.type === "assembly"
                          ? "🎤"
                          : "📅";
                      return `
                        <div class="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors border border-gray-200">
                          <div class="flex items-center gap-3 mb-3">
                            <span class="text-2xl">${typeIcon}</span>
                            <div class="flex-1 min-w-0">
                              <h5 class="font-semibold text-gray-800">${
                                ev.title
                              }</h5>
                              <p class="text-xs text-gray-500">
                                ${new Date(ev.datetime).toLocaleDateString(
                                  "ko-KR"
                                )} ${new Date(ev.datetime).toLocaleTimeString(
                        "ko-KR",
                        {
                          hour: "2-digit",
                          minute: "2-digit",
                        }
                      )}
                              </p>
                            </div>
                          </div>
                          <div class="flex items-center justify-between text-sm text-gray-600 mb-3">
                            <span>참가자: ${ev.applicants?.length || 0}명</span>
                            <button 
                              type="button" 
                              class="text-blue-600 hover:text-blue-800 font-medium"
                              data-act="admin-unarchive" 
                              data-id="${ev.id}"
                            >
                              <i class="fas fa-rotate-left mr-1"></i>재게시
                            </button>
                          </div>
                        </div>
                      `;
                    })
                    .join("")}
                </div>
              </div>`
              : `<div class="text-center py-8 text-gray-500">
                <i class="fas fa-inbox text-3xl mb-2"></i>
                <p>보관된 이벤트가 없습니다.</p>
              </div>`
          }
        </div>
      </div>
    </div>
  `
    : "";

  console.log("=== HTML 생성 시작 ===");
  console.log("hasKakaoAccount:", hasKakaoAccount);
  console.log(
    "myActivityHTML에 카카오 버튼 포함:",
    myActivityHTML.includes("activity-kakao-link-btn")
  );

  c.innerHTML =
    (isAdmin ? adminEventsPanelHTML() : "") +
    // 내 활동 섹션 (맨 위)
    myActivityHTML +
    // 보관된 이벤트 섹션 (관리자만, 내 활동 아래)
    archivedEventsHTML +
    // 생성된 이벤트 목록 (맨 아래)
    `<div class="section mt-6">
      <div class="flex items-center gap-2 mb-4">
        <i class="fas fa-list text-gray-600 text-xl"></i>
        <h4 class="text-xl font-bold text-gray-800">생성된 이벤트 목록</h4>
      </div>
      ${runningList}
    </div>`;

  console.log("=== HTML 생성 완료 ===");
  console.log("탭 콘텐츠:", c.innerHTML.substring(0, 200) + "...");

  // 카카오 연동 버튼 이벤트 핸들러 연결
  const activityKakaoLinkBtn = c.querySelector("#activity-kakao-link-btn");
  const activityKakaoLinkBtnEmpty = c.querySelector(
    "#activity-kakao-link-btn-empty"
  );

  const setupKakaoLinkHandler = (btn) => {
    if (btn) {
      btn.addEventListener("click", async (e) => {
        if (e) {
          e.preventDefault();
          e.stopPropagation();
        }
        try {
          const { linkKakaoAccount } = await import("./auth.js");
          const success = await linkKakaoAccount();
          if (success) {
            // 성공 시 탭 다시 렌더링
            renderReservationTab(isAdmin);
          }
        } catch (error) {
          console.error("내 활동 카카오 연동 오류:", error);
        }
      });
    }
  };

  setupKakaoLinkHandler(activityKakaoLinkBtn);
  setupKakaoLinkHandler(activityKakaoLinkBtnEmpty);

  console.log("카카오 연동 버튼 이벤트 핸들러 연결 완료:", {
    헤더_버튼: activityKakaoLinkBtn !== null,
    빈_상태_버튼: activityKakaoLinkBtnEmpty !== null,
  });

  c.addEventListener("click", async (e) => {
    const b = e.target.closest("button[data-act]");
    if (!b) return;
    const act = b.dataset.act,
      id = b.dataset.id,
      rid = b.dataset.rid;
    if (act === "reserve-general") return reserveGeneral(id);
    if (act === "cancel-general") return cancelGeneral(id);
    if (act === "reserve-tasting") return reserveTasting(id, rid);
    if (act === "cancel-tasting") return cancelTasting(id, rid);
    if (act === "admin-edit") return loadEventToForm(id);
    if (act === "admin-archive") return archiveEvent(id);
    if (act === "admin-unarchive") return unarchiveEvent(id);
    if (act === "admin-delete") return deleteEvent(id);
    if (act === "export-xlsx") return exportApplicantsXLSX(id);
  });

  // 참가자 목록 토글 기능
  c.addEventListener("click", (e) => {
    const btn = e.target.closest("button[id^='show-participants-']");
    if (!btn) return;
    const sectionId = btn.id.replace("show-participants-", "participants-");
    const section = document.getElementById(sectionId);
    const chevron = document.getElementById(`chevron-${sectionId}`);
    const avatars = document.getElementById(`avatars-${sectionId}`);
    if (section && chevron) {
      const isHidden = section.classList.contains("hidden");
      section.classList.toggle("hidden", !isHidden);
      chevron.style.transform = isHidden ? "rotate(180deg)" : "rotate(0deg)";
      // 접혀있을 때는 아바타 스트립 보이게, 펼치면 숨기기
      if (avatars) {
        avatars.classList.toggle("hidden", !isHidden ? false : true);
      }
    }
  });

  if (isAdmin) bindAdminEventsPanel();

  console.log("renderReservationTab 함수 완료!");
  console.log("탭 콘텐츠:", c.innerHTML.substring(0, 200) + "...");
}

function hofCardHTML(e) {
  const title = e.title || e.name || "(제목 없음)";
  const typ = e.type || e.kind || "general";
  const when = e.date || e.when || e.startDate || e.activityDate || "";
  const where = e.place || e.location || "";
  const line = [when, where].filter(Boolean).join(" · ");
  return `<div class="border rounded-lg bg-white p-4 shadow-sm">
    <div class="flex items-center justify-between">
      <div class="font-semibold text-gray-800 truncate mr-2">${saf(title)}</div>
      <span class="text-[11px] px-2 py-0.5 rounded ${typeBadgeClass(
        typ
      )}">${saf(typeLabel(typ))}</span>
    </div>
    ${line ? `<div class="text-sm text-gray-500 mt-1">${saf(line)}</div>` : ""}
  </div>`;
}

/* 아이디어 건의 탭 (기존 구현을 어댑터로 호출) */
function renderSuggestionsTab(isAdmin) {
  return renderSuggestionsTabImpl(isAdmin);
}

/* --- 여기서 필요한 것들을 내보내 주면(main.js의 import가 만족됨) --- */
export { renderDashboardTab }; // dashboard.js에서 가져온 것을 재-Export
export { renderReservationTab }; // 내부 함수도 재사용 가능하도록 Export
export { renderSuggestionsTab }; // suggestions.js 어댑터
