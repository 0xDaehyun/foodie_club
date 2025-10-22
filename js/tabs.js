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
        <button type="button" data-tab="history" class="tab-btn flex-1 py-2 px-3 sm:px-4 rounded-md font-semibold text-gray-700"><i class="fas fa-box-archive mr-2"></i>보관(명예의 전당)</button>
        <button type="button" data-tab="suggestions" class="tab-btn flex-1 py-2 px-3 sm:px-4 rounded-md font-semibold text-gray-700"><i class="fas fa-lightbulb mr-2"></i>아이디어 건의</button>
        <button type="button" data-tab="dashboard" class="tab-btn flex-1 py-2 px-3 sm:px-4 rounded-md font-semibold text-gray-700 ${
          isAdmin ? "" : "hidden"
        }"><i class="fas fa-crown mr-2"></i>관리자 대시보드</button>
      </div>
      <div id="tab-content-container">
        <div id="reservation-tab" class="tab-content active"></div>
        <div id="history-tab" class="tab-content"></div>
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

    // 자리표시자(필요 시 모듈화해서 교체)
    document.getElementById(
      "history-tab"
    ).innerHTML = `<div class="section text-gray-500">보관(명예의 전당) 탭은 이후 코드에 맞춰 채워 넣으세요.</div>`;
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
  const c = document.getElementById("reservation-tab");
  if (!c) return;
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

  c.innerHTML =
    (isAdmin ? adminEventsPanelHTML() : "") +
    `<div class="section mt-6">
      <h2 class="text-2xl font-bold mb-1 text-gray-800">진행 중 목록</h2>
      <p class="text-xs text-gray-500 mb-3">현재 신청 가능한 이벤트/미식회입니다.</p>
      ${runningList}
    </div>`;

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
  if (isAdmin) bindAdminEventsPanel();
}

/* 사용자용 명예의 전당(보관) 탭 */
function renderHistoryTab(isAdmin) {
  const c = document.getElementById("history-tab");
  if (!c) return;
  const archived = (state.eventsData || []).filter(
    (e) => e.status === "archived"
  );
  if (archived.length === 0) {
    c.innerHTML = `<div class="section text-center text-gray-400">
      <i class="fas fa-inbox text-4xl mb-2"></i>
      <div>보관된 항목이 없습니다.</div>
    </div>`;
    return;
  }
  c.innerHTML = `
    <div class="section">
      <h2 class="text-2xl font-bold mb-1 text-gray-800">보관(명예의 전당)</h2>
      <p class="text-xs text-gray-500 mb-3">지난 이벤트/미식회 기록입니다.</p>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="hof-grid">
        ${archived.map(hofCardHTML).join("")}
      </div>
    </div>
  `;
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
export { renderHistoryTab }; // 새로 구현한 사용자용 명예의 전당 탭
export { renderSuggestionsTab }; // suggestions.js 어댑터
